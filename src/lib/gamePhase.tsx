import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';

export type GamePhase = 'title' | 'playing' | 'gameover' | 'entering-initials';

// ---- event bus ----
export function dispatchPhase(phase: GamePhase) {
  window.dispatchEvent(new CustomEvent('game:phase', { detail: phase }));
}
export function dispatchSound(name: string) {
  window.dispatchEvent(new CustomEvent('sound:play', { detail: name }));
}
export function startGame() { dispatchPhase('playing'); }
export function endGame(score: number) {
  window.dispatchEvent(new CustomEvent('game:over', { detail: score }));
}
export function returnToTitle() { dispatchPhase('title'); }

// ---- context ----
const GamePhaseCtx = createContext<GamePhase>('title');
const FinalScoreCtx = createContext<number>(0);

export function GamePhaseProvider({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<GamePhase>('title');
  const [finalScore, setFinalScore] = useState(0);
  const phaseRef = useRef<GamePhase>('title');

  useEffect(() => {
    const onPhase = (e: Event) => {
      const p = (e as CustomEvent<GamePhase>).detail;
      phaseRef.current = p;
      setPhase(p);
    };
    const onOver = (e: Event) => {
      const score = (e as CustomEvent<number>).detail;
      setFinalScore(score);
      // importing leaderboard lazily to avoid circular dep
      import('./leaderboard').then(({ qualifiesForLeaderboard }) => {
        if (qualifiesForLeaderboard(score)) {
          phaseRef.current = 'entering-initials';
          setPhase('entering-initials');
        } else {
          phaseRef.current = 'gameover';
          setPhase('gameover');
        }
      });
    };
    window.addEventListener('game:phase', onPhase);
    window.addEventListener('game:over', onOver);
    return () => {
      window.removeEventListener('game:phase', onPhase);
      window.removeEventListener('game:over', onOver);
    };
  }, []);

  return (
    <GamePhaseCtx.Provider value={phase}>
      <FinalScoreCtx.Provider value={finalScore}>
        {children}
      </FinalScoreCtx.Provider>
    </GamePhaseCtx.Provider>
  );
}

export function useGamePhase() { return useContext(GamePhaseCtx); }
export function useFinalScore() { return useContext(FinalScoreCtx); }
