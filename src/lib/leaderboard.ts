export interface LeaderboardEntry {
  initials: string;
  score: number;
  date: string;
}

const KEY = 'astro-kicker-leaderboard';
const HS_KEY = 'astro-kicker-highscore';
const STREAK_KEY = 'astro-kicker-beststreak';

export function getLeaderboard(): LeaderboardEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr: LeaderboardEntry[] = JSON.parse(raw);
    return arr.sort((a, b) => b.score - a.score).slice(0, 5);
  } catch {
    return [];
  }
}

export function qualifiesForLeaderboard(score: number): boolean {
  if (score <= 0) return false;
  const board = getLeaderboard();
  if (board.length < 5) return true;
  return score > board[board.length - 1].score;
}

export function submitScore(initials: string, score: number): void {
  const board = getLeaderboard();
  board.push({ initials: initials.toUpperCase(), score, date: new Date().toISOString() });
  board.sort((a, b) => b.score - a.score);
  const trimmed = board.slice(0, 5);
  localStorage.setItem(KEY, JSON.stringify(trimmed));
  const hs = parseInt(localStorage.getItem(HS_KEY) || '0', 10);
  if (score > hs) localStorage.setItem(HS_KEY, String(score));
}

export function clearLeaderboard(): void {
  localStorage.removeItem(KEY);
  localStorage.removeItem(HS_KEY);
  localStorage.removeItem(STREAK_KEY);
}

export function getHighScore(): number {
  return parseInt(localStorage.getItem(HS_KEY) || '0', 10);
}

export function getBestStreak(): number {
  return parseInt(localStorage.getItem(STREAK_KEY) || '0', 10);
}

export function saveBestStreak(streak: number): void {
  const current = getBestStreak();
  if (streak > current) localStorage.setItem(STREAK_KEY, String(streak));
}
