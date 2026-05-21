import { useEffect, useRef, useState, useCallback } from "react";

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 600;
const BIRD_X = 80;
const BIRD_RADIUS = 18;
const GRAVITY = 0.45;
const JUMP_FORCE = -8.5;
const PIPE_WIDTH = 60;
const PIPE_GAP = 155;
const PIPE_SPEED = 2.8;
const PIPE_INTERVAL = 1600;
const GROUND_HEIGHT = 80;

type GameState = "idle" | "playing" | "dead";

interface Pipe {
  x: number;
  topHeight: number;
  scored: boolean;
}

interface Bird {
  y: number;
  velocity: number;
  rotation: number;
}

function drawBird(ctx: CanvasRenderingContext2D, x: number, y: number, rotation: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);

  // Body
  ctx.beginPath();
  ctx.ellipse(0, 0, BIRD_RADIUS, BIRD_RADIUS - 2, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#FFD700";
  ctx.fill();
  ctx.strokeStyle = "#E8A000";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Belly
  ctx.beginPath();
  ctx.ellipse(4, 4, 10, 8, 0.3, 0, Math.PI * 2);
  ctx.fillStyle = "#FFF3B0";
  ctx.fill();

  // Wing
  ctx.beginPath();
  ctx.ellipse(-2, 2, 10, 6, -0.4, 0, Math.PI * 2);
  ctx.fillStyle = "#FFA500";
  ctx.fill();
  ctx.strokeStyle = "#E8A000";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Eye white
  ctx.beginPath();
  ctx.arc(8, -6, 6, 0, Math.PI * 2);
  ctx.fillStyle = "white";
  ctx.fill();

  // Pupil
  ctx.beginPath();
  ctx.arc(10, -6, 3, 0, Math.PI * 2);
  ctx.fillStyle = "#1a1a2e";
  ctx.fill();

  // Eye shine
  ctx.beginPath();
  ctx.arc(11, -7, 1, 0, Math.PI * 2);
  ctx.fillStyle = "white";
  ctx.fill();

  // Beak
  ctx.beginPath();
  ctx.moveTo(12, -1);
  ctx.lineTo(22, -3);
  ctx.lineTo(22, 3);
  ctx.lineTo(12, 3);
  ctx.closePath();
  ctx.fillStyle = "#FF6B35";
  ctx.fill();
  ctx.strokeStyle = "#CC4A1A";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.restore();
}

function drawPipe(ctx: CanvasRenderingContext2D, x: number, topHeight: number) {
  const capH = 20;
  const capOverhang = 6;

  const grad = ctx.createLinearGradient(x, 0, x + PIPE_WIDTH, 0);
  grad.addColorStop(0, "#4CAF50");
  grad.addColorStop(0.4, "#66BB6A");
  grad.addColorStop(1, "#2E7D32");

  // Top pipe body
  ctx.fillStyle = grad;
  ctx.fillRect(x, 0, PIPE_WIDTH, topHeight - capH);
  ctx.strokeStyle = "#1B5E20";
  ctx.lineWidth = 2;
  ctx.strokeRect(x, 0, PIPE_WIDTH, topHeight - capH);

  // Top pipe cap
  ctx.fillStyle = "#43A047";
  ctx.fillRect(x - capOverhang, topHeight - capH, PIPE_WIDTH + capOverhang * 2, capH);
  ctx.strokeStyle = "#1B5E20";
  ctx.lineWidth = 2;
  ctx.strokeRect(x - capOverhang, topHeight - capH, PIPE_WIDTH + capOverhang * 2, capH);

  // Pipe highlight
  ctx.fillStyle = "rgba(255,255,255,0.15)";
  ctx.fillRect(x + 6, 0, 12, topHeight - capH);

  const bottomY = topHeight + PIPE_GAP;
  const bottomHeight = CANVAS_HEIGHT - GROUND_HEIGHT - bottomY;

  // Bottom pipe body
  ctx.fillStyle = grad;
  ctx.fillRect(x, bottomY + capH, PIPE_WIDTH, bottomHeight - capH);
  ctx.strokeStyle = "#1B5E20";
  ctx.lineWidth = 2;
  ctx.strokeRect(x, bottomY + capH, PIPE_WIDTH, bottomHeight - capH);

  // Bottom pipe cap
  ctx.fillStyle = "#43A047";
  ctx.fillRect(x - capOverhang, bottomY, PIPE_WIDTH + capOverhang * 2, capH);
  ctx.strokeStyle = "#1B5E20";
  ctx.lineWidth = 2;
  ctx.strokeRect(x - capOverhang, bottomY, PIPE_WIDTH + capOverhang * 2, capH);

  // Pipe highlight
  ctx.fillStyle = "rgba(255,255,255,0.15)";
  ctx.fillRect(x + 6, bottomY + capH, 12, bottomHeight - capH);
}

function drawBackground(ctx: CanvasRenderingContext2D, offset: number) {
  // Sky gradient
  const skyGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT - GROUND_HEIGHT);
  skyGrad.addColorStop(0, "#87CEEB");
  skyGrad.addColorStop(1, "#B0E0FF");
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_HEIGHT);

  // Clouds
  const clouds = [
    { x: 60, y: 80, w: 80, h: 30 },
    { x: 200, y: 50, w: 100, h: 35 },
    { x: 320, y: 100, w: 70, h: 25 },
    { x: 500, y: 60, w: 90, h: 32 },
    { x: 650, y: 90, w: 75, h: 28 },
  ];

  clouds.forEach(({ x, y, w, h }) => {
    const cx = ((x - offset * 0.3) % (CANVAS_WIDTH + 120)) - 60;
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.beginPath();
    ctx.ellipse(cx, y, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx - w * 0.2, y + h * 0.1, w * 0.35, h * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + w * 0.2, y + h * 0.1, w * 0.35, h * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
  });

  // Ground
  const groundGrad = ctx.createLinearGradient(0, CANVAS_HEIGHT - GROUND_HEIGHT, 0, CANVAS_HEIGHT);
  groundGrad.addColorStop(0, "#8BC34A");
  groundGrad.addColorStop(0.15, "#7CB342");
  groundGrad.addColorStop(0.15, "#A0522D");
  groundGrad.addColorStop(1, "#8B4513");
  ctx.fillStyle = groundGrad;
  ctx.fillRect(0, CANVAS_HEIGHT - GROUND_HEIGHT, CANVAS_WIDTH, GROUND_HEIGHT);

  // Ground line detail
  ctx.strokeStyle = "#558B2F";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, CANVAS_HEIGHT - GROUND_HEIGHT + 12);
  ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_HEIGHT + 12);
  ctx.stroke();

  // Ground texture lines
  ctx.strokeStyle = "rgba(0,0,0,0.1)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 6; i++) {
    const tx = ((offset * 2 + i * 70) % (CANVAS_WIDTH + 70)) - 35;
    ctx.beginPath();
    ctx.moveTo(tx, CANVAS_HEIGHT - GROUND_HEIGHT + 20);
    ctx.lineTo(tx + 40, CANVAS_HEIGHT - GROUND_HEIGHT + 20);
    ctx.stroke();
  }
}

export default function FlappyBird() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameStateRef = useRef<GameState>("idle");
  const birdRef = useRef<Bird>({ y: CANVAS_HEIGHT / 2, velocity: 0, rotation: 0 });
  const pipesRef = useRef<Pipe[]>([]);
  const scoreRef = useRef(0);
  const bgOffsetRef = useRef(0);
  const lastPipeTimeRef = useRef(0);
  const animFrameRef = useRef<number>(0);
  const lastTimestampRef = useRef<number>(0);
  const flashRef = useRef(0);

  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(() => {
    try { return parseInt(localStorage.getItem("flappy-best") || "0"); } catch { return 0; }
  });
  const [gameState, setGameState] = useState<GameState>("idle");

  const resetGame = useCallback(() => {
    birdRef.current = { y: CANVAS_HEIGHT / 2, velocity: 0, rotation: 0 };
    pipesRef.current = [];
    scoreRef.current = 0;
    bgOffsetRef.current = 0;
    lastPipeTimeRef.current = 0;
    flashRef.current = 0;
    setScore(0);
  }, []);

  const jump = useCallback(() => {
    if (gameStateRef.current === "idle") {
      gameStateRef.current = "playing";
      setGameState("playing");
      birdRef.current.velocity = JUMP_FORCE;
    } else if (gameStateRef.current === "playing") {
      birdRef.current.velocity = JUMP_FORCE;
    } else if (gameStateRef.current === "dead") {
      gameStateRef.current = "idle";
      setGameState("idle");
      resetGame();
    }
  }, [resetGame]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        jump();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [jump]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    function spawnPipe(now: number) {
      const minTop = 60;
      const maxTop = CANVAS_HEIGHT - GROUND_HEIGHT - PIPE_GAP - 60;
      const topHeight = Math.random() * (maxTop - minTop) + minTop;
      pipesRef.current.push({ x: CANVAS_WIDTH + 10, topHeight, scored: false });
      lastPipeTimeRef.current = now;
    }

    function checkCollision(bird: Bird): boolean {
      // Ground / ceiling
      if (bird.y - BIRD_RADIUS <= 0) return true;
      if (bird.y + BIRD_RADIUS >= CANVAS_HEIGHT - GROUND_HEIGHT) return true;

      for (const pipe of pipesRef.current) {
        if (
          BIRD_X + BIRD_RADIUS - 8 > pipe.x &&
          BIRD_X - BIRD_RADIUS + 8 < pipe.x + PIPE_WIDTH
        ) {
          if (
            bird.y - BIRD_RADIUS + 5 < pipe.topHeight ||
            bird.y + BIRD_RADIUS - 5 > pipe.topHeight + PIPE_GAP
          ) {
            return true;
          }
        }
      }
      return false;
    }

    function loop(timestamp: number) {
      const dt = Math.min(timestamp - (lastTimestampRef.current || timestamp), 50);
      lastTimestampRef.current = timestamp;
      const dtFactor = dt / (1000 / 60);

      ctx!.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      const state = gameStateRef.current;

      // Background
      if (state === "playing") {
        bgOffsetRef.current += PIPE_SPEED * dtFactor;
      }
      drawBackground(ctx!, bgOffsetRef.current);

      // Pipes
      if (state === "playing") {
        if (timestamp - lastPipeTimeRef.current > PIPE_INTERVAL) {
          spawnPipe(timestamp);
        }
        pipesRef.current = pipesRef.current.filter(p => p.x > -PIPE_WIDTH - 20);
        for (const pipe of pipesRef.current) {
          pipe.x -= PIPE_SPEED * dtFactor;
          if (!pipe.scored && pipe.x + PIPE_WIDTH < BIRD_X) {
            pipe.scored = true;
            scoreRef.current += 1;
            setScore(scoreRef.current);
          }
        }
      }

      pipesRef.current.forEach(p => drawPipe(ctx!, p.x, p.topHeight));

      // Bird physics
      const bird = birdRef.current;
      if (state === "playing") {
        bird.velocity += GRAVITY * dtFactor;
        bird.y += bird.velocity * dtFactor;

        const targetRotation = Math.max(-0.4, Math.min(Math.PI / 2.5, bird.velocity * 0.07));
        bird.rotation += (targetRotation - bird.rotation) * 0.15;

        if (checkCollision(bird)) {
          gameStateRef.current = "dead";
          setGameState("dead");
          flashRef.current = 1;
          const best = scoreRef.current;
          setBestScore(prev => {
            const newBest = Math.max(prev, best);
            try { localStorage.setItem("flappy-best", String(newBest)); } catch {}
            return newBest;
          });
        }
      } else if (state === "idle") {
        bird.y = CANVAS_HEIGHT / 2 + Math.sin(timestamp / 400) * 8;
        bird.rotation = 0;
      }

      drawBird(ctx!, BIRD_X, bird.y, bird.rotation);

      // Flash on death
      if (flashRef.current > 0) {
        ctx!.fillStyle = `rgba(255,255,255,${flashRef.current})`;
        ctx!.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        flashRef.current = Math.max(0, flashRef.current - 0.06);
      }

      // Score display during play
      if (state === "playing" || state === "dead") {
        ctx!.font = "bold 42px 'Arial Black', Arial";
        ctx!.fillStyle = "white";
        ctx!.strokeStyle = "#333";
        ctx!.lineWidth = 4;
        ctx!.textAlign = "center";
        ctx!.strokeText(String(scoreRef.current), CANVAS_WIDTH / 2, 70);
        ctx!.fillText(String(scoreRef.current), CANVAS_WIDTH / 2, 70);
      }

      // Idle screen
      if (state === "idle") {
        // Panel
        ctx!.save();
        ctx!.fillStyle = "rgba(0,0,0,0.35)";
        roundRect(ctx!, CANVAS_WIDTH / 2 - 140, CANVAS_HEIGHT / 2 - 70, 280, 140, 16);
        ctx!.fill();
        ctx!.restore();

        ctx!.textAlign = "center";
        ctx!.font = "bold 38px 'Arial Black', Arial";
        ctx!.fillStyle = "#FFD700";
        ctx!.strokeStyle = "#8B4500";
        ctx!.lineWidth = 5;
        ctx!.strokeText("FLAPPY BIRD", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);
        ctx!.fillText("FLAPPY BIRD", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);

        ctx!.font = "bold 18px Arial";
        ctx!.fillStyle = "white";
        ctx!.strokeStyle = "#333";
        ctx!.lineWidth = 3;
        const tapText = "Tap / Space to start";
        ctx!.strokeText(tapText, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 22);
        ctx!.fillText(tapText, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 22);

        if (bestScore > 0) {
          ctx!.font = "16px Arial";
          ctx!.fillStyle = "#FFD700";
          ctx!.strokeStyle = "#333";
          ctx!.lineWidth = 2;
          ctx!.strokeText(`Best: ${bestScore}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 55);
          ctx!.fillText(`Best: ${bestScore}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 55);
        }
      }

      // Game over screen
      if (state === "dead") {
        ctx!.save();
        ctx!.fillStyle = "rgba(0,0,0,0.5)";
        roundRect(ctx!, CANVAS_WIDTH / 2 - 150, CANVAS_HEIGHT / 2 - 110, 300, 220, 18);
        ctx!.fill();
        ctx!.restore();

        ctx!.textAlign = "center";
        ctx!.font = "bold 40px 'Arial Black', Arial";
        ctx!.fillStyle = "#FF4444";
        ctx!.strokeStyle = "#660000";
        ctx!.lineWidth = 5;
        ctx!.strokeText("GAME OVER", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 55);
        ctx!.fillText("GAME OVER", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 55);

        ctx!.font = "bold 22px Arial";
        ctx!.fillStyle = "white";
        ctx!.strokeStyle = "#333";
        ctx!.lineWidth = 3;
        ctx!.strokeText(`Score: ${scoreRef.current}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
        ctx!.fillText(`Score: ${scoreRef.current}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);

        ctx!.font = "bold 20px Arial";
        ctx!.fillStyle = "#FFD700";
        ctx!.strokeStyle = "#333";
        ctx!.lineWidth = 3;
        const best = Math.max(scoreRef.current, bestScore);
        ctx!.strokeText(`Best: ${best}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 34);
        ctx!.fillText(`Best: ${best}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 34);

        // Retry button
        ctx!.fillStyle = "#FFD700";
        ctx!.strokeStyle = "#8B4500";
        ctx!.lineWidth = 3;
        roundRect(ctx!, CANVAS_WIDTH / 2 - 80, CANVAS_HEIGHT / 2 + 65, 160, 44, 10);
        ctx!.fill();
        ctx!.stroke();
        ctx!.font = "bold 20px Arial";
        ctx!.fillStyle = "#1a1a2e";
        ctx!.strokeStyle = "transparent";
        ctx!.fillText("Try Again", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 93);
      }

      animFrameRef.current = requestAnimationFrame(loop);
    }

    animFrameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [bestScore]);

  function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Arial Black', Arial, sans-serif",
        userSelect: "none",
      }}
    >
      <div style={{ marginBottom: 16, textAlign: "center" }}>
        <h1 style={{ color: "#FFD700", fontSize: 28, margin: 0, letterSpacing: 2, textShadow: "2px 2px 8px rgba(0,0,0,0.6)" }}>
          FLAPPY BIRD
        </h1>
        <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, margin: "4px 0 0", letterSpacing: 1 }}>
          Press Space or tap to flap
        </p>
      </div>

      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        onClick={jump}
        style={{
          display: "block",
          borderRadius: 12,
          boxShadow: "0 20px 60px rgba(0,0,0,0.6), 0 0 0 3px rgba(255,215,0,0.3)",
          cursor: "pointer",
          touchAction: "none",
        }}
        onTouchStart={(e) => { e.preventDefault(); jump(); }}
      />

      <div style={{
        marginTop: 16,
        display: "flex",
        gap: 32,
        color: "rgba(255,255,255,0.7)",
        fontSize: 14,
      }}>
        <span>Score: <strong style={{ color: "#FFD700" }}>{score}</strong></span>
        <span>Best: <strong style={{ color: "#FFD700" }}>{Math.max(score, bestScore)}</strong></span>
      </div>
    </div>
  );
}
