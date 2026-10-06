import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  BadgeCheck,
  ShieldCheck,
  Truck,
  Upload,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import api from '../../services/api';
import { resolveImageUrl } from '../../utils/imageUrl';
import doctorImg from '../../assets/images/hero-doctor.jpg';
import './Hero.css';

export default function Hero() {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  // Fetch active hero banners from MySQL
  useEffect(() => {
    let isMounted = true;
    api.getBanners('HOMEPAGE_HERO')
      .then(res => {
        if (isMounted && res.data && res.data.success && Array.isArray(res.data.data?.banners)) {
          setBanners(res.data.data.banners);
        }
      })
      .catch(err => {
        console.error('Failed to fetch hero banners:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Autoplay slider (every 5 seconds)
  useEffect(() => {
    if (banners.length <= 1 || isPaused) return;

    const timer = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % banners.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [banners.length, isPaused]);

  const handleNext = () => {
    setCurrentIndex(prev => (prev + 1) % banners.length);
  };

  const handlePrev = () => {
    setCurrentIndex(prev => (prev - 1 + banners.length) % banners.length);
  };

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 50) {
      if (diff > 0) handleNext();
      else handlePrev();
    }
  };

  // If dynamic banners exist from MySQL, render the dynamic Hero / Slider!
  if (banners.length > 0) {
    const currentBanner = banners[currentIndex];
    const bannerImg = resolveImageUrl(currentBanner.image || currentBanner.desktop_image);
    const targetUrl = currentBanner.button_url || currentBanner.target_url || '/shop';
    const isExternal = targetUrl.startsWith('http://') || targetUrl.startsWith('https://');

    return (
      <section
        className="hero dynamic-hero-slider"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        aria-label="Promotional Showcase"
      >
        <div className="container hero-grid">
          {/* Left Content */}
          <div className="hero-content animate-slide-up" key={`content-${currentBanner.id}-${currentIndex}`}>
            {currentBanner.badge && (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 12px',
                  borderRadius: '999px',
                  backgroundColor: '#E6F7F5',
                  color: '#087F73',
                  fontSize: '12px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  marginBottom: '16px'
                }}
              >
                <Sparkles size={14} />
                <span>{currentBanner.badge}</span>
              </div>
            )}

            <h1 className="hero-title">
              {currentBanner.title}
              {currentBanner.subtitle && (
                <>
                  <br />
                  <span className="text-primary-dark">{currentBanner.subtitle}</span>
                </>
              )}
            </h1>

            <p className="hero-description">
              {currentBanner.description || 'Order medicines & healthcare products online with fast delivery, authentic sourcing and best prices.'}
            </p>

            <div className="hero-features">
              <div className="feature-item">
                <BadgeCheck className="feature-icon" size={20} />
                <span>100% Genuine<br/>Products</span>
              </div>
              <div className="feature-item">
                <ShieldCheck className="feature-icon" size={20} />
                <span>Secure<br/>Payments</span>
              </div>
              <div className="feature-item">
                <Truck className="feature-icon" size={20} />
                <span>On-time<br/>Delivery</span>
              </div>
            </div>

            {currentBanner.button_text && (
              <div className="btn-container">
                {isExternal ? (
                  <a
                    href={targetUrl}
                    target={currentBanner.open_new_tab ? '_blank' : '_self'}
                    rel="noopener noreferrer"
                    className="btn-primary hero-btn"
                  >
                    <span>{currentBanner.button_text}</span>
                    <span className="arrow">→</span>
                  </a>
                ) : (
                  <Link
                    to={targetUrl}
                    target={currentBanner.open_new_tab ? '_blank' : '_self'}
                    className="btn-primary hero-btn"
                  >
                    <span>{currentBanner.button_text}</span>
                    <span className="arrow">→</span>
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Right Image Content */}
          <div className="hero-image-wrapper" key={`img-${currentBanner.id}-${currentIndex}`}>
            <div className="hero-blob"></div>

            <img
              src={bannerImg}
              alt={currentBanner.title}
              className="hero-main-img animate-fade-in"
              onError={(e) => {
                e.target.src = doctorImg;
              }}
            />

            <div className="hero-leaves"></div>

            <div className="floating-prescription-card">
              <Link to="/prescriptions" className="upload-box" style={{ textDecoration: 'none' }}>
                <Upload size={24} className="upload-icon" />
                <span className="upload-text">Upload<br/>Prescription</span>
              </Link>
              <div className="card-divider"></div>
              <p className="card-text">Get medicines<br/>delivered<br/>safely</p>
            </div>
          </div>
        </div>

        {/* Carousel Navigation Arrows (when > 1 banner) */}
        {banners.length > 1 && (
          <>
            <button
              type="button"
              className="hero-nav-btn hero-nav-prev"
              onClick={handlePrev}
              aria-label="Previous banner slide"
            >
              <ChevronLeft size={22} />
            </button>
            <button
              type="button"
              className="hero-nav-btn hero-nav-next"
              onClick={handleNext}
              aria-label="Next banner slide"
            >
              <ChevronRight size={22} />
            </button>

            {/* Dots Indicator */}
            <div className="hero-slider-dots" role="tablist" aria-label="Banner slides">
              {banners.map((b, i) => (
                <button
                  key={b.id}
                  type="button"
                  role="tab"
                  aria-selected={i === currentIndex}
                  className={`hero-dot ${i === currentIndex ? 'active' : ''}`}
                  onClick={() => setCurrentIndex(i)}
                  aria-label={`Go to slide ${i + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </section>
    );
  }

  // Fallback default Hero if no dynamic banners found in MySQL
  return (
    <section className="hero">
      <div className="container hero-grid">
        {/* Left Content */}
        <div className="hero-content animate-slide-up">
          <h1 className="hero-title">
            Healthcare, Delivered <br />
            <span className="text-primary-dark">To Your Doorstep</span>
          </h1>
          <p className="hero-description">
            Order medicines & health products online<br/>
            with fast delivery and best prices.
          </p>

          <div className="hero-features">
            <div className="feature-item">
              <BadgeCheck className="feature-icon" size={20} />
              <span>100% Genuine<br/>Products</span>
            </div>
            <div className="feature-item">
              <ShieldCheck className="feature-icon" size={20} />
              <span>Secure<br/>Payments</span>
            </div>
            <div className="feature-item">
              <Truck className="feature-icon" size={20} />
              <span>On-time<br/>Delivery</span>
            </div>
          </div>

          <div className="btn-container">
            <Link to="/shop" className="btn-primary hero-btn">
              Order Now <span className="arrow">→</span>
            </Link>
          </div>
        </div>

        {/* Right Image Content */}
        <div className="hero-image-wrapper">
          <div className="hero-blob"></div>

          <img src={doctorImg} alt="Healthcare Professional" className="hero-main-img animate-fade-in" />

          <div className="hero-leaves"></div>

          <div className="floating-prescription-card">
            <Link to="/prescriptions" className="upload-box" style={{ textDecoration: 'none' }}>
              <Upload size={24} className="upload-icon" />
              <span className="upload-text">Upload<br/>Prescription</span>
            </Link>
            <div className="card-divider"></div>
            <p className="card-text">Get medicines<br/>delivered<br/>safely</p>
          </div>
        </div>
      </div>
    </section>
  );
}
