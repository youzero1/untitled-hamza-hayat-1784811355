import { useEffect, useRef } from 'react';
import gsap from 'gsap';

export default function Hero() {
  const rootRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });

      tl.from('[data-hero-badge]', {
        y: 20,
        opacity: 0,
        duration: 0.8,
      })
        .from(
          '[data-hero-word]',
          {
            y: 80,
            opacity: 0,
            duration: 1.1,
            stagger: 0.08,
            ease: 'expo.out',
          },
          '-=0.4',
        )
        .from(
          '[data-hero-sub]',
          {
            y: 20,
            opacity: 0,
            duration: 0.9,
          },
          '-=0.6',
        )
        .from(
          '[data-hero-cta]',
          {
            y: 20,
            opacity: 0,
            duration: 0.7,
            stagger: 0.1,
          },
          '-=0.5',
        )
        .from(
          '[data-hero-stat]',
          {
            y: 20,
            opacity: 0,
            duration: 0.6,
            stagger: 0.1,
          },
          '-=0.3',
        );

      // floating orbs
      gsap.to('[data-hero-orb]', {
        y: -20,
        duration: 3,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true,
        stagger: 0.4,
      });
    }, rootRef);
    return () => ctx.revert();
  }, []);

  const words = ['Ship', 'faster.', 'Ship', 'bolder.'];

  return (
    <section ref={rootRef} className="relative pt-40 pb-32 px-6">
      {/* floating decorative orbs */}
      <div
        data-hero-orb
        className="absolute top-32 left-[10%] w-3 h-3 rounded-full bg-fuchsia-400 shadow-lg shadow-fuchsia-500/70"
      />
      <div
        data-hero-orb
        className="absolute top-60 right-[12%] w-4 h-4 rounded-full bg-indigo-400 shadow-lg shadow-indigo-500/70"
      />
      <div
        data-hero-orb
        className="absolute bottom-24 left-[20%] w-2 h-2 rounded-full bg-cyan-300 shadow-lg shadow-cyan-400/70"
      />
      <div
        data-hero-orb
        className="absolute bottom-40 right-[24%] w-3 h-3 rounded-full bg-pink-300 shadow-lg shadow-pink-400/70"
      />

      <div className="max-w-5xl mx-auto text-center relative">
        <div
          data-hero-badge
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-xs text-white/70 mb-8"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Now in public beta
        </div>

        <h1 className="text-5xl md:text-7xl lg:text-8xl font-semibold tracking-tight leading-[1.05] mb-8">
          {words.map((w, i) => (
            <span key={i} className="inline-block overflow-hidden pb-2 mr-4">
              <span
                data-hero-word
                className={`inline-block ${
                  i === 3
                    ? 'bg-gradient-to-r from-fuchsia-400 via-pink-400 to-indigo-400 bg-clip-text text-transparent'
                    : ''
                }`}
              >
                {w}
              </span>
            </span>
          ))}
        </h1>

        <p
          data-hero-sub
          className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto mb-10"
        >
          Nova is the design-first product studio that turns wild ideas into polished,
          production-ready apps — in days, not quarters.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <a
            data-hero-cta
            href="#cta"
            className="px-6 py-3 rounded-full bg-white text-black font-medium hover:bg-white/90 transition shadow-lg shadow-white/10"
          >
            Start building free
          </a>
          <a
            data-hero-cta
            href="#showcase"
            className="px-6 py-3 rounded-full border border-white/15 text-white/80 font-medium hover:bg-white/5 transition"
          >
            Watch the demo →
          </a>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-10 text-sm text-white/50">
          <div data-hero-stat className="flex flex-col items-center">
            <span className="text-2xl font-semibold text-white">12k+</span>
            <span>Teams shipping</span>
          </div>
          <div data-hero-stat className="flex flex-col items-center">
            <span className="text-2xl font-semibold text-white">4.9★</span>
            <span>User rating</span>
          </div>
          <div data-hero-stat className="flex flex-col items-center">
            <span className="text-2xl font-semibold text-white">99.99%</span>
            <span>Uptime</span>
          </div>
        </div>
      </div>
    </section>
  );
}
