import React, { useEffect, useRef, useMemo } from 'react';

const COLORS = ['#6aaa64', '#c9a84c', '#5b9bd5', '#e06c75', '#d4a5f5', '#f5a623', '#50c878'];
const COUNT = 70;

const rand = (min, max) => Math.random() * (max - min) + min;

const Confetti = ({ onDone }) => {
  const ref = useRef(null);

  const pieces = useMemo(() => Array.from({ length: COUNT }, (_, i) => ({
    id: i,
    left: rand(0, 100),
    delay: rand(0, 0.8),
    duration: rand(1.8, 3.0),
    size: rand(6, 11),
    color: COLORS[i % COLORS.length],
    rotate: rand(-180, 180),
    drift: rand(-60, 60),
    isRect: i % 3 !== 0,
  })), []);

  useEffect(() => {
    const t = setTimeout(() => {
      if (ref.current) ref.current.style.opacity = '0';
      setTimeout(() => onDone?.(), 400);
    }, 3000);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div
      ref={ref}
      className="fixed inset-0 pointer-events-none z-40 overflow-hidden"
      style={{ transition: 'opacity 0.4s ease' }}
      aria-hidden="true"
    >
      {pieces.map((p) => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            left: `${p.left}%`,
            top: '-12px',
            width: p.isRect ? `${p.size}px` : `${p.size * 0.85}px`,
            height: p.isRect ? `${p.size * 0.45}px` : `${p.size * 0.85}px`,
            borderRadius: p.isRect ? '2px' : '50%',
            backgroundColor: p.color,
            animation: `confettiFall ${p.duration}s ${p.delay}s ease-in forwards`,
            '--drift': `${p.drift}px`,
            '--rotate': `${p.rotate}deg`,
          }}
        />
      ))}
    </div>
  );
};

export default Confetti;
