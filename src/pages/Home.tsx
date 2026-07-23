import { useRef, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import Features from '@/components/Features';
import Showcase from '@/components/Showcase';
import CTA from '@/components/CTA';
import Footer from '@/components/Footer';
import Astronaut from '@/components/Astronaut';
import AsteroidField from '@/components/AsteroidField';
import ScoreHUD from '@/components/ScoreHUD';
import TitleScreen from '@/components/TitleScreen';
import InitialsEntry from '@/components/InitialsEntry';
import { GamePhaseProvider } from '@/lib/gamePhase';
import { initSoundListener } from '@/lib/sounds';
import type { AsteroidFieldAPI } from '@/components/AsteroidField';

function GameWorld() {
  const asteroidApi = useRef<AsteroidFieldAPI | null>(null);

  useEffect(() => {
    initSoundListener();
  }, []);

  return (
    <>
      {/* Physics asteroid canvas — always mounted, behavior changes by phase */}
      <AsteroidField apiRef={asteroidApi} />

      {/* 3D character — always mounted, chases asteroids during play */}
      <Astronaut asteroidApi={asteroidApi} />

      {/* Game HUD */}
      <ScoreHUD />

      {/* Title screen overlay */}
      <TitleScreen />

      {/* Initials entry overlay */}
      <InitialsEntry />
    </>
  );
}

export default function Home() {
  return (
    <GamePhaseProvider>
      <div className="relative min-h-screen bg-[#050505] text-white overflow-hidden">
        {/* Ambient background glow */}
        <div className="pointer-events-none absolute inset-0 -z-0">
          <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[900px] h-[900px] rounded-full bg-fuchsia-600/20 blur-[160px]" />
          <div className="absolute top-[40%] right-[-10%] w-[600px] h-[600px] rounded-full bg-indigo-600/20 blur-[160px]" />
          <div className="absolute bottom-[10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-cyan-600/10 blur-[160px]" />
        </div>

        {/* Game layer */}
        <GameWorld />

        {/* Landing page content (always visible behind overlays) */}
        <Navbar />
        <Hero />
        <Features />
        <Showcase />
        <CTA />
        <Footer />
      </div>
    </GamePhaseProvider>
  );
}
