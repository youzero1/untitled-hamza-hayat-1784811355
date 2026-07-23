import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useGamePhase, startGame, returnToTitle } from '@/lib/gamePhase';
import { getLeaderboard, getHighScore, clearLeaderboard } from '@/lib/leaderboard';
import { playSound, getAudio } from '@/lib/sounds';

export default function TitleScreen() {
  const phase = useGamePhase();
  const overlayRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const startBtnRef = useRef<HTMLButtonElement>(null);
  const rowsRef = useRef<HTMLDivElement>(null);
  const board = getLeaderboard();
  const hs = getHighScore();

  useEffect(() => {
    if (phase !== 'title') return;
    const overlay = overlayRef.current;
    const title = titleRef.current;
    const btn = startBtnRef.current;
    const rows = rowsRef.current;
    if (!overlay || !title || !btn) return;

    // Reset
    gsap.set(overlay, { opacity: 0 });
    gsap.set(btn, { scale: 1 });

    // Animate in
    gsap.to(overlay, { opacity: 1, duration: 0.5, ease: 'power2.out' });

    // Title letter stagger
    const letters = title.querySelectorAll('span');
    gsap.fromTo(letters,
      { y: 60, opacity: 0, rotateX: -90 },
      { y: 0, opacity: 1, rotateX: 0, duration: 0.7, stagger: 0.05, ease: 'back.out(2)', delay: 0.2 }
    );

    // Leaderboard rows
    if (rows) {
      const rowEls = rows.querySelectorAll('.lb-row');
      gsap.fromTo(rowEls,
        { x: -40, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.5, stagger: 0.08, delay: 0.7, ease: 'power2.out' }
      );
    }

    // START button pulse loop
    const pulse = gsap.to(btn, {
      scale: 1.05,
      duration: 0.8,
      yoyo: true,
      repeat: -1,
      ease: 'sine.inOut',
      delay: 1,
    });

    return () => { pulse.kill(); };
  }, [phase]);

  const handleStart = () => {
    getAudio(); // unlock audio context on user gesture
    playSound('uiClick');
    const overlay = overlayRef.current;
    if (overlay) {
      gsap.to(overlay, {
        opacity: 0,
        scale: 0.95,
        duration: 0.4,
        ease: 'power2.in',
        onComplete: () => startGame(),
      });
    } else {
      startGame();
    }
  };

  const handleClearScores = () => {
    if (window.confirm('Clear all scores and leaderboard?')) {
      clearLeaderboard();
      returnToTitle();
    }
  };

  if (phase !== 'title') return null;

  // Split title into letters for GSAP
  const titleText = 'ASTRO KICKER';
  const letters = titleText.split('');

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[500] flex flex-col items-center justify-center bg-black/80 backdrop-blur-md overflow-auto py-8"
    >
      {/* Glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-purple-600/20 blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] rounded-full bg-pink-600/15 blur-[100px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-6 w-full max-w-lg px-4">
        {/* Title */}
        <h1
          ref={titleRef}
          className="text-6xl sm:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-yellow-400 leading-tight text-center"
          style={{ perspective: '600px' }}
        >
          {letters.map((l, i) => (
            <span key={i} className="inline-block" style={{ opacity: 0 }}>
              {l === ' ' ? '\u00A0' : l}
            </span>
          ))}
        </h1>

        <p className="text-white/60 text-center text-sm sm:text-base max-w-xs">
          Kick the asteroids. Save the planet. Don&apos;t miss.
        </p>

        {/* How to play */}
        <div className="flex gap-4 w-full justify-center flex-wrap">
          {[
            { icon: '🖱️', label: 'Move mouse', sub: 'Guide the hero' },
            { icon: '👢', label: 'Auto kick', sub: 'Boots asteroids up' },
            { icon: '💎', label: 'Grab crystals', sub: 'Slow-mo & double kick' },
          ].map(({ icon, label, sub }) => (
            <div key={label} className="flex flex-col items-center bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-center min-w-[90px]">
              <span className="text-3xl mb-1">{icon}</span>
              <span className="text-white text-xs font-bold">{label}</span>
              <span className="text-white/40 text-xs mt-0.5">{sub}</span>
            </div>
          ))}
        </div>

        {/* High score */}
        {hs > 0 && (
          <div className="flex items-center gap-2 text-yellow-300 text-sm font-bold">
            <span>🏆</span>
            <span>Best: {hs.toLocaleString()}</span>
          </div>
        )}

        {/* Leaderboard */}
        <div ref={rowsRef} className="w-full bg-black/40 border border-white/10 rounded-2xl overflow-hidden">
          <div className="px-4 py-2 bg-white/5 border-b border-white/10 text-white/60 text-xs uppercase tracking-widest font-bold">
            Top 5 Leaderboard
          </div>
          {board.length === 0 ? (
            <div className="px-4 py-4 text-white/30 text-sm text-center">No scores yet — be the first!</div>
          ) : (
            board.map((entry, i) => (
              <div
                key={i}
                className={`lb-row flex items-center justify-between px-4 py-2.5 border-b border-white/5 last:border-0 ${i === 0 ? 'bg-yellow-400/5' : ''}`}
                style={{ opacity: 0 }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{['🥇', '🥈', '🥉', '4️⃣', '5️⃣'][i]}</span>
                  <span className="font-black text-white tracking-widest">{entry.initials}</span>
                </div>
                <span className={`font-bold tabular-nums ${i === 0 ? 'text-yellow-300' : 'text-white/70'}`}>
                  {entry.score.toLocaleString()}
                </span>
              </div>
            ))
          )}
        </div>

        {/* START button */}
        <button
          ref={startBtnRef}
          onClick={handleStart}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-black text-2xl shadow-[0_0_40px_rgba(168,85,247,0.5)] transition-all active:scale-95"
        >
          🚀 START GAME
        </button>

        {/* Enter to start hint */}
        <p className="text-white/20 text-xs">Press Enter to start</p>

        {/* Reset scores */}
        {board.length > 0 && (
          <button
            onClick={handleClearScores}
            className="text-white/20 hover:text-white/50 text-xs underline transition-colors"
          >
            Reset scores
          </button>
        )}
      </div>
    </div>
  );
}
