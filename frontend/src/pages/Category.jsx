import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { Filter, ChevronDown, ChevronRight, Check, Star, AlertCircle, RotateCcw, X } from 'lucide-react';
import ProductCard from '../components/ProductCard/ProductCard';
import { ProductSkeleton } from '../components/Skeletons/Skeletons';
import SEO from '../components/SEO/SEO';
import api from '../services/api';
import './Category.css';
import '../pages/Shop.css';

// Predefined price ranges
const PRICE_RANGES = [
  { id: 'under-500', label: 'Under ₹500' },
  { id: '500-1000', label: '₹500 – ₹1000' },
  { id: '1000-5000', label: '₹1000 – ₹5000' },
  { id: 'over-5000', label: 'Over ₹5000' },
];

// Predefined rating options
const RATING_OPTIONS = [
  { id: '4', label: '4★ & Above', minRating: 4 },
  { id: '3', label: '3★ & Above', minRating: 3 },
];

export default function Category() {
  const { slug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [categoryData, setCategoryData] = useState(null);
  const [brands, setBrands] = useState([]);
  const [loadingBrands, setLoadingBrands] = useState(false);

  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  // Active filters from URL search params
  const selectedBrands = useMemo(() => {
    const raw = searchParams.get('brands') || searchParams.get('brand');
    return raw ? raw.split(',').filter(Boolean) : [];
  }, [searchParams]);

  const selectedPriceRanges = useMemo(() => {
    const raw = searchParams.get('price');
    return raw ? raw.split(',').filter(Boolean) : [];
  }, [searchParams]);

  const selectedRating = useMemo(() => {
    return searchParams.get('rating') || '';
  }, [searchParams]);

  const sortBy = useMemo(() => {
    return searchParams.get('sort') || 'featured';
  }, [searchParams]);

  const currentPage = useMemo(() => {
    const p = parseInt(searchParams.get('page') || '1', 10);
    return isNaN(p) || p < 1 ? 1 : p;
  }, [searchParams]);

  const totalActiveFilters = useMemo(() => {
    return selectedBrands.length + selectedPriceRanges.length + (selectedRating ? 1 : 0);
  }, [selectedBrands, selectedPriceRanges, selectedRating]);

  // 1. Fetch Category Metadata and Brands
  useEffect(() => {
    const fetchCategoryMetadata = async () => {
      try {
        const catRes = await api.getCategoryBySlug(slug);
        if (catRes && catRes.success && catRes.data) {
          setCategoryData(catRes.data);
        } else {
          setCategoryData({
            name: slug === 'all' ? 'All Products' : slug.replace(/-/g, ' ').toUpperCase(),
            description: ''
          });
        }
      } catch (err) {
        console.warn('Category metadata API returned error, using fallback title', err);
        setCategoryData({
          name: slug === 'all' ? 'All Products' : slug.replace(/-/g, ' ').toUpperCase(),
          description: ''
        });
      }
    };

    const fetchBrandsList = async () => {
      setLoadingBrands(true);
      try {
        const brandParams = slug && slug !== 'all' ? { category: slug } : {};
        const res = await api.getBrands(brandParams);
        if (res && res.success && Array.isArray(res.data)) {
          setBrands(res.data.filter(b => b.status === 'ACTIVE'));
        }
      } catch (err) {
        console.error('Failed to load brands', err);
      } finally {
        setLoadingBrands(false);
      }
    };

    fetchCategoryMetadata();
    fetchBrandsList();
  }, [slug]);

  // 2. Fetch Filtered Products for this Category
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    const query = {
      category: slug !== 'all' ? slug : undefined,
      page: currentPage,
      limit: 12,
      sort: sortBy
    };

    if (selectedBrands.length > 0) {
      query.brands = selectedBrands.join(',');
    }
    if (selectedPriceRanges.length > 0) {
      query.price = selectedPriceRanges.join(',');
    }
    if (selectedRating) {
      query.rating = selectedRating;
    }

    try {
      console.log(`[Category] Requesting products with query:`, query);
      const prodRes = await api.getProducts(query);
      console.log(`[Category] Products response:`, prodRes);

      if (prodRes && prodRes.success) {
        const prodData = prodRes.data;
        if (prodData && Array.isArray(prodData.products)) {
          setProducts(prodData.products);
          setPagination(prodData.pagination || { page: currentPage, limit: 12, total: prodData.products.length, totalPages: 1 });
        } else if (Array.isArray(prodData)) {
          setProducts(prodData);
          setPagination({ page: currentPage, limit: 12, total: prodData.length, totalPages: 1 });
        } else {
          setProducts([]);
          setPagination({ page: 1, limit: 12, total: 0, totalPages: 0 });
        }
      } else {
        const msg = prodRes?.message || 'Failed to load products from server.';
        setErrorMessage(msg);
        console.error('API Error Response:', prodRes);
      }
    } catch (err) {
      const serverMsg = err.response?.data?.message || err.message || 'Network Error';
      const status = err.response?.status ? `HTTP ${err.response.status}: ` : '';
      const fullError = `${status}${serverMsg}`;
      console.error(`API Error on /category/${slug}:`, {
        url: err.config?.url,
        params: err.config?.params,
        status: err.response?.status,
        response: err.response?.data,
        message: err.message
      });
      setErrorMessage(fullError);
    } finally {
      setLoading(false);
    }
  }, [slug, currentPage, sortBy, selectedBrands, selectedPriceRanges, selectedRating]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // URL State Updates
  const updateUrlParams = useCallback((updates) => {
    const nextParams = new URLSearchParams(searchParams);

    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) {
        nextParams.delete(key);
      } else if (Array.isArray(value)) {
        nextParams.set(key, value.join(','));
      } else {
        nextParams.set(key, value.toString());
      }
    });

    setSearchParams(nextParams, { replace: false });
  }, [searchParams, setSearchParams]);

  // Filter Toggles
  const toggleBrand = (brandIdentifier) => {
    const current = [...selectedBrands];
    const index = current.indexOf(brandIdentifier);
    if (index > -1) {
      current.splice(index, 1);
    } else {
      current.push(brandIdentifier);
    }
    updateUrlParams({ brands: current, page: 1 });
  };

  const togglePriceRange = (rangeId) => {
    const current = [...selectedPriceRanges];
    const index = current.indexOf(rangeId);
    if (index > -1) {
      current.splice(index, 1);
    } else {
      current.push(rangeId);
    }
    updateUrlParams({ price: current, page: 1 });
  };

  const toggleRating = (ratingVal) => {
    const nextVal = selectedRating === ratingVal ? '' : ratingVal;
    updateUrlParams({ rating: nextVal, page: 1 });
  };

  const handleSortChange = (newSort) => {
    updateUrlParams({ sort: newSort });
  };

  const handlePageChange = (newPage) => {
    updateUrlParams({ page: newPage });
    window.scrollTo({ top: 180, behavior: 'smooth' });
  };

  const clearAllFilters = () => {
    const nextParams = new URLSearchParams();
    if (sortBy !== 'featured') {
      nextParams.set('sort', sortBy);
    }
    setSearchParams(nextParams, { replace: false });
    setIsMobileFilterOpen(false);
  };

  const categoryName = categoryData ? categoryData.name : slug.replace(/-/g, ' ').toUpperCase();
  const categoryDesc = categoryData ? categoryData.description : '';
  const theme = 'theme-teal';

  // Toolbar count text
  const resultText = useMemo(() => {
    if (loading) return 'Loading products...';
    if (errorMessage) return 'Error loading products';
    const { total, page, limit } = pagination;
    if (total === 0) return 'Showing 0 products';
    const start = (page - 1) * limit + 1;
    const end = Math.min(page * limit, total);
    return `Showing ${start}–${end} of ${total} products`;
  }, [loading, errorMessage, pagination]);

  return (
    <div className="category-page shop-page">
      <SEO 
        title={categoryName} 
        description={`Shop for the best ${categoryName} online at Medicare Plus.`} 
      />
      
      {/* Category Banner */}
      <div className={`category-banner ${theme}`}>
        <div className="container">
          <div className="breadcrumbs">
            <Link to="/">Home</Link>
            <ChevronRight size={14} />
            <Link to="/shop">Shop</Link>
            <ChevronRight size={14} />
            <span style={{ textTransform: 'capitalize' }}>{slug.replace(/-/g, ' ')}</span>
          </div>
          <h1 className="page-title">{categoryName}</h1>
          {categoryDesc && <p className="category-desc">{categoryDesc}</p>}
        </div>
      </div>

      <div className="container">
        <div className="shop-layout">
          
          {/* Mobile Filter Toggle */}
          <button 
            className="mobile-filter-toggle btn-outline"
            onClick={() => setIsMobileFilterOpen(!isMobileFilterOpen)}
            aria-label="Open Filters"
          >
            <Filter size={18} />
            Filters {totalActiveFilters > 0 && `(${totalActiveFilters})`}
          </button>

          {/* Backdrop for Mobile Drawer */}
          {isMobileFilterOpen && (
            <div 
              className="shop-sidebar-backdrop" 
              onClick={() => setIsMobileFilterOpen(false)}
            />
          )}

          {/* Sidebar Filters */}
          <aside className={`shop-sidebar ${isMobileFilterOpen ? 'open' : ''}`}>
            
            <div className="mobile-drawer-header">
              <h3>Filters {totalActiveFilters > 0 && `(${totalActiveFilters})`}</h3>
              <button 
                className="mobile-drawer-close"
                onClick={() => setIsMobileFilterOpen(false)}
                aria-label="Close filters"
              >
                <X size={20} />
              </button>
            </div>

            <div className="shop-sidebar-content">
              {/* Header with Clear button */}
              <div className="filter-main-header">
                <span className="filter-main-title">
                  Filters
                  {totalActiveFilters > 0 && (
                    <span className="filter-count-badge">{totalActiveFilters}</span>
                  )}
                </span>
                {totalActiveFilters > 0 && (
                  <button 
                    type="button" 
                    className="clear-all-link"
                    onClick={clearAllFilters}
                  >
                    Clear All
                  </button>
                )}
              </div>

              {/* Brands Filter */}
              <div className="filter-group">
                <h3 className="filter-title">Brands</h3>
                <div className="filter-options">
                  {loadingBrands ? (
                    <div className="text-muted" style={{ fontSize: '0.85rem' }}>Loading brands...</div>
                  ) : (
                    brands.map((b) => {
                      const identifier = b.slug || b.id.toString();
                      const isChecked = selectedBrands.includes(identifier);
                      return (
                        <label key={b.id} className="custom-checkbox">
                          <input 
                            type="checkbox" 
                            checked={isChecked}
                            onChange={() => toggleBrand(identifier)}
                          />
                          <span className="checkmark"><Check size={12} /></span>
                          <span className="label-text">{b.name}</span>
                          {b.product_count !== undefined && (
                            <span className="count">({b.product_count})</span>
                          )}
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Price Filter */}
              <div className="filter-group">
                <h3 className="filter-title">Price</h3>
                <div className="filter-options">
                  {PRICE_RANGES.map((range) => {
                    const isChecked = selectedPriceRanges.includes(range.id);
                    return (
                      <label key={range.id} className="custom-checkbox">
                        <input 
                          type="checkbox" 
                          checked={isChecked}
                          onChange={() => togglePriceRange(range.id)}
                        />
                        <span className="checkmark"><Check size={12} /></span>
                        <span className="label-text">{range.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Rating Filter */}
              <div className="filter-group">
                <h3 className="filter-title">Rating</h3>
                <div className="filter-options">
                  {RATING_OPTIONS.map((rate) => {
                    const isChecked = selectedRating === rate.id;
                    return (
                      <label key={rate.id} className="custom-checkbox">
                        <input 
                          type="checkbox" 
                          checked={isChecked}
                          onChange={() => toggleRating(rate.id)}
                        />
                        <span className="checkmark"><Check size={12} /></span>
                        <span className="label-text" style={{ display: 'inline-flex', alignItems: 'center' }}>
                          <span className="rating-stars-inline">
                            {[...Array(rate.minRating)].map((_, i) => (
                              <Star key={i} size={13} fill="#F5A623" color="#F5A623" />
                            ))}
                          </span>
                          <span>{rate.label}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Mobile Drawer Footer Actions */}
            <div className="mobile-drawer-footer">
              {totalActiveFilters > 0 && (
                <button 
                  type="button" 
                  className="btn-drawer-clear"
                  onClick={clearAllFilters}
                >
                  Clear All
                </button>
              )}
              <button 
                type="button" 
                className="btn-drawer-apply"
                onClick={() => setIsMobileFilterOpen(false)}
              >
                Apply Filters
              </button>
            </div>
          </aside>

          {/* Main Content */}
          <main className="shop-main">
            
            {/* Toolbar */}
            <div className="shop-toolbar">
              <div className="toolbar-results">
                {resultText}
              </div>
              
              <div className="toolbar-sort">
                <label htmlFor="cat-sort-select">Sort By:</label>
                <div className="custom-select">
                  <select 
                    id="cat-sort-select"
                    value={sortBy} 
                    onChange={(e) => handleSortChange(e.target.value)}
                  >
                    <option value="featured">Featured</option>
                    <option value="popularity">Popularity</option>
                    <option value="latest">Newest</option>
                    <option value="price-low">Price: Low to High</option>
                    <option value="price-high">Price: High to Low</option>
                    <option value="rating">Rating</option>
                  </select>
                  <ChevronDown size={16} className="select-icon" />
                </div>
              </div>
            </div>

            {/* Active Filter Chips */}
            {totalActiveFilters > 0 && (
              <div className="active-filters-bar" style={{ marginBottom: '20px' }}>
                <span className="active-filters-label">Active Filters:</span>
                
                {selectedBrands.map((bKey) => {
                  const bObj = brands.find(item => item.slug === bKey || item.id.toString() === bKey);
                  return (
                    <span key={`b-${bKey}`} className="filter-chip">
                      Brand: {bObj ? bObj.name : bKey}
                      <button onClick={() => toggleBrand(bKey)} aria-label="Remove brand filter">
                        <X size={12} />
                      </button>
                    </span>
                  );
                })}

                {selectedPriceRanges.map((pKey) => {
                  const pObj = PRICE_RANGES.find(r => r.id === pKey);
                  return (
                    <span key={`p-${pKey}`} className="filter-chip">
                      Price: {pObj ? pObj.label : pKey}
                      <button onClick={() => togglePriceRange(pKey)} aria-label="Remove price filter">
                        <X size={12} />
                      </button>
                    </span>
                  );
                })}

                {selectedRating && (
                  <span className="filter-chip">
                    Rating: {selectedRating}★ & Above
                    <button onClick={() => toggleRating(selectedRating)} aria-label="Remove rating filter">
                      <X size={12} />
                    </button>
                  </span>
                )}

                <button 
                  type="button" 
                  className="clear-all-chip"
                  onClick={clearAllFilters}
                >
                  Clear All Filters
                </button>
              </div>
            )}

            {/* Product Grid / Error / Empty state */}
            <div className="shop-products-grid">
              {loading ? (
                // Skeletons while loading
                [...Array(8)].map((_, i) => <ProductSkeleton key={i} />)
              ) : errorMessage ? (
                <div className="no-products-found" style={{ gridColumn: '1 / -1', borderColor: '#fca5a5' }}>
                  <div className="no-products-icon" style={{ backgroundColor: '#fee2e2', color: '#dc2626' }}>
                    <AlertCircle size={32} />
                  </div>
                  <h3>Unable to load products</h3>
                  <p style={{ color: '#b91c1c' }}>API Error: {errorMessage}</p>
                  <button 
                    type="button" 
                    className="btn-clear-filters"
                    onClick={fetchProducts}
                    style={{ backgroundColor: '#dc2626' }}
                  >
                    <RotateCcw size={16} />
                    Try Again
                  </button>
                </div>
              ) : products.length > 0 ? (
                products.map(product => (
                  <ProductCard key={product.id} product={product} />
                ))
              ) : (
                <div className="no-products-found" style={{ gridColumn: '1 / -1' }}>
                  <h3>No products found for this category</h3>
                  <p className="text-muted">
                    {totalActiveFilters > 0 
                      ? "Try changing your active filters." 
                      : "We could not find any active products in this category right now."}
                  </p>
                  {totalActiveFilters > 0 && (
                    <button 
                      type="button" 
                      className="btn-clear-filters"
                      onClick={clearAllFilters}
                    >
                      <RotateCcw size={16} />
                      Clear Filters
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Pagination */}
            {!loading && !errorMessage && pagination.totalPages > 1 && (
              <div className="pagination">
                <button 
                  className="page-btn"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                  aria-label="Previous Page"
                >
                  Prev
                </button>

                {[...Array(pagination.totalPages)].map((_, i) => {
                  const pNum = i + 1;
                  return (
                    <button 
                      key={pNum}
                      className={`page-btn ${pNum === currentPage ? 'active' : ''}`}
                      onClick={() => handlePageChange(pNum)}
                    >
                      {pNum}
                    </button>
                  );
                })}

                <button 
                  className="page-btn next"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= pagination.totalPages}
                  aria-label="Next Page"
                >
                  Next
                </button>
              </div>
            )}

          </main>
        </div>
      </div>
    </div>
  );
}
