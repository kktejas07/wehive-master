'use client';
import { useState, useRef, useEffect } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { Globe, MapPin, Plane, Star } from 'lucide-react';
import { Link } from 'react-router-dom';

export interface GlobeMarker {
  lat: number;
  lng: number;
  src?: string;
  label: string;
  flag?: string;
  visaType?: string;
  price?: string;
}

interface Globe3DProps {
  markers?: GlobeMarker[];
  autoRotateSpeed?: number;
  onMarkerClick?: (marker: GlobeMarker) => void;
  onMarkerHover?: (marker: GlobeMarker | null) => void;
}

const VISA_LOCATIONS = [
  { lat: 28.6139, lng: 77.209, label: 'India', flag: '🇮🇳', visaType: 'All Destinations' },
  { lat: 40.7128, lng: -74.006, label: 'USA', flag: '🇺🇸', visaType: 'Tourist/Business' },
  { lat: 51.5074, lng: -0.1278, label: 'UK', flag: '🇬🇧', visaType: 'Tourist/Student' },
  { lat: 35.6762, lng: 139.6503, label: 'Japan', flag: '🇯🇵', visaType: 'Tourist/Business' },
  { lat: -33.8688, lng: 151.2093, label: 'Australia', flag: '🇦🇺', visaType: 'Work/Holiday' },
  { lat: 48.8566, lng: 2.3522, label: 'France', flag: '🇫🇷', visaType: 'Schengen' },
  { lat: 25.2048, lng: 55.2708, label: 'UAE', flag: '🇦🇪', visaType: 'Transit/Tourist' },
  { lat: 1.3521, lng: 103.8198, label: 'Singapore', flag: '🇸🇬', visaType: 'Business/Tourist' },
  { lat: 37.5665, lng: 126.978, label: 'South Korea', flag: '🇰🇷', visaType: 'Tourist/K-ETA' },
  { lat: 52.52, lng: 13.405, label: 'Germany', flag: '🇩🇪', visaType: 'Schengen' },
];

function latLngToPosition(lat, lng, radius) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  return { x, y, z };
}

function Marker({ marker, radius, isHovered, onHover, onLeave, onClick }) {
  const { x, y, z } = latLngToPosition(marker.lat, marker.lng, radius);
  const scale = useTransform(isHovered ? 1 : 0, [0, 1], [1, 1.5]);

  return (
    <motion.div
      className="absolute cursor-pointer"
      style={{
        x,
        y,
        z,
        transform: `translate(-50%, -50%)`,
      }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.5, delay: Math.random() * 0.5 }}
      onMouseEnter={() => onHover(marker)}
      onMouseLeave={onLeave}
      onClick={() => onClick?.(marker)}
      whileHover={{ scale: 1.3 }}
    >
      <motion.div
        className="relative"
        animate={isHovered ? { scale: 1.2 } : { scale: 1 }}
      >
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-lg border-2 border-white transition-all duration-300 ${isHovered ? 'bg-[hsl(var(--accent))]' : 'bg-[hsl(var(--blue-700))]'}`}>
          {marker.flag ? (
            <span className="text-lg">{marker.flag}</span>
          ) : (
            <MapPin className="w-4 h-4 text-white" />
          )}
        </div>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 bg-white rounded-xl shadow-xl px-3 py-2 whitespace-nowrap z-50"
          >
            <div className="text-[12px] font-bold text-[hsl(var(--blue-900))]">{marker.label}</div>
            {marker.visaType && (
              <div className="text-[10px] text-[hsl(var(--blue-900))]/60">{marker.visaType}</div>
            )}
            <div className="absolute left-1/2 -translate-x-1/2 top-full w-2 h-2 bg-white transform rotate-45" />
          </motion.div>
        )}
        <span className="absolute inset-0 rounded-full animate-ping bg-[hsl(var(--accent))]/30 opacity-75" />
      </motion.div>
    </motion.div>
  );
}

export function Globe3D({
  markers = VISA_LOCATIONS,
  autoRotateSpeed = 0.5,
  onMarkerClick,
  onMarkerHover,
}: Globe3DProps) {
  const [hoveredMarker, setHoveredMarker] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);
  const rotationY = useMotionValue(0);
  const rotationX = useMotionValue(-15);

  const rotateYRange = [-180, 180];
  const rotateXRange = [-30, 30];

  useEffect(() => {
    if (!isDragging) {
      const controls = animate(rotationY, rotationY.get() + 360, {
        duration: 60 / autoRotateSpeed,
        ease: 'linear',
        repeat: Infinity,
      });
      return controls.stop;
    }
  }, [isDragging, autoRotateSpeed]);

  const handleMouseDown = () => setIsDragging(true);
  const handleMouseUp = () => setIsDragging(false);
  const handleMouseMove = (e) => {
    if (!isDragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const deltaX = (e.clientX - rect.left - rect.width / 2) / rect.width;
    const deltaY = (e.clientY - rect.top - rect.height / 2) / rect.height;
    rotationY.set(rotationY.get() + deltaX * 5);
    rotationX.set(Math.max(-30, Math.min(30, rotationX.get() - deltaY * 3)));
  };

  const handleMarkerHover = (marker) => {
    setHoveredMarker(marker);
    onMarkerHover?.(marker);
  };

  const handleMarkerLeave = () => {
    setHoveredMarker(null);
    onMarkerHover?.(null);
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full cursor-grab active:cursor-grabbing select-none"
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onMouseMove={handleMouseMove}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative w-64 h-64 sm:w-80 sm:h-80 lg:w-96 lg:h-96">
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              rotateY,
              rotateX,
              transformStyle: 'preserve-3d',
            }}
          >
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[hsl(var(--blue-700))] via-[hsl(var(--blue-500))] to-[hsl(var(--blue-900))] shadow-[0_0_60px_rgba(10,44,138,0.4)]" />
            <div className="absolute inset-0 rounded-full" style={{ transform: 'translateZ(10px)' }}>
              <svg viewBox="0 0 400 400" className="w-full h-full opacity-30">
                <ellipse cx="200" cy="200" rx="180" ry="180" fill="none" stroke="white" strokeWidth="0.5" />
                <ellipse cx="200" cy="200" rx="120" ry="180" fill="none" stroke="white" strokeWidth="0.5" />
                <ellipse cx="200" cy="200" rx="60" ry="180" fill="none" stroke="white" strokeWidth="0.5" />
                <line x1="20" y1="200" x2="380" y2="200" stroke="white" strokeWidth="0.5" />
                <line x1="200" y1="20" x2="200" y2="380" stroke="white" strokeWidth="0.5" />
                <ellipse cx="200" cy="200" rx="180" ry="60" fill="none" stroke="white" strokeWidth="0.5" />
                <ellipse cx="200" cy="200" rx="180" ry="120" fill="none" stroke="white" strokeWidth="0.3" />
              </svg>
            </div>
            <div
              className="absolute rounded-full"
              style={{
                background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.4) 0%, transparent 50%)',
                transform: 'translateZ(5px)',
              }}
            />
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: 'radial-gradient(circle at 70% 70%, rgba(0,0,0,0.3) 0%, transparent 50%)',
                transform: 'translateZ(-5px)',
              }}
            />
            {markers.map((marker, i) => (
              <Marker
                key={i}
                marker={marker}
                radius={90}
                isHovered={hoveredMarker === marker}
                onHover={handleMarkerHover}
                onLeave={handleMarkerLeave}
                onClick={onMarkerClick}
              />
            ))}
          </motion.div>
          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              boxShadow: 'inset 0 0 80px rgba(10,44,138,0.3)',
              transform: 'translateZ(-20px)',
            }}
          />
        </div>
      </div>
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[10px] text-white/50 flex items-center gap-1">
        <span>Drag to rotate</span>
        <span>·</span>
        <span>Click markers for details</span>
      </div>
    </div>
  );
}

export function Globe3DDemo() {
  const [selectedMarker, setSelectedMarker] = useState<GlobeMarker | null>(null);

  return (
    <Globe3D
      markers={VISA_LOCATIONS}
      autoRotateSpeed={0.3}
      onMarkerClick={(marker) => setSelectedMarker(marker)}
      onMarkerHover={(marker) => {
        if (marker) console.log('Hovering:', marker.label);
      }}
    />
  );
}

export default Globe3D;