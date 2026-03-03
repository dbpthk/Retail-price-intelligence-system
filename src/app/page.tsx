import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-2xl font-bold">Retail Price Intelligence System</h1>
      <div className="flex gap-4">
        <Link
          href="/sign-in"
          className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Sign In
        </Link>
        <Link
          href="/sign-up"
          className="rounded-md border border-gray-300 px-4 py-2 hover:bg-gray-50"
        >
          Sign Up
        </Link>
        <Link
          href="/dashboard"
          className="rounded-md border border-gray-300 px-4 py-2 hover:bg-gray-50"
        >
          Dashboard
        </Link>
      </div>
    </main>
  );
}
