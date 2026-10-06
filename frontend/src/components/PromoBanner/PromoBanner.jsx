import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, ShieldCheck, Truck, Leaf, Award, Tag } from 'lucide-react';
import api from '../../services/api';
import { resolveImageUrl } from '../../utils/imageUrl';
import wellnessShowcaseImg from '../../assets/images/wellness-showcase.jpg';
import './PromoBanner.css';

export default function PromoBanner() {
  const [promoBanner, setPromoBanner] = useState(null);

  useEffect(() => {
    let isMounted = true;
    api.getBanners('PROMOTIONAL_BANNER')
      .then(res => {
        if (isMounted && res.data && res.data.success && Array.isArray(res.data.data?.banners) && res.data.data.banners.length > 0) {
          setPromoBanner(res.data.data.banners[0]);
        }
      })
      .catch(err => {
        console.error('Failed to load promotional banner:', err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const title = promoBanner?.title || 'Vitality & Wellness';
  const subtitle = promoBanner?.subtitle || 'Up To 25% Off';
  const description = promoBanner?.description || 'Elevate your daily health with certified vitamins, pure dietary supplements, herbal nutrition, and everyday medical care delivered safely to your doorstep.';
  const badgeText = promoBanner?.badge || 'SPECIAL HEALTHCARE OFFER';
  const buttonText = promoBanner?.button_text || 'Shop Wellness Now';
  const targetUrl = promoBanner?.button_url || promoBanner?.target_url || '/category/health-wellness';
  const isExternal = targetUrl.startsWith('http://') || targetUrl.startsWith('https://');
  const bannerImg = promoBanner?.image ? resolveImageUrl(promoBanner.image, wellnessShowcaseImg) : wellnessShowcaseImg;

  return (
    <section className="classy-promo-section section-padding" aria-label="Special Promotional Offer">
      {/* Background Ambient Glows */}
      <div className="promo-ambient-mesh" aria-hidden="true">
        <div className="mesh-glow mesh-glow-1" />
        <div className="mesh-glow mesh-glow-2" />
        <span className="floating-cross floating-cross-1">+</span>
        <span className="floating-cross floating-cross-2">+</span>
      </div>

      <div className="container">
        <div className="classy-promo-card">
          {/* Shimmer Sweep Effect */}
          <div className="classy-shine-sweep" aria-hidden="true" />

          {/* Left Content Side */}
          <div className="promo-left-pane">
            {/* Pill Tag */}
            <div className="promo-pill-tag">
              <span className="pulse-dot" />
              <Sparkles size={14} className="tag-sparkle" />
              <span>{badgeText}</span>
            </div>

            {/* Headline */}
            <h2 className="promo-headline">
              {title} <br />
              <span className="headline-highlight">{subtitle}</span>
            </h2>

            {/* Subtitle / Description */}
            <p className="promo-subtext">
              {description}
            </p>

            {/* Coupon & CTA Row */}
            <div className="promo-action-row">
              {isExternal ? (
                <a
                  href={targetUrl}
                  target={promoBanner?.open_new_tab ? '_blank' : '_self'}
                  rel="noopener noreferrer"
                  className="btn-classy-primary"
                  aria-label={`Shop with promotion: ${title}`}
                >
                  <span>{buttonText}</span>
                  <ArrowRight size={18} className="btn-arrow-icon" />
                </a>
              ) : (
                <Link 
                  to={targetUrl} 
                  target={promoBanner?.open_new_tab ? '_blank' : '_self'}
                  className="btn-classy-primary"
                  aria-label={`Shop with promotion: ${title}`}
                >
                  <span>{buttonText}</span>
                  <ArrowRight size={18} className="btn-arrow-icon" />
                </Link>
              )}

              <div className="promo-coupon-badge">
                <Tag size={14} className="coupon-icon" />
                <span className="coupon-label">USE CODE:</span>
                <strong className="coupon-code">WELLNESS25</strong>
              </div>
            </div>

            {/* Trust Perks Bar */}
            <div className="promo-perks-bar">
              <div className="perk-capsule">
                <Leaf size={14} className="perk-icon" />
                <span>100% Genuine</span>
              </div>
              <div className="perk-capsule">
                <ShieldCheck size={14} className="perk-icon" />
                <span>Pharmacist Verified</span>
              </div>
              <div className="perk-capsule">
                <Truck size={14} className="perk-icon" />
                <span>Express Delivery</span>
              </div>
              <div className="perk-capsule">
                <Award size={14} className="perk-icon" />
                <span>Best Price Guarantee</span>
              </div>
            </div>
          </div>

          {/* Right Visual Side */}
          <div className="promo-right-pane">
            <Link 
              to={targetUrl} 
              className="product-stage-link"
              tabIndex={-1}
              aria-hidden="true"
            >
              <div className="product-stage-wrapper">
                {/* Main Product Showcase Image */}
                <img 
                  src={bannerImg} 
                  alt={title} 
                  className="product-stage-image"
                  loading="lazy"
                  onError={(e) => {
                    e.target.src = wellnessShowcaseImg;
                  }}
                />

                {/* Floating Glassmorphism Badge 1 */}
                <div className="floating-badge badge-top">
                  <div className="badge-stars">★★★★★</div>
                  <span className="badge-text">4.9/5 Doctor Trusted</span>
                </div>

                {/* Floating Glassmorphism Badge 2 */}
                <div className="floating-badge badge-bottom">
                  <span className="badge-chip">SAVE 25%</span>
                  <span className="badge-text">Instant Discount Applied</span>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
