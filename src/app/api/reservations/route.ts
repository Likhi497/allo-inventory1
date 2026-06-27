import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { PrismaClient } from "@/generated/prisma/client";
import {
  acquireLock,
  releaseLock,
  stockLockKey,
  idempotencyKey,
  redisGet,
  redisSet,
} from "@/lib/redis";
import { CreateReservationSchema } from "@/lib/schemas";

type TxClient = Parameters<PrismaClient["$transaction"]>[0] extends (
  tx: infer T
) => unknown
  ? T
  : never;

export const dynamic = "force-dynamic";

const RESERVATION_TTL_MINUTES = 10;
const IDEMPOTENCY_TTL_SECONDS = 86400;

export async function GET() {
  try {
    const reservations = await prisma.reservation.findMany({
      include: { product: true, warehouse: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return NextResponse.json(reservations);
  } catch (error) {
    console.error("GET /api/reservations error:", error);
    return NextResponse.json({ error: "Failed to fetch reservations" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = CreateReservationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const { productId, warehouseId, quantity } = parsed.data;

  // ── Idempotency ───────────────────────────────────────────────────────────
  const clientIdempotencyKey = request.headers.get("Idempotency-Key");
  if (clientIdempotencyKey) {
    const cacheKey = idempotencyKey(clientIdempotencyKey);
    const cached = await redisGet(cacheKey);
    if (cached) {
      const cachedData = JSON.parse(cached) as { status: number; body: unknown };
      return NextResponse.json(cachedData.body, { status: cachedData.status });
    }
  }

  // ── Distributed lock ──────────────────────────────────────────────────────
  // Serialises concurrent reservations for the same SKU+warehouse.
  const lockKey = stockLockKey(productId, warehouseId);
  const acquired = await acquireLock(lockKey, 5);
  if (!acquired) {
    return NextResponse.json(
      { error: "Server busy, please retry" },
      { status: 503, headers: { "Retry-After": "1" } }
    );
  }

  try {
    const reservation = await prisma.$transaction(async (tx: TxClient) => {
      const stock = await tx.stock.findUnique({
        where: { productId_warehouseId: { productId, warehouseId } },
      });

      if (!stock) {
        throw Object.assign(
          new Error("Stock record not found for this product/warehouse"),
          { code: "NOT_FOUND" }
        );
      }

      const available = stock.totalUnits - stock.reservedUnits;
      if (available < quantity) {
        throw Object.assign(
          new Error(`Insufficient stock. Requested ${quantity}, available ${available}`),
          { code: "INSUFFICIENT_STOCK" }
        );
      }

      await tx.stock.update({
        where: { productId_warehouseId: { productId, warehouseId } },
        data: { reservedUnits: { increment: quantity } },
      });

      const expiresAt = new Date(Date.now() + RESERVATION_TTL_MINUTES * 60 * 1000);

      return tx.reservation.create({
        data: {
          productId,
          warehouseId,
          quantity,
          status: "PENDING",
          expiresAt,
          idempotencyKey: clientIdempotencyKey ?? undefined,
        },
        include: { product: true, warehouse: true },
      });
    });

    const responseBody = { ...reservation, price: Number(reservation.product.price) };

    if (clientIdempotencyKey) {
      await redisSet(
        idempotencyKey(clientIdempotencyKey),
        JSON.stringify({ status: 201, body: responseBody }),
        IDEMPOTENCY_TTL_SECONDS
      );
    }

    return NextResponse.json(responseBody, { status: 201 });
  } catch (error: unknown) {
    const err = error as Error & { code?: string };
    if (err.code === "NOT_FOUND") return NextResponse.json({ error: err.message }, { status: 404 });
    if (err.code === "INSUFFICIENT_STOCK") return NextResponse.json({ error: err.message }, { status: 409 });
    console.error("POST /api/reservations error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  } finally {
    await releaseLock(lockKey);
  }
}
