import { Link } from 'react-router-dom';
import promoImg from '../../assets/images/promo-card-item.jpg';
import './PromoCardsList.css';

const PROMO_CARDS = [
  {
    title: 'Vitamin & Supplements',
    offer: 'Extra 15% OFF',
    theme: 'theme-yellow',
    link: '/category/multivitamins'
  },
  {
    title: 'Buy 1 Get 1 Free',
    offer: 'On selected wellness products',
    theme: 'theme-blue',
    link: '/shop'
  },
  {
    title: 'Flat 24% OFF',
    offer: 'On selected healthcare products',
    theme: 'theme-green',
    link: '/category/healthcare'
  }
];

export default function PromoCardsList() {
  return (
    <section className="promo-cards-section section-padding" style={{ backgroundColor: 'var(--section-bg)' }}>
      <div className="container">
        <div className="promo-cards-grid">
          {PROMO_CARDS.map((card, idx) => (
            <div key={idx} className={`promo-card-item hover-lift ${card.theme}`}>
              <div className="promo-card-content">
                <span className="promo-card-title">{card.title}</span>
                <h3 className="promo-card-offer">{card.offer}</h3>
                <Link to={card.link} className="btn-primary promo-card-btn">
                  SHOP NOW
                </Link>
              </div>
              <div className="promo-card-image-wrapper">
                <img src={promoImg} alt="Promo Items" className="promo-card-img" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
