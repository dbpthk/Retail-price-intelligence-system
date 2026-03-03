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
          className="block text-sm font-medium text-gray-700"
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
            className="block w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
          />
        </div>
      </div>
      <div>
        <label
          htmlFor="notifyBelow"
          className="block text-sm font-medium text-gray-700"
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
            className="block w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
          />
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Email when price drops by this % or more (e.g. 20 = 20%+ drop).
        </p>
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {isPending ? "Saving..." : "Save"}
        </button>
      </div>
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      <p className="text-xs text-gray-500">
        You&apos;ll receive an email when either condition is met. Leave both
        empty to disable notifications.
      </p>
    </form>
  );
}
