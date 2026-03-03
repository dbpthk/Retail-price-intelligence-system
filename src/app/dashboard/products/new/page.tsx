import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function NewProductPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 sm:px-6">
          <Link
            href="/dashboard"
            className="text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-md px-4 py-8 sm:px-6">
        <h1 className="mb-6 text-xl font-semibold text-gray-900">
          Add Product
        </h1>
        <p className="text-sm text-gray-500">
          Add product form coming soon. Price fetching will be implemented
          later.
        </p>
      </div>
    </main>
  );
}
