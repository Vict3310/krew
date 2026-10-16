import Link from "next/link";
import { Suspense } from "react";

import { LoginForm } from "@/components/auth/auth-forms";
import QuickAccessAccounts from "@/components/demo-login-picker";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  // The quick-access accounts only exist in demo mode; showing them against a
  // live database would offer credentials that cannot work.
  const demoMode = process.env.DEMO_AUTH === "true" || process.env.NEXT_PUBLIC_DEMO_AUTH === "true";

  return (
    <>
      <main className="mx-auto flex min-h-[calc(100vh-72px)] max-w-5xl items-center justify-center px-4 py-12 md:px-8">
        <Card className="w-full max-w-xl border-[#E7E8F0]">
          <CardHeader className="space-y-2 text-center">
            <p className="text-xs uppercase tracking-[0.28em] text-[#5B6178]">Welcome back</p>
            <CardTitle className="text-3xl">Sign in to Krew</CardTitle>
            <CardDescription>Use your email or username with your password to continue.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {demoMode ? <QuickAccessAccounts /> : null}
            <Suspense fallback={<div className="text-sm text-[#5B6178]">Preparing sign-in form…</div>}>
              <LoginForm />
            </Suspense>
            <div className="flex items-center justify-between text-sm text-[#5B6178]">
              <Link href="/auth/forgot-password" className="font-medium text-[#4A2FD6]">Forgot password?</Link>
              <Link href="/auth/register" className="font-medium text-[#4A2FD6]">Create an account</Link>
            </div>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
