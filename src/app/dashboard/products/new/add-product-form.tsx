"use client";

import { addProduct } from "@/lib/actions/add-product";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";

function FormFields({ error }: { error: string | undefined }) {
  const { pending } = useFormStatus();

  return (
    <>
      <div>
        <label
          htmlFor="url"
          className="block text-sm font-medium text-gray-700"
        >
          Product URL
        </label>
        <input
          id="url"
          name="url"
          type="url"
          required
          placeholder="https://example.com/product"
          disabled={pending}
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
        />
      </div>
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {pending ? "Adding..." : "Add to Watchlist"}
        </button>
        <button
          type="button"
          onClick={() => window.history.back()}
          disabled={pending}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </>
  );
}

export function AddProductForm() {
  const router = useRouter();
  const [state, formAction] = useFormState(addProduct, null);

  useEffect(() => {
    if (state?.success) {
      router.push("/dashboard");
      router.refresh();
    }
  }, [state, router]);

  return (
    <form action={formAction} className="space-y-4">
      <FormFields error={state && !state.success ? state.error : undefined} />
    </form>
  );
}
