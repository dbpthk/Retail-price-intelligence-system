import { db } from "@/lib/db";
import {
  notifications,
  priceHistory,
  products,
} from "@/lib/db/schema";
import { fetchPrice, PriceFetcherError } from "@/lib/services";
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
        const newPrice = await fetchPrice(product.url, {
          selector: DEFAULT_PRICE_SELECTOR,
          timeoutMs: 10_000,
        });

        const currentPriceNum = parsePrice(product.currentPrice);
        const now = new Date();
        const priceDecreased =
          currentPriceNum !== null && newPrice < currentPriceNum;

        if (priceDecreased) {
          await db
            .update(products)
            .set({
              currentPrice: String(newPrice),
              lastCheckedAt: now,
            })
            .where(eq(products.id, product.id));

          await db.insert(priceHistory).values({
            id: randomUUID(),
            productId: product.id,
            price: String(newPrice),
            checkedAt: now,
          });

          await db.insert(notifications).values({
            id: randomUUID(),
            productId: product.id,
            oldPrice: product.currentPrice,
            newPrice: String(newPrice),
            sentAt: now,
          });

          updated++;
          notified++;
          log(`Price drop: ${product.id}`, {
            oldPrice: product.currentPrice,
            newPrice,
          });
        } else {
          await db
            .update(products)
            .set({ lastCheckedAt: now })
            .where(eq(products.id, product.id));

          await db.insert(priceHistory).values({
            id: randomUUID(),
            productId: product.id,
            price: String(newPrice),
            checkedAt: now,
          });

          if (currentPriceNum === null) {
            await db
              .update(products)
              .set({ currentPrice: String(newPrice) })
              .where(eq(products.id, product.id));
            updated++;
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
