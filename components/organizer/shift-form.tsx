"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import VenuePicker, {
  emptyVenueLocation,
  type VenueLocationValue,
} from "@/components/venue/venue-picker";
import { hasConfirmedVenueCoordinates } from "@/lib/geo/coordinates";
import { createOrUpdateShift } from "@/lib/actions/shifts";

const shiftSchema = z.object({
  title: z.string().trim().min(3, "Shift title must be at least 3 characters."),
  category: z.string().trim().min(2, "Choose a category for this role."),
  location: z.string().trim().min(2, "Location is required."),
  venue: z.string().trim().min(3, "Venue is required."),
  date: z.string().min(1, "Pick a shift date."),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Use a HH:MM start time."),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Use a HH:MM end time."),
  // Registered with valueAsNumber, so these arrive as numbers already. Keeping
  // them as plain numbers (not z.coerce) keeps the resolver's input and output
  // types identical, which react-hook-form needs.
  requiredStaff: z.number({ error: "Enter how many crew you need." }).int().min(1, "At least 1 crew member is required."),
  compensation: z.number({ error: "Enter the pay per person." }).int().min(1000, "Pay must be at least ₦1,000."),
  deadline: z.string().min(1, "Pick an application deadline."),
  description: z.string().trim().min(20, "Describe the role with at least 20 characters."),
});

type ShiftFormValues = z.infer<typeof shiftSchema>;

export default function ShiftForm({
  shiftId,
  initial,
  initialVenueLocation,
}: {
  shiftId?: string;
  initial: ShiftFormValues;
  initialVenueLocation?: VenueLocationValue;
}) {
  const router = useRouter();
  const { push } = useToast();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [pinConfirmed, setPinConfirmed] = useState<boolean>(
    hasConfirmedVenueCoordinates(initialVenueLocation ?? emptyVenueLocation),
  );
  const isEdit = Boolean(shiftId);

  // Venue location is kept outside react-hook-form: it is a set of map driven
  // values that are edited through the picker rather than typed into fields.
  const [venueLocation, setVenueLocation] = useState<VenueLocationValue>(
    initialVenueLocation ?? emptyVenueLocation,
  );

  const form = useForm<ShiftFormValues>({ resolver: zodResolver(shiftSchema), defaultValues: initial });

  // `useWatch` rather than `form.watch()`: reading the value through a hook
  // keeps the venue picker's placeholder in step with the form safely.
  const venueName = useWatch({ control: form.control, name: "venue" }) ?? "";

  const onSubmit = async (values: ShiftFormValues) => {
    setSaving(true);
    setError(null);

    if (venueLocation.latitude != null && venueLocation.longitude != null && !pinConfirmed) {
      setError("Please confirm the venue pin on the map before publishing this shift.");
      push({ title: "Confirm the venue pin", description: "A location is only saved after you confirm it on the map.", variant: "error" });
      setSaving(false);
      return;
    }

    const safeVenueLocation = pinConfirmed ? venueLocation : { ...venueLocation, latitude: null, longitude: null, locationPrecision: "" };
    const result = await createOrUpdateShift({ ...values, ...safeVenueLocation, id: shiftId });

    if (!result.ok) {
      setError(result.error ?? "Unable to save this shift.");
      push({ title: "Could not save shift", description: result.error, variant: "error" });
      setSaving(false);
      return;
    }

    push({
      title: isEdit ? "Shift updated" : "Shift published",
      description: isEdit ? "Your changes are live." : "Workers can now discover and apply to this shift.",
      variant: "success",
    });
    router.push("/organizer/shifts");
    router.refresh();
  };

  const errors = form.formState.errors;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEdit ? "Edit shift" : "Create a staffing request"}</CardTitle>
        <CardDescription>
          {isEdit
            ? "Update the details workers see on the marketplace."
            : "Publish the role, venue, date, pay and headcount. Workers see all of it before applying."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-5 md:grid-cols-2" onSubmit={form.handleSubmit(onSubmit)}>
          {error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 md:col-span-2">{error}</p> : null}

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="title">Shift title</Label>
            <Input id="title" {...form.register("title")} placeholder="Festival gate team" />
            {errors.title ? <p className="text-xs text-red-600">{errors.title.message}</p> : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Input id="category" {...form.register("category")} placeholder="Security, hospitality, ushering…" />
            {errors.category ? <p className="text-xs text-red-600">{errors.category.message}</p> : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">City</Label>
            <Input id="location" {...form.register("location")} placeholder="Lagos" />
            {errors.location ? <p className="text-xs text-red-600">{errors.location.message}</p> : null}
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="venue">Venue</Label>
            <Input id="venue" {...form.register("venue")} placeholder="Eko Atlantic Event Grounds" />
            {errors.venue ? <p className="text-xs text-red-600">{errors.venue.message}</p> : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Shift date</Label>
            <Input id="date" type="date" {...form.register("date")} />
            {errors.date ? <p className="text-xs text-red-600">{errors.date.message}</p> : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="deadline">Applications close</Label>
            <Input id="deadline" type="date" {...form.register("deadline")} />
            {errors.deadline ? <p className="text-xs text-red-600">{errors.deadline.message}</p> : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="startTime">Start time</Label>
            <Input id="startTime" type="time" {...form.register("startTime")} />
            {errors.startTime ? <p className="text-xs text-red-600">{errors.startTime.message}</p> : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="endTime">End time</Label>
            <Input id="endTime" type="time" {...form.register("endTime")} />
            {errors.endTime ? <p className="text-xs text-red-600">{errors.endTime.message}</p> : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="requiredStaff">Crew needed</Label>
            <Input id="requiredStaff" type="number" min={1} {...form.register("requiredStaff", { valueAsNumber: true })} />
            {errors.requiredStaff ? <p className="text-xs text-red-600">{errors.requiredStaff.message}</p> : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="compensation">Pay per person (NGN)</Label>
            <Input id="compensation" type="number" min={1000} step={500} {...form.register("compensation", { valueAsNumber: true })} />
            {errors.compensation ? <p className="text-xs text-red-600">{errors.compensation.message}</p> : null}
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="description">Role description</Label>
            <textarea
              id="description"
              rows={5}
              {...form.register("description")}
              className="w-full rounded-xl border border-[#E6E7EF] bg-white px-3 py-2 text-sm text-[#0B1020] outline-none focus:border-[#4A2FD6]"
              placeholder="Duties, dress code, arrival instructions and anything a worker must bring."
            />
            {errors.description ? <p className="text-xs text-red-600">{errors.description.message}</p> : null}
          </div>

          <div className="space-y-4 rounded-2xl border border-[#E6E7EF] bg-white p-5 md:col-span-2">
            <div>
              <p className="text-lg font-semibold tracking-tight text-[#0B1020]">Venue location &amp; arrival</p>
              <p className="mt-1 text-sm text-[#5B6178]">
                Confirmed crew see this on their assignment page: a map pin, an address and your arrival instructions.
              </p>
            </div>
            <VenuePicker
              value={venueLocation}
              onChange={setVenueLocation}
              venueName={venueName}
              pinConfirmed={pinConfirmed}
              onPinConfirmedChange={setPinConfirmed}
            />
          </div>

          <div className="flex flex-wrap gap-3 md:col-span-2">
            <Button type="submit" disabled={saving}>
              {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : isEdit ? "Save changes" : "Publish shift"}
            </Button>
            <Link href="/organizer/shifts"><Button variant="secondary" type="button">Back to roster</Button></Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
