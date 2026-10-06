import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Star,
  Search,
  X,
  RefreshCw,
  Eye,
  CheckCircle2,
  XCircle,
  EyeOff,
  Trash2,
  Calendar,
  Clock,
  AlertTriangle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  User,
  Package,
  ShoppingBag,
  ExternalLink,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  MessageSquare
} from 'lucide-react';
import { adminReviewService } from '../../../services/adminApi';
import { resolveImageUrl } from '../../../utils/imageUrl';
import placeholderImg from '../../../assets/images/medicine-placeholder.jpg';
import './AdminReviews.css';

export default function AdminReviews() {
  // State
  const [reviews, setReviews] = useState([]);
  const [summary, setSummary] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    hidden: 0,
    average_rating: 0,
    products_with_reviews: 0
  });
  const [distribution, setDistribution] = useState({
    total: 0,
    stars: []
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [ratingFilter, setRatingFilter] = useState('ALL');
  const [verifiedFilter, setVerifiedFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Modals
  const [selectedReview, setSelectedReview] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const [rejectModal, setRejectModal] = useState({
    isOpen: false,
    review: null,
    reason: 'Spam / Promotional link',
    customNotes: '',
    loading: false
  });

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    type: null, // 'approve' | 'hide' | 'restore' | 'delete'
    review: null,
    loading: false
  });

  // Toast
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

  // Fetch reviews from MySQL
  const fetchData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const params = {
        search: debouncedSearch,
        status: statusFilter,
        rating: ratingFilter,
        verified: verifiedFilter,
        date_filter: dateFilter,
        sort: sortBy,
        page,
        limit
      };

      const res = await adminReviewService.getReviews(params);
      if (res && res.success) {
        setReviews(res.data.reviews || []);
        if (res.data.summary) {
          setSummary(res.data.summary);
        }
        if (res.data.distribution) {
          setDistribution(res.data.distribution);
        }
        if (res.data.pagination) {
          setTotalPages(res.data.pagination.totalPages || 1);
          setTotalRecords(res.data.pagination.total || 0);
        }
      } else {
        throw new Error(res?.message || 'Failed to fetch reviews.');
      }
    } catch (err) {
      console.error('Fetch reviews error:', err);
      setError(err.response?.data?.message || err.message || 'Unable to load reviews. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [debouncedSearch, statusFilter, ratingFilter, verifiedFilter, dateFilter, sortBy, page, limit]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Refresh handler
  const handleRefresh = () => {
    fetchData(true);
    showToast('Refreshing review records...', 'info');
  };

  // Reset Filters
  const handleResetFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setStatusFilter('ALL');
    setRatingFilter('ALL');
    setVerifiedFilter('ALL');
    setDateFilter('all');
    setSortBy('newest');
    setPage(1);
  };

  const isFiltered = Boolean(
    search ||
    statusFilter !== 'ALL' ||
    ratingFilter !== 'ALL' ||
    verifiedFilter !== 'ALL' ||
    dateFilter !== 'all' ||
    sortBy !== 'newest'
  );

  // CSV Export
  const handleExportCSV = async () => {
    try {
      showToast('Generating CSV export...', 'info');
      const res = await adminReviewService.exportReviews();
      if (res && res.success && Array.isArray(res.data)) {
        const headers = [
          'Review ID',
          'Customer Name',
          'Customer Email',
          'Product Name',
          'SKU',
          'Order #',
          'Rating',
          'Title',
          'Review Text',
          'Verified Purchase',
          'Status',
          'Moderation Reason',
          'Created Date'
        ];
        const csvRows = [headers.join(',')];

        res.data.forEach((item) => {
          const values = [
            item.id,
            `"${(item.customer_name || '').replace(/"/g, '""')}"`,
            `"${(item.customer_email || '').replace(/"/g, '""')}"`,
            `"${(item.product_name || '').replace(/"/g, '""')}"`,
            `"${item.product_sku || ''}"`,
            `"${item.order_number || ''}"`,
            item.rating,
            `"${(item.title || '').replace(/"/g, '""')}"`,
            `"${(item.comment || '').replace(/"/g, '""')}"`,
            item.verified_purchase ? 'Yes' : 'No',
            item.status,
            `"${(item.moderation_reason || '').replace(/"/g, '""')}"`,
            `"${item.created_at || ''}"`
          ];
          csvRows.push(values.join(','));
        });

        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `medicare_plus_reviews_export_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('Reviews exported successfully!', 'success');
      }
    } catch (err) {
      console.error('Export error:', err);
      showToast('Failed to export reviews metadata.', 'error');
    }
  };

  // Moderation Handlers
  const handleApprove = async (review) => {
    try {
      const res = await adminReviewService.approveReview(review.id);
      if (res && res.success) {
        showToast(`Review #${review.id} approved! Live on product page.`, 'success');
        fetchData();
        if (isDetailModalOpen && selectedReview?.id === review.id) {
          setSelectedReview(prev => ({ ...prev, status: 'APPROVED', moderation_reason: null }));
        }
      } else {
        throw new Error(res?.message || 'Approval failed');
      }
    } catch (err) {
      console.error('Approve error:', err);
      showToast(err.response?.data?.message || err.message || 'Failed to approve review', 'error');
    }
  };

  const openRejectModal = (review) => {
    setRejectModal({
      isOpen: true,
      review,
      reason: 'Spam / Promotional link',
      customNotes: '',
      loading: false
    });
  };

  const handleConfirmReject = async () => {
    const { review, reason, customNotes } = rejectModal;
    if (!review) return;

    try {
      setRejectModal(prev => ({ ...prev, loading: true }));
      const finalReason = customNotes ? `${reason} — ${customNotes}` : reason;
      const res = await adminReviewService.rejectReview(review.id, finalReason);

      if (res && res.success) {
        showToast(`Review #${review.id} rejected and hidden.`, 'info');
        setRejectModal({ isOpen: false, review: null, reason: 'Spam / Promotional link', customNotes: '', loading: false });
        fetchData();
        if (isDetailModalOpen && selectedReview?.id === review.id) {
          setSelectedReview(prev => ({ ...prev, status: 'REJECTED', moderation_reason: finalReason }));
        }
      } else {
        throw new Error(res?.message || 'Rejection failed');
      }
    } catch (err) {
      console.error('Reject error:', err);
      showToast(err.response?.data?.message || err.message || 'Failed to reject review', 'error');
      setRejectModal(prev => ({ ...prev, loading: false }));
    }
  };

  const openConfirmModal = (type, review) => {
    setConfirmModal({
      isOpen: true,
      type,
      review,
      loading: false
    });
  };

  const handleConfirmAction = async () => {
    const { type, review } = confirmModal;
    if (!review) return;

    try {
      setConfirmModal(prev => ({ ...prev, loading: true }));

      if (type === 'hide') {
        const res = await adminReviewService.hideReview(review.id);
        if (res && res.success) {
          showToast(`Review #${review.id} hidden from store.`, 'info');
          fetchData();
          if (isDetailModalOpen && selectedReview?.id === review.id) {
            setSelectedReview(prev => ({ ...prev, status: 'HIDDEN' }));
          }
        }
      } else if (type === 'restore') {
        const res = await adminReviewService.restoreReview(review.id);
        if (res && res.success) {
          showToast(`Review #${review.id} restored to Approved.`, 'success');
          fetchData();
          if (isDetailModalOpen && selectedReview?.id === review.id) {
            setSelectedReview(prev => ({ ...prev, status: 'APPROVED' }));
          }
        }
      } else if (type === 'delete') {
        const res = await adminReviewService.deleteReview(review.id);
        if (res && res.success) {
          showToast(`Review #${review.id} deleted.`, 'success');
          fetchData();
          if (isDetailModalOpen && selectedReview?.id === review.id) {
            setIsDetailModalOpen(false);
          }
        }
      }

      setConfirmModal({ isOpen: false, type: null, review: null, loading: false });
    } catch (err) {
      console.error('Modal action error:', err);
      showToast(err.response?.data?.message || err.message || 'Operation failed', 'error');
      setConfirmModal(prev => ({ ...prev, loading: false }));
    }
  };

  // Open Details Modal
  const openDetailModal = (review) => {
    setSelectedReview(review);
    setIsDetailModalOpen(true);
  };

  // Star rating renderer
  const renderStars = (ratingCount) => {
    const num = Math.min(5, Math.max(1, parseInt(ratingCount, 10) || 5));
    return (
      <div className="rev-stars" title={`${num} out of 5 stars`}>
        {[1, 2, 3, 4, 5].map((s) => (
          <Star
            key={s}
            size={14}
            fill={s <= num ? '#F59E0B' : '#E2E8F0'}
            color={s <= num ? '#F59E0B' : '#CBD5E1'}
          />
        ))}
      </div>
    );
  };

  // Status badge renderer
  const renderStatusBadge = (status) => {
    const s = (status || '').toUpperCase();
    let badgeClass = 'rev-status-approved';
    let label = 'Approved';

    if (s === 'PENDING') {
      badgeClass = 'rev-status-pending';
      label = 'Pending';
    } else if (s === 'REJECTED') {
      badgeClass = 'rev-status-rejected';
      label = 'Rejected';
    } else if (s === 'HIDDEN') {
      badgeClass = 'rev-status-hidden';
      label = 'Hidden';
    }

    return (
      <span className={`rev-status-badge ${badgeClass}`}>
        <span className="rev-status-dot"></span>
        {label}
      </span>
    );
  };

  // Format date helper
  const formatDate = (dateString) => {
    if (!dateString) return '—';
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch (e) {
      return dateString;
    }
  };

  return (
    <div className="rev-page-wrapper">
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`rev-toast ${toastMessage.type === 'error' ? 'error' : toastMessage.type === 'info' ? 'info' : ''}`}>
          {toastMessage.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          <span>{toastMessage.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="rev-header">
        <div>
          <div className="rev-breadcrumb">
            <Link to="/admin">Admin</Link>
            <ChevronRight size={14} />
            <span className="rev-breadcrumb-current">Reviews</span>
          </div>
          <div className="rev-title-wrap">
            <h1>Reviews</h1>
            <p className="rev-subtitle">Manage customer reviews, ratings and product feedback.</p>
          </div>
        </div>

        <div className="rev-header-actions">
          <button
            type="button"
            className="rev-btn rev-btn-secondary"
            onClick={handleRefresh}
            disabled={refreshing}
            title="Refresh Data"
            aria-label="Refresh Data"
          >
            <RefreshCw size={16} className={refreshing ? 'rev-spin' : ''} />
            Refresh
          </button>

          <button
            type="button"
            className="rev-btn rev-btn-secondary"
            onClick={handleExportCSV}
            title="Export Reviews to CSV"
          >
            <Download size={16} />
            Export Reviews
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="rev-summary-grid">
        <div className="rev-summary-card">
          <div className="rev-summary-icon total">
            <MessageSquare size={22} />
          </div>
          <div className="rev-summary-info">
            <span className="rev-summary-label">Total Reviews</span>
            <span className="rev-summary-value">{loading ? '—' : Number(summary.total || 0).toLocaleString()}</span>
            <span className="rev-summary-subtext">All submitted reviews</span>
          </div>
        </div>

        <div className="rev-summary-card">
          <div className="rev-summary-icon pending">
            <Clock size={22} />
          </div>
          <div className="rev-summary-info">
            <span className="rev-summary-label">Pending</span>
            <span className="rev-summary-value">{loading ? '—' : Number(summary.pending || 0).toLocaleString()}</span>
            <span className="rev-summary-subtext">Awaiting moderation</span>
          </div>
        </div>

        <div className="rev-summary-card">
          <div className="rev-summary-icon approved">
            <CheckCircle2 size={22} />
          </div>
          <div className="rev-summary-info">
            <span className="rev-summary-label">Approved</span>
            <span className="rev-summary-value">{loading ? '—' : Number(summary.approved || 0).toLocaleString()}</span>
            <span className="rev-summary-subtext">Live on store</span>
          </div>
        </div>

        <div className="rev-summary-card">
          <div className="rev-summary-icon rejected">
            <XCircle size={22} />
          </div>
          <div className="rev-summary-info">
            <span className="rev-summary-label">Rejected</span>
            <span className="rev-summary-value">{loading ? '—' : Number(summary.rejected || 0).toLocaleString()}</span>
            <span className="rev-summary-subtext">Declined feedback</span>
          </div>
        </div>

        <div className="rev-summary-card">
          <div className="rev-summary-icon rating">
            <Star size={22} fill="#B45309" color="#B45309" />
          </div>
          <div className="rev-summary-info">
            <span className="rev-summary-label">Average Rating</span>
            <span className="rev-summary-value">
              {loading ? '—' : (summary.average_rating ? `${Number(summary.average_rating).toFixed(1)} ★` : '0.0 ★')}
            </span>
            <span className="rev-summary-subtext">From approved reviews</span>
          </div>
        </div>

        <div className="rev-summary-card">
          <div className="rev-summary-icon products">
            <Package size={22} />
          </div>
          <div className="rev-summary-info">
            <span className="rev-summary-label">Products with Reviews</span>
            <span className="rev-summary-value">{loading ? '—' : Number(summary.products_with_reviews || 0).toLocaleString()}</span>
            <span className="rev-summary-subtext">Catalog coverage</span>
          </div>
        </div>
      </div>

      {/* Rating Distribution Panel */}
      <div className="rev-distribution-card">
        <div className="rev-dist-overview">
          <div className="rev-dist-score">
            {Number(summary.average_rating || 0).toFixed(1)}
            <span style={{ fontSize: '26px', color: '#F59E0B' }}>★</span>
          </div>
          <div className="rev-dist-stars-row">
            {renderStars(Math.round(summary.average_rating || 5))}
          </div>
          <div className="rev-dist-count-text">
            Based on <strong>{Number(distribution.total || summary.approved || 0).toLocaleString()}</strong> approved reviews
          </div>
        </div>

        <div className="rev-dist-bars">
          {(distribution.stars && distribution.stars.length > 0
            ? distribution.stars
            : [
                { stars: 5, count: 0, percentage: 0 },
                { stars: 4, count: 0, percentage: 0 },
                { stars: 3, count: 0, percentage: 0 },
                { stars: 2, count: 0, percentage: 0 },
                { stars: 1, count: 0, percentage: 0 }
              ]
          ).map((item) => (
            <div key={item.stars} className="rev-dist-row">
              <span className="rev-dist-row-label">
                {item.stars} <Star size={12} fill="#F59E0B" color="#F59E0B" />
              </span>
              <div className="rev-progress-track">
                <div
                  className="rev-progress-fill"
                  style={{ width: `${item.percentage}%` }}
                />
              </div>
              <span className="rev-dist-row-pct">{item.percentage}%</span>
              <span className="rev-dist-row-count">({item.count})</span>
            </div>
          ))}
        </div>
      </div>

      {/* Filter Card */}
      <div className="rev-filter-card">
        <div className="rev-search-bar-row">
          <div className="rev-search-input-wrapper">
            <Search className="rev-search-icon" size={18} />
            <input
              type="text"
              className="rev-search-input"
              placeholder="Search by customer name, email, product, review text, SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                className="rev-clear-search-btn"
                onClick={() => setSearch('')}
                aria-label="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <select
            className="rev-select"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by Status"
          >
            <option value="ALL">All Status</option>
            <option value="PENDING">Pending Moderation</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="HIDDEN">Hidden</option>
          </select>

          <select
            className="rev-select"
            value={ratingFilter}
            onChange={(e) => {
              setRatingFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by Rating"
          >
            <option value="ALL">All Ratings</option>
            <option value="5">5 Stars ★★★★★</option>
            <option value="4">4 Stars ★★★★☆</option>
            <option value="3">3 Stars ★★★☆☆</option>
            <option value="2">2 Stars ★★☆☆☆</option>
            <option value="1">1 Star ★☆☆☆☆</option>
          </select>

          <select
            className="rev-select"
            value={verifiedFilter}
            onChange={(e) => {
              setVerifiedFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by Verified Purchase"
          >
            <option value="ALL">All Purchases</option>
            <option value="1">Verified Purchase Only</option>
            <option value="0">Unverified Only</option>
          </select>

          <select
            className="rev-select"
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
            className="rev-select"
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value);
              setPage(1);
            }}
            aria-label="Sort Reviews"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="rating_desc">Highest Rating</option>
            <option value="rating_asc">Lowest Rating</option>
            <option value="updated">Recently Updated</option>
          </select>

          {isFiltered && (
            <button
              type="button"
              className="rev-btn rev-btn-secondary rev-btn-sm"
              onClick={handleResetFilters}
            >
              <X size={14} />
              Clear Filters
            </button>
          )}

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', color: 'var(--rev-text-muted)' }}>Show:</span>
            <select
              className="rev-select"
              style={{ height: '36px', padding: '4px 10px' }}
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              aria-label="Reviews per page"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table / Skeletons / Empty / Error */}
      <div className="rev-table-container">
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
                <div style={{ width: '40px', height: '40px', background: '#E2E8F0', borderRadius: '50%' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ width: '35%', height: '16px', background: '#E2E8F0', borderRadius: '4px', marginBottom: '8px' }} />
                  <div style={{ width: '60%', height: '12px', background: '#F1F5F9', borderRadius: '4px' }} />
                </div>
                <div style={{ width: '90px', height: '16px', background: '#E2E8F0', borderRadius: '4px' }} />
                <div style={{ width: '80px', height: '24px', background: '#E2E8F0', borderRadius: '12px' }} />
                <div style={{ width: '130px', height: '32px', background: '#F1F5F9', borderRadius: '6px' }} />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="rev-error-container">
            <AlertTriangle size={42} style={{ color: 'var(--rev-danger)', marginBottom: '12px' }} />
            <h3 className="rev-error-title">Unable to load reviews</h3>
            <p className="rev-error-desc">{error}</p>
            <button type="button" className="rev-btn rev-btn-primary" onClick={() => fetchData()}>
              Try Again
            </button>
          </div>
        ) : reviews.length === 0 ? (
          <div className="rev-empty-container">
            <div className="rev-empty-icon">
              <Star size={36} fill="#F59E0B" color="#F59E0B" />
            </div>
            {isFiltered ? (
              <>
                <h3 className="rev-empty-title">No reviews match your filters</h3>
                <p className="rev-empty-desc">Try clearing search terms or changing status/rating filter selections.</p>
                <button type="button" className="rev-btn rev-btn-secondary" onClick={handleResetFilters}>
                  Clear Filters
                </button>
              </>
            ) : (
              <>
                <h3 className="rev-empty-title">No reviews found</h3>
                <p className="rev-empty-desc">Customer reviews will appear here once customers submit feedback on your products.</p>
              </>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="rev-table-responsive">
              <table className="rev-table">
                <thead>
                  <tr>
                    <th style={{ width: '28%' }}>Review</th>
                    <th style={{ width: '18%' }}>Customer</th>
                    <th style={{ width: '20%' }}>Product</th>
                    <th style={{ width: '10%' }}>Rating</th>
                    <th style={{ width: '10%' }}>Date</th>
                    <th style={{ width: '8%' }}>Status</th>
                    <th style={{ width: '16%', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reviews.map((rev) => {
                    const prodImg = resolveImageUrl(rev.product_image, placeholderImg);
                    return (
                      <tr key={rev.id}>
                        {/* Review Column */}
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {renderStars(rev.rating)}
                              {rev.title && (
                                <strong style={{ fontSize: '13px', color: 'var(--rev-text-main)' }}>
                                  {rev.title}
                                </strong>
                              )}
                            </div>
                            <div className="rev-text-preview" title={rev.comment}>
                              "{rev.comment}"
                            </div>
                            {rev.comment && rev.comment.length > 90 && (
                              <button
                                type="button"
                                onClick={() => openDetailModal(rev)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  padding: 0,
                                  color: 'var(--rev-primary)',
                                  fontSize: '11px',
                                  fontWeight: '600',
                                  cursor: 'pointer',
                                  textAlign: 'left',
                                  width: 'fit-content'
                                }}
                              >
                                Read full review &rsaquo;
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Customer */}
                        <td>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                            <div
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                background: '#E2E8F0',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '12px',
                                fontWeight: '700',
                                color: '#475569',
                                flexShrink: 0
                              }}
                            >
                              {(rev.customer_name || 'C').charAt(0).toUpperCase()}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--rev-text-main)' }}>
                                {rev.customer_name}
                              </div>
                              <div style={{ fontSize: '12px', color: 'var(--rev-text-muted)' }}>
                                {rev.customer_email || '—'}
                              </div>
                              {rev.verified_purchase ? (
                                <span className="rev-verified-badge">
                                  <ShieldCheck size={11} /> Verified Purchase
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </td>

                        {/* Product */}
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <img
                              src={prodImg}
                              alt={rev.product_name}
                              style={{
                                width: '42px',
                                height: '42px',
                                borderRadius: '8px',
                                objectFit: 'cover',
                                border: '1px solid #E2E8F0',
                                flexShrink: 0
                              }}
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = placeholderImg;
                              }}
                            />
                            <div style={{ minWidth: 0 }}>
                              <div
                                style={{
                                  fontSize: '13px',
                                  fontWeight: '600',
                                  color: 'var(--rev-text-main)',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  maxWidth: '180px'
                                }}
                                title={rev.product_name}
                              >
                                {rev.product_name || `Product #${rev.product_id}`}
                              </div>
                              {rev.product_sku && (
                                <div style={{ fontSize: '11px', color: 'var(--rev-text-light)' }}>
                                  SKU: {rev.product_sku}
                                </div>
                              )}
                              {rev.order_number && (
                                <div style={{ fontSize: '11px', color: 'var(--rev-primary)', fontWeight: '500' }}>
                                  Order: {rev.order_number}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Rating */}
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--rev-text-main)' }}>
                              {rev.rating}.0
                            </span>
                            <Star size={14} fill="#F59E0B" color="#F59E0B" />
                          </div>
                        </td>

                        {/* Date */}
                        <td>
                          <span style={{ fontSize: '12px', color: 'var(--rev-text-main)', fontWeight: '500' }}>
                            {formatDate(rev.created_at)}
                          </span>
                        </td>

                        {/* Status */}
                        <td>
                          {renderStatusBadge(rev.status)}
                        </td>

                        {/* Actions */}
                        <td>
                          <div className="rev-actions-cell">
                            {/* View Details */}
                            <button
                              type="button"
                              className="rev-action-btn view"
                              onClick={() => openDetailModal(rev)}
                              title="View Full Details"
                            >
                              <Eye size={13} /> View
                            </button>

                            {/* Approve */}
                            {rev.status !== 'APPROVED' && (
                              <button
                                type="button"
                                className="rev-action-btn approve"
                                onClick={() => handleApprove(rev)}
                                title="Approve Review"
                              >
                                <CheckCircle2 size={13} /> Approve
                              </button>
                            )}

                            {/* Reject */}
                            {rev.status !== 'REJECTED' && (
                              <button
                                type="button"
                                className="rev-action-btn reject"
                                onClick={() => openRejectModal(rev)}
                                title="Reject Review"
                              >
                                <XCircle size={13} /> Reject
                              </button>
                            )}

                            {/* Hide / Restore */}
                            {rev.status === 'APPROVED' && (
                              <button
                                type="button"
                                className="rev-action-btn"
                                onClick={() => openConfirmModal('hide', rev)}
                                title="Hide from Public View"
                              >
                                <EyeOff size={13} />
                              </button>
                            )}

                            {rev.status === 'HIDDEN' && (
                              <button
                                type="button"
                                className="rev-action-btn approve"
                                onClick={() => openConfirmModal('restore', rev)}
                                title="Restore to Approved"
                              >
                                <RotateCcw size={13} />
                              </button>
                            )}

                            {/* Delete */}
                            <button
                              type="button"
                              className="rev-action-btn"
                              style={{ color: 'var(--rev-danger)' }}
                              onClick={() => openConfirmModal('delete', rev)}
                              title="Delete Review"
                            >
                              <Trash2 size={13} />
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
            <div className="rev-mobile-cards-wrap">
              {reviews.map((rev) => {
                const prodImg = resolveImageUrl(rev.product_image, placeholderImg);
                return (
                  <div key={rev.id} className="rev-mobile-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
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
                            fontWeight: '700'
                          }}
                        >
                          {(rev.customer_name || 'C').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: '600' }}>{rev.customer_name}</div>
                          {rev.verified_purchase && (
                            <span className="rev-verified-badge" style={{ fontSize: '10px', padding: '1px 4px' }}>
                              ✓ Verified
                            </span>
                          )}
                        </div>
                      </div>
                      <div>{renderStatusBadge(rev.status)}</div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <img
                        src={prodImg}
                        alt={rev.product_name}
                        style={{ width: '32px', height: '32px', borderRadius: '6px', objectFit: 'cover' }}
                      />
                      <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--rev-text-main)' }}>
                        {rev.product_name}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                      {renderStars(rev.rating)}
                      {rev.title && (
                        <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--rev-text-main)' }}>
                          {rev.title}
                        </span>
                      )}
                    </div>

                    <p style={{ fontSize: '12px', color: '#475569', lineHeight: '1.4', margin: '0 0 10px 0' }}>
                      "{rev.comment}"
                    </p>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid #F1F5F9' }}>
                      <span style={{ fontSize: '11px', color: 'var(--rev-text-light)' }}>
                        {formatDate(rev.created_at)}
                      </span>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          type="button"
                          className="rev-action-btn view"
                          onClick={() => openDetailModal(rev)}
                        >
                          <Eye size={12} /> View
                        </button>
                        {rev.status !== 'APPROVED' && (
                          <button
                            type="button"
                            className="rev-action-btn approve"
                            onClick={() => handleApprove(rev)}
                          >
                            <CheckCircle2 size={12} />
                          </button>
                        )}
                        {rev.status !== 'REJECTED' && (
                          <button
                            type="button"
                            className="rev-action-btn reject"
                            onClick={() => openRejectModal(rev)}
                          >
                            <XCircle size={12} />
                          </button>
                        )}
                        <button
                          type="button"
                          className="rev-action-btn"
                          style={{ color: 'var(--rev-danger)' }}
                          onClick={() => openConfirmModal('delete', rev)}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Bar */}
            <div className="rev-pagination-bar">
              <div className="rev-pagination-info">
                Showing{' '}
                <strong>
                  {Math.min((page - 1) * limit + 1, totalRecords)}
                </strong>{' '}
                to{' '}
                <strong>
                  {Math.min(page * limit, totalRecords)}
                </strong>{' '}
                of <strong>{totalRecords}</strong> reviews
              </div>

              <div className="rev-pagination-controls">
                <button
                  type="button"
                  className="rev-page-btn"
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
                          className={`rev-page-btn ${page === p ? 'active' : ''}`}
                          onClick={() => setPage(p)}
                        >
                          {p}
                        </button>
                      </React.Fragment>
                    );
                  })}

                <button
                  type="button"
                  className="rev-page-btn"
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

      {/* Review Details Modal */}
      {isDetailModalOpen && selectedReview && (
        <div className="rev-modal-overlay" onClick={() => setIsDetailModalOpen(false)}>
          <div className="rev-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="rev-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    background: 'var(--rev-primary-light)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--rev-primary)'
                  }}
                >
                  <MessageSquare size={18} />
                </div>
                <div>
                  <h3 className="rev-modal-title">Review Details #{selectedReview.id}</h3>
                  <span style={{ fontSize: '12px', color: 'var(--rev-text-light)' }}>
                    Submitted on {formatDate(selectedReview.created_at)}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="rev-modal-close-btn"
                onClick={() => setIsDetailModalOpen(false)}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className="rev-modal-body">
              {/* Status and Rating banner */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '10px',
                  padding: '14px 18px',
                  marginBottom: '20px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {renderStars(selectedReview.rating)}
                  <span style={{ fontSize: '15px', fontWeight: '700', color: 'var(--rev-text-main)' }}>
                    {selectedReview.rating}.0 Stars
                  </span>
                </div>
                <div>{renderStatusBadge(selectedReview.status)}</div>
              </div>

              {/* Product Info Card */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  border: '1px solid #E2E8F0',
                  borderRadius: '10px',
                  padding: '14px',
                  marginBottom: '20px'
                }}
              >
                <img
                  src={resolveImageUrl(selectedReview.product_image, placeholderImg)}
                  alt={selectedReview.product_name}
                  style={{ width: '56px', height: '56px', borderRadius: '8px', objectFit: 'cover' }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--rev-text-main)', marginBottom: '2px' }}>
                    {selectedReview.product_name || `Product #${selectedReview.product_id}`}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--rev-text-muted)' }}>
                    SKU: <strong>{selectedReview.product_sku || 'N/A'}</strong>
                    {selectedReview.product_price && ` • ₹${selectedReview.product_price}`}
                  </div>
                  {selectedReview.order_number && (
                    <div style={{ fontSize: '12px', color: 'var(--rev-primary)', marginTop: '2px' }}>
                      Associated Order: <strong>{selectedReview.order_number}</strong>
                    </div>
                  )}
                </div>
              </div>

              {/* Customer Info Card */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px',
                  background: '#F8FAFC',
                  borderRadius: '10px',
                  padding: '14px',
                  marginBottom: '20px'
                }}
              >
                <div>
                  <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--rev-text-light)', fontWeight: '700' }}>
                    Customer
                  </span>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--rev-text-main)' }}>
                    {selectedReview.customer_name}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--rev-text-muted)' }}>
                    {selectedReview.customer_email || 'No email on record'}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--rev-text-light)', fontWeight: '700' }}>
                    Purchase Verification
                  </span>
                  <div>
                    {selectedReview.verified_purchase ? (
                      <span className="rev-verified-badge" style={{ marginTop: '2px' }}>
                        <ShieldCheck size={12} /> Verified Purchase
                      </span>
                    ) : (
                      <span style={{ fontSize: '12px', color: 'var(--rev-text-muted)' }}>
                        Unverified Customer
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Full Review Content */}
              <div style={{ marginBottom: '20px' }}>
                <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--rev-text-main)', display: 'block', marginBottom: '6px' }}>
                  Review Feedback
                </span>
                {selectedReview.title && (
                  <h4 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--rev-text-main)', margin: '0 0 8px 0' }}>
                    {selectedReview.title}
                  </h4>
                )}
                <div
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    padding: '14px',
                    fontSize: '14px',
                    lineHeight: '1.6',
                    color: '#334155',
                    whiteSpace: 'pre-wrap'
                  }}
                >
                  {selectedReview.comment}
                </div>
              </div>

              {/* Moderation History if available */}
              {(selectedReview.moderation_reason || selectedReview.moderated_by_name || selectedReview.moderated_at) && (
                <div
                  style={{
                    background: selectedReview.status === 'REJECTED' ? 'var(--rev-danger-bg)' : '#F1F5F9',
                    border: `1px solid ${selectedReview.status === 'REJECTED' ? 'var(--rev-danger-border)' : '#E2E8F0'}`,
                    borderRadius: '8px',
                    padding: '12px',
                    fontSize: '12px',
                    color: selectedReview.status === 'REJECTED' ? 'var(--rev-danger)' : 'var(--rev-text-main)'
                  }}
                >
                  <div style={{ fontWeight: '700', marginBottom: '4px' }}>
                    Moderation Audit Info:
                  </div>
                  {selectedReview.moderation_reason && (
                    <div>Reason: <strong>{selectedReview.moderation_reason}</strong></div>
                  )}
                  {selectedReview.moderated_by_name && (
                    <div>Moderator: <strong>{selectedReview.moderated_by_name}</strong></div>
                  )}
                  {selectedReview.moderated_at && (
                    <div>Moderated at: <strong>{formatDate(selectedReview.moderated_at)}</strong></div>
                  )}
                </div>
              )}
            </div>

            <div className="rev-modal-footer">
              <button
                type="button"
                className="rev-btn rev-btn-secondary"
                onClick={() => setIsDetailModalOpen(false)}
              >
                Close
              </button>

              {selectedReview.status !== 'APPROVED' && (
                <button
                  type="button"
                  className="rev-btn rev-btn-success"
                  onClick={() => handleApprove(selectedReview)}
                >
                  <CheckCircle2 size={16} /> Approve Review
                </button>
              )}

              {selectedReview.status !== 'REJECTED' && (
                <button
                  type="button"
                  className="rev-btn rev-btn-danger"
                  onClick={() => openRejectModal(selectedReview)}
                >
                  <XCircle size={16} /> Reject Review
                </button>
              )}

              {selectedReview.status === 'APPROVED' && (
                <button
                  type="button"
                  className="rev-btn rev-btn-secondary"
                  onClick={() => openConfirmModal('hide', selectedReview)}
                >
                  <EyeOff size={16} /> Hide
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal.isOpen && (
        <div className="rev-modal-overlay" onClick={() => setRejectModal({ ...rejectModal, isOpen: false })}>
          <div className="rev-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="rev-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    background: 'var(--rev-danger-bg)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--rev-danger)'
                  }}
                >
                  <XCircle size={20} />
                </div>
                <h3 className="rev-modal-title">Reject Review #{rejectModal.review?.id}</h3>
              </div>
              <button
                type="button"
                className="rev-modal-close-btn"
                onClick={() => setRejectModal({ ...rejectModal, isOpen: false })}
                disabled={rejectModal.loading}
              >
                <X size={18} />
              </button>
            </div>

            <div className="rev-modal-body">
              <p style={{ fontSize: '13px', color: 'var(--rev-text-muted)', marginBottom: '14px' }}>
                Rejecting this review will prevent it from appearing on the public customer product page. Please record a moderation reason for audit compliance.
              </p>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '13px', fontWeight: '600', display: 'block', marginBottom: '6px' }}>
                  Rejection Reason
                </label>
                <select
                  className="rev-select"
                  style={{ width: '100%' }}
                  value={rejectModal.reason}
                  onChange={(e) => setRejectModal({ ...rejectModal, reason: e.target.value })}
                >
                  <option value="Spam / Promotional link">Spam / Promotional link</option>
                  <option value="Offensive / Inappropriate language">Offensive / Inappropriate language</option>
                  <option value="Irrelevant / Off-topic">Irrelevant / Off-topic</option>
                  <option value="Duplicate feedback">Duplicate feedback</option>
                  <option value="Fake / Competitor review">Fake / Competitor review</option>
                  <option value="Pricing / Shipping complaint (Not product related)">Pricing / Shipping complaint (Not product related)</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: '600', display: 'block', marginBottom: '6px' }}>
                  Additional Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  className="rev-search-input"
                  style={{ height: 'auto', padding: '8px 12px' }}
                  placeholder="Optional notes for internal admin record..."
                  value={rejectModal.customNotes}
                  onChange={(e) => setRejectModal({ ...rejectModal, customNotes: e.target.value })}
                />
              </div>
            </div>

            <div className="rev-modal-footer">
              <button
                type="button"
                className="rev-btn rev-btn-secondary"
                onClick={() => setRejectModal({ ...rejectModal, isOpen: false })}
                disabled={rejectModal.loading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rev-btn rev-btn-danger"
                onClick={handleConfirmReject}
                disabled={rejectModal.loading}
              >
                {rejectModal.loading ? 'Rejecting...' : 'Reject Review'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal (Hide, Restore, Delete) */}
      {confirmModal.isOpen && (
        <div className="rev-modal-overlay" onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}>
          <div className="rev-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="rev-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    background:
                      confirmModal.type === 'delete'
                        ? 'var(--rev-danger-bg)'
                        : confirmModal.type === 'restore'
                        ? 'var(--rev-success-bg)'
                        : '#F1F5F9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color:
                      confirmModal.type === 'delete'
                        ? 'var(--rev-danger)'
                        : confirmModal.type === 'restore'
                        ? 'var(--rev-success)'
                        : 'var(--rev-text-main)'
                  }}
                >
                  {confirmModal.type === 'delete' ? (
                    <Trash2 size={18} />
                  ) : confirmModal.type === 'restore' ? (
                    <RotateCcw size={18} />
                  ) : (
                    <EyeOff size={18} />
                  )}
                </div>
                <h3 className="rev-modal-title">
                  {confirmModal.type === 'delete' && 'Delete Review?'}
                  {confirmModal.type === 'hide' && 'Hide Review?'}
                  {confirmModal.type === 'restore' && 'Restore Review?'}
                </h3>
              </div>
              <button
                type="button"
                className="rev-modal-close-btn"
                onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                disabled={confirmModal.loading}
              >
                <X size={18} />
              </button>
            </div>

            <div className="rev-modal-body">
              <p style={{ fontSize: '14px', color: 'var(--rev-text-main)', marginBottom: '8px' }}>
                {confirmModal.type === 'delete' &&
                  'Are you sure you want to delete this review? This action cannot be easily undone.'}
                {confirmModal.type === 'hide' &&
                  'Hide this review from the public customer store? The review will remain archived for admin records.'}
                {confirmModal.type === 'restore' &&
                  'Restore this review to Approved status? It will become visible on the product detail page.'}
              </p>
              <div
                style={{
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  fontSize: '12px',
                  color: 'var(--rev-text-muted)'
                }}
              >
                "{confirmModal.review?.comment?.substring(0, 100)}..."
              </div>
            </div>

            <div className="rev-modal-footer">
              <button
                type="button"
                className="rev-btn rev-btn-secondary"
                onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                disabled={confirmModal.loading}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`rev-btn ${confirmModal.type === 'delete' ? 'rev-btn-danger' : 'rev-btn-primary'}`}
                onClick={handleConfirmAction}
                disabled={confirmModal.loading}
              >
                {confirmModal.loading ? (
                  <>
                    <RefreshCw size={14} className="rev-spin" />
                    Processing...
                  </>
                ) : confirmModal.type === 'delete' ? (
                  'Delete Review'
                ) : confirmModal.type === 'hide' ? (
                  'Hide Review'
                ) : (
                  'Restore Review'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
