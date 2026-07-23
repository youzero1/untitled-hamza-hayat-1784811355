import { useEffect, useRef } from 'react';
import Matter from 'matter-js';
import { useGamePhase } from '@/lib/gamePhase';
import { playSound } from '@/lib/sounds';
import { saveBestStreak } from '@/lib/leaderboard';

export interface AsteroidFieldAPI {
  getNearestAsteroid: () => { x: number; y: number; id: number } | null;
  kickAsteroid: (id: number, impulseX: number, impulseY: number) => void;
  getNearestPowerup: () => { x: number; y: number; id: number; type: string } | null;
  collectPowerup: (id: number) => void;
}

interface Props {
  apiRef: React.MutableRefObject<AsteroidFieldAPI | null>;
}

interface Particle { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; r: number; color: string; }
interface Explosion { x: number; y: number; particles: Particle[]; ring: number; ringMax: number; }
type PowerupBody = Matter.Body & { powerupType?: string; powerupId?: number; };

let globalScore = 0;
let globalLives = 10;
let globalStreak = 0;
let difficultyLevel = 1;
let gameRunning = false;
let slowmoActive = false;
let doubleKickActive = false;
let slowmoTimer: ReturnType<typeof setTimeout> | null = null;
let doubleKickTimer: ReturnType<typeof setTimeout> | null = null;

export function resetGameState() {
  globalScore = 0;
  globalLives = 10;
  globalStreak = 0;
  difficultyLevel = 1;
  gameRunning = false;
  slowmoActive = false;
  doubleKickActive = false;
}

export default function AsteroidField({ apiRef }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const phase = useGamePhase();
  const phaseRef = useRef(phase);

  useEffect(() => { phaseRef.current = phase; }, [phase]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = Matter.Engine.create({ gravity: { x: 0, y: slowmoActive ? 0.2 : 0.8 } });
    const world = engine.world;
    const runner = Matter.Runner.create();

    let W = window.innerWidth;
    let H = window.innerHeight;
    canvas.width = W;
    canvas.height = H;

    const ctx = canvas.getContext('2d')!;

    // Ground sensor (invisible)
    const ground = Matter.Bodies.rectangle(W / 2, H + 30, W * 2, 60, { isStatic: true, isSensor: true, label: 'ground' });
    const wallL = Matter.Bodies.rectangle(-30, H / 2, 60, H * 2, { isStatic: true });
    const wallR = Matter.Bodies.rectangle(W + 30, H / 2, 60, H * 2, { isStatic: true });
    Matter.Composite.add(world, [ground, wallL, wallR]);

    const asteroids: Matter.Body[] = [];
    const powerups: PowerupBody[] = [];
    const explosions: Explosion[] = [];
    const trails: Map<number, { x: number; y: number; life: number }[]> = new Map();
    let powerupIdCounter = 0;

    // Score/lives local copies (sync with globals)
    let score = globalScore;
    let lives = globalLives;
    let streak = globalStreak;
    let level = difficultyLevel;
    let lastDiffTime = Date.now();

    function spawnAsteroid(decorative = false) {
      const r = decorative ? 15 + Math.random() * 20 : 12 + Math.random() * 28 * Math.min(level * 0.3 + 1, 3);
      const x = 60 + Math.random() * (W - 120);
      const vx = (Math.random() - 0.5) * 4 * level;
      const vy = (1 + Math.random() * 2) * (slowmoActive ? 0.3 : 1);
      const body = Matter.Bodies.circle(x, -r - 10, r, {
        restitution: 0.4,
        friction: 0.1,
        frictionAir: 0.005,
        label: decorative ? 'asteroid-deco' : 'asteroid',
      });
      Matter.Body.setVelocity(body, { x: vx, y: vy });
      Matter.Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.1);
      Matter.Composite.add(world, body);
      asteroids.push(body);
      trails.set(body.id, []);
      return body;
    }

    function spawnPowerup() {
      const type = Math.random() < 0.5 ? 'slowmo' : 'doublekick';
      const x = 80 + Math.random() * (W - 160);
      const body = Matter.Bodies.circle(x, -20, 16, {
        restitution: 0.3,
        frictionAir: 0.01,
        label: 'powerup',
        isSensor: false,
      }) as PowerupBody;
      body.powerupType = type;
      body.powerupId = powerupIdCounter++;
      Matter.Body.setVelocity(body, { x: (Math.random() - 0.5) * 2, y: 1.5 });
      Matter.Composite.add(world, body);
      powerups.push(body);
    }

    function triggerExplosion(x: number, y: number) {
      const particles: Particle[] = [];
      const count = 32;
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const speed = 3 + Math.random() * 8;
        const colors = ['#ff6600', '#ff3300', '#ffaa00', '#ffdd00', '#ff0000'];
        particles.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 3,
          life: 1,
          maxLife: 1,
          r: 3 + Math.random() * 6,
          color: colors[Math.floor(Math.random() * colors.length)],
        });
      }
      explosions.push({ x, y, particles, ring: 0, ringMax: 120 });
    }

    // API
    apiRef.current = {
      getNearestAsteroid: () => {
        let best: Matter.Body | null = null;
        let bestDist = Infinity;
        for (const b of asteroids) {
          if (b.position.y < 0 || b.position.y > H + 100) continue;
          const d = Math.hypot(b.position.x - W / 2, b.position.y);
          if (d < bestDist) { bestDist = d; best = b; }
        }
        if (!best) return null;
        return { x: best.position.x, y: best.position.y, id: best.id };
      },
      kickAsteroid: (id, impulseX, impulseY) => {
        const b = asteroids.find(a => a.id === id);
        if (!b) return;
        const mass = b.mass;
        const mult = doubleKickActive ? 2 : 1;
        Matter.Body.applyForce(b, b.position, { x: impulseX * mass * mult, y: impulseY * mass * mult });
        const pts = doubleKickActive ? 20 : 10;
        score += pts;
        streak++;
        globalScore = score;
        globalStreak = streak;
        saveBestStreak(streak);
        window.dispatchEvent(new CustomEvent('asteroid:save', { detail: { score, streak, doubleKick: doubleKickActive } }));
        playSound('faah');
      },
      getNearestPowerup: () => {
        if (powerups.length === 0) return null;
        let best: PowerupBody | null = null;
        let bestDist = Infinity;
        for (const p of powerups) {
          if (p.position.y < 0 || p.position.y > H + 50) continue;
          const d = Math.hypot(p.position.x - W / 2, p.position.y);
          if (d < bestDist) { bestDist = d; best = p; }
        }
        if (!best) return null;
        return { x: best.position.x, y: best.position.y, id: best.powerupId!, type: best.powerupType! };
      },
      collectPowerup: (id) => {
        const idx = powerups.findIndex(p => p.powerupId === id);
        if (idx === -1) return;
        const p = powerups[idx];
        const type = p.powerupType!;
        Matter.Composite.remove(world, p);
        powerups.splice(idx, 1);
        if (type === 'slowmo') {
          slowmoActive = true;
          engine.gravity.y = 0.2;
          playSound('slowmoPickup');
          if (slowmoTimer) clearTimeout(slowmoTimer);
          slowmoTimer = setTimeout(() => {
            slowmoActive = false;
            engine.gravity.y = 0.8;
            playSound('powerupExpire');
            window.dispatchEvent(new CustomEvent('powerup:expire', { detail: 'slowmo' }));
          }, 6000);
          window.dispatchEvent(new CustomEvent('powerup:collected', { detail: { type: 'slowmo', duration: 6000 } }));
        } else {
          doubleKickActive = true;
          playSound('doubleKickPickup');
          if (doubleKickTimer) clearTimeout(doubleKickTimer);
          doubleKickTimer = setTimeout(() => {
            doubleKickActive = false;
            playSound('powerupExpire');
            window.dispatchEvent(new CustomEvent('powerup:expire', { detail: 'doublekick' }));
          }, 8000);
          window.dispatchEvent(new CustomEvent('powerup:collected', { detail: { type: 'doublekick', duration: 8000 } }));
        }
      },
    };

    // Ground collision — asteroid hits ground
    Matter.Events.on(engine, 'collisionStart', (e: Matter.IEventCollision<Matter.Engine>) => {
      for (const pair of e.pairs) {
        const { bodyA, bodyB } = pair;
        const asteroid = bodyA.label === 'ground' ? bodyB : bodyB.label === 'ground' ? bodyA : null;
        if (!asteroid) continue;
        if (asteroid.label === 'asteroid-deco') {
          // decorative: just remove
          const idx = asteroids.indexOf(asteroid);
          if (idx !== -1) { Matter.Composite.remove(world, asteroid); asteroids.splice(idx, 1); }
          continue;
        }
        if (asteroid.label !== 'asteroid') continue;
        const idx = asteroids.indexOf(asteroid);
        if (idx !== -1) {
          triggerExplosion(asteroid.position.x, H - 10);
          Matter.Composite.remove(world, asteroid);
          asteroids.splice(idx, 1);
          trails.delete(asteroid.id);
          if (phaseRef.current === 'playing') {
            lives--;
            streak = 0;
            globalLives = lives;
            globalStreak = 0;
            playSound('asteroidLost');
            if (lives <= 3 && lives > 0) playSound('lifeWarning');
            window.dispatchEvent(new CustomEvent('asteroid:lost', { detail: { lives, score } }));
            if (lives <= 0) {
              gameRunning = false;
              playSound('gameOver');
              setTimeout(() => {
                import('@/lib/gamePhase').then(({ endGame }) => endGame(score));
              }, 800);
            }
          }
        }
      }
    });

    // Spawn timers
    let spawnTimer = 0;
    let powerupTimer = 0;

    // Initial spawn for decorative title
    let decoSpawned = false;

    // Run physics
    Matter.Runner.run(runner, engine);

    // Resize
    const onResize = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W;
      canvas.height = H;
      Matter.Body.setPosition(ground, { x: W / 2, y: H + 30 });
    };
    window.addEventListener('resize', onResize);

    // Game state sync
    const onReset = () => {
      score = 0; lives = 10; streak = 0; level = 1;
      globalScore = 0; globalLives = 10; globalStreak = 0; difficultyLevel = 1;
      lastDiffTime = Date.now();
      slowmoActive = false; doubleKickActive = false;
      engine.gravity.y = 0.8;
      // Remove all existing asteroids
      for (const b of [...asteroids]) { Matter.Composite.remove(world, b); }
      asteroids.length = 0;
      for (const p of [...powerups]) { Matter.Composite.remove(world, p); }
      powerups.length = 0;
      explosions.length = 0;
      trails.clear();
      gameRunning = true;
      decoSpawned = false;
    };
    window.addEventListener('game:reset', onReset);

    const onPhase = (e: Event) => {
      const p = (e as CustomEvent<string>).detail;
      if (p === 'playing') {
        score = 0; lives = 10; streak = 0; level = 1;
        globalScore = 0; globalLives = 10; globalStreak = 0; difficultyLevel = 1;
        lastDiffTime = Date.now();
        gameRunning = true;
        for (const b of [...asteroids]) { Matter.Composite.remove(world, b); }
        asteroids.length = 0;
        for (const pu of [...powerups]) { Matter.Composite.remove(world, pu); }
        powerups.length = 0;
        explosions.length = 0;
        trails.clear();
      } else {
        gameRunning = false;
      }
    };
    window.addEventListener('game:phase', onPhase);

    // ---- DRAW LOOP ----
    let animId = 0;
    let lastTime = 0;

    const drawAsteroid = (b: Matter.Body, deco = false) => {
      const { x, y } = b.position;
      const r = (b as any).circleRadius as number || 20;
      const angle = b.angle;

      // Trail
      const trail = trails.get(b.id);
      if (trail) {
        trail.push({ x, y, life: 1 });
        if (trail.length > 20) trail.shift();
        trail.forEach((t, i) => {
          t.life -= 0.04;
          const alpha = t.life * (deco ? 0.3 : 0.7) * (i / trail.length);
          const tColor = slowmoActive ? `rgba(100,200,255,${alpha})` : `rgba(255,${100 + i * 5},0,${alpha})`;
          ctx.beginPath();
          ctx.arc(t.x, t.y, r * 0.5 * (i / trail.length), 0, Math.PI * 2);
          ctx.fillStyle = tColor;
          ctx.fill();
        });
      }

      // Glow
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r * 2.5);
      const glowColor = deco ? 'rgba(100,150,255,' : 'rgba(255,80,0,';
      grad.addColorStop(0, glowColor + (deco ? '0.15)' : '0.25)'));
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.beginPath();
      ctx.arc(x, y, r * 2.5, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      // Rock body
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.beginPath();
      const sides = 7;
      for (let i = 0; i < sides; i++) {
        const a = (i / sides) * Math.PI * 2;
        const jitter = 0.7 + Math.sin(b.id * (i + 1) * 0.7) * 0.3;
        const rx = Math.cos(a) * r * jitter;
        const ry = Math.sin(a) * r * jitter;
        i === 0 ? ctx.moveTo(rx, ry) : ctx.lineTo(rx, ry);
      }
      ctx.closePath();
      const rockGrad = ctx.createRadialGradient(0, -r * 0.3, 0, 0, 0, r);
      rockGrad.addColorStop(0, deco ? '#6699cc' : '#cc4400');
      rockGrad.addColorStop(0.6, deco ? '#334466' : '#661100');
      rockGrad.addColorStop(1, deco ? '#112233' : '#330000');
      ctx.fillStyle = rockGrad;
      ctx.fill();
      ctx.strokeStyle = deco ? 'rgba(100,150,200,0.4)' : 'rgba(255,100,0,0.6)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // Crater details
      ctx.beginPath();
      ctx.arc(-r * 0.25, -r * 0.15, r * 0.2, 0, Math.PI * 2);
      ctx.strokeStyle = deco ? 'rgba(180,210,255,0.3)' : 'rgba(255,150,50,0.4)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    };

    const drawPowerup = (b: PowerupBody) => {
      const { x, y } = b.position;
      const isSlowmo = b.powerupType === 'slowmo';
      const t = Date.now() / 800;
      const pulse = 1 + Math.sin(t) * 0.15;
      const r = 16 * pulse;

      const grad = ctx.createRadialGradient(x, y, 0, x, y, r * 2);
      grad.addColorStop(0, isSlowmo ? 'rgba(0,200,255,0.9)' : 'rgba(255,220,0,0.9)');
      grad.addColorStop(0.5, isSlowmo ? 'rgba(0,100,255,0.4)' : 'rgba(255,120,0,0.4)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.beginPath();
      ctx.arc(x, y, r * 2, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(b.angle);
      // Diamond shape
      ctx.beginPath();
      ctx.moveTo(0, -r); ctx.lineTo(r * 0.6, 0);
      ctx.lineTo(0, r); ctx.lineTo(-r * 0.6, 0);
      ctx.closePath();
      ctx.fillStyle = isSlowmo ? '#00ccff' : '#ffcc00';
      ctx.fill();
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = 'white';
      ctx.font = `bold ${Math.floor(r * 0.9)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(isSlowmo ? '❄' : '⚡', 0, 0);
      ctx.restore();
    };

    const drawExplosions = () => {
      for (let ei = explosions.length - 1; ei >= 0; ei--) {
        const ex = explosions[ei];
        // Ring
        if (ex.ring < ex.ringMax) {
          ex.ring += 4;
          const alpha = 1 - ex.ring / ex.ringMax;
          ctx.beginPath();
          ctx.arc(ex.x, ex.y, ex.ring, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(255,150,0,${alpha * 0.7})`;
          ctx.lineWidth = 3;
          ctx.stroke();
        }
        // Particles
        let alive = false;
        for (const p of ex.particles) {
          p.x += p.vx; p.y += p.vy;
          p.vy += 0.3;
          p.vx *= 0.96; p.vy *= 0.96;
          p.life -= 0.025;
          if (p.life > 0) {
            alive = true;
            ctx.save();
            ctx.globalAlpha = p.life;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 10;
            ctx.fill();
            ctx.restore();
          }
        }
        if (!alive && ex.ring >= ex.ringMax) {
          explosions.splice(ei, 1);
        }
      }
    };

    const animate = (time: number) => {
      animId = requestAnimationFrame(animate);
      const dt = Math.min((time - lastTime) / 16.67, 3);
      lastTime = time;

      ctx.clearRect(0, 0, W, H);

      const currentPhase = phaseRef.current;

      // Difficulty ramp
      if (currentPhase === 'playing' && gameRunning) {
        const elapsed = (Date.now() - lastDiffTime) / 1000;
        if (elapsed > 20 && level < 10) {
          level++;
          difficultyLevel = level;
          lastDiffTime = Date.now();
          window.dispatchEvent(new CustomEvent('game:difficulty', { detail: level }));
        }
      }

      // Spawn
      if (currentPhase === 'playing' && gameRunning) {
        const spawnInterval = Math.max(60 - level * 4, 20);
        spawnTimer++;
        if (spawnTimer > spawnInterval && asteroids.length < 14 + level * 2) {
          spawnTimer = 0;
          spawnAsteroid(false);
        }
        powerupTimer++;
        if (powerupTimer > 300 && powerups.length < 2) {
          powerupTimer = 0;
          spawnPowerup();
        }
      } else if (currentPhase === 'title') {
        // Decorative slow rain
        spawnTimer++;
        if (spawnTimer > 90 && asteroids.length < 8) {
          spawnTimer = 0;
          const b = spawnAsteroid(true);
          // Override to deco label
          (b as any).label = 'asteroid-deco';
        }
      }

      // Remove off-screen
      for (let i = asteroids.length - 1; i >= 0; i--) {
        const b = asteroids[i];
        if (b.position.y > H + 80 || b.position.x < -100 || b.position.x > W + 100) {
          trails.delete(b.id);
          Matter.Composite.remove(world, b);
          asteroids.splice(i, 1);
        }
      }
      for (let i = powerups.length - 1; i >= 0; i--) {
        const p = powerups[i];
        if (p.position.y > H + 80) {
          Matter.Composite.remove(world, p);
          powerups.splice(i, 1);
        }
      }

      // Draw decorative asteroids with opacity
      for (const b of asteroids) {
        const deco = (b as any).label === 'asteroid-deco';
        ctx.save();
        if (deco) ctx.globalAlpha = 0.4;
        drawAsteroid(b, deco);
        ctx.restore();
      }

      // Draw powerups
      for (const p of powerups) drawPowerup(p);

      // Draw explosions
      drawExplosions();

      // Update API with fresh positions
      // (API reads directly from live arrays)
      void dt;
    };

    animId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animId);
      Matter.Runner.stop(runner);
      Matter.Engine.clear(engine);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('game:reset', onReset);
      window.removeEventListener('game:phase', onPhase);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[10]"
      style={{ width: '100%', height: '100%' }}
    />
  );
}
