import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Heart, Star, Check, ArrowRight, PackageOpen } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import api from '../../services/api';
import promoImg from '../../assets/images/hero-products.jpg';
import placeholderImg from '../../assets/images/medicine-placeholder.jpg';
import './SpecialDeals.css';

// Fallback deal products matching database and initial seed
const FALLBACK_DEAL_PRODUCTS = [
  { id: 20, name: 'Whey Protein Powder 1kg', brand: 'Optimum', brand_name: 'Optimum', price: 45.00, originalPrice: 65.00, sale_price: 45.00, rating: 4.8, reviews: 342 },
  { id: 21, name: 'Joint Support Complex', brand: 'HealthCo', brand_name: 'HealthCo', price: 18.50, originalPrice: 28.00, sale_price: 18.50, rating: 4.6, reviews: 112 },
  { id: 22, name: 'Advanced Glucose Monitor', brand: 'MedTech', brand_name: 'MedTech', price: 32.00, originalPrice: 50.00, sale_price: 32.00, rating: 4.7, reviews: 85 },
  { id: 23, name: 'Organic Sleep Aid Drops', brand: 'NatureWell', brand_name: 'NatureWell', price: 12.00, originalPrice: 18.00, sale_price: 12.00, rating: 4.5, reviews: 56 }
];

// Helper to resolve images consistently
const resolveImageUrl = (img) => {
  if (!img) return placeholderImg;
  if (img.startsWith('http://') || img.startsWith('https://') || img.startsWith('data:') || img.startsWith('blob:')) {
    return img;
  }
  const apiBase = import.meta.env.VITE_API_URL 
    ? import.meta.env.VITE_API_URL.replace('/api/index.php', '') 
    : 'http://localhost:8080/pharmacy_api';
  return `${apiBase}${img.startsWith('/') ? '' : '/'}${img}`;
};

// Compact Deal Product Card Component
function DealProductCard({ product, animationDelay = 0 }) {
  const { addToCart } = useCart();
  const { addWishlist, removeWishlist, isWishlisted } = useWishlist();
  const [added, setAdded] = useState(false);

  if (!product) return null;

  const wishlisted = isWishlisted(product.id);
  const isOutOfStock = product.stock_quantity !== undefined && product.stock_quantity !== null && Number(product.stock_quantity) <= 0;

  // Pricing & discount calculation
  const rawPrice = Number(product.price) || 0;
  const rawSalePrice = product.sale_price !== null && product.sale_price !== undefined ? Number(product.sale_price) : null;
  const hasSale = rawSalePrice !== null && rawSalePrice > 0 && rawSalePrice < rawPrice;
  const currentPrice = hasSale ? rawSalePrice : rawPrice;
  const originalPrice = hasSale ? rawPrice : (product.originalPrice ? Number(product.originalPrice) : null);
  
  const discountPercent = originalPrice && originalPrice > currentPrice
    ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100)
    : 0;

  const rating = product.rating !== undefined ? Number(product.rating) : (product.avg_rating !== undefined ? Number(product.avg_rating) : 4.8);
  const reviewsCount = product.reviews !== undefined ? Number(product.reviews) : (product.review_count !== undefined ? Number(product.review_count) : 85);

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOutOfStock) return;
    addToCart(product, 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  const handleWishlistClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (wishlisted) {
      removeWishlist(product.id);
    } else {
      addWishlist(product);
    }
  };

  const productUrl = `/product/${product.slug || product.id}`;

  return (
    <div 
      className="deal-product-card"
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      {/* Discount Badge */}
      {discountPercent > 0 && (
        <span className="deal-discount-badge" aria-label={`${discountPercent}% discount`}>
          {discountPercent}% OFF
        </span>
      )}

      {/* Wishlist 34px Button */}
      <button 
        type="button"
        className={`deal-wishlist-btn ${wishlisted ? 'active' : ''}`}
        onClick={handleWishlistClick}
        aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
      >
        <Heart size={15} fill={wishlisted ? "#ef4444" : "none"} color={wishlisted ? "#ef4444" : "currentColor"} />
      </button>

      {/* Product Image Area */}
      <Link to={productUrl} className="deal-product-image-box" aria-label={`View ${product.name}`}>
        <img 
          src={resolveImageUrl(product.image)} 
          alt={product.name} 
          className="deal-product-image"
          loading="lazy"
          onError={(e) => { e.target.onerror = null; e.target.src = placeholderImg; }}
        />
      </Link>

      {/* Product Body */}
      <div className="deal-product-body">
        <span className="deal-product-brand">{product.brand_name || product.brand || 'Medicare'}</span>
        
        <Link to={productUrl} className="deal-product-title-link" title={product.name}>
          <h4 className="deal-product-title">{product.name}</h4>
        </Link>

        {/* Rating */}
        <div className="deal-product-rating">
          <div className="stars">
            {[...Array(5)].map((_, i) => (
              <Star 
                key={i} 
                size={12} 
                fill={i < Math.round(rating) ? "#f59e0b" : "#e2e8e6"} 
                color={i < Math.round(rating) ? "#f59e0b" : "#e2e8e6"} 
              />
            ))}
          </div>
          <span className="deal-review-count">({reviewsCount})</span>
        </div>

        {/* Price Row */}
        <div className="deal-product-price-row">
          <span className="deal-current-price">₹{currentPrice.toFixed(2)}</span>
          {originalPrice && originalPrice > currentPrice && (
            <span className="deal-original-price">₹{originalPrice.toFixed(2)}</span>
          )}
          {discountPercent > 0 && (
            <span className="deal-discount-tag">{discountPercent}% OFF</span>
          )}
        </div>

        {/* Action Button */}
        <div className="deal-product-action">
          <button 
            type="button"
            className={`deal-cart-btn ${isOutOfStock ? 'disabled' : ''} ${added ? 'btn-added' : ''}`}
            onClick={handleAddToCart}
            disabled={isOutOfStock}
            aria-label={isOutOfStock ? 'Out of Stock' : (added ? 'Added to Cart' : 'Add product to cart')}
          >
            {added ? (
              <>
                <Check size={14} className="deal-cart-icon" />
                <span>Added ✓</span>
              </>
            ) : (
              <>
                <ShoppingCart size={14} className="deal-cart-icon" />
                <span>{isOutOfStock ? 'Out of Stock' : 'Add to Cart'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SpecialDeals() {
  const { addToCart } = useCart();
  const [bundleAdded, setBundleAdded] = useState(false);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Bundle Details
  const BUNDLE_PRICE = 1299.00;
  const BUNDLE_ORIGINAL = 1999.00;
  const bundleDiscount = Math.round(((BUNDLE_ORIGINAL - BUNDLE_PRICE) / BUNDLE_ORIGINAL) * 100);

  // Target date: 2 days, 12 hours, 35 mins from now
  const [targetDate] = useState(() => new Date().getTime() + (2 * 24 * 60 * 60 * 1000) + (12 * 60 * 60 * 1000) + (35 * 60 * 1000));
  
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isEnded: false
  });

  // Countdown timer effect
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date().getTime();
      const distance = targetDate - now;

      if (distance < 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isEnded: true });
      } else {
        setTimeLeft({
          days: Math.floor(distance / (1000 * 60 * 60 * 24)),
          hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((distance % (1000 * 60)) / 1000),
          isEnded: false
        });
      }
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  // Fetch dynamic deal products from API
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    api.getProducts({ deals: 1, limit: 4 })
      .then(res => {
        if (!isMounted) return;
        const items = res?.data || [];
        if (Array.isArray(items) && items.length >= 4) {
          setProducts(items.slice(0, 4));
          setLoading(false);
        } else {
          return api.getProducts({ sort: 'latest', limit: 4 })
            .then(resLatest => {
              if (!isMounted) return;
              const latestItems = resLatest?.data || [];
              if (Array.isArray(latestItems) && latestItems.length > 0) {
                setProducts(latestItems.slice(0, 4));
              } else {
                setProducts(FALLBACK_DEAL_PRODUCTS);
              }
              setLoading(false);
            });
        }
      })
      .catch(err => {
        if (!isMounted) return;
        console.warn("Could not load special deals dynamically:", err);
        setProducts(FALLBACK_DEAL_PRODUCTS);
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleAddBundle = () => {
    if (timeLeft.isEnded) return;
    const bundleProduct = {
      id: 'bundle-essentials-01',
      name: 'Premium Healthcare Essentials Bundle',
      brand: 'Medicare Plus',
      price: BUNDLE_PRICE,
      originalPrice: BUNDLE_ORIGINAL,
      description: "Everything you need to maintain your family's health in one complete package.",
      image: promoImg
    };
    addToCart(bundleProduct, 1);
    setBundleAdded(true);
    setTimeout(() => setBundleAdded(false), 1600);
  };

  const padZero = (num) => String(num).padStart(2, '0');

  return (
    <section className="special-deals-section" aria-label="Special Deals Section">
      {/* Ambient Radial Mesh & Medical Accents */}
      <div className="deals-ambient-mesh" aria-hidden="true">
        <div className="deals-blob deals-blob-1" />
        <div className="deals-blob deals-blob-2" />
        <span className="deals-cross deals-cross-1">+</span>
        <span className="deals-cross deals-cross-2">+</span>
      </div>

      <div className="container">
        {/* Section Header */}
        <div className="special-deals-header text-center">
          <span className="deals-eyebrow">LIMITED TIME OFFERS</span>
          <h2 className="deals-main-title">Special Deals</h2>
          <div className="deals-underline" aria-hidden="true" />
          <p className="deals-subtitle">Grab these limited-time offers before they’re gone</p>
        </div>

        {/* Main Grid: Large Deal Card (40%) + Products Grid (60%) */}
        <div className="special-deals-layout">
          {/* Left: Large Promotional Deal Card */}
          <aside className="deal-featured-card" aria-label="Deal of the Day">
            {/* Background Medical Cross & Decorative Accents */}
            <div className="deal-card-decor" aria-hidden="true">
              <span className="deal-decor-cross">+</span>
              <div className="deal-decor-circle" />
              <div className="deal-decor-dots" />
            </div>

            <div className="deal-featured-content">
              {/* Badge */}
              <div className="deal-badge-row">
                <span className="deal-badge-pill">DEAL OF THE DAY</span>
              </div>

              {/* Title & Description */}
              <h3 className="deal-featured-title">Premium Healthcare Essentials Bundle</h3>
              <p className="deal-featured-desc">
                Everything you need to maintain your family's health in one complete package.
              </p>

              {/* Price Row */}
              <div className="deal-price-row">
                <span className="deal-hero-price">₹{BUNDLE_PRICE.toFixed(2)}</span>
                <span className="deal-hero-original">₹{BUNDLE_ORIGINAL.toFixed(2)}</span>
                <span className="deal-hero-save-badge">SAVE {bundleDiscount}%</span>
              </div>

              {/* Countdown Timer */}
              {timeLeft.isEnded ? (
                <div className="deal-ended-box">
                  <span>Offer Ended</span>
                </div>
              ) : (
                <div className="countdown-timer-group" aria-label="Offer expiration countdown">
                  <div className="timer-box">
                    <span className="timer-num" key={`days-${timeLeft.days}`}>{padZero(timeLeft.days)}</span>
                    <span className="timer-label">DAYS</span>
                  </div>
                  <div className="timer-box">
                    <span className="timer-num" key={`hours-${timeLeft.hours}`}>{padZero(timeLeft.hours)}</span>
                    <span className="timer-label">HOURS</span>
                  </div>
                  <div className="timer-box">
                    <span className="timer-num" key={`min-${timeLeft.minutes}`}>{padZero(timeLeft.minutes)}</span>
                    <span className="timer-label">MINS</span>
                  </div>
                  <div className="timer-box">
                    <span className="timer-num" key={`sec-${timeLeft.seconds}`}>{padZero(timeLeft.seconds)}</span>
                    <span className="timer-label">SECS</span>
                  </div>
                </div>
              )}

              {/* Add Bundle CTA Button */}
              <button 
                type="button"
                className={`deal-bundle-cta ${bundleAdded ? 'btn-bundle-added' : ''}`}
                onClick={handleAddBundle}
                disabled={timeLeft.isEnded}
                aria-label={timeLeft.isEnded ? 'Offer unavailable' : (bundleAdded ? 'Bundle added to cart' : 'Add bundle to cart')}
              >
                {bundleAdded ? (
                  <>
                    <Check size={18} className="bundle-cta-icon" />
                    <span>BUNDLE ADDED ✓</span>
                  </>
                ) : (
                  <>
                    <ShoppingCart size={18} className="bundle-cta-icon" />
                    <span>{timeLeft.isEnded ? 'OFFER EXPIRED' : 'ADD BUNDLE TO CART'}</span>
                  </>
                )}
              </button>
            </div>

            {/* Deal Image Area at Bottom */}
            <div className="deal-featured-image-area">
              <img 
                src={promoImg} 
                alt="Premium Healthcare Essentials Bundle" 
                className="deal-bundle-image"
                loading="lazy"
              />
            </div>
          </aside>

          {/* Right: Deal Products Grid (2 columns x 2 rows) */}
          <div className="deal-products-grid">
            {loading ? (
              // Skeletons while loading
              Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="deal-skeleton-card" aria-hidden="true">
                  <div className="deal-skeleton-image" />
                  <div className="deal-skeleton-body">
                    <div className="deal-skeleton-line short" />
                    <div className="deal-skeleton-line title" />
                    <div className="deal-skeleton-line title-short" />
                    <div className="deal-skeleton-line stars" />
                    <div className="deal-skeleton-line price" />
                    <div className="deal-skeleton-btn" />
                  </div>
                </div>
              ))
            ) : products.length === 0 ? (
              <div className="deals-empty-state">
                <PackageOpen size={48} className="empty-icon" />
                <h4>No special deals available</h4>
                <p>Check back soon for exclusive healthcare offers.</p>
                <Link to="/shop" className="btn-browse-deals">Browse All Products</Link>
              </div>
            ) : (
              products.map((product, idx) => (
                <DealProductCard 
                  key={product.id} 
                  product={product} 
                  animationDelay={idx * 80}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
