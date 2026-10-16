import Link from "next/link";

import { ForgotPasswordForm } from "@/components/auth/auth-forms";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ForgotPasswordPage() {
  return (
    <>
      <main className="mx-auto flex min-h-[calc(100vh-72px)] max-w-5xl items-center justify-center px-4 py-12 md:px-8">
        <Card className="w-full max-w-xl border-[#E7E8F0]">
          <CardHeader className="space-y-2 text-center">
            <p className="text-xs uppercase tracking-[0.28em] text-[#5B6178]">Password reset</p>
            <CardTitle className="text-3xl">Reset your account password</CardTitle>
            <CardDescription>Enter the email connected to your Krew account.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ForgotPasswordForm />
            <p className="text-center text-sm text-[#5B6178]">
              Remembered it? <Link href="/auth/login" className="font-medium text-[#4A2FD6]">Back to login</Link>
            </p>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
