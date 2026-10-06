import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Filter, ChevronDown, Check, Search } from 'lucide-react';
import ProductCard from '../components/ProductCard/ProductCard';
import './SearchResults.css';
import '../pages/Shop.css'; // Reusing layout styles

const MOCK_PRODUCTS = [
  { id: 10, name: 'Premium Vitamin C 500mg', category: 'Vitamins', brand: 'HealthCore', price: 12.99, rating: 4.8, reviews: 124 },
  { id: 14, name: 'Omega 3 Fish Oil', category: 'Vitamins', brand: 'VitaMax', price: 24.50, rating: 4.5, reviews: 210 },
  { id: 18, name: 'Multivitamin Complex for Men', category: 'Vitamins', brand: 'HealthCore', price: 19.99, rating: 4.6, reviews: 150 },
  { id: 11, name: 'Digital Blood Pressure Monitor', category: 'Medical Devices', brand: 'MediLife', price: 45.00, originalPrice: 55.00, rating: 4.7, reviews: 45 },
];

export default function SearchResults() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [sortBy, setSortBy] = useState('featured');
  
  const initialQuery = searchParams.get('q') || '';
  const [searchInput, setSearchInput] = useState(initialQuery);

  const handleSearch = (e) => {
    e.preventDefault();
    if(searchInput.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchInput)}`);
    }
  };

  // Mock search logic: filter mock products if name or category includes query
  const queryLower = initialQuery.toLowerCase();
  const filteredProducts = initialQuery 
    ? MOCK_PRODUCTS.filter(p => p.name.toLowerCase().includes(queryLower) || p.category.toLowerCase().includes(queryLower))
    : [];

  return (
    <div className="search-page shop-page">
      
      {/* Search Header */}
      <div className="search-header">
        <div className="container">
          <h1 className="page-title">
            {initialQuery ? `Search results for "${initialQuery}"` : 'Search Products'}
          </h1>
          <p className="search-count">
            {filteredProducts.length} product{filteredProducts.length !== 1 && 's'} found
          </p>
          
          <form className="search-page-form" onSubmit={handleSearch}>
            <input 
              type="text" 
              value={searchInput} 
              onChange={(e) => setSearchInput(e.target.value)} 
              placeholder="Search medicines, vitamins..." 
            />
            <button type="submit" className="btn-primary">
              <Search size={18} /> Search
            </button>
          </form>
        </div>
      </div>

      <div className="container">
        <div className="shop-layout">
          
          {filteredProducts.length > 0 && (
            <>
              {/* Mobile Filter Toggle */}
              <button 
                className="mobile-filter-toggle btn-outline"
                onClick={() => setIsMobileFilterOpen(!isMobileFilterOpen)}
              >
                <Filter size={18} />
                Filters
              </button>

              {/* Sidebar Filters */}
              <aside className={`shop-sidebar ${isMobileFilterOpen ? 'open' : ''}`}>
                <div className="filter-group">
                  <h3 className="filter-title">Categories</h3>
                  <div className="filter-options">
                    <label className="custom-checkbox">
                      <input type="checkbox" />
                      <span className="checkmark"><Check size={12} /></span>
                      <span className="label-text">Vitamins</span>
                    </label>
                    <label className="custom-checkbox">
                      <input type="checkbox" />
                      <span className="checkmark"><Check size={12} /></span>
                      <span className="label-text">Medical Devices</span>
                    </label>
                  </div>
                </div>
              </aside>
            </>
          )}

          {/* Main Content */}
          <main className="shop-main" style={{ width: filteredProducts.length === 0 ? '100%' : 'auto' }}>
            
            {filteredProducts.length > 0 ? (
              <>
                <div className="shop-toolbar">
                  <div className="toolbar-results">
                    Showing {filteredProducts.length} results
                  </div>
                  <div className="toolbar-sort">
                    <label>Sort By:</label>
                    <div className="custom-select">
                      <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                        <option value="featured">Relevance</option>
                        <option value="price-low">Price: Low to High</option>
                        <option value="price-high">Price: High to Low</option>
                      </select>
                      <ChevronDown size={16} className="select-icon" />
                    </div>
                  </div>
                </div>

                <div className="shop-grid">
                  {filteredProducts.map(product => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              </>
            ) : (
              <div className="empty-search">
                <div className="empty-search-icon">🔍</div>
                <h2>No products found</h2>
                <p>We couldn't find anything matching your search. Please try spelling it differently or use broader terms.</p>
                <button className="btn-primary" onClick={() => document.querySelector('.search-page-form input').focus()}>
                  Try another search
                </button>
              </div>
            )}
            
          </main>
        </div>
      </div>
    </div>
  );
}
