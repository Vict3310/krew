/**
 * End-to-end verification for the Krew venue navigator.
 *
 * Requires the QA fixtures (`node scripts/qa-venue-fixtures.mjs`) and a running
 * server. Covers the nine verification cases from the feature brief: confirmed
 * coordinates, missing coordinates, granted and denied geolocation, routing
 * success and failure, external navigation links, mobile usability,
 * unauthorized access, and real persistence in Neon.
 *
 * Note on sessions: POST /api/auth/login revokes every other active session for
 * that account (an existing security choice in this codebase). Any second login
 * as the same QA worker therefore ends the earlier one, so the checks are
 * ordered around that and the worker session is re-established before the
 * checks that still need it.
 *
 * Usage: BASE_URL=http://localhost:3100 node scripts/qa-venue-e2e.mjs
 */
import { PrismaClient } from "@prisma/client";
import { chromium } from "playwright";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3100";
const WORKER = { email: "qa.worker@krew.test", password: "QaVenue@2026" };
const ORGANIZER = { email: "qa.organizer@krew.test", password: "QaVenue@2026" };
const LAGOS_ISLAND = { latitude: 6.4402, longitude: 3.4105 };

const prisma = new PrismaClient();
const results = [];

function check(name, passed, detail = "") {
  results.push({ name, passed, detail });
  console.log(`${passed ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

async function login(page, { email, password }) {
  await page.goto(`${BASE_URL}/auth/login`, { waitUntil: "domcontentloaded" });
  await page.fill("#identifier", email);
  await page.fill("#password", password);
  await Promise.all([
    page.waitForURL((url) => !url.pathname.startsWith("/auth/login"), { timeout: 20_000 }),
    page.click('button[type="submit"]'),
  ]);
}

/** Waits until Leaflet has actually laid the map out, not merely mounted. */
async function waitForMap(page, timeout = 30_000) {
  await page.waitForFunction(
    () => {
      const el = document.querySelector(".leaflet-container");
      return Boolean(el) && el.getBoundingClientRect().height > 100;
    },
    null,
    { timeout },
  );
}

async function main() {
  const assignments = await prisma.shiftAssignment.findMany({
    where: { user: { email: WORKER.email } },
    include: { shift: true },
  });

  const confirmed = assignments.find((a) => a.shift.title.includes("Confirmed"));
  const unconfirmed = assignments.find((a) => a.shift.title.includes("Unconfirmed"));
  if (!confirmed || !unconfirmed) {
    throw new Error("QA fixtures are missing. Run scripts/qa-venue-fixtures.mjs first.");
  }

  // Assertions read the coordinates actually stored in Neon rather than a
  // literal: case 8 deliberately moves the pin, so the fixtures are the source
  // of truth and a hardcoded value would make this script invalidate itself.
  const venue = {
    latitude: confirmed.shift.latitude,
    longitude: confirmed.shift.longitude,
    pair: `${confirmed.shift.latitude?.toFixed(5)},${confirmed.shift.longitude?.toFixed(5)}`,
  };

  console.log(`Confirmed assignment:   ${confirmed.id}`);
  console.log(`Unconfirmed assignment: ${unconfirmed.id}`);
  console.log(`Venue coordinates:      ${venue.pair}\n`);

  const browser = await chromium.launch({ channel: "chrome" });

  // ============================================================ worker, location granted
  const workerContext = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    permissions: ["geolocation"],
    geolocation: LAGOS_ISLAND,
  });
  const worker = await workerContext.newPage();
  await login(worker, WORKER);
  await worker.goto(`${BASE_URL}/assignments/${confirmed.id}`, { waitUntil: "domcontentloaded" });
  await waitForMap(worker);

  const detail = await worker.evaluate(() => {
    const text = document.body.innerText;
    const container = document.querySelector(".leaflet-container");
    return {
      text,
      mapHeight: Math.round(container?.getBoundingClientRect().height ?? 0),
      markers: document.querySelectorAll(".leaflet-marker-icon").length,
      attribution: document.querySelector(".leaflet-control-attribution")?.textContent ?? "",
      links: Array.from(document.querySelectorAll("a[href]")).map((a) => a.getAttribute("href") ?? ""),
      navigate: (() => {
        const el = Array.from(document.querySelectorAll("a[href]")).find(
          (a) => (a.textContent ?? "").trim() === "Navigate to venue",
        );
        if (!el) return null;
        const style = getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return {
          href: el.getAttribute("href") ?? "",
          background: style.backgroundColor,
          height: Math.round(rect.height),
          width: Math.round(rect.width),
        };
      })(),
    };
  });

  check("1. Confirmed assignment renders a laid-out venue map", detail.mapHeight > 200, `${detail.mapHeight}px tall`);
  check("1. The venue pin is drawn on the map", detail.markers >= 1, `${detail.markers} marker(s)`);
  check(
    "1. Event, venue, full address and timing are shown",
    detail.text.includes("Eko Convention Centre") &&
      detail.text.includes("Adetokunbo Ademola") &&
      detail.text.includes("Victoria Island") &&
      detail.text.includes("09:00"),
  );
  check(
    "1. Arrival instructions are prominent",
    detail.text.includes("Use the staff gate") && detail.text.includes("08:30") && detail.text.includes("Bola"),
  );
  // The page prints the pair with a space after the comma, so assert on the two
  // numbers rather than on one particular separator.
  check(
    "1. The confirmed pin is labelled with its coordinates",
    venue.pair.split(",").every((part) => detail.text.includes(part)) && detail.text.includes("confirmed pin"),
    venue.pair,
  );
  check("2. OpenStreetMap attribution stays visible", detail.attribution.includes("OpenStreetMap"));
  check(
    "1. A prominent 'Navigate to venue' action is offered",
    Boolean(detail.navigate) &&
      detail.navigate.height >= 40 &&
      detail.navigate.background === "rgb(91, 61, 245)" &&
      detail.navigate.href.startsWith(`geo:${venue.pair}`),
    detail.navigate ? `${detail.navigate.height}px, brand-filled, ${detail.navigate.href.slice(0, 24)}…` : "not found",
  );
  check(
    "5. External navigation links carry the real coordinates",
    detail.links.some((h) => h.startsWith(`geo:${venue.pair}`)) &&
      detail.links.some((h) => h.includes("openstreetmap.org/directions") && h.includes(encodeURIComponent(venue.pair))) &&
      detail.links.some((h) => h.includes("google.com/maps/dir") && h.includes(encodeURIComponent(venue.pair))),
    venue.pair,
  );

  // 3. Granted geolocation → straight-line distance
  await worker.getByRole("button", { name: /use my current location/i }).click();
  await worker.waitForFunction(() => /away/.test(document.body.innerText), null, { timeout: 15_000 });
  const withLocation = await worker.evaluate(() => document.body.innerText);
  check(
    "3. Granted geolocation yields a straight-line distance",
    /away/.test(withLocation) && /Straight-line estimate/.test(withLocation) && /not a travel distance/.test(withLocation),
    withLocation.match(/([\d.]+ ?k?m) away/)?.[1] ?? "",
  );
  check("3. The privacy position is stated on the page", /never shows it to organizers/.test(withLocation));

  // 4. Route preview
  await worker.getByRole("button", { name: /show driving route/i }).click();
  await worker.waitForFunction(
    () => /by road/.test(document.body.innerText) || /Try the route again|routing service|could not calculate/i.test(document.body.innerText),
    null,
    { timeout: 30_000 },
  );
  const routeText = await worker.evaluate(() => document.body.innerText);
  const routeOk = /by road/.test(routeText);
  check(
    "4. Routing returns a distance and duration, or an explicit retryable failure",
    routeOk || /Try the route again/.test(routeText),
    routeOk ? (routeText.match(/About ([\d.]+ ?k?m) by road · ([^\n]+)/) ?? []).slice(1).join(" · ") : "routing unavailable, retry offered",
  );
  if (routeOk) {
    check("4. Routed distance is labelled as a road distance", /by road/.test(routeText) && /not a guarantee/.test(routeText));
  }
  await worker.screenshot({ path: "/tmp/krew-venue-assignment.png", fullPage: false });

  // 4b. Routing failure path, driven by intercepting the route API.
  await worker.route("**/api/assignments/*/route", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: false,
        reason: "unavailable",
        message: "We could not reach the routing service. Your venue details are unaffected.",
      }),
    }),
  );
  await worker.goto(`${BASE_URL}/assignments/${confirmed.id}`, { waitUntil: "domcontentloaded" });
  await waitForMap(worker);
  await worker.getByRole("button", { name: /use my current location/i }).click();
  await worker.waitForFunction(() => /away/.test(document.body.innerText), null, { timeout: 15_000 });
  await worker.getByRole("button", { name: /show driving route/i }).click();
  await worker.waitForFunction(() => /could not reach the routing service/i.test(document.body.innerText), null, {
    timeout: 20_000,
  });

  const failureText = await worker.evaluate(() => document.body.innerText);
  check(
    "4. A routing failure is explained, retryable, and keeps the venue",
    /could not reach the routing service/.test(failureText) &&
      /Try the route again/.test(failureText) &&
      /Open in maps/.test(failureText),
  );
  check(
    "4. The destination map survives a routing failure",
    Boolean(await worker.evaluate(() => document.querySelector(".leaflet-marker-icon") !== null)),
  );
  await worker.unroute("**/api/assignments/*/route");

  // 1b. Navigation is offered only for an active assignment.
  await prisma.shiftAssignment.update({ where: { id: unconfirmed.id }, data: { status: "CANCELLED" } });
  await worker.goto(`${BASE_URL}/assignments/${unconfirmed.id}`, { waitUntil: "domcontentloaded" });
  await worker.waitForTimeout(1200);
  const cancelled = await worker.evaluate(() => document.body.innerText);
  check(
    "1. A cancelled assignment explains itself and offers no navigation",
    /no longer active/.test(cancelled) && /was cancelled/.test(cancelled) && !/Use my current location/.test(cancelled),
  );
  await prisma.shiftAssignment.update({ where: { id: unconfirmed.id }, data: { status: "CONFIRMED" } });

  // 5. Venue without coordinates
  await worker.goto(`${BASE_URL}/assignments/${unconfirmed.id}`, { waitUntil: "domcontentloaded" });
  await worker.waitForTimeout(1500);
  const unconfirmedDetail = await worker.evaluate(() => ({
    text: document.body.innerText,
    hasMap: Boolean(document.querySelector(".leaflet-container")),
    navLinks: Array.from(document.querySelectorAll("a[href]")).some((a) =>
      (a.getAttribute("href") ?? "").includes("openstreetmap.org/directions"),
    ),
  }));
  check("2. Missing coordinates show no map", !unconfirmedDetail.hasMap);
  check(
    "2. Missing coordinates are stated honestly",
    unconfirmedDetail.text.includes("No confirmed coordinates") && unconfirmedDetail.text.includes("never guesses"),
  );
  check("5. No navigation links are offered without coordinates", !unconfirmedDetail.navLinks);
  check(
    "2. Address and arrival state still reach the worker",
    unconfirmedDetail.text.includes("Private compound") && unconfirmedDetail.text.includes("No arrival instructions yet"),
  );

  // 7. API validation, while the worker session is still live
  const invalidRoute = await worker.evaluate(async (id) => {
    const response = await fetch(`/api/assignments/${id}/route`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ from: { latitude: 999, longitude: 999 } }),
    });
    return response.status;
  }, confirmed.id);
  check("7. Invalid coordinates are rejected", invalidRoute === 400, `HTTP ${invalidRoute}`);

  const workerSearch = await worker.evaluate(async () => (await fetch("/api/geo/search?q=eko%20hotel")).status);
  check("7. Venue search is organizer-only", workerSearch === 403, `HTTP ${workerSearch}`);

  const anonRoute = await worker.evaluate(async ({ id, from }) => {
    const response = await fetch(`/api/assignments/${id}/route`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ from }),
      credentials: "omit",
    });
    return response.status;
  }, { id: confirmed.id, from: LAGOS_ISLAND });
  check("7. An unauthenticated route request is refused", anonRoute === 401, `HTTP ${anonRoute}`);

  // ============================================================ worker, permission denied
  const deniedContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const denied = await deniedContext.newPage();
  await login(denied, WORKER);
  await denied.goto(`${BASE_URL}/assignments/${confirmed.id}`, { waitUntil: "domcontentloaded" });
  await waitForMap(denied);
  await denied.getByRole("button", { name: /use my current location/i }).click();
  await denied.waitForFunction(
    () => /declined|no location fix|took too long/i.test(document.body.innerText),
    null,
    { timeout: 15_000 },
  );
  const deniedText = await denied.evaluate(() => document.body.innerText);
  check(
    "3. Denied geolocation explains itself and does not block the venue",
    /declined|no location fix|took too long/i.test(deniedText) &&
      /Open in maps/.test(deniedText) &&
      /Use my current location/.test(deniedText),
    deniedText.match(/Location permission was declined[^.]*\./)?.[0]?.slice(0, 55) ?? "",
  );
  await deniedContext.close();

  // ============================================================ mobile
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    permissions: ["geolocation"],
    geolocation: LAGOS_ISLAND,
  });
  const mobile = await mobileContext.newPage();
  await login(mobile, WORKER);
  await mobile.goto(`${BASE_URL}/assignments/${confirmed.id}`, { waitUntil: "domcontentloaded" });
  await waitForMap(mobile);

  const mobileDetail = await mobile.evaluate(() => {
    // Scoped to this feature's own controls. Leaflet's attribution links are
    // inline text links and are explicitly exempt from touch-target sizing.
    const scope = Array.from(document.querySelectorAll("main button, .leaflet-control-zoom a")).filter((el) => {
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && getComputedStyle(el).visibility !== "hidden";
    });
    return {
      mapHeight: Math.round(document.querySelector(".leaflet-container")?.getBoundingClientRect().height ?? 0),
      attributionVisible: Boolean(document.querySelector(".leaflet-control-attribution")),
      overflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
      targets: scope.map((el) => ({ label: (el.textContent ?? "").trim().slice(0, 24), h: Math.round(el.getBoundingClientRect().height) })),
    };
  });

  const small = mobileDetail.targets.filter((t) => t.h < 40);
  check("6. Map is usable on a 390px viewport", mobileDetail.mapHeight >= 200, `${mobileDetail.mapHeight}px tall`);
  check("6. Attribution stays visible on mobile", mobileDetail.attributionVisible);
  check("6. No horizontal overflow on mobile", !mobileDetail.overflowX);
  check(
    "6. Feature touch targets are at least 40px",
    small.length === 0,
    small.length === 0 ? `${mobileDetail.targets.length} controls checked` : JSON.stringify(small),
  );
  await mobile.screenshot({ path: "/tmp/krew-venue-mobile.png" });
  await mobileContext.close();

  // ============================================================ anonymous
  const anonContext = await browser.newContext();
  const anon = await anonContext.newPage();
  await anon.goto(`${BASE_URL}/assignments/${confirmed.id}`, { waitUntil: "domcontentloaded" });
  check("7. Anonymous visitors are redirected to sign in", anon.url().includes("/auth/login"), new URL(anon.url()).pathname);
  await anonContext.close();

  // ============================================================ organizer
  const organizerContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const organizer = await organizerContext.newPage();
  await login(organizer, ORGANIZER);

  const otherAssignment = await organizer.goto(`${BASE_URL}/assignments/${confirmed.id}`, { waitUntil: "domcontentloaded" });
  check(
    "7. Another account cannot open someone else's assignment",
    otherAssignment.status() === 404,
    `HTTP ${otherAssignment.status()}`,
  );

  const otherRouteApi = await organizer.evaluate(async ({ id, from }) => {
    const response = await fetch(`/api/assignments/${id}/route`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ from }),
    });
    return response.status;
  }, { id: confirmed.id, from: LAGOS_ISLAND });
  check("7. The route API refuses a non-owner", otherRouteApi === 404, `HTTP ${otherRouteApi}`);

  // 8. Organizer places a pin and it persists to Neon
  await organizer.goto(`${BASE_URL}/organizer/shifts/new?edit=${confirmed.shiftId}`, { waitUntil: "domcontentloaded" });
  await waitForMap(organizer);

  const before = await prisma.shift.findUnique({
    where: { id: confirmed.shiftId },
    select: { latitude: true, longitude: true, locationPrecision: true },
  });

  // `locator.click` scrolls the map into view, so the click lands on the map
  // rather than below the fold.
  const map = organizer.locator(".leaflet-container").first();
  const box = await map.boundingBox();
  await map.click({ position: { x: Math.round(box.width * 0.45), y: Math.round(box.height * 0.6) } });
  await organizer.getByRole("button", { name: /exact spot/i }).click();
  await organizer.getByRole("button", { name: /save changes/i }).click();
  await organizer.waitForURL((url) => url.pathname.startsWith("/organizer/shifts") && !url.search, { timeout: 25_000 });

  const after = await prisma.shift.findUnique({
    where: { id: confirmed.shiftId },
    select: { latitude: true, longitude: true, locationPrecision: true, venueAddress: true, arrivalInstructions: true },
  });

  const moved = Boolean(before && after && after.latitude !== before.latitude && after.longitude !== before.longitude);
  check(
    "8. A manually placed pin is persisted to Neon",
    moved,
    `${before?.latitude?.toFixed(5)} → ${after?.latitude?.toFixed(5)}`,
  );
  check("8. Pins are stored with their precision", after?.locationPrecision === "EXACT", String(after?.locationPrecision));
  check(
    "8. Address and arrival instructions survive the round trip",
    Boolean(after?.venueAddress?.includes("Adetokunbo")) && Boolean(after?.arrivalInstructions?.includes("staff gate")),
  );
  await organizerContext.close();

  // ============================================================ 9. existing flows still work
  const workerAgain = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const pageAgain = await workerAgain.newPage();
  await login(pageAgain, WORKER);

  const dashboard = await pageAgain.goto(`${BASE_URL}/dashboard`, { waitUntil: "domcontentloaded" });
  const dashboardLinks = await pageAgain.evaluate(() =>
    Array.from(document.querySelectorAll("a[href]")).filter((a) => /\/assignments\//.test(a.getAttribute("href") ?? "")).length,
  );
  check("9. Worker dashboard loads for a signed-in worker", dashboard.status() === 200 && dashboardLinks > 0, `HTTP ${dashboard.status()}, ${dashboardLinks} venue link(s)`);

  const myShifts = await pageAgain.goto(`${BASE_URL}/my-shifts`, { waitUntil: "domcontentloaded" });
  const myShiftsLinks = await pageAgain.evaluate(() =>
    Array.from(document.querySelectorAll("a[href]")).filter((a) => /\/assignments\//.test(a.getAttribute("href") ?? "")).length,
  );
  check("1. My shifts links through to the venue page", myShifts.status() === 200 && myShiftsLinks > 0, `${myShiftsLinks} link(s)`);

  await pageAgain.goto(`${BASE_URL}/shifts`, { waitUntil: "domcontentloaded" });
  check("9. The public marketplace still works", (await pageAgain.title()).includes("Krew"), await pageAgain.title());

  await workerAgain.close();
  await browser.close();
  await prisma.$disconnect();

  const failed = results.filter((r) => !r.passed);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length > 0) {
    console.log("Failed:");
    failed.forEach((r) => console.log(`  - ${r.name}${r.detail ? ` (${r.detail})` : ""}`));
    process.exitCode = 1;
  }
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
