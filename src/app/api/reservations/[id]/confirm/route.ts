import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { PrismaClient } from "@/generated/prisma/client";
import { idempotencyKey, redisGet, redisSet } from "@/lib/redis";

type TxClient = Parameters<PrismaClient["$transaction"]>[0] extends (
  tx: infer T
) => unknown
  ? T
  : never;

export const dynamic = "force-dynamic";

const IDEMPOTENCY_TTL_SECONDS = 86400;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const clientIdempotencyKey = request.headers.get("Idempotency-Key");
  if (clientIdempotencyKey) {
    const cacheKey = idempotencyKey(`confirm:${clientIdempotencyKey}`);
    const cached = await redisGet(cacheKey);
    if (cached) {
      const cachedData = JSON.parse(cached) as { status: number; body: unknown };
      return NextResponse.json(cachedData.body, { status: cachedData.status });
    }
  }

  try {
    const result = await prisma.$transaction(async (tx: TxClient) => {
      const reservation = await tx.reservation.findUnique({ where: { id } });

      if (!reservation) {
        throw Object.assign(new Error("Reservation not found"), { code: "NOT_FOUND" });
      }

      if (reservation.status === "CONFIRMED") {
        // Already confirmed — fetch with relations for idempotent return
        return tx.reservation.findUnique({
          where: { id },
          include: { product: true, warehouse: true },
        });
      }

      if (reservation.status === "RELEASED") {
        throw Object.assign(new Error("Reservation has already been released"), {
          code: "ALREADY_RELEASED",
        });
      }

      if (new Date() > reservation.expiresAt) {
        // Lazy cleanup on expired reservation
        await tx.stock.update({
          where: {
            productId_warehouseId: {
              productId: reservation.productId,
              warehouseId: reservation.warehouseId,
            },
          },
          data: { reservedUnits: { decrement: reservation.quantity } },
        });
        await tx.reservation.update({
          where: { id },
          data: { status: "RELEASED", releasedAt: new Date() },
        });
        throw Object.assign(
          new Error("Reservation has expired and cannot be confirmed"),
          { code: "EXPIRED" }
        );
      }

      // Confirm: permanently consume the units
      await tx.stock.update({
        where: {
          productId_warehouseId: {
            productId: reservation.productId,
            warehouseId: reservation.warehouseId,
          },
        },
        data: {
          totalUnits: { decrement: reservation.quantity },
          reservedUnits: { decrement: reservation.quantity },
        },
      });

      return tx.reservation.update({
        where: { id },
        data: { status: "CONFIRMED", confirmedAt: new Date() },
        include: { product: true, warehouse: true },
      });
    });

    const responseBody = result
      ? { ...result, price: Number(result.product.price) }
      : null;

    if (clientIdempotencyKey) {
      await redisSet(
        idempotencyKey(`confirm:${clientIdempotencyKey}`),
        JSON.stringify({ status: 200, body: responseBody }),
        IDEMPOTENCY_TTL_SECONDS
      );
    }

    return NextResponse.json(responseBody);
  } catch (error: unknown) {
    const err = error as Error & { code?: string };
    if (err.code === "NOT_FOUND") return NextResponse.json({ error: err.message }, { status: 404 });
    if (err.code === "EXPIRED") return NextResponse.json({ error: err.message }, { status: 410 });
    if (err.code === "ALREADY_RELEASED") return NextResponse.json({ error: err.message }, { status: 409 });
    console.error(`POST /api/reservations/${id}/confirm error:`, error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
