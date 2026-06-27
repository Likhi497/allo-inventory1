import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { PrismaClient } from "@/generated/prisma/client";

type TxClient = Parameters<PrismaClient["$transaction"]>[0] extends (
  tx: infer T
) => unknown
  ? T
  : never;

export const dynamic = "force-dynamic";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const result = await prisma.$transaction(async (tx: TxClient) => {
      const reservation = await tx.reservation.findUnique({ where: { id } });

      if (!reservation) {
        throw Object.assign(new Error("Reservation not found"), { code: "NOT_FOUND" });
      }

      if (reservation.status === "RELEASED") {
        // Already released — idempotent
        return tx.reservation.findUnique({
          where: { id },
          include: { product: true, warehouse: true },
        });
      }

      if (reservation.status === "CONFIRMED") {
        throw Object.assign(
          new Error("Cannot release an already confirmed reservation"),
          { code: "ALREADY_CONFIRMED" }
        );
      }

      // Return units to available pool
      await tx.stock.update({
        where: {
          productId_warehouseId: {
            productId: reservation.productId,
            warehouseId: reservation.warehouseId,
          },
        },
        data: { reservedUnits: { decrement: reservation.quantity } },
      });

      return tx.reservation.update({
        where: { id },
        data: { status: "RELEASED", releasedAt: new Date() },
        include: { product: true, warehouse: true },
      });
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    const err = error as Error & { code?: string };
    if (err.code === "NOT_FOUND") return NextResponse.json({ error: err.message }, { status: 404 });
    if (err.code === "ALREADY_CONFIRMED") return NextResponse.json({ error: err.message }, { status: 409 });
    console.error(`POST /api/reservations/${id}/release error:`, error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
