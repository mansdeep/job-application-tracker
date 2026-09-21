export default function VerifyRequestPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-lg border border-green-200 bg-green-50 p-6 text-center">
        <h1 className="text-lg font-semibold text-green-900">
          Check your email
        </h1>
        <p className="mt-2 text-sm text-green-800">
          We sent you a sign-in link. Click it to continue.
        </p>
      </div>
    </main>
  );
}
