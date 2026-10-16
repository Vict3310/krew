"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Briefcase, Loader2, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const registerSchema = z.object({
  name: z.string().min(2, "Please enter your full name."),
  email: z.email("Enter a valid email address."),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters.")
    .max(24, "Username must be at most 24 characters.")
    .regex(/^[a-zA-Z0-9_-]+$/, "Use letters, numbers, dashes or underscores only."),
  password: z.string().min(8, "Use at least 8 characters.").max(128),
});

const loginSchema = z.object({
  identifier: z.string().min(3, "Enter your email or username."),
  password: z.string().min(8, "Enter your password."),
});

const forgotSchema = z.object({
  email: z.email("Enter a valid email address."),
});

const resetSchema = z.object({
  token: z.string().min(8, "Enter the reset token you received."),
  password: z.string().min(8, "Use at least 8 characters."),
});

/** Only same-origin, internal paths are ever used as post-auth redirects. */
function safeNext(value: string | null): string | null {
  if (!value) return null;
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  return value;
}

function dashboardForRole(role: string | undefined): string {
  return role === "ORGANIZER" ? "/organizer" : role === "ADMIN" ? "/admin" : "/dashboard";
}

type SignupRole = "WORKER" | "ORGANIZER";

export function RegisterForm({ initialRole = "WORKER" }: { initialRole?: SignupRole }) {
  const router = useRouter();
  const params = useSearchParams();
  const [role, setRole] = useState<SignupRole>(initialRole);
  const [error, setError] = useState<string | null>(null);
  const form = useForm({ resolver: zodResolver(registerSchema), defaultValues: { name: "", email: "", username: "", password: "" } });

  const onSubmit = async (values: z.infer<typeof registerSchema>) => {
    setError(null);
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...values, role }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data?.error ?? "Registration failed.");
      return;
    }

    const next = safeNext(params.get("next"));
    // New accounts always finish onboarding before reaching a dashboard.
    router.push(next ?? "/onboarding");
    router.refresh();
  };

  const nameError = form.formState.errors.name?.message;
  const emailError = form.formState.errors.email?.message;
  const usernameError = form.formState.errors.username?.message;
  const passwordError = form.formState.errors.password?.message;

  return (
    <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-[#141B41]">I want to…</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {([
            { value: "WORKER", title: "Find event work", hint: "Apply for shifts and get paid per event.", icon: Briefcase },
            { value: "ORGANIZER", title: "Hire event staff", hint: "Publish shifts and manage your crew.", icon: Users },
          ] as const).map((option) => {
            const active = role === option.value;
            return (
              <label
                key={option.value}
                className={[
                  "flex cursor-pointer gap-3 rounded-2xl border p-4 transition-colors",
                  active ? "border-[#5B3DF5] bg-[#F2F0FF] ring-1 ring-[#5B3DF5]" : "border-[#E6E7EF] bg-white hover:bg-[#F9F9FC]",
                ].join(" ")}
              >
                <input
                  type="radio"
                  name="role"
                  value={option.value}
                  checked={active}
                  onChange={() => setRole(option.value)}
                  className="sr-only"
                />
                <option.icon className={`h-5 w-5 shrink-0 ${active ? "text-[#5B3DF5]" : "text-[#8A90A6]"}`} aria-hidden="true" />
                <span>
                  <span className="block text-sm font-semibold text-[#0B1020]">{option.title}</span>
                  <span className="mt-1 block text-xs text-[#8A90A6]">{option.hint}</span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="space-y-2">
        <Label htmlFor="name">Full name</Label>
        <Input id="name" {...form.register("name")} aria-invalid={Boolean(nameError)} autoComplete="name" placeholder="Ada Okafor" />
        {nameError ? <p className="text-xs text-red-600">{String(nameError)}</p> : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" {...form.register("email")} aria-invalid={Boolean(emailError)} autoComplete="email" placeholder="you@example.com" />
        {emailError ? <p className="text-xs text-red-600">{String(emailError)}</p> : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="username">Username</Label>
        <Input id="username" {...form.register("username")} aria-invalid={Boolean(usernameError)} autoComplete="username" placeholder="adaevent" />
        {usernameError ? <p className="text-xs text-red-600">{String(usernameError)}</p> : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" {...form.register("password")} aria-invalid={Boolean(passwordError)} autoComplete="new-password" placeholder="At least 8 characters" />
        {passwordError ? <p className="text-xs text-red-600">{String(passwordError)}</p> : null}
      </div>

      <p className="text-xs leading-relaxed text-[#8A90A6]">
        By creating an account you agree to our <a className="underline" href="/terms">Terms</a> and{" "}
        <a className="underline" href="/privacy">Privacy Policy</a>. Organizer access is granted on signup; administrator
        access is never self-assigned.
      </p>

      <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const form = useForm({ resolver: zodResolver(loginSchema), defaultValues: { identifier: "", password: "" } });
  const [error, setError] = useState<string | null>(null);
  const identifierError = form.formState.errors.identifier?.message;
  const passwordLoginError = form.formState.errors.password?.message;

  const onSubmit = async (values: z.infer<typeof loginSchema>) => {
    setError(null);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data?.error ?? "Unable to log in.");
      return;
    }

    const next = safeNext(params.get("next"));
    router.push(next ?? dashboardForRole(data?.user?.role));
    router.refresh();
  };

  return (
    <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="space-y-2">
        <Label htmlFor="identifier">Email or username</Label>
        <Input id="identifier" {...form.register("identifier")} aria-invalid={Boolean(identifierError)} autoComplete="username" placeholder="you@example.com or username" />
        {identifierError ? <p className="text-xs text-red-600">{String(identifierError)}</p> : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" {...form.register("password")} aria-invalid={Boolean(passwordLoginError)} autoComplete="current-password" placeholder="Enter password" />
        {passwordLoginError ? <p className="text-xs text-red-600">{String(passwordLoginError)}</p> : null}
      </div>
      <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Signing in…</> : "Sign in"}
      </Button>
    </form>
  );
}

export function ForgotPasswordForm() {
  const form = useForm({ resolver: zodResolver(forgotSchema), defaultValues: { email: "" } });
  const [message, setMessage] = useState<string | null>(null);
  const [devToken, setDevToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const forgotEmailError = form.formState.errors.email?.message;

  const onSubmit = async (values: z.infer<typeof forgotSchema>) => {
    setError(null);
    setMessage(null);
    const response = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data?.error ?? "Unable to send reset request.");
      return;
    }

    if (data.devResetToken) {
      setDevToken(data.devResetToken);
      setMessage(data.message);
      return;
    }

    setMessage(data.message);
  };

  return (
    <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {message && <p className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800">{message}</p>}
      {devToken && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Local dev reset token: <span className="font-mono">{devToken}</span>
        </p>
      )}
      <div className="space-y-2">
        <Label htmlFor="forgot-email">Email</Label>
        <Input id="forgot-email" type="email" {...form.register("email")} aria-invalid={Boolean(forgotEmailError)} placeholder="you@example.com" />
        {forgotEmailError ? <p className="text-xs text-red-600">{String(forgotEmailError)}</p> : null}
      </div>
      <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? "Sending…" : "Request reset"}
      </Button>
    </form>
  );
}

export function ResetPasswordForm({ initialToken }: { initialToken?: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const form = useForm({
    resolver: zodResolver(resetSchema),
    defaultValues: { token: initialToken ?? "", password: "" },
  });
  const resetTokenError = form.formState.errors.token?.message;
  const resetPasswordError = form.formState.errors.password?.message;

  useEffect(() => {
    if (initialToken) {
      form.setValue("token", initialToken);
    }
  }, [form, initialToken]);

  const onSubmit = async (values: z.infer<typeof resetSchema>) => {
    setError(null);
    setSuccess(null);
    const response = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data?.error ?? "Unable to reset password.");
      return;
    }

    setSuccess(data.message);
    router.push("/auth/login");
  };

  return (
    <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {success && <p className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800">{success}</p>}
      <div className="space-y-2">
        <Label htmlFor="token">Reset token</Label>
        <Input id="token" {...form.register("token")} aria-invalid={Boolean(resetTokenError)} placeholder="Enter reset token" />
        {resetTokenError ? <p className="text-xs text-red-600">{String(resetTokenError)}</p> : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="new-password">New password</Label>
        <Input id="new-password" type="password" {...form.register("password")} aria-invalid={Boolean(resetPasswordError)} autoComplete="new-password" placeholder="Set a new password" />
        {resetPasswordError ? <p className="text-xs text-red-600">{String(resetPasswordError)}</p> : null}
      </div>
      <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? "Resetting…" : "Reset password"}
      </Button>
    </form>
  );
}
