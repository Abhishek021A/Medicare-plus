import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ShoppingCart, User, Heart, Search, Menu, MapPin, X, 
  ChevronDown, LogOut, Package, Map, Home, Info, Phone, Edit, ChevronRight, FileText
} from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { useLocationContext } from '../../context/LocationContext';
import { useAuth } from '../../context/AuthContext';
import CartDrawer from '../CartDrawer/CartDrawer';
import LocationModal from '../LocationModal/LocationModal';
import useDebounce from '../../hooks/useDebounce';
import api from '../../services/api';
import './Header.css';

export default function Header() {
  const { totalItems } = useCart();
  const { wishlistCount } = useWishlist();
  const { currentUser, logout } = useAuth();
  const { currentLocation, requestGeolocation, isLoading: locationLoading } = useLocationContext();
  const navigate = useNavigate();

  const [isScrolled, setIsScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  
  // Dropdowns
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);
  const [showMegaMenu, setShowMegaMenu] = useState(false);
  const [cartBump, setCartBump] = useState(false);
  
  // Categories State
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState(false);
  const [expandedMobileCategory, setExpandedMobileCategory] = useState(null);
  
  const accountRef = useRef(null);
  const megaMenuRef = useRef(null);

  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Sticky Header
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch Categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setCategoriesLoading(true);
        setCategoriesError(false);
        const res = await api.getCategories();
        if (res.success) {
          setCategories(res.data || []);
        } else {
          setCategoriesError(true);
        }
      } catch (err) {
        console.error("Failed to load categories", err);
        setCategoriesError(true);
      } finally {
        setCategoriesLoading(false);
      }
    };
    fetchCategories();
  }, []);

  const buildCategoryTree = (cats) => {
    const tree = [];
    const lookup = {};

    cats.forEach(c => {
      lookup[c.id] = { ...c, children: [] };
    });

    cats.forEach(c => {
      if (c.parent_id) {
        if (lookup[c.parent_id]) {
          lookup[c.parent_id].children.push(lookup[c.id]);
        }
      } else {
        tree.push(lookup[c.id]);
      }
    });

    // Sort root categories by sort_order
    tree.sort((a, b) => {
      const orderA = a.sort_order !== null && a.sort_order !== undefined ? Number(a.sort_order) : 99;
      const orderB = b.sort_order !== null && b.sort_order !== undefined ? Number(b.sort_order) : 99;
      if (orderA !== orderB) return orderA - orderB;
      return a.name.localeCompare(b.name);
    });

    // Sort subcategories by sort_order
    tree.forEach(root => {
      if (root.children && root.children.length > 0) {
        root.children.sort((a, b) => {
          const orderA = a.sort_order !== null && a.sort_order !== undefined ? Number(a.sort_order) : 99;
          const orderB = b.sort_order !== null && b.sort_order !== undefined ? Number(b.sort_order) : 99;
          if (orderA !== orderB) return orderA - orderB;
          return a.name.localeCompare(b.name);
        });
      }
    });

    return tree;
  };

  const categoryTree = buildCategoryTree(categories);

  const toggleMobileCategory = (id) => {
    setExpandedMobileCategory(prev => prev === id ? null : id);
  };

  // Cart Bump Animation
  useEffect(() => {
    if (totalItems > 0) {
      setCartBump(true);
      const timer = setTimeout(() => setCartBump(false), 400);
      return () => clearTimeout(timer);
    }
  }, [totalItems]);

  // Click outside listener for dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (accountRef.current && !accountRef.current.contains(event.target)) {
        setShowAccountDropdown(false);
      }
      if (megaMenuRef.current && !megaMenuRef.current.contains(event.target)) {
        setShowMegaMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    setShowAccountDropdown(false);
    navigate('/');
  };

  const handleLocationClick = async () => {
    // If they want to use GPS directly from header:
    // await requestGeolocation(); 
    // Or open the modal where they can type/GPS:
    setIsLocationModalOpen(true);
  };

  return (
    <>
      <LocationModal 
        isOpen={isLocationModalOpen} 
        onClose={() => setIsLocationModalOpen(false)} 
      />
      <CartDrawer 
        isOpen={isCartDrawerOpen} 
        onClose={() => setIsCartDrawerOpen(false)} 
      />

      <header className={`header-premium ${isScrolled ? 'is-scrolled' : ''}`}>
        
        {/* --- Top Offer Bar --- */}
        <div className="top-offer-bar">
          <div className="container top-bar-flex">
            <div className="top-bar-left">
              Limited Period Offer • Save up to 25% on selected healthcare products
            </div>
            <div className="top-bar-right">
              <select className="premium-select" aria-label="Language Selector">
                <option value="en">English</option>
              </select>
              <select className="premium-select" aria-label="Currency Selector">
                <option value="inr">₹ INR</option>
                <option value="usd">USD ($)</option>
              </select>
            </div>
          </div>
        </div>

        {/* --- Main Header --- */}
        <div className="main-header-content">
          <div className="container header-grid">
            
            {/* Mobile Hamburger */}
            <div className="mobile-hamburger-btn">
              <button onClick={() => setIsMobileMenuOpen(true)}>
                <Menu size={26} />
              </button>
            </div>

            {/* Logo */}
            <Link to="/" className="premium-brand-logo">
              <div className="brand-icon">
                <span className="brand-cross">+</span>
              </div>
              <div className="brand-text">
                <span className="brand-title">Medicare</span>
                <span className="brand-subtitle">Plus</span>
              </div>
            </Link>

            {/* Desktop Search Bar */}
            <div className="search-wrapper desktop-search">
              <div className="premium-search-box">
                <input 
                  type="text" 
                  placeholder="Search medicines, health products & more..." 
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSearchDropdown(e.target.value.length > 0);
                  }}
                  onFocus={() => setShowSearchDropdown(searchQuery.length > 0)}
                />
                {searchQuery && (
                  <button className="clear-search-btn" onClick={() => {
                    setSearchQuery('');
                    setShowSearchDropdown(false);
                  }}>
                    <X size={16} />
                  </button>
                )}
                <button className="submit-search-btn" aria-label="Search">
                  <Search size={20} />
                </button>
              </div>
              
              {/* Autocomplete Dropdown */}
              {showSearchDropdown && debouncedSearchQuery.length > 0 && (
                <div className="search-autocomplete-dropdown">
                  <div className="dropdown-header">Suggestions for "{debouncedSearchQuery}"</div>
                  <ul>
                    <li><Link to="/search?q=Vitamin+C"><Search size={14}/> Vitamin C</Link></li>
                    <li><Link to="/search?q=Paracetamol"><Search size={14}/> Paracetamol</Link></li>
                    <li><Link to="/search?q=First+Aid"><Search size={14}/> First Aid Kit</Link></li>
                  </ul>
                </div>
              )}
            </div>

            {/* Right Actions */}
            <div className="header-actions-wrapper">
              
              {/* Location */}
              <div className="premium-location-widget" onClick={handleLocationClick}>
                <div className="loc-icon-wrapper">
                  {locationLoading ? <div className="loc-spinner"></div> : <MapPin size={20} />}
                </div>
                <div className="loc-text">
                  <span className="loc-label">Deliver to</span>
                  <span className="loc-value" title={currentLocation}>
                    {locationLoading ? 'Detecting...' : currentLocation}
                  </span>
                </div>
              </div>

              {/* Account Dropdown */}
              <div className="account-dropdown-wrapper desktop-action" ref={accountRef}>
                <button 
                  className="icon-action-btn"
                  onClick={() => setShowAccountDropdown(!showAccountDropdown)}
                >
                  <User size={22} />
                  <ChevronDown size={14} className={`dropdown-arrow ${showAccountDropdown ? 'open' : ''}`} />
                </button>
                
                <div className={`premium-dropdown-menu ${showAccountDropdown ? 'active' : ''}`}>
                  {currentUser ? (
                    <>
                      <div className="dropdown-user-info">
                        <strong>{currentUser.fullName || currentUser.name || 'My Account'}</strong>
                        <span>{currentUser.email}</span>
                      </div>
                      <div className="dropdown-divider"></div>
                      <Link to="/account" onClick={() => setShowAccountDropdown(false)}><User size={16}/> My Account</Link>
                      <Link to="/account/orders" onClick={() => setShowAccountDropdown(false)}><Package size={16}/> My Orders</Link>
                      <Link to="/prescriptions" onClick={() => setShowAccountDropdown(false)}><FileText size={16}/> My Prescriptions</Link>
                      <Link to="/wishlist" onClick={() => setShowAccountDropdown(false)}><Heart size={16}/> Wishlist</Link>
                      <Link to="/account/addresses" onClick={() => setShowAccountDropdown(false)}><Map size={16}/> Addresses</Link>
                      <div className="dropdown-divider"></div>
                      <button onClick={handleLogout} className="logout-btn"><LogOut size={16}/> Logout</button>
                    </>
                  ) : (
                    <>
                      <div className="dropdown-user-info">
                        <strong>Welcome</strong>
                        <span>Login to manage orders</span>
                      </div>
                      <div className="dropdown-divider"></div>
                      <Link to="/login" onClick={() => setShowAccountDropdown(false)} className="primary-dropdown-btn">Login</Link>
                      <Link to="/register" onClick={() => setShowAccountDropdown(false)} className="secondary-dropdown-btn">Create Account</Link>
                    </>
                  )}
                </div>
              </div>

              {/* Wishlist */}
              <Link to="/wishlist" className="icon-action-btn desktop-action" title="View Wishlist" aria-label="View Wishlist">
                <Heart size={22} />
                {wishlistCount > 0 && <span className="premium-cart-badge">{wishlistCount}</span>}
              </Link>

              {/* Cart */}
              <button 
                className={`icon-action-btn cart-btn ${cartBump ? 'bump' : ''}`} 
                onClick={() => setIsCartDrawerOpen(true)}
              >
                <ShoppingCart size={22} />
                {totalItems > 0 && <span className="premium-cart-badge">{totalItems}</span>}
              </button>
              
            </div>
          </div>
          
          {/* Mobile Full-width Search Row */}
          <div className="mobile-search-row container">
            <div className="premium-search-box">
              <input 
                type="text" 
                placeholder="Search medicines..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button className="submit-search-btn">
                <Search size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* --- Bottom Navigation --- */}
        <nav className="bottom-nav-bar desktop-nav">
          <div className="container nav-flex">
            
            {/* Mega Menu Button */}
            <div className="mega-menu-wrapper" ref={megaMenuRef}>
              <button 
                className="all-categories-btn"
                onClick={() => setShowMegaMenu(!showMegaMenu)}
              >
                <Menu size={20} /> All Categories <ChevronDown size={16} />
              </button>
              
              <div className={`mega-menu-content ${showMegaMenu ? 'active' : ''}`}>
                {categoriesLoading ? (
                  <div className="mega-menu-state p-20">
                    <div className="skeleton-line w-25"></div>
                    <div className="mega-menu-grid mt-20">
                      {[1,2,3,4].map(i => (
                        <div key={i} className="mega-menu-col">
                          <div className="skeleton-line w-50 mb-15"></div>
                          <div className="skeleton-line w-75 mb-10"></div>
                          <div className="skeleton-line w-60 mb-10"></div>
                          <div className="skeleton-line w-80 mb-10"></div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : categoriesError ? (
                  <div className="mega-menu-state p-20 text-center">
                    <p className="text-muted mb-10">Unable to load categories.</p>
                    <button className="btn-outline btn-sm" onClick={() => window.location.reload()}>Try Again</button>
                  </div>
                ) : categoryTree.length === 0 ? (
                  <div className="mega-menu-state p-20 text-center text-muted">
                    No categories found.
                  </div>
                ) : (
                  <div className="mega-menu-grid">
                    {categoryTree.map(mainCat => (
                      <div className="mega-menu-col" key={mainCat.id}>
                        <Link 
                          to={`/category/${mainCat.slug}`} 
                          className="main-cat-link"
                          onClick={() => setShowMegaMenu(false)}
                        >
                          <h4>{mainCat.name}</h4>
                          <div className="cat-divider"></div>
                        </Link>
                        
                        {mainCat.children && mainCat.children.length > 0 ? (
                          <div className="sub-cat-list">
                            {mainCat.children.map(subCat => (
                              <Link 
                                to={`/category/${subCat.slug}`} 
                                key={subCat.id} 
                                className="sub-cat-link"
                                onClick={() => setShowMegaMenu(false)}
                              >
                                <span>{subCat.name}</span>
                                <ChevronRight size={14} className="hover-arrow" />
                              </Link>
                            ))}
                          </div>
                        ) : (
                          <div className="sub-cat-list">
                            <Link 
                              to={`/category/${mainCat.slug}`} 
                              className="sub-cat-link view-all-link"
                              onClick={() => setShowMegaMenu(false)}
                            >
                              <span>Browse {mainCat.name}</span>
                              <ChevronRight size={14} className="hover-arrow" />
                            </Link>
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Quick Explore Card in grid */}
                    <div className="mega-menu-col mega-menu-promo-col">
                      <div className="mega-promo-card">
                        <span className="promo-badge">All Products</span>
                        <h4>Explore Pharmacy</h4>
                        <p>Browse our complete catalog of certified medicines and healthcare essentials.</p>
                        <Link 
                          to="/shop" 
                          className="btn-primary btn-sm mega-promo-btn"
                          onClick={() => setShowMegaMenu(false)}
                        >
                          View Full Shop &rarr;
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Standard Links */}
            <ul className="nav-links">
              <li><Link to="/">Home</Link></li>
              <li><Link to="/shop">Shop</Link></li>
              <li><Link to="/prescriptions">Prescriptions</Link></li>
              <li><Link to="/category/medicines">Medicines</Link></li>
              <li><Link to="/category/health-wellness">Health & Wellness</Link></li>
              <li><Link to="/category/personal-care">Personal Care</Link></li>
              <li><Link to="/category/medical-devices">Medical Devices</Link></li>
              <li><Link to="/blog">Blog</Link></li>
              <li><Link to="/about">About</Link></li>
              <li><Link to="/contact">Contact</Link></li>
            </ul>
          </div>
        </nav>
      </header>

      {/* --- Mobile Drawer --- */}
      <div 
        className={`mobile-overlay ${isMobileMenuOpen ? 'open' : ''}`} 
        onClick={() => setIsMobileMenuOpen(false)}
      ></div>
      
      <div className={`premium-mobile-drawer ${isMobileMenuOpen ? 'open' : ''}`}>
        <div className="mobile-drawer-top">
          <Link to="/" className="premium-brand-logo" onClick={() => setIsMobileMenuOpen(false)}>
            <div className="brand-icon small">
              <span className="brand-cross">+</span>
            </div>
            <div className="brand-text">
              <span className="brand-title">Medicare</span>
            </div>
          </Link>
          <button className="mobile-close-btn" onClick={() => setIsMobileMenuOpen(false)}>
            <X size={24} />
          </button>
        </div>
        
        <div className="mobile-drawer-links">
          <Link to="/" onClick={() => setIsMobileMenuOpen(false)}><Home size={20}/> Home</Link>
          <Link to="/shop" onClick={() => setIsMobileMenuOpen(false)}><ShoppingCart size={20}/> Shop</Link>
          <Link to="/categories" onClick={() => setIsMobileMenuOpen(false)}><Menu size={20}/> All Categories</Link>
          <div className="drawer-divider"></div>
          
          {categoriesLoading ? (
             <div className="p-20 text-muted">Loading categories...</div>
          ) : categoriesError ? (
             <div className="p-20 text-danger">Failed to load categories.</div>
          ) : (
             categoryTree.map(mainCat => (
                <div key={mainCat.id} className="mobile-accordion-item">
                   <div 
                     className={`mobile-accordion-header ${expandedMobileCategory === mainCat.id ? 'active' : ''}`} 
                     onClick={() => {
                       if (mainCat.children && mainCat.children.length > 0) {
                         toggleMobileCategory(mainCat.id);
                       } else {
                         setIsMobileMenuOpen(false);
                         navigate(`/category/${mainCat.slug}`);
                       }
                     }}
                   >
                      <span>{mainCat.name}</span>
                      {mainCat.children && mainCat.children.length > 0 && (
                        <ChevronDown size={18} className="accordion-icon" />
                      )}
                   </div>
                   {expandedMobileCategory === mainCat.id && mainCat.children && mainCat.children.length > 0 && (
                      <div className="mobile-accordion-body">
                         {/* Include the parent itself as an option */}
                         <Link 
                            to={`/category/${mainCat.slug}`}
                            className="mobile-subcat-link parent-link"
                            onClick={() => setIsMobileMenuOpen(false)}
                         >
                            All {mainCat.name}
                         </Link>
                         {mainCat.children.map(subCat => (
                            <Link 
                               key={subCat.id} 
                               to={`/category/${subCat.slug}`}
                               className="mobile-subcat-link"
                               onClick={() => setIsMobileMenuOpen(false)}
                            >
                               {subCat.name}
                            </Link>
                         ))}
                      </div>
                   )}
                </div>
             ))
          )}

          <div className="drawer-divider"></div>
          <Link to="/blog" onClick={() => setIsMobileMenuOpen(false)}><Edit size={20}/> Blog</Link>
          <Link to="/about" onClick={() => setIsMobileMenuOpen(false)}><Info size={20}/> About</Link>
          <Link to="/contact" onClick={() => setIsMobileMenuOpen(false)}><Phone size={20}/> Contact</Link>
          <div className="drawer-divider"></div>
          {currentUser ? (
            <>
              <Link to="/account" onClick={() => setIsMobileMenuOpen(false)}><User size={20}/> My Account</Link>
              <Link to="/prescriptions" onClick={() => setIsMobileMenuOpen(false)}><FileText size={20}/> My Prescriptions</Link>
              <Link to="/wishlist" onClick={() => setIsMobileMenuOpen(false)}>
                <Heart size={20}/> Wishlist {wishlistCount > 0 ? `(${wishlistCount})` : ''}
              </Link>
              <button onClick={handleLogout} className="mobile-logout"><LogOut size={20}/> Logout</button>
            </>
          ) : (
            <div className="mobile-auth-buttons">
              <Link to="/login" onClick={() => setIsMobileMenuOpen(false)} className="m-login-btn">Login</Link>
              <Link to="/register" onClick={() => setIsMobileMenuOpen(false)} className="m-register-btn">Create Account</Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
