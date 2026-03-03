import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { AddProductForm } from "./add-product-form";

export default async function NewProductPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

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

      <div className="mx-auto max-w-md px-4 py-8 sm:px-6">
        <h1 className="mb-2 text-xl font-semibold text-[#111827] dark:text-[#E5E7EB]">
          Add Product
        </h1>
        <p className="mb-6 text-sm text-[#6B7280] dark:text-[#9CA3AF]">
          Enter a product URL to add it to your watchlist. Price will be updated
          when fetching is enabled.
        </p>
        <AddProductForm />
      </div>
    </main>
  );
}
