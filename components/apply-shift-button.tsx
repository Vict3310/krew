"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export default function ApplyShiftButton({
  shiftId,
  shiftTitle,
  initialApplied,
  isAuthenticated,
  isWorker,
  isOpen,
}: {
  shiftId: string;
  shiftTitle: string;
  initialApplied: boolean;
  isAuthenticated: boolean;
  isWorker: boolean;
  isOpen: boolean;
}) {
  const { push } = useToast();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [applied, setApplied] = useState(initialApplied);
  const [error, setError] = useState<string | null>(null);

  const loginHref = `/auth/login?next=${encodeURIComponent(`/shifts/${shiftId}`)}`;

  if (!isAuthenticated) {
    return (
      <Link href={loginHref}>
        <Button>Sign in to apply</Button>
      </Link>
    );
  }

  if (!isWorker) {
    return (
      <p className="rounded-xl border border-[#E6E7EF] bg-[#F9F9FC] px-4 py-3 text-sm text-[#5B6178]">
        You are signed in as an organizer. Switch to a worker account to apply for shifts.
      </p>
    );
  }

  if (!isOpen) {
    return (
      <p className="rounded-xl border border-[#E6E7EF] bg-[#F9F9FC] px-4 py-3 text-sm text-[#5B6178]">
        Applications for this shift have closed.
      </p>
    );
  }

  if (applied) {
    return (
      <div className="flex flex-col items-end gap-2">
        <p className="flex items-center gap-2 text-sm font-medium text-[#3B2BA8]">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Application submitted
        </p>
        <Link href="/applications">
          <Button variant="outline" size="sm">Track this application</Button>
        </Link>
      </div>
    );
  }

  async function handleApply() {
    setPending(true);
    setError(null);

    try {
      const response = await fetch(`/api/shifts/${shiftId}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const data = await response.json().catch(() => ({}));

      if (response.status === 401) {
        router.push(loginHref);
        return;
      }

      if (response.status === 409) {
        // Already applied — treat it as success rather than a scary error.
        setApplied(true);
        push({ title: "Already applied", description: `You have already applied for “${shiftTitle}”.`, variant: "info" });
        setPending(false);
        return;
      }

      if (!response.ok) {
        throw new Error(data?.error ?? "Unable to apply to this shift.");
      }

      setApplied(true);
      push({
        title: "Application sent",
        description: `Your application for “${shiftTitle}” was saved. The organizer will review it.`,
        variant: "success",
      });
      router.refresh();
    } catch (applyError) {
      const message = applyError instanceof Error ? applyError.message : "Unable to apply to this shift.";
      setError(message);
      push({ title: "Application failed", description: message, variant: "error" });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <Button onClick={handleApply} disabled={pending}>
        {pending ? <><Loader2 className="h-4 w-4 animate-spin" /> Applying…</> : "Apply now"}
      </Button>
      {error ? <p role="alert" className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
