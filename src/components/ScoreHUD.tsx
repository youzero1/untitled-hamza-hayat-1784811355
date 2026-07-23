import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { useGamePhase, startGame, returnToTitle } from '@/lib/gamePhase';
import { getHighScore, getBestStreak } from '@/lib/leaderboard';
import { playSound } from '@/lib/sounds';

interface PowerupState {
  type: string;
  endsAt: number;
}

export default function ScoreHUD() {
  const phase = useGamePhase();
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(10);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(getBestStreak());
  const [highScore, setHighScore] = useState(getHighScore());
  const [level, setLevel] = useState(1);
  const [powerups, setPowerups] = useState<PowerupState[]>([]);
  const [newHS, setNewHS] = useState(false);
  const [scoreFlash, setScoreFlash] = useState(false);
  const [lifeFlash, setLifeFlash] = useState<'good' | 'bad' | null>(null);

  const hudRef = useRef<HTMLDivElement>(null);
  const newHSRef = useRef<HTMLDivElement>(null);

  // Show/hide HUD
  useEffect(() => {
    if (!hudRef.current) return;
    if (phase === 'playing' || phase === 'gameover') {
      gsap.to(hudRef.current, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' });
    } else {
      gsap.to(hudRef.current, { opacity: 0, y: -20, duration: 0.3 });
    }
  }, [phase]);

  // New HS banner
  useEffect(() => {
    if (!newHS || !newHSRef.current) return;
    gsap.fromTo(newHSRef.current,
      { y: -80, opacity: 0, scale: 0.8 },
      { y: 0, opacity: 1, scale: 1, duration: 0.6, ease: 'back.out(2)' }
    );
    const t = setTimeout(() => {
      gsap.to(newHSRef.current, { y: -80, opacity: 0, duration: 0.5, onComplete: () => setNewHS(false) });
    }, 3000);
    return () => clearTimeout(t);
  }, [newHS]);

  useEffect(() => {
    const onSave = (e: Event) => {
      const { score: s, streak: st, doubleKick } = (e as CustomEvent).detail;
      setScore(s);
      setStreak(st);
      setScoreFlash(true);
      setTimeout(() => setScoreFlash(false), 300);
      setLifeFlash('good');
      setTimeout(() => setLifeFlash(null), 300);
      // Check high score
      const hs = getHighScore();
      if (s > hs) {
        setHighScore(s);
        setNewHS(true);
        playSound('newHighScore');
      }
      if (st > getBestStreak()) setBestStreak(st);
      if (doubleKick) { /* double kick visual already from powerup */ }
    };

    const onLost = (e: Event) => {
      const { lives: l, score: s } = (e as CustomEvent).detail;
      setLives(l);
      setScore(s);
      setStreak(0);
      setLifeFlash('bad');
      setTimeout(() => setLifeFlash(null), 400);
    };

    const onDifficulty = (e: Event) => {
      setLevel((e as CustomEvent<number>).detail);
    };

    const onPowerup = (e: Event) => {
      const { type, duration } = (e as CustomEvent).detail;
      const endsAt = Date.now() + duration;
      setPowerups(prev => {
        const filtered = prev.filter(p => p.type !== type);
        return [...filtered, { type, endsAt }];
      });
    };

    const onExpire = (e: Event) => {
      const type = (e as CustomEvent<string>).detail;
      setPowerups(prev => prev.filter(p => p.type !== type));
    };

    const onPhase = (e: Event) => {
      const p = (e as CustomEvent<string>).detail;
      if (p === 'playing') {
        setScore(0); setLives(10); setStreak(0); setLevel(1); setPowerups([]);
        setHighScore(getHighScore()); setBestStreak(getBestStreak());
      }
    };

    window.addEventListener('asteroid:save', onSave);
    window.addEventListener('asteroid:lost', onLost);
    window.addEventListener('game:difficulty', onDifficulty);
    window.addEventListener('powerup:collected', onPowerup);
    window.addEventListener('powerup:expire', onExpire);
    window.addEventListener('game:phase', onPhase);

    return () => {
      window.removeEventListener('asteroid:save', onSave);
      window.removeEventListener('asteroid:lost', onLost);
      window.removeEventListener('game:difficulty', onDifficulty);
      window.removeEventListener('powerup:collected', onPowerup);
      window.removeEventListener('powerup:expire', onExpire);
      window.removeEventListener('game:phase', onPhase);
    };
  }, []);

  const hearts = Array.from({ length: 10 }, (_, i) => i < lives);

  return (
    <>
      {/* Main HUD */}
      <div ref={hudRef} className="pointer-events-none fixed top-0 left-0 right-0 z-[200] opacity-0 -translate-y-4">
        {/* Top bar */}
        <div className="flex items-start justify-between px-4 pt-3 gap-4">
          {/* Left: score + streak */}
          <div className="bg-black/60 backdrop-blur border border-white/10 rounded-2xl px-5 py-3 min-w-[160px]">
            <div className={`text-3xl font-black tabular-nums transition-colors duration-150 ${scoreFlash ? 'text-yellow-300' : 'text-white'}`}>
              {score.toLocaleString()}
            </div>
            <div className="text-xs text-white/40 uppercase tracking-widest mt-0.5">Score</div>
            {streak > 0 && (
              <div className="mt-1.5 flex items-center gap-1.5">
                <span className="text-orange-400 text-xs font-bold">🔥 {streak} streak</span>
                {streak >= 10 && <span className="text-xs">🔥🔥🔥</span>}
                {streak >= 5 && streak < 10 && <span className="text-xs">🔥🔥</span>}
              </div>
            )}
          </div>

          {/* Center: lives */}
          <div className={`bg-black/60 backdrop-blur border rounded-2xl px-4 py-3 transition-colors duration-200 ${lifeFlash === 'bad' ? 'border-red-500' : lifeFlash === 'good' ? 'border-green-500' : 'border-white/10'}`}>
            <div className="text-xs text-white/40 uppercase tracking-widest mb-1.5 text-center">Lives</div>
            <div className="flex flex-wrap gap-1 justify-center max-w-[200px]">
              {hearts.map((alive, i) => (
                <span key={i} className={`text-base transition-all duration-200 ${alive ? 'opacity-100' : 'opacity-20 grayscale'}`}>
                  {alive ? '❤️' : '🖤'}
                </span>
              ))}
            </div>
          </div>

          {/* Right: level + best */}
          <div className="bg-black/60 backdrop-blur border border-white/10 rounded-2xl px-5 py-3 min-w-[140px] text-right">
            <div className="text-white/40 text-xs uppercase tracking-widest">Best</div>
            <div className="text-lg font-bold text-purple-300">{highScore.toLocaleString()}</div>
            <div className="text-white/40 text-xs mt-1 uppercase tracking-widest">Lv {level}</div>
            <div className="h-1.5 rounded-full bg-white/10 mt-1 overflow-hidden w-20 ml-auto">
              <div
                className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
                style={{ width: `${(level / 10) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Power-up badges */}
        {powerups.length > 0 && (
          <div className="flex gap-2 justify-center mt-2">
            {powerups.map(pu => {
              const remaining = Math.max(0, (pu.endsAt - Date.now()) / 1000);
              const total = pu.type === 'slowmo' ? 6 : 8;
              return (
                <div key={pu.type} className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold border backdrop-blur ${pu.type === 'slowmo' ? 'bg-cyan-900/60 border-cyan-400 text-cyan-300' : 'bg-yellow-900/60 border-yellow-400 text-yellow-300'}`}>
                  <span>{pu.type === 'slowmo' ? '❄️ SLOW-MO' : '⚡ DOUBLE KICK'}</span>
                  <div className="w-16 h-1.5 rounded-full bg-white/20 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${pu.type === 'slowmo' ? 'bg-cyan-400' : 'bg-yellow-400'}`}
                      style={{ width: `${(remaining / total) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Menu button (pointer-events back on) */}
        <div className="pointer-events-auto absolute top-3 right-4 flex gap-2" style={{ right: '200px' }}>
          <button
            onClick={() => { playSound('uiClick'); returnToTitle(); }}
            className="text-white/30 hover:text-white/70 text-xs uppercase tracking-widest transition-colors px-2 py-1"
          >
            ⌂ Menu
          </button>
        </div>
      </div>

      {/* Game Over overlay */}
      {phase === 'gameover' && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-gray-900 border border-white/10 rounded-3xl p-10 text-center max-w-sm w-full mx-4 shadow-2xl">
            <div className="text-6xl mb-4">💥</div>
            <h2 className="text-4xl font-black text-white mb-2">GAME OVER</h2>
            <p className="text-white/50 mb-6 text-sm">The asteroids won this time</p>
            <div className="grid grid-cols-2 gap-4 mb-8 text-center">
              <div className="bg-white/5 rounded-xl p-3">
                <div className="text-2xl font-black text-white">{score.toLocaleString()}</div>
                <div className="text-white/40 text-xs mt-0.5">Final Score</div>
              </div>
              <div className="bg-white/5 rounded-xl p-3">
                <div className="text-2xl font-black text-purple-300">{highScore.toLocaleString()}</div>
                <div className="text-white/40 text-xs mt-0.5">Best Score</div>
              </div>
              <div className="bg-white/5 rounded-xl p-3">
                <div className="text-2xl font-black text-orange-400">{bestStreak}</div>
                <div className="text-white/40 text-xs mt-0.5">Best Streak</div>
              </div>
              <div className="bg-white/5 rounded-xl p-3">
                <div className="text-2xl font-black text-cyan-400">{level}</div>
                <div className="text-white/40 text-xs mt-0.5">Level Reached</div>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => { playSound('uiClick'); startGame(); }}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-black text-lg hover:from-purple-500 hover:to-pink-500 transition-all active:scale-95"
              >
                🚀 PLAY AGAIN
              </button>
              <button
                onClick={() => { playSound('uiClick'); returnToTitle(); }}
                className="w-full py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white font-bold text-sm transition-all"
              >
                ⌂ Main Menu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New High Score banner */}
      {newHS && (
        <div ref={newHSRef} className="pointer-events-none fixed top-24 left-1/2 -translate-x-1/2 z-[400]">
          <div className="bg-gradient-to-r from-yellow-400 to-orange-400 text-black font-black text-2xl px-8 py-3 rounded-2xl shadow-2xl whitespace-nowrap">
            🏆 NEW HIGH SCORE! 🏆
          </div>
        </div>
      )}
    </>
  );
}
