import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import Features from '@/components/Features';
import Showcase from '@/components/Showcase';
import CTA from '@/components/CTA';
import Footer from '@/components/Footer';

export default function Home() {
  return (
    <div className="relative min-h-screen bg-[#050505] text-white overflow-hidden">
      {/* ambient background glow */}
      <div className="pointer-events-none absolute inset-0 -z-0">
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[900px] h-[900px] rounded-full bg-fuchsia-600/20 blur-[160px]" />
        <div className="absolute top-[40%] right-[-10%] w-[600px] h-[600px] rounded-full bg-indigo-600/20 blur-[160px]" />
        <div className="absolute bottom-[10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-cyan-600/10 blur-[160px]" />
      </div>

      <Navbar />
      <Hero />
      <Features />
      <Showcase />
      <CTA />
      <Footer />
    </div>
  );
}
