import React, { useState } from 'react';
import { Package } from 'lucide-react';

export default function ProductThumbnail({ image, name, size = 48, className = '' }) {
  const [hasError, setHasError] = useState(false);

  // Resolve image URL
  const resolveSrc = (img) => {
    if (!img || hasError) return null;
    if (img.startsWith('http://') || img.startsWith('https://') || img.startsWith('data:') || img.startsWith('blob:')) {
      return img;
    }
    const cleanImg = img.startsWith('/') ? img.slice(1) : img;
    // Prefer Vite public path or backend uploads
    if (cleanImg.startsWith('uploads/')) {
      return `/${cleanImg}`;
    }
    // Fallback to backend API base
    const apiBase = import.meta.env.VITE_API_URL 
      ? import.meta.env.VITE_API_URL.replace('/api/index.php', '') 
      : 'http://localhost:8080/pharmacy_api';
    return `${apiBase}/${cleanImg}`;
  };

  const finalSrc = resolveSrc(image);

  if (!finalSrc || hasError) {
    return (
      <div 
        className={`product-thumb-placeholder ${className}`}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          minWidth: `${size}px`,
          borderRadius: '10px',
          background: 'linear-gradient(135deg, #E6F7F5 0%, #D1F2EE 100%)',
          color: '#087F73',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid #C0EBE6',
          boxShadow: '0 1px 3px rgba(8, 127, 115, 0.08)'
        }}
        title={name || 'Product'}
        aria-label={name || 'Product'}
      >
        <Package size={Math.round(size * 0.46)} strokeWidth={2} />
      </div>
    );
  }

  return (
    <div 
      className={`product-thumb-container ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        minWidth: `${size}px`,
        borderRadius: '10px',
        overflow: 'hidden',
        border: '1px solid #E2E8F0',
        backgroundColor: '#FFFFFF',
        position: 'relative'
      }}
    >
      <img
        src={finalSrc}
        alt={name || 'Product'}
        loading="lazy"
        onError={() => setHasError(true)}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block'
        }}
      />
    </div>
  );
}
