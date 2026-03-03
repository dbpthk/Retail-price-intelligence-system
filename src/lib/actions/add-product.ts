"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { randomUUID } from "crypto";

const PLACEHOLDER_PRICE = "—";
const PLACEHOLDER_TITLE = "Product";

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
  | { success: true }
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

  try {
    await db.insert(products).values({
      id: randomUUID(),
      userId: session.user.id,
      title: PLACEHOLDER_TITLE,
      url: normalizedUrl,
      currentPrice: PLACEHOLDER_PRICE,
    });
  } catch {
    return {
      success: false,
      error: "Failed to add product. Please try again.",
    };
  }

  return { success: true };
}
