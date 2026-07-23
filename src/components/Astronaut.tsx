import { useEffect, useRef } from 'react';
import gsap from 'gsap';

export default function Astronaut() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const facingRef = useRef<HTMLDivElement>(null); // handles left/right flip
  const bodyRef = useRef<SVGGElement>(null);
  const headRef = useRef<SVGGElement>(null);
  const leftEyeRef = useRef<SVGCircleElement>(null);
  const rightEyeRef = useRef<SVGCircleElement>(null);
  const leftLegRef = useRef<SVGGElement>(null);
  const rightLegRef = useRef<SVGGElement>(null);
  const leftArmRef = useRef<SVGGElement>(null);
  const rightArmRef = useRef<SVGGElement>(null);
  const flameRef = useRef<SVGGElement>(null);
  const shadowRef = useRef<SVGEllipseElement>(null);
  const dustRef = useRef<SVGGElement>(null);

  const cursorRef = useRef<HTMLDivElement>(null);

  // Position state
  const target = useRef({ x: 0, y: 0 }); // where the cursor actually is
  const cursorPos = useRef({ x: 0, y: 0 }); // where the visible cursor dot is (can be knocked away)
  const cursorVel = useRef({ x: 0, y: 0 }); // recoil velocity after a kick
  const botPos = useRef({ x: 0, y: 0 }); // where the bot is
  const facing = useRef(1); // 1 = right, -1 = left
  const isKicking = useRef(false);
  const lastKickTime = useRef(0);
  const runCycleTL = useRef<gsap.core.Timeline | null>(null);

  // Init positions offscreen-ish
  useEffect(() => {
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    target.current = { x: cx, y: cy };
    cursorPos.current = { x: cx, y: cy };
    botPos.current = { x: cx - 260, y: cy };

    gsap.set(wrapRef.current, { x: botPos.current.x, y: botPos.current.y });
    gsap.set(cursorRef.current, { x: cx, y: cy });
  }, []);

  // Track real cursor
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      target.current.x = e.clientX;
      target.current.y = e.clientY;
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  // Running leg cycle (paused when idle/kicking)
  useEffect(() => {
    const tl = gsap.timeline({ repeat: -1, paused: true });
    tl.to(leftLegRef.current, { rotation: 30, transformOrigin: '50% 0%', duration: 0.18, ease: 'sine.inOut' }, 0)
      .to(rightLegRef.current, { rotation: -30, transformOrigin: '50% 0%', duration: 0.18, ease: 'sine.inOut' }, 0)
      .to(leftArmRef.current, { rotation: -25, transformOrigin: '50% 10%', duration: 0.18, ease: 'sine.inOut' }, 0)
      .to(rightArmRef.current, { rotation: 25, transformOrigin: '50% 10%', duration: 0.18, ease: 'sine.inOut' }, 0)
      .to(leftLegRef.current, { rotation: -30, duration: 0.18, ease: 'sine.inOut' }, 0.18)
      .to(rightLegRef.current, { rotation: 30, duration: 0.18, ease: 'sine.inOut' }, 0.18)
      .to(leftArmRef.current, { rotation: 25, duration: 0.18, ease: 'sine.inOut' }, 0.18)
      .to(rightArmRef.current, { rotation: -25, duration: 0.18, ease: 'sine.inOut' }, 0.18);
    runCycleTL.current = tl;

    // Idle jetpack flame flicker
    const flame = gsap.to(flameRef.current, {
      scaleY: 1.3,
      scaleX: 0.8,
      transformOrigin: '50% 0%',
      duration: 0.12,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1,
    });

    return () => {
      tl.kill();
      flame.kill();
    };
  }, []);

  // Main chase loop
  useEffect(() => {
    let raf = 0;
    let lastT = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - lastT) / 1000);
      lastT = now;

      // Update visible cursor: apply recoil velocity with friction, then ease toward real cursor
      cursorPos.current.x += cursorVel.current.x * dt;
      cursorPos.current.y += cursorVel.current.y * dt;
      cursorVel.current.x *= 0.9;
      cursorVel.current.y *= 0.9;

      // Ease cursor dot back to real cursor position (once recoil fades)
      const cLerp = 0.25;
      cursorPos.current.x += (target.current.x - cursorPos.current.x) * cLerp;
      cursorPos.current.y += (target.current.y - cursorPos.current.y) * cLerp;

      gsap.set(cursorRef.current, {
        x: cursorPos.current.x,
        y: cursorPos.current.y,
      });

      if (!isKicking.current) {
        // Bot chases: aim to be BEHIND the cursor relative to its direction of travel
        // For simplicity, approach the cursor's position from wherever we are.
        const dx = cursorPos.current.x - botPos.current.x;
        const dy = cursorPos.current.y - botPos.current.y;
        const dist = Math.hypot(dx, dy);

        // Face the direction of motion
        if (Math.abs(dx) > 4) {
          const newFacing = dx > 0 ? 1 : -1;
          if (newFacing !== facing.current) {
            facing.current = newFacing;
            gsap.to(facingRef.current, {
              scaleX: newFacing,
              duration: 0.25,
              ease: 'power2.out',
            });
          }
        }

        // Speed scales with distance (feels natural)
        const speed = Math.min(1, dist / 300) * 0.18;

        // Move toward cursor, but stop a little short so we can "kick"
        const kickRange = 90;
        if (dist > kickRange) {
          botPos.current.x += dx * speed;
          botPos.current.y += dy * speed;

          if (runCycleTL.current?.paused()) runCycleTL.current.play();
        } else {
          // In kick range — trigger a kick if we haven't recently
          if (now - lastKickTime.current > 700) {
            lastKickTime.current = now;
            doKick(dx, dy);
          }
        }

        gsap.set(wrapRef.current, {
          x: botPos.current.x,
          y: botPos.current.y,
        });
      }

      // Eyes track the cursor
      const edx = cursorPos.current.x - botPos.current.x;
      const edy = cursorPos.current.y - botPos.current.y;
      const edist = Math.hypot(edx, edy) || 1;
      // account for facing flip so eyes look correct
      const eyeX = (edx / edist) * 4 * facing.current;
      const eyeY = (edy / edist) * 3;
      gsap.to([leftEyeRef.current, rightEyeRef.current], {
        x: eyeX,
        y: eyeY,
        duration: 0.3,
        ease: 'power2.out',
        overwrite: 'auto',
      });

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Kick animation — the leg swings, the cursor gets launched
  const doKick = (dx: number, dy: number) => {
    isKicking.current = true;
    runCycleTL.current?.pause();

    // Reset legs/arms
    gsap.set([leftLegRef.current, rightLegRef.current, leftArmRef.current, rightArmRef.current], {
      rotation: 0,
    });

    const kickLeg = facing.current === 1 ? rightLegRef.current : leftLegRef.current;
    const kickDir = facing.current; // +1 kick right, -1 kick left

    // Wind up + kick + follow-through
    const tl = gsap.timeline({
      onComplete: () => {
        isKicking.current = false;
      },
    });

    // Anticipation: crouch slightly, wind up
    tl.to(bodyRef.current, {
      y: 6,
      duration: 0.1,
      ease: 'power2.out',
    })
      .to(
        kickLeg,
        {
          rotation: -50 * kickDir,
          transformOrigin: '50% 0%',
          duration: 0.1,
          ease: 'power2.out',
        },
        '<',
      )
      // KICK! rapid swing
      .to(bodyRef.current, {
        y: -8,
        duration: 0.09,
        ease: 'power3.out',
      })
      .to(
        kickLeg,
        {
          rotation: 90 * kickDir,
          duration: 0.09,
          ease: 'power4.out',
          onStart: () => {
            // Launch the cursor away in the kick direction
            const power = 900;
            const nx = dx / (Math.hypot(dx, dy) || 1);
            const ny = dy / (Math.hypot(dx, dy) || 1);
            cursorVel.current.x = nx * power;
            cursorVel.current.y = ny * power - 250; // pop up a bit
            spawnImpact();
            spawnDust();

            // Little squash on impact
            gsap.fromTo(
              bodyRef.current,
              { scaleX: 1.1, scaleY: 0.9 },
              { scaleX: 1, scaleY: 1, duration: 0.25, ease: 'elastic.out(1, 0.4)' },
            );
            // Tiny screen-shake-style rotation on the bot
            gsap.fromTo(
              wrapRef.current,
              { rotation: -kickDir * 8 },
              { rotation: 0, duration: 0.4, ease: 'elastic.out(1, 0.4)' },
            );
          },
        },
        '<',
      )
      // Recover
      .to(kickLeg, {
        rotation: 0,
        duration: 0.25,
        ease: 'power2.out',
      })
      .to(
        bodyRef.current,
        {
          y: 0,
          duration: 0.25,
          ease: 'power2.out',
        },
        '<',
      );
  };

  // A quick impact burst overlay near the cursor
  const spawnImpact = () => {
    const el = document.createElement('div');
    el.className = 'pointer-events-none fixed z-[60]';
    el.style.left = `${cursorPos.current.x}px`;
    el.style.top = `${cursorPos.current.y}px`;
    el.style.width = '80px';
    el.style.height = '80px';
    el.style.marginLeft = '-40px';
    el.style.marginTop = '-40px';
    el.innerHTML = `
      <svg viewBox="0 0 80 80" width="80" height="80">
        <g fill="none" stroke="#fbbf24" stroke-width="3" stroke-linecap="round">
          <line x1="40" y1="10" x2="40" y2="24" />
          <line x1="40" y1="56" x2="40" y2="70" />
          <line x1="10" y1="40" x2="24" y2="40" />
          <line x1="56" y1="40" x2="70" y2="40" />
          <line x1="18" y1="18" x2="28" y2="28" />
          <line x1="52" y1="52" x2="62" y2="62" />
          <line x1="62" y1="18" x2="52" y2="28" />
          <line x1="28" y1="52" x2="18" y2="62" />
        </g>
        <text x="40" y="46" text-anchor="middle" font-family="Impact, sans-serif" font-size="18" fill="#fbbf24" stroke="#78350f" stroke-width="1">POW!</text>
      </svg>
    `;
    document.body.appendChild(el);
    gsap.fromTo(
      el,
      { scale: 0.3, opacity: 1, rotation: -20 },
      {
        scale: 1.4,
        opacity: 0,
        rotation: 20,
        duration: 0.5,
        ease: 'power2.out',
        onComplete: () => el.remove(),
      },
    );
  };

  // Dust puff at the bot's feet
  const spawnDust = () => {
    const g = dustRef.current;
    if (!g) return;
    // Reset & animate
    gsap.set(g, { scale: 0.5, opacity: 0.9 });
    gsap.to(g, {
      scale: 2,
      opacity: 0,
      duration: 0.5,
      ease: 'power2.out',
      transformOrigin: '50% 100%',
    });
  };

  return (
    <>
      {/* Custom cursor dot (the "target" that gets kicked) */}
      <div
        ref={cursorRef}
        className="pointer-events-none fixed left-0 top-0 z-[55]"
        style={{ transform: 'translate(0,0)' }}
      >
        <div className="relative -translate-x-1/2 -translate-y-1/2">
          <div className="h-5 w-5 rounded-full bg-white ring-2 ring-fuchsia-400 shadow-[0_0_20px_rgba(217,70,239,0.8)]" />
          <div className="absolute inset-0 h-5 w-5 rounded-full bg-fuchsia-400/40 animate-ping" />
        </div>
      </div>

      {/* The kicking bot */}
      <div
        ref={wrapRef}
        className="pointer-events-none fixed left-0 top-0 z-40 select-none"
        style={{ width: 140, height: 180, marginLeft: -70, marginTop: -90 }}
        aria-label="Astronaut chasing your cursor"
      >
        <div ref={facingRef} className="h-full w-full">
          <svg viewBox="0 0 140 180" className="h-full w-full overflow-visible">
            <defs>
              <radialGradient id="visorGrad2" cx="35%" cy="30%" r="70%">
                <stop offset="0%" stopColor="#a5f3fc" />
                <stop offset="45%" stopColor="#0891b2" />
                <stop offset="100%" stopColor="#0c1445" />
              </radialGradient>
              <linearGradient id="suitGrad2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f8fafc" />
                <stop offset="60%" stopColor="#cbd5e1" />
                <stop offset="100%" stopColor="#94a3b8" />
              </linearGradient>
              <linearGradient id="flameGrad2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fef08a" />
                <stop offset="40%" stopColor="#fb923c" />
                <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Ground shadow */}
            <ellipse ref={shadowRef} cx="70" cy="172" rx="30" ry="4" fill="#000" opacity="0.3" />

            {/* Dust puff (spawns on kick) */}
            <g ref={dustRef} opacity="0">
              <circle cx="55" cy="170" r="6" fill="#e2e8f0" opacity="0.7" />
              <circle cx="70" cy="168" r="8" fill="#e2e8f0" opacity="0.6" />
              <circle cx="85" cy="170" r="6" fill="#e2e8f0" opacity="0.7" />
            </g>

            <g ref={bodyRef}>
              {/* Jetpack flame */}
              <g ref={flameRef}>
                <path d="M 55 130 Q 58 148 62 160 Q 70 148 66 130 Z" fill="url(#flameGrad2)" />
                <path d="M 74 130 Q 77 145 82 158 Q 88 145 84 130 Z" fill="url(#flameGrad2)" />
              </g>

              {/* Jetpack */}
              <rect x="52" y="70" width="36" height="55" rx="8" fill="#475569" />
              <rect x="56" y="74" width="10" height="47" rx="3" fill="#334155" />
              <rect x="74" y="74" width="10" height="47" rx="3" fill="#334155" />
              <circle cx="61" cy="82" r="2" fill="#22d3ee" />
              <circle cx="79" cy="82" r="2" fill="#f59e0b" />

              {/* Legs */}
              <g ref={leftLegRef}>
                <rect x="52" y="128" width="15" height="35" rx="7" fill="url(#suitGrad2)" />
                <ellipse cx="59" cy="165" rx="10" ry="4" fill="#334155" />
              </g>
              <g ref={rightLegRef}>
                <rect x="73" y="128" width="15" height="35" rx="7" fill="url(#suitGrad2)" />
                <ellipse cx="80" cy="165" rx="10" ry="4" fill="#334155" />
              </g>

              {/* Left arm */}
              <g ref={leftArmRef}>
                <rect x="32" y="78" width="17" height="45" rx="8" fill="url(#suitGrad2)" />
                <circle cx="40" cy="125" r="10" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="1.5" />
              </g>

              {/* Right arm */}
              <g ref={rightArmRef}>
                <rect x="91" y="78" width="17" height="45" rx="8" fill="url(#suitGrad2)" />
                <circle cx="99" cy="125" r="10" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="1.5" />
              </g>

              {/* Torso */}
              <path
                d="M 46 75 Q 46 68 55 66 L 85 66 Q 94 68 94 75 L 94 128 Q 94 138 85 140 L 55 140 Q 46 138 46 128 Z"
                fill="url(#suitGrad2)"
                stroke="#94a3b8"
                strokeWidth="1.5"
              />

              {/* Chest panel */}
              <rect x="58" y="88" width="24" height="18" rx="3" fill="#1e293b" />
              <circle cx="63" cy="94" r="2" fill="#22d3ee" />
              <circle cx="70" cy="94" r="2" fill="#a3e635" />
              <circle cx="77" cy="94" r="2" fill="#f43f5e" />
              <rect x="61" y="99" width="18" height="2" rx="1" fill="#22d3ee" opacity="0.8" />

              {/* Head + Helmet */}
              <g ref={headRef}>
                <circle cx="70" cy="42" r="32" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1.5" />
                <rect x="58" y="68" width="24" height="6" rx="2" fill="#64748b" />
                <circle cx="70" cy="40" r="25" fill="url(#visorGrad2)" />
                <ellipse
                  cx="61"
                  cy="30"
                  rx="9"
                  ry="5"
                  fill="#fff"
                  opacity="0.55"
                  transform="rotate(-25 61 30)"
                />
                {/* Eyes */}
                <circle cx="62" cy="43" r="4.5" fill="#fff" />
                <circle cx="78" cy="43" r="4.5" fill="#fff" />
                <circle ref={leftEyeRef} cx="62" cy="43" r="2.2" fill="#0f172a" />
                <circle ref={rightEyeRef} cx="78" cy="43" r="2.2" fill="#0f172a" />
                {/* Determined mouth */}
                <path
                  d="M 64 54 L 76 54"
                  stroke="#0f172a"
                  strokeWidth="2"
                  strokeLinecap="round"
                  fill="none"
                />
                {/* Helmet rim */}
                <circle cx="70" cy="42" r="32" fill="none" stroke="#cbd5e1" strokeWidth="2" />
                <line x1="70" y1="6" x2="70" y2="0" stroke="#64748b" strokeWidth="1.5" />
                <circle cx="70" cy="-1" r="2" fill="#ef4444">
                  <animate attributeName="opacity" values="1;0.3;1" dur="0.8s" repeatCount="indefinite" />
                </circle>
              </g>
            </g>
          </svg>
        </div>
      </div>
    </>
  );
}
