// app/(site)/verify-sent/page.tsx
export const dynamic = "force-dynamic";

export default async function VerifySentPage({
  searchParams,
}: {
  // NOTE: searchParams is async in Next 15+ in some cases — accept Promise
  searchParams: Promise<{ email?: string }>;
}) {
  const sp = await searchParams;
  const email = (sp?.email ?? "").trim();

  return (
    <main className="min-h-screen w-full bg-white">
      <div className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="text-2xl font-bold">Verify your email</h1>
        <p className="mt-2 text-sm text-neutral-600">
          We’ve sent a verification link to <span className="font-medium">{email || "your email"}</span>.
          If you didn’t receive it, you can resend a new link. The link expires in 1 hour.
        </p>

        <form
          className="mt-6"
          action="/api/auth/request-verify"
          method="POST"
        >
          <input type="hidden" name="email" value={email} />
          <button
            type="submit"
            className="rounded-lg bg-black px-4 py-2 text-white hover:opacity-90"
          >
            Resend verification email
          </button>
        </form>
      </div>
    </main>
  );
}
