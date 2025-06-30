import styles from '@/styles/SnakeGame.module.css';
import React, { useEffect, useRef, useState, type FC } from 'react';

interface Position {
  x: number;
  y: number;
}
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

const BOARD_SIZE = 30;
const INITIAL_SNAKE: Position[] = [
  { x: 8, y: 10 },
  { x: 7, y: 10 },
];
const INITIAL_DIRECTION: Direction = 'RIGHT';

function getRandomPosition(snake: Position[] = []): Position {
  let pos: Position;
  do {
    pos = {
      x: Math.floor(Math.random() * BOARD_SIZE),
      y: Math.floor(Math.random() * BOARD_SIZE),
    };
  } while (snake.some(s => s.x === pos.x && s.y === pos.y));
  return pos;
}

const SnakeGame: FC = () => {
  const [snake, setSnake] = useState<Position[]>(INITIAL_SNAKE);
  const [direction, setDirection] = useState<Direction>(INITIAL_DIRECTION);
  const [food, setFood] = useState<Position>(getRandomPosition(INITIAL_SNAKE));
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [level, setLevel] = useState<number>(1);
  const [speed, setSpeed] = useState<number>(180);
  const [highScore, setHighScore] = useState<number>(0);
  const moveRef = useRef<Direction>(direction);
  const speedRef = useRef<number>(speed);

  useEffect(() => {
    moveRef.current = direction;
  }, [direction]);
  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  useEffect(() => {
    const hs = Number(localStorage.getItem('snake-highscore') || 0);
    setHighScore(hs);
  }, []);

  useEffect(() => {
    if (gameOver) return;
    const interval = setInterval(() => {
      setSnake((prev: Position[]) => {
        const head = { ...prev[0] };
        switch (moveRef.current) {
          case 'UP': head.y -= 1; break;
          case 'DOWN': head.y += 1; break;
          case 'LEFT': head.x -= 1; break;
          case 'RIGHT': head.x += 1; break;
        }
        if (
          head.x < 0 || head.x >= BOARD_SIZE ||
          head.y < 0 || head.y >= BOARD_SIZE ||
          prev.some((segment: Position) => segment.x === head.x && segment.y === head.y)
        ) {
          setGameOver(true);
          if (score > highScore) {
            setHighScore(score);
            localStorage.setItem('snake-highscore', String(score));
          }
          return prev;
        }
        let newSnake = [head, ...prev];
        if (head.x === food.x && head.y === food.y) {
          setFood(getRandomPosition(newSnake));
          setScore((s: number) => s + 1);
        } else {
          newSnake.pop();
        }
        return newSnake;
      });
    }, speedRef.current);
    return () => clearInterval(interval);
  }, [food, gameOver, score, speed, highScore]);

  // Atualiza nível e velocidade
  useEffect(() => {
    // Sobe de nível a cada 3 pontos
    const newLevel = Math.min(1 + Math.floor(score / 3), 15);
    setLevel(newLevel);
    // Velocidade: nível 1 = 180ms, nível 15 = 50ms (mais rápido)
    const newSpeed = Math.max(180 - (newLevel - 1) * 10, 50);
    setSpeed(newSpeed);
  }, [score]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
      }
      switch (e.key) {
        case 'ArrowUp': if (direction !== 'DOWN') setDirection('UP'); break;
        case 'ArrowDown': if (direction !== 'UP') setDirection('DOWN'); break;
        case 'ArrowLeft': if (direction !== 'RIGHT') setDirection('LEFT'); break;
        case 'ArrowRight': if (direction !== 'LEFT') setDirection('RIGHT'); break;
      }
    };
    window.addEventListener('keydown', handleKey, { passive: false });
    return () => window.removeEventListener('keydown', handleKey);
  }, [direction]);

  // Touch controls para mobile
  useEffect(() => {
    let startX = 0, startY = 0;
    const handleTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    };
    const handleTouchEnd = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 20 && direction !== 'LEFT') setDirection('RIGHT');
        else if (dx < -20 && direction !== 'RIGHT') setDirection('LEFT');
      } else {
        if (dy > 20 && direction !== 'UP') setDirection('DOWN');
        else if (dy < -20 && direction !== 'DOWN') setDirection('UP');
      }
    };
    window.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchend', handleTouchEnd);
    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [direction]);

  const restart = () => {
    setSnake(INITIAL_SNAKE);
    setDirection(INITIAL_DIRECTION);
    setFood(getRandomPosition(INITIAL_SNAKE));
    setGameOver(false);
    setScore(0);
    setLevel(1);
    setSpeed(180);
  };

  // Mouse controls: arraste para direcionar (React handlers para máxima compatibilidade)
  const mouseDownRef = useRef(false);
  const startPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Mouse: virar apenas movendo o mouse (sem clicar)
  // Controle de mouse realmente fluido: basta mover o mouse
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const lastDirRef = useRef<Direction | null>(null);
  const MOUSE_TURN_THRESHOLD = 16; // px mínimo para virar
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!lastPosRef.current) {
      lastPosRef.current = { x: e.clientX, y: e.clientY };
      lastDirRef.current = null;
      return;
    }
    const dx = e.clientX - lastPosRef.current.x;
    const dy = e.clientY - lastPosRef.current.y;
    let newDir: Direction | null = null;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > MOUSE_TURN_THRESHOLD) {
      if (dx > 0 && moveRef.current !== 'LEFT') newDir = 'RIGHT';
      else if (dx < 0 && moveRef.current !== 'RIGHT') newDir = 'LEFT';
    } else if (Math.abs(dy) > MOUSE_TURN_THRESHOLD) {
      if (dy > 0 && moveRef.current !== 'UP') newDir = 'DOWN';
      else if (dy < 0 && moveRef.current !== 'DOWN') newDir = 'UP';
    }
    if (newDir && newDir !== moveRef.current && newDir !== lastDirRef.current) {
      setDirection(newDir);
      lastDirRef.current = newDir;
      lastPosRef.current = { x: e.clientX, y: e.clientY };
    } else if (Math.abs(dx) > MOUSE_TURN_THRESHOLD || Math.abs(dy) > MOUSE_TURN_THRESHOLD) {
      // Atualiza a posição de referência se o mouse "passou" do limiar, mesmo sem virar
      lastPosRef.current = { x: e.clientX, y: e.clientY };
      lastDirRef.current = null;
    }
  };

  const handleMouseLeave = () => {
    lastPosRef.current = null;
    lastDirRef.current = null;
  };

  return (
    <div className={styles['snake-wrapper']}>
      <div className={styles['snake-row']}>
        <div className={styles['snake-colLeft']}>
          <h2 className={styles['snake-title']}>Jogo da Cobrinha</h2>
          <div className={styles['snake-pontuacao']}>Pontuação: {score}</div>
          <div className={styles['snake-recorde']}>Recorde: {highScore}</div>
          <div className={styles['snake-nivel']}>Nível: {level}</div>
        </div>
        <div className={styles['snake-colCenter']}>
          <div
            className={styles['snake-board'] + ' ' + styles['snake-board-cursor']}
            style={{
              gridTemplateRows: `repeat(${BOARD_SIZE}, 1fr)`,
              gridTemplateColumns: `repeat(${BOARD_SIZE}, 1fr)`,
              cursor: 'crosshair',
              width: '100%',
              maxWidth: 600,
              height: 600,
              outline: 'none',
              userSelect: 'none',
              MozUserSelect: 'none',
              WebkitUserSelect: 'none',
              msUserSelect: 'none',
            }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            tabIndex={0}
            role="application"
            aria-label={`Campo do jogo da cobrinha. Use as setas do teclado para jogar. Pontuação: ${score}. Nível: ${level}. Recorde: ${highScore}.`}
            aria-live="polite"
            aria-describedby="snake-instructions"
            onFocus={(e: React.FocusEvent<HTMLDivElement>) => { e.currentTarget.style.outline = '2px solid #0ff'; }}
            onBlur={(e: React.FocusEvent<HTMLDivElement>) => { e.currentTarget.style.outline = 'none'; }}
          >
            <span id="snake-instructions" style={{position: 'absolute', left: '-9999px'}}>
              Jogo da cobrinha. Use as setas do teclado para controlar. Use o mouse para virar a cobrinha movendo o ponteiro. Pressione Tab para focar o campo do jogo.
            </span>
            {[...Array(BOARD_SIZE * BOARD_SIZE)].map((_, i) => {
              const x = i % BOARD_SIZE;
              const y = Math.floor(i / BOARD_SIZE);
              const isHead = snake[0].x === x && snake[0].y === y;
              const isBody = !isHead && snake.some((s: Position) => s.x === x && s.y === y);
              const isFood = food.x === x && food.y === y;
              return (
                <div
                  key={i}
                  className={
                    isHead
                      ? styles['snake-head']
                      : isBody
                      ? styles['snake-body']
                      : isFood
                      ? styles['snake-food']
                      : styles['snake-cell']
                  }
                />
              );
            })}
          </div>
          <div className={styles['snake-controls']}>
            <button
              className={styles['snake-restart']}
              onClick={restart}
              disabled={!gameOver && score === 0}
            >
              Reiniciar
            </button>
          </div>
        </div>
        <div className={styles['snake-colRight']}>
          {gameOver && (
            <h3 className={styles['snake-gameover']}>Game Over!</h3>
          )}
        </div>
      </div>
    </div>
  );
};

export default SnakeGame;
