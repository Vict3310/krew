import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { clearDemoOtp, createDemoOtp, verifyDemoOtp } from "@/lib/verification";

const requestSchema = z.object({
  code: z.string().trim().min(4).max(8).optional(),
  action: z.enum(["send", "confirm"]).default("send"),
});

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid OTP request." }, { status: 400 });
  }

  const { action, code } = parsed.data;
  const key = user.email;

  if (action === "send") {
    const otp = createDemoOtp(key, 6);
    return NextResponse.json({
      ok: true,
      demoMode: true,
      message: "Demo OTP generated.",
      code: otp,
    });
  }

  if (!code) {
    return NextResponse.json({ error: "Enter the OTP code you received." }, { status: 400 });
  }

  if (!verifyDemoOtp(key, code)) {
    return NextResponse.json({ error: "Incorrect OTP. Use the demo code shown during signup." }, { status: 400 });
  }

  clearDemoOtp(key);

  return NextResponse.json({
    ok: true,
    verified: true,
    message: "Demo OTP verified successfully.",
  });
}
