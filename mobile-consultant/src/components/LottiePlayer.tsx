import React, { useEffect, useRef, useState } from "react";
import lottie from "lottie-web";

interface LottiePlayerProps {
  url: string;
  loop?: boolean;
  autoplay?: boolean;
  className?: string;
  fallbackIcon?: React.ReactNode;
}

export default function LottiePlayer({
  url,
  loop = true,
  autoplay = true,
  className = "",
  fallbackIcon
}: LottiePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let anim: any = null;
    setIsLoading(true);
    setHasError(false);

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load animation");
        return res.json();
      })
      .then((data) => {
        if (!containerRef.current) return;
        
        // Clear any previous children just in case
        if (containerRef.current) {
          containerRef.current.innerHTML = "";
        }

        const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        anim = lottie.loadAnimation({
          container: containerRef.current,
          renderer: "svg",
          // Honour the OS "reduce motion" setting: show a still first frame instead.
          loop: loop && !reduceMotion,
          autoplay: autoplay && !reduceMotion,
          animationData: data,
        });
        setIsLoading(false);
      })
      .catch((err) => {
        console.warn("Lottie loading failed, using fallback:", err);
        setHasError(true);
        setIsLoading(false);
      });

    return () => {
      if (anim) {
        anim.destroy();
      }
    };
  }, [url, loop, autoplay]);

  if (hasError) {
    return <div className={className}>{fallbackIcon}</div>;
  }

  return (
    <div className={`relative flex items-center justify-center ${className}`} id="lottie-container-wrapper">
      {isLoading && fallbackIcon && (
        <div className="absolute inset-0 flex items-center justify-center">
          {fallbackIcon}
        </div>
      )}
      <div ref={containerRef} className="w-full h-full" id="lottie-renderer" />
    </div>
  );
}
