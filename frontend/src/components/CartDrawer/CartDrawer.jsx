import { Link, useNavigate } from 'react-router-dom';
import { X, Trash2, ShoppingBag } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import heroImg from '../../assets/images/hero-products.jpg'; // Placeholder
import './CartDrawer.css';

export default function CartDrawer({ isOpen, onClose }) {
  const { items: cartItems, removeFromCart, subtotal } = useCart();
  const navigate = useNavigate();

  const handleCheckout = () => {
    onClose();
    navigate('/checkout');
  };

  const handleViewCart = () => {
    onClose();
    navigate('/cart');
  };

  return (
    <>
      <div className={`cart-drawer-overlay ${isOpen ? 'open' : ''}`} onClick={onClose}></div>
      <div className={`cart-drawer ${isOpen ? 'open' : ''}`}>
        
        <div className="cart-drawer-header">
          <h3>Your Cart ({cartItems.length})</h3>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="cart-drawer-content">
          {cartItems.length === 0 ? (
            <div className="cart-drawer-empty">
              <ShoppingBag size={50} className="empty-icon" />
              <h4>Your cart is empty</h4>
              <p>Looks like you haven't added anything yet.</p>
              <button className="btn-primary mt-20" onClick={() => { onClose(); navigate('/shop'); }}>
                Start Shopping
              </button>
            </div>
          ) : (
            <div className="cart-drawer-items">
              {cartItems.map((item) => (
                <div key={item.id} className="drawer-item">
                  <div className="drawer-item-img">
                    <img src={item.image || heroImg} alt={item.name} />
                  </div>
                  <div className="drawer-item-info">
                    <Link to={`/product/${item.id}`} onClick={onClose} className="drawer-item-title">
                      {item.name}
                    </Link>
                    <div className="drawer-item-meta">
                      <span className="drawer-item-price">₹{item.price}</span>
                      <span className="drawer-item-qty">Qty: {item.quantity}</span>
                    </div>
                  </div>
                  <button className="drawer-remove-btn" onClick={() => removeFromCart(item.id)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {cartItems.length > 0 && (
          <div className="cart-drawer-footer">
            <div className="drawer-subtotal">
              <span>Subtotal:</span>
              <span className="amount">₹{subtotal.toFixed(2)}</span>
            </div>
            <p className="drawer-tax-note">Taxes and shipping calculated at checkout</p>
            <div className="drawer-actions">
              <button className="btn-outline view-cart-btn" onClick={handleViewCart}>
                VIEW CART
              </button>
              <button className="btn-primary checkout-btn" onClick={handleCheckout}>
                CHECKOUT
              </button>
            </div>
          </div>
        )}
        
      </div>
    </>
  );
}
