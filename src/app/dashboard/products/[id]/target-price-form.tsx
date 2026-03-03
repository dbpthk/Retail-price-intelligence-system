"use client";

import { updateTargetPrice } from "@/lib/actions/update-target-price";
import { useRouter } from "next/navigation";
import { useState } from "react";

type TargetPriceFormProps = {
  productId: string;
  currentTargetPrice: string | null;
  currentNotifyBelow: number | null;
};

export function TargetPriceForm({
  productId,
  currentTargetPrice,
  currentNotifyBelow,
}: TargetPriceFormProps) {
  const router = useRouter();
  const [targetValue, setTargetValue] = useState(currentTargetPrice ?? "");
  const [notifyValue, setNotifyValue] = useState(
    currentNotifyBelow != null ? String(currentNotifyBelow) : ""
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsPending(true);

    const targetPrice = targetValue.trim() || null;
    let notifyBelow: number | null = null;
    if (notifyValue.trim()) {
      const num = parseFloat(notifyValue.trim());
      if (!Number.isNaN(num) && num > 0 && num <= 100) {
        notifyBelow = num;
      }
    }

    const result = await updateTargetPrice(productId, targetPrice, notifyBelow);

    if (result.success) {
      router.refresh();
    } else {
      setError(result.error);
    }
    setIsPending(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="targetPrice"
          className="block text-sm font-medium text-[#111827] dark:text-[#E5E7EB]"
        >
          Notify when price drops below
        </label>
        <div className="mt-1 flex gap-2">
          <input
            id="targetPrice"
            type="text"
            inputMode="decimal"
            value={targetValue}
            onChange={(e) => setTargetValue(e.target.value)}
            placeholder="e.g. 29.99"
            disabled={isPending}
            className="block w-32 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-[#111827] shadow-sm focus:border-[#1D4ED8] focus:outline-none focus:ring-1 focus:ring-[#1D4ED8] disabled:opacity-50 dark:border-gray-600 dark:bg-[#111827] dark:text-[#E5E7EB]"
          />
        </div>
      </div>
      <div>
        <label
          htmlFor="notifyBelow"
          className="block text-sm font-medium text-[#111827] dark:text-[#E5E7EB]"
        >
          Notify when price drops by %
        </label>
        <div className="mt-1 flex gap-2">
          <input
            id="notifyBelow"
            type="text"
            inputMode="decimal"
            value={notifyValue}
            onChange={(e) => setNotifyValue(e.target.value)}
            placeholder="e.g. 20"
            disabled={isPending}
            className="block w-32 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-[#111827] shadow-sm focus:border-[#1D4ED8] focus:outline-none focus:ring-1 focus:ring-[#1D4ED8] disabled:opacity-50 dark:border-gray-600 dark:bg-[#111827] dark:text-[#E5E7EB]"
          />
        </div>
        <p className="mt-1 text-xs text-[#6B7280] dark:text-[#9CA3AF]">
          Email when price drops by this % or more (e.g. 20 = 20%+ drop).
        </p>
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-[#1D4ED8] px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#1E40AF] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8] focus:ring-offset-2 disabled:opacity-50 dark:focus:ring-offset-[#111827]"
        >
          {isPending ? "Saving..." : "Save"}
        </button>
      </div>
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}
      <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
        You&apos;ll receive an email when either condition is met. Leave both
        empty to disable notifications.
      </p>
    </form>
  );
}
