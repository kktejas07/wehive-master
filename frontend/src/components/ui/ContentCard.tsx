'use client';
import { motion } from 'framer-motion';
import { Clock, User } from 'lucide-react';
import { destination } from '../../lib/destinations';

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
  countryId?: string;
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
  countryId,
  accentColor = 'hsl(var(--blue-700))',
  className = '',
  onClick,
}: ContentCardProps) {

  const getCategoryColor = (cat?: string) => {
    const c = cat?.toLowerCase() || '';
    // One calm badge style for every category (no rainbow chips).
    return c ? 'bg-white text-[hsl(var(--blue-900))] border-white' : 'bg-white/90 text-[hsl(var(--blue-900))] border-white';
  };

  // Shared labels (lib/destinations): substring checks mislabelled e.g. "australia" as USA.
  const getCountryInfo = (cid?: string) => (cid ? { color: 'bg-[hsl(var(--blue-900))]/70', label: destination(cid).label } : null);

  const countryInfo = getCountryInfo(countryId);

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      onClick={onClick}
      className={`relative cursor-pointer overflow-hidden rounded-2xl border border-[hsl(var(--border))] shadow-sm hover:shadow-md transition-shadow duration-200 group ${className}`}
    >
      {/* Background Image */}
      <div
        className="absolute inset-0 h-full w-full bg-cover bg-center"
        style={{
          backgroundImage: imageUrl ? `url(${imageUrl})` : 'none',
          backgroundColor: imageUrl ? undefined : accentColor,
        }}
      />
      
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-[hsl(var(--blue-900))]/90 via-[hsl(var(--blue-900))]/45 to-[hsl(var(--blue-900))]/10" />
      
      {/* Hover Darken Overlay */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200" />

      {/* Content Container */}
      <div className="relative h-full flex flex-col justify-between p-5 sm:p-6 min-h-[280px] sm:min-h-[320px]">
        {/* Top Section - Badges */}
        <div className="mb-auto flex gap-2 flex-wrap">
          {category && (
            <span className={`inline-block px-3 py-1 rounded-full text-[12px] uppercase tracking-[0.1em] font-semibold border ${getCategoryColor(category)}`}>
              {category}
            </span>
          )}
          {countryInfo && (
            <span className={`inline-block px-3 py-1 rounded-full text-white text-[12px] uppercase tracking-[0.1em] font-semibold ${countryInfo.color}`}>
              {countryInfo.label}
            </span>
          )}
        </div>

        {/* Bottom Section - Author, Title, Description */}
        <div className="space-y-3">
          {/* Author Info */}
          {author && (
            <div className="flex items-center gap-3">
              {author.avatar ? (
                <img loading="lazy" decoding="async"
                  src={author.avatar}
                  alt={author.name}
                  className="h-10 w-10 rounded-full border-2 border-white/30 object-cover"
                />
              ) : (
                <div
                  className="h-10 w-10 rounded-full border-2 border-white/30 flex items-center justify-center bg-white/20"
                >
                  <span className="text-sm font-bold text-white">
                    {author.initials || author.name.charAt(0)}
                  </span>
                </div>
              )}
              <div>
                <p className="text-[13px] font-semibold text-white">{author.name}</p>
                {readTime && (
                  <div className="flex items-center gap-1 text-[12px] text-white/70">
                    <Clock className="w-3 h-3" />
                    <span>{readTime}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Title */}
          <h3 className="font-display font-bold text-[20px] sm:text-[22px] leading-tight tracking-[-0.01em] text-white">
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