import { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import Hero from '../components/Hero/Hero';
import ServiceFeatures from '../components/ServiceCard/ServiceFeatures';
import NewLaunches from '../components/ProductCard/NewLaunches';
import PromoBanner from '../components/PromoBanner/PromoBanner';
import ShopByCategory from '../components/CategoryCard/ShopByCategory';
import PromoCardsList from '../components/PromoBanner/PromoCardsList';
import BestSellers from '../components/ProductCard/BestSellers';
import SpecialDeals from '../components/SpecialDeals/SpecialDeals';
import TrendingProducts from '../components/ProductCard/TrendingProducts';
import ComboDeals from '../components/ComboDeals/ComboDeals';
import FeaturedBrands from '../components/FeaturedBrands/FeaturedBrands';
import HealthArticles from '../components/BlogCard/HealthArticles';
import Newsletter from '../components/Newsletter/Newsletter';
import SEO from '../components/SEO/SEO';

export default function Home() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In production, use environment variable. E.g. import.meta.env.VITE_API_URL
    axios.get('http://localhost/pharmacy-api/api/products')
      .then(res => {
        if(res.data.success) {
          setProducts(res.data.data);
        }
      })
      .catch(err => console.error("Error fetching products:", err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="home-page animate-fade-in">
      <SEO title="Home" />
      {/* 7. HERO */}
      <Hero />

      {/* 8. SERVICE FEATURE BAR */}
      <ServiceFeatures />

      {/* 9. NEW LAUNCHES */}
      <NewLaunches />

      {/* 11. PROMOTIONAL BANNER */}
      <PromoBanner />
      
      {/* 12. SHOP BY CATEGORY */}
      <ShopByCategory />

      {/* 13. PROMOTIONAL CARDS */}
      <PromoCardsList />

      {/* 14. BEST SELLERS */}
      <BestSellers />

      {/* 15. SPECIAL DEALS */}
      <SpecialDeals />

      {/* 16. TRENDING PRODUCTS */}
      <TrendingProducts />

      {/* 17. POPULAR COMBO DEALS */}
      <ComboDeals />

      {/* 18. FEATURED BRANDS */}
      <FeaturedBrands />

      {/* 19. HEALTH ARTICLES */}
      <HealthArticles />

      {/* 20. NEWSLETTER */}
      <Newsletter />
    </div>
  );
}
