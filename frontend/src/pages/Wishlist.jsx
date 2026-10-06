import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Heart, ShoppingCart, Trash2, ArrowRight, LogIn, 
  Loader2, Check, Star, ShieldCheck, ChevronRight, Sparkles 
} from 'lucide-react';
import { useWishlist } from '../context/WishlistContext';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import placeholderImg from '../assets/images/medicine-placeholder.jpg';
import './Wishlist.css';

export default function Wishlist() {
  const { wishlistItems, loadingWishlist, removeWishlist, actionLoading } = useWishlist();
  const { currentUser, isAuthenticated, isLoading: authLoading } = useAuth();
  const { addToCart } = useCart();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [addedCartIds, setAddedCartIds] = useState({});

  // Helper to resolve images
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

  const handleAddToCart = (product, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    const pId = Number(product.id || product.product_id);
    const stock = Number(product.stock_quantity ?? 100);

    if (stock <= 0) {
      addToast('Product is currently out of stock', 'warning');
      return;
    }

    addToCart(product, 1);
    setAddedCartIds(prev => ({ ...prev, [pId]: true }));
    setTimeout(() => {
      setAddedCartIds(prev => ({ ...prev, [pId]: false }));
    }, 1500);
  };

  const handleRemove = (productId, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    removeWishlist(productId);
  };

  if (authLoading) {
    return (
      <div className="wishlist-page section-padding" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <Loader2 size={40} className="spinning text-primary" style={{ animation: 'spin 1s linear infinite', margin: '0 auto 15px auto', color: 'var(--primary)' }} />
          <p style={{ color: 'var(--text-muted)' }}>Loading wishlist...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="wishlist-page section-padding">
        <div className="container">
          <div className="wishlist-empty-state text-center" style={{ maxWidth: '600px' }}>
            <div style={{ 
              width: '72px', height: '72px', borderRadius: '50%', backgroundColor: 'rgba(8, 127, 115, 0.1)', 
              color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto' 
            }}>
              <LogIn size={36} />
            </div>
            <h2>Login Required</h2>
            <p className="text-muted mb-30" style={{ margin: '12px auto 25px auto', lineHeight: '1.6' }}>
              Please log in to your account to view or manage your wishlist. Your saved items are securely synced to your profile.
            </p>
            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
              <Link to="/login" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                Log In Now <ArrowRight size={16} />
              </Link>
              <Link to="/register" className="btn-outline">Create Account</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="wishlist-page section-padding">
      <div className="container">
        
        {/* Breadcrumbs */}
        <div className="breadcrumbs mb-30" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          <Link to="/" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Home</Link>
          <ChevronRight size={14} />
          <span>My Account</span>
          <ChevronRight size={14} />
          <span style={{ color: 'var(--primary)', fontWeight: 600 }}>Wishlist</span>
        </div>

        {/* Page Header */}
        <div className="page-header mb-30 d-flex justify-between align-center flex-wrap gap-15" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '20px' }}>
          <div>
            <h1 className="page-title" style={{ fontSize: '1.8rem', fontWeight: 700, margin: 0 }}>My Wishlist</h1>
            <p className="text-muted" style={{ margin: '5px 0 0 0', fontSize: '0.95rem' }}>
              Saved health & wellness items for <strong>{currentUser.fullName || currentUser.name}</strong>
            </p>
          </div>
          <span style={{ 
            backgroundColor: 'rgba(8, 127, 115, 0.1)', color: 'var(--primary)', 
            padding: '6px 16px', borderRadius: '20px', fontWeight: 700, fontSize: '0.9rem' 
          }}>
            {wishlistItems.length} {wishlistItems.length === 1 ? 'Item' : 'Items'} Saved
          </span>
        </div>

        {/* Content */}
        {loadingWishlist ? (
          <div style={{ padding: '80px 20px', textAlign: 'center' }}>
            <Loader2 size={36} style={{ animation: 'spin 1s linear infinite', color: 'var(--primary)', margin: '0 auto 15px auto' }} />
            <p className="text-muted">Loading your saved items...</p>
          </div>
        ) : wishlistItems.length === 0 ? (
          <div className="wishlist-empty-state text-center" style={{ padding: '70px 20px' }}>
            <div style={{ 
              width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#fef2f2', 
              color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto' 
            }}>
              <Heart size={40} />
            </div>
            <h2>Your Wishlist is Empty</h2>
            <p className="text-muted mb-30" style={{ margin: '10px auto 25px auto', maxWidth: '480px', lineHeight: '1.6' }}>
              Save your favorite healthcare products here and shop them anytime.
            </p>
            <Link to="/shop" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              Continue Shopping <ArrowRight size={16} />
            </Link>
          </div>
        ) : (
          <div className="wishlist-grid" style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
            gap: '24px', 
            marginTop: '20px' 
          }}>
            {wishlistItems.map(item => {
              const pId = Number(item.id || item.product_id);
              const price = Number(item.price) || 0;
              const salePrice = item.sale_price !== null && item.sale_price !== undefined ? Number(item.sale_price) : null;
              const hasSale = salePrice !== null && salePrice > 0 && salePrice < price;
              const currentPrice = hasSale ? salePrice : price;
              const isOutOfStock = item.stock_quantity !== undefined && item.stock_quantity !== null && Number(item.stock_quantity) <= 0;
              const isRemoving = actionLoading && !!actionLoading[pId];
              const isAdded = !!addedCartIds[pId];

              return (
                <div 
                  key={pId} 
                  className="wishlist-card"
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid var(--border)',
                    borderRadius: '16px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.04)',
                    transition: 'transform 0.2s, box-shadow 0.2s'
                  }}
                >
                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={(e) => handleRemove(pId, e)}
                    disabled={isRemoving}
                    title="Remove from Wishlist"
                    aria-label="Remove from Wishlist"
                    style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                      color: '#ef4444',
                      border: 'none',
                      cursor: isRemoving ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 2,
                      transition: 'background-color 0.2s'
                    }}
                  >
                    {isRemoving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={16} />}
                  </button>

                  {/* Product Image */}
                  <Link 
                    to={`/product/${item.slug || pId}`} 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      height: '180px', 
                      borderRadius: '12px', 
                      backgroundColor: 'var(--section-bg, #f8fafc)',
                      overflow: 'hidden',
                      marginBottom: '14px'
                    }}
                  >
                    <img 
                      src={resolveImageUrl(item.image)} 
                      alt={item.name} 
                      style={{ maxHeight: '150px', maxWidth: '100%', objectFit: 'contain' }}
                      onError={(e) => { e.target.onerror = null; e.target.src = placeholderImg; }}
                    />
                  </Link>

                  {/* Brand & Stock Status */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {item.brand_name || 'Medicare Plus'}
                    </span>
                    <span style={{ 
                      fontSize: '0.75rem', 
                      fontWeight: 600, 
                      color: isOutOfStock ? '#ef4444' : '#10b981',
                      backgroundColor: isOutOfStock ? '#fef2f2' : '#ecfdf5',
                      padding: '2px 8px',
                      borderRadius: '4px'
                    }}>
                      {isOutOfStock ? 'Out of Stock' : 'In Stock'}
                    </span>
                  </div>

                  {/* Title */}
                  <Link 
                    to={`/product/${item.slug || pId}`} 
                    style={{ textDecoration: 'none', color: 'var(--text-main)', marginBottom: '10px' }}
                  >
                    <h4 style={{ 
                      fontSize: '1rem', 
                      fontWeight: 600, 
                      margin: 0, 
                      lineHeight: '1.4', 
                      display: '-webkit-box', 
                      WebkitLineClamp: 2, 
                      WebkitBoxOrient: 'vertical', 
                      overflow: 'hidden' 
                    }}>
                      {item.name}
                    </h4>
                  </Link>

                  {/* Pricing */}
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '16px', marginTop: 'auto' }}>
                    <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)' }}>
                      ₹{currentPrice.toFixed(2)}
                    </span>
                    {hasSale && (
                      <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textDecoration: 'line-through' }}>
                        ₹{price.toFixed(2)}
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={(e) => handleAddToCart(item, e)}
                      disabled={isOutOfStock}
                      style={{
                        flex: 1,
                        padding: '10px 14px',
                        fontSize: '0.9rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        backgroundColor: isAdded ? '#10b981' : undefined
                      }}
                    >
                      {isAdded ? (
                        <>
                          <Check size={16} /> Added ✓
                        </>
                      ) : (
                        <>
                          <ShoppingCart size={16} /> {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
                        </>
                      )}
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}
