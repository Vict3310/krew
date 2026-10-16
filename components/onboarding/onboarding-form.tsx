"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";

type Role = "WORKER" | "ORGANIZER" | "ADMIN";

const WORKER_STEPS = ["About you", "Availability", "Review"] as const;
const ORGANIZER_STEPS = ["Your organisation", "Contact details", "Review"] as const;

const SKILL_SUGGESTIONS = ["Guest check-in", "Crowd management", "Ushering", "Setup & teardown", "VIP support", "Registration desk"];

export default function OnboardingForm({
  role,
  initial,
}: {
  role: Role;
  initial: {
    name: string;
    city: string;
    availability: string;
    skills: string[];
    bio: string;
    companyName: string;
    location: string;
    phone: string;
    description: string;
  };
}) {
  const router = useRouter();
  const { push } = useToast();
  const isOrganizer = role === "ORGANIZER";
  const steps = isOrganizer ? ORGANIZER_STEPS : WORKER_STEPS;

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(initial);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  function validateStep(index: number): string | null {
    if (index === 0) {
      if (form.name.trim().length < 2) return "Please enter your full name.";
      if (isOrganizer) {
        if (form.companyName.trim().length < 2) return "Please enter your organisation name.";
        if (form.location.trim().length < 2) return "Please tell us where you operate.";
      } else if (form.city.trim().length < 2) {
        return "Please tell us which city you are based in.";
      }
    }
    if (index === 1 && isOrganizer && form.phone.trim().length < 7) {
      return "Please add a contact phone number.";
    }
    return null;
  }

  function next() {
    const message = validateStep(step);
    if (message) {
      setError(message);
      return;
    }
    setError(null);
    setStep((current) => Math.min(current + 1, steps.length - 1));
  }

  async function submit() {
    for (let index = 0; index < steps.length - 1; index += 1) {
      const message = validateStep(index);
      if (message) {
        setError(message);
        setStep(index);
        return;
      }
    }

    setSaving(true);
    setError(null);

    const payload = isOrganizer
      ? {
          name: form.name,
          companyName: form.companyName,
          location: form.location,
          phone: form.phone,
          description: form.description,
        }
      : {
          name: form.name,
          city: form.city,
          availability: form.availability,
          skills: form.skills,
          bio: form.bio,
        };

    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.error ?? "We could not save your profile. Please try again.");
      }

      push({
        title: "Profile saved",
        description: isOrganizer
          ? "You can now publish your first staffing request."
          : "Your profile is ready. Start exploring shifts.",
        variant: "success",
      });
      router.push(data?.redirectTo ?? (isOrganizer ? "/organizer" : "/dashboard"));
      router.refresh();
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Something went wrong.";
      setError(message);
      push({ title: "Could not save profile", description: message, variant: "error" });
      setSaving(false);
    }
  }

  const progress = Math.round(((step + 1) / steps.length) * 100);

  return (
    <div className="space-y-8">
      <ol className="flex items-center gap-2" aria-label="Onboarding progress">
        {steps.map((label, index) => {
          const state = index < step ? "done" : index === step ? "current" : "todo";
          return (
            <li key={label} className="flex flex-1 items-center gap-2">
              <span
                className={[
                  "grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-semibold",
                  state === "done" ? "bg-[#5B3DF5] text-white" :
                  state === "current" ? "bg-[#EAE7FF] text-[#141B41] ring-1 ring-[#5B3DF5]" :
                  "bg-[#F2F2F7] text-[#8A90A6]",
                ].join(" ")}
                aria-current={state === "current" ? "step" : undefined}
              >
                {state === "done" ? <Check className="h-3.5 w-3.5" /> : index + 1}
              </span>
              <span className="hidden text-sm text-[#5B6178] sm:block">{label}</span>
              {index < steps.length - 1 ? <span className="h-px flex-1 bg-[#E8E9F1]" /> : null}
            </li>
          );
        })}
      </ol>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#EFEFF6]">
        <div className="h-full rounded-full bg-[#5B3DF5] transition-all duration-300" style={{ width: `${progress}%` }} />
      </div>

      <form
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          if (step === steps.length - 1) void submit();
          else next();
        }}
      >
        {error ? (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>
        ) : null}

        {step === 0 && !isOrganizer ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="name">Your full name</Label>
              <Input id="name" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Ada Okafor" autoComplete="name" />
              <p className="text-xs text-[#8A90A6]">Organizers see this when they review your applications.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City you work in</Label>
              <Input id="city" value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="Lagos" />
            </div>
          </>
        ) : null}

        {step === 0 && isOrganizer ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="name">Your full name</Label>
              <Input id="name" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Bola Adeyemi" autoComplete="name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyName">Organisation name</Label>
              <Input id="companyName" value={form.companyName} onChange={(e) => set("companyName", e.target.value)} placeholder="Lagos Event Studio" />
              <p className="text-xs text-[#8A90A6]">Workers see this on every staffing request you publish.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Where do you operate?</Label>
              <Input id="location" value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="Lagos" />
            </div>
          </>
        ) : null}

        {step === 1 && !isOrganizer ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="availability">When can you work?</Label>
              <Input id="availability" value={form.availability} onChange={(e) => set("availability", e.target.value)} placeholder="Weekends and weekday evenings" />
            </div>
            <div className="space-y-2">
              <Label>Relevant experience</Label>
              <p className="text-xs text-[#8A90A6]">Tap everything that applies. Optional, but it helps organizers judge fit.</p>
              <div className="flex flex-wrap gap-2 pt-1">
                {SKILL_SUGGESTIONS.map((skill) => {
                  const active = form.skills.includes(skill);
                  return (
                    <button
                      key={skill}
                      type="button"
                      aria-pressed={active}
                      onClick={() =>
                        set("skills", active ? form.skills.filter((item) => item !== skill) : [...form.skills, skill])
                      }
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
          </>
        ) : null}

        {step === 1 && isOrganizer ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="phone">Contact phone number</Label>
              <Input id="phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+234 801 000 0000" inputMode="tel" />
              <p className="text-xs text-[#8A90A6]">Shared with workers you confirm for a shift.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">What kind of events do you run?</Label>
              <textarea
                id="description"
                rows={4}
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="Conferences, weddings, brand activations across Lagos and Abuja."
                className="w-full rounded-xl border border-[#E6E7EF] bg-white px-3 py-2 text-sm text-[#0B1020] outline-none focus:border-[#4A2FD6]"
              />
            </div>
          </>
        ) : null}

        {step === 2 ? (
          <div className="space-y-4">
            <p className="text-sm text-[#5B6178]">Review your details. You can change any of this later from your profile.</p>
            <dl className="divide-y divide-[#ECEDF4] rounded-2xl border border-[#E6E7EF] bg-white">
              {(isOrganizer
                ? [
                    ["Name", form.name],
                    ["Organisation", form.companyName],
                    ["Location", form.location],
                    ["Phone", form.phone],
                    ["About", form.description || "—"],
                  ]
                : [
                    ["Name", form.name],
                    ["City", form.city],
                    ["Availability", form.availability || "—"],
                    ["Experience", form.skills.length ? form.skills.join(", ") : "—"],
                  ]
              ).map(([label, value]) => (
                <div key={label} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:justify-between sm:gap-6">
                  <dt className="text-sm text-[#8A90A6]">{label}</dt>
                  <dd className="text-sm font-medium text-[#0B1020] sm:max-w-[60%] sm:text-right">{value}</dd>
                </div>
              ))}
            </dl>
            <div className="space-y-2">
              <Label htmlFor="bio">{isOrganizer ? "Anything else workers should know? (optional)" : "Short profile summary (optional)"}</Label>
              <textarea
                id="bio"
                rows={3}
                value={isOrganizer ? form.description : form.bio}
                onChange={(e) => set(isOrganizer ? "description" : "bio", e.target.value)}
                className="w-full rounded-xl border border-[#E6E7EF] bg-white px-3 py-2 text-sm text-[#0B1020] outline-none focus:border-[#4A2FD6]"
                placeholder={isOrganizer ? "Shift patterns, dress code, payment timelines…" : "A sentence about the kind of work you do best."}
              />
            </div>
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-3 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setError(null);
              setStep((current) => Math.max(0, current - 1));
            }}
            disabled={step === 0 || saving}
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>

          {step < steps.length - 1 ? (
            <Button type="submit">
              Continue <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button type="submit" disabled={saving}>
              {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : "Finish and continue"}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
