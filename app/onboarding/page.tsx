import { redirect } from "next/navigation";

import OnboardingForm from "@/components/onboarding/onboarding-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { getUserProfile, isProfileComplete } from "@/lib/data";
import { getDashboardPathForRole } from "@/lib/onboarding";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const user = await requireUser();
  const profile = await getUserProfile(user.id);

  // Nothing to onboard: send the user straight to the right place.
  if (isProfileComplete(profile)) {
    redirect(getDashboardPathForRole(user.role));
  }

  const isOrganizer = user.role === "ORGANIZER";

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 md:px-8">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.28em] text-[#5B6178]">
          {isOrganizer ? "Krew · Organizer setup" : "Krew · Worker setup"}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#0B1020]">
          {isOrganizer ? "Set up your staffing desk" : "Let's get you ready to work"}
        </h1>
        <p className="mt-2 max-w-2xl text-[#5B6178]">
          {isOrganizer
            ? "Three quick steps and you can publish your first staffing request. Only the essentials are required."
            : "Three quick steps so organizers can judge your applications on real information. Optional details can be added later."}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your profile</CardTitle>
          <CardDescription>
            {isOrganizer
              ? "This is what workers see when they consider your shifts."
              : "This is what organizers see when they review your applications."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OnboardingForm
            role={user.role}
            initial={{
              name: profile?.name ?? user.name ?? "",
              city: profile?.workerProfile?.city ?? "",
              availability: profile?.workerProfile?.availability ?? "",
              skills: profile?.workerProfile?.skills ?? [],
              bio: profile?.workerProfile?.bio ?? "",
              companyName: profile?.organizerProfile?.companyName ?? "",
              location: profile?.organizerProfile?.location ?? "",
              phone: profile?.organizerProfile?.phone ?? "",
              description: profile?.organizerProfile?.description ?? "",
            }}
          />
        </CardContent>
      </Card>
    </main>
  );
}
