"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CalendarClock, MapPin, Search, Users, Wallet } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { currentTimeMs, formatCurrency, formatDate } from "@/lib/utils";

export type ShiftListItem = {
  id: string;
  title: string;
  category: string;
  location: string;
  venue: string;
  shiftDate: string;
  startTime: string;
  endTime: string;
  compensation: number;
  requiredStaff: number;
  applicationDeadline: string;
  applicationsCount: number;
  organizerName: string;
};

export default function ShiftBrowser({
  shifts,
  facets,
}: {
  shifts: ShiftListItem[];
  facets: { locations: string[]; categories: string[] };
}) {
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("All");
  const [category, setCategory] = useState("All");

  // Captured once so the "closed" badge stays stable across re-renders.
  const now = useMemo(() => currentTimeMs(), []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return shifts.filter((shift) => {
      const matchesLocation = location === "All" || shift.location === location;
      const matchesCategory = category === "All" || shift.category === category;
      const haystack = [shift.title, shift.venue, shift.location, shift.category, shift.organizerName].join(" ").toLowerCase();
      const matchesSearch = !term || haystack.includes(term);
      return matchesLocation && matchesCategory && matchesSearch;
    });
  }, [category, location, search, shifts]);

  const hasFilters = search.trim() !== "" || location !== "All" || category !== "All";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-2xl border border-[#E6E7EF] bg-white p-4 shadow-sm sm:flex-row sm:items-center">
        <label className="flex flex-1 items-center gap-2 rounded-xl border border-[#E6E7EF] bg-[#FCFCFE] px-3 py-2 text-sm text-[#5B6178] focus-within:border-[#4A2FD6]">
          <Search className="h-4 w-4 text-[#5B3DF5]" aria-hidden="true" />
          <span className="sr-only">Search shifts</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by role, venue, city or organizer"
            className="w-full bg-transparent text-sm text-[#0B1020] placeholder:text-[#8A90A6] focus:outline-none"
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-[#5B6178]">
          <span className="sr-only">Filter by location</span>
          <select
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            className="rounded-xl border border-[#E6E7EF] bg-white px-3 py-2 text-sm text-[#0B1020] focus:outline-none"
          >
            <option value="All">All locations</option>
            {facets.locations.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-[#5B6178]">
          <span className="sr-only">Filter by category</span>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="rounded-xl border border-[#E6E7EF] bg-white px-3 py-2 text-sm text-[#0B1020] focus:outline-none"
          >
            <option value="All">All categories</option>
            {facets.categories.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </label>
      </div>

      <p aria-live="polite" className="text-sm text-[#5B6178]">
        {filtered.length} open {filtered.length === 1 ? "shift" : "shifts"}
        {hasFilters ? " match your filters" : ""}.
      </p>

      {filtered.length === 0 ? (
        <Card className="border-dashed border-[#E2E3EC] bg-[#FAFAFD]">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-lg font-semibold text-[#0B1020]">
              {shifts.length === 0 ? "No shifts are open right now" : "No shifts match your filters"}
            </p>
            <p className="mt-2 max-w-md text-sm text-[#5B6178]">
              {shifts.length === 0
                ? "When organizers publish staffing requests they appear here. Create a profile so you are ready to apply."
                : "Try a broader search, or clear the filters to see everything that is open."}
            </p>
            {shifts.length === 0 ? (
              <Link href="/auth/register?role=worker&next=/onboarding" className="mt-6">
                <Button>Create a worker profile</Button>
              </Link>
            ) : (
              <Button
                variant="secondary"
                className="mt-6"
                onClick={() => {
                  setSearch("");
                  setLocation("All");
                  setCategory("All");
                }}
              >
                Clear filters
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((shift) => {
            const deadlinePassed = new Date(shift.applicationDeadline).getTime() < now;
            return (
              <Card key={shift.id} className="flex flex-col overflow-hidden">
                <div className="bg-[#F0EEFF] p-5">
                  <div className="flex items-center justify-between gap-3">
                    <Badge>{shift.category}</Badge>
                    <Badge variant={deadlinePassed ? "secondary" : "default"}>
                      {deadlinePassed ? "Closed" : "Open"}
                    </Badge>
                  </div>
                  <h2 className="mt-4 text-2xl font-semibold text-[#0B1020]">{shift.title}</h2>
                  <p className="mt-2 text-sm text-[#5B6178]">{shift.venue}</p>
                  <p className="mt-1 text-xs text-[#8A90A6]">Posted by {shift.organizerName}</p>
                </div>
                <CardContent className="flex flex-1 flex-col gap-4 pt-5">
                  <div className="flex items-center gap-2 text-sm text-[#5B6178]">
                    <MapPin className="h-4 w-4 text-[#5B3DF5]" aria-hidden="true" /> {shift.location}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-[#5B6178]">
                    <CalendarClock className="h-4 w-4 text-[#5B3DF5]" aria-hidden="true" />
                    {formatDate(shift.shiftDate)} · {shift.startTime}–{shift.endTime}
                  </div>
                  <div className="flex items-center justify-between text-sm text-[#5B6178]">
                    <span className="flex items-center gap-2"><Users className="h-4 w-4 text-[#5B3DF5]" aria-hidden="true" /> Crew needed</span>
                    <span className="font-medium text-[#0B1020]">{shift.requiredStaff}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-[#5B6178]">
                    <span className="flex items-center gap-2"><Wallet className="h-4 w-4 text-[#5B3DF5]" aria-hidden="true" /> Pay per person</span>
                    <span className="font-semibold text-[#0B1020]">{formatCurrency(shift.compensation)}</span>
                  </div>
                  <p className="text-xs text-[#8A90A6]">
                    {shift.applicationsCount} {shift.applicationsCount === 1 ? "application" : "applications"} so far ·
                    {" "}apply by {formatDate(shift.applicationDeadline)}
                  </p>
                  <Link href={`/shifts/${shift.id}`} className="mt-auto">
                    <Button className="w-full">View details</Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
