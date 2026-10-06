import { Check, PackagePlus } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import './ComboDeals.css';

const COMBOS = [
  {
    id: 'combo-1',
    name: 'Daily Wellness Combo',
    price: 999,
    originalPrice: 1499,
    saving: 500,
    theme: 'theme-teal',
    includes: [
      'Premium Vitamin C 500mg',
      'Daily Multivitamin Complex',
      'Omega 3 Fish Oil Capsules'
    ]
  },
  {
    id: 'combo-2',
    name: 'Diabetes Care Kit',
    price: 1899,
    originalPrice: 2499,
    saving: 600,
    theme: 'theme-blue',
    includes: [
      'Advanced Glucose Monitor',
      '100 Testing Strips',
      'Lancet Device & Needles'
    ]
  },
  {
    id: 'combo-3',
    name: 'Immunity Booster Pack',
    price: 799,
    originalPrice: 1199,
    saving: 400,
    theme: 'theme-green',
    includes: [
      'Organic Herbal Tea',
      'Ashwagandha Capsules',
      'Natural Honey 500g'
    ]
  }
];

export default function ComboDeals() {
  const { addToCart } = useCart();

  const handleAddCombo = (combo) => {
    // In a real app, this would add all items or a specific combo item ID
    addToCart({ id: combo.id, name: combo.name, price: combo.price, image: '' }, 1);
  };

  return (
    <section className="combo-deals-section section-padding">
      <div className="container">
        <div className="section-title text-center">
          <h2>Popular Combo Deals</h2>
          <p>Save more when you buy together</p>
        </div>

        <div className="combo-deals-grid">
          {COMBOS.map(combo => (
            <div key={combo.id} className={`combo-card hover-lift ${combo.theme}`}>
              <div className="combo-card-header">
                <div className="combo-icon-wrapper">
                  <PackagePlus size={28} />
                </div>
                <h3 className="combo-title">{combo.name}</h3>
                
                <div className="combo-pricing">
                  <span className="combo-current-price">₹{combo.price}</span>
                  <span className="combo-original-price">₹{combo.originalPrice}</span>
                </div>
                <span className="combo-saving">Save ₹{combo.saving}</span>
              </div>

              <div className="combo-body">
                <span className="includes-label">Includes:</span>
                <ul className="includes-list">
                  {combo.includes.map((item, idx) => (
                    <li key={idx}>
                      <Check size={16} className="check-icon" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="combo-footer">
                <button 
                  className="btn-primary combo-btn" 
                  onClick={() => handleAddCombo(combo)}
                >
                  ADD COMBO
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
