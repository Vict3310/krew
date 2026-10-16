import Link from "next/link";

import ChangePasswordForm from "@/components/settings/change-password-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function SecuritySettingsPage() {
  const user = await requireUser();

  return (
    <main className="mx-auto max-w-3xl space-y-8 px-4 py-8 md:px-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-[#5B6178]">Security</p>
          <h1 className="mt-2 text-3xl font-semibold text-[#0B1020]">Account protection</h1>
        </div>
        <Link href="/settings">
          <Button variant="secondary">Back</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Change password</CardTitle>
          <CardDescription>Confirm your current password, then choose a new one.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Signed-in account</CardTitle>
          <CardDescription>Details attached to this session.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-[#5B6178]">
          <div className="flex items-center justify-between rounded-2xl bg-[#F9F9FC] p-3">
            <span>Email</span>
            <span className="font-medium text-[#0B1020]">{user.email}</span>
          </div>
          <div className="flex items-center justify-between rounded-2xl bg-[#F9F9FC] p-3">
            <span>Username</span>
            <span className="font-medium text-[#0B1020]">{user.username}</span>
          </div>
          <div className="flex items-center justify-between rounded-2xl bg-[#F9F9FC] p-3">
            <span>Role</span>
            <span className="font-medium text-[#0B1020]">{user.role}</span>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
