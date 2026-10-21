"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Notice } from "@/components/dashboard/ui";
import { readPlan, requestHref, STORAGE_KEY } from "@/lib/plan/plan";

const readSaved = () => {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
};
const subscribe = (onChange: () => void) => {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
};

/**
 * DASH-PUB-007 (ADR-101): after sign-up (or a sign-in that lost the address), a plan made on Plan my cruise is still on
 * this device; this offers it. Once the request form is open with the plan in it (`handedOver`), the device copy is
 * forgotten: the form holds it now.
 */
export function SavedPlan({ today, handedOver = false }: { today: string; handedOver?: boolean }) {
  const saved = useSyncExternalStore(subscribe, readSaved, () => null);
  useEffect(() => {
    if (!handedOver) return;
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Storage blocked: nothing was kept.
    }
  }, [handedOver]);
  const plan = handedOver ? null : readPlan(saved, today);
  if (!plan) return null;
  return (
    <Notice>
      You planned a cruise on this device before signing in. <a href={requestHref(plan)}>Continue with your plan</a> to check it
      and send it to operators.
    </Notice>
  );
}
