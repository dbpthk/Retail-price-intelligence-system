import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { priceHistory, products } from "@/lib/db/schema";
import { and, asc, eq } from "drizzle-orm";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PriceHistoryChart } from "./price-history-chart";
import { TargetPriceForm } from "./target-price-form";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProductDetailPage({ params }: PageProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

  const { id } = await params;

  const [product] = await db
    .select()
    .from(products)
    .where(
      and(eq(products.id, id), eq(products.userId, session.user.id))
    )
    .limit(1);

  if (!product) {
    notFound();
  }

  const history = await db
    .select({
      price: priceHistory.price,
      checkedAt: priceHistory.checkedAt,
    })
    .from(priceHistory)
    .where(eq(priceHistory.productId, id))
    .orderBy(asc(priceHistory.checkedAt));

  const chartData = history.map((row) => {
    const date = row.checkedAt ?? new Date();
    return {
      date: date.toISOString().split("T")[0],
      price: parseFloat(row.price) || 0,
      label: date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
    };
  });

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 sm:px-6">
          <Link
            href="/dashboard"
            className="text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h1 className="mb-2 text-xl font-semibold text-gray-900">
            {product.title}
          </h1>
          <p className="mb-4 text-2xl font-semibold text-blue-600">
            {product.currentPrice}
          </p>
          <div className="mb-4">
            <TargetPriceForm
              productId={product.id}
              currentTargetPrice={product.targetPrice}
              currentNotifyBelow={product.notifyBelow}
            />
          </div>
          <a
            href={product.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            View product
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </a>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <PriceHistoryChart data={chartData} productTitle={product.title} />
        </div>
      </div>
    </main>
  );
}
