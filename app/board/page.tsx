import { auth, signOut } from "@/auth";
import { STATUSES } from "@/lib/status";

export default async function BoardPage() {
  const session = await auth();

  return (
    <main className="flex min-h-screen flex-col bg-gray-50">
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
        <h1 className="text-lg font-semibold">Job Application Tracker</h1>
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <span>{session?.user?.email}</span>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button type="submit" className="hover:text-gray-900">
              Sign out
            </button>
          </form>
        </div>
      </header>

      <div className="flex flex-1 gap-4 overflow-x-auto p-6">
        {STATUSES.map((status) => (
          <div
            key={status.value}
            className="flex w-72 shrink-0 flex-col rounded-lg bg-gray-100"
          >
            <div className="px-4 py-3 text-sm font-medium text-gray-700">
              {status.label}
            </div>
            <div className="flex flex-1 flex-col gap-2 px-3 pb-3">
              {/* Job cards land here in Phase 2 */}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
