import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, ChevronRight } from 'lucide-react';
import './Categories.css';

// All 12 Categories
const CATEGORIES = [
  { id: 'medicines', name: 'Medicines', description: 'Prescription & OTC drugs', icon: '💊', color: '#e8f7f4' },
  { id: 'vitamins', name: 'Vitamins & Supplements', description: 'Boost your immunity', icon: '🌿', color: '#fff3e0' },
  { id: 'personal-care', name: 'Personal Care', description: 'Skin, hair & body care', icon: '🧴', color: '#f3e5f5' },
  { id: 'medical-devices', name: 'Medical Devices', description: 'Monitors & equipment', icon: '🩺', color: '#e3f2fd' },
  { id: 'wellness', name: 'Wellness & Fitness', description: 'Protein & health drinks', icon: '💪', color: '#e8f5e9' },
  { id: 'baby-care', name: 'Baby Care', description: 'Diapers & baby food', icon: '👶', color: '#ffebee' },
  { id: 'ayurveda', name: 'Ayurveda', description: 'Herbal & natural remedies', icon: '🌱', color: '#f1f8e9' },
  { id: 'home-care', name: 'Home Care', description: 'Disinfectants & hygiene', icon: '🏠', color: '#eceff1' },
  { id: 'women-care', name: 'Women Care', description: 'Feminine hygiene products', icon: '👩', color: '#fce4ec' },
  { id: 'sexual-wellness', name: 'Sexual Wellness', description: 'Family planning & intimacy', icon: '❤️', color: '#fff8e1' },
  { id: 'elderly-care', name: 'Elderly Care', description: 'Mobility & adult diapers', icon: '🧓', color: '#efebe9' },
  { id: 'pet-care', name: 'Pet Care', description: 'Supplements for pets', icon: '🐾', color: '#fffdf1' }
];

export default function Categories() {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter categories based on search input
  const filteredCategories = CATEGORIES.filter(cat => 
    cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cat.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="categories-page section-padding">
      <div className="container">
        
        {/* Breadcrumbs */}
        <div className="breadcrumbs mb-30 text-muted">
          <Link to="/">Home</Link>
          <ChevronRight size={14} />
          <span>Categories</span>
        </div>

        <div className="page-header mb-40 text-center">
          <h1 className="page-title">Shop by Category</h1>
          <p className="text-muted mt-10 max-w-600 mx-auto">
            Browse our extensive collection of healthcare and wellness products categorized for your convenience.
          </p>
        </div>

        {/* Search Bar */}
        <div className="category-search-container mb-40">
          <div className="search-wrapper max-w-600 mx-auto">
            <Search className="search-icon" size={20} />
            <input 
              type="text" 
              placeholder="Search for a category..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="category-search-input"
            />
          </div>
        </div>

        {/* Categories Grid */}
        {filteredCategories.length > 0 ? (
          <div className="categories-large-grid">
            {filteredCategories.map(cat => (
              <Link to={`/category/${cat.id}`} key={cat.id} className="category-large-card" style={{ '--card-bg': cat.color }}>
                <div className="card-icon-wrapper">
                  <span className="card-emoji">{cat.icon}</span>
                </div>
                <div className="card-content">
                  <h3>{cat.name}</h3>
                  <p>{cat.description}</p>
                </div>
                <div className="card-action">
                  <span>Explore</span>
                  <ChevronRight size={16} />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-40">
            <h3 className="text-muted">No categories found matching "{searchQuery}"</h3>
            <button className="text-btn text-primary mt-10" onClick={() => setSearchQuery('')}>Clear search</button>
          </div>
        )}

      </div>
    </div>
  );
}
