import { useEffect, useState, type RefObject } from 'react';

const VB_W = 100;
const VB_H = 50;

export interface MapLayout {
  scale: number;
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
}

export function useMapLayout(containerRef: RefObject<HTMLElement | null>) {
  const [layout, setLayout] = useState<MapLayout>({
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    width: 0,
    height: 0,
  });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      const { width, height } = el.getBoundingClientRect();
      const scale = Math.min(width / VB_W, height / VB_H);
      const renderedW = VB_W * scale;
      const renderedH = VB_H * scale;
      setLayout({
        scale,
        offsetX: (width - renderedW) / 2,
        offsetY: (height - renderedH) / 2,
        width,
        height,
      });
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener('resize', update);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [containerRef]);

  const toPixels = (x: number, y: number) => ({
    left: layout.offsetX + x * layout.scale,
    top: layout.offsetY + y * layout.scale,
  });

  return { layout, toPixels };
}
