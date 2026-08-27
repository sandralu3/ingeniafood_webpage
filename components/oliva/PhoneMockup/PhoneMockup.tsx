import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { MockupAppScreen } from "./MockupAppScreen";
import "./phone-mockup.css";

const ORBIT_ITEMS = [
  {
    emoji: "🥑",
    className: "left-0 top-[18%]",
    duration: "8.5s",
    delay: "0s",
    drift: "-10px",
    rotStart: "-8deg",
    rotEnd: "5deg"
  },
  {
    emoji: "🍅",
    className: "right-0 top-[12%]",
    duration: "7.2s",
    delay: "0.6s",
    drift: "-8px",
    rotStart: "6deg",
    rotEnd: "-4deg"
  },
  {
    emoji: "🥚",
    className: "left-1 top-[58%]",
    duration: "9s",
    delay: "1.1s",
    drift: "-11px",
    rotStart: "-4deg",
    rotEnd: "7deg"
  },
  {
    emoji: "🧀",
    className: "-right-1 top-[48%]",
    duration: "7.8s",
    delay: "0.3s",
    drift: "-9px",
    rotStart: "5deg",
    rotEnd: "-6deg"
  },
  {
    emoji: "🌿",
    className: "right-2 bottom-[8%]",
    duration: "8.2s",
    delay: "1.4s",
    drift: "-7px",
    rotStart: "-7deg",
    rotEnd: "4deg"
  }
] as const;

const HALOS = [
  {
    className: "left-[8%] top-[22%]",
    delay: "0.2s",
    x: "110px",
    y: "40px"
  },
  {
    className: "right-[6%] top-[16%]",
    delay: "0.8s",
    x: "-120px",
    y: "55px"
  },
  {
    className: "left-[10%] top-[60%]",
    delay: "4.8s",
    x: "100px",
    y: "-30px"
  },
  {
    className: "right-[4%] top-[52%]",
    delay: "5.4s",
    x: "-105px",
    y: "-20px"
  }
] as const;

type PhoneMockupProps = {
  className?: string;
};

export function PhoneMockup({ className }: PhoneMockupProps) {
  return (
    <div
      className={cn(
        "relative mx-auto w-[min(100%,360px)] sm:w-[380px] lg:w-[400px]",
        className
      )}
      aria-hidden="true"
    >
      {ORBIT_ITEMS.map((item) => (
        <div
          key={item.emoji}
          className={cn(
            "oliva-orbit-item pointer-events-none absolute z-20 flex h-10 w-10 items-center justify-center rounded-full border border-white/80 bg-white/95 text-lg shadow-[0_8px_20px_-10px_rgba(27,28,25,0.35)]",
            item.className
          )}
          style={
            {
              "--oliva-duration": item.duration,
              "--oliva-delay": item.delay,
              "--oliva-drift": item.drift,
              "--oliva-rot-start": item.rotStart,
              "--oliva-rot-end": item.rotEnd
            } as CSSProperties
          }
        >
          {item.emoji}
        </div>
      ))}

      {HALOS.map((halo, index) => (
        <span
          key={index}
          className={cn(
            "oliva-halo pointer-events-none absolute z-10 h-3 w-3 rounded-full bg-[#b2ac88]/70 blur-[2px] shadow-[0_0_12px_4px_rgba(178,172,136,0.45)]",
            halo.className
          )}
          style={
            {
              "--oliva-halo-delay": halo.delay,
              "--oliva-halo-x": halo.x,
              "--oliva-halo-y": halo.y
            } as CSSProperties
          }
        />
      ))}

      <div className="relative z-0 mx-auto w-[min(100%,320px)] pb-3 sm:w-[348px] lg:w-[372px]">
        {/* Floating illusion — shadow moves, phone UI does not */}
        <div className="oliva-phone-shadow" />

        <div className="oliva-phone-device relative aspect-[9/19.5]">
          {/* Side buttons — outside overflow clip */}
          <div className="absolute -left-[3px] top-[18%] z-20 h-10 w-[3px] rounded-l-sm bg-[#2a2b28]" />
          <div className="absolute -left-[3px] top-[28%] z-20 h-14 w-[3px] rounded-l-sm bg-[#2a2b28]" />
          <div className="absolute -right-[3px] top-[24%] z-20 h-16 w-[3px] rounded-r-sm bg-[#2a2b28]" />

          <div className="relative h-full w-full overflow-hidden rounded-[2.5rem] border border-[#d9d2c4] bg-[#1b1c19] p-[10px]">
            <div className="relative h-full w-full overflow-hidden rounded-[2rem] bg-[#FAF7F2]">
              <div className="absolute left-1/2 top-2.5 z-20 h-5 w-20 -translate-x-1/2 rounded-full bg-[#1b1c19]" />
              <div className="oliva-mockup-screen">
                <MockupAppScreen />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
