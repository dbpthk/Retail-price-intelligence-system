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
      className="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
    >
      Sign Out
    </button>
  );
}
