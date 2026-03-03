"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export type DeleteProductResult =
  | { success: true }
  | { success: false; error: string };

export async function deleteProduct(productId: string): Promise<DeleteProductResult> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

  try {
    const result = await db
      .delete(products)
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
    return { success: false, error: "Failed to delete product" };
  }
}
