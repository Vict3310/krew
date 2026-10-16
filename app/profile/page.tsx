import ProfileForm from "@/components/profile-form";
import { requireUser } from "@/lib/auth";
import { getUserProfile } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await requireUser();
  const profile = await getUserProfile(user.id);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 md:px-8">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.25em] text-[#5B6178]">Account</p>
        <h1 className="mt-2 text-3xl font-semibold text-[#0B1020]">Your profile</h1>
      </div>

      <ProfileForm
        role={user.role}
        initial={{
          name: profile?.name ?? user.name ?? "",
          username: profile?.username ?? user.username,
          email: profile?.email ?? user.email,
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
    </main>
  );
}
