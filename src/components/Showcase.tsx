import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const projects = [
  { name: 'Lumen', tag: 'Analytics', color: 'from-fuchsia-500 to-pink-500' },
  { name: 'Harbor', tag: 'Fintech', color: 'from-indigo-500 to-blue-500' },
  { name: 'Fern', tag: 'Wellness', color: 'from-emerald-500 to-teal-500' },
  { name: 'Prism', tag: 'Design tools', color: 'from-amber-500 to-orange-500' },
  { name: 'Signal', tag: 'Communications', color: 'from-rose-500 to-red-500' },
  { name: 'Atlas', tag: 'Maps & travel', color: 'from-violet-500 to-purple-500' },
];

export default function Showcase() {
  const rootRef = useRef<HTMLElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // heading reveal
      gsap.from('[data-show-head]', {
        scrollTrigger: { trigger: '[data-show-head]', start: 'top 85%' },
        y: 40,
        opacity: 0,
        duration: 0.9,
        stagger: 0.1,
        ease: 'power3.out',
      });

      // horizontal scroll of the track pinned to the section
      const track = trackRef.current;
      if (!track) return;
      const totalScroll = track.scrollWidth - window.innerWidth + 96;
      if (totalScroll <= 0) return;

      gsap.to(track, {
        x: -totalScroll,
        ease: 'none',
        scrollTrigger: {
          trigger: rootRef.current,
          start: 'top top',
          end: () => `+=${totalScroll}`,
          scrub: 1,
          pin: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });
    }, rootRef);
    return () => ctx.revert();
  }, []);

  return (
    <section
      id="showcase"
      ref={rootRef}
      className="relative py-32 overflow-hidden"
    >
      <div className="max-w-6xl mx-auto px-6 mb-16">
        <div className="flex items-end justify-between flex-wrap gap-6">
          <div>
            <div data-show-head className="text-sm uppercase tracking-[0.2em] text-white/40 mb-4">
              Showcase
            </div>
            <h2
              data-show-head
              className="text-4xl md:text-6xl font-semibold tracking-tight max-w-3xl"
            >
              Built by teams
              <br />
              <span className="bg-gradient-to-r from-fuchsia-300 to-indigo-300 bg-clip-text text-transparent">
                that don't wait.
              </span>
            </h2>
          </div>
          <p data-show-head className="text-white/50 max-w-sm">
            Real products, launched by real teams — from side project to Series A —
            all on Nova.
          </p>
        </div>
      </div>

      <div className="relative">
        <div ref={trackRef} className="flex gap-6 pl-6 pr-24 will-change-transform">
          {projects.map((p) => (
            <div
              key={p.name}
              className="relative shrink-0 w-[420px] h-[520px] rounded-3xl overflow-hidden border border-white/10 group"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${p.color}`} />
              <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition duration-500" />
              <div className="absolute inset-0 p-8 flex flex-col justify-between text-white">
                <div>
                  <div className="text-xs uppercase tracking-widest opacity-70">
                    {p.tag}
                  </div>
                </div>
                <div>
                  <div className="text-4xl font-semibold tracking-tight">
                    {p.name}
                  </div>
                  <div className="mt-2 text-sm opacity-80">
                    Shipped in 6 weeks. Live in 42 countries.
                  </div>
                </div>
              </div>
              {/* mock UI shimmer */}
              <div className="absolute right-8 top-1/2 -translate-y-1/2 w-40 h-64 rounded-2xl bg-white/15 backdrop-blur-xl border border-white/20 shadow-2xl">
                <div className="p-4 space-y-2">
                  <div className="h-3 w-16 bg-white/40 rounded" />
                  <div className="h-2 w-24 bg-white/25 rounded" />
                  <div className="mt-4 h-16 bg-white/25 rounded" />
                  <div className="h-2 w-full bg-white/20 rounded" />
                  <div className="h-2 w-3/4 bg-white/20 rounded" />
                  <div className="h-2 w-2/3 bg-white/20 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
