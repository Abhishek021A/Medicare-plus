import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ChevronRight,
  Calendar,
  User,
  Clock,
  Share2,
  Link2,
  Eye,
  AlertCircle,
  ArrowLeft,
  Check,
  Tag,
  BookOpen
} from 'lucide-react';
import api from '../services/api';
import { resolveImageUrl } from '../utils/imageUrl';
import placeholderImg from '../assets/images/medicine-placeholder.jpg';
import SEO from '../components/SEO/SEO';
import './BlogDetails.css';

export default function BlogDetails() {
  const { slug } = useParams();

  const [post, setPost] = useState(null);
  const [relatedPosts, setRelatedPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setNotFound(false);

    api.getBlogPost(slug)
      .then(res => {
        if (isMounted && res.data && res.data.success && res.data.data?.post) {
          setPost(res.data.data.post);
          setRelatedPosts(res.data.data.related || []);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          if (isMounted) setNotFound(true);
        }
      })
      .catch(err => {
        console.error('Error fetching blog details:', err);
        if (isMounted) setNotFound(true);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [slug]);

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } else {
      alert("Link copied to clipboard!");
    }
  };

  const shareOnSocial = (platform) => {
    const url = encodeURIComponent(window.location.href);
    const title = encodeURIComponent(post?.title || 'Medicare PLUS Healthcare Article');

    let shareUrl = '';
    switch (platform) {
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
        break;
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?url=${url}&text=${title}`;
        break;
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
        break;
      case 'whatsapp':
        shareUrl = `https://api.whatsapp.com/send?text=${title}%20${url}`;
        break;
      default:
        break;
    }

    if (shareUrl) {
      window.open(shareUrl, '_blank', 'noopener,noreferrer,width=600,height=450');
    }
  };

  if (loading) {
    return (
      <div className="blog-details-page section-padding">
        <div className="container max-w-800">
          <div style={{ height: '24px', width: '40%', background: '#E2E8F0', marginBottom: '16px', borderRadius: '4px' }} />
          <div style={{ height: '40px', width: '80%', background: '#E2E8F0', marginBottom: '24px', borderRadius: '6px' }} />
          <div style={{ height: '360px', width: '100%', background: '#CBD5E1', marginBottom: '32px', borderRadius: '14px' }} />
          <div style={{ height: '16px', width: '100%', background: '#E2E8F0', marginBottom: '12px', borderRadius: '4px' }} />
          <div style={{ height: '16px', width: '90%', background: '#E2E8F0', marginBottom: '12px', borderRadius: '4px' }} />
          <div style={{ height: '16px', width: '75%', background: '#E2E8F0', borderRadius: '4px' }} />
        </div>
      </div>
    );
  }

  if (notFound || !post) {
    return (
      <div className="blog-details-page section-padding text-center">
        <SEO title="Article Not Found — Medicare PLUS" />
        <div className="container max-w-600" style={{ padding: '80px 20px' }}>
          <AlertCircle size={56} style={{ color: 'var(--bnr-danger, #EF4444)', margin: '0 auto 16px' }} />
          <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '10px' }}>Article Not Found</h1>
          <p className="text-muted" style={{ marginBottom: '24px' }}>
            The article you are looking for may have been removed, archived, or is no longer available.
          </p>
          <Link to="/blog" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <ArrowLeft size={16} />
            <span>Back to Blog Articles</span>
          </Link>
        </div>
      </div>
    );
  }

  const postImage = resolveImageUrl(post.featured_image || post.image, placeholderImg);
  const tagsList = post.tags ? post.tags.split(',').map(t => t.trim()).filter(Boolean) : [];

  return (
    <div className="blog-details-page">
      <SEO 
        title={post.meta_title || `${post.title} — Medicare PLUS`}
        description={post.meta_description || post.excerpt}
      />

      {/* Featured Header */}
      <div className="blog-hero bg-light">
        <div className="container max-w-800">
          <div className="breadcrumbs mb-20">
            <Link to="/">Home</Link>
            <ChevronRight size={14} />
            <Link to="/blog">Blog</Link>
            <ChevronRight size={14} />
            <span className="truncate">{post.title}</span>
          </div>

          <span className="category-badge mb-15">{post.category}</span>
          <h1 className="article-title">{post.title}</h1>

          <div className="article-meta mt-20">
            <div className="author-info">
              <div className="author-avatar">{(post.author || 'A').charAt(0)}</div>
              <span>{post.author}</span>
            </div>
            <span className="meta-divider">•</span>
            <span className="meta-item"><Calendar size={16} /> {post.date}</span>
            {post.readTime && (
              <>
                <span className="meta-divider">•</span>
                <span className="meta-item"><Clock size={16} /> {post.readTime} read</span>
              </>
            )}
            {post.views !== undefined && (
              <>
                <span className="meta-divider">•</span>
                <span className="meta-item"><Eye size={16} /> {post.views} views</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="container max-w-800 section-padding">
        {/* Featured Image */}
        {postImage && (
          <div
            className="featured-image-container mb-40"
            style={{
              width: '100%',
              maxHeight: '440px',
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.08)'
            }}
          >
            <img
              src={postImage}
              alt={post.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={(e) => {
                e.target.src = placeholderImg;
              }}
            />
          </div>
        )}

        {/* Article Excerpt */}
        {post.excerpt && (
          <div
            style={{
              fontSize: '18px',
              fontWeight: 500,
              color: 'var(--text-muted, #475569)',
              lineHeight: 1.6,
              marginBottom: '32px',
              paddingLeft: '16px',
              borderLeft: '4px solid var(--primary, #087F73)'
            }}
          >
            {post.excerpt}
          </div>
        )}

        {/* Article Content (Server-Sanitized HTML) */}
        <article
          className="article-content"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {/* Tags */}
        {tagsList.length > 0 && (
          <div className="article-tags mt-40" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
            <Tag size={16} style={{ color: 'var(--primary, #087F73)' }} />
            {tagsList.map(tag => (
              <span
                key={tag}
                style={{
                  fontSize: '12px',
                  fontWeight: 500,
                  padding: '4px 12px',
                  borderRadius: '999px',
                  background: '#F1F5F9',
                  color: '#475569'
                }}
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Share Section */}
        <div className="share-section mt-50">
          <h4>Share this article</h4>
          <div className="share-buttons">
            <button
              className="btn-share facebook"
              onClick={() => shareOnSocial('facebook')}
              aria-label="Share on Facebook"
            >
              Facebook
            </button>
            <button
              className="btn-share twitter"
              onClick={() => shareOnSocial('twitter')}
              aria-label="Share on Twitter"
            >
              X (Twitter)
            </button>
            <button
              className="btn-share linkedin"
              onClick={() => shareOnSocial('linkedin')}
              aria-label="Share on LinkedIn"
            >
              LinkedIn
            </button>
            <button
              className="btn-share copy-link"
              onClick={handleShare}
              aria-label="Copy link to clipboard"
            >
              {copied ? <Check size={16} /> : <Link2 size={16} />}
              <span>{copied ? 'Copied!' : 'Copy Link'}</span>
            </button>
          </div>
        </div>

        <div className="article-divider mt-50 mb-50"></div>

        {/* Related Articles */}
        {relatedPosts.length > 0 && (
          <div className="related-articles">
            <h3 className="mb-30">Related Articles</h3>
            <div className="related-grid">
              {relatedPosts.map(related => {
                const relImg = resolveImageUrl(related.featured_image || related.image, placeholderImg);
                return (
                  <Link to={`/blog/${related.slug}`} key={related.id} className="related-card">
                    <div className="related-img">
                      <img
                        src={relImg}
                        alt={related.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => {
                          e.target.src = placeholderImg;
                        }}
                      />
                    </div>
                    <div className="related-content">
                      <span className="text-primary fw-bold mb-5 d-block" style={{ fontSize: '0.8rem', textTransform: 'uppercase' }}>
                        {related.category}
                      </span>
                      <h4>{related.title}</h4>
                      <span className="text-muted" style={{ fontSize: '0.85rem' }}>{related.date}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
