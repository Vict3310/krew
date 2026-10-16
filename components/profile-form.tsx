"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import AvatarUpload from "@/components/avatar-upload";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { updateProfile } from "@/lib/actions/profile";

export type ProfileFields = {
  name: string;
  username: string;
  email: string;
  city: string;
  availability: string;
  skills: string[];
  bio: string;
  companyName: string;
  location: string;
  phone: string;
  description: string;
};

const SKILL_SUGGESTIONS = ["Guest check-in", "Crowd management", "Ushering", "Setup & teardown", "VIP support", "Registration desk"];

export default function ProfileForm({
  role,
  userId,
  hasPicture,
  initial,
}: {
  role: string;
  userId: string;
  hasPicture: boolean;
  initial: ProfileFields;
}) {
  const { push } = useToast();
  const isOrganizer = role === "ORGANIZER";
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof ProfileFields>(key: K, value: ProfileFields[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const payload = isOrganizer
      ? { name: form.name, username: form.username, companyName: form.companyName, location: form.location, phone: form.phone, description: form.description }
      : { name: form.name, username: form.username, city: form.city, availability: form.availability, bio: form.bio };

    const result = await updateProfile(payload);
    setSaving(false);

    if (!result.ok) {
      setError(result.error ?? "Unable to save your profile.");
      push({ title: "Could not save profile", description: result.error, variant: "error" });
      return;
    }

    push({ title: "Profile saved", description: "Your changes have been stored.", variant: "success" });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile settings</CardTitle>
        <CardDescription>
          {isOrganizer ? "This is what workers see on your staffing requests." : "This is what organizers see when they review your applications."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-5" onSubmit={submit}>
          {error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

          <div className="space-y-2">
            <Label>Profile picture</Label>
            <AvatarUpload userId={userId} name={form.name} hasPicture={hasPicture} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" value={form.name} onChange={(e) => set("name", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input id="username" value={form.username} onChange={(e) => set("username", e.target.value)} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={form.email} readOnly aria-readonly="true" className="bg-[#F9F9FC] text-[#8A90A6]" />
              <p className="text-xs text-[#8A90A6]">Email changes are not supported yet — contact support if you need to change it.</p>
            </div>

            {isOrganizer ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="companyName">Organisation</Label>
                  <Input id="companyName" value={form.companyName} onChange={(e) => set("companyName", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input id="location" value={form.location} onChange={(e) => set("location", e.target.value)} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="phone">Contact phone</Label>
                  <Input id="phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} inputMode="tel" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="description">About your events</Label>
                  <textarea id="description" rows={4} value={form.description} onChange={(e) => set("description", e.target.value)}
                    className="w-full rounded-xl border border-[#E6E7EF] bg-white px-3 py-2 text-sm text-[#0B1020] outline-none focus:border-[#4A2FD6]" />
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input id="city" value={form.city} onChange={(e) => set("city", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="availability">Availability</Label>
                  <Input id="availability" value={form.availability} onChange={(e) => set("availability", e.target.value)} placeholder="Weekends and weekday evenings" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Experience</Label>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {SKILL_SUGGESTIONS.map((skill) => {
                      const active = form.skills.includes(skill);
                      return (
                        <button
                          key={skill}
                          type="button"
                          aria-pressed={active}
                          onClick={() => set("skills", active ? form.skills.filter((s) => s !== skill) : [...form.skills, skill])}
                          className={[
                            "rounded-full border px-3 py-1.5 text-sm transition-colors",
                            active ? "border-[#5B3DF5] bg-[#EAE7FF] text-[#141B41]" : "border-[#E6E7EF] bg-white text-[#5B6178] hover:bg-[#F4F4F9]",
                          ].join(" ")}
                        >
                          {skill}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="bio">Profile summary</Label>
                  <textarea id="bio" rows={4} value={form.bio} onChange={(e) => set("bio", e.target.value)}
                    className="w-full rounded-xl border border-[#E6E7EF] bg-white px-3 py-2 text-sm text-[#0B1020] outline-none focus:border-[#4A2FD6]" />
                </div>
              </>
            )}
          </div>

          <Button type="submit" disabled={saving}>
            {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : "Save profile"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
