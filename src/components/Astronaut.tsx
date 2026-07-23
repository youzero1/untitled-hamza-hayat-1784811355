import { useEffect, useRef, useState, Suspense } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as THREE from 'three';
import gsap from 'gsap';

// ---------- Audio: synthesized "faaaaaaah" meme voice ----------
let audioCtx: AudioContext | null = null;
function getAudio() {
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch {
      return null;
    }
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function playFaah() {
  const ctx = getAudio();
  if (!ctx) return;
  const now = ctx.currentTime;
  const dur = 0.9;

  // "F" breath burst
  const noise = ctx.createBufferSource();
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.15, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  noise.buffer = buf;
  const nGain = ctx.createGain();
  nGain.gain.setValueAtTime(0.35, now);
  nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
  const nFilter = ctx.createBiquadFilter();
  nFilter.type = 'highpass';
  nFilter.frequency.value = 2000;
  noise.connect(nFilter).connect(nGain).connect(ctx.destination);
  noise.start(now);

  // "aaaah" vocal — layered saw + square for meme-y texture
  const freqs = [180, 360, 540];
  freqs.forEach((f, idx) => {
    const osc = ctx.createOscillator();
    osc.type = idx === 0 ? 'sawtooth' : idx === 1 ? 'square' : 'triangle';
    osc.frequency.setValueAtTime(f * 1.15, now + 0.05);
    osc.frequency.exponentialRampToValueAtTime(f * 0.7, now + dur);

    // Vibrato
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 6;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = f * 0.04;
    lfo.connect(lfoGain).connect(osc.frequency);
    lfo.start(now);
    lfo.stop(now + dur);

    const g = ctx.createGain();
    const vol = idx === 0 ? 0.25 : idx === 1 ? 0.08 : 0.12;
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(vol, now + 0.08);
    g.gain.linearRampToValueAtTime(vol * 0.9, now + dur * 0.7);
    g.gain.exponentialRampToValueAtTime(0.001, now + dur);

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 900;
    filter.Q.value = 3;

    osc.connect(filter).connect(g).connect(ctx.destination);
    osc.start(now + 0.05);
    osc.stop(now + dur);
  });
}

// ---------- 3D character model ----------
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
    // Enable shadows
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
      // Match anim speed to state
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
      <directionalLight
        position={[5, 10, 5]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <pointLight position={[-5, 3, 2]} intensity={0.8} color="#a855f7" />
      <pointLight position={[5, 3, -2]} intensity={0.6} color="#ec4899" />
      <Suspense fallback={null}>
        <CharacterModel
          position={position}
          rotationY={rotationY}
          scale={scale}
          animState={animState}
        />
      </Suspense>
    </>
  );
}

// ---------- Main component: chase & kick logic ----------
export default function Astronaut() {
  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const powRef = useRef<HTMLDivElement>(null);
  const shadowRef = useRef<HTMLDivElement>(null);

  const [ready, setReady] = useState(false);

  // Mouse position (target the astronaut is chasing)
  const mouse = useRef({ x: 0, y: 0 });
  // Displayed cursor position (can recoil away from mouse when kicked)
  const cursorPos = useRef({ x: 0, y: 0 });
  const cursorVel = useRef({ x: 0, y: 0 });

  // Astronaut screen position
  const astroScreen = useRef({ x: 0, y: 0 });
  // 3D world position (mapped from screen)
  const astro3D = useRef({ x: 0, y: 0, z: 0 });
  const astroRotY = useRef(0);
  const astroScale = useRef(1);
  const animState = useRef<'idle' | 'run' | 'kick'>('idle');

  const kicking = useRef(false);
  const lastKickTime = useRef(0);

  useEffect(() => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    mouse.current = { x: w / 2, y: h / 2 };
    cursorPos.current = { x: w / 2, y: h / 2 };
    astroScreen.current = { x: w / 2 - 200, y: h / 2 };

    const onMove = (e: MouseEvent) => {
      mouse.current.x = e.clientX;
      mouse.current.y = e.clientY;
      getAudio(); // unlock audio on first move
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

      // Cursor physics: spring back to real mouse, with recoil velocity
      const cdx = mouse.current.x - cursorPos.current.x;
      const cdy = mouse.current.y - cursorPos.current.y;
      cursorVel.current.x += cdx * 0.15;
      cursorVel.current.y += cdy * 0.15;
      cursorVel.current.x *= 0.75;
      cursorVel.current.y *= 0.75;
      cursorPos.current.x += cursorVel.current.x * 0.25;
      cursorPos.current.y += cursorVel.current.y * 0.25;

      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate(${cursorPos.current.x - 14}px, ${
          cursorPos.current.y - 14
        }px)`;
      }

      // Astronaut chases cursor — position himself slightly behind cursor's motion direction
      const dxTotal = cursorPos.current.x - astroScreen.current.x;
      const dyTotal = cursorPos.current.y - astroScreen.current.y;
      const distToCursor = Math.hypot(dxTotal, dyTotal);

      if (!kicking.current) {
        // Chase target: cursor position offset back by ~90px behind cursor motion
        const mvx = cursorVel.current.x;
        const mvy = cursorVel.current.y;
        const vmag = Math.hypot(mvx, mvy) || 1;
        const offX = -(mvx / vmag) * 100;
        const offY = -(mvy / vmag) * 40 - 30; // stand slightly above ground line
        const targetX = cursorPos.current.x + offX;
        const targetY = cursorPos.current.y + offY;

        const dx = targetX - astroScreen.current.x;
        const dy = targetY - astroScreen.current.y;
        const speed = 0.12;
        astroScreen.current.x += dx * speed;
        astroScreen.current.y += dy * speed;

        // Face direction of movement
        if (Math.abs(dx) > 2) {
          const desiredRot = dx > 0 ? Math.PI / 2 : -Math.PI / 2;
          astroRotY.current += (desiredRot - astroRotY.current) * 0.15;
        }

        // Anim state
        const moving = Math.hypot(dx, dy);
        animState.current = moving > 20 ? 'run' : 'idle';

        // Kick trigger: close to cursor AND cursor is settled
        const now = performance.now();
        if (
          distToCursor < 120 &&
          Math.hypot(cursorVel.current.x, cursorVel.current.y) < 8 &&
          now - lastKickTime.current > 900
        ) {
          triggerKick();
          lastKickTime.current = now;
        }
      }

      // Map screen position to 3D world
      // Camera looks at origin from (0, 1.5, 6). Convert screen -> world.
      const nx = (astroScreen.current.x / w) * 2 - 1;
      const ny = -((astroScreen.current.y / h) * 2 - 1);
      // Rough mapping so character moves in a plane
      astro3D.current.x = nx * 4.5;
      astro3D.current.y = ny * 2.5 - 0.8;
      astro3D.current.z = 0;

      // Shadow
      if (shadowRef.current) {
        shadowRef.current.style.transform = `translate(${astroScreen.current.x - 55}px, ${
          astroScreen.current.y + 70
        }px)`;
      }

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [ready]);

  const triggerKick = () => {
    kicking.current = true;
    animState.current = 'kick';

    // Direction from astronaut to cursor
    const kx = cursorPos.current.x - astroScreen.current.x;
    const ky = cursorPos.current.y - astroScreen.current.y;
    const kmag = Math.hypot(kx, ky) || 1;
    const dirX = kx / kmag;
    const dirY = ky / kmag;

    // Astronaut lunges into kick
    const startX = astroScreen.current.x;
    const startY = astroScreen.current.y;
    const lungeX = startX + dirX * 40;
    const lungeY = startY + dirY * 40;

    gsap
      .timeline({
        onComplete: () => {
          kicking.current = false;
          animState.current = 'run';
        },
      })
      // Wind up
      .to(astroScreen.current, {
        x: startX - dirX * 15,
        y: startY - dirY * 15,
        duration: 0.15,
        ease: 'power2.out',
      })
      // Kick lunge
      .to(astroScreen.current, {
        x: lungeX,
        y: lungeY,
        duration: 0.12,
        ease: 'power4.in',
        onComplete: () => {
          // IMPACT
          playFaah();
          // Recoil cursor away
          cursorVel.current.x = dirX * 90;
          cursorVel.current.y = dirY * 90;
          // POW burst
          if (powRef.current) {
            const pow = powRef.current;
            pow.style.left = `${cursorPos.current.x}px`;
            pow.style.top = `${cursorPos.current.y}px`;
            pow.style.opacity = '1';
            gsap.fromTo(
              pow,
              { scale: 0.3, rotate: -15 },
              {
                scale: 1.4,
                rotate: 15,
                duration: 0.35,
                ease: 'back.out(2)',
                onComplete: () => {
                  gsap.to(pow, { opacity: 0, duration: 0.25 });
                },
              }
            );
          }
          // Astronaut spin from kick momentum
          gsap.to(astroRotY, {
            current: astroRotY.current + (dirX > 0 ? Math.PI * 2 : -Math.PI * 2),
            duration: 0.5,
            ease: 'power2.out',
          });
          gsap.fromTo(
            astroScale,
            { current: 1.2 },
            { current: 1, duration: 0.4, ease: 'elastic.out(1, 0.5)' }
          );
        },
      })
      // Recover
      .to(astroScreen.current, {
        x: lungeX - dirX * 20,
        y: lungeY - dirY * 20,
        duration: 0.25,
        ease: 'power2.out',
      });
  };

  return (
    <>
      {/* Hide native cursor site-wide */}
      <style>{`* { cursor: none !important; }`}</style>

      {/* Custom cursor dot */}
      <div
        ref={cursorRef}
        className="pointer-events-none fixed top-0 left-0 z-[100]"
        style={{ willChange: 'transform' }}
      >
        <div className="relative h-7 w-7">
          <div className="absolute inset-0 rounded-full bg-pink-500 shadow-[0_0_25px_rgba(236,72,153,0.9)]" />
          <div className="absolute inset-1.5 rounded-full bg-white/90" />
          <div className="absolute inset-3 rounded-full bg-pink-400" />
        </div>
      </div>

      {/* Astronaut shadow */}
      <div
        ref={shadowRef}
        className="pointer-events-none fixed top-0 left-0 z-[80]"
        style={{ willChange: 'transform' }}
      >
        <div className="h-4 w-28 rounded-full bg-black/40 blur-md" />
      </div>

      {/* 3D canvas — full screen overlay */}
      <div
        ref={canvasWrapRef}
        className="pointer-events-none fixed inset-0 z-[90]"
      >
        <Canvas
          shadows
          camera={{ position: [0, 1.5, 6], fov: 45 }}
          gl={{ alpha: true, antialias: true }}
          style={{ background: 'transparent' }}
        >
          <Scene
            position={astro3D}
            rotationY={astroRotY}
            scale={astroScale}
            animState={animState}
          />
        </Canvas>
      </div>

      {/* POW burst on kick */}
      <div
        ref={powRef}
        className="pointer-events-none fixed top-0 left-0 z-[110] opacity-0"
        style={{ transform: 'translate(-50%, -50%)' }}
      >
        <div className="relative -translate-x-1/2 -translate-y-1/2">
          <div className="text-5xl font-black text-yellow-300 drop-shadow-[0_0_20px_rgba(250,204,21,0.9)]">
            POW!
          </div>
          <div className="absolute -inset-6 -z-10">
            <svg viewBox="0 0 100 100" className="h-32 w-32 -translate-x-8 -translate-y-8">
              <polygon
                points="50,5 58,35 90,30 65,50 85,80 55,65 45,95 40,65 10,80 30,55 5,45 35,40"
                fill="#fbbf24"
                stroke="#f59e0b"
                strokeWidth="3"
              />
            </svg>
          </div>
        </div>
      </div>
    </>
  );
}
