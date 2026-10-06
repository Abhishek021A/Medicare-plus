import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ChevronRight,
  Star,
  Minus,
  Plus,
  ShoppingCart,
  Heart,
  ShieldCheck,
  Truck,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Send,
  User
} from 'lucide-react';
import ProductCard from '../components/ProductCard/ProductCard';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useLocationContext } from '../context/LocationContext';
import SEO from '../components/SEO/SEO';
import api from '../services/api';
import { resolveImageUrl } from '../utils/imageUrl';

import heroImg from '../assets/images/hero-products.jpg'; // Fallback image
import promoImg from '../assets/images/promo-card-item.jpg';
import './ProductDetails.css';

// Fallback initial data structure
const DEFAULT_PRODUCT = {
  id: 1,
  name: 'Vitamin C 1000mg Tablets',
  brand: 'HealthCore',
  price: 15.00,
  originalPrice: 20.00,
  rating: 4.8,
  reviews: 2,
  sku: 'SKU-VITC-001',
  inStock: true,
  images: [heroImg, promoImg],
  description: 'A powerful antioxidant formula combining Vitamin C with bioflavonoids to support immune health and collagen synthesis.',
  benefits: [
    'Supports healthy immune system function',
    'Promotes collagen synthesis for healthy skin',
    'Provides powerful antioxidant protection'
  ],
  ingredients: 'Vitamin C (Ascorbic Acid) 1000mg, Citrus Bioflavonoids.',
  howToUse: 'Take one (1) tablet daily with water, preferably after a meal.',
  warnings: 'Consult your doctor before use if pregnant or nursing.',
  specifications: [
    { label: 'Form', value: 'Tablets' },
    { label: 'Pack Size', value: '60 Tablets' },
    { label: 'Vegetarian', value: 'Yes' }
  ]
};

const RELATED_PRODUCTS = [
  { id: 2, name: 'Omega 3 Fish Oil 1000mg', category: 'Supplements', brand: 'NutriLife', price: 24.50, rating: 4.5, reviews: 2 },
  { id: 3, name: 'Digital Blood Pressure Monitor', category: 'Medical Devices', brand: 'MediLife', price: 45.00, originalPrice: 55.00, rating: 5.0, reviews: 2 },
  { id: 15, name: 'Paracetamol 500mg Extra Relief', category: 'Pain Relief', brand: 'PharmaCure', price: 5.00, rating: 4.5, reviews: 2 }
];

export default function ProductDetails() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const { currentLocation } = useLocationContext();

  const [product, setProduct] = useState(DEFAULT_PRODUCT);
  const [activeImage, setActiveImage] = useState(heroImg);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState('description');

  // Customer Reviews State
  const [reviewsList, setReviewsList] = useState([]);
  const [reviewSummary, setReviewSummary] = useState({
    total_reviews: 0,
    average_rating: 0,
    distribution: []
  });
  const [loadingReviews, setLoadingReviews] = useState(false);

  // Write Review State
  const [showWriteReview, setShowWriteReview] = useState(false);
  const [newRating, setNewRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [newTitle, setNewTitle] = useState('');
  const [newComment, setNewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewMessage, setReviewMessage] = useState(null);

  // Fetch real product from MySQL
  useEffect(() => {
    let isMounted = true;
    api.getProduct(slug)
      .then(res => {
        if (isMounted && res.data && res.data.success && res.data.data) {
          const p = res.data.data;
          const resolvedImg = resolveImageUrl(p.image, heroImg);
          setProduct({
            ...DEFAULT_PRODUCT,
            ...p,
            id: p.id,
            name: p.name,
            price: parseFloat(p.price || p.sale_price || 0),
            originalPrice: p.sale_price ? parseFloat(p.price) : (p.price ? parseFloat(p.price) * 1.2 : 0),
            rating: p.rating ? parseFloat(p.rating) : 4.8,
            reviews: p.reviews ? parseInt(p.reviews, 10) : 0,
            sku: p.sku || `SKU-PROD-${p.id}`,
            inStock: p.stock_quantity > 0,
            images: [resolvedImg, ...(Array.isArray(p.gallery_images) ? p.gallery_images.map(g => resolveImageUrl(g.image_path, promoImg)) : [promoImg])],
            description: p.description || p.short_description || DEFAULT_PRODUCT.description
          });
          setActiveImage(resolvedImg);

          // Fetch real customer reviews
          fetchProductReviews(p.id);
        }
      })
      .catch(() => {
        // Fallback: fetch reviews for default product id
        fetchProductReviews(DEFAULT_PRODUCT.id);
      });

    return () => {
      isMounted = false;
    };
  }, [slug]);

  const fetchProductReviews = (productId) => {
    if (!productId) return;
    setLoadingReviews(true);
    api.getProductReviews(productId)
      .then(res => {
        if (res.data && res.data.success && res.data.data) {
          setReviewsList(res.data.data.reviews || []);
          if (res.data.data.summary) {
            setReviewSummary(res.data.data.summary);
            // Sync product's own rating & review count
            setProduct(prev => ({
              ...prev,
              rating: res.data.data.summary.average_rating || prev.rating,
              reviews: res.data.data.summary.total_reviews !== undefined ? res.data.data.summary.total_reviews : prev.reviews
            }));
          }
        }
      })
      .catch(err => console.error('Failed to load product reviews:', err))
      .finally(() => setLoadingReviews(false));
  };

  const discount = product.originalPrice > product.price
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  const handleQuantityChange = (type) => {
    if (type === 'dec' && quantity > 1) setQuantity(quantity - 1);
    if (type === 'inc' && quantity < 10) setQuantity(quantity + 1);
  };

  const handleAddToCart = () => {
    addToCart(product, quantity);
  };

  const handleBuyNow = () => {
    addToCart(product, quantity);
    navigate('/cart');
  };

  // Image zoom effect logic
  const handleMouseMove = (e) => {
    const { left, top, width, height } = e.target.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    e.target.style.transformOrigin = `${x}% ${y}%`;
  };

  // Customer Review Submission
  const handleSubmitReview = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) {
      setReviewMessage({ type: 'error', text: 'Please log in to write a review for this product.' });
      return;
    }

    if (!newComment.trim() || newComment.trim().length < 3) {
      setReviewMessage({ type: 'error', text: 'Please enter a review of at least 3 characters.' });
      return;
    }

    try {
      setSubmittingReview(true);
      setReviewMessage(null);

      const res = await api.createProductReview(product.id, {
        rating: newRating,
        title: newTitle.trim(),
        comment: newComment.trim()
      });

      if (res.data && res.data.success) {
        setReviewMessage({
          type: 'success',
          text: res.data.message || 'Thank you! Your review has been submitted and is awaiting admin moderation.'
        });
        setNewTitle('');
        setNewComment('');
        setNewRating(5);
        setTimeout(() => setShowWriteReview(false), 2500);
      } else {
        throw new Error(res.data?.message || 'Failed to submit review');
      }
    } catch (err) {
      console.error('Review submit error:', err);
      setReviewMessage({
        type: 'error',
        text: err.response?.data?.message || err.message || 'Unable to submit review. Please try again.'
      });
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div className="product-details-page section-padding">
      <SEO
        title={product.name}
        description={product.description?.substring(0, 160) || `Buy ${product.name} online at Medicare Plus.`}
        type="product"
      />
      <div className="container">
        {/* Breadcrumbs */}
        <div className="breadcrumbs">
          <Link to="/">Home</Link>
          <ChevronRight size={14} />
          <Link to="/shop">Shop</Link>
          <ChevronRight size={14} />
          <span>{product.name}</span>
        </div>

        {/* TOP SECTION: Media & Info */}
        <div className="product-top-section">
          {/* LEFT: Image Gallery */}
          <div className="product-gallery">
            <div
              className="main-image-container"
              onMouseMove={handleMouseMove}
              onMouseLeave={(e) => (e.target.style.transformOrigin = 'center center')}
            >
              <img src={activeImage} alt={product.name} className="main-image zoom-target" />
              {discount > 0 && <span className="product-discount-badge">{discount}% OFF</span>}
            </div>

            <div className="thumbnail-list">
              {(product.images || [activeImage]).map((img, idx) => (
                <div
                  key={idx}
                  className={`thumbnail-item ${activeImage === img ? 'active' : ''}`}
                  onClick={() => setActiveImage(img)}
                >
                  <img src={img} alt={`Thumbnail ${idx}`} />
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT: Product Info */}
          <div className="product-info-panel">
            <span className="product-brand">{product.brand || 'Medicare PLUS'}</span>
            <h1 className="product-title">{product.name}</h1>

            <div className="product-meta-row">
              <div
                className="product-rating"
                style={{ cursor: 'pointer' }}
                onClick={() => setActiveTab('reviews')}
                title="View Customer Reviews"
              >
                <Star className="star-icon filled" size={16} fill="#F59E0B" color="#F59E0B" />
                <span className="rating-score">{Number(product.rating || 0).toFixed(1)}</span>
                <span className="review-count">({product.reviews || reviewSummary.total_reviews || 0} Reviews)</span>
              </div>
              <span className="meta-separator">|</span>
              <span className="product-sku">SKU: {product.sku}</span>
              <span className="meta-separator">|</span>
              <span className={`product-stock ${product.inStock ? 'in-stock' : 'out-stock'}`}>
                {product.inStock ? 'In Stock' : 'Out of Stock'}
              </span>
            </div>

            <div className="product-pricing-box">
              <span className="current-price">₹{Number(product.price).toFixed(2)}</span>
              {product.originalPrice > product.price && (
                <span className="original-price">₹{Number(product.originalPrice).toFixed(2)}</span>
              )}
            </div>

            <p className="product-short-desc">
              {product.description?.substring(0, 160)}...
            </p>

            {currentLocation !== 'Select Location' && (
              <div
                className="delivery-availability"
                style={{
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  padding: '12px 15px',
                  borderRadius: '8px',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px'
                }}
              >
                <Truck size={20} color="var(--primary-dark)" style={{ marginTop: '2px' }} />
                <div>
                  <div
                    style={{
                      color: 'var(--primary-dark)',
                      fontWeight: '600',
                      fontSize: '0.95rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <ShieldCheck size={16} /> Delivery available to {currentLocation}
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
                    Get it in <strong>30–45 min</strong>
                  </div>
                </div>
              </div>
            )}

            <div className="product-actions-box">
              <div className="quantity-selector">
                <button onClick={() => handleQuantityChange('dec')}>
                  <Minus size={16} />
                </button>
                <input type="text" value={quantity} readOnly />
                <button onClick={() => handleQuantityChange('inc')}>
                  <Plus size={16} />
                </button>
              </div>

              <div className="action-buttons-row">
                <button className="btn-primary add-cart-btn" onClick={handleAddToCart} disabled={!product.inStock}>
                  <ShoppingCart size={18} /> ADD TO CART
                </button>
                <button
                  type="button"
                  className={`wishlist-icon-btn ${isWishlisted(product.id) ? 'active' : ''}`}
                  onClick={() => toggleWishlist(product)}
                  title={isWishlisted(product.id) ? 'Remove from Wishlist' : 'Add to Wishlist'}
                  aria-label={isWishlisted(product.id) ? 'Remove from Wishlist' : 'Add to Wishlist'}
                >
                  <Heart
                    size={20}
                    className={isWishlisted(product.id) ? 'filled' : ''}
                    fill={isWishlisted(product.id) ? '#ef4444' : 'none'}
                    color={isWishlisted(product.id) ? '#ef4444' : 'currentColor'}
                  />
                </button>
              </div>

              <button className="btn-outline buy-now-btn" onClick={handleBuyNow} disabled={!product.inStock}>
                BUY NOW
              </button>
            </div>

            {/* Trust Features */}
            <div className="product-trust-features">
              <div className="trust-item">
                <ShieldCheck size={20} className="trust-icon" />
                <span>100% Genuine</span>
              </div>
              <div className="trust-item">
                <Truck size={20} className="trust-icon" />
                <span>Fast Delivery</span>
              </div>
              <div className="trust-item">
                <RotateCcw size={20} className="trust-icon" />
                <span>Easy Returns</span>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM SECTION: Tabs */}
        <div className="product-tabs-section">
          <div className="tabs-header">
            {[
              { id: 'description', label: 'Description' },
              { id: 'benefits', label: 'Benefits' },
              { id: 'ingredients', label: 'Ingredients' },
              { id: 'how to use', label: 'How to Use' },
              { id: 'warnings', label: 'Warnings' },
              { id: 'specifications', label: 'Specifications' },
              { id: 'reviews', label: `Reviews (${product.reviews || reviewSummary.total_reviews || 0})` }
            ].map((tab) => (
              <button
                key={tab.id}
                className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="tab-content">
            {activeTab === 'description' && <p>{product.description}</p>}

            {activeTab === 'benefits' && (
              <ul className="content-list">
                {(product.benefits || DEFAULT_PRODUCT.benefits).map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            )}

            {activeTab === 'ingredients' && <p>{product.ingredients || DEFAULT_PRODUCT.ingredients}</p>}

            {activeTab === 'how to use' && <p>{product.howToUse || DEFAULT_PRODUCT.howToUse}</p>}

            {activeTab === 'warnings' && <p className="warning-text">{product.warnings || DEFAULT_PRODUCT.warnings}</p>}

            {activeTab === 'specifications' && (
              <div className="specs-grid">
                {(product.specifications || DEFAULT_PRODUCT.specifications).map((spec, i) => (
                  <div key={i} className="spec-row">
                    <span className="spec-label">{spec.label}</span>
                    <span className="spec-value">{spec.value}</span>
                  </div>
                ))}
              </div>
            )}

            {/* REVIEWS TAB */}
            {activeTab === 'reviews' && (
              <div className="reviews-tab-container">
                {/* Summary & Rating Distribution Panel */}
                <div className="reviews-summary-panel">
                  <div className="reviews-score-block">
                    <div className="reviews-big-number">
                      {Number(reviewSummary.average_rating || product.rating || 0).toFixed(1)}
                    </div>
                    <div className="reviews-stars-row">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          size={18}
                          fill={s <= Math.round(reviewSummary.average_rating || product.rating || 5) ? '#F59E0B' : '#E2E8F0'}
                          color={s <= Math.round(reviewSummary.average_rating || product.rating || 5) ? '#F59E0B' : '#CBD5E1'}
                        />
                      ))}
                    </div>
                    <div className="reviews-total-text">
                      Based on <strong>{reviewSummary.total_reviews || product.reviews || 0}</strong> verified reviews
                    </div>
                  </div>

                  <div className="reviews-distribution-bars">
                    {(reviewSummary.distribution && reviewSummary.distribution.length > 0
                      ? reviewSummary.distribution
                      : [
                          { stars: 5, percentage: 80, count: 2 },
                          { stars: 4, percentage: 20, count: 1 },
                          { stars: 3, percentage: 0, count: 0 },
                          { stars: 2, percentage: 0, count: 0 },
                          { stars: 1, percentage: 0, count: 0 }
                        ]
                    ).map((d) => (
                      <div key={d.stars} className="dist-bar-row">
                        <span className="dist-bar-label">
                          {d.stars} <Star size={12} fill="#F59E0B" color="#F59E0B" />
                        </span>
                        <div className="dist-bar-track">
                          <div className="dist-bar-fill" style={{ width: `${d.percentage}%` }} />
                        </div>
                        <span className="dist-bar-pct">{d.percentage}%</span>
                      </div>
                    ))}
                  </div>

                  <div className="reviews-cta-block">
                    <button
                      type="button"
                      className="write-review-cta-btn"
                      onClick={() => setShowWriteReview(!showWriteReview)}
                    >
                      <MessageSquare size={16} />
                      {showWriteReview ? 'Cancel Review' : 'Write a Review'}
                    </button>
                  </div>
                </div>

                {/* Write Review Form */}
                {showWriteReview && (
                  <div className="write-review-form-card">
                    <h3 className="write-review-title">Write Your Review</h3>

                    {reviewMessage && (
                      <div
                        style={{
                          padding: '12px 16px',
                          borderRadius: '8px',
                          marginBottom: '16px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          fontSize: '14px',
                          fontWeight: '500',
                          backgroundColor: reviewMessage.type === 'error' ? '#FEF2F2' : '#ECFDF5',
                          color: reviewMessage.type === 'error' ? '#EF4444' : '#10B981',
                          border: `1px solid ${reviewMessage.type === 'error' ? '#FECACA' : '#A7F3D0'}`
                        }}
                      >
                        {reviewMessage.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
                        <span>{reviewMessage.text}</span>
                      </div>
                    )}

                    <form onSubmit={handleSubmitReview}>
                      <div className="review-form-group">
                        <label>Your Rating *</label>
                        <div className="star-rating-selector">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              className="star-btn"
                              onMouseEnter={() => setHoverRating(star)}
                              onMouseLeave={() => setHoverRating(0)}
                              onClick={() => setNewRating(star)}
                              aria-label={`${star} star rating`}
                            >
                              <Star
                                size={26}
                                fill={(hoverRating || newRating) >= star ? '#F59E0B' : '#E2E8F0'}
                                color={(hoverRating || newRating) >= star ? '#F59E0B' : '#CBD5E1'}
                              />
                            </button>
                          ))}
                          <span style={{ fontSize: '14px', fontWeight: '700', color: '#B45309', marginLeft: '6px' }}>
                            {newRating}.0 Stars
                          </span>
                        </div>
                      </div>

                      <div className="review-form-group">
                        <label htmlFor="rev-title">Review Headline / Title</label>
                        <input
                          id="rev-title"
                          type="text"
                          className="review-form-input"
                          placeholder="e.g. Highly effective and fast results!"
                          value={newTitle}
                          onChange={(e) => setNewTitle(e.target.value)}
                        />
                      </div>

                      <div className="review-form-group">
                        <label htmlFor="rev-comment">Review Description *</label>
                        <textarea
                          id="rev-comment"
                          rows={4}
                          className="review-form-textarea"
                          placeholder="What did you like or dislike about this product? How did it help you?"
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          required
                        />
                      </div>

                      <button
                        type="submit"
                        className="btn-primary"
                        disabled={submittingReview}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                      >
                        <Send size={16} />
                        {submittingReview ? 'Submitting...' : 'Submit Review'}
                      </button>
                    </form>
                  </div>
                )}

                {/* Customer Reviews List */}
                <div className="customer-reviews-list">
                  {loadingReviews ? (
                    <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)' }}>
                      Loading customer reviews...
                    </div>
                  ) : reviewsList.length > 0 ? (
                    reviewsList.map((rev) => (
                      <div key={rev.id} className="customer-review-card">
                        <div className="cust-rev-header">
                          <div className="cust-rev-user">
                            <div className="cust-rev-avatar">
                              {(rev.customer_name || 'C').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center' }}>
                                <span className="cust-rev-name">{rev.customer_name}</span>
                                {rev.verified_purchase && (
                                  <span className="cust-rev-verified">
                                    <ShieldCheck size={11} /> Verified Purchase
                                  </span>
                                )}
                              </div>
                              <span className="cust-rev-date">
                                {new Date(rev.created_at).toLocaleDateString('en-GB', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric'
                                })}
                              </span>
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '2px', color: '#F59E0B' }}>
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                size={14}
                                fill={s <= rev.rating ? '#F59E0B' : '#E2E8F0'}
                                color={s <= rev.rating ? '#F59E0B' : '#CBD5E1'}
                              />
                            ))}
                          </div>
                        </div>

                        {rev.title && <div className="cust-rev-title">{rev.title}</div>}
                        <div className="cust-rev-comment">{rev.comment}</div>
                      </div>
                    ))
                  ) : (
                    <div style={{ textAlign: 'center', padding: '40px 20px', background: '#F8FAFC', borderRadius: '8px' }}>
                      <p style={{ color: 'var(--text-muted)', marginBottom: '14px' }}>
                        No reviews yet for this product. Be the first to share your thoughts!
                      </p>
                      <button
                        type="button"
                        className="btn-outline"
                        onClick={() => setShowWriteReview(true)}
                      >
                        Write the First Review
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RELATED PRODUCTS */}
        <div className="related-products-section">
          <div className="section-title">
            <h2>Related Products</h2>
          </div>
          <div className="shop-grid">
            {RELATED_PRODUCTS.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
