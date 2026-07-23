import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const features = [
  {
    icon: '⚡',
    title: 'Lightning-fast builds',
    body: 'From prompt to preview in seconds. Nova compiles, deploys, and hot-reloads before you finish your coffee.',
    gradient: 'from-fuchsia-500/30 to-pink-500/10',
  },
  {
    icon: '🎨',
    title: 'Design-native primitives',
    body: 'Every component ships with pixel-tight defaults, dark mode, and motion baked in — so it looks great out of the box.',
    gradient: 'from-indigo-500/30 to-blue-500/10',
  },
  {
    icon: '🧠',
    title: 'AI that ships code',
    body: 'Not just autocomplete — a full teammate that understands your product, writes real features, and reviews itself.',
    gradient: 'from-cyan-500/30 to-emerald-500/10',
  },
  {
    icon: '🔐',
    title: 'Secure by default',
    body: 'Auth, secrets, and RLS wired up the moment you need them. No sprint dedicated to “we should do auth soon.”',
    gradient: 'from-amber-500/30 to-orange-500/10',
  },
  {
    icon: '🌐',
    title: 'One-click deploy',
    body: 'Push to a URL your users can visit in one click. Preview builds, custom domains, and SSL are handled for you.',
    gradient: 'from-rose-500/30 to-red-500/10',
  },
  {
    icon: '📈',
    title: 'Scales with you',
    body: 'From weekend hack to millions of users on the same stack. No painful migration when things start working.',
    gradient: 'from-violet-500/30 to-purple-500/10',
  },
];

export default function Features() {
  const rootRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('[data-feat-title]', {
        scrollTrigger: {
          trigger: '[data-feat-title]',
          start: 'top 85%',
        },
        y: 40,
        opacity: 0,
        duration: 0.9,
        ease: 'power3.out',
      });

      gsap.from('[data-feat-sub]', {
        scrollTrigger: {
          trigger: '[data-feat-sub]',
          start: 'top 85%',
        },
        y: 30,
        opacity: 0,
        duration: 0.9,
        delay: 0.1,
        ease: 'power3.out',
      });

      gsap.utils.toArray<HTMLElement>('[data-feat-card]').forEach((card, i) => {
        gsap.from(card, {
          scrollTrigger: {
            trigger: card,
            start: 'top 88%',
          },
          y: 60,
          opacity: 0,
          duration: 0.9,
          delay: (i % 3) * 0.1,
          ease: 'power3.out',
        });
      });
    }, rootRef);
    return () => ctx.revert();
  }, []);

  return (
    <section id="features" ref={rootRef} className="relative py-32 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-20">
          <h2
            data-feat-title
            className="text-4xl md:text-6xl font-semibold tracking-tight mb-4"
          >
            Everything you need.
            <br />
            <span className="text-white/40">Nothing you don't.</span>
          </h2>
          <p
            data-feat-sub
            className="text-lg text-white/60 max-w-2xl mx-auto"
          >
            A stack designed around one idea: the fastest path from an idea in your head
            to a product in your users' hands.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <div
              key={f.title}
              data-feat-card
              className="group relative rounded-2xl border border-white/10 bg-white/[0.03] p-6 hover:border-white/20 hover:bg-white/[0.05] transition overflow-hidden"
            >
              <div
                className={`absolute inset-0 bg-gradient-to-br ${f.gradient} opacity-0 group-hover:opacity-100 transition duration-500 pointer-events-none`}
              />
              <div className="relative">
                <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center text-2xl mb-5">
                  {f.icon}
                </div>
                <h3 className="text-xl font-semibold mb-2">{f.title}</h3>
                <p className="text-white/60 leading-relaxed text-[15px]">{f.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
