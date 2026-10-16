import { ResetPasswordForm } from "@/components/auth/auth-forms";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ResetPasswordPage({
  searchParams,
}: {
  searchParams?: { token?: string };
}) {
  return (
    <>
      <main className="mx-auto flex min-h-[calc(100vh-72px)] max-w-5xl items-center justify-center px-4 py-12 md:px-8">
        <Card className="w-full max-w-xl border-[#E7E8F0]">
          <CardHeader className="space-y-2 text-center">
            <p className="text-xs uppercase tracking-[0.28em] text-[#5B6178]">Set a new password</p>
            <CardTitle className="text-3xl">Choose a stronger password</CardTitle>
            <CardDescription>Use a unique password and sign in again after the reset completes.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ResetPasswordForm initialToken={searchParams?.token} />
          </CardContent>
        </Card>
      </main>
    </>
  );
}
