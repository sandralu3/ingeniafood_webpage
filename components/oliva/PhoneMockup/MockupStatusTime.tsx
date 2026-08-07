"use client";

import { useEffect, useState } from "react";

function formatLocalTime(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

export function MockupStatusTime() {
  const [time, setTime] = useState(() => formatLocalTime(new Date()));

  useEffect(() => {
    const tick = () => setTime(formatLocalTime(new Date()));
    tick();

    const now = new Date();
    const msToNextMinute =
      (60 - now.getSeconds()) * 1000 - now.getMilliseconds();

    let intervalId: ReturnType<typeof setInterval> | undefined;
    const timeoutId = setTimeout(() => {
      tick();
      intervalId = setInterval(tick, 60_000);
    }, msToNextMinute);

    return () => {
      clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  return (
    <span suppressHydrationWarning className="tabular-nums">
      {time}
    </span>
  );
}
