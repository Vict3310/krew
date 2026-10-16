import ApplicationsContent from "@/components/applications-content";
import { requireUser } from "@/lib/auth";
import { getWorkerApplications } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function ApplicationsPage() {
  const user = await requireUser();
  const applications = await getWorkerApplications(user.id);

  return (
    <ApplicationsContent
      applications={applications.map((application) => ({
        id: application.id,
        status: application.status,
        coverNote: application.coverNote,
        createdAt: application.createdAt.toISOString(),
        shiftId: application.shiftId,
        shiftTitle: application.shift.title,
        shiftLocation: application.shift.location,
        shiftVenue: application.shift.venue,
        shiftDate: application.shift.shiftDate.toISOString(),
        startTime: application.shift.startTime,
        endTime: application.shift.endTime,
        compensation: application.shift.compensation,
        organizerName: application.shift.organizer?.name ?? application.shift.organizer?.username ?? "Event organizer",
      }))}
    />
  );
}
