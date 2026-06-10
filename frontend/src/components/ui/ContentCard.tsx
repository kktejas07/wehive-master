'use client';
import { motion } from 'framer-motion';
import { Clock, User } from 'lucide-react';

interface ContentCardProps {
  imageUrl?: string;
  title: string;
  description?: string;
  author?: {
    name: string;
    avatar?: string;
    initials?: string;
  };
  readTime?: string;
  category?: string;
  accentColor?: string;
  className?: string;
  onClick?: () => void;
}

export function ContentCard({
  imageUrl,
  title,
  description,
  author,
  readTime,
  category,
  accentColor = 'hsl(var(--blue-700))',
  className = '',
  onClick,
}: ContentCardProps) {
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ duration: 0.25 }}
      onClick={onClick}
      className={`relative cursor-pointer overflow-hidden rounded-2xl shadow-lg group ${className}`}
    >
      {/* Background Image */}
      <div
        className="absolute inset-0 h-full w-full bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
        style={{
          backgroundImage: imageUrl ? `url(${imageUrl})` : 'none',
          backgroundColor: imageUrl ? undefined : accentColor,
        }}
      />
      
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />
      
      {/* Hover Darken Overlay */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-300" />

      {/* Content Container */}
      <div className="relative h-full flex flex-col justify-between p-5 sm:p-6 min-h-[280px] sm:min-h-[320px]">
        {/* Top Section - Category Badge */}
        {category && (
          <div className="mb-auto">
            <span className="inline-block px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-white text-[10px] uppercase tracking-[0.14em] font-bold">
              {category}
            </span>
          </div>
        )}

        {/* Bottom Section - Author, Title, Description */}
        <div className="space-y-3">
          {/* Author Info */}
          {author && (
            <div className="flex items-center gap-3">
              {author.avatar ? (
                <img
                  src={author.avatar}
                  alt={author.name}
                  className="h-10 w-10 rounded-full border-2 border-white/30 object-cover"
                />
              ) : (
                <div
                  className="h-10 w-10 rounded-full border-2 border-white/30 flex items-center justify-center bg-white/20 backdrop-blur-sm"
                >
                  <span className="text-sm font-bold text-white">
                    {author.initials || author.name.charAt(0)}
                  </span>
                </div>
              )}
              <div>
                <p className="text-[13px] font-semibold text-white">{author.name}</p>
                {readTime && (
                  <div className="flex items-center gap-1 text-[11px] text-white/70">
                    <Clock className="w-3 h-3" />
                    <span>{readTime}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Title */}
          <h3 className="font-display font-extrabold text-[20px] sm:text-[22px] leading-tight tracking-tight text-white">
            {title}
          </h3>

          {/* Description */}
          {description && (
            <p className="text-[13px] sm:text-[14px] text-white/80 leading-relaxed line-clamp-2">
              {description}
            </p>
          )}
        </div>
      </div>

      {/* Glow Effect on Hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            boxShadow: `inset 0 0 60px -20px ${accentColor}`,
          }}
        />
      </div>
    </motion.div>
  );
}

export function ContentCardGrid({ children, className = '' }) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 ${className}`}>
      {children}
    </div>
  );
}

export function ContentCardSkeleton() {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-[hsl(var(--soft-bg))] animate-pulse min-h-[280px]">
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
    </div>
  );
}