import { useEffect, useState, useRef } from 'react';

const API_BASE = process.env.REACT_APP_BACKEND_URL || 'https://api.wehive.co.in';

export default function BlobImage({ filename, onR2, alt = '', className = '' }) {
  const [src, setSrc] = useState(null);
  const [loading, setLoading] = useState(true);
  const blobRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);

      if (!onR2) {
        setSrc(`/images/destinations/${filename}`);
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/api/admin/destinations/blob/${filename}`);
        if (!res.ok) throw new Error('Failed');
        const blob = await res.blob();
        if (cancelled) return;
        // Revoke previous blob URL
        if (blobRef.current) URL.revokeObjectURL(blobRef.current);
        const url = URL.createObjectURL(blob);
        blobRef.current = url;
        setSrc(url);
      } catch {
        if (!cancelled) setSrc(`/images/destinations/${filename}`);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
      if (blobRef.current) URL.revokeObjectURL(blobRef.current);
    };
  }, [filename, onR2]);

  if (loading || !src) {
    return <div className={`${className} bg-white/5 animate-pulse`} />;
  }

  return <img src={src} alt={alt} className={className} loading="lazy" />;
}
