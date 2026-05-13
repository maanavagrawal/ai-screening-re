import { SignupForm } from "@/components/auth/signup-form";

export default function SignupPage() {
  return (
    <main className="min-h-svh px-5 py-10">
      <div className="mx-auto flex min-h-[calc(100svh-5rem)] w-full max-w-md flex-col justify-center">
        <SignupForm />
      </div>
    </main>
  );
}

