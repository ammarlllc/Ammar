import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ShieldAlert, Terminal, Lock, KeyRound, Play, RotateCcw, Volume2, VolumeX, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { sounds } from '../services/soundEffects';

interface SnakeGameProps {
  onUnlockVault: () => void;
  onAdminBypassRequest: () => void;
}

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
interface Point {
  x: number;
  y: number;
}

const GRID_SIZE = 20; // 20x20 grid
const INITIAL_SNAKE: Point[] = [
  { x: 10, y: 10 },
  { x: 9, y: 10 },
  { x: 8, y: 10 },
];
const INITIAL_DIRECTION: Direction = 'RIGHT';
const REQUIRED_ORBS = 5;

export const SnakeGame: React.FC<SnakeGameProps> = ({ onUnlockVault, onAdminBypassRequest }) => {
  const [snake, setSnake] = useState<Point[]>(INITIAL_SNAKE);
  const [direction, setDirection] = useState<Direction>(INITIAL_DIRECTION);
  const [redOrbsEaten, setRedOrbsEaten] = useState(0);
  const [score, setScore] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isBreached, setIsBreached] = useState(false);
  const [isMuted, setIsMuted] = useState(sounds.isMuted);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const foodRef = useRef<Point>({ x: 15, y: 10 });
  const directionRef = useRef<Direction>(INITIAL_DIRECTION);
  const nextDirectionRef = useRef<Direction>(INITIAL_DIRECTION);
  const redOrbsRef = useRef(0);
  const isPlayingRef = useRef(true);
  const isGameOverRef = useRef(false);
  const isBreachedRef = useRef(false);

  // Keep refs in sync
  directionRef.current = direction;
  redOrbsRef.current = redOrbsEaten;
  isPlayingRef.current = isPlaying;
  isGameOverRef.current = isGameOver;
  isBreachedRef.current = isBreached;

  // Generate random food not on snake
  const generateFood = useCallback((currentSnake: Point[]): Point => {
    let newFood: Point;
    let collision: boolean;
    do {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
      // eslint-disable-next-line @typescript-eslint/no-loop-func
      collision = currentSnake.some((segment) => segment.x === newFood.x && segment.y === newFood.y);
    } while (collision);
    return newFood;
  }, []);

  // Reset Game
  const resetGame = useCallback(() => {
    setSnake(INITIAL_SNAKE);
    setDirection(INITIAL_DIRECTION);
    directionRef.current = INITIAL_DIRECTION;
    nextDirectionRef.current = INITIAL_DIRECTION;
    setIsGameOver(false);
    isGameOverRef.current = false;
    setRedOrbsEaten(0);
    redOrbsRef.current = 0;
    setScore(0);
    setIsPlaying(true);
    isPlayingRef.current = true;
    foodRef.current = generateFood(INITIAL_SNAKE);
  }, [generateFood]);

  // Handle Breaching sequence
  const triggerBreach = useCallback(() => {
    setIsBreached(true);
    isBreachedRef.current = true;
    setIsPlaying(false);
    isPlayingRef.current = false;
    sounds.playFirewallBreach();

    // Confetti celebration
    try {
      confetti({
        particleCount: 120,
        spread: 90,
        origin: { y: 0.6 },
        colors: ['#00ff88', '#ff0044', '#00e5ff', '#ffffff'],
      });
    } catch {
      // ignore
    }

    // Delay 1.8s for hacker glitch animation and then transition to video vault
    setTimeout(() => {
      onUnlockVault();
    }, 1800);
  }, [onUnlockVault]);

  // Handle Direction changes
  const changeDirection = useCallback((newDir: Direction) => {
    sounds.playClick();
    const current = directionRef.current;
    if (newDir === 'UP' && current !== 'DOWN') nextDirectionRef.current = 'UP';
    if (newDir === 'DOWN' && current !== 'UP') nextDirectionRef.current = 'DOWN';
    if (newDir === 'LEFT' && current !== 'RIGHT') nextDirectionRef.current = 'LEFT';
    if (newDir === 'RIGHT' && current !== 'LEFT') nextDirectionRef.current = 'RIGHT';
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'KeyW'].includes(e.code)) {
        e.preventDefault();
        changeDirection('UP');
      } else if (['ArrowDown', 'KeyS'].includes(e.code)) {
        e.preventDefault();
        changeDirection('DOWN');
      } else if (['ArrowLeft', 'KeyA'].includes(e.code)) {
        e.preventDefault();
        changeDirection('LEFT');
      } else if (['ArrowRight', 'KeyD'].includes(e.code)) {
        e.preventDefault();
        changeDirection('RIGHT');
      } else if (e.code === 'Space') {
        e.preventDefault();
        if (isGameOverRef.current) resetGame();
        else setIsPlaying((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [changeDirection, resetGame]);

  // Game Loop
  useEffect(() => {
    if (isGameOver || !isPlaying || isBreached) return;

    const interval = setInterval(() => {
      setSnake((prevSnake) => {
        const head = { ...prevSnake[0] };
        const curDir = nextDirectionRef.current;
        directionRef.current = curDir;
        setDirection(curDir);

        if (curDir === 'UP') head.y -= 1;
        if (curDir === 'DOWN') head.y += 1;
        if (curDir === 'LEFT') head.x -= 1;
        if (curDir === 'RIGHT') head.x += 1;

        // Wall collisions (Wrap around or death? User said classic snake game, wrap around makes eating 5 balls smooth and enjoyable!)
        if (head.x < 0) head.x = GRID_SIZE - 1;
        if (head.x >= GRID_SIZE) head.x = 0;
        if (head.y < 0) head.y = GRID_SIZE - 1;
        if (head.y >= GRID_SIZE) head.y = 0;

        // Check self-collision
        const hitSelf = prevSnake.some((seg) => seg.x === head.x && seg.y === head.y);
        if (hitSelf) {
          sounds.playGameOver();
          setIsGameOver(true);
          isGameOverRef.current = true;
          return prevSnake;
        }

        const newSnake = [head, ...prevSnake];

        // Check if food eaten
        const currentFood = foodRef.current;
        if (head.x === currentFood.x && head.y === currentFood.y) {
          sounds.playEatRedOrb();
          const nextOrbs = redOrbsRef.current + 1;
          setRedOrbsEaten(nextOrbs);
          redOrbsRef.current = nextOrbs;
          setScore((s) => s + 100);

          if (nextOrbs >= REQUIRED_ORBS) {
            triggerBreach();
          } else {
            foodRef.current = generateFood(newSnake);
          }
        } else {
          // Remove tail if didn't eat
          newSnake.pop();
        }

        return newSnake;
      });
    }, 130);

    return () => clearInterval(interval);
  }, [isPlaying, isGameOver, isBreached, generateFood, triggerBreach]);

  // Canvas Drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const cellSize = width / GRID_SIZE;

    // Clear background
    ctx.fillStyle = '#060a14';
    ctx.fillRect(0, 0, width, height);

    // Subtle Tech Grid
    ctx.strokeStyle = 'rgba(0, 255, 136, 0.07)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cellSize, 0);
      ctx.lineTo(i * cellSize, height);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, i * cellSize);
      ctx.lineTo(width, i * cellSize);
      ctx.stroke();
    }

    // Draw Red Food Ball with pulse glow
    const food = foodRef.current;
    const fx = food.x * cellSize + cellSize / 2;
    const fy = food.y * cellSize + cellSize / 2;
    const radius = (cellSize / 2) * 0.78;

    // Red ball glow
    const radialGrad = ctx.createRadialGradient(fx, fy, 2, fx, fy, radius * 1.6);
    radialGrad.addColorStop(0, '#ff3b69');
    radialGrad.addColorStop(0.6, '#ef4444');
    radialGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');
    ctx.fillStyle = radialGrad;
    ctx.beginPath();
    ctx.arc(fx, fy, radius * 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Solid core of red ball
    ctx.fillStyle = '#ff0037';
    ctx.beginPath();
    ctx.arc(fx, fy, radius * 0.75, 0, Math.PI * 2);
    ctx.fill();

    // Tech core highlight
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(fx - radius * 0.25, fy - radius * 0.25, radius * 0.25, 0, Math.PI * 2);
    ctx.fill();

    // Draw Snake
    snake.forEach((seg, idx) => {
      const sx = seg.x * cellSize;
      const sy = seg.y * cellSize;

      if (idx === 0) {
        // Snake Head (High tech neon green / cyan)
        ctx.fillStyle = '#00ff88';
        ctx.shadowColor = '#00ff88';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.roundRect(sx + 1, sy + 1, cellSize - 2, cellSize - 2, 6);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Eyes
        ctx.fillStyle = '#050a14';
        const curDir = directionRef.current;
        let eye1X = sx + 5, eye1Y = sy + 5, eye2X = sx + 11, eye2Y = sy + 5;
        if (curDir === 'UP') {
          eye1X = sx + 4; eye1Y = sy + 4;
          eye2X = sx + cellSize - 7; eye2Y = sy + 4;
        } else if (curDir === 'DOWN') {
          eye1X = sx + 4; eye1Y = sy + cellSize - 7;
          eye2X = sx + cellSize - 7; eye2Y = sy + cellSize - 7;
        } else if (curDir === 'LEFT') {
          eye1X = sx + 4; eye1Y = sy + 4;
          eye2X = sx + 4; eye2Y = sy + cellSize - 7;
        } else if (curDir === 'RIGHT') {
          eye1X = sx + cellSize - 7; eye1Y = sy + 4;
          eye2X = sx + cellSize - 7; eye2Y = sy + cellSize - 7;
        }
        ctx.fillRect(eye1X, eye1Y, 3, 3);
        ctx.fillRect(eye2X, eye2Y, 3, 3);
      } else {
        // Snake Body gradient
        const alpha = Math.max(0.35, 1 - (idx / snake.length) * 0.65);
        ctx.fillStyle = `rgba(0, 229, 255, ${alpha})`;
        ctx.beginPath();
        ctx.roundRect(sx + 2, sy + 2, cellSize - 4, cellSize - 4, 4);
        ctx.fill();
      }
    });
  }, [snake]);

  const toggleSound = () => {
    const next = sounds.toggleMute();
    setIsMuted(next);
  };

  return (
    <div className="relative min-h-screen w-full bg-[#05070e] flex flex-col items-center justify-center p-3 sm:p-6 overflow-hidden">
      {/* Background Matrix Tech Grid */}
      <div className="absolute inset-0 cyber-grid opacity-30 pointer-events-none" />

      {/* Glowing Cyber Accent Circles */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 rounded-full bg-red-500/10 blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-xl flex flex-col items-center">
        {/* App Professional Header */}
        <div className="w-full text-center mb-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-emerald-500/40 bg-emerald-950/40 text-emerald-400 text-xs font-mono tracking-widest uppercase mb-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            STEALTH SECURITY ACTIVE
          </div>

          <h1 className="text-3xl sm:text-5xl font-black font-cyber tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-cyan-300 to-emerald-300 glow-emerald drop-shadow-lg">
            AMMAR H4CKER
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 font-mono mt-1 tracking-wide">
            COVERT OFFLINE VIDEO VAULT PROTOCOL
          </p>
        </div>

        {/* Classic Retro Cyber HUD (No mention of 5 balls or unlock!) */}
        <div className="w-full mb-3 bg-[#0a1020]/90 border border-emerald-500/40 rounded-xl p-3 sm:p-4 shadow-xl backdrop-blur-md">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-400">
                <Terminal className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block">
                  CURRENT SCORE
                </span>
                <span className="text-xl sm:text-2xl font-cyber font-bold text-white tracking-wider">
                  {score.toString().padStart(4, '0')}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4 text-right">
              <div>
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block">
                  HIGH SCORE
                </span>
                <span className="text-sm sm:text-base font-cyber font-bold text-emerald-400 tracking-wider">
                  1850
                </span>
              </div>

              <button
                onClick={toggleSound}
                className="p-2 rounded-lg border border-slate-700 bg-slate-900/80 text-slate-300 hover:text-white transition text-xs"
                title="Toggle Sound"
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-slate-500" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
              </button>
            </div>
          </div>
        </div>

        {/* Snake Canvas Area */}
        <div className="relative w-full aspect-square max-w-[400px] sm:max-w-[440px] rounded-xl overflow-hidden border-2 border-emerald-500/40 shadow-2xl bg-[#060a14]">
          <canvas
            ref={canvasRef}
            width={400}
            height={400}
            className="w-full h-full block cursor-pointer"
            onClick={() => {
              if (isGameOver) resetGame();
              else setIsPlaying((p) => !p);
            }}
          />

          {/* Breach Overlay Animation */}
          {isBreached && (
            <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center p-6 text-center animate-glitch z-30">
              <Sparkles className="w-14 h-14 text-emerald-400 animate-spin mb-3" />
              <h2 className="text-2xl sm:text-3xl font-black font-cyber text-emerald-400 tracking-wider glow-emerald">
                FIREWALL BREACHED!
              </h2>
              <p className="text-sm font-mono text-cyan-300 mt-2">
                5 RED DATA ORBS CONSUMED
              </p>
              <div className="mt-4 px-4 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-400 text-xs text-emerald-300 font-mono">
                AUTHORIZING AMMAR H4CKER // OPENING VAULT...
              </div>
            </div>
          )}

          {/* Game Over Overlay */}
          {isGameOver && !isBreached && (
            <div className="absolute inset-0 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-20">
              <ShieldAlert className="w-12 h-12 text-red-500 mb-2" />
              <h3 className="text-xl sm:text-2xl font-bold font-cyber text-red-500 glow-red">
                NODE COLLISION DETECTED
              </h3>
              <p className="text-xs sm:text-sm font-mono text-slate-300 mt-1">
                Final Score: {score}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                Press retry to play again.
              </p>
              <button
                onClick={resetGame}
                className="mt-4 flex items-center gap-2 px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-cyber font-bold text-xs tracking-wider transition shadow-lg shadow-red-500/30"
              >
                <RotateCcw className="w-4 h-4" />
                RETRY HACK (RESTART)
              </button>
            </div>
          )}

          {/* Paused Overlay */}
          {!isPlaying && !isGameOver && !isBreached && (
            <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center p-4 text-center z-10">
              <Play className="w-10 h-10 text-emerald-400 mb-2" />
              <p className="text-base font-cyber font-bold text-white">GAME PAUSED</p>
              <p className="text-xs font-mono text-slate-400 mt-1">Tap canvas or button to resume</p>
              <button
                onClick={() => setIsPlaying(true)}
                className="mt-3 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-black font-bold text-xs font-mono"
              >
                RESUME
              </button>
            </div>
          )}
        </div>

        {/* Mobile / Touch D-PAD Controls */}
        <div className="w-full mt-4 flex flex-col items-center">
          <div className="flex flex-col items-center gap-1.5">
            <button
              onClick={() => changeDirection('UP')}
              aria-label="Up"
              className="w-12 h-12 rounded-xl bg-slate-900/90 border border-emerald-500/40 text-emerald-400 flex items-center justify-center active:bg-emerald-600 active:text-black transition shadow-lg"
            >
              <ChevronUp className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-4">
              <button
                onClick={() => changeDirection('LEFT')}
                aria-label="Left"
                className="w-12 h-12 rounded-xl bg-slate-900/90 border border-emerald-500/40 text-emerald-400 flex items-center justify-center active:bg-emerald-600 active:text-black transition shadow-lg"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={() => {
                  if (isGameOver) resetGame();
                  else setIsPlaying((p) => !p);
                }}
                className="w-12 h-12 rounded-xl bg-emerald-950 border border-emerald-500/60 text-emerald-300 flex items-center justify-center text-xs font-mono font-bold"
              >
                {isPlaying ? 'PAUSE' : 'PLAY'}
              </button>
              <button
                onClick={() => changeDirection('RIGHT')}
                aria-label="Right"
                className="w-12 h-12 rounded-xl bg-slate-900/90 border border-emerald-500/40 text-emerald-400 flex items-center justify-center active:bg-emerald-600 active:text-black transition shadow-lg"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>
            <button
              onClick={() => changeDirection('DOWN')}
              aria-label="Down"
              className="w-12 h-12 rounded-xl bg-slate-900/90 border border-emerald-500/40 text-emerald-400 flex items-center justify-center active:bg-emerald-600 active:text-black transition shadow-lg"
            >
              <ChevronDown className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Bottom Action Footer with Admin Bypass */}
        <div className="w-full mt-5 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-slate-400">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span>Score: <strong className="text-white font-bold">{score}</strong></span>
          </div>

          {/* Quick Admin Passkey Bypass Button */}
          <button
            onClick={() => {
              sounds.playClick();
              onAdminBypassRequest();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cyan-500/40 bg-cyan-950/40 hover:bg-cyan-900/50 text-cyan-300 transition"
          >
            <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
            <span>ADMIN PASSKEY OVERRIDE</span>
          </button>
        </div>
      </div>
    </div>
  );
};
