import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FileText,
  Plus,
  Search,
  X,
  RefreshCw,
  ExternalLink,
  Eye,
  Edit2,
  Copy,
  Trash2,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  BookOpen,
  Send,
  Archive,
  Layers,
  Sparkles,
  Filter,
  User,
  Image as ImageIcon
} from 'lucide-react';
import { adminBlogService } from '../../../services/adminApi';
import { resolveImageUrl } from '../../../utils/imageUrl';
import placeholderImg from '../../../assets/images/medicine-placeholder.jpg';
import './AdminBlog.css';

export default function AdminBlog() {
  const navigate = useNavigate();

  // State
  const [posts, setPosts] = useState([]);
  const [summary, setSummary] = useState({
    total: 0,
    published: 0,
    drafts: 0,
    scheduled: 0,
    archived: 0,
    total_views: 0
  });
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Modals & Feedback
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    type: null, // 'publish' | 'archive' | 'restore' | 'delete' | 'duplicate'
    post: null,
    loading: false
  });
  const [toastMessage, setToastMessage] = useState(null);
  const toastTimeoutRef = useRef(null);

  const showToast = (message, type = 'success') => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage({ message, type });
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  // Load Categories
  useEffect(() => {
    adminBlogService.getCategories()
      .then(res => {
        if (res && res.success && Array.isArray(res.data)) {
          setCategories(res.data);
        }
      })
      .catch(err => console.error('Failed to load blog categories:', err));
  }, []);

  // Fetch Posts & Summary
  const fetchData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const params = {
        search: debouncedSearch,
        status: statusFilter,
        category: categoryFilter,
        date_filter: dateFilter,
        sort: sortBy,
        page,
        limit
      };

      const res = await adminBlogService.getPosts(params);
      if (res && res.success) {
        setPosts(res.data.posts || []);
        if (res.data.summary) {
          setSummary(res.data.summary);
        }
        if (res.data.pagination) {
          setTotalPages(res.data.pagination.totalPages || 1);
          setTotalRecords(res.data.pagination.total || 0);
        }
      } else {
        throw new Error(res?.message || 'Failed to fetch blog posts');
      }
    } catch (err) {
      console.error('Fetch blog error:', err);
      setError(err.response?.data?.message || err.message || 'Unable to load blog posts. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [debouncedSearch, statusFilter, categoryFilter, dateFilter, sortBy, page, limit]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle Refresh
  const handleRefresh = () => {
    fetchData(true);
    showToast('Refreshing blog data...', 'info');
  };

  // Reset Filters
  const handleResetFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setStatusFilter('ALL');
    setCategoryFilter('ALL');
    setDateFilter('all');
    setSortBy('newest');
    setPage(1);
  };

  const isFiltered = Boolean(search || statusFilter !== 'ALL' || categoryFilter !== 'ALL' || dateFilter !== 'all' || sortBy !== 'newest');

  // CSV Export
  const handleExportCSV = async () => {
    try {
      showToast('Generating CSV export...', 'info');
      const res = await adminBlogService.exportPosts({
        search: debouncedSearch,
        status: statusFilter,
        category: categoryFilter
      });
      if (res && res.success && Array.isArray(res.data)) {
        const headers = ['ID', 'Title', 'Slug', 'Category', 'Author', 'Status', 'Views', 'Publish Date', 'Created At', 'Updated At'];
        const csvRows = [headers.join(',')];

        res.data.forEach(item => {
          const values = [
            item.id,
            `"${(item.title || '').replace(/"/g, '""')}"`,
            `"${item.slug || ''}"`,
            `"${(item.category_name || '').replace(/"/g, '""')}"`,
            `"${(item.author_name || '').replace(/"/g, '""')}"`,
            item.status,
            item.views || 0,
            `"${item.publish_at || ''}"`,
            `"${item.created_at || ''}"`,
            `"${item.updated_at || ''}"`
          ];
          csvRows.push(values.join(','));
        });

        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `medicare_plus_blog_export_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('Blog metadata exported successfully', 'success');
      }
    } catch (err) {
      console.error('Export error:', err);
      showToast('Failed to export blog metadata', 'error');
    }
  };

  // Confirm Modal Action Handlers
  const openConfirmModal = (type, post) => {
    setConfirmModal({
      isOpen: true,
      type,
      post,
      loading: false
    });
  };

  const closeConfirmModal = () => {
    setConfirmModal({
      isOpen: false,
      type: null,
      post: null,
      loading: false
    });
  };

  const handleConfirmAction = async () => {
    const { type, post } = confirmModal;
    if (!post) return;

    try {
      setConfirmModal(prev => ({ ...prev, loading: true }));

      if (type === 'delete') {
        const res = await adminBlogService.deletePost(post.id);
        if (res && res.success) {
          showToast(`Post "${post.title}" deleted successfully`, 'success');
          fetchData();
        } else {
          throw new Error(res?.message || 'Failed to delete post');
        }
      } else if (type === 'duplicate') {
        const res = await adminBlogService.duplicatePost(post.id);
        if (res && res.success) {
          showToast(`Post duplicated as draft: "${res.data?.title || post.title}"`, 'success');
          fetchData();
        } else {
          throw new Error(res?.message || 'Failed to duplicate post');
        }
      } else if (type === 'publish') {
        const res = await adminBlogService.updateStatus(post.id, 'PUBLISHED');
        if (res && res.success) {
          showToast(`Post "${post.title}" is now published and live!`, 'success');
          fetchData();
        } else {
          throw new Error(res?.message || 'Failed to publish post');
        }
      } else if (type === 'archive') {
        const res = await adminBlogService.updateStatus(post.id, 'ARCHIVED');
        if (res && res.success) {
          showToast(`Post "${post.title}" archived successfully`, 'success');
          fetchData();
        } else {
          throw new Error(res?.message || 'Failed to archive post');
        }
      } else if (type === 'restore') {
        const res = await adminBlogService.updateStatus(post.id, 'DRAFT');
        if (res && res.success) {
          showToast(`Post "${post.title}" restored to Draft`, 'success');
          fetchData();
        } else {
          throw new Error(res?.message || 'Failed to restore post');
        }
      }

      closeConfirmModal();
    } catch (err) {
      console.error('Action error:', err);
      showToast(err.response?.data?.message || err.message || 'Operation failed', 'error');
      setConfirmModal(prev => ({ ...prev, loading: false }));
    }
  };

  // Date formatter
  const formatDate = (dateString) => {
    if (!dateString) return '—';
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch (e) {
      return dateString;
    }
  };

  // Status badge component
  const renderStatusBadge = (status) => {
    const s = (status || '').toUpperCase();
    let badgeClass = 'blg-status-published';
    let label = 'Published';

    if (s === 'DRAFT') {
      badgeClass = 'blg-status-draft';
      label = 'Draft';
    } else if (s === 'SCHEDULED') {
      badgeClass = 'blg-status-scheduled';
      label = 'Scheduled';
    } else if (s === 'ARCHIVED') {
      badgeClass = 'blg-status-archived';
      label = 'Archived';
    }

    return (
      <span className={`blg-status-badge ${badgeClass}`}>
        <span className="blg-status-dot"></span>
        {label}
      </span>
    );
  };

  return (
    <div className="blg-page-wrapper">
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`blg-toast ${toastMessage.type === 'error' ? 'error' : toastMessage.type === 'info' ? 'info' : ''}`}>
          {toastMessage.type === 'error' ? (
            <AlertCircle size={18} />
          ) : (
            <CheckCircle2 size={18} />
          )}
          <span>{toastMessage.message}</span>
        </div>
      )}

      {/* Header & Breadcrumb */}
      <div className="blg-header">
        <div>
          <div className="blg-breadcrumb">
            <Link to="/admin">Admin</Link>
            <ChevronRight size={14} />
            <span className="blg-breadcrumb-current">Blog</span>
          </div>
          <div className="blg-title-wrap">
            <h1>Blog</h1>
            <p className="blg-subtitle">Create, manage and publish healthcare, medicine and wellness content.</p>
          </div>
        </div>

        <div className="blg-header-actions">
          <button
            type="button"
            className="blg-btn blg-btn-secondary"
            onClick={handleRefresh}
            disabled={refreshing}
            title="Refresh Data"
            aria-label="Refresh Data"
          >
            <RefreshCw size={16} className={refreshing ? 'blg-spin' : ''} />
            Refresh
          </button>

          <a
            href="/blog"
            target="_blank"
            rel="noopener noreferrer"
            className="blg-btn blg-btn-secondary"
            title="View Public Blog"
          >
            <ExternalLink size={16} />
            View Website
          </a>

          <Link to="/admin/blog/create" className="blg-btn blg-btn-primary">
            <Plus size={16} />
            + New Post
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="blg-summary-grid">
        <div className="blg-summary-card">
          <div className="blg-summary-icon total">
            <FileText size={22} />
          </div>
          <div className="blg-summary-info">
            <span className="blg-summary-label">Total Posts</span>
            <span className="blg-summary-value">{loading ? '—' : Number(summary.total || 0).toLocaleString()}</span>
            <span className="blg-summary-subtext">All time articles</span>
          </div>
        </div>

        <div className="blg-summary-card">
          <div className="blg-summary-icon published">
            <CheckCircle2 size={22} />
          </div>
          <div className="blg-summary-info">
            <span className="blg-summary-label">Published</span>
            <span className="blg-summary-value">{loading ? '—' : Number(summary.published || 0).toLocaleString()}</span>
            <span className="blg-summary-subtext">Live on customer store</span>
          </div>
        </div>

        <div className="blg-summary-card">
          <div className="blg-summary-icon drafts">
            <Edit2 size={22} />
          </div>
          <div className="blg-summary-info">
            <span className="blg-summary-label">Drafts</span>
            <span className="blg-summary-value">{loading ? '—' : Number(summary.drafts || 0).toLocaleString()}</span>
            <span className="blg-summary-subtext">Unpublished drafts</span>
          </div>
        </div>

        <div className="blg-summary-card">
          <div className="blg-summary-icon scheduled">
            <Clock size={22} />
          </div>
          <div className="blg-summary-info">
            <span className="blg-summary-label">Scheduled</span>
            <span className="blg-summary-value">{loading ? '—' : Number(summary.scheduled || 0).toLocaleString()}</span>
            <span className="blg-summary-subtext">Future publications</span>
          </div>
        </div>

        <div className="blg-summary-card">
          <div className="blg-summary-icon archived">
            <Archive size={22} />
          </div>
          <div className="blg-summary-info">
            <span className="blg-summary-label">Archived</span>
            <span className="blg-summary-value">{loading ? '—' : Number(summary.archived || 0).toLocaleString()}</span>
            <span className="blg-summary-subtext">Archived posts</span>
          </div>
        </div>

        <div className="blg-summary-card">
          <div className="blg-summary-icon views">
            <Eye size={22} />
          </div>
          <div className="blg-summary-info">
            <span className="blg-summary-label">Total Views</span>
            <span className="blg-summary-value">{loading ? '—' : Number(summary.total_views || 0).toLocaleString()}</span>
            <span className="blg-summary-subtext">Reader engagement</span>
          </div>
        </div>
      </div>

      {/* Filters Card */}
      <div className="blg-filter-card">
        <div className="blg-search-bar-row">
          <div className="blg-search-input-wrapper">
            <Search className="blg-search-icon" size={18} />
            <input
              type="text"
              className="blg-search-input"
              placeholder="Search by title, slug, excerpt, author..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                className="blg-clear-search-btn"
                onClick={() => setSearch('')}
                aria-label="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <select
            className="blg-select"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by Status"
          >
            <option value="ALL">All Status</option>
            <option value="PUBLISHED">Published</option>
            <option value="DRAFT">Draft</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="ARCHIVED">Archived</option>
          </select>

          <select
            className="blg-select"
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by Category"
          >
            <option value="ALL">All Categories</option>
            {categories.map((c) => (
              <option key={c.id || c.slug} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            className="blg-select"
            value={dateFilter}
            onChange={(e) => {
              setDateFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by Date"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="this_month">This Month</option>
          </select>

          <select
            className="blg-select"
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value);
              setPage(1);
            }}
            aria-label="Sort Articles"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="updated">Recently Updated</option>
            <option value="title_asc">Title A-Z</option>
            <option value="title_desc">Title Z-A</option>
            <option value="views">Most Viewed</option>
          </select>

          {isFiltered && (
            <button
              type="button"
              className="blg-btn blg-btn-secondary blg-btn-sm"
              onClick={handleResetFilters}
            >
              <X size={14} />
              Clear Filters
            </button>
          )}

          <button
            type="button"
            className="blg-btn blg-btn-secondary blg-btn-sm"
            onClick={handleExportCSV}
            title="Export CSV"
            style={{ marginLeft: 'auto' }}
          >
            <Download size={14} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Main Content Area: Table / Mobile Cards / Empty / Loading / Error */}
      <div className="blg-table-container">
        {loading ? (
          <div style={{ padding: '40px 20px' }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  gap: '20px',
                  alignItems: 'center',
                  padding: '16px 0',
                  borderBottom: '1px solid #F1F5F9'
                }}
              >
                <div style={{ width: '120px', height: '70px', background: '#E2E8F0', borderRadius: '10px' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ width: '40%', height: '16px', background: '#E2E8F0', borderRadius: '4px', marginBottom: '8px' }} />
                  <div style={{ width: '25%', height: '12px', background: '#F1F5F9', borderRadius: '4px' }} />
                </div>
                <div style={{ width: '100px', height: '14px', background: '#E2E8F0', borderRadius: '4px' }} />
                <div style={{ width: '80px', height: '24px', background: '#E2E8F0', borderRadius: '12px' }} />
                <div style={{ width: '120px', height: '32px', background: '#F1F5F9', borderRadius: '6px' }} />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="blg-error-container">
            <AlertTriangle className="blg-error-icon" size={40} />
            <h3 className="blg-error-title">Unable to load blog posts</h3>
            <p className="blg-error-desc">{error}</p>
            <button type="button" className="blg-btn blg-btn-primary" onClick={() => fetchData()}>
              Try Again
            </button>
          </div>
        ) : posts.length === 0 ? (
          <div className="blg-empty-container">
            <div className="blg-empty-icon">
              <BookOpen size={36} />
            </div>
            {isFiltered ? (
              <>
                <h3 className="blg-empty-title">No posts match your filters</h3>
                <p className="blg-empty-desc">Try clearing your search query or relaxing filter options.</p>
                <button type="button" className="blg-btn blg-btn-secondary" onClick={handleResetFilters}>
                  Clear Filters
                </button>
              </>
            ) : (
              <>
                <h3 className="blg-empty-title">No blog posts found</h3>
                <p className="blg-empty-desc">Create your first healthcare and wellness article to engage customers.</p>
                <Link to="/admin/blog/create" className="blg-btn blg-btn-primary">
                  <Plus size={16} />
                  + New Post
                </Link>
              </>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="blg-table-responsive">
              <table className="blg-table">
                <thead>
                  <tr>
                    <th style={{ width: '38%' }}>Post</th>
                    <th style={{ width: '13%' }}>Author</th>
                    <th style={{ width: '12%' }}>Category</th>
                    <th style={{ width: '10%' }}>Status</th>
                    <th style={{ width: '10%' }}>Published</th>
                    <th style={{ width: '7%', textAlign: 'center' }}>Views</th>
                    <th style={{ width: '10%' }}>Updated</th>
                    <th style={{ width: '10%', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {posts.map((post) => {
                    const postImg = resolveImageUrl(post.featured_image, placeholderImg);
                    return (
                      <tr key={post.id}>
                        {/* Post Cell */}
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                            <div className="blg-thumbnail-container">
                              <img
                                src={postImg}
                                alt={post.title}
                                className="blg-thumbnail-img"
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src = placeholderImg;
                                }}
                              />
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <Link
                                to={`/admin/blog/edit/${post.id}`}
                                style={{
                                  fontSize: '14px',
                                  fontWeight: '600',
                                  color: 'var(--blg-text-main)',
                                  textDecoration: 'none',
                                  display: 'block',
                                  marginBottom: '3px',
                                  lineHeight: '1.3'
                                }}
                                title={post.title}
                              >
                                {post.title}
                              </Link>
                              <div style={{ fontSize: '12px', color: 'var(--blg-text-light)', fontFamily: 'monospace' }}>
                                /{post.slug}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Author */}
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div
                              style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '50%',
                                background: '#E2E8F0',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '11px',
                                fontWeight: '700',
                                color: '#475569'
                              }}
                            >
                              {(post.author_name || 'A').charAt(0).toUpperCase()}
                            </div>
                            <span style={{ fontSize: '13px', fontWeight: '500' }}>
                              {post.author_name || 'Admin'}
                            </span>
                          </div>
                        </td>

                        {/* Category */}
                        <td>
                          <span className="blg-cat-badge">
                            {post.category_name || 'General'}
                          </span>
                        </td>

                        {/* Status */}
                        <td>
                          {renderStatusBadge(post.status)}
                        </td>

                        {/* Published Date */}
                        <td>
                          <div style={{ fontSize: '12px', color: 'var(--blg-text-main)', fontWeight: '500' }}>
                            {formatDate(post.publish_at || post.created_at)}
                          </div>
                          {post.read_time && (
                            <div style={{ fontSize: '11px', color: 'var(--blg-text-light)' }}>
                              {post.read_time}
                            </div>
                          )}
                        </td>

                        {/* Views */}
                        <td style={{ textAlign: 'center' }}>
                          <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--blg-text-main)' }}>
                            {Number(post.views || 0).toLocaleString()}
                          </span>
                        </td>

                        {/* Updated Date */}
                        <td>
                          <span style={{ fontSize: '12px', color: 'var(--blg-text-muted)' }}>
                            {formatDate(post.updated_at || post.created_at)}
                          </span>
                        </td>

                        {/* Actions */}
                        <td>
                          <div className="blg-actions-cell">
                            {/* View customer page */}
                            <a
                              href={`/blog/${post.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="blg-action-btn view"
                              title="View Article on Public Site"
                            >
                              <Eye size={14} />
                              View
                            </a>

                            {/* Edit */}
                            <Link
                              to={`/admin/blog/edit/${post.id}`}
                              className="blg-action-btn edit"
                              title="Edit Article"
                            >
                              <Edit2 size={14} />
                              Edit
                            </Link>

                            {/* Duplicate */}
                            <button
                              type="button"
                              className="blg-action-btn"
                              onClick={() => openConfirmModal('duplicate', post)}
                              title="Duplicate as Draft"
                            >
                              <Copy size={14} />
                            </button>

                            {/* Quick Status Toggles */}
                            {post.status === 'DRAFT' && (
                              <button
                                type="button"
                                className="blg-action-btn"
                                style={{ color: 'var(--blg-success)' }}
                                onClick={() => openConfirmModal('publish', post)}
                                title="Publish Now"
                              >
                                <Send size={14} />
                              </button>
                            )}

                            {post.status === 'PUBLISHED' && (
                              <button
                                type="button"
                                className="blg-action-btn"
                                style={{ color: 'var(--blg-text-muted)' }}
                                onClick={() => openConfirmModal('archive', post)}
                                title="Archive Article"
                              >
                                <Archive size={14} />
                              </button>
                            )}

                            {post.status === 'SCHEDULED' && (
                              <button
                                type="button"
                                className="blg-action-btn"
                                style={{ color: 'var(--blg-primary)' }}
                                onClick={() => openConfirmModal('publish', post)}
                                title="Publish Immediately"
                              >
                                <Send size={14} />
                              </button>
                            )}

                            {post.status === 'ARCHIVED' && (
                              <button
                                type="button"
                                className="blg-action-btn"
                                style={{ color: '#D97706' }}
                                onClick={() => openConfirmModal('restore', post)}
                                title="Restore to Draft"
                              >
                                <RefreshCw size={14} />
                              </button>
                            )}

                            {/* Delete */}
                            <button
                              type="button"
                              className="blg-action-btn"
                              style={{ color: 'var(--blg-danger)' }}
                              onClick={() => openConfirmModal('delete', post)}
                              title="Delete Article"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="blg-mobile-cards-wrap">
              {posts.map((post) => {
                const postImg = resolveImageUrl(post.featured_image, placeholderImg);
                return (
                  <div key={post.id} className="blg-mobile-card">
                    <div className="blg-mobile-card-top">
                      <div className="blg-mobile-card-thumb">
                        <img
                          src={postImg}
                          alt={post.title}
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = placeholderImg;
                          }}
                        />
                      </div>
                      <div className="blg-mobile-card-meta">
                        <span className="blg-cat-badge">{post.category_name || 'General'}</span>
                        <div style={{ marginTop: '6px' }}>{renderStatusBadge(post.status)}</div>
                        <div style={{ fontSize: '11px', color: 'var(--blg-text-light)', marginTop: '4px' }}>
                          <Eye size={12} style={{ display: 'inline', marginRight: '4px' }} />
                          {Number(post.views || 0).toLocaleString()} views
                        </div>
                      </div>
                    </div>

                    <Link
                      to={`/admin/blog/edit/${post.id}`}
                      className="blg-mobile-card-title"
                    >
                      {post.title}
                    </Link>

                    <div className="blg-mobile-card-sub">
                      <span>By {post.author_name || 'Admin'}</span>
                      <span>•</span>
                      <span>{formatDate(post.publish_at || post.created_at)}</span>
                    </div>

                    <div className="blg-mobile-card-actions">
                      <a
                        href={`/blog/${post.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="blg-action-btn view"
                      >
                        <Eye size={14} /> View
                      </a>
                      <Link
                        to={`/admin/blog/edit/${post.id}`}
                        className="blg-action-btn edit"
                      >
                        <Edit2 size={14} /> Edit
                      </Link>
                      <button
                        type="button"
                        className="blg-action-btn"
                        onClick={() => openConfirmModal('duplicate', post)}
                      >
                        <Copy size={14} /> Duplicate
                      </button>
                      <button
                        type="button"
                        className="blg-action-btn"
                        style={{ color: 'var(--blg-danger)' }}
                        onClick={() => openConfirmModal('delete', post)}
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Bar */}
            <div className="blg-pagination-bar">
              <div className="blg-pagination-info">
                Showing{' '}
                <strong>
                  {Math.min((page - 1) * limit + 1, totalRecords)}
                </strong>{' '}
                to{' '}
                <strong>
                  {Math.min(page * limit, totalRecords)}
                </strong>{' '}
                of <strong>{totalRecords}</strong> articles
              </div>

              <div className="blg-pagination-controls">
                <button
                  type="button"
                  className="blg-page-btn"
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  disabled={page <= 1}
                  aria-label="Previous Page"
                >
                  <ChevronLeft size={16} />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || (p >= page - 1 && p <= page + 1))
                  .map((p, idx, arr) => {
                    const prev = arr[idx - 1];
                    return (
                      <React.Fragment key={p}>
                        {prev && p - prev > 1 && <span style={{ padding: '0 4px', color: '#94A3B8' }}>...</span>}
                        <button
                          type="button"
                          className={`blg-page-btn ${page === p ? 'active' : ''}`}
                          onClick={() => setPage(p)}
                        >
                          {p}
                        </button>
                      </React.Fragment>
                    );
                  })}

                <button
                  type="button"
                  className="blg-page-btn"
                  onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                  disabled={page >= totalPages}
                  aria-label="Next Page"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="blg-modal-overlay" onClick={closeConfirmModal}>
          <div className="blg-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="blg-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    background:
                      confirmModal.type === 'delete'
                        ? 'var(--blg-danger-bg)'
                        : confirmModal.type === 'publish'
                        ? 'var(--blg-success-bg)'
                        : '#F1F5F9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color:
                      confirmModal.type === 'delete'
                        ? 'var(--blg-danger)'
                        : confirmModal.type === 'publish'
                        ? 'var(--blg-success)'
                        : 'var(--blg-text-main)'
                  }}
                >
                  {confirmModal.type === 'delete' ? (
                    <Trash2 size={20} />
                  ) : confirmModal.type === 'publish' ? (
                    <Send size={20} />
                  ) : confirmModal.type === 'archive' ? (
                    <Archive size={20} />
                  ) : (
                    <Copy size={20} />
                  )}
                </div>
                <h3 className="blg-modal-title">
                  {confirmModal.type === 'delete' && 'Delete Blog Post'}
                  {confirmModal.type === 'publish' && 'Publish Article Now'}
                  {confirmModal.type === 'archive' && 'Archive Article'}
                  {confirmModal.type === 'restore' && 'Restore to Draft'}
                  {confirmModal.type === 'duplicate' && 'Duplicate Article'}
                </h3>
              </div>
              <button
                type="button"
                className="blg-modal-close-btn"
                onClick={closeConfirmModal}
                disabled={confirmModal.loading}
              >
                <X size={18} />
              </button>
            </div>

            <div className="blg-modal-body">
              <p style={{ fontSize: '14px', color: 'var(--blg-text-main)', marginBottom: '12px' }}>
                {confirmModal.type === 'delete' &&
                  'Are you sure you want to delete this article? This will remove it from the customer store.'}
                {confirmModal.type === 'publish' &&
                  'Publish this article now? It will immediately become visible to customers on the Medicare PLUS blog.'}
                {confirmModal.type === 'archive' &&
                  'Archive this article? It will no longer be visible on the customer blog, but remains in your archive.'}
                {confirmModal.type === 'restore' &&
                  'Restore this article to draft status? You can continue editing it before republishing.'}
                {confirmModal.type === 'duplicate' &&
                  'Create a duplicate copy of this article as a draft with a fresh unique slug?'}
              </p>

              <div
                style={{
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  padding: '12px',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: 'var(--blg-text-main)'
                }}
              >
                "{confirmModal.post?.title}"
              </div>
            </div>

            <div className="blg-modal-footer">
              <button
                type="button"
                className="blg-btn blg-btn-secondary"
                onClick={closeConfirmModal}
                disabled={confirmModal.loading}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`blg-btn ${confirmModal.type === 'delete' ? 'blg-btn-danger' : 'blg-btn-primary'}`}
                onClick={handleConfirmAction}
                disabled={confirmModal.loading}
              >
                {confirmModal.loading ? (
                  <>
                    <RefreshCw size={14} className="blg-spin" />
                    Processing...
                  </>
                ) : confirmModal.type === 'delete' ? (
                  'Delete Article'
                ) : confirmModal.type === 'publish' ? (
                  'Publish Now'
                ) : confirmModal.type === 'archive' ? (
                  'Archive'
                ) : confirmModal.type === 'restore' ? (
                  'Restore'
                ) : (
                  'Duplicate'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
