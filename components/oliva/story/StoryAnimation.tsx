"use client";

import { useEffect, useRef } from "react";
import { createTimeline, createDrawable, utils } from "animejs";
import "./story-animation.css";

/**
 * “El dilema” — narrative timeline (anime.js).
 * Ingredients arrive, almost become dinner, ideas get crossed out.
 * The question remains. Nothing resolves.
 */

const INGREDIENTS = [
  { emoji: "🥚", x: 118, y: -98 },
  { emoji: "🥑", x: -112, y: -72 },
  { emoji: "🍅", x: 108, y: 102 },
  { emoji: "🧀", x: -104, y: 108 },
  { emoji: "🫒", x: 128, y: 18 }
] as const;

const GHOSTS = ["Tortilla", "Ensalada", "Pasta"] as const;

export function StoryAnimation() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      root.dataset.reduced = "true";
      return;
    }

    const plate = root.querySelector<HTMLElement>(".oliva-dilema-plate-wrap");
    const question = root.querySelector<HTMLElement>(".oliva-dilema-question");
    const questionPulse = root.querySelector<HTMLElement>(
      ".oliva-dilema-question-pulse"
    );
    const ingredientNodes = Array.from(
      root.querySelectorAll<HTMLElement>(".oliva-dilema-ing")
    );
    const ghosts = Array.from(
      root.querySelectorAll<HTMLElement>(".oliva-dilema-ghost")
    );
    const rings = Array.from(
      root.querySelectorAll<SVGElement>(".oliva-dilema-ring")
    );
    const strikeEls = Array.from(
      root.querySelectorAll<SVGGeometryElement>(".oliva-dilema-strike")
    );

    if (!plate || !question || ingredientNodes.length === 0) return;

    utils.set(plate, { opacity: 0, scale: 0.82 });
    utils.set(question, { opacity: 0, scale: 0.4 });
    if (questionPulse) {
      utils.set(questionPulse, { opacity: 0, scale: 0.6 });
    }
    utils.set(ghosts, { opacity: 0, y: 10 });

    ingredientNodes.forEach((el, i) => {
      const pos = INGREDIENTS[i];
      if (!pos) return;
      utils.set(el, {
        opacity: 0,
        scale: 0.45,
        x: pos.x,
        y: pos.y + 28
      });
    });

    const drawables =
      strikeEls.length > 0 ? createDrawable(strikeEls, 0, 0) : [];
    if (drawables.length) {
      utils.set(drawables, { draw: "0 0" });
    }

    const tl = createTimeline({
      loop: true,
      loopDelay: 900,
      defaults: { ease: "outCubic" },
      autoplay: false
    });

    if (rings[0]) {
      tl.add(
        rings[0],
        { rotate: "360deg", duration: 12000, ease: "linear" },
        0
      );
    }
    if (rings[1]) {
      tl.add(
        rings[1],
        { rotate: "-360deg", duration: 16000, ease: "linear" },
        0
      );
    }

    // 1) Empty plate
    tl.add(
      plate,
      {
        opacity: [0, 1],
        scale: [0.82, 1],
        duration: 900,
        ease: "outExpo"
      },
      0
    );

    // 2) Ingredients settle
    ingredientNodes.forEach((el, i) => {
      const pos = INGREDIENTS[i];
      if (!pos) return;
      tl.add(
        el,
        {
          opacity: 1,
          scale: 1,
          y: pos.y,
          duration: 780,
          ease: "outBack(1.5)"
        },
        380 + i * 110
      );
    });

    // 3) Near-misses — almost land, never do
    INGREDIENTS.forEach((pos, i) => {
      const el = ingredientNodes[i];
      if (!el) return;
      const start = 1400 + i * 520;
      tl.add(
        el,
        {
          x: pos.x * 0.18,
          y: pos.y * 0.18,
          scale: 0.78,
          duration: 620,
          ease: "inOutSine"
        },
        start
      ).add(
        el,
        {
          x: pos.x,
          y: pos.y,
          scale: 1,
          duration: 560,
          ease: "outQuad"
        },
        start + 620
      );
    });

    // 4) Ghost ideas + strike
    GHOSTS.forEach((_, i) => {
      const ghost = ghosts[i];
      const drawable = drawables[i];
      if (!ghost) return;
      const start = 2100 + i * 1100;

      tl.add(
        ghost,
        {
          opacity: [0, 0.72],
          y: [12, 0],
          duration: 480,
          ease: "outQuad"
        },
        start
      );

      if (drawable) {
        tl.add(
          drawable,
          {
            draw: ["0 0", "0 1"],
            duration: 420,
            ease: "inOutQuad"
          },
          start + 380
        );
      }

      tl.add(
        ghost,
        {
          opacity: 0,
          y: -8,
          duration: 420,
          ease: "inQuad"
        },
        start + 900
      );
    });

    // 5) Unanswered question
    tl.add(
      question,
      {
        opacity: [0, 1],
        scale: [0.4, 1],
        duration: 780,
        ease: "outElastic(1, 0.55)"
      },
      4800
    );

    if (questionPulse) {
      tl.add(
        questionPulse,
        {
          opacity: [0, 0.85, 0.35],
          scale: [0.7, 1.25, 1],
          duration: 1400,
          ease: "outCubic"
        },
        4850
      );
    }

    // 6) Restless scatter
    ingredientNodes.forEach((el, i) => {
      const pos = INGREDIENTS[i];
      if (!pos) return;
      const tilt = i % 2 === 0 ? "-8deg" : "8deg";
      tl.add(
        el,
        {
          x: pos.x * 1.12,
          y: pos.y * 1.1,
          rotate: tilt,
          duration: 700,
          ease: "inOutSine"
        },
        5600
      ).add(
        el,
        {
          x: pos.x,
          y: pos.y,
          rotate: "0deg",
          duration: 800,
          ease: "outCubic"
        },
        6300
      );
    });

    // 7) Question breathes before loop
    tl.add(
      question,
      {
        opacity: [1, 0.45, 1],
        duration: 1200,
        ease: "inOutSine"
      },
      6800
    );

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          tl.play();
        } else {
          tl.pause();
        }
      },
      { threshold: 0.35 }
    );

    observer.observe(root);

    return () => {
      observer.disconnect();
      tl.revert();
    };
  }, []);

  return (
    <div ref={rootRef} className="oliva-dilema-stage" aria-hidden="true">
      <div className="oliva-dilema-constellation">
        <svg
          className="oliva-dilema-rings"
          viewBox="0 0 400 400"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle
            className="oliva-dilema-ring"
            cx="200"
            cy="200"
            r="168"
            stroke="#fbf9f4"
            strokeOpacity="0.1"
            strokeWidth="1"
            strokeDasharray="2 16"
          />
          <circle
            className="oliva-dilema-ring"
            cx="200"
            cy="200"
            r="124"
            stroke="#e9967a"
            strokeOpacity="0.2"
            strokeWidth="1"
            strokeDasharray="8 18"
          />
        </svg>

        <div className="oliva-dilema-plate-wrap">
          <svg
            className="oliva-dilema-plate"
            viewBox="0 0 160 160"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="80" cy="80" r="70" fill="#1f2618" fillOpacity="0.55" />
            <circle
              cx="80"
              cy="80"
              r="66"
              stroke="#fbf9f4"
              strokeOpacity="0.16"
              strokeWidth="1.5"
            />
            <circle cx="80" cy="80" r="40" fill="#2a3220" fillOpacity="0.95" />
            <circle
              cx="80"
              cy="80"
              r="36"
              stroke="#e9967a"
              strokeOpacity="0.22"
              strokeWidth="1"
              strokeDasharray="4 8"
            />
          </svg>

          <div className="oliva-dilema-question">
            <span className="oliva-dilema-question-pulse" />
            <span className="oliva-dilema-question-mark">?</span>
          </div>
        </div>

        {INGREDIENTS.map((item) => (
          <span
            key={item.emoji}
            className="oliva-dilema-ing"
            style={{
              ["--ing-x" as string]: `${item.x}px`,
              ["--ing-y" as string]: `${item.y}px`
            }}
          >
            {item.emoji}
          </span>
        ))}

        <div className="oliva-dilema-ghosts">
          {GHOSTS.map((label) => (
            <span key={label} className="oliva-dilema-ghost">
              <span className="oliva-dilema-ghost-label">{label}</span>
              <svg
                className="oliva-dilema-ghost-svg"
                viewBox="0 0 100 12"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <line
                  className="oliva-dilema-strike"
                  x1="4"
                  y1="6"
                  x2="96"
                  y2="6"
                  stroke="#e9967a"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
