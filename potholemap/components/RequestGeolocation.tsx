"use client";

import { useCallback, useEffect, useState } from "react";

const DEFAULT_TIMEOUT_MS = 60_000;

type Props = {
  /**
   * When true, requests location when the component mounts (browser prompt without an in-app click).
   * When false, waits until the user clicks the button.
   */
  requestOnMount?: boolean;
  /** Max time to wait for a position fix (ms). */
  timeoutMs?: number;
};

export function RequestGeolocation({
  requestOnMount = false,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}: Props) {
  const [hint, setHint] = useState<string | null>(null);

  const requestLocation = useCallback(() => {
    setHint("Requesting location…");
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      const msg =
        "[geolocation] Not available (unsupported or non-secure context).";
      console.error(msg);
      setHint(msg);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy, altitude, heading, speed } =
          position.coords;
        const payload = {
          latitude,
          longitude,
          accuracy,
          altitude,
          heading,
          speed,
        };
        // Logs only show in the browser DevTools Console (F12), not in the terminal.
        console.log("[geolocation] position", payload);
        console.log(
          `[geolocation] lat=${latitude} lng=${longitude} accuracy=${accuracy}m`,
        );
        setHint(
          `Got fix: ${latitude.toFixed(5)}, ${longitude.toFixed(5)} (±${Math.round(accuracy)}m)`,
        );
      },
      (error) => {
        const label =
          error.code === 1
            ? "PERMISSION_DENIED"
            : error.code === 2
              ? "POSITION_UNAVAILABLE"
              : error.code === 3
                ? "TIMEOUT"
                : "UNKNOWN";
        console.error(
          "[geolocation] error",
          label,
          `code=${error.code}`,
          error.message,
        );
        setHint(`Error (${label}): ${error.message}`);
      },
      { enableHighAccuracy: false, maximumAge: 0, timeout: timeoutMs },
    );
  }, [timeoutMs]);

  useEffect(() => {
    if (!requestOnMount) return;
    requestLocation();
  }, [requestOnMount, requestLocation]);

  if (requestOnMount) {
    return null;
  }

  return (
    <div className="flex max-w-xs flex-col items-end gap-2 text-right">
      <button
        type="button"
        onClick={requestLocation}
        className="rounded-full border border-solid border-black/[.08] px-4 py-2 text-sm font-medium text-zinc-950 transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:text-zinc-50 dark:hover:bg-[#1a1a1a]"
      >
        Use my location
      </button>
      {hint ? (
        <p className="text-xs leading-snug text-zinc-600 dark:text-zinc-400">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
