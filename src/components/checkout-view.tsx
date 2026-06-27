"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Reservation } from "@/types";
import { Countdown } from "./countdown";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  ArrowLeft,
  MapPin,
  Package,
  ShoppingBag,
} from "lucide-react";

interface CheckoutViewProps {
  id: string;
}

type ActionState = "idle" | "confirming" | "cancelling" | "done";

export function CheckoutView({ id }: CheckoutViewProps) {
  const router = useRouter();
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionState, setActionState] = useState<ActionState>("idle");
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchReservation = useCallback(async () => {
    try {
      const res = await fetch(`/api/reservations/${id}`, { cache: "no-store" });
      if (res.status === 404) { setError("Reservation not found."); return; }
      if (!res.ok) throw new Error("Failed to load reservation");
      const data: Reservation = await res.json();
      setReservation(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchReservation(); }, [fetchReservation]);

  async function handleConfirm() {
    setActionState("confirming");
    setActionError(null);
    const res = await fetch(`/api/reservations/${id}/confirm`, { method: "POST" });
    const data = await res.json();
    if (res.status === 410) {
      setActionError("⏰ Your reservation expired before payment could be confirmed. Please start over.");
      setActionState("idle");
      fetchReservation();
      return;
    }
    if (!res.ok) {
      setActionError(data.error ?? "Confirmation failed. Please try again.");
      setActionState("idle");
      return;
    }
    setReservation(data);
    setActionState("done");
  }

  async function handleCancel() {
    setActionState("cancelling");
    setActionError(null);
    const res = await fetch(`/api/reservations/${id}/release`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      setActionError(data.error ?? "Cancellation failed.");
      setActionState("idle");
      return;
    }
    setReservation(data);
    setActionState("done");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <XCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
        <p className="text-gray-700 font-medium">{error}</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push("/")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to products
        </Button>
      </div>
    );
  }

  if (!reservation) return null;

  const isExpired = reservation.status === "PENDING" && new Date() > new Date(reservation.expiresAt);
  const isPending = reservation.status === "PENDING" && !isExpired;
  const isConfirmed = reservation.status === "CONFIRMED";
  const isReleased = reservation.status === "RELEASED" || isExpired;

  return (
    <div className="space-y-6">
      {isConfirmed && (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 text-green-800 rounded-xl p-4">
          <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
          <div>
            <p className="font-semibold">Order confirmed!</p>
            <p className="text-sm text-green-700">Your purchase is complete. Thank you for shopping with Allo.</p>
          </div>
        </div>
      )}

      {isReleased && !isConfirmed && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <div>
            <p className="font-semibold">Reservation cancelled</p>
            <p className="text-sm text-amber-700">
              {reservation.releasedAt
                ? "This hold was released. The units are available again."
                : "This reservation expired. The units have been returned to stock."}
            </p>
          </div>
          <Button variant="outline" size="sm" className="ml-auto shrink-0" onClick={() => router.push("/")}>
            Shop again
          </Button>
        </div>
      )}

      {isPending && <Countdown expiresAt={reservation.expiresAt} onExpired={fetchReservation} />}

      {/* Reservation detail card */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-start gap-4 p-6 border-b border-gray-100">
          <div className="relative h-20 w-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
            {reservation.product.imageUrl ? (
              <Image
                src={reservation.product.imageUrl}
                alt={reservation.product.name}
                fill
                className="object-cover"
                sizes="80px"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <Package className="h-8 w-8 text-gray-300" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-400 font-mono">SKU: {reservation.product.sku}</p>
            <h2 className="font-semibold text-gray-900 text-lg leading-snug mt-0.5">
              {reservation.product.name}
            </h2>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              ₹{Number(reservation.product.price).toLocaleString("en-IN")}
            </p>
          </div>
          <StatusBadge status={reservation.status} isExpired={isExpired} />
        </div>

        <div className="px-6 py-4 space-y-3 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-gray-400" />
            <span>
              <span className="font-medium">{reservation.warehouse.name}</span> · {reservation.warehouse.location}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-gray-400" />
            <span>Qty: {reservation.quantity}</span>
          </div>
          <p className="text-xs text-gray-400">Reservation ID: {reservation.id}</p>
        </div>

        <div className="bg-gray-50 border-t border-gray-100 px-6 py-4">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Subtotal</span>
            <span>₹{Number(reservation.product.price).toLocaleString("en-IN")}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-600 mt-1">
            <span>Shipping</span>
            <span className="text-green-600">Free</span>
          </div>
          <div className="flex justify-between font-bold text-gray-900 mt-3 pt-3 border-t border-gray-200">
            <span>Total</span>
            <span>₹{Number(reservation.product.price).toLocaleString("en-IN")}</span>
          </div>
        </div>
      </div>

      {actionError && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">
          <XCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <span>{actionError}</span>
        </div>
      )}

      {isPending && actionState !== "done" && (
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 h-12 text-base"
            onClick={handleConfirm}
            disabled={actionState !== "idle"}
          >
            {actionState === "confirming" ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" />Confirming…</>
            ) : (
              <><CheckCircle2 className="h-4 w-4 mr-2" />Confirm Purchase</>
            )}
          </Button>
          <Button
            variant="outline"
            className="flex-1 h-12 text-base border-gray-300 text-gray-700"
            onClick={handleCancel}
            disabled={actionState !== "idle"}
          >
            {actionState === "cancelling" ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" />Cancelling…</>
            ) : (
              <><XCircle className="h-4 w-4 mr-2" />Cancel</>
            )}
          </Button>
        </div>
      )}

      {(isConfirmed || isReleased) && (
        <Button variant="outline" className="w-full" onClick={() => router.push("/")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to products
        </Button>
      )}
    </div>
  );
}

function StatusBadge({ status, isExpired }: { status: string; isExpired: boolean }) {
  if (isExpired && status === "PENDING") {
    return <Badge variant="destructive" className="shrink-0">Expired</Badge>;
  }
  if (status === "CONFIRMED") {
    return <Badge className="bg-green-600 hover:bg-green-600 shrink-0">Confirmed</Badge>;
  }
  if (status === "RELEASED") {
    return <Badge variant="secondary" className="shrink-0">Released</Badge>;
  }
  return <Badge className="bg-amber-500 hover:bg-amber-500 shrink-0">Pending</Badge>;
}
