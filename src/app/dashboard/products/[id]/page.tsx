import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { priceHistory, products } from "@/lib/db/schema";
import { and, asc, eq } from "drizzle-orm";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { formatPrice } from "@/lib/utils/format-price";
import { SaleBadges } from "@/components/sale-badges";
import { ThemeToggle } from "@/components/theme-toggle";
import { PriceHistoryChart } from "./price-history-chart";
import { RefreshTitleButton } from "./refresh-title-button";
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

  const isPlaceholderTitle = product.title === "Product";
  const hasSaleEvidence =
    product.priceType === "sale" &&
    ((product.savings != null && product.savings > 0) ||
      (product.wasPrice != null && product.salePercentage != null));

  return (
    <main className="min-h-screen bg-[#F5F5F5] dark:bg-[#1F2937]">
      <header className="border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-[#111827]">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 sm:px-6">
          <Link
            href="/dashboard"
            className="text-sm font-medium text-[#6B7280] hover:text-[#111827] dark:text-[#9CA3AF] dark:hover:text-[#E5E7EB]"
          >
            ← Back to Dashboard
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div
          className={`mb-6 rounded-xl border p-6 shadow-sm ${
            hasSaleEvidence
              ? "border-emerald-300 bg-emerald-50/60 dark:border-emerald-700 dark:bg-emerald-950/30"
              : "border-gray-200 bg-white dark:border-gray-700 dark:bg-[#111827]"
          }`}
        >
          <div className="mb-2 flex items-start justify-between gap-4">
            <h1 className="text-xl font-semibold text-[#111827] dark:text-[#E5E7EB]">
              {product.title}
            </h1>
            {isPlaceholderTitle && (
              <RefreshTitleButton productId={product.id} />
            )}
          </div>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {product.wasPrice && hasSaleEvidence && (
              <span className="text-base text-[#6B7280] dark:text-[#9CA3AF]">
                <span className="font-medium">Was </span>
                <span className="line-through">
                  {formatPrice(product.wasPrice)}
                </span>
              </span>
            )}
            {hasSaleEvidence && (
              <span className="text-xs font-medium uppercase tracking-wide text-[#16A34A]">
                Now
              </span>
            )}
            <p className="text-2xl font-bold text-[#111827] dark:text-[#E5E7EB]">
              {formatPrice(product.currentPrice)}
            </p>
            {hasSaleEvidence ? (
              <SaleBadges
                priceType="sale"
                isHalfPrice={product.isHalfPrice}
                isOnSpecial={product.isOnSpecial}
                savings={product.savings}
                salePercentage={product.salePercentage}
              />
            ) : (
              <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-[#6B7280] dark:bg-gray-800 dark:text-[#9CA3AF]">
                Full price
              </span>
            )}
          </div>
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
            className="inline-flex items-center gap-1 text-sm text-[#6B7280] hover:text-[#111827] dark:text-[#9CA3AF] dark:hover:text-[#E5E7EB]"
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

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-[#111827]">
          <PriceHistoryChart data={chartData} productTitle={product.title} />
        </div>
      </div>
    </main>
  );
}
