import { redirect } from "next/navigation";

import DashboardContent from "@/components/dashboard-content";
import { requireUser } from "@/lib/auth";
import { getUserProfile, getPublicShifts, getWorkerDashboard, isProfileComplete } from "@/lib/data";
import { getDashboardPathForRole } from "@/lib/onboarding";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();

  // Organizers get their own operations view; admins the console.
  if (user.role !== "WORKER") {
    redirect(getDashboardPathForRole(user.role));
  }

  const profile = await getUserProfile(user.id);
  if (!isProfileComplete(profile)) {
    redirect("/onboarding");
  }

  const [{ applications, assignments, earnings }, shifts] = await Promise.all([
    getWorkerDashboard(user.id),
    getPublicShifts(),
  ]);

  const pending = applications.filter((application) => application.status === "PENDING").length;
  const accepted = applications.filter((application) => application.status === "ACCEPTED").length;

  const appliedShiftIds = new Set(applications.map((application) => application.shiftId));
  const recommended = shifts
    .filter((shift) => !appliedShiftIds.has(shift.id))
    .slice(0, 3)
    .map((shift) => ({
      id: shift.id,
      title: shift.title,
      location: shift.location,
      category: shift.category,
      shiftDate: shift.shiftDate.toISOString(),
      compensation: shift.compensation,
    }));

  return (
    <DashboardContent
      name={profile?.name ?? user.name ?? user.username}
      profile={{
        city: profile?.workerProfile?.city ?? null,
        availability: profile?.workerProfile?.availability ?? null,
        skills: profile?.workerProfile?.skills ?? [],
      }}
      stats={{
        applications: applications.length,
        pending,
        accepted,
        paid: earnings.paid,
        pendingPay: earnings.pending,
      }}
      applications={applications.slice(0, 5).map((application) => ({
        id: application.id,
        status: application.status,
        createdAt: application.createdAt.toISOString(),
        shiftId: application.shiftId,
        shiftTitle: application.shift.title,
        shiftLocation: application.shift.location,
        shiftDate: application.shift.shiftDate.toISOString(),
        compensation: application.shift.compensation,
      }))}
      assignments={assignments.slice(0, 5).map((assignment) => ({
        id: assignment.id,
        shiftId: assignment.shiftId,
        status: assignment.status,
        shiftTitle: assignment.shift.title,
        shiftLocation: assignment.shift.location,
        shiftVenue: assignment.shift.venue,
        shiftDate: assignment.shift.shiftDate.toISOString(),
        startTime: assignment.shift.startTime,
        endTime: assignment.shift.endTime,
      }))}
      recommended={recommended}
    />
  );
}
