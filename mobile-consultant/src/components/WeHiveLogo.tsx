import React from "react";

interface WeHiveLogoProps {
  size?: "sm" | "md" | "lg" | "xl" | "custom";
  showTagline?: boolean;
  theme?: "light" | "dark" | "white";
  className?: string;
  iconOnly?: boolean;
}

export default function WeHiveLogo({
  size = "md",
  showTagline = false,
  theme = "light",
  className = "",
  iconOnly = false,
}: WeHiveLogoProps) {
  // Height configurations
  const sizes = {
    sm: { height: "h-6", text: "text-sm", tagline: "text-[6px]", gap: "gap-1.5" },
    md: { height: "h-8", text: "text-lg", tagline: "text-[8px]", gap: "gap-2" },
    lg: { height: "h-12", text: "text-2xl", tagline: "text-[10px]", gap: "gap-3" },
    xl: { height: "h-16", text: "text-4xl", tagline: "text-xs", gap: "gap-4" },
    custom: { height: "", text: "", tagline: "", gap: "" },
  };

  const selectedSize = sizes[size];

  // Color configurations
  // The official logo text color is a deep royal blue, and the wing is a bright red.
  // In light theme: Blue text (#001CB8), Red wing (#EA1C24)
  // In dark theme: Slate-200 text, Red wing (#EA1C24)
  // In white theme: All white (for dark banners)
  const textColors = {
    light: {
      blueText: "text-[#001CB8] font-black tracking-wider",
      taglineText: "text-slate-500 font-medium tracking-widest uppercase",
    },
    dark: {
      blueText: "text-slate-100 font-black tracking-wider",
      taglineText: "text-slate-400 font-medium tracking-widest uppercase",
    },
    white: {
      blueText: "text-white font-black tracking-wider",
      taglineText: "text-blue-100/80 font-medium tracking-widest uppercase",
    },
  };

  const colors = textColors[theme];

  // Tail Wing SVG component with masking for a real transparent cutout of the plane
  const renderWing = () => {
    // Generate a unique ID for the mask to prevent collisions on the page
    const maskId = `wing-mask-${size}-${theme}`;
    const wingColor = theme === "white" ? "#ffffff" : "#EA1C24";

    return (
      <svg
        className={`${selectedSize.height} aspect-square shrink-0`}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <mask id={maskId}>
            {/* Everything white stays */}
            <rect x="0" y="0" width="100" height="100" fill="#ffffff" />
            
            {/* Black cuts out */}
            {/* Elegant swoop from bottom right up to airplane tail */}
            <path
              d="M 92,85 C 80,85 71,83 67,73 C 63,65 63,59 63,57 C 65,57 66,58 68,60 C 71,64 77,73 92,75 Z"
              fill="#000000"
            />
            
            {/* Airplane shape cutout rotated at 45deg */}
            <g transform="translate(76, 46) rotate(45)">
              <path
                d="M 0,-18 C 1.5,-18 3,-16 3,-12 L 3,12 C 3,15 0,18 0,18 C 0,18 -3,15 -3,12 L -3,-12 C -3,-16 -1.5,-18 0,-18 Z"
                fill="#000000"
              />
              <path
                d="M 0,-4 L 18,10 C 18,10 16,11 15,11 L 3,4 L 3,12 L 8,15 L 8,17 L 0,15 L -8,17 L -8,15 L -3,12 L -3,4 L -15,11 C -16,11 -18,10 -18,10 Z"
                fill="#000000"
              />
            </g>
          </mask>
        </defs>

        {/* Base red wing shape masked */}
        <path
          d="M 15,80 C 35,65 55,42 75,20 L 95,20 C 98,20 98,22 98,25 L 98,80 C 98,83 95,85 92,85 L 15,85 Z"
          fill={wingColor}
          mask={`url(#${maskId})`}
        />
      </svg>
    );
  };

  if (iconOnly) {
    return (
      <img 
        src="/favicon.png" 
        alt="WeHive Icon" 
        className={`object-contain ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div className={`inline-flex flex-col items-center justify-center ${className}`}>
      <img 
        src="/wehive-logo.png" 
        alt="WeHive Logo" 
        className="object-contain"
        style={{ height: size * 1.5 }} // Adjust height proportionally
      />
      {/* Subtitle / Tagline below */}
      {showTagline && (
        <span
          className={`mt-2 font-mono tracking-widest text-center uppercase block font-semibold ${colors.taglineText} ${selectedSize.tagline}`}
        >
          Your Global Journey Starts Here
        </span>
      )}
    </div>
  );
}
