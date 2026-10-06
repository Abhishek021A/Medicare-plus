import ProductCard from './ProductCard';
import './TrendingProducts.css';

const TRENDING_PRODUCTS = [
  { id: 30, name: 'Advanced Glucose Monitor', category: 'Medical Devices', brand: 'MedTech', price: 32.00, originalPrice: 50.00, rating: 4.7, reviews: 85 },
  { id: 31, name: 'Premium Vitamin C 500mg', category: 'Vitamins', brand: 'HealthCo', price: 12.99, rating: 4.8, reviews: 124 },
  { id: 32, name: 'Daily Moisturizing Lotion', category: 'Personal Care', brand: 'SkinPure', price: 15.00, rating: 4.6, reviews: 89 },
  { id: 33, name: 'Organic Herbal Tea Blend', category: 'Wellness', brand: 'NatureWell', price: 8.50, rating: 4.9, reviews: 312 },
  { id: 34, name: 'Omega 3 Fish Oil', category: 'Vitamins', brand: 'Vitamax', price: 24.50, rating: 4.5, reviews: 210 },
  { id: 35, name: 'Joint Support Complex', category: 'Vitamins', brand: 'HealthCo', price: 18.50, rating: 4.6, reviews: 112 },
  { id: 36, name: 'Infrared Thermometer', category: 'Medical Devices', brand: 'CarePlus', price: 35.00, rating: 4.8, reviews: 156 },
  { id: 37, name: 'Antibacterial Hand Wash', category: 'Personal Care', brand: 'CleanLife', price: 5.99, rating: 4.9, reviews: 420 }
];

export default function TrendingProducts() {
  return (
    <section className="trending-section section-padding">
      <div className="container">
        <div className="section-title">
          <h2>Trending Now</h2>
          <p>What everyone is buying this week</p>
        </div>

        <div className="trending-carousel">
          {TRENDING_PRODUCTS.map(product => (
            <div key={product.id} className="carousel-item">
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
