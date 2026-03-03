"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { fetchProductInfo } from "@/lib/services";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

const PLACEHOLDER_TITLE = "Product";
const DEFAULT_PRICE_SELECTOR =
  ".price, .product-price, [data-price], #price, span[class*='price']";

export type RefreshProductTitleResult =
  | { success: true; title: string }
  | { success: false; error: string };

export async function refreshProductTitle(
  productId: string
): Promise<RefreshProductTitleResult> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

  const [product] = await db
    .select({ url: products.url, title: products.title })
    .from(products)
    .where(
      and(
        eq(products.id, productId),
        eq(products.userId, session.user.id)
      )
    )
    .limit(1);

  if (!product) {
    return { success: false, error: "Product not found" };
  }

  try {
    const info = await fetchProductInfo(product.url, {
      selector: DEFAULT_PRICE_SELECTOR,
      timeoutMs: 10_000,
    });

    const newTitle = info.title?.trim() || PLACEHOLDER_TITLE;
    if (newTitle === product.title) {
      return { success: true, title: newTitle };
    }

    await db
      .update(products)
      .set({ title: newTitle })
      .where(
        and(
          eq(products.id, productId),
          eq(products.userId, session.user.id)
        )
      );

    return { success: true, title: newTitle };
  } catch {
    return { success: false, error: "Failed to fetch product info" };
  }
}
