import { afterEach, describe, expect, it } from "vitest";

import { isSupabaseConfigured } from "@/lib/supabase";

describe("supabase configuration", () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_ANON_KEY;
  });

  it("detects when Supabase is configured", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";

    expect(typeof isSupabaseConfigured).toBe("function");
    expect(isSupabaseConfigured()).toBe(true);
  });
});
