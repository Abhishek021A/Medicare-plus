import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Trash2, 
  Heart, 
  Minus, 
  Plus, 
  ShoppingBag, 
  ArrowRight, 
  ArrowLeft,
  MapPin, 
  ShieldCheck, 
  Truck, 
  CheckCircle2, 
  Tag, 
  Sparkles,
  Loader2
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { useLocationContext } from '../context/LocationContext';
import { useSettings } from '../context/SettingsContext';
import api from '../services/api';
import placeholderImg from '../assets/images/medicine-placeholder.jpg';
import './Cart.css';

// Helper to resolve images properly
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

export default function Cart() {
  const { items: cartItems, removeFromCart, updateQuantity, subtotal, totalItems, appliedCoupon, setAppliedCoupon } = useCart();
  const { addToast } = useToast();
  const { currentLocation, requestGeolocation, isLoading: isLocLoading } = useLocationContext();
  const { settings } = useSettings();
  const navigate = useNavigate();

  const [couponCode, setCouponCode] = useState('');
  const [couponError, setCouponError] = useState('');
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [removingIds, setRemovingIds] = useState(new Set());
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // Delivery & Free delivery threshold from backend settings
  const FREE_DELIVERY_THRESHOLD = settings?.free_delivery_above !== undefined ? Number(settings.free_delivery_above) : 499;
  const standardDeliveryFee = settings?.delivery_charge !== undefined ? Number(settings.delivery_charge) : 50;
  const deliveryFee = subtotal > 0 ? (subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : standardDeliveryFee) : 0;
  const amountNeededForFree = Math.max(0, FREE_DELIVERY_THRESHOLD - subtotal);
  const freeDeliveryProgress = Math.min(100, Math.round((subtotal / (FREE_DELIVERY_THRESHOLD || 1)) * 100));

  // Discount calculation from real server response
  const discountAmount = appliedCoupon ? (parseFloat(appliedCoupon.discount_amount) || 0) : 0;
  const finalTotal = Math.max(0, subtotal + deliveryFee - discountAmount);

  // Apply Coupon via Backend API
  const handleApplyCoupon = async (e) => {
    e.preventDefault();
    setCouponError('');
    const code = couponCode.trim().toUpperCase();
    if (!code) return;

    setIsApplyingCoupon(true);
    try {
      const res = await api.applyCoupon(code, cartItems, subtotal);
      if (res && res.success && res.data) {
        setAppliedCoupon(res.data);
        setCouponCode('');
        addToast(`Coupon '${code}' applied successfully!`, 'success');
      } else {
        setCouponError(res?.message || 'Invalid or expired coupon code.');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Unable to apply coupon. Please check the code.';
      setCouponError(msg);
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponError('');
    addToast('Coupon removed', 'info');
  };

  // Animated item removal
  const handleRemoveItem = (id) => {
    setRemovingIds(prev => new Set(prev).add(id));
    setTimeout(() => {
      removeFromCart(id);
      setRemovingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 280);
  };

  // Move to Wishlist with smooth animation
  const handleMoveToWishlist = (item) => {
    setRemovingIds(prev => new Set(prev).add(item.id));
    setTimeout(() => {
      if (typeof addWishlist === 'function') {
        addWishlist(item);
      } else if (typeof addToWishlist === 'function') {
        addToWishlist(item);
      }
      removeFromCart(item.id);
      addToast('Moved to wishlist', 'success');
      setRemovingIds(prev => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }, 280);
  };

  // Format delivery location nicely without raw coords
  const formatLocationDisplay = (loc) => {
    if (!loc || loc === 'Select Location') {
      return 'Selected Delivery Area (Click to detect)';
    }
    if (loc.startsWith('Location:') || /^-?\d+(\.\d+)?, -?\d+(\.\d+)?/.test(loc.replace('Location: ', '').trim())) {
      return 'Selected Customer Delivery Zone';
    }
    return loc;
  };

  const handleProceedToCheckout = () => {
    if (cartItems.length === 0) return;
    setIsCheckingOut(true);
    setTimeout(() => {
      navigate('/checkout');
    }, 350);
  };

  // 17. EMPTY CART STATE
  if (cartItems.length === 0) {
    return (
      <div className="cart-page-wrapper section-padding empty-cart-wrapper">
        <div className="container">
          <div className="empty-cart-card">
            <div className="empty-cart-icon-mesh" aria-hidden="true">
              <ShoppingBag size={84} className="empty-cart-bag-icon" />
            </div>
            <h2 className="empty-cart-title">Your cart is empty</h2>
            <p className="empty-cart-subtitle">
              Looks like you haven't added anything to your cart yet. Discover doctor-recommended medicines,
              vitamins, personal care, and wellness essentials for your whole family.
            </p>
            <Link to="/shop" className="btn-start-shopping" aria-label="Start shopping for healthcare products">
              <span>START SHOPPING</span>
              <ArrowRight size={18} className="btn-arrow" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-page-wrapper section-padding">
      <div className="container">
        {/* Page Header */}
        <div className="cart-page-header">
          <div className="cart-header-titles">
            <span className="cart-eyebrow">YOUR CART</span>
            <div className="cart-title-row">
              <h1 className="cart-main-title">Shopping Cart</h1>
              <span className="cart-items-pill">{totalItems || cartItems.length} {cartItems.length === 1 ? 'item' : 'items'}</span>
            </div>
            <div className="cart-title-underline" aria-hidden="true" />
          </div>

          <Link to="/shop" className="continue-shopping-top-link">
            <ArrowLeft size={16} className="btn-arrow-left" />
            <span>Continue Shopping</span>
          </Link>
        </div>

        {/* Main Grid: Left Items (1.7fr) + Right Order Summary (0.8fr) */}
        <div className="cart-layout-grid">
          {/* LEFT: Cart Items Column */}
          <div className="cart-items-column">
            <div className="cart-items-panel">
              {/* Panel Header */}
              <div className="cart-panel-header">
                <div>
                  <h2 className="cart-panel-title">Shopping Cart Items</h2>
                  <p className="cart-panel-subtitle">{cartItems.length} {cartItems.length === 1 ? 'product' : 'products'} currently in your basket</p>
                </div>
                <span className="cart-reserved-badge">Items reserved for checkout</span>
              </div>

              {/* Cart Items List */}
              <div className="cart-items-list" role="list">
                {cartItems.map((item, idx) => {
                  const itemPrice = Number(item.sale_price || item.price) || 0;
                  const originalPrice = item.originalPrice ? Number(item.originalPrice) : (item.sale_price && item.price ? Number(item.price) : null);
                  const discountPercent = originalPrice && originalPrice > itemPrice
                    ? Math.round(((originalPrice - itemPrice) / originalPrice) * 100)
                    : 0;
                  const isRemoving = removingIds.has(item.id);

                  return (
                    <article 
                      key={item.id} 
                      className={`cart-item-card ${isRemoving ? 'is-removing' : ''}`}
                      style={{ animationDelay: `${idx * 60}ms` }}
                      role="listitem"
                    >
                      {/* Product Image Stage */}
                      <div className="cart-item-image-stage">
                        {discountPercent > 0 && (
                          <span className="cart-item-sale-chip">{discountPercent}% OFF</span>
                        )}
                        <Link to={`/product/${item.slug || item.id}`} tabIndex={-1} aria-hidden="true">
                          <img 
                            src={resolveImageUrl(item.image)} 
                            alt={item.name}
                            className="cart-item-thumb"
                            loading="lazy"
                            onError={(e) => { e.target.onerror = null; e.target.src = placeholderImg; }}
                          />
                        </Link>
                      </div>

                      {/* Product Information */}
                      <div className="cart-item-info">
                        <span className="cart-item-brand">{item.brand_name || item.brand || 'Medicare'}</span>
                        <Link to={`/product/${item.slug || item.id}`} className="cart-item-name-link">
                          <h3 className="cart-item-name" title={item.name}>{item.name}</h3>
                        </Link>

                        {/* Price Row */}
                        <div className="cart-item-price-row">
                          <span className="cart-item-current-price">₹{itemPrice.toFixed(2)}</span>
                          {originalPrice && originalPrice > itemPrice && (
                            <span className="cart-item-old-price">₹{originalPrice.toFixed(2)}</span>
                          )}
                          {discountPercent > 0 && (
                            <span className="cart-item-discount-tag">{discountPercent}% OFF</span>
                          )}
                        </div>

                        {/* Low Stock Indicator if available */}
                        {item.stock_quantity !== undefined && item.stock_quantity !== null && item.stock_quantity <= 5 && item.stock_quantity > 0 && (
                          <span className="cart-low-stock-msg">Only {item.stock_quantity} left in stock</span>
                        )}

                        {/* Actions Row */}
                        <div className="cart-item-actions-row">
                          {/* Quantity Selector */}
                          <div className="cart-qty-selector" aria-label="Quantity selector">
                            <button 
                              type="button"
                              className="qty-btn qty-minus" 
                              onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                              disabled={item.quantity <= 1}
                              aria-label="Decrease quantity"
                            >
                              <Minus size={14} />
                            </button>
                            <span className="qty-value" aria-live="polite">{item.quantity}</span>
                            <button 
                              type="button"
                              className="qty-btn qty-plus" 
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              disabled={item.stock_quantity !== undefined && item.stock_quantity !== null && item.quantity >= item.stock_quantity}
                              aria-label="Increase quantity"
                            >
                              <Plus size={14} />
                            </button>
                          </div>

                          <div className="cart-action-links">
                            {/* Move to Wishlist */}
                            <button 
                              type="button"
                              className="cart-action-btn btn-wishlist"
                              onClick={() => handleMoveToWishlist(item)}
                              aria-label="Move item to wishlist"
                            >
                              <Heart size={14} className="action-icon" />
                              <span>Move to Wishlist</span>
                            </button>

                            <span className="action-separator">|</span>

                            {/* Remove Item */}
                            <button 
                              type="button"
                              className="cart-action-btn btn-remove"
                              onClick={() => handleRemoveItem(item.id)}
                              aria-label="Remove item from cart"
                            >
                              <Trash2 size={14} className="action-icon" />
                              <span>Remove</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Item Total (Price x Quantity) */}
                      <div className="cart-item-total-col">
                        <span className="cart-item-total-label">Total</span>
                        <span className="cart-item-total-amount">₹{(itemPrice * item.quantity).toFixed(2)}</span>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>

            {/* Bottom Back Link */}
            <div className="cart-bottom-nav">
              <Link to="/shop" className="btn-continue-shopping">
                <ArrowLeft size={16} className="btn-arrow-left" />
                <span>Continue Shopping</span>
              </Link>
            </div>
          </div>

          {/* RIGHT: Order Summary Card (Sticky) */}
          <aside className="cart-summary-column" aria-label="Order Summary">
            <div className="order-summary-card">
              <div className="summary-header">
                <div className="summary-title-wrap">
                  <Tag size={18} className="summary-title-icon" />
                  <h2 className="summary-title">ORDER SUMMARY</h2>
                </div>
              </div>

              {/* Free Delivery Threshold Progress Indicator */}
              <div className="free-shipping-card">
                <div className="shipping-progress-text">
                  {amountNeededForFree > 0 ? (
                    <>Add <strong className="highlight-amt">₹{amountNeededForFree.toFixed(2)}</strong> more for <span className="highlight-free">FREE DELIVERY</span></>
                  ) : (
                    <span className="unlocked-text">🎉 You've unlocked <strong>FREE DELIVERY</strong>!</span>
                  )}
                </div>
                <div className="shipping-progress-track">
                  <div 
                    className="shipping-progress-fill" 
                    style={{ width: `${freeDeliveryProgress}%` }}
                    role="progressbar"
                    aria-valuenow={freeDeliveryProgress}
                    aria-valuemin="0"
                    aria-valuemax="100"
                  />
                </div>
              </div>

              {/* Delivery Location Section */}
              <div className="delivery-location-card">
                <div className="location-info-row">
                  <MapPin size={16} className="location-pin-icon" />
                  <div className="location-text-group">
                    <span className="location-caption">Delivering to</span>
                    <strong className="location-address" title={currentLocation}>
                      {formatLocationDisplay(currentLocation)}
                    </strong>
                  </div>
                </div>
                <button 
                  type="button"
                  className="btn-change-location"
                  onClick={requestGeolocation}
                  disabled={isLocLoading}
                  aria-label="Change delivery location"
                >
                  {isLocLoading ? 'Detecting...' : 'Change'}
                </button>
              </div>

              {/* Price Breakdown */}
              <div className="summary-breakdown-list">
                <div className="summary-breakdown-row">
                  <span className="breakdown-label">Subtotal</span>
                  <span className="breakdown-value">₹{subtotal.toFixed(2)}</span>
                </div>

                <div className="summary-breakdown-row">
                  <span className="breakdown-label">Delivery Charges</span>
                  <span className="breakdown-value">
                    {deliveryFee === 0 ? (
                      <span className="free-delivery-badge">FREE</span>
                    ) : (
                      `₹${deliveryFee.toFixed(2)}`
                    )}
                  </span>
                </div>

                {discountAmount > 0 && (
                  <div className="summary-breakdown-row discount-row">
                    <span className="breakdown-label">Coupon Discount ({appliedCoupon.code})</span>
                    <span className="breakdown-value">- ₹{discountAmount.toFixed(2)}</span>
                  </div>
                )}
              </div>

              <div className="summary-card-divider" />

              {/* Total Amount Row */}
              <div className="summary-total-row">
                <div className="total-label-group">
                  <span className="total-title">Total Amount</span>
                  <span className="total-taxes-note">(Inclusive of all taxes)</span>
                </div>
                <span className="total-amount-val">₹{finalTotal.toFixed(2)}</span>
              </div>

              {/* Coupon Box */}
              <div className="cart-coupon-box">
                {appliedCoupon ? (
                  <div className="coupon-applied-alert">
                    <div className="coupon-applied-info">
                      <CheckCircle2 size={16} className="coupon-applied-icon" />
                      <div>
                        <strong>{appliedCoupon.code} applied</strong>
                        <span>You saved ₹{discountAmount.toFixed(2)} {appliedCoupon.discount_type === 'PERCENTAGE' ? `(${appliedCoupon.discount_value}% off)` : ''}</span>
                      </div>
                    </div>
                    <button 
                      type="button" 
                      className="btn-remove-coupon"
                      onClick={handleRemoveCoupon}
                      aria-label="Remove applied coupon"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="coupon-box-heading">Have a coupon code?</p>
                    <form className="coupon-input-form" onSubmit={handleApplyCoupon}>
                      <input 
                        type="text" 
                        placeholder="Enter code (e.g. WELCOME10)" 
                        value={couponCode}
                        onChange={(e) => { setCouponCode(e.target.value); setCouponError(''); }}
                        aria-label="Enter coupon code"
                        className="coupon-text-input"
                        disabled={isApplyingCoupon}
                      />
                      <button type="submit" className="btn-apply-coupon" disabled={isApplyingCoupon}>
                        {isApplyingCoupon ? 'APPLYING...' : 'APPLY'}
                      </button>
                    </form>
                    {couponError && (
                      <p className="coupon-error-text" role="alert">{couponError}</p>
                    )}
                  </>
                )}
              </div>

              {/* Checkout CTA Button */}
              <button 
                type="button"
                className={`btn-proceed-checkout ${isCheckingOut ? 'is-loading' : ''}`}
                onClick={handleProceedToCheckout}
                disabled={isCheckingOut || cartItems.length === 0}
                aria-label="Proceed to checkout"
              >
                {isCheckingOut ? (
                  <>
                    <Loader2 size={18} className="checkout-spinner" />
                    <span>Processing Checkout...</span>
                  </>
                ) : (
                  <>
                    <span>Proceed to Checkout</span>
                    <ArrowRight size={18} className="checkout-arrow" />
                  </>
                )}
              </button>

              {/* Trust Badges Row */}
              <div className="summary-trust-row" aria-label="Customer trust and security guarantee">
                <div className="trust-item">
                  <ShieldCheck size={16} className="trust-icon" />
                  <span>Secure Checkout</span>
                </div>
                <div className="trust-item">
                  <CheckCircle2 size={16} className="trust-icon" />
                  <span>100% Genuine</span>
                </div>
                <div className="trust-item">
                  <Truck size={16} className="trust-icon" />
                  <span>Fast Delivery</span>
                </div>
              </div>

              {/* Accepted Payment Badges */}
              <div className="accepted-payments-row" aria-label="Supported payment methods">
                <span className="payment-pill">UPI / QR</span>
                <span className="payment-pill">Visa / MC</span>
                <span className="payment-pill">NetBanking</span>
                <span className="payment-pill">Cash on Delivery</span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
