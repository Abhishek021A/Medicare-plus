import { createContext, useState, useEffect, useContext } from 'react';
import { useToast } from './ToastContext';

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
  const { addToast } = useToast();
  const [items, setItems] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Load from local storage
  useEffect(() => {
    const storedCart = localStorage.getItem('medicare_cart');
    if (storedCart) {
      setItems(JSON.parse(storedCart));
    }
  }, []);

  // Save to local storage on change
  useEffect(() => {
    localStorage.setItem('medicare_cart', JSON.stringify(items));
  }, [items]);

  const addToCart = (product, quantity = 1) => {
    setItems(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) {
        return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + quantity } : i);
      }
      return [...prev, { ...product, quantity }];
    });
    setIsCartOpen(true);
    addToast('Added to cart');
  };

  const removeFromCart = (productId) => {
    setItems(prev => prev.filter(i => i.id !== productId));
    addToast('Removed from cart');
  };

  const updateQuantity = (productId, quantity) => {
    if (quantity < 1) return;
    setItems(prev => prev.map(i => i.id === productId ? { ...i, quantity } : i));
  };

  const [appliedCoupon, setAppliedCoupon] = useState(() => {
    try {
      const saved = localStorage.getItem('medicare_applied_coupon');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (appliedCoupon) {
      localStorage.setItem('medicare_applied_coupon', JSON.stringify(appliedCoupon));
    } else {
      localStorage.removeItem('medicare_applied_coupon');
    }
  }, [appliedCoupon]);

  const clearCart = () => {
    setItems([]);
    setAppliedCoupon(null);
  };

  const subtotal = items.reduce((sum, item) => sum + (item.sale_price || item.price) * item.quantity, 0);
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  const value = {
    items,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    subtotal,
    totalItems,
    isCartOpen,
    setIsCartOpen,
    appliedCoupon,
    setAppliedCoupon
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
