import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import api from '../services/api';

const WishlistContext = createContext();

export const useWishlist = () => useContext(WishlistContext);

export const WishlistProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const { addToast } = useToast();

  const [wishlistItems, setWishlistItems] = useState([]);
  const [loadingWishlist, setLoadingWishlist] = useState(false);
  const [actionLoading, setActionLoading] = useState({}); // Per-product loading state: { [productId]: boolean }

  // Fetch wishlist from MySQL backend whenever currentUser changes
  const refreshWishlist = useCallback(async () => {
    if (!currentUser) {
      setWishlistItems([]);
      return;
    }

    setLoadingWishlist(true);
    try {
      const res = await api.getWishlist();
      if (res && res.success && Array.isArray(res.items)) {
        setWishlistItems(res.items);
      } else {
        setWishlistItems([]);
      }
    } catch (err) {
      console.error("Failed to load wishlist from server:", err);
      // If 401 Unauthorized, clear wishlist
      if (err.response?.status === 401) {
        setWishlistItems([]);
      }
    } finally {
      setLoadingWishlist(false);
    }
  }, [currentUser]);

  useEffect(() => {
    refreshWishlist();
  }, [refreshWishlist]);

  // Set of wishlisted product IDs for O(1) instant lookup
  const wishlistedIdsSet = useMemo(() => {
    return new Set(wishlistItems.map(item => Number(item.product_id || item.id)));
  }, [wishlistItems]);

  const isWishlisted = useCallback((productId) => {
    if (!productId) return false;
    return wishlistedIdsSet.has(Number(productId));
  }, [wishlistedIdsSet]);

  const addWishlist = async (product) => {
    if (!product || !product.id) return false;
    const pId = Number(product.id);

    if (!currentUser) {
      addToast('Please login to save items to your wishlist', 'info');
      return false;
    }

    if (actionLoading[pId]) return false; // Duplicate click lock

    setActionLoading(prev => ({ ...prev, [pId]: true }));
    try {
      const res = await api.addToWishlist(pId);
      if (res && res.success) {
        setWishlistItems(prev => {
          if (prev.some(item => Number(item.product_id || item.id) === pId)) {
            return prev;
          }
          return [{ ...product, product_id: pId, id: pId, is_wishlisted: true }, ...prev];
        });
        addToast('Added to wishlist', 'success');
        return true;
      } else {
        addToast(res?.message || 'Failed to add to wishlist', 'error');
        return false;
      }
    } catch (err) {
      console.error("Error adding to wishlist:", err);
      const msg = err.response?.data?.message || 'Unable to update wishlist';
      addToast(msg, 'error');
      return false;
    } finally {
      setActionLoading(prev => ({ ...prev, [pId]: false }));
    }
  };

  const removeWishlist = async (productId) => {
    if (!productId) return false;
    const pId = Number(productId);

    if (!currentUser) {
      addToast('Please login to manage your wishlist', 'info');
      return false;
    }

    if (actionLoading[pId]) return false; // Duplicate click lock

    setActionLoading(prev => ({ ...prev, [pId]: true }));
    try {
      const res = await api.removeFromWishlist(pId);
      if (res && res.success) {
        setWishlistItems(prev => prev.filter(item => Number(item.product_id || item.id) !== pId));
        addToast('Removed from wishlist', 'info');
        return true;
      } else {
        addToast(res?.message || 'Failed to remove from wishlist', 'error');
        return false;
      }
    } catch (err) {
      console.error("Error removing from wishlist:", err);
      const msg = err.response?.data?.message || 'Unable to update wishlist';
      addToast(msg, 'error');
      return false;
    } finally {
      setActionLoading(prev => ({ ...prev, [pId]: false }));
    }
  };

  const toggleWishlist = async (product) => {
    if (!product || !product.id) return;
    const pId = Number(product.id);
    if (isWishlisted(pId)) {
      await removeWishlist(pId);
    } else {
      await addWishlist(product);
    }
  };

  const value = {
    wishlistItems,
    items: wishlistItems, // Backward compatibility alias
    wishlistCount: wishlistItems.length,
    loadingWishlist,
    actionLoading,
    addWishlist,
    removeWishlist,
    toggleWishlist,
    isWishlisted,
    refreshWishlist
  };

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
};
