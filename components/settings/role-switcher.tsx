"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { BriefcaseBusiness, Check, Loader2, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { switchRole } from "@/lib/actions/account";

type SwitchableRole = "WORKER" | "ORGANIZER";

const OPTIONS: { value: SwitchableRole; label: string; blurb: string; icon: typeof ShieldCheck }[] = [
  {
    value: "WORKER",
    label: "Event worker",
    blurb: "Find shifts, apply for work and track your earnings.",
    icon: BriefcaseBusiness,
  },
  {
    value: "ORGANIZER",
    label: "Organizer",
    blurb: "Publish staffing requests, confirm crew and release their pay.",
    icon: ShieldCheck,
  },
];

/**
 * Switch between the two self-service roles on one account.
 *
 * Switching does not delete anything: the worker profile and organizer profile
 * are kept side by side, so a person who hires on Saturday and works on Sunday
 * can flip between them without a second account.
 */
export default function RoleSwitcher({ currentRole }: { currentRole: string }) {
  const router = useRouter();
  const { push } = useToast();
  const [pending, startTransition] = useTransition();
  const [target, setTarget] = useState<SwitchableRole | null>(null);

  if (currentRole === "ADMIN") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Account type</CardTitle>
          <CardDescription>
            You are signed in as an administrator. Administrator accounts manage the platform and cannot switch to a
            worker or organizer account.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  function choose(role: SwitchableRole) {
    setTarget(role);

    startTransition(async () => {
      const result = await switchRole({ target: role });

      if (!result.ok) {
        setTarget(null);
        push({ title: "Could not switch account type", description: result.error, variant: "error" });
        return;
      }

      push({
        title: role === "ORGANIZER" ? "You are now an organizer" : "You are now an event worker",
        description:
          role === "ORGANIZER"
            ? "Publish staffing requests and fund them from your organizer hub."
            : "Browse the marketplace and apply for shifts from your worker dashboard.",
        variant: "success",
      });

      router.push(result.redirectTo ?? "/dashboard");
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account type</CardTitle>
        <CardDescription>
          One account, two hats. Switch whenever you need to — your profiles and history are kept either way.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        {OPTIONS.map((option) => {
          const active = option.value === currentRole;
          const busy = pending && target === option.value;

          return (
            <div
              key={option.value}
              className={[
                "flex flex-col gap-3 rounded-2xl border p-4",
                active ? "border-[#4A2FD6] bg-[#F5F4FF]" : "border-[#E6E7EF] bg-white",
              ].join(" ")}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 font-semibold text-[#0B1020]">
                  <option.icon className="h-4 w-4 text-[#5B3DF5]" aria-hidden="true" /> {option.label}
                </span>
                {active ? (
                  <span className="flex items-center gap-1 text-xs font-medium text-[#3B2BA8]">
                    <Check className="h-3.5 w-3.5" aria-hidden="true" /> Current
                  </span>
                ) : null}
              </div>
              <p className="flex-1 text-sm text-[#5B6178]">{option.blurb}</p>
              {active ? (
                <Button variant="secondary" disabled>
                  You are using this account type
                </Button>
              ) : (
                <Button onClick={() => choose(option.value)} disabled={pending}>
                  {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Switching…</> : `Switch to ${option.label.toLowerCase()}`}
                </Button>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
