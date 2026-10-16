import Link from "next/link";

import { RegisterForm } from "@/components/auth/auth-forms";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { parseSignupRole } from "@/lib/onboarding";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; next?: string }>;
}) {
  const params = await searchParams;
  const role = parseSignupRole(params.role);
  const isOrganizer = role === "ORGANIZER";

  return (
    <>
      <main className="mx-auto flex min-h-[calc(100vh-72px)] max-w-5xl items-center justify-center px-4 py-12 md:px-8">
        <Card className="w-full max-w-xl border-[#E7E8F0]">
          <CardHeader className="space-y-2 text-center">
            <p className="text-xs uppercase tracking-[0.28em] text-[#5B6178]">
              {isOrganizer ? "Hire event staff" : "Find event work"}
            </p>
            <CardTitle className="text-3xl">
              {isOrganizer ? "Create your organizer account" : "Create your worker account"}
            </CardTitle>
            <CardDescription>
              {isOrganizer
                ? "Publish staffing requests, review applicants and confirm your crew. Next step: a short setup so workers know who you are."
                : "Apply for event shifts and track every decision in one place. Next step: a short profile so organizers can judge your applications."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Keyed by role so switching intent from the landing page resets the choice. */}
            <RegisterForm key={role} initialRole={role} />
            <p className="text-center text-sm text-[#5B6178]">
              Already have an account? <Link href="/auth/login" className="font-medium text-[#4A2FD6]">Sign in</Link>
            </p>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
