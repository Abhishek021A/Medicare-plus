import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import './CategoryCard.css';

export default function CategoryCard({ category }) {
  return (
    <Link to={`/category/${category.slug}`} className="category-card">
      <div className="category-image-container">
        {/* Placeholder image background */}
        <div className="category-image-bg"></div>
        <div className="category-icon-wrapper">
          <category.icon size={32} strokeWidth={1.5} />
        </div>
      </div>
      <div className="category-content">
        <h4 className="category-name">{category.name}</h4>
        <span className="category-count">{category.count} Products</span>
        <div className="category-arrow">
          <ArrowRight size={18} />
        </div>
      </div>
    </Link>
  );
}
