'use client';
import { useRef, useState, useEffect } from 'react';

interface GlowingEffectProps {
  blur?: number;
  borderWidth?: number;
  spread?: number;
  glow?: boolean;
  disabled?: boolean;
  proximity?: number;
  inactiveZone?: number;
  color?: string;
}

export function GlowingEffect({
  blur = 20,
  borderWidth = 1,
  spread = 30,
  glow = true,
  disabled = false,
  proximity = 64,
  inactiveZone = 0.05,
  color,
}: GlowingEffectProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const defaultColor = 'hsl(var(--accent))';
  const glowColor = color || defaultColor;

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!ref.current || disabled) return;

      const rect = ref.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const distX = Math.abs(e.clientX - centerX);
      const distY = Math.abs(e.clientY - centerY);
      const distance = Math.sqrt(distX * distX + distY * distY);

      const maxDist = Math.max(rect.width, rect.height) / 2 + proximity;

      if (distance < maxDist) {
        const normalizedDist = distance / maxDist;
        if (normalizedDist < inactiveZone) {
          setPosition({ x: 0, y: 0 });
          setIsHovered(false);
        } else {
          const newX = ((e.clientX - rect.left) / rect.width) * 100;
          const newY = ((e.clientY - rect.top) / rect.height) * 100;
          setPosition({ x: newX, y: newY });
          setIsHovered(true);
        }
      } else {
        setPosition({ x: 0, y: 0 });
        setIsHovered(false);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [disabled, proximity, inactiveZone]);

  if (disabled) return null;

  return (
    <div
      ref={ref}
      className="pointer-events-none absolute inset-0 rounded-2xl overflow-hidden"
      style={{
        maskImage: 'radial-gradient(ellipse 60% 50% at 50% 50%, black 40%, transparent 100%)',
        WebkitMaskImage: 'radial-gradient(ellipse 60% 50% at 50% 50%, black 40%, transparent 100%)',
      }}
    >
      {glow && isHovered && (
        <>
          <div
            className="absolute transition-opacity duration-300 ease-out"
            style={{
              left: `${position.x}%`,
              top: `${position.y}%`,
              width: '200px',
              height: '200px',
              transform: 'translate(-50%, -50%)',
              background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
              filter: `blur(${blur}px)`,
              opacity: 0.4,
            }}
          />
          <div
            className="absolute transition-opacity duration-300 ease-out"
            style={{
              left: `${position.x}%`,
              top: `${position.y}%`,
              width: '100px',
              height: '100px',
              transform: 'translate(-50%, -50%)',
              background: `radial-gradient(circle, white 0%, transparent 70%)`,
              filter: `blur(${blur / 2}px)`,
              opacity: 0.3,
            }}
          />
        </>
      )}
    </div>
  );
}