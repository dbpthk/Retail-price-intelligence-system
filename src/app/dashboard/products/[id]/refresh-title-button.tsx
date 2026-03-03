"use client";

import { refreshProductTitle } from "@/lib/actions/refresh-product-title";
import { useRouter } from "next/navigation";
import { useState } from "react";

type RefreshTitleButtonProps = {
  productId: string;
};

export function RefreshTitleButton({ productId }: RefreshTitleButtonProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  const handleClick = async () => {
    setIsPending(true);
    const result = await refreshProductTitle(productId);
    if (result.success) {
      router.refresh();
    }
    setIsPending(false);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="text-xs text-[#6B7280] underline-offset-2 hover:underline disabled:opacity-50 dark:text-[#9CA3AF]"
    >
      {isPending ? "Refreshing..." : "Refresh product name"}
    </button>
  );
}
