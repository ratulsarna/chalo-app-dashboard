"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const MIN_VISIBLE_MS = 450;
const MAX_VISIBLE_MS = 1800;

export function RouteProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let hideTimeout: ReturnType<typeof setTimeout> | undefined;
    let maxTimeout: ReturnType<typeof setTimeout> | undefined;

    setVisible(true);

    hideTimeout = setTimeout(() => {
      setVisible(false);
    }, MIN_VISIBLE_MS);

    maxTimeout = setTimeout(() => {
      setVisible(false);
    }, MAX_VISIBLE_MS);

    return () => {
      if (hideTimeout) clearTimeout(hideTimeout);
      if (maxTimeout) clearTimeout(maxTimeout);
    };
  }, [pathname, searchParams]);

  return (
    <div
      aria-hidden={!visible}
      className={`pointer-events-none fixed inset-x-0 top-0 z-[60] h-[3px] overflow-hidden transition-opacity duration-300 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="h-full w-full bg-gradient-to-r from-amber-400 via-sky-400 to-emerald-400 animate-[routeProgress_1.1s_ease-in-out_infinite]" />
    </div>
  );
}
