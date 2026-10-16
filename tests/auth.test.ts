import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  addDemoApplication,
  addDemoShift,
  getDemoApplicationsForUser,
  getDemoDashboardSnapshot,
  getDemoShiftById,
  resetDemoStore,
  updateDemoApplicationStatus,
  updateDemoShift,
} from "@/lib/demo-store";

/**
 * The operational data layer must never invent records. This suite stubs the
 * database as unreachable and asserts that reads surface the failure instead of
 * returning mock rows, which is the behaviour the product now requires.
 */
vi.mock("@/lib/db", () => ({
  prisma: {
    shift: { findMany: vi.fn().mockRejectedValue(new Error("Can't reach database server")) },
  },
}));

import { getPublicShifts } from "@/lib/data";

type TestGlobal = { window?: unknown };
const testGlobal = globalThis as unknown as TestGlobal;
import { buildDemoUserFromLogin, buildDemoUserFromRegistration, hashPassword, hashToken, verifyPassword } from "@/lib/auth";

beforeEach(() => {
  process.env.DATABASE_URL = "";
  process.env.NEON_DATABASE_URL = "";
  process.env.DEMO_AUTH = "true";
  resetDemoStore();
});

/** Creates a demo shift and returns its id, so application tests own their fixture. */
function seedShift(id: string, organizerId: string) {
  addDemoShift(
    {
      id,
      organizerId,
      title: "Test shift",
      category: "Guest Services",
      description: "A shift created by the test suite.",
      venue: "Test Venue",
      location: "Lagos",
      shiftDate: new Date(Date.now() + 7 * 86_400_000).toISOString(),
      startTime: "09:00",
      endTime: "17:00",
      compensation: 30000,
      requiredStaff: 4,
      applicationDeadline: new Date(Date.now() + 5 * 86_400_000).toISOString(),
      status: "PUBLISHED",
    },
    organizerId,
  );
}

describe("auth helpers", () => {
  it("hashes and verifies passwords", async () => {
    const passwordHash = await hashPassword("StrongPass123!");
    const isMatch = await verifyPassword("StrongPass123!", passwordHash);

    expect(isMatch).toBe(true);
  });

  it("hashes tokens deterministically", () => {
    const token = "reset-token-123";
    const hashed = hashToken(token);

    expect(hashed).toHaveLength(64);
    expect(hashed).not.toBe(token);
  });

  it("builds a valid demo user from login input", () => {
    const user = buildDemoUserFromLogin("demo@user.com", "Password123!");

    expect(user.email).toBe("demo@user.com");
    expect(user.username).toBe("demo");
    expect(user.role).toBe("WORKER");
    expect(user.status).toBe("ACTIVE");
  });

  it("builds a valid demo user from registration input", () => {
    const user = buildDemoUserFromRegistration({
      name: "Demo User",
      email: "demo@user.com",
      username: "demo-user",
      password: "Password123!",
    });

    expect(user.name).toBe("Demo User");
    expect(user.email).toBe("demo@user.com");
    expect(user.username).toBe("demo-user");
    expect(user.role).toBe("WORKER");
  });
});

describe("data layer integrity", () => {
  it("fails loudly instead of fabricating marketplace shifts when the database is unreachable", async () => {
    await expect(getPublicShifts()).rejects.toThrow(/database/i);
  });
});

describe("demo store (explicit demo mode only)", () => {
  it("stores a demo application for a valid user and shift", () => {
    seedShift("fixture-shift-1", "chidi-organizer");
    const application = addDemoApplication("demo-user-123", "fixture-shift-1", "I am available for the role.");
    const applications = getDemoApplicationsForUser("demo-user-123");

    expect(application).not.toBeNull();
    expect(applications.some((item) => item.shiftId === "fixture-shift-1")).toBe(true);
    expect(applications[0]).toMatchObject({
      userId: "demo-user-123",
      shiftId: "fixture-shift-1",
      status: "PENDING",
    });
  });

  it("survives a reload by persisting the demo app in localStorage", () => {
    const originalWindow = testGlobal.window;
    const storage = new Map<string, string>();

    testGlobal.window = {
      dispatchEvent: () => undefined,
      localStorage: {
        getItem: (key: string) => (storage.has(key) ? storage.get(key)! : null),
        setItem: (key: string, value: string) => {
          storage.set(key, value);
        },
        removeItem: (key: string) => {
          storage.delete(key);
        },
      },
    };

    try {
      addDemoShift(
        {
          id: "persisted-shift",
          organizerId: "chidi-organizer",
          title: "Persisted shift",
          category: "Hospitality",
          description: "Created inside the storage test.",
          venue: "Venue",
          location: "Lagos",
          shiftDate: new Date(Date.now() + 7 * 86_400_000).toISOString(),
          startTime: "09:00",
          endTime: "17:00",
          compensation: 25000,
          requiredStaff: 3,
          applicationDeadline: new Date(Date.now() + 5 * 86_400_000).toISOString(),
          status: "PUBLISHED",
        },
        "chidi-organizer",
      );

      const application = addDemoApplication("demo-user-456", "persisted-shift", "Ready to work.");
      expect(application).not.toBeNull();

      const persisted = JSON.parse(storage.get("eventcrew_demo_store_v1") ?? '{"users":[],"shifts":[],"applications":[]}');
      expect(
        persisted.applications.some(
          (item: { userId: string; shiftId: string }) =>
            item.userId === "demo-user-456" && item.shiftId === "persisted-shift",
        ),
      ).toBe(true);

      const reloaded = getDemoApplicationsForUser("demo-user-456");
      expect(reloaded.some((item) => item.shiftId === "persisted-shift")).toBe(true);
    } finally {
      testGlobal.window = originalWindow;
    }
  });

  it("keeps the dashboard application count in sync with the saved store", () => {
    seedShift("dashboard-shift-1", "chidi-organizer");
    addDemoApplication("dashboard-user-1", "dashboard-shift-1", "Available for this role.");

    const dashboard = getDemoDashboardSnapshot("dashboard-user-1");
    expect(dashboard.user.applications.length).toBe(1);
    expect(dashboard.user.applications[0].shiftId).toBe("dashboard-shift-1");
  });

  it("finds a newly created demo shift by id from the saved store", () => {
    const originalWindow = testGlobal.window;
    const storage = new Map<string, string>();

    testGlobal.window = {
      dispatchEvent: () => undefined,
      localStorage: {
        getItem: (key: string) => (storage.has(key) ? storage.get(key)! : null),
        setItem: (key: string, value: string) => {
          storage.set(key, value);
        },
        removeItem: (key: string) => {
          storage.delete(key);
        },
      },
    };

    try {
      const shiftId = "demo-shift-creator-test";
      const created = addDemoShift(
        {
          id: shiftId,
          organizerId: "chidi-organizer",
          title: "VIP Check-in Crew",
          category: "Guest Services",
          description: "Manage guest arrivals and check-ins for the VIP lounge.",
          venue: "Crest Hall",
          location: "Lagos",
          shiftDate: "2026-11-10T00:00:00.000Z",
          startTime: "08:00",
          endTime: "16:00",
          compensation: 52000,
          requiredStaff: 6,
          applicationDeadline: "2026-11-05T00:00:00.000Z",
          status: "PUBLISHED",
        },
        "chidi-organizer",
      );

      expect(created.id).toBe(shiftId);
      expect(getDemoShiftById(shiftId)?.title).toBe("VIP Check-in Crew");
    } finally {
      testGlobal.window = originalWindow;
    }
  });

  it("updates an existing demo shift without losing the saved data", () => {
    const originalWindow = testGlobal.window;
    const storage = new Map<string, string>();

    testGlobal.window = {
      dispatchEvent: () => undefined,
      localStorage: {
        getItem: (key: string) => (storage.has(key) ? storage.get(key)! : null),
        setItem: (key: string, value: string) => {
          storage.set(key, value);
        },
        removeItem: (key: string) => {
          storage.delete(key);
        },
      },
    };

    try {
      const shiftId = "demo-shift-update-test";
      addDemoShift(
        {
          id: shiftId,
          organizerId: "chidi-organizer",
          title: "Original title",
          category: "Hospitality",
          description: "Original description.",
          venue: "Old venue",
          location: "Lagos",
          shiftDate: "2026-12-01T00:00:00.000Z",
          startTime: "09:00",
          endTime: "17:00",
          compensation: 30000,
          requiredStaff: 4,
          applicationDeadline: "2026-11-25T00:00:00.000Z",
          status: "PUBLISHED",
        },
        "chidi-organizer",
      );

      const updated = updateDemoShift(shiftId, {
        title: "Updated title",
        description: "Updated description.",
        location: "Abuja",
      });

      expect(updated?.title).toBe("Updated title");
      expect(updated?.location).toBe("Abuja");
      expect(getDemoShiftById(shiftId)?.description).toBe("Updated description.");
    } finally {
      testGlobal.window = originalWindow;
    }
  });

  it("updates an application status from the organizer review flow", () => {
    seedShift("review-flow-shift", "chidi-organizer");
    const application = addDemoApplication("ada-worker", "review-flow-shift", "I can cover the role.");
    const updated = updateDemoApplicationStatus(application!.id, "ACCEPTED");

    expect(updated?.status).toBe("ACCEPTED");
    expect(
      getDemoApplicationsForUser("ada-worker").find((item) => item.shiftId === "review-flow-shift")?.status,
    ).toBe("ACCEPTED");
  });
});
