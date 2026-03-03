import { db } from "@/lib/db";
import {
  notifications,
  priceHistory,
  products,
} from "@/lib/db/schema";
import { user } from "@/lib/schema";
import { normalizePriceForStorage } from "@/lib/utils/format-price";
import {
  fetchPrice,
  PriceFetcherError,
  sendPriceDropEmail,
} from "@/lib/services";
import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

const DEFAULT_PRICE_SELECTOR =
  ".price, .product-price, [data-price], #price, span[class*='price']";
const PLACEHOLDER_PRICE = "—";

function parsePrice(value: string): number | null {
  if (value === PLACEHOLDER_PRICE || !value.trim()) return null;
  const num = parseFloat(value.replace(/,/g, ""));
  return Number.isNaN(num) ? null : num;
}

function authorize(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;

  const authHeader = request.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;
  const queryToken = request.nextUrl.searchParams.get("secret");

  return bearerToken === secret || queryToken === secret;
}

export async function GET(request: NextRequest) {
  return handleCheckPrices(request);
}

export async function POST(request: NextRequest) {
  return handleCheckPrices(request);
}

async function handleCheckPrices(
  request: NextRequest
): Promise<NextResponse> {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const log = (msg: string, data?: Record<string, unknown>) => {
    console.log(`[check-prices] ${msg}`, data ?? "");
  };

  try {
    const allProducts = await db.select().from(products);
    log(`Processing ${allProducts.length} products`);

    let updated = 0;
    let notified = 0;
    const errors: { productId: string; error: string }[] = [];

    for (const product of allProducts) {
      try {
        const {
          price: newPrice,
          priceType,
          salePercentage,
          wasPrice,
          isOnSpecial,
          isHalfPrice,
          savings,
        } = await fetchPrice(product.url, {
          selector: DEFAULT_PRICE_SELECTOR,
          timeoutMs: 10_000,
        });

        const currentPriceNum = parsePrice(product.currentPrice);
        const now = new Date();
        const priceDecreased =
          currentPriceNum !== null && newPrice < currentPriceNum;

        if (priceDecreased) {
          const oldPriceStr = product.currentPrice;
          const newPriceStr = normalizePriceForStorage(newPrice);
          const percentDrop =
            ((currentPriceNum - newPrice) / currentPriceNum) * 100;

          await db
            .update(products)
            .set({
              currentPrice: newPriceStr,
              priceType,
              wasPrice:
                wasPrice != null ? normalizePriceForStorage(wasPrice) : null,
              salePercentage: salePercentage ?? null,
              isOnSpecial: isOnSpecial ?? null,
              isHalfPrice: isHalfPrice ?? null,
              savings: savings ?? null,
              lastCheckedAt: now,
            })
            .where(eq(products.id, product.id));

          await db.insert(priceHistory).values({
            id: randomUUID(),
            productId: product.id,
            price: newPriceStr,
            checkedAt: now,
          });

          const targetPriceNum = parsePrice(product.targetPrice ?? "");
          const belowTarget =
            targetPriceNum !== null && newPrice < targetPriceNum;
          const notifyBelowPct = product.notifyBelow ?? null;
          const meetsPercentThreshold =
            notifyBelowPct !== null && percentDrop >= notifyBelowPct;
          const shouldNotify = belowTarget || meetsPercentThreshold;

          if (shouldNotify) {
            await db.insert(notifications).values({
              id: randomUUID(),
              productId: product.id,
              oldPrice: oldPriceStr,
              newPrice: newPriceStr,
              sentAt: now,
            });

            const [owner] = await db
              .select({ email: user.email })
              .from(user)
              .where(eq(user.id, product.userId))
              .limit(1);

            if (owner?.email) {
              const emailResult = await sendPriceDropEmail({
                to: owner.email,
                productTitle: product.title,
                oldPrice: oldPriceStr,
                newPrice: newPriceStr,
                percentDrop,
                productUrl: product.url,
              });

              if (emailResult.success) {
                notified++;
                log(`Email sent (below target): ${product.id}`, {
                  to: owner.email,
                  target: targetPriceNum,
                });
              } else {
                log(`Email failed: ${product.id}`, {
                  error: emailResult.error,
                });
              }
            } else {
              log(`No owner email for product ${product.id}`);
            }
          }

          updated++;
          log(`Price drop: ${product.id}`, {
            oldPrice: oldPriceStr,
            newPrice: newPriceStr,
            percentDrop: percentDrop.toFixed(1),
            notified: shouldNotify,
          });
        } else {
          await db
            .update(products)
            .set({
              lastCheckedAt: now,
              priceType,
              wasPrice:
                wasPrice != null ? normalizePriceForStorage(wasPrice) : null,
              salePercentage: salePercentage ?? null,
              isOnSpecial: isOnSpecial ?? null,
              isHalfPrice: isHalfPrice ?? null,
              savings: savings ?? null,
            })
            .where(eq(products.id, product.id));

          await db.insert(priceHistory).values({
            id: randomUUID(),
            productId: product.id,
            price: normalizePriceForStorage(newPrice),
            checkedAt: now,
          });

          if (currentPriceNum === null) {
            await db
              .update(products)
              .set({
                currentPrice: normalizePriceForStorage(newPrice),
                priceType,
                wasPrice:
                  wasPrice != null ? normalizePriceForStorage(wasPrice) : null,
                salePercentage: salePercentage ?? null,
                isOnSpecial: isOnSpecial ?? null,
                isHalfPrice: isHalfPrice ?? null,
                savings: savings ?? null,
              })
              .where(eq(products.id, product.id));
            updated++;

            const targetPriceNum = parsePrice(product.targetPrice ?? "");
            const belowTarget =
              targetPriceNum !== null && newPrice < targetPriceNum;
            const shouldNotify = belowTarget;

            if (shouldNotify) {
              await db.insert(notifications).values({
                id: randomUUID(),
                productId: product.id,
                oldPrice: product.currentPrice,
                newPrice: String(newPrice),
                sentAt: now,
              });

              const [owner] = await db
                .select({ email: user.email })
                .from(user)
                .where(eq(user.id, product.userId))
                .limit(1);

              if (owner?.email) {
                const emailResult = await sendPriceDropEmail({
                  to: owner.email,
                  productTitle: product.title,
                  oldPrice: product.currentPrice,
                  newPrice: String(newPrice),
                  percentDrop: 0,
                  productUrl: product.url,
                });

                if (emailResult.success) {
                  notified++;
                  log(`Email sent (below target, initial): ${product.id}`, {
                    to: owner.email,
                    target: targetPriceNum,
                  });
                }
              }
            }

            log(`Initial price set: ${product.id}`, { newPrice });
          } else {
            log(`Price unchanged or increased: ${product.id}`, {
              current: currentPriceNum,
              fetched: newPrice,
            });
          }
        }
      } catch (error) {
        const message =
          error instanceof PriceFetcherError
            ? `${error.code}: ${error.message}`
            : error instanceof Error
              ? error.message
              : "Unknown error";
        errors.push({ productId: product.id, error: message });
        log(`Error for product ${product.id}`, { error: message });
      }
    }

    log(`Complete`, {
      total: allProducts.length,
      updated,
      notified,
      errors: errors.length,
    });

    return NextResponse.json({
      ok: true,
      total: allProducts.length,
      updated,
      notified,
      errors: errors.length,
      details: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    log(`Fatal error`, { error: message });
    console.error("[check-prices] Fatal:", error);

    return NextResponse.json(
      { error: "Check prices failed", message },
      { status: 500 }
    );
  }
}
