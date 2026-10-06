import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { 
  Filter, 
  ChevronDown, 
  ChevronRight, 
  Check, 
  X, 
  Star, 
  RotateCcw, 
  PackageOpen, 
  AlertCircle 
} from 'lucide-react';
import ProductCard from '../components/ProductCard/ProductCard';
import { ProductSkeleton } from '../components/Skeletons/Skeletons';
import api from '../services/api';
import './Shop.css';

// Predefined price ranges
const PRICE_RANGES = [
  { id: 'under-500', label: 'Under ₹500' },
  { id: '500-1000', label: '₹500 – ₹1000' },
  { id: '1000-5000', label: '₹1000 – ₹5000' },
  { id: 'over-5000', label: 'Over ₹5000' },
];

// Predefined rating filters
const RATING_OPTIONS = [
  { id: '4', label: '4★ & Above', minRating: 4 },
  { id: '3', label: '3★ & Above', minRating: 3 },
];

export default function Shop() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Mobile drawer state
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Filter options data from MySQL
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingBrands, setLoadingBrands] = useState(true);
  const [categoriesError, setCategoriesError] = useState(null);
  const [brandsError, setBrandsError] = useState(null);

  // Products and pagination state
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, totalPages: 1 });
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [productsError, setProductsError] = useState(null);

  // Read filter state directly from URL query parameters
  const selectedCategories = useMemo(() => {
    const raw = searchParams.get('categories') || searchParams.get('category');
    return raw ? raw.split(',').filter(Boolean) : [];
  }, [searchParams]);

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

  const searchQuery = useMemo(() => {
    return searchParams.get('search') || '';
  }, [searchParams]);

  // Total active filter count
  const totalActiveFilters = useMemo(() => {
    return selectedCategories.length + selectedBrands.length + selectedPriceRanges.length + (selectedRating ? 1 : 0);
  }, [selectedCategories, selectedBrands, selectedPriceRanges, selectedRating]);

  // Load Categories from backend
  const fetchCategories = useCallback(async () => {
    setLoadingCategories(true);
    setCategoriesError(null);
    try {
      const res = await api.getCategories();
      if (res && res.success) {
        // Only active categories
        const activeCats = (res.data || []).filter(c => c.status === 'ACTIVE');
        setCategories(activeCats);
      } else {
        setCategoriesError('Unable to load categories.');
      }
    } catch (err) {
      console.error('Failed to load categories', err);
      setCategoriesError('Unable to load categories.');
    } finally {
      setLoadingCategories(false);
    }
  }, []);

  // Load Brands from backend
  const fetchBrands = useCallback(async () => {
    setLoadingBrands(true);
    setBrandsError(null);
    try {
      const res = await api.getBrands();
      if (res && res.success) {
        // Only active brands
        const activeBrands = (res.data || []).filter(b => b.status === 'ACTIVE');
        setBrands(activeBrands);
      } else {
        setBrandsError('Unable to load brands.');
      }
    } catch (err) {
      console.error('Failed to load brands', err);
      setBrandsError('Unable to load brands.');
    } finally {
      setLoadingBrands(false);
    }
  }, []);

  // Fetch initial filter data
  useEffect(() => {
    fetchCategories();
    fetchBrands();
  }, [fetchCategories, fetchBrands]);

  // Load Products from backend based on URL query parameters
  const fetchProducts = useCallback(async () => {
    setLoadingProducts(true);
    setProductsError(null);

    const query = {
      page: currentPage,
      limit: 12,
      sort: sortBy
    };

    if (selectedCategories.length > 0) {
      query.categories = selectedCategories.join(',');
    }
    if (selectedBrands.length > 0) {
      query.brands = selectedBrands.join(',');
    }
    if (selectedPriceRanges.length > 0) {
      query.price = selectedPriceRanges.join(',');
    }
    if (selectedRating) {
      query.rating = selectedRating;
    }
    if (searchQuery) {
      query.search = searchQuery;
    }

    try {
      const res = await api.getProducts(query);
      if (res && res.success) {
        const prodData = res.data;
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
        setProductsError('Unable to load products.');
      }
    } catch (err) {
      console.error('Failed to load products', err);
      setProductsError('Unable to load products.');
    } finally {
      setLoadingProducts(false);
    }
  }, [currentPage, sortBy, selectedCategories, selectedBrands, selectedPriceRanges, selectedRating, searchQuery]);

  // Trigger product fetch whenever query parameters change
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Helper to update URL search parameters while preserving other parameters
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

  // Toggle Category Filter
  const toggleCategory = (slugOrId) => {
    const current = [...selectedCategories];
    const index = current.indexOf(slugOrId);
    if (index > -1) {
      current.splice(index, 1);
    } else {
      current.push(slugOrId);
    }
    // Updating filter resets page to 1
    updateUrlParams({ categories: current, page: 1 });
  };

  // Toggle Brand Filter
  const toggleBrand = (slugOrId) => {
    const current = [...selectedBrands];
    const index = current.indexOf(slugOrId);
    if (index > -1) {
      current.splice(index, 1);
    } else {
      current.push(slugOrId);
    }
    // Updating filter resets page to 1
    updateUrlParams({ brands: current, page: 1 });
  };

  // Toggle Price Range Filter (OR behavior across multiple selections)
  const togglePriceRange = (rangeId) => {
    const current = [...selectedPriceRanges];
    const index = current.indexOf(rangeId);
    if (index > -1) {
      current.splice(index, 1);
    } else {
      current.push(rangeId);
    }
    // Updating filter resets page to 1
    updateUrlParams({ price: current, page: 1 });
  };

  // Toggle Rating Filter (Clicking active rating deselects it)
  const toggleRating = (ratingVal) => {
    const nextVal = selectedRating === ratingVal ? '' : ratingVal;
    // Updating filter resets page to 1
    updateUrlParams({ rating: nextVal, page: 1 });
  };

  // Change Sort
  const handleSortChange = (newSort) => {
    updateUrlParams({ sort: newSort });
  };

  // Change Page
  const handlePageChange = (newPage) => {
    updateUrlParams({ page: newPage });
    window.scrollTo({ top: 120, behavior: 'smooth' });
  };

  // Clear All Filters
  const clearAllFilters = () => {
    const nextParams = new URLSearchParams();
    if (searchQuery) {
      nextParams.set('search', searchQuery);
    }
    if (sortBy !== 'featured') {
      nextParams.set('sort', sortBy);
    }
    setSearchParams(nextParams, { replace: false });
    setIsMobileFilterOpen(false);
  };

  // Get human readable label for chips
  const getCategoryName = (slugOrId) => {
    const cat = categories.find(c => c.slug === slugOrId || c.id.toString() === slugOrId.toString());
    return cat ? cat.name : slugOrId;
  };

  const getBrandName = (slugOrId) => {
    const b = brands.find(item => item.slug === slugOrId || item.id.toString() === slugOrId.toString());
    return b ? b.name : slugOrId;
  };

  const getPriceLabel = (rangeId) => {
    const p = PRICE_RANGES.find(r => r.id === rangeId);
    return p ? p.label : rangeId;
  };

  // Calculate results count description
  const resultSummary = useMemo(() => {
    const { total, page, limit } = pagination;
    if (total === 0) return 'Showing 0 products';
    const start = (page - 1) * limit + 1;
    const end = Math.min(page * limit, total);
    return `Showing ${start}–${end} of ${total} products`;
  }, [pagination]);

  // Sidebar filter components JSX to reuse in desktop and mobile drawer
  const FilterContent = (
    <>
      {/* Categories Filter */}
      <div className="filter-group">
        <h3 className="filter-title">
          <span>Categories</span>
        </h3>
        {categoriesError ? (
          <div className="filter-error-alert">
            <span>{categoriesError}</span>
            <button onClick={fetchCategories}>Retry</button>
          </div>
        ) : loadingCategories ? (
          <div className="text-muted" style={{ fontSize: '0.88rem' }}>Loading categories...</div>
        ) : (
          <div className="filter-options">
            {categories.map((cat) => {
              const identifier = cat.slug || cat.id.toString();
              const isChecked = selectedCategories.includes(identifier);
              return (
                <label key={cat.id} className="custom-checkbox">
                  <input 
                    type="checkbox" 
                    checked={isChecked} 
                    onChange={() => toggleCategory(identifier)}
                  />
                  <span className="checkmark"><Check size={12} /></span>
                  <span className="label-text">{cat.name}</span>
                  {cat.product_count !== undefined && (
                    <span className="count">({cat.product_count})</span>
                  )}
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* Brands Filter */}
      <div className="filter-group">
        <h3 className="filter-title">
          <span>Brands</span>
        </h3>
        {brandsError ? (
          <div className="filter-error-alert">
            <span>{brandsError}</span>
            <button onClick={fetchBrands}>Retry</button>
          </div>
        ) : loadingBrands ? (
          <div className="text-muted" style={{ fontSize: '0.88rem' }}>Loading brands...</div>
        ) : (
          <div className="filter-options">
            {brands.map((brand) => {
              const identifier = brand.slug || brand.id.toString();
              const isChecked = selectedBrands.includes(identifier);
              return (
                <label key={brand.id} className="custom-checkbox">
                  <input 
                    type="checkbox" 
                    checked={isChecked} 
                    onChange={() => toggleBrand(identifier)}
                  />
                  <span className="checkmark"><Check size={12} /></span>
                  <span className="label-text">{brand.name}</span>
                  {brand.product_count !== undefined && (
                    <span className="count">({brand.product_count})</span>
                  )}
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* Price Filter */}
      <div className="filter-group">
        <h3 className="filter-title">
          <span>Price</span>
        </h3>
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
        <h3 className="filter-title">
          <span>Rating</span>
        </h3>
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
    </>
  );

  return (
    <div className="shop-page">
      {/* Page Header */}
      <div className="page-header">
        <div className="container">
          <div className="breadcrumbs">
            <Link to="/">Home</Link>
            <ChevronRight size={14} />
            <span>Shop</span>
          </div>
          <h1 className="page-title">Shop Healthcare Products</h1>
        </div>
      </div>

      <div className="container">
        <div className="shop-layout">
          
          {/* Mobile Filter Toggle Button */}
          <button 
            className="mobile-filter-toggle btn-outline"
            onClick={() => setIsMobileFilterOpen(true)}
            aria-label="Open Filters Drawer"
          >
            <Filter size={18} />
            <span>Filters</span>
            {totalActiveFilters > 0 && (
              <span className="mobile-filter-badge">{totalActiveFilters}</span>
            )}
          </button>

          {/* Mobile Drawer Overlay */}
          {isMobileFilterOpen && (
            <div 
              className="shop-sidebar-backdrop" 
              onClick={() => setIsMobileFilterOpen(false)}
            />
          )}

          {/* Sidebar (Desktop visible, Mobile slide-in drawer) */}
          <aside className={`shop-sidebar ${isMobileFilterOpen ? 'open' : ''}`}>
            {/* Mobile Drawer Header */}
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
              {/* Desktop Filter Header */}
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

              {FilterContent}
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

          {/* Main Content Area */}
          <main className="shop-main">
            
            {/* Toolbar */}
            <div className="shop-toolbar">
              <div className="toolbar-results">
                {resultSummary}
              </div>
              
              <div className="toolbar-sort">
                <label htmlFor="shop-sort-select">Sort By:</label>
                <div className="custom-select">
                  <select 
                    id="shop-sort-select"
                    value={sortBy} 
                    onChange={(e) => handleSortChange(e.target.value)}
                  >
                    <option value="featured">Featured</option>
                    <option value="popularity">Popularity</option>
                    <option value="latest">Newest</option>
                    <option value="price-low">Price: Low to High</option>
                    <option value="price-high">Price: High to Low</option>
                    <option value="rating">Rating</option>
                    <option value="name-asc">Name: A-Z</option>
                    <option value="name-desc">Name: Z-A</option>
                  </select>
                  <ChevronDown size={16} className="select-icon" />
                </div>
              </div>
            </div>

            {/* Active Filter Chips / Pills */}
            {totalActiveFilters > 0 && (
              <div className="active-filters-bar">
                <span className="active-filters-label">Active Filters:</span>
                
                {/* Categories Chips */}
                {selectedCategories.map((catKey) => (
                  <span key={`cat-${catKey}`} className="filter-chip">
                    {getCategoryName(catKey)}
                    <button 
                      onClick={() => toggleCategory(catKey)} 
                      aria-label={`Remove ${getCategoryName(catKey)}`}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}

                {/* Brands Chips */}
                {selectedBrands.map((brandKey) => (
                  <span key={`brand-${brandKey}`} className="filter-chip">
                    {getBrandName(brandKey)}
                    <button 
                      onClick={() => toggleBrand(brandKey)} 
                      aria-label={`Remove ${getBrandName(brandKey)}`}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}

                {/* Price Chips */}
                {selectedPriceRanges.map((rangeKey) => (
                  <span key={`price-${rangeKey}`} className="filter-chip">
                    {getPriceLabel(rangeKey)}
                    <button 
                      onClick={() => togglePriceRange(rangeKey)} 
                      aria-label={`Remove price filter`}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}

                {/* Rating Chip */}
                {selectedRating && (
                  <span className="filter-chip">
                    {selectedRating}★ & Above
                    <button 
                      onClick={() => toggleRating(selectedRating)} 
                      aria-label="Remove rating filter"
                    >
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

            {/* Error Notification if products failed to load */}
            {productsError && (
              <div className="filter-error-alert" style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertCircle size={18} />
                  <span>{productsError}</span>
                </div>
                <button onClick={fetchProducts}>Try Again</button>
              </div>
            )}

            {/* Product Grid */}
            <div className="shop-products-grid">
              {loadingProducts ? (
                // Show 8 skeletons while loading filtered products
                [...Array(8)].map((_, i) => <ProductSkeleton key={i} />)
              ) : (
                products.length > 0 ? (
                  products.map(product => (
                    <ProductCard key={product.id} product={product} />
                  ))
                ) : (
                  <div className="no-products-found">
                    <div className="no-products-icon">
                      <PackageOpen size={32} />
                    </div>
                    <h3>No products found</h3>
                    <p>Try changing your filters or search criteria.</p>
                    <button 
                      type="button" 
                      className="btn-clear-filters"
                      onClick={clearAllFilters}
                    >
                      <RotateCcw size={16} />
                      Clear All Filters
                    </button>
                  </div>
                )
              )}
            </div>

            {/* Dynamic Pagination */}
            {!loadingProducts && pagination.totalPages > 1 && (
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
                  const pageNum = i + 1;
                  // Show current, first, last, and immediate siblings
                  if (
                    pageNum === 1 ||
                    pageNum === pagination.totalPages ||
                    (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                  ) {
                    return (
                      <button 
                        key={pageNum}
                        className={`page-btn ${pageNum === currentPage ? 'active' : ''}`}
                        onClick={() => handlePageChange(pageNum)}
                      >
                        {pageNum}
                      </button>
                    );
                  }
                  if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                    return <span key={pageNum} className="page-dots">...</span>;
                  }
                  return null;
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
