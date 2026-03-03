"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export type UpdateTargetPriceResult =
  | { success: true }
  | { success: false; error: string };

export async function updateTargetPrice(
  productId: string,
  targetPrice: string | null,
  notifyBelow: number | null = null
): Promise<UpdateTargetPriceResult> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

  let targetValue: string | null = null;
  if (targetPrice?.trim()) {
    const num = parseFloat(targetPrice.trim().replace(/,/g, ""));
    if (!Number.isNaN(num) && num > 0) {
      targetValue = String(num);
    }
  }

  let notifyBelowValue: number | null = null;
  if (notifyBelow !== null && notifyBelow !== undefined) {
    const num = Number(notifyBelow);
    if (!Number.isNaN(num) && num > 0 && num <= 100) {
      notifyBelowValue = num;
    }
  }

  try {
    const result = await db
      .update(products)
      .set({
        targetPrice: targetValue,
        notifyBelow: notifyBelowValue,
      })
      .where(
        and(
          eq(products.id, productId),
          eq(products.userId, session.user.id)
        )
      )
      .returning({ id: products.id });

    if (result.length === 0) {
      return { success: false, error: "Product not found" };
    }

    return { success: true };
  } catch {
    return { success: false, error: "Failed to update notification settings" };
  }
}
