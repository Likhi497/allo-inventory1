import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const expired = await prisma.reservation.findMany({
      where: { status: "PENDING", expiresAt: { lt: now } },
    });

    if (expired.length === 0) return NextResponse.json({ released: 0 });

    let released = 0;
    for (const reservation of expired) {
      await prisma.$transaction([
        prisma.stock.update({
          where: {
            productId_warehouseId: {
              productId: reservation.productId,
              warehouseId: reservation.warehouseId,
            },
          },
          data: { reservedUnits: { decrement: reservation.quantity } },
        }),
        prisma.reservation.update({
          where: { id: reservation.id },
          data: { status: "RELEASED", releasedAt: now },
        }),
      ]);
      released++;
    }

    console.log(`[cron] Released ${released} expired reservation(s)`);
    return NextResponse.json({ released });
  } catch (error) {
    console.error("[cron] expire-reservations error:", error);
    return NextResponse.json({ error: "Cron job failed" }, { status: 500 });
  }
}
