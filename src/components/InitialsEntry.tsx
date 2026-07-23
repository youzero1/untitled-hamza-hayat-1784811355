import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { useGamePhase, useFinalScore, returnToTitle } from '@/lib/gamePhase';
import { submitScore, getHighScore } from '@/lib/leaderboard';
import { playSound } from '@/lib/sounds';

export default function InitialsEntry() {
  const phase = useGamePhase();
  const finalScore = useFinalScore();
  const [letters, setLetters] = useState(['A', 'A', 'A']);
  const [active, setActive] = useState(0);
  const overlayRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (phase !== 'entering-initials') return;
    setLetters(['A', 'A', 'A']);
    setActive(0);
    const overlay = overlayRef.current;
    const title = titleRef.current;
    if (!overlay) return;
    gsap.fromTo(overlay, { opacity: 0 }, { opacity: 1, duration: 0.4 });
    if (title) {
      gsap.fromTo(title,
        { scale: 0.5, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.7, ease: 'back.out(3)', delay: 0.2 }
      );
      // Confetti shake
      gsap.fromTo(title,
        { rotate: -5 },
        { rotate: 5, duration: 0.1, yoyo: true, repeat: 8, ease: 'none', delay: 0.8 }
      );
    }
  }, [phase]);

  useEffect(() => {
    if (phase !== 'entering-initials') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') { handleSubmit(); return; }
      if (e.key === 'Backspace') {
        setActive(prev => Math.max(0, prev - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        changeLetter(active, 1); return;
      }
      if (e.key === 'ArrowDown') {
        changeLetter(active, -1); return;
      }
      if (e.key === 'ArrowLeft') {
        setActive(prev => Math.max(0, prev - 1)); return;
      }
      if (e.key === 'ArrowRight' || e.key === 'Tab') {
        e.preventDefault();
        setActive(prev => Math.min(2, prev + 1)); return;
      }
      if (/^[a-zA-Z]$/.test(e.key)) {
        const upper = e.key.toUpperCase();
        setLetters(prev => {
          const next = [...prev];
          next[active] = upper;
          return next;
        });
        setActive(prev => Math.min(2, prev + 1));
        playSound('uiClick');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, active]);

  const changeLetter = (idx: number, dir: number) => {
    setLetters(prev => {
      const next = [...prev];
      const code = next[idx].charCodeAt(0) + dir;
      next[idx] = String.fromCharCode(((code - 65 + 26) % 26) + 65);
      return next;
    });
    playSound('uiClick');
  };

  const handleSubmit = () => {
    const initials = letters.join('');
    submitScore(initials, finalScore);
    playSound('newHighScore');
    returnToTitle();
  };

  const handleSkip = () => {
    playSound('uiClick');
    returnToTitle();
  };

  if (phase !== 'entering-initials') return null;

  const isNewHS = finalScore >= getHighScore();

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[500] flex flex-col items-center justify-center bg-black/85 backdrop-blur-md"
    >
      {/* Glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-yellow-500/15 blur-[120px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-6 max-w-sm w-full px-4">
        {/* Header */}
        <div ref={titleRef} className="text-center">
          <div className="text-5xl mb-2">🏆</div>
          <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-orange-400">
            {isNewHS ? 'NEW HIGH SCORE!' : 'TOP 5!'}
          </h2>
          <p className="text-white/50 text-sm mt-1">Enter your initials</p>
        </div>

        {/* Final score */}
        <div className="text-5xl font-black text-white tabular-nums">
          {finalScore.toLocaleString()}
        </div>

        {/* Letter slots */}
        <div className="flex gap-4">
          {letters.map((letter, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <button
                onClick={() => { changeLetter(i, 1); setActive(i); }}
                className="w-14 h-8 flex items-center justify-center text-white/50 hover:text-white text-2xl transition-colors active:scale-90"
              >
                ▲
              </button>
              <button
                onClick={() => setActive(i)}
                className={`w-16 h-20 rounded-2xl text-4xl font-black border-2 transition-all ${
                  active === i
                    ? 'border-purple-400 bg-purple-900/60 text-white scale-110 shadow-[0_0_20px_rgba(168,85,247,0.5)]'
                    : 'border-white/20 bg-white/5 text-white/80'
                }`}
              >
                {letter}
              </button>
              <button
                onClick={() => { changeLetter(i, -1); setActive(i); }}
                className="w-14 h-8 flex items-center justify-center text-white/50 hover:text-white text-2xl transition-colors active:scale-90"
              >
                ▼
              </button>
            </div>
          ))}
        </div>

        <p className="text-white/30 text-xs">Type letters or use ▲▼ arrows</p>

        {/* Buttons */}
        <div className="flex flex-col gap-3 w-full">
          <button
            onClick={handleSubmit}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-black font-black text-lg transition-all active:scale-95"
          >
            ✅ SUBMIT
          </button>
          <button
            onClick={handleSkip}
            className="w-full py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white font-bold text-sm transition-all"
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}
