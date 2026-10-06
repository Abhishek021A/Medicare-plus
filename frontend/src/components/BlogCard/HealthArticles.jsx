import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, ArrowRight, BookOpen } from 'lucide-react';
import api from '../../services/api';
import { resolveImageUrl } from '../../utils/imageUrl';
import articleImg from '../../assets/images/hero-products.jpg';
import './HealthArticles.css';

export default function HealthArticles() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    api.getBlogPosts({ limit: 4 })
      .then(res => {
        if (isMounted && res.data && res.data.success && Array.isArray(res.data.data?.posts) && res.data.data.posts.length > 0) {
          setArticles(res.data.data.posts);
        }
      })
      .catch(err => {
        console.error('Failed to load homepage health articles:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <section className="health-articles-section section-padding" style={{ backgroundColor: 'var(--section-bg)' }}>
      <div className="container">
        <div className="section-title text-center">
          <h2>Health & Wellness Articles</h2>
          <p>Expert advice, news, and tips for a healthier you</p>
        </div>

        {loading ? (
          <div className="articles-grid">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="article-card" style={{ opacity: 0.6 }}>
                <div style={{ height: '180px', background: '#E2E8F0', borderRadius: '12px 12px 0 0' }} />
                <div style={{ padding: '20px' }}>
                  <div style={{ height: '14px', width: '30%', background: '#CBD5E1', marginBottom: '10px', borderRadius: '4px' }} />
                  <div style={{ height: '20px', width: '80%', background: '#CBD5E1', marginBottom: '8px', borderRadius: '4px' }} />
                  <div style={{ height: '14px', width: '100%', background: '#E2E8F0', borderRadius: '4px' }} />
                </div>
              </div>
            ))}
          </div>
        ) : articles.length > 0 ? (
          <div className="articles-grid">
            {articles.map(article => {
              const imgUrl = resolveImageUrl(article.featured_image || article.image, articleImg);
              return (
                <div key={article.id} className="article-card hover-lift">
                  <Link to={`/blog/${article.slug}`} className="article-image-wrapper">
                    <img
                      src={imgUrl}
                      alt={article.title}
                      className="article-img"
                      loading="lazy"
                      onError={(e) => {
                        e.target.src = articleImg;
                      }}
                    />
                    <span className="article-category">{article.category}</span>
                  </Link>

                  <div className="article-content">
                    <div className="article-meta">
                      <Calendar size={14} />
                      <span>{article.date}</span>
                    </div>

                    <h3 className="article-title">
                      <Link to={`/blog/${article.slug}`}>{article.title}</Link>
                    </h3>

                    <p className="article-excerpt">{article.excerpt}</p>

                    <Link to={`/blog/${article.slug}`} className="article-read-more">
                      Read More <ArrowRight size={16} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-40">
            <BookOpen size={36} style={{ color: 'var(--cpn-text-light, #94A3B8)', margin: '0 auto 12px' }} />
            <p className="text-muted">New articles coming soon. Stay tuned!</p>
          </div>
        )}
      </div>
    </section>
  );
}
