import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, PackageOpen, AlertCircle } from 'lucide-react';
import api from '../../services/api';
import ProductCard from './ProductCard';
import './NewLaunches.css';

// Fallback products matching current DB/seed products to ensure zero UI failure
const FALLBACK_PRODUCTS = [
  { id: 1, name: 'Vitamin C Tablets 1000mg', brand: 'HealthCo', brand_name: 'HealthCo', price: 12.99, originalPrice: 18.99, rating: 4.8, reviews: 124, new_launch: 1 },
  { id: 2, name: 'Omega 3 Fish Oil Capsules', brand: 'NatureWell', brand_name: 'NatureWell', price: 24.50, originalPrice: 29.99, rating: 4.5, reviews: 89, new_launch: 1 },
  { id: 3, name: 'Daily Multivitamin Complex', brand: 'Vitamax', brand_name: 'Vitamax', price: 19.99, originalPrice: 22.00, rating: 4.9, reviews: 312, new_launch: 1 },
  { id: 4, name: 'Digital Blood Pressure Monitor', brand: 'MedTech', brand_name: 'MedTech', price: 45.00, originalPrice: 55.00, rating: 4.7, reviews: 45, new_launch: 1 },
];

export default function NewLaunches() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    // Fetch dynamic products from database API:
    // First try new_launch=1. If less than 4, fallback to sort=latest
    api.getProducts({ new_launch: 1, limit: 4 })
      .then(res => {
        if (!isMounted) return;
        const items = res?.data || [];
        if (Array.isArray(items) && items.length >= 4) {
          setProducts(items.slice(0, 4));
          setLoading(false);
        } else {
          // If less than 4 marked new_launch, fetch newest active products
          return api.getProducts({ sort: 'latest', limit: 4 })
            .then(resLatest => {
              if (!isMounted) return;
              const latestItems = resLatest?.data || [];
              if (Array.isArray(latestItems) && latestItems.length > 0) {
                setProducts(latestItems.slice(0, 4));
              } else {
                setProducts(FALLBACK_PRODUCTS);
              }
              setLoading(false);
            });
        }
      })
      .catch(err => {
        if (!isMounted) return;
        console.warn("Could not load dynamic new launches, using fallback:", err);
        setProducts(FALLBACK_PRODUCTS);
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <section className="new-launches-section" aria-label="New Launches">
      {/* Decorative Background Elements */}
      <div className="section-decor-mesh" aria-hidden="true">
        <div className="decor-blob decor-blob-1" />
        <div className="decor-blob decor-blob-2" />
        <span className="decor-cross decor-cross-1">+</span>
        <span className="decor-cross decor-cross-2">+</span>
      </div>

      <div className="container">
        {/* Section Header */}
        <div className="new-launches-header text-center">
          <span className="new-launches-eyebrow">LATEST PRODUCTS</span>
          <h2 className="new-launches-title">New Launches</h2>
          <div className="new-launches-underline" aria-hidden="true" />
          <p className="new-launches-subtitle">Discover our latest healthcare products</p>
        </div>

        {/* Main Grid: Offer Card + 4 Product Cards */}
        <div className="new-launches-grid">
          {/* Left Promotional Offer Card */}
          <aside className="new-launches-offer-card" aria-label="New Member Special Offer">
            {/* Background Decorative Medical Cross & Shapes */}
            <div className="offer-card-decor" aria-hidden="true">
              <span className="offer-decor-cross">+</span>
              <div className="offer-decor-circle" />
              <div className="offer-decor-dots" />
            </div>

            <div className="offer-card-content">
              <span className="offer-pill-badge">LIMITED TIME</span>
              <h3 className="offer-heading">Extra 15% OFF</h3>
              <p className="offer-subtext">For new members on their first purchase</p>

              <div className="offer-stats-grid">
                <div className="offer-stat-box">
                  <span className="offer-stat-num">500+</span>
                  <span className="offer-stat-label">Products</span>
                </div>
                <div className="offer-stat-box">
                  <span className="offer-stat-num">24h</span>
                  <span className="offer-stat-label">Delivery</span>
                </div>
              </div>

              <Link 
                to="/shop" 
                className="offer-btn-get"
                aria-label="Get 15% off first purchase"
              >
                <span>GET OFFER</span>
                <ArrowRight size={16} className="offer-btn-arrow" />
              </Link>
            </div>
          </aside>

          {/* Right Product Grid Area */}
          <div className="new-launches-products-grid">
            {loading ? (
              // Premium Skeleton Loading Cards
              Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="nl-skeleton-card" aria-hidden="true">
                  <div className="nl-skeleton-image" />
                  <div className="nl-skeleton-body">
                    <div className="nl-skeleton-line short" />
                    <div className="nl-skeleton-line title" />
                    <div className="nl-skeleton-line title-short" />
                    <div className="nl-skeleton-line stars" />
                    <div className="nl-skeleton-line price" />
                    <div className="nl-skeleton-button" />
                  </div>
                </div>
              ))
            ) : products.length === 0 ? (
              // Polished Empty State
              <div className="new-launches-empty-state">
                <PackageOpen size={48} className="empty-icon" />
                <h4>No new launches available</h4>
                <p>Check back soon for our latest healthcare products.</p>
                <Link to="/shop" className="btn-browse-shop">Browse All Products</Link>
              </div>
            ) : (
              // Render Live Dynamic Products with Staggered Entrance
              products.map((product, idx) => (
                <ProductCard 
                  key={product.id} 
                  product={product} 
                  animationDelay={idx * 70}
                  className="nl-product-item"
                />
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
