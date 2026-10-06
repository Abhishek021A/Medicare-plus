import CategoryCard from './CategoryCard';
import './ShopByCategory.css';
import { 
  Baby, 
  Activity, 
  UserPlus, 
  Apple, 
  Stethoscope, 
  Scissors, 
  Pill, 
  Droplet, 
  HeartHandshake, 
  Sparkles, 
  Dumbbell, 
  Flower2 
} from 'lucide-react';

const CATEGORIES = [
  { name: 'Baby Care', slug: 'baby-care', count: 124, icon: Baby },
  { name: 'Diabetic Care', slug: 'diabetic-care', count: 85, icon: Activity },
  { name: 'Elderly Care', slug: 'elderly-care', count: 64, icon: UserPlus },
  { name: 'Health Foods', slug: 'health-foods', count: 112, icon: Apple },
  { name: 'Medical Devices', slug: 'medical-devices', count: 43, icon: Stethoscope },
  { name: 'Men\'s Grooming', slug: 'mens-grooming', count: 98, icon: Scissors },
  { name: 'Multivitamins', slug: 'multivitamins', count: 156, icon: Pill },
  { name: 'Personal Care', slug: 'personal-care', count: 210, icon: Droplet },
  { name: 'Sexual Wellness', slug: 'sexual-wellness', count: 45, icon: HeartHandshake },
  { name: 'Skin Care', slug: 'skin-care', count: 187, icon: Sparkles },
  { name: 'Sports Nutrition', slug: 'sports-nutrition', count: 76, icon: Dumbbell },
  { name: 'Women\'s Care', slug: 'womens-care', count: 132, icon: Flower2 },
];

export default function ShopByCategory() {
  return (
    <section className="shop-by-category section-padding">
      <div className="container">
        <div className="section-title text-center">
          <h2>Shop By Category</h2>
          <p>Everything you need for your health and wellness</p>
        </div>
        
        <div className="category-grid">
          {CATEGORIES.map((category) => (
            <CategoryCard key={category.slug} category={category} />
          ))}
        </div>
      </div>
    </section>
  );
}
