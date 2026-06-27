import { Suspense } from "react";
import { ProductGrid } from "@/components/product-grid";
import { Package } from "lucide-react";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-3">
          <div className="flex items-center gap-2 text-indigo-600">
            <Package className="h-6 w-6" />
            <span className="font-bold text-xl tracking-tight">Allo</span>
          </div>
          <span className="text-gray-300 text-xl">|</span>
          <span className="text-gray-600 text-sm font-medium">
            Inventory Demo
          </span>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Products</h1>
          <p className="mt-1 text-gray-500 text-sm">
            Select a product and warehouse to reserve stock for 10 minutes
            while checkout completes.
          </p>
        </div>

        <Suspense fallback={<ProductGridSkeleton />}>
          <ProductGrid />
        </Suspense>
      </div>
    </main>
  );
}

function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-xl border border-gray-200 animate-pulse overflow-hidden"
        >
          <div className="h-48 bg-gray-200" />
          <div className="p-5 space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4" />
            <div className="h-3 bg-gray-200 rounded w-full" />
            <div className="h-3 bg-gray-200 rounded w-2/3" />
            <div className="h-8 bg-gray-200 rounded mt-4" />
          </div>
        </div>
      ))}
    </div>
  );
}
