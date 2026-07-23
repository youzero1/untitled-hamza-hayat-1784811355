import { useEffect, useRef, useState, Suspense } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as THREE from 'three';
import gsap from 'gsap';
import { useGamePhase } from '@/lib/gamePhase';
import { getAudio } from '@/lib/sounds';
import type { AsteroidFieldAPI } from './AsteroidField';

// ---------- 3D model ----------
function CharacterModel({
  position,
  rotationY,
  scale,
  animState,
}: {
  position: React.MutableRefObject<{ x: number; y: number; z: number }>;
  rotationY: React.MutableRefObject<number>;
  scale: React.MutableRefObject<number>;
  animState: React.MutableRefObject<'idle' | 'run' | 'kick'>;
}) {
  const gltf = useLoader(GLTFLoader, '/models/character.glb');
  const group = useRef<THREE.Group>(null);
  const mixer = useRef<THREE.AnimationMixer | null>(null);
  const walkAction = useRef<THREE.AnimationAction | null>(null);

  useEffect(() => {
    if (!gltf.scene) return;
    gltf.scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        (obj as THREE.Mesh).castShadow = true;
        (obj as THREE.Mesh).receiveShadow = true;
      }
    });
    mixer.current = new THREE.AnimationMixer(gltf.scene);
    if (gltf.animations.length > 0) {
      walkAction.current = mixer.current.clipAction(gltf.animations[0]);
      walkAction.current.play();
      walkAction.current.timeScale = 0;
    }
  }, [gltf]);

  useFrame((_, dt) => {
    if (!group.current) return;
    group.current.position.set(position.current.x, position.current.y, position.current.z);
    group.current.rotation.y = rotationY.current;
    group.current.scale.setScalar(scale.current);
    if (mixer.current && walkAction.current) {
      const target =
        animState.current === 'run' ? 2.5 : animState.current === 'kick' ? 3.5 : 0.6;
      walkAction.current.timeScale += (target - walkAction.current.timeScale) * 0.15;
      mixer.current.update(dt);
    }
  });

  return (
    <group ref={group}>
      <primitive object={gltf.scene} />
    </group>
  );
}

function Scene({
  position,
  rotationY,
  scale,
  animState,
}: {
  position: React.MutableRefObject<{ x: number; y: number; z: number }>;
  rotationY: React.MutableRefObject<number>;
  scale: React.MutableRefObject<number>;
  animState: React.MutableRefObject<'idle' | 'run' | 'kick'>;
}) {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 10, 5]} intensity={1.2} castShadow />
      <pointLight position={[-5, 3, 2]} intensity={0.8} color="#a855f7" />
      <pointLight position={[5, 3, -2]} intensity={0.6} color="#ec4899" />
      <Suspense fallback={null}>
        <CharacterModel position={position} rotationY={rotationY} scale={scale} animState={animState} />
      </Suspense>
    </>
  );
}

// ---------- Main component ----------
export default function Astronaut({ asteroidApi }: { asteroidApi: React.MutableRefObject<AsteroidFieldAPI | null> }) {
  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const powRef = useRef<HTMLDivElement>(null);
  const shadowRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  const phase = useGamePhase();
  const phaseRef = useRef(phase);
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  const mouse = useRef({ x: 0, y: 0 });
  const cursorPos = useRef({ x: 0, y: 0 });
  const cursorVel = useRef({ x: 0, y: 0 });
  const astroScreen = useRef({ x: 0, y: 0 });
  const astro3D = useRef({ x: 0, y: 0, z: 0 });
  const astroRotY = useRef(0);
  const astroScale = useRef(1);
  const animState = useRef<'idle' | 'run' | 'kick'>('idle');
  const kicking = useRef(false);
  const lastKickTime = useRef(0);
  const targetAsteroidId = useRef<number | null>(null);
  const targetPowerupId = useRef<number | null>(null);

  useEffect(() => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    mouse.current = { x: w / 2, y: h / 2 };
    cursorPos.current = { x: w / 2, y: h / 2 };
    astroScreen.current = { x: w / 2 - 200, y: h / 2 };
    const onMove = (e: MouseEvent) => {
      mouse.current.x = e.clientX;
      mouse.current.y = e.clientY;
      getAudio();
    };
    const onClick = () => getAudio();
    window.addEventListener('mousemove', onMove);
    window.addEventListener('click', onClick);
    setReady(true);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('click', onClick);
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    let raf = 0;

    const loop = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const currentPhase = phaseRef.current;

      // Cursor spring
      const cdx = mouse.current.x - cursorPos.current.x;
      const cdy = mouse.current.y - cursorPos.current.y;
      cursorVel.current.x += cdx * 0.15;
      cursorVel.current.y += cdy * 0.15;
      cursorVel.current.x *= 0.75;
      cursorVel.current.y *= 0.75;
      cursorPos.current.x += cursorVel.current.x * 0.25;
      cursorPos.current.y += cursorVel.current.y * 0.25;
      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate(${cursorPos.current.x - 14}px, ${cursorPos.current.y - 14}px)`;
      }

      if (!kicking.current) {
        let targetX: number;
        let targetY: number;

        if (currentPhase === 'playing') {
          // Priority: powerup > asteroid > cursor
          const api = asteroidApi.current;
          const pu = api?.getNearestPowerup();
          const ast = api?.getNearestAsteroid();

          if (pu) {
            // Chase powerup
            targetX = pu.x - 30;
            targetY = pu.y - 60;
            const dist = Math.hypot(pu.x - astroScreen.current.x, pu.y - astroScreen.current.y);
            if (dist < 80) {
              api?.collectPowerup(pu.id);
              targetPowerupId.current = null;
            }
          } else if (ast) {
            // Chase asteroid
            targetX = ast.x - 20;
            targetY = ast.y - 80;
            const dist = Math.hypot(ast.x - astroScreen.current.x, ast.y - astroScreen.current.y);
            const now = performance.now();
            if (dist < 100 && now - lastKickTime.current > 600) {
              lastKickTime.current = now;
              triggerAsteroidKick(ast.id, ast.x, ast.y);
            }
          } else {
            // No asteroids → chase cursor
            const mvx = cursorVel.current.x;
            const mvy = cursorVel.current.y;
            const vmag = Math.hypot(mvx, mvy) || 1;
            targetX = cursorPos.current.x - (mvx / vmag) * 100;
            targetY = cursorPos.current.y - (mvy / vmag) * 40 - 30;
            const dist = Math.hypot(cursorPos.current.x - astroScreen.current.x, cursorPos.current.y - astroScreen.current.y);
            const now = performance.now();
            if (dist < 120 && Math.hypot(cursorVel.current.x, cursorVel.current.y) < 8 && now - lastKickTime.current > 900) {
              lastKickTime.current = now;
              triggerCursorKick();
            }
          }
        } else if (currentPhase === 'title') {
          // Idle bob at center
          const t = performance.now() / 1200;
          targetX = w / 2 + Math.sin(t * 0.7) * 60;
          targetY = h / 2 + Math.sin(t) * 20 - 80;
        } else {
          // Game over / initials: slump
          targetX = astroScreen.current.x;
          targetY = h * 0.7;
        }

        const dx = targetX - astroScreen.current.x;
        const dy = targetY - astroScreen.current.y;
        const speedMult = currentPhase === 'playing' ? 0.14 : 0.05;
        astroScreen.current.x += dx * speedMult;
        astroScreen.current.y += dy * speedMult;

        if (Math.abs(dx) > 2) {
          const desiredRot = dx > 0 ? Math.PI / 2 : -Math.PI / 2;
          astroRotY.current += (desiredRot - astroRotY.current) * 0.15;
        }

        const moving = Math.hypot(dx, dy);
        animState.current = moving > 20 ? 'run' : 'idle';
      }

      // Map screen -> 3D
      const nx = (astroScreen.current.x / w) * 2 - 1;
      const ny = -((astroScreen.current.y / h) * 2 - 1);
      astro3D.current.x = nx * 4.5;
      astro3D.current.y = ny * 2.5 - 0.8;
      astro3D.current.z = 0;

      if (shadowRef.current) {
        shadowRef.current.style.transform = `translate(${astroScreen.current.x - 55}px, ${astroScreen.current.y + 70}px)`;
      }

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const triggerAsteroidKick = (id: number, ax: number, ay: number) => {
    kicking.current = true;
    animState.current = 'kick';
    const dx = ax - astroScreen.current.x;
    const dy = ay - astroScreen.current.y;
    const mag = Math.hypot(dx, dy) || 1;
    const dirX = dx / mag;
    const dirY = dy / mag;

    gsap.timeline({
      onComplete: () => { kicking.current = false; animState.current = 'run'; }
    })
    .to(astroScreen.current, { x: astroScreen.current.x - dirX * 15, y: astroScreen.current.y - dirY * 15, duration: 0.12, ease: 'power2.out' })
    .to(astroScreen.current, {
      x: astroScreen.current.x + dirX * 35,
      y: astroScreen.current.y + dirY * 35,
      duration: 0.1,
      ease: 'power4.in',
      onComplete: () => {
        // Apply physics impulse to asteroid
        asteroidApi.current?.kickAsteroid(id, dirX * 0.025, -0.06);
        showPow(ax, ay);
        gsap.fromTo(astroScale, { current: 1.2 }, { current: 1, duration: 0.4, ease: 'elastic.out(1, 0.5)' });
      }
    })
    .to(astroScreen.current, { x: astroScreen.current.x - dirX * 10, y: astroScreen.current.y - dirY * 10, duration: 0.2, ease: 'power2.out' });
  };

  const triggerCursorKick = () => {
    kicking.current = true;
    animState.current = 'kick';
    const kx = cursorPos.current.x - astroScreen.current.x;
    const ky = cursorPos.current.y - astroScreen.current.y;
    const kmag = Math.hypot(kx, ky) || 1;
    const dirX = kx / kmag;
    const dirY = ky / kmag;
    const startX = astroScreen.current.x;
    const startY = astroScreen.current.y;
    const lungeX = startX + dirX * 40;
    const lungeY = startY + dirY * 40;

    gsap.timeline({
      onComplete: () => { kicking.current = false; animState.current = 'run'; }
    })
    .to(astroScreen.current, { x: startX - dirX * 15, y: startY - dirY * 15, duration: 0.15, ease: 'power2.out' })
    .to(astroScreen.current, {
      x: lungeX, y: lungeY,
      duration: 0.12, ease: 'power4.in',
      onComplete: () => {
        cursorVel.current.x = dirX * 90;
        cursorVel.current.y = dirY * 90;
        showPow(cursorPos.current.x, cursorPos.current.y);
        // Play faah via sound event (audio context already unlocked)
        import('@/lib/sounds').then(({ playSound }) => playSound('faah'));
        gsap.to(astroRotY, { current: astroRotY.current + (dirX > 0 ? Math.PI * 2 : -Math.PI * 2), duration: 0.5, ease: 'power2.out' });
        gsap.fromTo(astroScale, { current: 1.2 }, { current: 1, duration: 0.4, ease: 'elastic.out(1, 0.5)' });
      }
    })
    .to(astroScreen.current, { x: lungeX - dirX * 20, y: lungeY - dirY * 20, duration: 0.25, ease: 'power2.out' });
  };

  const showPow = (x: number, y: number) => {
    if (!powRef.current) return;
    const pow = powRef.current;
    pow.style.left = `${x}px`;
    pow.style.top = `${y}px`;
    pow.style.opacity = '1';
    gsap.fromTo(pow,
      { scale: 0.3, rotate: -15 },
      { scale: 1.4, rotate: 15, duration: 0.35, ease: 'back.out(2)',
        onComplete: () => gsap.to(pow, { opacity: 0, duration: 0.25 }) }
    );
  };

  return (
    <>
      <style>{`* { cursor: none !important; }`}</style>

      {/* Custom cursor */}
      <div ref={cursorRef} className="pointer-events-none fixed top-0 left-0 z-[100]" style={{ willChange: 'transform' }}>
        <div className="relative h-7 w-7">
          <div className="absolute inset-0 rounded-full bg-pink-500 shadow-[0_0_25px_rgba(236,72,153,0.9)]" />
          <div className="absolute inset-1.5 rounded-full bg-white/90" />
          <div className="absolute inset-3 rounded-full bg-pink-400" />
        </div>
      </div>

      {/* Shadow */}
      <div ref={shadowRef} className="pointer-events-none fixed top-0 left-0 z-[80]" style={{ willChange: 'transform' }}>
        <div className="h-4 w-28 rounded-full bg-black/40 blur-md" />
      </div>

      {/* 3D canvas */}
      <div ref={canvasWrapRef} className="pointer-events-none fixed inset-0 z-[90]">
        <Canvas shadows camera={{ position: [0, 1.5, 6], fov: 45 }} gl={{ alpha: true, antialias: true }} style={{ background: 'transparent' }}>
          <Scene position={astro3D} rotationY={astroRotY} scale={astroScale} animState={animState} />
        </Canvas>
      </div>

      {/* POW burst */}
      <div ref={powRef} className="pointer-events-none fixed top-0 left-0 z-[110] opacity-0" style={{ transform: 'translate(-50%, -50%)' }}>
        <div className="relative -translate-x-1/2 -translate-y-1/2">
          <div className="text-5xl font-black text-yellow-300 drop-shadow-[0_0_20px_rgba(250,204,21,0.9)]">POW!</div>
          <div className="absolute -inset-6 -z-10">
            <svg viewBox="0 0 100 100" className="h-32 w-32 -translate-x-8 -translate-y-8">
              <polygon points="50,5 58,35 90,30 65,50 85,80 55,65 45,95 40,65 10,80 30,55 5,45 35,40" fill="#fbbf24" stroke="#f59e0b" strokeWidth="3" />
            </svg>
          </div>
        </div>
      </div>
    </>
  );
}
