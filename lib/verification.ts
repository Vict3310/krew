import { randomInt } from "node:crypto";

export type VerificationChannel = "EMAIL" | "PHONE";
export type VerificationPurpose = "SIGNUP" | "ACCOUNT_VERIFICATION" | "PROFILE_UPDATE";

const demoOtpStore = new Map<string, string>();

export function generateOtpCode(length = 6): string {
  const min = 10 ** (length - 1);
  const max = 10 ** length;
  return String(randomInt(min, max)).padStart(length, "0");
}

export function createDemoOtp(key: string, length = 6): string {
  const otp = generateOtpCode(length);
  demoOtpStore.set(key, otp);
  return otp;
}

export function verifyDemoOtp(key: string, code: string): boolean {
  return demoOtpStore.get(key) === code;
}

export function clearDemoOtp(key: string): void {
  demoOtpStore.delete(key);
}

export function normalizePhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";

  if (digits.startsWith("234")) {
    return `+${digits}`;
  }

  if (digits.startsWith("0")) {
    return `+234${digits.slice(1)}`;
  }

  return `+${digits}`;
}

export function isVerificationConfigured(channel: VerificationChannel): boolean {
  if (channel === "EMAIL") {
    return Boolean(
      process.env.SMTP_HOST ||
        process.env.EMAIL_PROVIDER ||
        process.env.RESEND_API_KEY ||
        process.env.SENDGRID_API_KEY ||
        process.env.MAILGUN_API_KEY,
    );
  }

  return Boolean(
    process.env.TWILIO_ACCOUNT_SID ||
      process.env.TWILIO_AUTH_TOKEN ||
      process.env.AFRICAS_TALKING_USERNAME ||
      process.env.BULKSMS_API_KEY ||
      process.env.SMS_PROVIDER,
  );
}

export function getVerificationConfigMessage(channel: VerificationChannel): string {
  const label = channel === "EMAIL" ? "email" : "phone/SMS";
  return `No ${label} verification provider is configured yet. Add SMTP or SMS credentials in your environment variables before enabling secure OTP delivery.`;
}

export function formatVerificationChannel(channel: VerificationChannel): string {
  return channel === "EMAIL" ? "Email" : "Phone";
}
