"use client";

import { useEffect } from "react";

/**
 * The database is the single source of truth for accounts, applications and
 * assignments, so nothing is mirrored into browser storage any more. This keeps
 * only a small housekeeping job: clear the legacy demo keys written by an
 * earlier version so a stale local "session" can never be confused for real data.
 */
const LEGACY_KEYS = ["eventcrew_demo_current_user", "eventcrew_demo_store_v1"];

export default function SessionSync() {
  useEffect(() => {
    try {
      for (const key of LEGACY_KEYS) {
        if (window.localStorage.getItem(key) !== null) {
          window.localStorage.removeItem(key);
        }
      }
    } catch {
      // Storage can be unavailable (private mode); nothing to clean up.
    }
  }, []);

  return null;
}
