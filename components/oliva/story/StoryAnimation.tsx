"use client";

import { useEffect, useRef } from "react";
import { createTimeline, createDrawable, utils, cubicBezier } from "animejs";
import "./story-animation.css";

/**
 * “El dilema” — physical fridge door + editorial story.
 *
 * Architecture:
 * - Fridge.svg = original open illustration, permanently cropped to body/interior
 *   (right wing never shown — avoids a second “open door” competing with ours)
 * - One 3D door (front + edge + solid back) rotates on its right hinge via rotateY
 * - No crossfade, no door opacity trick, no animated clip-as-door
 */

const HOTSPOTS = [
  { id: "tomato", emoji: "🍅", label: "Tomate", left: "37%", top: "54%" },
  { id: "egg", emoji: "🥚", label: "Huevo", left: "26%", top: "17%" },
  { id: "avocado", emoji: "🥑", label: "Aguacate", left: "48%", top: "68%" },
  { id: "cheese", emoji: "🧀", label: "Queso", left: "30%", top: "28%" }
] as const;

/** Entrance offset — settles to 0 when identified */
const SPOT_MOTION = {
  tomato: { x: -6, y: 4, rotate: "0deg" },
  egg: { x: 0, y: 8, rotate: "0deg" },
  avocado: { x: 5, y: 3, rotate: "-4deg" },
  cheese: { x: 6, y: 2, rotate: "0deg" }
} as const;

const RECIPE = {
  id: "bowl",
  label: "Bowl Mediterráneo",
  meta: "12 min · Alto en proteína"
} as const;

/** Open angle — right hinge, matches calibrated reference (110°) */
const DOOR_OPEN_DEG = 110;
/** Reference door easing: cubic-bezier(0.22, 1, 0.36, 1) */
const DOOR_EASE = cubicBezier(0.22, 1, 0.36, 1);

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
    const door = root.querySelector<HTMLElement>(".oliva-dilema-fridge-door");
    const doorEdge = root.querySelector<HTMLElement>(
      ".oliva-dilema-fridge-door-edge"
    );
    const light = root.querySelector<HTMLElement>(".oliva-dilema-fridge-light");
    const shadow = root.querySelector<HTMLElement>(".oliva-dilema-fridge-shadow");
    const doubt = root.querySelector<HTMLElement>(".oliva-dilema-doubt-mark");
    const recipe = root.querySelector<HTMLElement>(".oliva-dilema-recipe");
    const badge = root.querySelector<HTMLElement>(".oliva-dilema-badge");
    const spots = Array.from(
      root.querySelectorAll<HTMLElement>(".oliva-dilema-spot")
    );
    const linkEls = Array.from(
      root.querySelectorAll<SVGGeometryElement>(".oliva-dilema-link")
    );

    if (!scene || !art || !door) return;

    const isMobile = window.matchMedia("(max-width: 1023px)").matches;
    const m = isMobile ? 0.65 : 1;

    /*
     * Narrative timeline (ms) — door is the protagonist beat
     * quiet → nudge → open → hold → ingredients → links → recipe → badge → hold → fade → reset
     */
    const T = {
      quiet: 0,
      nudge: 700,
      open: 1050,
      openDone: 2450,
      // ── Narrative (after door is fully open) ──
      holdOpen: 2650,
      spot0: 2650, // Tomate
      spot1: 3150, // Huevo
      spot2: 3650, // Aguacate
      spot3: 4150, // Queso
      link0: 4700,
      link1: 4980,
      link2: 5260,
      link3: 5540,
      silenceEnd: 6100, // 560ms pause after last link
      recipe: 6100,
      badge: 7000, // ~900ms after recipe
      holdEnd: 8500, // ~1.5s reading hold
      fade: 8600,
      reset: 9600
    } as const;

    const OPEN_MS = T.openDone - T.open; // 1400ms
    const FADE_MS = T.reset - T.fade;

    // ── Initial: closed door, dark interior, compact shadow ──
    utils.set(scene, { opacity: 1, y: 0, scale: 1 });
    utils.set(art, { y: 0, scale: 1 });
    utils.set(door, { rotateY: "0deg" });
    if (doorEdge) utils.set(doorEdge, { opacity: 0 });
    if (light) utils.set(light, { opacity: 0.04 });
    if (shadow) utils.set(shadow, { opacity: 0.35, scaleX: 0.92, x: 0 });
    if (doubt) utils.set(doubt, { opacity: 0, y: 4 * m, scale: 0.96 });
    if (recipe) utils.set(recipe, { opacity: 0, y: 14 * m, scale: 0.96 });
    if (badge) utils.set(badge, { opacity: 0, y: 6 * m });

    spots.forEach((spot) => {
      const id = spot.dataset.spot as keyof typeof SPOT_MOTION;
      const motion = SPOT_MOTION[id] ?? SPOT_MOTION.tomato;
      const label = spot.querySelector<HTMLElement>(".oliva-dilema-spot-label");
      utils.set(spot, {
        opacity: 0,
        x: motion.x * m,
        y: motion.y * m,
        rotate: motion.rotate,
        scale: 0.92
      });
      if (label) utils.set(label, { opacity: 0, y: 4 });
    });

    const links = linkEls.length > 0 ? createDrawable(linkEls, 0, 0) : [];
    if (links.length) utils.set(links, { draw: "0 0", opacity: 0.9 });

    const tl = createTimeline({
      loop: true,
      loopDelay: 900,
      defaults: { ease: "inOutCubic" },
      autoplay: false
    });

    // ── 0–700: quiet ──────────────────────────────────────────

    // ── 700–1050: pre-nudge ───────────────────────────────────
    tl.add(
      art,
      {
        y: [0, -1.5 * m, 0],
        duration: 340,
        ease: "inOutCubic"
      },
      T.nudge
    );

    tl.add(
      door,
      {
        rotateY: ["0deg", "4deg", "0deg"],
        duration: 340,
        ease: "inOutCubic"
      },
      T.nudge
    );

    if (doubt) {
      tl.add(
        doubt,
        {
          opacity: [0, 0.45],
          y: [4 * m, 0],
          scale: [0.96, 1],
          duration: 320,
          ease: "outCubic"
        },
        T.nudge
      );
      tl.add(
        doubt,
        {
          opacity: [0.45, 0],
          y: [0, -3 * m],
          duration: 280,
          ease: "inOutCubic"
        },
        T.open - 200
      );
    }

    // ── 1050–2450: physical door open (single continuous rotateY) ──
    // Reference: rotateY(110deg), cubic-bezier(0.22, 1, 0.36, 1)
    tl.add(
      door,
      {
        rotateY: [
          { to: "12deg", duration: OPEN_MS * 0.14, ease: "inCubic" },
          {
            to: `${DOOR_OPEN_DEG}deg`,
            duration: OPEN_MS * 0.86,
            ease: DOOR_EASE
          }
        ]
      },
      T.open
    );

    // Edge hidden when closed; fades in as the door swings open
    if (doorEdge) {
      tl.add(
        doorEdge,
        {
          opacity: [0, 1],
          duration: OPEN_MS,
          ease: "inOutCubic"
        },
        T.open
      );
    }

    // Light follows door angle
    if (light) {
      tl.add(
        light,
        {
          opacity: [0.04, 0.22],
          duration: OPEN_MS,
          ease: "inOutCubic"
        },
        T.open
      );
    }

    // Shadow widens / shifts like the reference suelo
    if (shadow) {
      tl.add(
        shadow,
        {
          opacity: [0.35, 0.28],
          scaleX: [0.92, 1.28],
          x: [0, 18 * m],
          duration: OPEN_MS,
          ease: DOOR_EASE
        },
        T.open
      );
    }

    // ── 2450–2650: hold open (door stays — never fades) ───────

    // ── FASE 2: Ingredients — each gets its own moment ────────
    const revealSpot = (spot: HTMLElement | undefined, at: number) => {
      if (!spot) return;
      const label = spot.querySelector<HTMLElement>(".oliva-dilema-spot-label");

      // Lift + identify
      tl.add(
        spot,
        {
          opacity: [0, 1],
          x: 0,
          y: 0,
          rotate: "0deg",
          scale: [0.92, 1.12],
          duration: 280,
          ease: "outCubic"
        },
        at
      );

      // Settle to stable presence
      tl.add(
        spot,
        {
          scale: [1.12, 1],
          duration: 340,
          ease: "inOutCubic"
        },
        at + 280
      );

      // Brief label while active — then fade (spot stays)
      if (label) {
        tl.add(
          label,
          {
            opacity: [0, 1],
            y: [4, 0],
            duration: 220,
            ease: "outCubic"
          },
          at + 60
        );
        tl.add(
          label,
          {
            opacity: [1, 0],
            y: [0, -3],
            duration: 260,
            ease: "inOutCubic"
          },
          at + 420
        );
      }
    };

    revealSpot(spots[0], T.spot0);
    revealSpot(spots[1], T.spot1);
    revealSpot(spots[2], T.spot2);
    revealSpot(spots[3], T.spot3);

    // ── FASE 3: Connections — ingredient → result ─────────────
    const drawLink = (link: unknown, at: number) => {
      if (!link) return;
      tl.add(
        link as object,
        {
          draw: ["0 0", "0 1"],
          duration: 380,
          ease: "inOutCubic"
        },
        at
      );
    };

    drawLink(links[0], T.link0);
    drawLink(links[1], T.link1);
    drawLink(links[2], T.link2);
    drawLink(links[3], T.link3);

    // ── FASE 4: Silence (silenceEnd − last link ≈ 560ms) ──────

    // ── FASE 5: Recipe payoff ─────────────────────────────────
    if (recipe) {
      tl.add(
        recipe,
        {
          opacity: [0, 1],
          y: [14 * m, 0],
          scale: [0.96, 1],
          duration: 560,
          ease: "outCubic"
        },
        T.recipe
      );
    }

    // Soften spots/links so recipe becomes the hero
    if (spots.length) {
      tl.add(
        spots,
        {
          opacity: 0.72,
          duration: 480,
          ease: "inOutCubic"
        },
        T.recipe + 120
      );
    }
    if (linkEls.length) {
      tl.add(
        linkEls,
        {
          opacity: 0.45,
          duration: 480,
          ease: "inOutCubic"
        },
        T.recipe + 120
      );
    }

    // ── FASE 6: Badge confirmation (secondary) ────────────────
    if (badge) {
      tl.add(
        badge,
        {
          opacity: [0, 0.78],
          y: [6 * m, 0],
          duration: 400,
          ease: "outCubic"
        },
        T.badge
      );
    }

    // ── FASE 7: Hold for reading ──────────────────────────────

    // ── Soft fade of narrative layer ──────────────────────────
    const narrativeFadeTargets = [
      ...spots,
      ...(recipe ? [recipe] : []),
      ...(badge ? [badge] : []),
      ...linkEls
    ];

    if (narrativeFadeTargets.length) {
      tl.add(
        narrativeFadeTargets,
        {
          opacity: 0,
          duration: FADE_MS * 0.7,
          ease: "inOutCubic"
        },
        T.fade
      );
    }

    tl.add(
      scene,
      {
        opacity: [1, 0],
        duration: FADE_MS,
        ease: "inOutCubic"
      },
      T.fade
    );

    // ── Invisible reset while scene opacity is 0 ──────────────
    tl.add(door, { rotateY: "0deg", duration: 1 }, T.reset);
    if (doorEdge) tl.add(doorEdge, { opacity: 0, duration: 1 }, T.reset);
    if (light) tl.add(light, { opacity: 0.04, duration: 1 }, T.reset);
    if (shadow) {
      tl.add(
        shadow,
        { opacity: 0.35, scaleX: 0.92, x: 0, duration: 1 },
        T.reset
      );
    }
    if (doubt) {
      tl.add(
        doubt,
        { opacity: 0, y: 4 * m, scale: 0.96, duration: 1 },
        T.reset
      );
    }
    if (recipe) {
      tl.add(
        recipe,
        { opacity: 0, y: 14 * m, scale: 0.96, duration: 1 },
        T.reset
      );
    }
    if (badge) tl.add(badge, { opacity: 0, y: 6 * m, duration: 1 }, T.reset);

    spots.forEach((spot) => {
      const id = spot.dataset.spot as keyof typeof SPOT_MOTION;
      const motion = SPOT_MOTION[id] ?? SPOT_MOTION.tomato;
      const label = spot.querySelector<HTMLElement>(".oliva-dilema-spot-label");
      tl.add(
        spot,
        {
          opacity: 0,
          x: motion.x * m,
          y: motion.y * m,
          rotate: motion.rotate,
          scale: 0.92,
          duration: 1
        },
        T.reset
      );
      if (label) tl.add(label, { opacity: 0, y: 4, duration: 1 }, T.reset);
    });

    if (links.length) {
      tl.add(links, { draw: "0 0", opacity: 0.9, duration: 1 }, T.reset);
    }

    tl.add(art, { y: 0, scale: 1, duration: 1 }, T.reset);
    tl.add(scene, { opacity: 1, duration: 1 }, T.reset);

    // ── IntersectionObserver ──────────────────────────────────
    let visible = false;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        const ratio = entry.intersectionRatio;
        if (ratio >= 0.28 && !visible) {
          visible = true;
          tl.play();
        } else if (ratio < 0.12 && visible) {
          visible = false;
          tl.pause();
        }
      },
      { threshold: [0, 0.12, 0.28, 0.5] }
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
        <div className="oliva-dilema-fridge-shadow" />
        <div className="oliva-dilema-fridge-light" />

        <div className="oliva-dilema-fridge-frame">
          <div className="oliva-dilema-fridge-art">
            {/* Body + interior — always present behind the door */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/svg/Fridge.svg"
              alt=""
              className="oliva-dilema-fridge-full"
              draggable={false}
            />

            {/*
              ONE physical door. Front / edge / back move together.
              Hinge = right edge (transform-origin: 100% 50%).
            */}
            <div className="oliva-dilema-fridge-door">
              <div className="oliva-dilema-fridge-door-front">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/svg/FridgeDoorFront.svg"
                  alt=""
                  draggable={false}
                />
              </div>
              <div className="oliva-dilema-fridge-door-edge" aria-hidden="true" />
              {/* Solid inner face — no cropped wing SVG (that looked damaged) */}
              <div className="oliva-dilema-fridge-door-back" aria-hidden="true" />
            </div>
          </div>

          <svg
            className="oliva-dilema-links"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            {/* tomato → recipe */}
            <path
              className="oliva-dilema-link"
              d="M37 54 C 48 40, 60 22, 72 14"
              fill="none"
              stroke="#7a8758"
              strokeWidth="0.55"
              strokeLinecap="round"
            />
            {/* egg → recipe */}
            <path
              className="oliva-dilema-link"
              d="M26 17 C 40 14, 55 12, 72 13"
              fill="none"
              stroke="#7a8758"
              strokeWidth="0.55"
              strokeLinecap="round"
            />
            {/* avocado → recipe */}
            <path
              className="oliva-dilema-link"
              d="M48 68 C 55 48, 64 28, 72 15"
              fill="none"
              stroke="#7a8758"
              strokeWidth="0.55"
              strokeLinecap="round"
            />
            {/* cheese → recipe */}
            <path
              className="oliva-dilema-link"
              d="M30 28 C 44 22, 58 16, 72 14"
              fill="none"
              stroke="#7a8758"
              strokeWidth="0.55"
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
              <span className="oliva-dilema-spot-label">{spot.label}</span>
            </span>
          ))}

          <div className="oliva-dilema-recipe" data-recipe={RECIPE.id}>
            <div className="oliva-dilema-recipe-card">
              <div className="oliva-dilema-recipe-visual" aria-hidden="true">
                <span className="oliva-dilema-recipe-bowl">🥗</span>
              </div>
              <div className="oliva-dilema-recipe-copy">
                <span className="oliva-dilema-recipe-label">{RECIPE.label}</span>
                <span className="oliva-dilema-recipe-meta">{RECIPE.meta}</span>
              </div>
            </div>
          </div>

          <div className="oliva-dilema-badge">
            <span className="oliva-dilema-badge-text">
              ✨ IA encontró una receta perfecta
            </span>
          </div>

          <span className="oliva-dilema-doubt-mark">?</span>
        </div>
      </div>
    </div>
  );
}
