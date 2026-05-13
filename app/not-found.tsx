import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-svh items-center justify-center px-6">
      <div className="phone-shell text-center">
        <p className="text-sm text-warm-muted">Page not found</p>
        <h1 className="mt-3 font-serif text-4xl text-warm-text">This link is not active.</h1>
        <Link className="mt-8 inline-flex text-sm font-semibold" href="/maya">
          Go to Maya&apos;s page
        </Link>
      </div>
    </main>
  );
}
