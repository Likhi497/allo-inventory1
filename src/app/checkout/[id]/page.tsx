import { Suspense } from "react";
import { CheckoutView } from "@/components/checkout-view";
import { Package } from "lucide-react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 text-indigo-600">
            <Package className="h-6 w-6" />
            <span className="font-bold text-xl tracking-tight">Allo</span>
          </Link>
          <span className="text-gray-300 text-xl">|</span>
          <span className="text-gray-600 text-sm font-medium">Checkout</span>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-24">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            </div>
          }
        >
          <CheckoutView id={id} />
        </Suspense>
      </div>
    </main>
  );
}
