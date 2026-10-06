import './FeaturedBrands.css';

const BRANDS = [
  { name: 'HealthCore', color: 'var(--primary)', icon: '✚' },
  { name: 'MediLife', color: '#2196F3', icon: '🧬' },
  { name: 'NutriWell', color: '#4CAF50', icon: '🍃' },
  { name: 'CarePlus', color: '#E91E63', icon: '❤️' },
  { name: 'VitaMax', color: '#FF9800', icon: '⚡' },
  { name: 'WellnessPro', color: '#9C27B0', icon: '⭐' },
];

export default function FeaturedBrands() {
  return (
    <section className="featured-brands-section section-padding">
      <div className="container">
        <div className="section-title text-center">
          <h2>Featured Brands</h2>
          <p>Trusted by millions of healthcare professionals</p>
        </div>

        <div className="brands-grid">
          {BRANDS.map((brand, idx) => (
            <div key={idx} className="brand-card hover-lift">
              <div className="brand-logo-mock" style={{ color: brand.color }}>
                <span className="brand-icon">{brand.icon}</span>
                <span className="brand-name">{brand.name}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
