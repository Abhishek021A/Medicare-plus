import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Heart, Star, Sparkles, Check } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import placeholderImg from '../../assets/images/medicine-placeholder.jpg';
import './ProductCard.css';

const ProductCard = ({ product, animationDelay = 0, className = '' }) => {
  const { addToCart } = useCart();
  const { addWishlist, removeWishlist, isWishlisted, actionLoading } = useWishlist();
  const [added, setAdded] = useState(false);

  if (!product) return null;

  const wishlisted = isWishlisted(product.id);
  const isWishlistBusy = actionLoading && !!actionLoading[product.id];

  const handleAddToCart = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (isOutOfStock) return;
    addToCart(product, 1);
    setAdded(true);
    setTimeout(() => {
      setAdded(false);
    }, 1500);
  };

  const handleWishlistClick = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (isWishlistBusy) return;
    if (wishlisted) {
      removeWishlist(product.id);
    } else {
      addWishlist(product);
    }
  };

  // Stock status
  const isOutOfStock = product.stock_quantity !== undefined && product.stock_quantity !== null && Number(product.stock_quantity) <= 0;

  // Pricing logic
  const rawPrice = Number(product.price) || 0;
  const rawSalePrice = product.sale_price !== null && product.sale_price !== undefined ? Number(product.sale_price) : null;
  const hasSale = rawSalePrice !== null && rawSalePrice > 0 && rawSalePrice < rawPrice;
  
  const currentPrice = hasSale ? rawSalePrice : rawPrice;
  const originalPrice = hasSale ? rawPrice : (product.originalPrice ? Number(product.originalPrice) : null);
  
  const discountPercent = originalPrice && originalPrice > currentPrice
    ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100)
    : 0;

  // Rating and review count
  const rating = product.rating !== undefined ? Number(product.rating) : (product.avg_rating !== undefined ? Number(product.avg_rating) : 0);
  const reviewsCount = product.reviews !== undefined ? Number(product.reviews) : (product.review_count !== undefined ? Number(product.review_count) : 0);

  // New badge determination
  const isNewProduct = product.new_launch == 1 || product.isNew || product.is_new;

  // Image URL resolution
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

  const productUrl = `/product/${product.slug || product.id}`;

  return (
    <div 
      className={`product-card ${isOutOfStock ? 'out-of-stock-card' : ''} ${className}`}
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      {/* Badges container */}
      <div className="product-badges">
        {isOutOfStock ? (
          <span className="badge out-of-stock-badge">Out of Stock</span>
        ) : (
          <>
            {discountPercent > 0 && (
              <span className="badge sale-badge">{discountPercent}% OFF</span>
            )}
            {isNewProduct && (
              <span className="badge new-badge">
                <Sparkles size={11} className="badge-sparkle-icon" />
                <span>NEW</span>
              </span>
            )}
          </>
        )}
      </div>

      {/* Modern Circular Wishlist Button (40x40) */}
      <button 
        type="button"
        className={`wishlist-btn ${wishlisted ? 'active' : ''}`} 
        onClick={handleWishlistClick}
        disabled={isWishlistBusy}
        aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
      >
        <Heart size={18} fill={wishlisted ? "#ef4444" : "none"} color={wishlisted ? "#ef4444" : "currentColor"} />
      </button>

      {/* Dedicated Image Area with subtle radial backdrop */}
      <Link to={productUrl} className="product-image-container" aria-label={`View details for ${product.name}`}>
        <img 
          src={resolveImageUrl(product.image)} 
          alt={product.name} 
          className="product-image" 
          loading="lazy" 
          onError={(e) => { e.target.onerror = null; e.target.src = placeholderImg; }}
        />
      </Link>

      {/* Product Content */}
      <div className="product-info">
        <span className="product-brand">{product.brand_name || product.brand || 'Medicare'}</span>
        
        <Link to={productUrl} className="product-title-link" title={product.name}>
          <h4 className="product-name">{product.name}</h4>
        </Link>
        
        {/* Rating */}
        <div className="product-rating">
          <div className="stars" aria-label={`Rated ${rating.toFixed(1)} out of 5 stars`}>
            {[...Array(5)].map((_, i) => (
              <Star 
                key={i} 
                size={13} 
                fill={i < Math.round(rating) ? "#f59e0b" : "#e2e8e6"} 
                color={i < Math.round(rating) ? "#f59e0b" : "#e2e8e6"} 
              />
            ))}
          </div>
          <span className="review-count">({reviewsCount})</span>
        </div>

        {/* Price Row */}
        <div className="product-price-row">
          <span className="current-price">₹{currentPrice.toFixed(2)}</span>
          {originalPrice && originalPrice > currentPrice && (
            <span className="original-price">₹{originalPrice.toFixed(2)}</span>
          )}
          {discountPercent > 0 && (
            <span className="discount-tag">{discountPercent}% OFF</span>
          )}
        </div>

        {/* Action Button at bottom */}
        <div className="product-action">
          <button 
            type="button"
            className={`add-to-cart-btn ${isOutOfStock ? 'disabled' : ''} ${added ? 'btn-added' : ''}`} 
            onClick={handleAddToCart}
            disabled={isOutOfStock}
            aria-label={isOutOfStock ? 'Out of Stock' : (added ? 'Added to Cart' : 'Add to Cart')}
          >
            {added ? (
              <>
                <Check size={16} className="btn-icon-check" />
                <span>Added ✓</span>
              </>
            ) : (
              <>
                <ShoppingCart size={16} className="btn-icon-cart" />
                <span>{isOutOfStock ? 'Out of Stock' : 'Add to Cart'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default React.memo(ProductCard);
