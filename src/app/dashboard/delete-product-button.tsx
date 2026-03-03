"use client";

import { deleteProduct } from "@/lib/actions/delete-product";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

type DeleteProductButtonProps = {
  productId: string;
  productTitle: string;
};

export function DeleteProductButton({
  productId,
  productTitle,
}: DeleteProductButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    const result = await deleteProduct(productId);
    if (result.success) {
      toast.success("Product removed from watchlist");
      setIsOpen(false);
      router.refresh();
    } else {
      toast.error(result.error ?? "Failed to delete product");
    }
    setIsDeleting(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#6B7280] transition-colors hover:bg-red-50 hover:text-red-600 dark:text-[#9CA3AF] dark:hover:bg-red-900/20 dark:hover:text-red-400"
        aria-label="Delete product"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
          />
        </svg>
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          aria-modal="true"
          role="dialog"
          aria-labelledby="delete-dialog-title"
          onClick={() => !isDeleting && setIsOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-[#111827]"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="delete-dialog-title"
              className="mb-2 text-lg font-semibold text-[#111827] dark:text-[#E5E7EB]"
            >
              Delete product
            </h2>
            <p className="mb-6 text-sm text-[#6B7280] dark:text-[#9CA3AF]">
              Are you sure you want to delete &quot;{productTitle}&quot;? This
              action cannot be undone.
            </p>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => !isDeleting && setIsOpen(false)}
                disabled={isDeleting}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-[#6B7280] transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-[#9CA3AF] dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
