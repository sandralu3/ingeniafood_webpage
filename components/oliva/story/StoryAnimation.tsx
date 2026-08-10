"use client";

import { useEffect, useRef } from "react";
import { createTimeline, createDrawable, utils } from "animejs";
import "./story-animation.css";

/**
 * “El dilema” — cinematic fridge open → gaze → almost-meals → close.
 * One Fridge.svg + a single swinging closed door (no double-door layers).
 */

const HOTSPOTS = [
  /* Calibrated to Fridge.svg shelves (viewBox crop). */
  { id: "egg", emoji: "🥚", left: "26%", top: "17%" },
  { id: "cheese", emoji: "🧀", left: "30%", top: "28%" },
  { id: "tomato", emoji: "🍅", left: "37%", top: "54%" },
  { id: "avocado", emoji: "🥑", left: "78%", top: "62%" }
] as const;

type Idea = {
  id: string;
  label: string;
  from: string[];
  anchor: "tl" | "tr" | "bl";
};

const IDEAS: Idea[] = [
  { id: "tortilla", label: "Tortilla", from: ["egg", "cheese"], anchor: "tl" },
  { id: "ensalada", label: "Ensalada", from: ["tomato", "avocado"], anchor: "tr" },
  { id: "pasta", label: "Pasta…", from: ["tomato", "cheese"], anchor: "bl" }
];

export function StoryAnimation() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      root.dataset.reduced = "true";
      return;
    }

    const scene = root.querySelector<HTMLElement>(".oliva-dilema-fridge-scene");
    const art = root.querySelector<HTMLElement>(".oliva-dilema-fridge-art");
    const closed = root.querySelector<HTMLElement>(".oliva-dilema-fridge-closed");
    const wingMask = root.querySelector<HTMLElement>(
      ".oliva-dilema-fridge-wing-mask"
    );
    const bloom = root.querySelector<HTMLElement>(".oliva-dilema-fridge-bloom");
    const glow = root.querySelector<HTMLElement>(".oliva-dilema-fridge-glow");
    const scan = root.querySelector<HTMLElement>(".oliva-dilema-fridge-scan");
    const handle = root.querySelector<HTMLElement>(
      ".oliva-dilema-fridge-closed-handle"
    );
    const spots = Array.from(
      root.querySelectorAll<HTMLElement>(".oliva-dilema-spot")
    );
    const ideas = Array.from(
      root.querySelectorAll<HTMLElement>(".oliva-dilema-idea")
    );
    const strikeEls = Array.from(
      root.querySelectorAll<SVGGeometryElement>(".oliva-dilema-strike")
    );
    const linkEls = Array.from(
      root.querySelectorAll<SVGGeometryElement>(".oliva-dilema-link")
    );
    const doubt = root.querySelector<HTMLElement>(".oliva-dilema-doubt");
    const doubtLabel = root.querySelector<HTMLElement>(
      ".oliva-dilema-doubt-label"
    );
    const doubtMarks = Array.from(
      root.querySelectorAll<HTMLElement>(".oliva-dilema-doubt-mark")
    );

    if (!scene || !art || !closed || !bloom) return;

    // Initial state — closed, waiting
    utils.set(scene, { opacity: 0, y: 36, scale: 0.94 });
    utils.set(art, { rotate: "0deg", scale: 1 });
    utils.set(bloom, { opacity: 0, scale: 0.7 });
    if (glow) utils.set(glow, { opacity: 0 });
    if (wingMask) utils.set(wingMask, { opacity: 1 });
    utils.set(closed, { rotateY: "0deg", opacity: 1 });
    if (handle) utils.set(handle, { x: 0, scaleX: 1 });
    utils.set(spots, { opacity: 0, scale: 0.45 });
    utils.set(ideas, { opacity: 0, y: 12 });
    if (scan) utils.set(scan, { opacity: 0, y: "-40%" });
    if (doubt) utils.set(doubt, { opacity: 0 });
    utils.set(doubtMarks, {
      opacity: 0,
      scale: 0.4,
      x: 0,
      y: 12,
      rotate: "0deg"
    });
    if (doubtLabel) utils.set(doubtLabel, { opacity: 0, y: 10 });

    const linkDraw =
      linkEls.length > 0 ? createDrawable(linkEls, 0, 0) : [];
    const strikeDraw =
      strikeEls.length > 0 ? createDrawable(strikeEls, 0, 0) : [];
    if (linkDraw.length) utils.set(linkDraw, { draw: "0 0", opacity: 1 });
    if (strikeDraw.length) utils.set(strikeDraw, { draw: "0 0" });

    const tl = createTimeline({
      loop: true,
      loopDelay: 1100,
      defaults: { ease: "outCubic" },
      autoplay: false
    });

    // ── 1. Arrive ──────────────────────────────────────────────
    tl.add(
      scene,
      {
        opacity: [0, 1],
        y: [36, 0],
        scale: [0.94, 1],
        duration: 1100,
        ease: "outQuart"
      },
      0
    );

    if (handle) {
      tl.add(
        handle,
        {
          x: [0, 2.5, 0],
          duration: 640,
          ease: "inOutSine"
        },
        880
      );
    }

    // ── 2. Open — single yellow door only (no second door layer) ─
    const openAt = 1480;

    if (handle) {
      tl.add(
        handle,
        {
          x: [0, 7],
          scaleX: [1, 0.92],
          duration: 280,
          ease: "inQuad"
        },
        openAt
      );
    }

    // ONE door swings and fades out while swinging (no lingering ghost)
    tl.add(
      closed,
      {
        rotateY: [
          { to: "20deg", duration: 300, ease: "inQuad" },
          { to: "102deg", duration: 920, ease: "outCubic" }
        ],
        opacity: [
          { to: 1, duration: 180 },
          { to: 0, duration: 780, ease: "inQuad" }
        ]
      },
      openAt + 160
    );

    // Reveal the open-door wing of the SAME svg (mask only, never a 2nd door)
    if (wingMask) {
      tl.add(
        wingMask,
        {
          opacity: [1, 0],
          duration: 520,
          ease: "outQuad"
        },
        openAt + 420
      );
    }

    tl.add(
      bloom,
      {
        opacity: [0, 0.78],
        scale: [0.72, 1],
        duration: 1000,
        ease: "outQuad"
      },
      openAt + 360
    );

    if (glow) {
      tl.add(
        glow,
        {
          opacity: [0, 1],
          duration: 950,
          ease: "outQuad"
        },
        openAt + 400
      );
    }

    tl.add(
      art,
      {
        rotate: ["0deg", "-0.4deg", "0.2deg", "0deg"],
        duration: 520,
        ease: "outQuad"
      },
      openAt + 1100
    );

    // ── 3. Gaze scan down the shelves ──────────────────────────
    if (scan) {
      tl.add(
        scan,
        {
          opacity: [0, 0.55, 0.45, 0],
          y: ["-40%", "10%", "55%", "78%"],
          duration: 2200,
          ease: "inOutSine"
        },
        openAt + 1450
      );
    }

    // ── 4. Hotspots lock onto food ─────────────────────────────
    const spotsAt = openAt + 2100;
    spots.forEach((spot, i) => {
      tl.add(
        spot,
        {
          opacity: [0, 1],
          scale: [0.45, 1.08, 1],
          duration: 720,
          ease: "outCubic"
        },
        spotsAt + i * 140
      );
    });

    // Soft pulse while thinking
    spots.forEach((spot, i) => {
      tl.add(
        spot,
        {
          scale: [1, 1.06, 1],
          duration: 900,
          ease: "inOutSine"
        },
        spotsAt + 900 + i * 50
      );
    });

    // ── 5. Almost-meals form and die ───────────────────────────
    IDEAS.forEach((idea, i) => {
      const ideaEl = ideas[i];
      const link = linkDraw[i];
      const strike = strikeDraw[i];
      if (!ideaEl) return;

      const start = spotsAt + 1600 + i * 1500;
      const related = spots.filter((s) =>
        idea.from.includes(s.dataset.spot ?? "")
      );

      tl.add(
        ideaEl,
        {
          opacity: [0, 0.95],
          y: [12, 0],
          duration: 480,
          ease: "outQuad"
        },
        start
      );

      if (link) {
        tl.add(
          link,
          {
            draw: ["0 0", "0 1"],
            duration: 580,
            ease: "inOutQuad"
          },
          start + 160
        );
      }

      related.forEach((spot) => {
        tl.add(
          spot,
          {
            scale: [1, 1.14, 1],
            duration: 560,
            ease: "inOutSine"
          },
          start + 180
        );
      });

      if (strike) {
        tl.add(
          strike,
          {
            draw: ["0 0", "0 1"],
            duration: 380,
            ease: "inOutQuad"
          },
          start + 820
        );
      }

      tl.add(
        ideaEl,
        {
          opacity: 0,
          y: -8,
          duration: 420,
          ease: "inOutQuad"
        },
        start + 1100
      );

      if (link) {
        tl.add(
          link,
          {
            opacity: 0,
            duration: 320,
            ease: "linear"
          },
          start + 1100
        );
      }
    });

    // ── 6. Unsettled sway ──────────────────────────────────────
    const swayAt = spotsAt + 1600 + IDEAS.length * 1500 + 200;
    spots.forEach((spot, i) => {
      tl.add(
        spot,
        {
          x: [0, -4, 4, -2, 0],
          y: [0, 3, -2, 1, 0],
          duration: 700,
          ease: "inOutSine"
        },
        swayAt + i * 45
      );
    });

    // ── 7. “¿Qué hago?” ────────────────────────────────────────
    const doubtAt = swayAt + 500;

    if (doubt) {
      tl.add(
        doubt,
        {
          opacity: [0, 1],
          duration: 480,
          ease: "outQuad"
        },
        doubtAt
      );
    }

    doubtMarks.forEach((mark, i) => {
      const driftX = (i % 2 === 0 ? -1 : 1) * (12 + i * 7);
      const driftY = -16 - i * 9;
      tl.add(
        mark,
        {
          opacity: [0, 0.95],
          scale: [0.4, 1.05, 1],
          x: [0, driftX],
          y: [14, driftY],
          rotate: [
            `${i % 2 === 0 ? -10 : 10}deg`,
            `${i % 2 === 0 ? 7 : -12}deg`
          ],
          duration: 1200,
          ease: "outCubic"
        },
        doubtAt + 80 + i * 100
      );

      tl.add(
        mark,
        {
          y: [driftY, driftY - 8, driftY - 2],
          opacity: [0.95, 0.7, 0.88],
          duration: 1200,
          ease: "inOutSine"
        },
        doubtAt + 1300
      );
    });

    if (doubtLabel) {
      tl.add(
        doubtLabel,
        {
          opacity: [0, 0.9],
          y: [10, 0],
          duration: 760,
          ease: "outCubic"
        },
        doubtAt + 320
      );
    }

    // Bloom dims — the stare cools
    tl.add(
      bloom,
      {
        opacity: [0.72, 0.35],
        duration: 900,
        ease: "inOutSine"
      },
      doubtAt + 1400
    );

    // ── 8. Dissolve + close ────────────────────────────────────
    const closeAt = doubtAt + 2400;

    tl.add(
      spots,
      {
        opacity: 0,
        scale: 0.7,
        duration: 560,
        ease: "inOutQuad"
      },
      closeAt
    );

    if (doubt) {
      tl.add(
        doubt,
        {
          opacity: 0,
          duration: 520,
          ease: "inOutQuad"
        },
        closeAt + 80
      );
    }

    if (glow) {
      tl.add(
        glow,
        {
          opacity: 0,
          duration: 520,
          ease: "inQuad"
        },
        closeAt + 180
      );
    }

    tl.add(
      bloom,
      {
        opacity: 0,
        scale: 0.82,
        duration: 520,
        ease: "inQuad"
      },
      closeAt + 180
    );

    // Cover door wing, then ONE yellow door swings shut
    if (wingMask) {
      tl.add(
        wingMask,
        {
          opacity: [0, 1],
          duration: 280,
          ease: "inQuad"
        },
        closeAt + 340
      );
    }

    tl.add(
      closed,
      {
        rotateY: [
          { to: "95deg", duration: 1 },
          { to: "55deg", duration: 340, ease: "inQuad" },
          { to: "-2deg", duration: 760, ease: "inCubic" },
          { to: "0deg", duration: 240, ease: "outQuad" }
        ],
        opacity: [
          { to: 1, duration: 160, ease: "outQuad" },
          { to: 1, duration: 1200 }
        ]
      },
      closeAt + 380
    );

    tl.add(
      art,
      {
        scale: [1, 0.978, 1.01, 1],
        duration: 480,
        ease: "outQuad"
      },
      closeAt + 1400
    );

    if (handle) {
      tl.add(
        handle,
        {
          x: 0,
          scaleX: 1,
          duration: 320,
          ease: "outQuad"
        },
        closeAt + 1420
      );
    }

    const resetAt = closeAt + 2000;
    if (linkDraw.length) {
      tl.add(
        linkDraw,
        { opacity: 1, draw: "0 0", duration: 1 },
        resetAt
      );
    }
    if (strikeDraw.length) {
      tl.add(strikeDraw, { draw: "0 0", duration: 1 }, resetAt);
    }
    if (doubtMarks.length) {
      tl.add(
        doubtMarks,
        {
          x: 0,
          y: 0,
          rotate: "0deg",
          scale: 0.4,
          opacity: 0,
          duration: 1
        },
        resetAt
      );
    }
    if (handle) {
      tl.add(handle, { x: 0, scaleX: 1, duration: 1 }, resetAt);
    }
    if (wingMask) {
      tl.add(wingMask, { opacity: 1, duration: 1 }, resetAt);
    }
    tl.add(closed, { rotateY: "0deg", opacity: 1, duration: 1 }, resetAt);

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) tl.play();
        else tl.pause();
      },
      { threshold: 0.28 }
    );

    observer.observe(root);

    return () => {
      observer.disconnect();
      tl.revert();
    };
  }, []);

  return (
    <div ref={rootRef} className="oliva-dilema-stage" aria-hidden="true">
      <div className="oliva-dilema-fridge-scene">
        <div className="oliva-dilema-fridge-glow" />
        <div className="oliva-dilema-fridge-bloom" />

        <div className="oliva-dilema-fridge-frame">
          <div className="oliva-dilema-fridge-art">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/svg/Fridge.svg"
              alt=""
              className="oliva-dilema-fridge-full"
              draggable={false}
            />
            {/* Hides the open-door wing while “closed” — not a second door */}
            <div className="oliva-dilema-fridge-wing-mask" />
            <div className="oliva-dilema-fridge-closed">
              <span className="oliva-dilema-fridge-closed-face" />
              <span className="oliva-dilema-fridge-closed-seam" />
              <span className="oliva-dilema-fridge-closed-handle" />
            </div>
            <div className="oliva-dilema-fridge-scan" />
          </div>

          <svg
            className="oliva-dilema-links"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            {/* Tortilla ← egg */}
            <path
              className="oliva-dilema-link"
              d="M26 17 C 14 12, 7 8, 3 4"
              fill="none"
              stroke="#e8d5c4"
              strokeWidth="0.45"
              strokeLinecap="round"
            />
            {/* Ensalada ← avocado */}
            <path
              className="oliva-dilema-link"
              d="M78 62 C 88 50, 93 34, 95 20"
              fill="none"
              stroke="#e8d5c4"
              strokeWidth="0.45"
              strokeLinecap="round"
            />
            {/* Pasta ← tomato */}
            <path
              className="oliva-dilema-link"
              d="M37 54 C 22 62, 11 76, 5 90"
              fill="none"
              stroke="#e8d5c4"
              strokeWidth="0.45"
              strokeLinecap="round"
            />
          </svg>

          {HOTSPOTS.map((spot) => (
            <span
              key={spot.id}
              className="oliva-dilema-spot"
              data-spot={spot.id}
              style={{ left: spot.left, top: spot.top }}
            >
              <span className="oliva-dilema-spot-ring" />
              <span className="oliva-dilema-spot-emoji">{spot.emoji}</span>
            </span>
          ))}

          <div className="oliva-dilema-ideas">
            {IDEAS.map((idea) => (
              <span
                key={idea.id}
                className={`oliva-dilema-idea oliva-dilema-idea--${idea.anchor}`}
              >
                <span className="oliva-dilema-idea-label">{idea.label}</span>
                <svg
                  className="oliva-dilema-idea-svg"
                  viewBox="0 0 100 12"
                  preserveAspectRatio="none"
                >
                  <line
                    className="oliva-dilema-strike"
                    x1="4"
                    y1="6"
                    x2="96"
                    y2="6"
                    stroke="#e9967a"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            ))}
          </div>

          <div className="oliva-dilema-doubt">
            <span className="oliva-dilema-doubt-mark oliva-dilema-doubt-mark--a">
              ?
            </span>
            <span className="oliva-dilema-doubt-mark oliva-dilema-doubt-mark--b">
              ?
            </span>
            <span className="oliva-dilema-doubt-mark oliva-dilema-doubt-mark--c">
              ¿
            </span>
            <span className="oliva-dilema-doubt-mark oliva-dilema-doubt-mark--d">
              ?
            </span>
            <p className="oliva-dilema-doubt-label">¿Qué hago?</p>
          </div>
        </div>
      </div>
    </div>
  );
}
