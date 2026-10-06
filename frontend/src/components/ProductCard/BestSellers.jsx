import { useState } from 'react';
import ProductCard from './ProductCard';
import './BestSellers.css';

const TABS = ['All', 'Vitamins', 'Personal Care', 'Medical Devices', 'Wellness'];

const MOCK_PRODUCTS = [
  { id: 10, name: 'Premium Vitamin C 500mg', category: 'Vitamins', brand: 'HealthCo', price: 12.99, rating: 4.8, reviews: 124 },
  { id: 11, name: 'Digital Blood Pressure Monitor', category: 'Medical Devices', brand: 'MedTech', price: 45.00, originalPrice: 55.00, rating: 4.7, reviews: 45 },
  { id: 12, name: 'Organic Herbal Tea Blend', category: 'Wellness', brand: 'NatureWell', price: 8.50, rating: 4.9, reviews: 312 },
  { id: 13, name: 'Daily Moisturizing Lotion', category: 'Personal Care', brand: 'SkinPure', price: 15.00, originalPrice: 18.00, rating: 4.6, reviews: 89 },
  { id: 14, name: 'Omega 3 Fish Oil', category: 'Vitamins', brand: 'Vitamax', price: 24.50, rating: 4.5, reviews: 210 },
  { id: 15, name: 'Infrared Thermometer', category: 'Medical Devices', brand: 'CarePlus', price: 35.00, originalPrice: 40.00, rating: 4.8, reviews: 156 },
  { id: 16, name: 'Aromatherapy Essential Oils', category: 'Wellness', brand: 'AromaZen', price: 22.00, rating: 4.7, reviews: 78 },
  { id: 17, name: 'Antibacterial Hand Wash', category: 'Personal Care', brand: 'CleanLife', price: 5.99, rating: 4.9, reviews: 420 }
];

export default function BestSellers() {
  const [activeTab, setActiveTab] = useState('All');

  // Filter products based on selected tab
  const filteredProducts = activeTab === 'All' 
    ? MOCK_PRODUCTS 
    : MOCK_PRODUCTS.filter(product => product.category === activeTab);

  return (
    <section className="best-sellers-section section-padding">
      <div className="container">
        <div className="section-title text-center">
          <h2>Best Selling Products</h2>
        </div>

        {/* Tab Filters */}
        <div className="best-sellers-tabs">
          {TABS.map(tab => (
            <button 
              key={tab} 
              className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Product Grid */}
        <div className="best-sellers-grid">
          {filteredProducts.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
          {filteredProducts.length === 0 && (
            <div className="empty-state">No products found for this category.</div>
          )}
        </div>
      </div>
    </section>
  );
}
