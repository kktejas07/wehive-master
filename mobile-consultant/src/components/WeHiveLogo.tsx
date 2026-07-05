import React from "react";

interface WeHiveLogoProps {
  size?: "sm" | "md" | "lg" | "xl" | "custom";
  showTagline?: boolean;
  theme?: "light" | "dark" | "white";
  className?: string;
  iconOnly?: boolean;
}

const sizeMap = {
  sm: { w: 28, tagline: "text-[6px]" },
  md: { w: 36, tagline: "text-[8px]" },
  lg: { w: 52, tagline: "text-[10px]" },
  xl: { w: 72, tagline: "text-xs" },
  custom: { w: 0, tagline: "" },
};

export default function WeHiveLogo({
  size = "md",
  showTagline = false,
  theme = "light",
  className = "",
  iconOnly = false,
}: WeHiveLogoProps) {
  const s = sizeMap[size];

  const taglineColors: Record<string, string> = {
    light: "text-slate-500",
    dark: "text-slate-400",
    white: "text-blue-100/80",
  };

  const filter = theme === "white" ? "brightness(0) invert(1)" : undefined;

  if (iconOnly) {
    return (
      <div className={`inline-flex items-center justify-center ${className}`}>
        <img
          src="/wehive-logo.png"
          alt="WeHive"
          className="shrink-0"
          style={{ width: s.w, height: s.w, objectFit: "contain", filter }}
        />
      </div>
    );
  }

  return (
    <div className={`inline-flex flex-col items-center justify-center ${className}`}>
      <img
        src="/wehive-logo.png"
        alt="WeHive"
        className="shrink-0"
        style={{ width: s.w, height: s.w, objectFit: "contain", filter }}
      />
      {showTagline && (
        <span
          className={`mt-1 font-mono tracking-widest text-center uppercase block font-semibold ${taglineColors[theme]} ${s.tagline}`}
        >
          Your Global Journey Starts Here
        </span>
      )}
    </div>
  );
}
