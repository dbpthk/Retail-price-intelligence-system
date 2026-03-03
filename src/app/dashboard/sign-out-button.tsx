"use client";

import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

export function SignOutButton() {
  const router = useRouter();

  const handleSignOut = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/sign-in");
          router.refresh();
        },
      },
    });
  };

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-[#6B7280] transition-colors hover:border-gray-300 hover:bg-gray-50 hover:text-[#111827] dark:border-gray-600 dark:text-[#9CA3AF] dark:hover:border-gray-500 dark:hover:bg-gray-800 dark:hover:text-[#E5E7EB]"
    >
      Sign Out
    </button>
  );
}
