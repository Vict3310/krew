export type DemoRole = "WORKER" | "ORGANIZER" | "ADMIN";
export type DemoStatus = "ACTIVE" | "PENDING" | "SUSPENDED";

export type DemoUser = {
  id: string;
  email: string;
  username: string;
  name: string;
  role: DemoRole;
  status: DemoStatus;
  bio?: string;
  city?: string;
  availability?: string;
  createdAt: string;
  updatedAt: string;
};

export type DemoShift = {
  id: string;
  organizerId: string;
  organizer?: { id: string; username: string; name: string };
  title: string;
  category: string;
  description: string;
  venue: string;
  location: string;
  shiftDate: string;
  startTime: string;
  endTime: string;
  compensation: number;
  requiredStaff: number;
  applicationDeadline: string;
  status: "PUBLISHED" | "DRAFT" | "CANCELLED" | "COMPLETED";
  createdAt: string;
  updatedAt: string;
};

export type DemoApplication = {
  id: string;
  userId: string;
  shiftId: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "WITHDRAWN";
  coverNote?: string | null;
  createdAt: string;
  updatedAt: string;
  shift: DemoShift;
};

export type DemoStore = {
  users: DemoUser[];
  shifts: DemoShift[];
  applications: DemoApplication[];
};

export const DEMO_STORE_KEY = "eventcrew_demo_store_v1";
export const CURRENT_DEMO_USER_KEY = "eventcrew_demo_current_user";

export type DemoPersona = {
  id: string;
  email: string;
  username: string;
  name: string;
  role: DemoRole;
  status: DemoStatus;
  password: string;
  city: string;
  bio: string;
  availability: string;
};

export const demoPersonas: DemoPersona[] = [
  {
    id: "ada-worker",
    email: "ada.worker@demo.local",
    username: "ada.worker",
    name: "Ada Worker",
    role: "WORKER",
    status: "ACTIVE",
    password: "Ada@12345",
    city: "Lagos",
    bio: "Experienced event crew worker with hospitality, crowd flow, and setup support.",
    availability: "Weekends and weekdays",
  },
  {
    id: "chidi-organizer",
    email: "chidi.organizer@demo.local",
    username: "chidi.organizer",
    name: "Chidi Organizer",
    role: "ORGANIZER",
    status: "ACTIVE",
    password: "Chidi@12345",
    city: "Abuja",
    bio: "Event planner coordinating premium activations, guest management, and venue staffing.",
    availability: "Flexible scheduling",
  },
  {
    id: "krew-admin",
    email: "admin@demo.local",
    username: "krew.admin",
    name: "Krew Admin",
    role: "ADMIN",
    status: "ACTIVE",
    password: "Admin@12345",
    city: "Lagos",
    bio: "Reviewing platform operations, user reviews, and demo staffing performance.",
    availability: "On call",
  },
];

function getDemoUserFromPersona(persona: DemoPersona): DemoUser {
  return {
    id: persona.id,
    email: persona.email,
    username: persona.username,
    name: persona.name,
    role: persona.role,
    status: persona.status,
    bio: persona.bio,
    city: persona.city,
    availability: persona.availability,
    createdAt: new Date("2026-01-01T00:00:00.000Z").toISOString(),
    updatedAt: new Date("2026-01-01T00:00:00.000Z").toISOString(),
  };
}

export const demoSeedShifts: DemoShift[] = [
  {
    id: "mock-shift-1",
    title: "Main Stage Crew",
    category: "Event Crew",
    description: "Set up lighting, cue entrances, and manage guest flow during the main stage activation.",
    venue: "Eko Atlantic Pavilion",
    location: "Lagos",
    shiftDate: "2026-10-18T00:00:00.000Z",
    startTime: "09:00",
    endTime: "17:00",
    compensation: 45000,
    requiredStaff: 12,
    applicationDeadline: "2026-10-16T00:00:00.000Z",
    status: "PUBLISHED",
    organizerId: "mock-organizer-1",
    organizer: { id: "mock-organizer-1", username: "lagos_events", name: "Lagos Events Co." },
    createdAt: new Date("2026-10-10T00:00:00.000Z").toISOString(),
    updatedAt: new Date("2026-10-10T00:00:00.000Z").toISOString(),
  },
  {
    id: "mock-shift-2",
    title: "Wedding Setup Team",
    category: "Hospitality",
    description: "Handle seating, décor placement, guest hospitality and timeline support for a luxury wedding event.",
    venue: "The Grande Estate",
    location: "Abuja",
    shiftDate: "2026-10-20T00:00:00.000Z",
    startTime: "08:30",
    endTime: "16:30",
    compensation: 38000,
    requiredStaff: 8,
    applicationDeadline: "2026-10-17T00:00:00.000Z",
    status: "PUBLISHED",
    organizerId: "mock-organizer-2",
    organizer: { id: "mock-organizer-2", username: "capital_moments", name: "Capital Moments" },
    createdAt: new Date("2026-10-12T00:00:00.000Z").toISOString(),
    updatedAt: new Date("2026-10-12T00:00:00.000Z").toISOString(),
  },
  {
    id: "mock-shift-3",
    title: "Expo Floor Support",
    category: "Brand Activation",
    description: "Support booth traffic flow, welcome guests, and maintain premium event presence across the expo floor.",
    venue: "Nigerian Innovation Center",
    location: "Port Harcourt",
    shiftDate: "2026-10-25T00:00:00.000Z",
    startTime: "10:00",
    endTime: "18:00",
    compensation: 42000,
    requiredStaff: 10,
    applicationDeadline: "2026-10-21T00:00:00.000Z",
    status: "PUBLISHED",
    organizerId: "mock-organizer-3",
    organizer: { id: "mock-organizer-3", username: "ph_eventlabs", name: "PH Event Labs" },
    createdAt: new Date("2026-10-11T00:00:00.000Z").toISOString(),
    updatedAt: new Date("2026-10-11T00:00:00.000Z").toISOString(),
  },
  {
    id: "mock-shift-4",
    title: "Festival Usher Team",
    category: "Guest Services",
    description: "Welcome guests, direct queue flow, support VIP check-in and coordinate exit management for the festival.",
    venue: "Kano City Arena",
    location: "Kano",
    shiftDate: "2026-10-29T00:00:00.000Z",
    startTime: "11:00",
    endTime: "19:00",
    compensation: 50000,
    requiredStaff: 14,
    applicationDeadline: "2026-10-25T00:00:00.000Z",
    status: "PUBLISHED",
    organizerId: "mock-organizer-4",
    organizer: { id: "mock-organizer-4", username: "northernvibes", name: "Northern Vibes Events" },
    createdAt: new Date("2026-10-15T00:00:00.000Z").toISOString(),
    updatedAt: new Date("2026-10-15T00:00:00.000Z").toISOString(),
  },
];

export function createDefaultDemoStore(): DemoStore {
  return {
    users: demoPersonas.map(getDemoUserFromPersona),
    shifts: demoSeedShifts,
    applications: [],
  };
}

let inMemoryDemoStore: DemoStore | null = null;

function normalizeDemoStore(raw: Partial<DemoStore> | null | undefined): DemoStore {
  const fallback = createDefaultDemoStore();

  return {
    users: Array.isArray(raw?.users) && raw.users.length > 0 ? raw.users : fallback.users,
    shifts: Array.isArray(raw?.shifts) && raw.shifts.length > 0 ? raw.shifts : fallback.shifts,
    applications: Array.isArray(raw?.applications) ? raw.applications : [],
  };
}

function ensureInMemoryDemoStore(): DemoStore {
  if (!inMemoryDemoStore) {
    inMemoryDemoStore = createDefaultDemoStore();
  }
  return inMemoryDemoStore;
}

export function getDemoStore(): DemoStore {
  if (typeof window === "undefined") {
    return ensureInMemoryDemoStore();
  }

  try {
    const raw = window.localStorage.getItem(DEMO_STORE_KEY);
    if (!raw) {
      const fresh = createDefaultDemoStore();
      window.localStorage.setItem(DEMO_STORE_KEY, JSON.stringify(fresh));
      inMemoryDemoStore = fresh;
      return fresh;
    }

    const parsed = JSON.parse(raw) as Partial<DemoStore>;
    const nextStore = normalizeDemoStore(parsed);
    inMemoryDemoStore = nextStore;
    return nextStore;
  } catch {
    const fresh = createDefaultDemoStore();
    window.localStorage.setItem(DEMO_STORE_KEY, JSON.stringify(fresh));
    inMemoryDemoStore = fresh;
    return fresh;
  }
}

export function saveDemoStore(store: DemoStore) {
  if (typeof window === "undefined") {
    inMemoryDemoStore = store;
    return;
  }

  window.localStorage.setItem(DEMO_STORE_KEY, JSON.stringify(store));
  inMemoryDemoStore = store;
  if (typeof window.dispatchEvent === "function") {
    window.dispatchEvent(new Event("demo-store-updated"));
  }
}

export function getCurrentDemoUser(): DemoUser | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(CURRENT_DEMO_USER_KEY);
  if (!raw) {
    const defaultUser = getDemoStore().users[0] ?? null;
    return defaultUser;
  }

  try {
    return JSON.parse(raw) as DemoUser;
  } catch {
    return getDemoStore().users[0] ?? null;
  }
}

export function setCurrentDemoUser(user: DemoUser) {
  if (typeof window === "undefined") {
    const latest = ensureInMemoryDemoStore();
    inMemoryDemoStore = {
      ...latest,
      users: Array.isArray(latest.users) ? [...latest.users.filter((item) => item.id !== user.id && item.email !== user.email), user] : [user],
    };
    return;
  }

  const store = getDemoStore();
  const exists = store.users.some((item) => item.id === user.id || item.email === user.email);
  if (!exists) {
    store.users.unshift(user);
    saveDemoStore(store);
  }
  window.localStorage.setItem(CURRENT_DEMO_USER_KEY, JSON.stringify(user));
  if (typeof window.dispatchEvent === "function") {
    window.dispatchEvent(new Event("demo-store-updated"));
  }
}

export function getDemoUserById(userId: string) {
  return getDemoStore().users.find((user) => user.id === userId) ?? null;
}

export function getDemoShiftById(shiftId: string) {
  return getDemoStore().shifts.find((shift) => shift.id === shiftId) ?? null;
}

export function getDemoAccounts() {
  return demoPersonas.map((persona) => ({
    ...persona,
    login: persona.email,
    password: persona.password,
  }));
}

export function resetDemoStore() {
  const fresh = createDefaultDemoStore();

  if (typeof window !== "undefined") {
    window.localStorage.setItem(DEMO_STORE_KEY, JSON.stringify(fresh));
    window.localStorage.removeItem(CURRENT_DEMO_USER_KEY);
    if (typeof window.dispatchEvent === "function") {
      window.dispatchEvent(new Event("demo-store-updated"));
    }
  }

  inMemoryDemoStore = fresh;
  return fresh;
}

export function ensureDemoUser(user: Partial<DemoUser> & { id: string; email: string; username: string; name: string }) {
  const store = getDemoStore();
  const normalized: DemoUser = {
    id: user.id,
    email: user.email,
    username: user.username,
    name: user.name,
    role: user.role ?? "WORKER",
    status: user.status ?? "ACTIVE",
    bio: user.bio ?? "Available for event staffing.",
    city: user.city ?? "Lagos",
    availability: user.availability ?? "Flexible",
    createdAt: user.createdAt ?? new Date().toISOString(),
    updatedAt: user.updatedAt ?? new Date().toISOString(),
  };

  const index = store.users.findIndex((item) => item.id === normalized.id || item.email === normalized.email);
  if (index >= 0) {
    store.users[index] = { ...store.users[index], ...normalized };
  } else {
    store.users.unshift(normalized);
  }

  saveDemoStore(store);
  return normalized;
}

export function updateDemoUserProfile(userId: string, updates: Partial<DemoUser>) {
  const store = getDemoStore();
  const index = store.users.findIndex((user) => user.id === userId);
  if (index === -1) {
    return null;
  }

  const nextUser = {
    ...store.users[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  store.users[index] = nextUser;
  saveDemoStore(store);

  const currentUser = getCurrentDemoUser();
  if (currentUser?.id === userId) {
    setCurrentDemoUser(nextUser);
  }

  return nextUser;
}

export function getDemoApplicationsForUser(userId: string) {
  return getDemoStore().applications.filter((application) => application.userId === userId);
}

export function getDemoApplicationsForShift(shiftId: string) {
  return getDemoStore().applications.filter((application) => application.shiftId === shiftId);
}

export function updateDemoApplicationStatus(applicationId: string, status: DemoApplication["status"]) {
  const store = getDemoStore();
  const index = store.applications.findIndex((application) => application.id === applicationId);

  if (index === -1) {
    return null;
  }

  const updated = {
    ...store.applications[index],
    status,
    updatedAt: new Date().toISOString(),
  };

  store.applications[index] = updated;
  saveDemoStore(store);
  return updated;
}

export function getDemoDashboardSnapshot(userId: string) {
  const store = getDemoStore();
  const currentUser = getCurrentDemoUser();
  const matchingCurrentUser = currentUser && currentUser.id === userId ? currentUser : null;
  const preferredUser = matchingCurrentUser ?? getDemoUserById(userId) ?? store.users.find((user) => user.id === userId) ?? {
    id: userId,
    name: "Demo User",
    email: "demo@example.com",
    username: "demo",
    role: "WORKER" as DemoRole,
    status: "ACTIVE" as DemoStatus,
    bio: "Available for event staffing.",
    city: "Lagos",
    availability: "Flexible",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const activeUserId = preferredUser.id || userId;

  return {
    user: {
      ...preferredUser,
      id: activeUserId,
      applications: getDemoApplicationsForUser(activeUserId),
    },
    upcomingAssignments: [],
    earnings: 0,
  };
}

export function addDemoApplication(userId: string, shiftId: string, coverNote?: string) {
  const store = getDemoStore();
  const shift = store.shifts.find((item) => item.id === shiftId);
  if (!shift) {
    return null;
  }

  const existing = store.applications.find((application) => application.userId === userId && application.shiftId === shiftId);
  if (existing) {
    return existing;
  }

  const application: DemoApplication = {
    id: `demo-application-${userId}-${shiftId}`,
    userId,
    shiftId,
    status: "PENDING",
    coverNote: coverNote?.trim() || `Interested in ${shift.title}.`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    shift,
  };

  store.applications.unshift(application);
  saveDemoStore(store);
  return application;
}

export function addDemoShift(shift: Omit<DemoShift, "createdAt" | "updatedAt"> & { createdAt?: string; updatedAt?: string }, organizerId: string) {
  const store = getDemoStore();
  const organizer = getDemoUserById(organizerId) ?? ensureDemoUser({
    id: organizerId,
    email: `${organizerId}@demo.local`,
    username: organizerId,
    name: "Demo Organizer",
    role: "ORGANIZER",
    status: "ACTIVE",
  });

  const nextShift: DemoShift = {
    ...shift,
    organizerId,
    organizer: {
      id: organizer.id,
      username: organizer.username,
      name: organizer.name,
    },
    createdAt: shift.createdAt ?? new Date().toISOString(),
    updatedAt: shift.updatedAt ?? new Date().toISOString(),
  };

  store.shifts.unshift(nextShift);
  saveDemoStore(store);
  return nextShift;
}

export function deleteDemoShift(shiftId: string) {
  const store = getDemoStore();
  const nextShifts = store.shifts.filter((shift) => shift.id !== shiftId);
  const nextApplications = store.applications.filter((application) => application.shiftId !== shiftId);

  if (nextShifts.length === store.shifts.length) {
    return false;
  }

  const nextStore: DemoStore = {
    ...store,
    shifts: nextShifts,
    applications: nextApplications,
  };

  saveDemoStore(nextStore);
  return true;
}

export function updateDemoShift(shiftId: string, updates: Partial<DemoShift>) {
  const store = getDemoStore();
  const index = store.shifts.findIndex((shift) => shift.id === shiftId);

  if (index === -1) {
    return null;
  }

  const current = store.shifts[index];
  const nextShift: DemoShift = {
    ...current,
    ...updates,
    organizerId: updates.organizerId ?? current.organizerId,
    organizer: updates.organizer ?? current.organizer ?? {
      id: current.organizerId,
      username: current.organizerId,
      name: "Demo Organizer",
    },
    updatedAt: new Date().toISOString(),
  };

  store.shifts[index] = nextShift;
  saveDemoStore(store);
  return nextShift;
}
