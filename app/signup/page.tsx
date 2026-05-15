import { SignupForm } from "@/components/auth/signup-form";
import { sanitizeReturnTo } from "@/lib/auth/destinations";

export default async function SignupPage({
  searchParams
}: {
  searchParams: Promise<{ return_to?: string | string[] }>;
}) {
  const params = await searchParams;
  const rawReturnTo = Array.isArray(params.return_to) ? params.return_to[0] : params.return_to;
  const returnTo = sanitizeReturnTo(rawReturnTo);

  return (
    <main className="min-h-svh px-5 py-10">
      <div className="mx-auto flex min-h-[calc(100svh-5rem)] w-full max-w-md flex-col justify-center">
        <SignupForm returnTo={returnTo} />
      </div>
    </main>
  );
}
