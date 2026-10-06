import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Calendar, User, ArrowRight, ChevronLeft, ChevronRight, Eye, Sparkles, BookOpen } from 'lucide-react';
import api from '../services/api';
import { resolveImageUrl } from '../utils/imageUrl';
import placeholderImg from '../assets/images/medicine-placeholder.jpg';
import './Blog.css';

const POSTS_PER_PAGE = 6;

export default function Blog() {
  const [posts, setPosts] = useState([]);
  const [categories, setCategories] = useState(['All']);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalPosts, setTotalPosts] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch articles from MySQL
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    const params = {
      search: debouncedSearch,
      category: activeCategory,
      page: currentPage,
      limit: POSTS_PER_PAGE
    };

    api.getBlogPosts(params)
      .then(res => {
        if (isMounted && res.data && res.data.success) {
          const data = res.data.data;
          setPosts(data.posts || []);
          if (Array.isArray(data.categories) && data.categories.length > 0) {
            setCategories(data.categories);
          }
          if (data.pagination) {
            setCurrentPage(data.pagination.page);
            setTotalPages(data.pagination.totalPages || 1);
            setTotalPosts(data.pagination.total || 0);
          }
        }
      })
      .catch(err => {
        console.error('Error fetching blog posts:', err);
        if (isMounted) setError('Unable to load articles right now. Please try again.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [debouncedSearch, activeCategory, currentPage]);

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCategoryChange = (category) => {
    setActiveCategory(category);
    setCurrentPage(1);
  };

  return (
    <div className="blog-page section-padding">
      <div className="container">
        {/* Header */}
        <div className="page-header text-center mb-50">
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 16px',
              borderRadius: '999px',
              background: '#E6F7F5',
              color: '#087F73',
              fontSize: '12px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              marginBottom: '14px'
            }}
          >
            <Sparkles size={14} />
            <span>Healthcare Insights</span>
          </div>
          <h1 className="page-title">Health & Wellness Articles</h1>
          <p className="text-muted mt-10 max-w-600 mx-auto">
            Expert advice, health tips, and the latest news in medical science to keep you informed and healthy.
          </p>
        </div>

        {/* Controls Layout */}
        <div className="blog-controls mb-40">
          {/* Categories Filter */}
          <div className="blog-categories">
            {categories.map(category => (
              <button 
                key={category} 
                className={`category-pill ${activeCategory === category ? 'active' : ''}`}
                onClick={() => handleCategoryChange(category)}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <div className="blog-search">
            <Search className="search-icon" size={18} />
            <input 
              type="text" 
              placeholder="Search articles..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search articles"
            />
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="text-center py-50">
            <p className="text-danger mb-20">{error}</p>
            <button className="btn-primary" onClick={() => setCurrentPage(1)}>Try Again</button>
          </div>
        )}

        {/* Loading Skeletons */}
        {loading ? (
          <div className="blog-grid mb-50">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="blog-card" style={{ opacity: 0.6 }}>
                <div style={{ height: '220px', background: '#E2E8F0', borderRadius: '12px 12px 0 0' }} />
                <div style={{ padding: '20px' }}>
                  <div style={{ height: '14px', width: '30%', background: '#CBD5E1', marginBottom: '12px', borderRadius: '4px' }} />
                  <div style={{ height: '22px', width: '85%', background: '#CBD5E1', marginBottom: '10px', borderRadius: '4px' }} />
                  <div style={{ height: '14px', width: '100%', background: '#E2E8F0', marginBottom: '6px', borderRadius: '4px' }} />
                  <div style={{ height: '14px', width: '70%', background: '#E2E8F0', borderRadius: '4px' }} />
                </div>
              </div>
            ))}
          </div>
        ) : posts.length > 0 ? (
          /* Blog Grid */
          <div className="blog-grid mb-50">
            {posts.map(post => {
              const imgUrl = resolveImageUrl(post.featured_image || post.image, placeholderImg);
              return (
                <article key={post.id} className="blog-card">
                  <div className="blog-card-image">
                    <img 
                      src={imgUrl} 
                      alt={post.title} 
                      loading="lazy"
                      onError={(e) => {
                        e.target.src = placeholderImg;
                      }}
                    />
                    <span className="category-tag">{post.category}</span>
                  </div>

                  <div className="blog-card-content">
                    <div className="post-meta">
                      <span className="meta-item">
                        <Calendar size={14} />
                        <span>{post.date}</span>
                      </span>
                      {post.readTime && (
                        <span className="meta-item">
                          <span>{post.readTime} read</span>
                        </span>
                      )}
                    </div>

                    <h2 className="post-title">
                      <Link to={`/blog/${post.slug}`}>{post.title}</Link>
                    </h2>

                    <p className="post-excerpt">{post.excerpt}</p>

                    <div className="post-footer">
                      <div className="author-info">
                        <User size={14} />
                        <span>{post.author}</span>
                      </div>

                      <Link to={`/blog/${post.slug}`} className="read-more-link">
                        <span>Read Article</span>
                        <ArrowRight size={16} />
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          /* Empty State */
          <div className="text-center py-60 mb-50">
            <BookOpen size={48} style={{ color: 'var(--cpn-text-light, #94A3B8)', margin: '0 auto 16px' }} />
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>No articles found</h3>
            <p className="text-muted" style={{ maxWidth: '400px', margin: '0 auto 20px' }}>
              {searchQuery || activeCategory !== 'All' 
                ? 'No articles match your search or filter criteria. Try adjusting your search term.' 
                : 'Check back soon for new health and medical insights.'}
            </p>
            {(searchQuery || activeCategory !== 'All') && (
              <button
                className="btn-primary"
                onClick={() => {
                  setSearchQuery('');
                  setActiveCategory('All');
                }}
              >
                Clear Filters
              </button>
            )}
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="blog-pagination">
            <button 
              className="pagination-btn" 
              disabled={currentPage === 1}
              onClick={() => handlePageChange(currentPage - 1)}
              aria-label="Previous page"
            >
              <ChevronLeft size={18} />
              <span>Previous</span>
            </button>

            <div className="pagination-numbers">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNumber => (
                <button
                  key={pageNumber}
                  className={`page-number ${currentPage === pageNumber ? 'active' : ''}`}
                  onClick={() => handlePageChange(pageNumber)}
                >
                  {pageNumber}
                </button>
              ))}
            </div>

            <button 
              className="pagination-btn" 
              disabled={currentPage === totalPages}
              onClick={() => handlePageChange(currentPage + 1)}
              aria-label="Next page"
            >
              <span>Next</span>
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
