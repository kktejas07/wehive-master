import { useState, useEffect } from 'react';

const BP = {
  xs:  { max: 480  },
  sm:  { min: 480,  max: 768  },
  md:  { min: 768,  max: 1024 },
  lg:  { min: 1024, max: 1440 },
  xl:  { min: 1440, max: 1920 },
  xxl: { min: 1920 },
};

function compute(w) {
  if (w < 480)  return { bp: 'xs',  sidebarWidth: 0,   contentMax: null,   textScale: 0.96, gutter: 16, iconSize: 16, buttonHeight: 36, touchTarget: 44, showSidebar: false, iconOnly: false };
  if (w < 768)  return { bp: 'sm',  sidebarWidth: 0,   contentMax: null,   textScale: 1.0,  gutter: 22, iconSize: 18, buttonHeight: 40, touchTarget: 44, showSidebar: false, iconOnly: false };
  if (w < 1024) return { bp: 'md',  sidebarWidth: 64,  contentMax: null,   textScale: 1.0,  gutter: 28, iconSize: 18, buttonHeight: 40, touchTarget: 44, showSidebar: true,  iconOnly: true  };
  if (w < 1440) return { bp: 'lg',  sidebarWidth: 230, contentMax: null,   textScale: 1.08, gutter: 32, iconSize: 20, buttonHeight: 40, touchTarget: 40, showSidebar: true,  iconOnly: false };
  if (w < 1920) return { bp: 'xl',  sidebarWidth: 260, contentMax: 1100,   textScale: 1.08, gutter: 40, iconSize: 20, buttonHeight: 40, touchTarget: 40, showSidebar: true,  iconOnly: false };
  return         { bp: 'xxl', sidebarWidth: 260, contentMax: 1280,   textScale: 1.18, gutter: 40, iconSize: 22, buttonHeight: 44, touchTarget: 40, showSidebar: true,  iconOnly: false };
}

export function useResponsive() {
  const [layout, setLayout] = useState(() => compute(window.innerWidth));

  useEffect(() => {
    const handler = () => setLayout(compute(window.innerWidth));
    window.addEventListener('resize', handler, { passive: true });
    return () => window.removeEventListener('resize', handler);
  }, []);

  return layout;
}

export { BP };
