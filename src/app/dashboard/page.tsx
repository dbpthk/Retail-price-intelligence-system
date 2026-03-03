import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { SignOutButton } from "./sign-out-button";

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

  return (
    <main className="flex min-h-screen flex-col p-8">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <SignOutButton />
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Logged-in User</h2>
          <dl className="space-y-2">
            <div>
              <dt className="text-sm font-medium text-gray-500">Name</dt>
              <dd className="text-base">{session.user.name}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Email</dt>
              <dd className="text-base">{session.user.email}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">User ID</dt>
              <dd className="font-mono text-sm text-gray-600">
                {session.user.id}
              </dd>
            </div>
            {session.user.image && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Image</dt>
                <dd>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={session.user.image}
                    alt=""
                    className="mt-1 h-12 w-12 rounded-full"
                  />
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>
    </main>
  );
}
