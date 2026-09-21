"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { PageTransitionPopup } from "./PageTransitionPopup";

const MAX_WAIT_MS = 60_000;
const MIN_VISIBLE_MS = 350;

export function NavigationLoadingIndicator() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const [isNavigating, setIsNavigating] = useState(false);
  const maxWaitRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finishRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const routeRef = useRef(`${pathname}${search ? `?${search}` : ""}`);

  const stopNavigationNow = useCallback(() => {
    if (maxWaitRef.current) clearTimeout(maxWaitRef.current);
    if (finishRef.current) clearTimeout(finishRef.current);
    maxWaitRef.current = null;
    finishRef.current = null;
    startedAtRef.current = null;
    setIsNavigating(false);
  }, []);

  const finishNavigation = useCallback(() => {
    if (startedAtRef.current === null) return;
    const elapsed = Date.now() - startedAtRef.current;
    const remaining = Math.max(0, MIN_VISIBLE_MS - elapsed);

    if (finishRef.current) clearTimeout(finishRef.current);
    finishRef.current = setTimeout(stopNavigationNow, remaining);
  }, [stopNavigationNow]);

  const startNavigation = useCallback(() => {
    if (maxWaitRef.current) clearTimeout(maxWaitRef.current);
    if (finishRef.current) clearTimeout(finishRef.current);
    startedAtRef.current = Date.now();
    setIsNavigating(true);
    maxWaitRef.current = setTimeout(stopNavigationNow, MAX_WAIT_MS);
  }, [stopNavigationNow]);

  useEffect(() => {
    routeRef.current = `${pathname}${search ? `?${search}` : ""}`;
    const timer = setTimeout(finishNavigation, 0);
    return () => clearTimeout(timer);
  }, [pathname, search, finishNavigation]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) return;

      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest<HTMLAnchorElement>("a[href]");
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;

      const destination = new URL(anchor.href, window.location.href);
      if (
        destination.origin !== window.location.origin ||
        destination.href === window.location.href ||
        (destination.pathname === window.location.pathname &&
          destination.search === window.location.search &&
          destination.hash)
      ) return;

      startNavigation();
    };

    const handleSubmit = (event: SubmitEvent) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement) || event.defaultPrevented) return;
      if ((form.method || "get").toLowerCase() !== "get") return;

      const destination = new URL(form.action || window.location.href, window.location.href);
      if (destination.origin === window.location.origin) startNavigation();
    };

    const handlePageShow = () => stopNavigationNow();
    const handlePopState = () => {
      const nextRoute = `${window.location.pathname}${window.location.search}`;
      if (nextRoute !== routeRef.current) startNavigation();
    };

    document.addEventListener("click", handleClick);
    document.addEventListener("submit", handleSubmit);
    window.addEventListener("pageshow", handlePageShow);
    window.addEventListener("popstate", handlePopState);

    return () => {
      document.removeEventListener("click", handleClick);
      document.removeEventListener("submit", handleSubmit);
      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("popstate", handlePopState);
      if (maxWaitRef.current) clearTimeout(maxWaitRef.current);
      if (finishRef.current) clearTimeout(finishRef.current);
    };
  }, [startNavigation, stopNavigationNow]);

  return isNavigating ? (
    <PageTransitionPopup
      title="กำลังเปิดหน้า..."
      description="กรุณารอสักครู่ ระบบกำลังเตรียมข้อมูลให้พร้อม"
      portalToBody
    />
  ) : null;
}
