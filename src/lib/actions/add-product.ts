"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { priceHistory, products } from "@/lib/db/schema";
import { normalizePriceForStorage } from "@/lib/utils/format-price";
import { fetchProductInfo, PriceFetcherError } from "@/lib/services";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { randomUUID } from "crypto";

const PLACEHOLDER_PRICE = "—";
const PLACEHOLDER_TITLE = "Product";
const DEFAULT_PRICE_SELECTOR =
  ".price, .product-price, [data-price], #price, span[class*='price']";

function isValidUrl(input: string): boolean {
  try {
    const trimmed = input.trim();
    if (!trimmed) return false;
    const url = new URL(trimmed);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  const url = new URL(trimmed);
  url.hash = "";
  return url.href;
}

export type AddProductResult =
  | { success: true; message?: string }
  | { success: false; error: string };

export async function addProduct(
  prevState: AddProductResult | null,
  formData: FormData
): Promise<AddProductResult> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

  const urlInput = formData.get("url");
  if (typeof urlInput !== "string") {
    return { success: false, error: "URL is required" };
  }

  const trimmedUrl = urlInput.trim();
  if (!trimmedUrl) {
    return { success: false, error: "URL is required" };
  }

  if (!isValidUrl(trimmedUrl)) {
    return { success: false, error: "Please enter a valid URL" };
  }

  const normalizedUrl = normalizeUrl(trimmedUrl);

  const existing = await db
    .select({ id: products.id })
    .from(products)
    .where(
      and(eq(products.userId, session.user.id), eq(products.url, normalizedUrl))
    )
    .limit(1);

  if (existing.length > 0) {
    return {
      success: false,
      error: "This product is already in your watchlist",
    };
  }

  const productId = randomUUID();
  const selector =
    (formData.get("selector") as string)?.trim() || DEFAULT_PRICE_SELECTOR;

  const targetPriceInput = (formData.get("targetPrice") as string)?.trim();
  let targetPrice: string | null = null;
  if (targetPriceInput) {
    const num = parseFloat(targetPriceInput.replace(/,/g, ""));
    if (!Number.isNaN(num) && num > 0) {
      targetPrice = String(num);
    }
  }

  const notifyBelowInput = (formData.get("notifyBelow") as string)?.trim();
  let notifyBelow: number | null = null;
  if (notifyBelowInput) {
    const num = parseFloat(notifyBelowInput.replace(/,/g, ""));
    if (!Number.isNaN(num) && num > 0 && num <= 100) {
      notifyBelow = num;
    }
  }

  let price: number | null = null;
  let title = PLACEHOLDER_TITLE;
  let priceType: "sale" | "full" | null = null;
  let salePercentage: number | null = null;
  let wasPrice: number | null = null;
  let isOnSpecial: boolean | null = null;
  let isHalfPrice: boolean | null = null;
  let savings: number | null = null;
  try {
    const info = await fetchProductInfo(normalizedUrl, {
      selector,
      timeoutMs: 10_000,
    });
    price = info.price;
    title = info.title || PLACEHOLDER_TITLE;
    priceType = info.priceType ?? null;
    salePercentage = info.salePercentage ?? null;
    wasPrice = info.wasPrice ?? null;
    isOnSpecial = info.isOnSpecial ?? null;
    isHalfPrice = info.isHalfPrice ?? null;
    savings = info.savings ?? null;
  } catch (error) {
    if (error instanceof PriceFetcherError) {
      // Continue with placeholder - we'll save the product and inform the user
    }
  }

  const priceStr =
    price !== null ? normalizePriceForStorage(price) : PLACEHOLDER_PRICE;
  const now = new Date();

  try {
    await db.insert(products).values({
      id: productId,
      userId: session.user.id,
      title: title.trim() || PLACEHOLDER_TITLE,
      url: normalizedUrl,
      currentPrice: priceStr,
      priceType,
      wasPrice: wasPrice !== null ? normalizePriceForStorage(wasPrice) : null,
      salePercentage,
      isOnSpecial,
      isHalfPrice,
      savings,
      targetPrice,
      notifyBelow,
      lastCheckedAt: now,
    });

    if (price !== null) {
      await db.insert(priceHistory).values({
        id: randomUUID(),
        productId,
        price: priceStr,
        checkedAt: now,
      });
    }
  } catch {
    return {
      success: false,
      error: "Failed to add product. Please try again.",
    };
  }

  if (price === null) {
    return {
      success: true,
      message:
        "Product added. Price could not be fetched — it may be updated later.",
    };
  }

  return { success: true };
}
