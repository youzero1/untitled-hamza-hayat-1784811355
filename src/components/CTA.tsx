import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function CTA() {
  const rootRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('[data-cta-card]', {
        scrollTrigger: {
          trigger: '[data-cta-card]',
          start: 'top 80%',
        },
        y: 60,
        opacity: 0,
        scale: 0.96,
        duration: 1,
        ease: 'power3.out',
      });

      gsap.from('[data-cta-line]', {
        scrollTrigger: {
          trigger: '[data-cta-card]',
          start: 'top 75%',
        },
        y: 30,
        opacity: 0,
        duration: 0.8,
        stagger: 0.1,
        delay: 0.2,
        ease: 'power3.out',
      });

      // subtle floating on the shine
      gsap.to('[data-cta-shine]', {
        x: '100%',
        duration: 4,
        repeat: -1,
        ease: 'sine.inOut',
      });
    }, rootRef);
    return () => ctx.revert();
  }, []);

  return (
    <section id="cta" ref={rootRef} className="relative py-32 px-6">
      <div className="max-w-5xl mx-auto">
        <div
          data-cta-card
          className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-fuchsia-600/30 via-indigo-600/20 to-cyan-600/20 p-12 md:p-20 text-center"
        >
          {/* animated shine */}
          <div
            data-cta-shine
            className="absolute inset-y-0 -left-full w-1/3 bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none"
          />

          <div
            data-cta-line
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/20 bg-white/10 text-xs text-white/80 mb-6"
          >
            ✨ Free for solo makers, forever
          </div>
          <h2
            data-cta-line
            className="text-4xl md:text-6xl font-semibold tracking-tight mb-6"
          >
            Ready to ship
            <br />
            <span className="bg-gradient-to-r from-white via-fuchsia-200 to-indigo-200 bg-clip-text text-transparent">
              something great?
            </span>
          </h2>
          <p
            data-cta-line
            className="text-lg text-white/70 max-w-xl mx-auto mb-10"
          >
            Join thousands of makers turning weekend ideas into weeknight launches.
            No credit card. No setup. Just build.
          </p>
          <div data-cta-line className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="#cta"
              className="px-6 py-3 rounded-full bg-white text-black font-medium hover:bg-white/90 transition shadow-lg shadow-white/10"
            >
              Start building free
            </a>
            <a
              href="#features"
              className="px-6 py-3 rounded-full border border-white/20 text-white/90 font-medium hover:bg-white/5 transition"
            >
              Talk to sales
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
