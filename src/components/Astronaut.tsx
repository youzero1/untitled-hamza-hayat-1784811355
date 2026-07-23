import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function Astronaut() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<SVGGElement>(null);
  const headRef = useRef<SVGGElement>(null);
  const visorRef = useRef<SVGGElement>(null);
  const leftEyeRef = useRef<SVGCircleElement>(null);
  const rightEyeRef = useRef<SVGCircleElement>(null);
  const leftArmRef = useRef<SVGGElement>(null);
  const rightArmRef = useRef<SVGGElement>(null);
  const flameRef = useRef<SVGGElement>(null);
  const glowRef = useRef<SVGCircleElement>(null);
  const shadowRef = useRef<SVGEllipseElement>(null);

  // Idle floating + jetpack flame + subtle head bob
  useEffect(() => {
    const ctx = gsap.context(() => {
      // Floating idle
      gsap.to(bodyRef.current, {
        y: -14,
        duration: 2.4,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
      });
      // Head tilt breathing
      gsap.to(headRef.current, {
        rotation: 2,
        transformOrigin: '50% 80%',
        duration: 3.2,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
      });
      // Shadow pulse (in sync with float)
      gsap.to(shadowRef.current, {
        attr: { rx: 55, opacity: 0.15 },
        duration: 2.4,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
      });
      // Jetpack flame flicker
      gsap.to(flameRef.current, {
        scaleY: 1.25,
        scaleX: 0.85,
        transformOrigin: '50% 0%',
        duration: 0.14,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
      });
      // Glow pulse
      gsap.to(glowRef.current, {
        attr: { r: 130 },
        opacity: 0.35,
        duration: 1.8,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
      });
    }, wrapRef);
    return () => ctx.revert();
  }, []);

  // Cursor tracking (eyes + slight head follow)
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.hypot(dx, dy) || 1;
      const nx = dx / dist;
      const ny = dy / dist;

      // Eye pupils move within visor
      gsap.to([leftEyeRef.current, rightEyeRef.current], {
        x: nx * 6,
        y: ny * 4,
        duration: 0.5,
        ease: 'power2.out',
        overwrite: 'auto',
      });
      // Head slight rotation toward cursor
      gsap.to(headRef.current, {
        rotation: nx * 6,
        transformOrigin: '50% 80%',
        duration: 0.8,
        ease: 'power2.out',
        overwrite: 'auto',
      });
    };

    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  // Scroll journey: astronaut travels across the page & changes poses
  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: document.body,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 1,
        },
      });

      // Hero → Features: drift right & down
      tl.to(wrapRef.current, { xPercent: 40, yPercent: 20, rotation: -8, ease: 'none' }, 0)
        // Features → Showcase: swoop left, upside-down-ish tumble
        .to(wrapRef.current, { xPercent: -30, yPercent: 60, rotation: 25, scale: 0.85, ease: 'none' }, 0.25)
        // Showcase → CTA: recenter, larger, celebratory
        .to(wrapRef.current, { xPercent: 15, yPercent: 100, rotation: -15, scale: 1.1, ease: 'none' }, 0.55)
        // Final: drift off toward footer
        .to(wrapRef.current, { xPercent: -20, yPercent: 140, rotation: 10, scale: 0.9, ease: 'none' }, 0.8);
    }, wrapRef);
    return () => ctx.revert();
  }, []);

  // Wave on hover
  const handleEnter = () => {
    gsap.to(rightArmRef.current, {
      rotation: -70,
      transformOrigin: '50% 10%',
      duration: 0.3,
      ease: 'back.out(2)',
    });
    // Little waving loop
    gsap.to(rightArmRef.current, {
      rotation: -40,
      transformOrigin: '50% 10%',
      duration: 0.25,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: 5,
      delay: 0.3,
    });
    gsap.to(bodyRef.current, {
      scale: 1.05,
      duration: 0.4,
      ease: 'back.out(1.7)',
    });
  };

  const handleLeave = () => {
    gsap.to(rightArmRef.current, {
      rotation: 0,
      transformOrigin: '50% 10%',
      duration: 0.5,
      ease: 'power3.out',
    });
    gsap.to(bodyRef.current, {
      scale: 1,
      duration: 0.4,
      ease: 'power2.out',
    });
  };

  return (
    <div
      ref={wrapRef}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      className="pointer-events-auto fixed top-1/2 left-1/2 z-30 -translate-x-1/2 -translate-y-1/2 cursor-pointer select-none"
      style={{ width: 240, height: 300 }}
      aria-label="Waving astronaut character"
    >
      <svg viewBox="0 0 240 300" className="h-full w-full overflow-visible">
        <defs>
          <radialGradient id="visorGrad" cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#a5f3fc" />
            <stop offset="45%" stopColor="#0891b2" />
            <stop offset="100%" stopColor="#0c1445" />
          </radialGradient>
          <linearGradient id="suitGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f8fafc" />
            <stop offset="60%" stopColor="#cbd5e1" />
            <stop offset="100%" stopColor="#94a3b8" />
          </linearGradient>
          <linearGradient id="flameGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="40%" stopColor="#fb923c" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="glowGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Ambient glow */}
        <circle ref={glowRef} cx="120" cy="150" r="100" fill="url(#glowGrad)" opacity="0.25" />

        {/* Ground shadow */}
        <ellipse
          ref={shadowRef}
          cx="120"
          cy="285"
          rx="45"
          ry="6"
          fill="#000"
          opacity="0.25"
        />

        <g ref={bodyRef}>
          {/* Jetpack flame */}
          <g ref={flameRef}>
            <path
              d="M 100 215 Q 105 240 110 260 Q 120 240 115 215 Z"
              fill="url(#flameGrad)"
            />
            <path
              d="M 125 215 Q 130 235 135 255 Q 145 235 140 215 Z"
              fill="url(#flameGrad)"
            />
          </g>

          {/* Jetpack */}
          <rect x="95" y="130" width="50" height="80" rx="10" fill="#475569" />
          <rect x="100" y="135" width="15" height="70" rx="4" fill="#334155" />
          <rect x="125" y="135" width="15" height="70" rx="4" fill="#334155" />
          <circle cx="107" cy="145" r="3" fill="#22d3ee" />
          <circle cx="132" cy="145" r="3" fill="#f59e0b" />

          {/* Left arm */}
          <g ref={leftArmRef}>
            <rect x="55" y="140" width="26" height="70" rx="13" fill="url(#suitGrad)" />
            <circle cx="68" cy="215" r="15" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="2" />
          </g>

          {/* Right arm (waves) */}
          <g ref={rightArmRef}>
            <rect x="159" y="140" width="26" height="70" rx="13" fill="url(#suitGrad)" />
            <circle cx="172" cy="215" r="15" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="2" />
          </g>

          {/* Torso */}
          <path
            d="M 80 135 Q 80 125 95 122 L 145 122 Q 160 125 160 135 L 160 210 Q 160 225 145 228 L 95 228 Q 80 225 80 210 Z"
            fill="url(#suitGrad)"
            stroke="#94a3b8"
            strokeWidth="2"
          />

          {/* Chest control panel */}
          <rect x="100" y="155" width="40" height="30" rx="4" fill="#1e293b" />
          <circle cx="110" cy="165" r="3" fill="#22d3ee" />
          <circle cx="120" cy="165" r="3" fill="#a3e635" />
          <circle cx="130" cy="165" r="3" fill="#f43f5e" />
          <rect x="105" y="172" width="30" height="4" rx="2" fill="#334155" />
          <rect x="105" y="178" width="20" height="3" rx="1.5" fill="#22d3ee" opacity="0.7" />

          {/* Legs */}
          <rect x="92" y="225" width="22" height="50" rx="10" fill="url(#suitGrad)" />
          <rect x="126" y="225" width="22" height="50" rx="10" fill="url(#suitGrad)" />
          <ellipse cx="103" cy="278" rx="14" ry="6" fill="#334155" />
          <ellipse cx="137" cy="278" rx="14" ry="6" fill="#334155" />

          {/* Head + Helmet */}
          <g ref={headRef}>
            {/* Helmet backing */}
            <circle cx="120" cy="80" r="52" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="2" />
            {/* Neck ring */}
            <rect x="100" y="122" width="40" height="10" rx="3" fill="#64748b" />

            {/* Visor */}
            <g ref={visorRef}>
              <circle cx="120" cy="78" r="40" fill="url(#visorGrad)" />
              {/* Visor highlight */}
              <ellipse cx="105" cy="62" rx="14" ry="8" fill="#fff" opacity="0.55" transform="rotate(-25 105 62)" />
              <ellipse cx="115" cy="72" rx="4" ry="2" fill="#fff" opacity="0.4" transform="rotate(-25 115 72)" />

              {/* Face inside visor */}
              <g>
                {/* Eye whites */}
                <circle cx="108" cy="82" r="7" fill="#fff" />
                <circle cx="132" cy="82" r="7" fill="#fff" />
                {/* Pupils (track cursor) */}
                <circle ref={leftEyeRef} cx="108" cy="82" r="3.5" fill="#0f172a" />
                <circle ref={rightEyeRef} cx="132" cy="82" r="3.5" fill="#0f172a" />
                {/* Smile */}
                <path
                  d="M 112 96 Q 120 102 128 96"
                  stroke="#0f172a"
                  strokeWidth="2"
                  strokeLinecap="round"
                  fill="none"
                />
              </g>
            </g>

            {/* Helmet rim */}
            <circle cx="120" cy="80" r="52" fill="none" stroke="#cbd5e1" strokeWidth="3" />
            <circle cx="120" cy="80" r="48" fill="none" stroke="#fff" strokeWidth="1" opacity="0.6" />
            {/* Antenna */}
            <line x1="120" y1="28" x2="120" y2="18" stroke="#64748b" strokeWidth="2" />
            <circle cx="120" cy="16" r="3" fill="#ef4444">
              <animate attributeName="opacity" values="1;0.3;1" dur="1s" repeatCount="indefinite" />
            </circle>
          </g>
        </g>
      </svg>
    </div>
  );
}
