import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { priceHistory, products } from "@/lib/db/schema";
import { fetchTitle } from "@/lib/services";
import { desc, eq, inArray } from "drizzle-orm";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { formatPrice } from "@/lib/utils/format-price";
import { SaleBadges } from "@/components/sale-badges";
import { ThemeToggle } from "@/components/theme-toggle";
import { DeleteProductButton } from "./delete-product-button";
import { SignOutButton } from "./sign-out-button";

const PLACEHOLDER_PRICE = "—";
const PLACEHOLDER_TITLE = "Product";

function parsePrice(value: string): number | null {
  if (value === PLACEHOLDER_PRICE || !value?.trim()) return null;
  const num = parseFloat(value.replace(/,/g, ""));
  return Number.isNaN(num) ? null : num;
}

function getPriceChange(
  currentPrice: string,
  history: { price: string; checkedAt: Date | null }[]
): "drop" | "rise" | null {
  const current = parsePrice(currentPrice);
  if (current === null || history.length < 2) return null;
  const previous = parsePrice(history[1].price);
  if (previous === null || previous === 0) return null;
  if (current < previous) return "drop";
  if (current > previous) return "rise";
  return null;
}

function formatLastChecked(date: Date | null): string {
  if (!date) return "Never";
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

  let userProducts = await db
    .select()
    .from(products)
    .where(eq(products.userId, session.user.id))
    .orderBy(desc(products.createdAt));

  const placeholderProducts = userProducts.filter(
    (p) => p.title === PLACEHOLDER_TITLE
  );
  if (placeholderProducts.length > 0) {
    const updates = await Promise.allSettled(
      placeholderProducts.map(async (product) => {
        try {
          const title = await fetchTitle(product.url);
          if (title && title !== PLACEHOLDER_TITLE) {
            await db
              .update(products)
              .set({ title: title.trim() })
              .where(eq(products.id, product.id));
            return { id: product.id, title: title.trim() };
          }
        } catch {
          // Keep placeholder on fetch failure
        }
        return null;
      })
    );
    const titleUpdates = new Map<string, string>();
    for (const r of updates) {
      if (r.status === "fulfilled" && r.value) {
        titleUpdates.set(r.value.id, r.value.title);
      }
    }
    userProducts = userProducts.map((p) =>
      titleUpdates.has(p.id)
        ? { ...p, title: titleUpdates.get(p.id)! }
        : p
    );
  }

  const productIds = userProducts.map((p) => p.id);
  const historyRows =
    productIds.length > 0
      ? await db
          .select({ productId: priceHistory.productId, price: priceHistory.price, checkedAt: priceHistory.checkedAt })
          .from(priceHistory)
          .where(inArray(priceHistory.productId, productIds))
          .orderBy(desc(priceHistory.checkedAt))
      : [];

  const historyByProduct = new Map<string, { price: string; checkedAt: Date | null }[]>();
  for (const row of historyRows) {
    const list = historyByProduct.get(row.productId) ?? [];
    if (list.length < 2) {
      list.push({ price: row.price, checkedAt: row.checkedAt });
      historyByProduct.set(row.productId, list);
    }
  }

  return (
    <main className="min-h-screen bg-[#F5F5F5] dark:bg-[#1F2937]">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/95 backdrop-blur dark:border-gray-700 dark:bg-[#111827]/95 supports-[backdrop-filter]:bg-white/80 dark:supports-[backdrop-filter]:bg-[#111827]/80">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <h1 className="text-lg font-semibold tracking-tight text-[#111827] dark:text-[#E5E7EB]">
            Dashboard
          </h1>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/dashboard/products/new"
              className="inline-flex items-center gap-2 rounded-lg bg-[#1D4ED8] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#1E40AF] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-[#111827]"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4.5v15m7.5-7.5h-15"
                />
              </svg>
              Add Product
            </Link>
            <SignOutButton />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="mb-8">
          <h2 className="text-base font-medium text-[#6B7280] dark:text-[#9CA3AF]">
            Your Products
          </h2>
          <p className="mt-0.5 text-sm text-[#6B7280] dark:text-[#9CA3AF]">
            {userProducts.length} product
            {userProducts.length !== 1 ? "s" : ""} in your watchlist
          </p>
        </div>

        {userProducts.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white p-16 text-center dark:border-gray-700 dark:bg-[#111827]">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
              <svg
                className="h-8 w-8 text-gray-400 dark:text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M20 7l-8 4-8-4m0 0l8-4 8 4m0-6v8l-8 4m8-4l8-4m-8 4v8M4 7l8 4 8-4"
                />
              </svg>
            </div>
            <h3 className="mb-2 text-lg font-semibold text-[#111827] dark:text-[#E5E7EB]">
              No products yet
            </h3>
            <p className="mx-auto mb-8 max-w-sm text-sm text-[#6B7280] dark:text-[#9CA3AF]">
              Track prices for products you care about. Add your first product
              to get started.
            </p>
            <Link
              href="/dashboard/products/new"
              className="inline-flex items-center gap-2 rounded-lg bg-[#1D4ED8] px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#1E40AF]"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4.5v15m7.5-7.5h-15"
                />
              </svg>
              Add Product
            </Link>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {userProducts.map((product) => {
              const hist = historyByProduct.get(product.id) ?? [];
              const priceChange = getPriceChange(product.currentPrice, hist);
              const hasSaleEvidence =
                product.priceType === "sale" &&
                ((product.savings != null && product.savings > 0) ||
                  (product.wasPrice != null && product.salePercentage != null));
              return (
                <article
                  key={product.id}
                  className={`relative overflow-hidden rounded-xl border shadow-sm transition-all duration-200 hover:shadow-md ${
                    hasSaleEvidence
                      ? "border-emerald-300 bg-emerald-50/60 dark:border-emerald-700 dark:bg-emerald-950/30"
                      : "border-gray-200 bg-white dark:border-gray-700 dark:bg-[#111827]"
                  }`}
                >
                  <div className="absolute right-3 top-3">
                    <DeleteProductButton
                      productId={product.id}
                      productTitle={product.title}
                    />
                  </div>
                  <div className="p-5">
                    <h3 className="mb-3 line-clamp-2 pr-8 text-[15px] font-semibold leading-snug text-[#111827] dark:text-[#E5E7EB]">
                      {product.title}
                    </h3>
                    <div className="mb-2 flex flex-wrap items-baseline gap-2">
                      {product.wasPrice && hasSaleEvidence && (
                        <span className="text-sm text-[#6B7280] dark:text-[#9CA3AF]">
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
                      <span
                        className={`text-2xl font-bold tracking-tight ${
                          priceChange === "drop"
                            ? "text-[#16A34A]"
                            : priceChange === "rise"
                              ? "text-[#DC2626]"
                              : "text-[#111827] dark:text-[#E5E7EB]"
                        }`}
                      >
                        {formatPrice(product.currentPrice)}
                      </span>
                      {hasSaleEvidence ? (
                        <SaleBadges
                          priceType="sale"
                          isHalfPrice={product.isHalfPrice}
                          isOnSpecial={product.isOnSpecial}
                          savings={product.savings}
                          salePercentage={product.salePercentage}
                          compact
                        />
                      ) : (
                        <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-[#6B7280] dark:bg-gray-800 dark:text-[#9CA3AF]">
                          Full price
                        </span>
                      )}
                      {priceChange === "drop" && (
                        <span className="rounded bg-[#16A34A]/10 px-2 py-0.5 text-xs font-medium text-[#16A34A]">
                          ↓ Drop
                        </span>
                      )}
                      {priceChange === "rise" && (
                        <span className="rounded bg-[#DC2626]/10 px-2 py-0.5 text-xs font-medium text-[#DC2626]">
                          ↑ Rise
                        </span>
                      )}
                    </div>
                    <p className="mb-4 text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                      Last checked: {formatLastChecked(product.lastCheckedAt)}
                    </p>
                    {(product.targetPrice || product.notifyBelow != null) && (
                      <div className="mb-4 flex flex-wrap gap-1.5">
                        {product.targetPrice && (
                          <span className="inline-flex items-center rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-medium text-[#6B7280] dark:bg-gray-800 dark:text-[#9CA3AF]">
                            Below {formatPrice(product.targetPrice)}
                          </span>
                        )}
                        {product.notifyBelow != null && (
                          <span className="inline-flex items-center rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                            {product.notifyBelow}%+ drop
                          </span>
                        )}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-3 border-t border-gray-100 pt-4 dark:border-gray-800">
                      <Link
                        href={`/dashboard/products/${product.id}`}
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-[#1D4ED8] transition-colors hover:text-[#1E40AF] dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                          />
                        </svg>
                        Price history
                      </Link>
                      <a
                        href={product.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm text-[#6B7280] transition-colors hover:text-[#111827] dark:text-[#9CA3AF] dark:hover:text-[#E5E7EB]"
                      >
                        <svg
                          className="h-4 w-4"
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
                        View product
                      </a>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
