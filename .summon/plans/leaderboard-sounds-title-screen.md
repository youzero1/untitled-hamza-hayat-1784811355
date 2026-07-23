---
status: pending
title: Leaderboard, Power-Up Sounds, and Title Screen
---

# Overview

Add three arcade-game polish features on top of the existing asteroid-catching mini-game:

1. A **top-5 local leaderboard** with player initials, saved between visits.
2. **Distinct sound effects** for slow-mo pickup, double-kick pickup, power-up expiry, asteroid loss, and life-lost warning.
3. A **title / start screen** that gates gameplay until the player clicks "START", with game rules, best score, and top-5 leaderboard preview.

The game should flow: **Title Screen → Playing → Game Over → (enter initials if top 5) → back to Title Screen**.

---

## Step 1 — Confirm baseline files exist and wire them into Home

Before adding new features, verify the existing game files are present and wired in:

- `src/components/AsteroidField.tsx` — physics/asteroids/power-ups/explosions
- `src/components/ScoreHUD.tsx` — score, streak, lives, power-up badges, restart, game over screen
- `src/components/Astronaut.tsx` — 3D character chasing asteroids/cursor/power-ups

If any are missing, restore them from the prior implementation. Then ensure `src/pages/Home.tsx` renders `<AsteroidField />` and `<ScoreHUD />` alongside `<Astronaut />`.

**Expected outcome:** The current game runs end-to-end (asteroids fall, character kicks them, lives deplete, game over shows, restart works) before layering new features on top.

---

## Step 2 — Introduce a shared game-state layer

Create `src/lib/gameState.ts` as the single source of truth for game phase and cross-component events.

Responsibilities:
- Export a small event bus (using `window` custom events, matching the existing pattern already used for `asteroid:save`, `asteroid:lost`, `game:reset`, `powerup:collected`).
- Define new event names: `game:start`, `game:over`, `game:submitScore`, `sound:play`.
- Define a `GamePhase` type: `'title' | 'playing' | 'gameover' | 'entering-initials'`.
- Provide a `useGamePhase()` hook that subscribes to phase-change events and returns the current phase.
- Provide helper functions `startGame()`, `endGame(finalScore)`, `returnToTitle()` that dispatch the correct events.

**Expected outcome:** Any component can read the current phase and dispatch transitions without prop drilling.

---

## Step 3 — Gate AsteroidField and Astronaut behavior on game phase

Update `src/components/AsteroidField.tsx`:
- Subscribe to `useGamePhase()`.
- Only spawn asteroids/power-ups when phase is `'playing'`.
- On `'title'` phase: spawn a slow, decorative rain of asteroids in the background at half opacity (no collisions with lives, no scoring) so the title screen still feels alive.
- On `'gameover'` and `'entering-initials'`: freeze spawning but let existing asteroids finish falling.

Update `src/components/Astronaut.tsx`:
- Subscribe to `useGamePhase()`.
- On `'title'`: character idles center-screen doing a slow bob + occasional wave, no chasing.
- On `'playing'`: current chase-and-kick behavior.
- On `'gameover'` / `'entering-initials'`: character sits down / slumps (scale-down + rotate slightly), no chasing.

**Expected outcome:** The game world reacts to phase changes; the title screen has ambient motion without gameplay logic firing.

---

## Step 4 — Build the Title Screen component

Create `src/components/TitleScreen.tsx`.

Contents (top to bottom, centered overlay):
- Large animated game title: "ASTRO KICKER" (or reuse existing brand) with GSAP letter-reveal on mount.
- One-line tagline: "Kick the asteroids. Save the planet. Don't miss."
- **How to play** panel (3 icons in a row): move mouse to guide hero → hero auto-kicks asteroids → grab blue for slow-mo, yellow for double-kick.
- **Best score** display (reads `astro-kicker-highscore` from localStorage).
- **Top 5 leaderboard preview** — rank, initials, score (reads from localStorage; shows "No scores yet" if empty).
- Big pulsing **START** button — on click, dispatches `game:start` and hides the overlay.
- Small "Reset scores" text link at the bottom that clears the leaderboard after a confirm dialog.

Styling: full-screen fixed overlay, dark translucent backdrop with existing purple/pink glow accents, blur backdrop, high z-index above game canvas but below any modal.

Animations (GSAP):
- Title letters staggered rise-in on mount.
- START button gentle scale-pulse loop.
- Leaderboard rows fade-in staggered.
- Overlay fades and scales out when START is pressed.

**Expected outcome:** On first load and after each game over, the player sees a polished title screen and must click START to play.

---

## Step 5 — Build the Initials Entry screen

Create `src/components/InitialsEntry.tsx`.

Shown only when the final score qualifies for the top 5. Layout:
- "NEW HIGH SCORE!" heading with confetti-style GSAP animation.
- Final score displayed large.
- Three big letter slots (A–Z), each with up/down chevron buttons and keyboard support (letter keys type into the active slot, arrow keys change letters, Tab/Enter moves to next slot).
- **SUBMIT** button — dispatches `game:submitScore` with `{ initials, score }`, then transitions to title screen.
- **SKIP** button — transitions to title screen without saving.

**Expected outcome:** After a qualifying game over, the player can enter three initials and see their score in the leaderboard.

---

## Step 6 — Leaderboard storage and logic

Create `src/lib/leaderboard.ts`.

Responsibilities:
- Type: `LeaderboardEntry = { initials: string; score: number; date: string }`.
- `getLeaderboard(): LeaderboardEntry[]` — reads `astro-kicker-leaderboard` from localStorage, returns array (empty if none), sorted desc by score, capped at 5.
- `qualifiesForLeaderboard(score: number): boolean` — true if leaderboard has < 5 entries OR score beats the 5th place.
- `submitScore(initials, score)` — inserts, resorts, trims to 5, writes back to localStorage.
- `clearLeaderboard()` — wipes storage.

Integrate:
- In `ScoreHUD.tsx` (or a new small `GameOverController.tsx`): when game ends, check `qualifiesForLeaderboard(finalScore)`. If yes → set phase to `'entering-initials'`. If no → keep phase `'gameover'` with existing game-over card.
- After initials submitted or skipped → return to `'title'`.

**Expected outcome:** Top 5 scores persist across sessions and are visible on the title screen.

---

## Step 7 — Update ScoreHUD for the new flow

Update `src/components/ScoreHUD.tsx`:
- Hide the entire HUD (score/streak/lives/power-ups/restart) when phase is `'title'` or `'entering-initials'`.
- Keep visible during `'playing'` and `'gameover'`.
- Replace the existing "PLAY AGAIN" button on the game-over card with a "MAIN MENU" button that returns to the title screen (initials entry, if triggered, takes precedence over the game-over card).
- Add a small "Menu" text button next to the existing ⟳ RESTART button so the player can bail to the title screen mid-run.

**Expected outcome:** HUD only appears when it's relevant to the current phase, and the player can always get back to the title.

---

## Step 8 — Sound system

Create `src/lib/sounds.ts`.

Responsibilities:
- One shared `AudioContext` created lazily on first user gesture (the START click will unlock it — no more delay before first sound).
- Named sound generators (all Web Audio synthesis, no external files):
  - `slowmoPickup` — descending shimmer: two sine oscillators sweeping down with a slight reverb-like delay, ~0.4s.
  - `doubleKickPickup` — bright ascending arpeggio: three square-wave notes rising quickly, ~0.3s.
  - `powerupExpire` — soft descending blip, ~0.2s, quieter.
  - `asteroidLost` — low thud + short noise burst simulating a crash, ~0.25s.
  - `lifeWarning` — sharp beep-beep when lives drop to 3, 2, and 1, ~0.15s each.
  - `gameOver` — long descending minor chord, ~1.2s.
  - `uiClick` — short blip for menu buttons.
  - Keep existing `faaaaah` kick sound already implemented in Astronaut for asteroid kicks.
- Export `playSound(name: SoundName)` function.
- Subscribe to `sound:play` events on `window` so any component can trigger sounds without importing the module directly.

Trigger points:
- In `AsteroidField.tsx`: when an asteroid hits the ground → play `asteroidLost`. When a power-up is collected → play `slowmoPickup` or `doubleKickPickup`. When a power-up expires → play `powerupExpire`.
- In `ScoreHUD.tsx`: when lives transition to 3, 2, 1 → play `lifeWarning`. When lives reach 0 → play `gameOver`.
- In `TitleScreen.tsx` and `InitialsEntry.tsx`: on button clicks → play `uiClick`.

**Expected outcome:** Every meaningful game event has audible feedback that matches its feel.

---

## Step 9 — Wire everything into Home

Update `src/pages/Home.tsx` to render, in this stacking order (back to front):
- Background glow divs (existing).
- `<AsteroidField />` — always mounted, behavior changes by phase.
- `<Astronaut />` — always mounted, behavior changes by phase.
- Landing page sections: `<Navbar />`, `<Hero />`, `<Features />`, `<Showcase />`, `<CTA />`, `<Footer />` — always visible, but the game overlays sit above them via fixed positioning.
- `<ScoreHUD />` — visible during play/gameover.
- `<TitleScreen />` — visible during title phase.
- `<InitialsEntry />` — visible during initials-entry phase.

Initial phase on page load: `'title'`.

**Expected outcome:** Player lands on the site, sees the marketing sections behind a title screen overlay with ambient asteroids and a bobbing astronaut, clicks START, plays, dies, optionally enters initials, and returns to the title screen.

---

## Step 10 — Polish pass

- Ensure no gameplay events fire during `'title'` (no score changes, no life loss from the decorative asteroids).
- Confirm keyboard accessibility on Title Screen (Enter starts game) and Initials Entry (letter keys + arrows + Enter to submit).
- Confirm localStorage keys don't collide: `astro-kicker-highscore`, `astro-kicker-leaderboard`, `astro-kicker-beststreak`.
- Verify `npm run typecheck` passes.
- Save with message: `feat: title screen, leaderboard, and full sound design`.

**Expected outcome:** A cohesive arcade experience from first landing to repeat plays, with persistent progress and full audio feedback.
