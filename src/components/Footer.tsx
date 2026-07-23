import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const columns = [
  {
    title: 'Product',
    links: ['Features', 'Showcase', 'Pricing', 'Changelog', 'Roadmap'],
  },
  {
    title: 'Company',
    links: ['About', 'Careers', 'Press', 'Contact', 'Blog'],
  },
  {
    title: 'Resources',
    links: ['Docs', 'Guides', 'API', 'Community', 'Support'],
  },
  {
    title: 'Legal',
    links: ['Privacy', 'Terms', 'Security', 'Cookies'],
  },
];

export default function Footer() {
  const rootRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('[data-foot-col]', {
        scrollTrigger: {
          trigger: rootRef.current,
          start: 'top 90%',
        },
        y: 30,
        opacity: 0,
        duration: 0.8,
        stagger: 0.08,
        ease: 'power3.out',
      });

      gsap.from('[data-foot-word]', {
        scrollTrigger: {
          trigger: '[data-foot-word]',
          start: 'top 95%',
        },
        opacity: 0,
        y: 40,
        duration: 1.2,
        ease: 'power3.out',
      });
    }, rootRef);
    return () => ctx.revert();
  }, []);

  return (
    <footer
      ref={rootRef}
      className="relative border-t border-white/10 pt-20 pb-12 px-6 overflow-hidden"
    >
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-6 gap-10 mb-16">
          <div data-foot-col className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-fuchsia-500 to-indigo-500" />
              <span className="font-semibold text-lg tracking-tight">Nova</span>
            </div>
            <p className="text-white/50 text-sm max-w-xs leading-relaxed">
              The design-first product studio for teams that would rather ship than
              schedule a meeting about shipping.
            </p>
          </div>
          {columns.map((col) => (
            <div key={col.title} data-foot-col>
              <div className="text-sm font-medium text-white/80 mb-4">
                {col.title}
              </div>
              <ul className="space-y-2 text-sm text-white/50">
                {col.links.map((l) => (
                  <li key={l}>
                    <a href="#" className="hover:text-white transition">
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between flex-wrap gap-4 pt-8 border-t border-white/10 text-xs text-white/40">
          <div>© {new Date().getFullYear()} Nova Labs, Inc. All rights reserved.</div>
          <div className="flex items-center gap-4">
            <a href="#" className="hover:text-white/70">Twitter</a>
            <a href="#" className="hover:text-white/70">GitHub</a>
            <a href="#" className="hover:text-white/70">Discord</a>
          </div>
        </div>

        {/* huge subtle wordmark */}
        <div
          data-foot-word
          className="pointer-events-none select-none mt-16 text-center text-[18vw] leading-none font-semibold tracking-tighter bg-gradient-to-b from-white/[0.08] to-transparent bg-clip-text text-transparent"
        >
          NOVA
        </div>
      </div>
    </footer>
  );
}
