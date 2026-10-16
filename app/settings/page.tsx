import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const links = [
  { title: "Security", description: "Password, sessions and account safety", href: "/settings/security" },
  { title: "Notifications", description: "Shift alerts, updates and reminders", href: "/settings/notifications" },
  { title: "Profile", description: "Basic account and personal details", href: "/profile" },
];

export default async function SettingsPage() {
  await requireUser();

  return (
    <>
      <main className="mx-auto max-w-5xl space-y-8 px-4 py-8 md:px-8">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-[#5B6178]">Settings</p>
          <h1 className="mt-2 text-3xl font-semibold text-[#0B1020]">Account controls</h1>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {links.map((item) => (
            <Card key={item.title}>
              <CardHeader>
                <CardTitle>{item.title}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href={item.href}>
                  <Button className="w-full">Open</Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </>
  );
}
