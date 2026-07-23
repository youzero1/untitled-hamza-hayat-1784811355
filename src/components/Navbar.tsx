import { useEffect, useRef } from 'react';
import gsap from 'gsap';

export default function Navbar() {
  const navRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('[data-nav-item]', {
        y: -30,
        opacity: 0,
        duration: 0.8,
        ease: 'power3.out',
        stagger: 0.08,
        delay: 0.1,
      });
    }, navRef);
    return () => ctx.revert();
  }, []);

  return (
    <header
      ref={navRef}
      className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-black/30 border-b border-white/5"
    >
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div data-nav-item className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-fuchsia-500 to-indigo-500 shadow-lg shadow-fuchsia-500/30" />
          <span className="font-semibold tracking-tight text-lg">Nova</span>
        </div>
        <nav className="hidden md:flex items-center gap-8 text-sm text-white/70">
          <a data-nav-item href="#features" className="hover:text-white transition">Features</a>
          <a data-nav-item href="#showcase" className="hover:text-white transition">Showcase</a>
          <a data-nav-item href="#pricing" className="hover:text-white transition">Pricing</a>
          <a data-nav-item href="#faq" className="hover:text-white transition">FAQ</a>
        </nav>
        <a
          data-nav-item
          href="#cta"
          className="px-4 py-2 rounded-full bg-white text-black text-sm font-medium hover:bg-white/90 transition"
        >
          Get started
        </a>
      </div>
    </header>
  );
}
