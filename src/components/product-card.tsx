"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Product, StockEntry } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { MapPin, Package, Loader2, AlertCircle } from "lucide-react";

interface ProductCardProps {
  product: Product;
  onReserved: () => void;
}

export function ProductCard({ product, onReserved }: ProductCardProps) {
  const router = useRouter();
  const [selectedWarehouse, setSelectedWarehouse] = useState<StockEntry | null>(
    () => product.stock.find((s) => s.availableUnits > 0) ?? product.stock[0] ?? null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleReserve() {
    if (!selectedWarehouse) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          warehouseId: selectedWarehouse.warehouseId,
          quantity: 1,
        }),
      });

      const data = await res.json();

      if (res.status === 409) {
        setError(data.error ?? "Not enough stock — someone else just grabbed the last unit.");
        onReserved();
        return;
      }

      if (!res.ok) {
        setError(data.error ?? "Reservation failed. Please try again.");
        return;
      }

      router.push(`/checkout/${data.id}`);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const hasStock = selectedWarehouse ? selectedWarehouse.availableUnits > 0 : false;

  return (
    <Card className="overflow-hidden flex flex-col hover:shadow-md transition-shadow">
      <div className="relative h-48 bg-gray-100">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <Package className="h-12 w-12 text-gray-300" />
          </div>
        )}
        <div className="absolute top-3 right-3">
          <Badge
            variant={hasStock ? "default" : "destructive"}
            className={hasStock ? "bg-green-600 hover:bg-green-600" : ""}
          >
            {hasStock ? "In Stock" : "Out of Stock"}
          </Badge>
        </div>
      </div>

      <CardContent className="flex-1 pt-5 pb-2">
        <div className="mb-1">
          <span className="text-xs text-gray-400 font-mono">SKU: {product.sku}</span>
        </div>
        <h3 className="font-semibold text-gray-900 text-base leading-snug mb-1">
          {product.name}
        </h3>
        {product.description && (
          <p className="text-gray-500 text-sm line-clamp-2 mb-3">
            {product.description}
          </p>
        )}

        <p className="text-xl font-bold text-gray-900">
          ₹{product.price.toLocaleString("en-IN")}
        </p>

        <div className="mt-4">
          <p className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            Fulfil from
          </p>
          <div className="space-y-2">
            {product.stock.map((stock) => (
              <button
                key={stock.warehouseId}
                onClick={() => setSelectedWarehouse(stock)}
                className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
                  selectedWarehouse?.warehouseId === stock.warehouseId
                    ? "border-indigo-500 bg-indigo-50 text-indigo-900"
                    : "border-gray-200 hover:border-gray-300 text-gray-700"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{stock.warehouseName}</span>
                  <span
                    className={`text-xs font-semibold ${
                      stock.availableUnits === 0
                        ? "text-red-500"
                        : stock.availableUnits <= 3
                        ? "text-amber-600"
                        : "text-green-600"
                    }`}
                  >
                    {stock.availableUnits === 0
                      ? "Sold out"
                      : `${stock.availableUnits} avail.`}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{stock.warehouseLocation}</p>
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="mt-3 flex items-start gap-2 text-red-600 bg-red-50 border border-red-200 rounded-lg p-3 text-sm">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-2 pb-5">
        <Button
          className="w-full bg-indigo-600 hover:bg-indigo-700"
          onClick={handleReserve}
          disabled={loading || !hasStock}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Reserving…
            </>
          ) : !hasStock ? (
            "Out of Stock"
          ) : (
            "Reserve — Proceed to Checkout"
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
