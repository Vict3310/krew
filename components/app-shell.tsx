"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BriefcaseBusiness,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Compass,
  LayoutDashboard,
  LogOut,
  PlusCircle,
  ShieldCheck,
  UserRound,
  Wallet,
} from "lucide-react";
import { useEffect, useSyncExternalStore } from "react";

import { KrewLogo } from "@/components/brand/logo";
import SessionSync from "@/components/session-sync";
import SiteHeader from "@/components/site-header";

export type AppShellUser = {
  id: string;
  name?: string | null;
  email: string;
  username: string;
  role?: string;
  status?: string;
} | null;

type NavItem = { href: string; label: string; icon: typeof Compass };

const marketplace: NavItem = { href: "/shifts", label: "Marketplace", icon: Compass };
const dashboard: NavItem = { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard };
const profile: NavItem = { href: "/profile", label: "Profile", icon: UserRound };

/**
 * Role-aware navigation.
 *
 * A worker is never shown organizer tooling and an organizer is never shown
 * worker destinations, so every link in the rail leads somewhere that person
 * can actually act.
 */
function navItemsForRole(role?: string | null): NavItem[] {
  switch (role) {
    case "WORKER":
      return [
        dashboard,
        marketplace,
        { href: "/my-shifts", label: "My shifts", icon: BriefcaseBusiness },
        { href: "/applications", label: "Applications", icon: ClipboardCheck },
        { href: "/earnings", label: "Earnings", icon: Wallet },
        profile,
      ];
    case "ORGANIZER":
      return [
        { href: "/organizer", label: "My events", icon: ShieldCheck },
        { href: "/organizer/shifts", label: "Staffing requests", icon: BriefcaseBusiness },
        { href: "/organizer/shifts/new", label: "Post a shift", icon: PlusCircle },
        marketplace,
        profile,
      ];
    /*
     * Admins have no separate console in this codebase (`/admin` redirects to
     * the profile), so they are not offered a link that promises one.
     */
    default:
      return [marketplace, dashboard, profile];
  }
}

/** Where the collapsed/expanded choice is remembered between visits. */
const RAIL_STATE_KEY = "eventcrew_rail_collapsed";

/*
 * The remembered rail state is an external store: it lives in localStorage,
 * which only the browser has. `useSyncExternalStore` reads it on the client and
 * falls back to the expanded rail on the server, so hydration stays clean.
 */
const railListeners = new Set<() => void>();

function subscribeRail(listener: () => void) {
  railListeners.add(listener);
  return () => {
    railListeners.delete(listener);
  };
}

/** Unreadable storage means "expanded". */
function readRailCollapsed(): boolean {
  try {
    return window.localStorage.getItem(RAIL_STATE_KEY) === "1";
  } catch {
    return false;
  }
}

function getServerRailSnapshot(): boolean {
  return false;
}

function storeRailCollapsed(collapsed: boolean): void {
  try {
    window.localStorage.setItem(RAIL_STATE_KEY, collapsed ? "1" : "0");
  } catch {
    // Storage can be unavailable (private mode); the rail still collapses for
    // this session, it just does not remember the choice.
  }
  railListeners.forEach((listener) => listener());
}

/**
 * A label that only exists on the collapsed rail: hovering or focusing the icon
 * reveals the name, so nothing has to be guessed from a glyph.
 */
function RailTip({ label }: { label: string }) {
  return (
    <span className="pointer-events-none absolute left-full top-1/2 z-20 ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg bg-[#0B1020] px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
      {label}
    </span>
  );
}

export default function AppShell({ user, children }: { user: AppShellUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const collapsed = useSyncExternalStore(subscribeRail, readRailCollapsed, getServerRailSnapshot);
  const isHome = pathname === "/";
  /*
   * Sign in, sign up and the password-reset screens are standalone: they are
   * reached before an account exists, so they get the public header even when a
   * signed-in user lands on them. The rail would otherwise wrap the form.
   */
  const isAuthRoute = pathname.startsWith("/auth");
  const navItems = navItemsForRole(user?.role);

  // The rail's width lives in one CSS variable on <html>, so the rail and the
  // page offset it leaves behind follow it together.
  useEffect(() => {
    document.documentElement.dataset.rail = collapsed ? "collapsed" : "expanded";
  }, [collapsed]);

  /*
   * Public chrome.
   *
   * The workspace rail is reserved for signed-in users, so visitors — anyone on
   * the marketing home page, and anyone on an authentication screen — get the
   * shared branded header instead of two competing navigations.
   */
  if (isHome || isAuthRoute || !user) {
    return (
      <>
        <SessionSync />
        <SiteHeader signedIn={Boolean(user)} />
        {children}
      </>
    );
  }

  const initial = (user?.name ?? user?.username ?? "E").trim().charAt(0).toUpperCase() || "E";

  return (
    <>
      <SessionSync />
      <div className="min-h-screen bg-[#FAFAFC] text-[#0B1020]">
        <aside
          id="app-rail"
          aria-label="Primary"
          data-collapsed={collapsed ? "true" : "false"}
          className="fixed inset-y-0 left-0 z-40 hidden w-[var(--rail-w)] flex-col border-r border-black/10 bg-[#F4F5F8] transition-[width] duration-300 md:flex"
        >
          <div
            className={[
              "flex items-center border-b border-black/10",
              collapsed ? "justify-center px-2 py-4" : "px-5 py-5",
            ].join(" ")}
          >
            <KrewLogo compact={collapsed} />
          </div>

          {/*
            The collapse handle rides on the rail's outer edge, halfway down it,
            so it reads as part of the outline rather than as one more menu row.
          */}
          <button
            type="button"
            onClick={() => storeRailCollapsed(!collapsed)}
            aria-expanded={!collapsed}
            aria-controls="app-rail"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="group absolute -right-3 top-1/2 z-10 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full border border-black/10 bg-white text-black/55 shadow-sm transition-colors hover:bg-[#ECEDF4] hover:text-[#0B1020]"
          >
            {collapsed ? (
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {collapsed && <RailTip label="Expand" />}
          </button>

          {/*
            Collapsed, the rail must not be a scroll container: the hover labels
            sit outside the rail's box and any overflow would clip them.
          */}
          <nav
            aria-label="Sections"
            className={collapsed ? "flex-1 overflow-y-visible px-2 py-3" : "flex-1 overflow-y-auto px-3 py-5"}
          >
            {!collapsed && (
              <p className="px-3 pb-3 text-[10px] uppercase tracking-[0.24em] text-black/35">Workspace</p>
            )}

            <div className={collapsed ? "flex flex-col items-center gap-1" : "space-y-1"}>
              {navItems.map(({ href, label, icon: Icon }) => {
                const active = pathname === href || pathname.startsWith(`${href}/`);

                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={[
                      "group relative transition-colors",
                      collapsed
                        ? "flex h-10 w-10 items-center justify-center rounded-xl"
                        : "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium",
                      active
                        ? collapsed
                          ? "bg-black/10 text-[#0B1020]"
                          : "bg-black/[0.06] text-[#0B1020]"
                        : collapsed
                          ? "text-black/55 hover:bg-black/5 hover:text-[#0B1020]"
                          : "text-black/60 hover:bg-black/5 hover:text-[#0B1020]",
                    ].join(" ")}
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    {collapsed ? <RailTip label={label} /> : <span className="truncate">{label}</span>}
                  </Link>
                );
              })}
            </div>
          </nav>

          <div
            className={[
              "border-t border-black/10",
              collapsed ? "flex flex-col items-center gap-2 px-2 py-3" : "px-4 py-4",
            ].join(" ")}
          >
            {collapsed ? (
              <>
                <span
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#5B3DF5] text-sm font-medium text-white"
                  title={user.name ?? user.username}
                >
                  {initial}
                </span>
                <form action="/api/auth/logout" method="post" className="group relative">
                  <button
                    type="submit"
                    className="grid h-10 w-10 place-items-center rounded-xl text-black/55 transition-colors hover:bg-black/5 hover:text-[#0B1020]"
                  >
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                    <RailTip label="Sign out" />
                    <span className="sr-only">Sign out</span>
                  </button>
                </form>
              </>
            ) : (
              <div className="rounded-2xl border border-black/10 bg-white/70 p-3">
                <div className="flex items-center gap-3">
                  <span
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#5B3DF5] text-sm font-medium text-white"
                    aria-hidden="true"
                  >
                    {initial}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm text-[#0B1020]">{user.name ?? user.username}</span>
                    <span className="block truncate text-xs text-black/45">{user.role ?? user.email}</span>
                  </span>
                </div>
                <form action="/api/auth/logout" method="post">
                  <button
                    type="submit"
                    className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-black/10 px-3 py-2 text-sm text-black/60 transition-colors hover:bg-black/5 hover:text-[#0B1020]"
                  >
                    <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                    Sign out
                  </button>
                </form>
              </div>
            )}
          </div>
        </aside>

        <div className="transition-[padding] duration-300 md:pl-[var(--rail-w)]">
          <header className="sticky top-0 z-30 border-b border-black/10 bg-[#FAFAFC]/85 backdrop-blur-md md:hidden">
            <div className="flex items-center justify-between px-4 py-3">
              <KrewLogo />
              <Link href={user ? "/dashboard" : "/auth/login"} className="text-sm font-medium text-[#0B1020]">
                {user ? "Dashboard" : "Sign in"}
              </Link>
            </div>
          </header>

          <main className="min-h-screen">{children}</main>
        </div>
      </div>
    </>
  );
}
