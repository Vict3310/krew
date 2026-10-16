import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/*
 * Notification delivery has no provider behind it yet, so this screen states
 * that plainly instead of offering toggles and a save button that store
 * nothing. When delivery ships, these rows become the real preferences.
 */
const plannedUpdates = [
  { title: "New shift alerts", body: "When a staffing request matching your city and skills is published." },
  { title: "Application status updates", body: "When an organizer accepts or passes on your application." },
  { title: "Event reminders", body: "Before a confirmed shift, with venue and check-in details." },
  { title: "Payout records", body: "When a payout record for completed work changes status." },
];

export default async function NotificationsSettingsPage() {
  await requireUser();

  return (
    <main className="mx-auto max-w-3xl space-y-8 px-4 py-8 md:px-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-[#5B6178]">Notifications</p>
          <h1 className="mt-2 text-3xl font-semibold text-[#0B1020]">Delivery preferences</h1>
        </div>
        <Link href="/settings">
          <Button variant="secondary">Back</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Not switched on yet</CardTitle>
          <CardDescription>
            Krew has no outbound email delivery connected in this environment, so there are no
            preferences to store and nothing is being sent. This is what will become configurable.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {plannedUpdates.map((update) => (
            <div
              key={update.title}
              className="flex flex-col gap-2 rounded-2xl border border-[#E9EAF2] bg-[#FAFAFD] p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-sm font-medium text-[#0B1020]">{update.title}</p>
                <p className="mt-1 text-sm text-[#5B6178]">{update.body}</p>
              </div>
              <Badge variant="secondary" className="w-fit shrink-0">
                Not enabled
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </main>
  );
}
