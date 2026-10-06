import React, { useState, useEffect } from 'react';
import { X, Monitor, Smartphone, ExternalLink, Sparkles, ArrowRight } from 'lucide-react';
import { resolveImageUrl } from '../../../utils/imageUrl';

export default function BannerPreviewModal({ banner, isOpen, onClose }) {
  const [viewMode, setViewMode] = useState('desktop'); // 'desktop' | 'mobile'

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !banner) return null;

  const desktopImgUrl = resolveImageUrl(banner.image || banner.desktop_image);
  const mobileImgUrl = resolveImageUrl(banner.mobile_image || banner.image || banner.desktop_image);

  return (
    <div className="bnr-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="bnr-modal" style={{ maxWidth: '960px' }} onClick={(e) => e.stopPropagation()}>
        <div className="bnr-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h3 style={{ margin: 0 }}>Banner Preview</h3>
            <span style={{ fontSize: '12px', padding: '3px 8px', borderRadius: '6px', background: '#F1F5F9', color: '#475569', fontWeight: 600 }}>
              {banner.position || 'HOMEPAGE_HERO'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* View Mode Toggle */}
            <div style={{ display: 'flex', background: '#F1F5F9', padding: '3px', borderRadius: '8px', gap: '4px' }}>
              <button
                type="button"
                className="bnr-btn bnr-btn-sm"
                style={{
                  background: viewMode === 'desktop' ? '#FFFFFF' : 'transparent',
                  color: viewMode === 'desktop' ? 'var(--bnr-primary)' : 'var(--bnr-text-muted)',
                  boxShadow: viewMode === 'desktop' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  border: 'none',
                  padding: '4px 10px'
                }}
                onClick={() => setViewMode('desktop')}
              >
                <Monitor size={14} />
                <span>Desktop</span>
              </button>

              <button
                type="button"
                className="bnr-btn bnr-btn-sm"
                style={{
                  background: viewMode === 'mobile' ? '#FFFFFF' : 'transparent',
                  color: viewMode === 'mobile' ? 'var(--bnr-primary)' : 'var(--bnr-text-muted)',
                  boxShadow: viewMode === 'mobile' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  border: 'none',
                  padding: '4px 10px'
                }}
                onClick={() => setViewMode('mobile')}
              >
                <Smartphone size={14} />
                <span>Mobile</span>
              </button>
            </div>

            <button className="bnr-modal-close" onClick={onClose} aria-label="Close preview">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="bnr-modal-body" style={{ backgroundColor: '#F8FAFC', padding: '32px' }}>
          {viewMode === 'desktop' ? (
            /* Desktop Mockup */
            <div className="bnr-preview-desktop">
              {/* Browser mockup header */}
              <div style={{ background: '#E2E8F0', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#EF4444' }}></span>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#F59E0B' }}></span>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10B981' }}></span>
                <span style={{ marginLeft: '12px', fontSize: '11px', color: '#64748B', fontFamily: 'monospace' }}>
                  https://medicareplus.com{banner.button_url || '/shop'}
                </span>
              </div>

              {/* Banner presentation */}
              <div
                style={{
                  position: 'relative',
                  minHeight: '360px',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '40px 48px',
                  overflow: 'hidden',
                  background: '#0F172A'
                }}
              >
                {/* Background image */}
                <img
                  src={desktopImgUrl}
                  alt={banner.title}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    opacity: 0.88
                  }}
                />

                {/* Subtle gradient overlay for readability */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(90deg, rgba(15,23,42,0.85) 0%, rgba(15,23,42,0.45) 55%, transparent 100%)'
                  }}
                />

                {/* Overlay Text Content */}
                <div style={{ position: 'relative', zIndex: 2, maxWidth: '520px', color: '#FFFFFF' }}>
                  {banner.badge && (
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 12px',
                        borderRadius: '999px',
                        background: 'rgba(8, 127, 115, 0.9)',
                        color: '#FFFFFF',
                        fontSize: '11px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        marginBottom: '14px'
                      }}
                    >
                      <Sparkles size={12} />
                      <span>{banner.badge}</span>
                    </div>
                  )}

                  <h2 style={{ fontSize: '32px', fontWeight: 800, margin: '0 0 10px 0', lineHeight: 1.15 }}>
                    {banner.title}
                  </h2>

                  {banner.subtitle && (
                    <p style={{ fontSize: '18px', fontWeight: 500, margin: '0 0 12px 0', color: '#93C5FD' }}>
                      {banner.subtitle}
                    </p>
                  )}

                  {banner.description && (
                    <p style={{ fontSize: '13px', margin: '0 0 20px 0', color: '#E2E8F0', lineHeight: 1.5 }}>
                      {banner.description}
                    </p>
                  )}

                  {banner.button_text && (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 22px',
                        background: 'var(--bnr-primary)',
                        color: '#FFFFFF',
                        borderRadius: '6px',
                        fontWeight: 700,
                        fontSize: '13px',
                        letterSpacing: '0.03em'
                      }}
                    >
                      <span>{banner.button_text}</span>
                      <ArrowRight size={14} />
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Mobile Device Mockup */
            <div className="bnr-preview-mobile">
              {/* Notch */}
              <div style={{ height: '20px', background: '#1E293B', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <span style={{ width: '60px', height: '6px', background: '#334155', borderRadius: '10px' }}></span>
              </div>

              {/* Mobile Banner Content */}
              <div style={{ position: 'relative', minHeight: '380px', background: '#0F172A', overflow: 'hidden' }}>
                <img
                  src={mobileImgUrl}
                  alt={banner.title}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    opacity: 0.85
                  }}
                />

                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(180deg, rgba(15,23,42,0.2) 0%, rgba(15,23,42,0.85) 100%)'
                  }}
                />

                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    padding: '24px 20px',
                    color: '#FFFFFF',
                    zIndex: 2
                  }}
                >
                  {banner.badge && (
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        background: 'var(--bnr-primary)',
                        fontSize: '10px',
                        fontWeight: 700,
                        marginBottom: '8px'
                      }}
                    >
                      {banner.badge}
                    </span>
                  )}

                  <h3 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 6px 0', lineHeight: 1.2 }}>
                    {banner.title}
                  </h3>

                  {banner.subtitle && (
                    <p style={{ fontSize: '13px', margin: '0 0 14px 0', color: '#E2E8F0' }}>
                      {banner.subtitle}
                    </p>
                  )}

                  {banner.button_text && (
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '100%',
                        padding: '10px',
                        background: 'var(--bnr-primary)',
                        color: '#FFFFFF',
                        borderRadius: '6px',
                        fontWeight: 700,
                        fontSize: '12px'
                      }}
                    >
                      {banner.button_text}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Details below mockup */}
          <div
            style={{
              marginTop: '20px',
              padding: '16px',
              background: '#FFFFFF',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
              fontSize: '13px'
            }}
          >
            <div>
              <span style={{ color: 'var(--bnr-text-muted)' }}>Target Route: </span>
              <strong style={{ fontFamily: 'monospace', color: 'var(--bnr-primary)' }}>
                {banner.button_url || '/shop'}
              </strong>
              {banner.open_new_tab && (
                <span style={{ marginLeft: '8px', fontSize: '11px', color: '#64748B' }}>
                  (Opens in new tab)
                </span>
              )}
            </div>

            <div>
              <span style={{ color: 'var(--bnr-text-muted)' }}>Sort Priority: </span>
              <strong>#{banner.sort_order || 1}</strong>
            </div>
          </div>
        </div>

        <div className="bnr-modal-footer">
          <button type="button" className="bnr-btn bnr-btn-secondary" onClick={onClose}>
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
}
