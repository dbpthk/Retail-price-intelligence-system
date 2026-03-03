"use client";

import { addProduct } from "@/lib/actions/add-product";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { toast } from "sonner";

function FormFields({
  error,
  message,
}: {
  error: string | undefined;
  message: string | undefined;
}) {
  const { pending } = useFormStatus();

  return (
    <>
      <div>
        <label
          htmlFor="url"
          className="block text-sm font-medium text-[#111827] dark:text-[#E5E7EB]"
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
          className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-[#111827] shadow-sm focus:border-[#1D4ED8] focus:outline-none focus:ring-1 focus:ring-[#1D4ED8] disabled:opacity-50 dark:border-gray-600 dark:bg-[#111827] dark:text-[#E5E7EB]"
        />
      </div>
      <div>
        <label
          htmlFor="targetPrice"
          className="block text-sm font-medium text-[#111827] dark:text-[#E5E7EB]"
        >
          Notify when price drops below (optional)
        </label>
        <input
          id="targetPrice"
          name="targetPrice"
          type="text"
          inputMode="decimal"
          placeholder="e.g. 29.99"
          disabled={pending}
          className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-[#111827] shadow-sm focus:border-[#1D4ED8] focus:outline-none focus:ring-1 focus:ring-[#1D4ED8] disabled:opacity-50 dark:border-gray-600 dark:bg-[#111827] dark:text-[#E5E7EB]"
        />
        <p className="mt-1 text-xs text-[#6B7280] dark:text-[#9CA3AF]">
          You&apos;ll receive an email only when the price falls below this
          value.
        </p>
      </div>
      <div>
        <label
          htmlFor="notifyBelow"
          className="block text-sm font-medium text-[#111827] dark:text-[#E5E7EB]"
        >
          Notify when price drops by % (optional)
        </label>
        <input
          id="notifyBelow"
          name="notifyBelow"
          type="text"
          inputMode="decimal"
          placeholder="e.g. 20"
          disabled={pending}
          className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-[#111827] shadow-sm focus:border-[#1D4ED8] focus:outline-none focus:ring-1 focus:ring-[#1D4ED8] disabled:opacity-50 dark:border-gray-600 dark:bg-[#111827] dark:text-[#E5E7EB]"
        />
        <p className="mt-1 text-xs text-[#6B7280] dark:text-[#9CA3AF]">
          You&apos;ll receive an email when the price drops by this percentage
          or more (e.g. 20 = notify on 20%+ drop).
        </p>
      </div>
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="text-sm text-amber-600 dark:text-amber-400" role="status">
          {message}
        </p>
      )}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-[#1D4ED8] px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#1E40AF] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8] focus:ring-offset-2 disabled:opacity-50 dark:focus:ring-offset-[#111827]"
        >
          {pending ? "Adding..." : "Add to Watchlist"}
        </button>
        <button
          type="button"
          onClick={() => window.history.back()}
          disabled={pending}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-[#6B7280] transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-[#9CA3AF] dark:hover:bg-gray-800"
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
      toast.success(state.message ?? "Product added to watchlist");
      router.push("/dashboard");
      router.refresh();
    } else if (state && !state.success) {
      toast.error(state.error);
    }
  }, [state, router]);

  return (
    <form action={formAction} className="space-y-4">
      <FormFields
        error={state && !state.success ? state.error : undefined}
        message={state?.success ? state.message : undefined}
      />
    </form>
  );
}
