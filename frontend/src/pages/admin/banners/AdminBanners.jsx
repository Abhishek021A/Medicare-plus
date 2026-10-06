import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Layers,
  Plus,
  Search,
  X,
  RefreshCw,
  ExternalLink,
  Eye,
  Edit2,
  Copy,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Download,
  Sparkles,
  Image as ImageIcon
} from 'lucide-react';
import { adminBannerService } from '../../../services/adminApi';
import { resolveImageUrl } from '../../../utils/imageUrl';
import BannerPreviewModal from './BannerPreviewModal';
import AdminBannerModal from './AdminBannerModal';
import './AdminBanners.css';

export default function AdminBanners() {
  // Banners & Summary State
  const [banners, setBanners] = useState([]);
  const [summary, setSummary] = useState({
    total: 0,
    active: 0,
    scheduled: 0,
    expired: 0,
    draft: 0
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [positionFilter, setPositionFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('all');
  const [sortBy, setSortBy] = useState('sort_order');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Modals state
  const [previewBanner, setPreviewBanner] = useState(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  const [editingBanner, setEditingBanner] = useState(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);

  // Confirmation modal
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    type: null, // 'disable' | 'enable' | 'delete' | 'duplicate'
    banner: null,
    loading: false
  });

  // Toast
  const [toastMessage, setToastMessage] = useState(null);
  const toastTimeoutRef = useRef(null);

  const showToast = (text, type = 'success') => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage({ text, type });
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

  // Fetch Banners
  const fetchBanners = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const params = {
        search: debouncedSearch,
        status: statusFilter,
        position: positionFilter,
        date_filter: dateFilter,
        sort: sortBy,
        page,
        limit
      };

      const res = await adminBannerService.getBanners(params);
      if (res && res.success) {
        setBanners(res.data?.banners || []);
        if (res.data?.pagination) {
          setPage(res.data.pagination.page);
          setTotalPages(res.data.pagination.totalPages || 1);
          setTotalRecords(res.data.pagination.total || 0);
        }
        if (res.data?.summary) {
          setSummary(res.data.summary);
        }
      } else {
        setError(res?.message || 'Failed to load banners.');
      }
    } catch (err) {
      console.error('Error fetching banners:', err);
      setError(err.response?.data?.message || 'Unable to load banners. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [debouncedSearch, statusFilter, positionFilter, dateFilter, sortBy, page, limit]);

  useEffect(() => {
    fetchBanners();
  }, [fetchBanners]);

  // Actions
  const handleOpenCreate = () => {
    setEditingBanner(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (banner) => {
    setEditingBanner(banner);
    setIsFormModalOpen(true);
  };

  const handleOpenPreview = (banner) => {
    setPreviewBanner(banner);
    setIsPreviewModalOpen(true);
  };

  const handleToggleStatusClick = (banner) => {
    const isCurrentlyActive = banner.status === 'ACTIVE' && banner.computed_status !== 'DISABLED';
    if (isCurrentlyActive) {
      setConfirmModal({
        isOpen: true,
        type: 'disable',
        banner,
        loading: false
      });
    } else {
      if (banner.computed_status === 'EXPIRED' || (banner.end_date && new Date(banner.end_date) < new Date())) {
        showToast('This banner has expired. Update the validity dates before enabling it.', 'error');
        return;
      }
      setConfirmModal({
        isOpen: true,
        type: 'enable',
        banner,
        loading: false
      });
    }
  };

  const handleDuplicateClick = (banner) => {
    setConfirmModal({
      isOpen: true,
      type: 'duplicate',
      banner,
      loading: false
    });
  };

  const handleDeleteClick = (banner) => {
    setConfirmModal({
      isOpen: true,
      type: 'delete',
      banner,
      loading: false
    });
  };

  const executeConfirmAction = async () => {
    const { type, banner } = confirmModal;
    if (!banner) return;

    setConfirmModal(prev => ({ ...prev, loading: true }));

    try {
      if (type === 'disable') {
        const res = await adminBannerService.toggleStatus(banner.id, 'INACTIVE');
        if (res.success) {
          showToast(`Banner "${banner.title}" disabled. It will no longer show on the customer website.`, 'success');
          fetchBanners();
        } else {
          showToast(res.message || 'Failed to disable banner.', 'error');
        }
      } else if (type === 'enable') {
        const res = await adminBannerService.toggleStatus(banner.id, 'ACTIVE');
        if (res.success) {
          showToast(`Banner "${banner.title}" enabled and live on website.`, 'success');
          fetchBanners();
        } else {
          showToast(res.message || 'Failed to enable banner.', 'error');
        }
      } else if (type === 'duplicate') {
        const res = await adminBannerService.duplicateBanner(banner.id);
        if (res.success) {
          showToast(`Banner duplicated as draft.`, 'success');
          fetchBanners();
        } else {
          showToast(res.message || 'Failed to duplicate banner.', 'error');
        }
      } else if (type === 'delete') {
        const res = await adminBannerService.deleteBanner(banner.id);
        if (res.success) {
          showToast(`Banner "${banner.title}" deleted successfully.`, 'success');
          fetchBanners();
        } else {
          showToast(res.message || 'Failed to delete banner.', 'error');
        }
      }
      setConfirmModal({ isOpen: false, type: null, banner: null, loading: false });
    } catch (err) {
      const msg = err.response?.data?.message || 'Operation failed. Please try again.';
      showToast(msg, 'error');
      setConfirmModal(prev => ({ ...prev, loading: false }));
    }
  };

  // Quick Order Change (Up / Down)
  const handleMoveOrder = async (banner, direction) => {
    const currentIndex = banners.findIndex(b => b.id === banner.id);
    if (currentIndex === -1) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= banners.length) return;

    const targetBanner = banners[targetIndex];

    const currentOrder = banner.sort_order || currentIndex + 1;
    const targetOrder = targetBanner.sort_order || targetIndex + 1;

    try {
      const items = [
        { id: banner.id, sort_order: targetOrder },
        { id: targetBanner.id, sort_order: currentOrder }
      ];
      const res = await adminBannerService.reorderBanners(items);
      if (res.success) {
        showToast('Banner order updated.', 'success');
        fetchBanners();
      }
    } catch (err) {
      showToast('Failed to update order.', 'error');
    }
  };

  // Export CSV
  const handleExport = async () => {
    try {
      showToast('Preparing export...', 'info');
      const params = {
        search: debouncedSearch,
        status: statusFilter,
        position: positionFilter
      };
      const res = await adminBannerService.exportBanners(params);
      if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
        const data = res.data;
        const headers = Object.keys(data[0]);
        const csvRows = [headers.join(',')];

        for (const row of data) {
          const values = headers.map(header => {
            const escaped = ('' + (row[header] ?? '')).replace(/"/g, '""');
            return `"${escaped}"`;
          });
          csvRows.push(values.join(','));
        }

        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `banners-export-${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast(`Exported ${data.length} banner records.`, 'success');
      } else {
        showToast('No banners found to export for current filters.', 'error');
      }
    } catch (err) {
      showToast('Failed to export banners.', 'error');
    }
  };

  // Helper date & position badges
  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const renderPositionBadge = (pos) => {
    switch (pos) {
      case 'HOMEPAGE_HERO':
        return <span className="bnr-position-badge bnr-pos-hero">Homepage Hero</span>;
      case 'PROMOTIONAL_BANNER':
        return <span className="bnr-position-badge bnr-pos-promo">Promotional Banner</span>;
      case 'SPECIAL_DEALS':
        return <span className="bnr-position-badge bnr-pos-deals">Special Deals</span>;
      case 'NEW_LAUNCHES':
        return <span className="bnr-position-badge bnr-pos-new">New Launches</span>;
      case 'CATEGORY_BANNER':
        return <span className="bnr-position-badge bnr-pos-category">Category Banner</span>;
      default:
        return <span className="bnr-position-badge bnr-pos-hero">{pos || 'Homepage Hero'}</span>;
    }
  };

  const renderStatusBadge = (banner) => {
    const status = banner.computed_status || banner.status || 'ACTIVE';
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="bnr-status-badge bnr-status-active">
            <span className="bnr-status-dot"></span>
            Active
          </span>
        );
      case 'SCHEDULED':
        return (
          <span className="bnr-status-badge bnr-status-scheduled">
            <span className="bnr-status-dot"></span>
            Scheduled
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="bnr-status-badge bnr-status-expired">
            <span className="bnr-status-dot"></span>
            Expired
          </span>
        );
      case 'DRAFT':
        return (
          <span className="bnr-status-badge bnr-status-draft">
            <span className="bnr-status-dot"></span>
            Draft
          </span>
        );
      case 'DISABLED':
      case 'INACTIVE':
      default:
        return (
          <span className="bnr-status-badge bnr-status-disabled">
            <span className="bnr-status-dot"></span>
            Disabled
          </span>
        );
    }
  };

  return (
    <div className="bnr-page-wrapper">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 9999,
            backgroundColor: toastMessage.type === 'error' ? '#EF4444' : toastMessage.type === 'info' ? '#0284C7' : '#087F73',
            color: '#FFFFFF',
            padding: '12px 20px',
            borderRadius: '10px',
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '14px',
            fontWeight: 500,
            animation: 'bnrFadeIn 0.25s ease'
          }}
        >
          {toastMessage.type === 'error' ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="bnr-header">
        <div className="bnr-title-wrap">
          <div className="bnr-breadcrumb">
            <Link to="/admin">Admin</Link>
            <span>/</span>
            <span className="bnr-breadcrumb-current">Banners</span>
          </div>
          <h1>Banners</h1>
          <p className="bnr-subtitle">
            Manage homepage banners, promotional campaigns, images, links, scheduling and visibility.
          </p>
        </div>

        <div className="bnr-header-actions">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="bnr-btn bnr-btn-secondary"
            aria-label="Preview website in new tab"
          >
            <ExternalLink size={16} />
            <span>Preview Website</span>
          </a>

          <button
            className="bnr-btn bnr-btn-secondary"
            onClick={handleExport}
            aria-label="Export banners to CSV"
          >
            <Download size={16} />
            <span>Export</span>
          </button>

          <button
            className="bnr-btn bnr-btn-secondary"
            onClick={() => fetchBanners(true)}
            disabled={refreshing || loading}
            aria-label="Refresh banners list"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>

          <button
            className="bnr-btn bnr-btn-primary"
            onClick={handleOpenCreate}
            aria-label="Create new banner"
          >
            <Plus size={16} />
            <span>+ Create Banner</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="bnr-summary-grid">
        <div className="bnr-summary-card">
          <div className="bnr-summary-icon total">
            <Layers size={24} />
          </div>
          <div className="bnr-summary-info">
            <span className="bnr-summary-label">Total Banners</span>
            <span className="bnr-summary-value">
              {loading ? <span className="bnr-skeleton" style={{ display: 'inline-block', width: '40px', height: '24px' }}></span> : summary.total}
            </span>
            <span className="bnr-summary-subtext">All promotional banners</span>
          </div>
        </div>

        <div className="bnr-summary-card">
          <div className="bnr-summary-icon active">
            <CheckCircle2 size={24} />
          </div>
          <div className="bnr-summary-info">
            <span className="bnr-summary-label">Active</span>
            <span className="bnr-summary-value" style={{ color: 'var(--bnr-primary)' }}>
              {loading ? <span className="bnr-skeleton" style={{ display: 'inline-block', width: '40px', height: '24px' }}></span> : summary.active}
            </span>
            <span className="bnr-summary-subtext">Live on customer site</span>
          </div>
        </div>

        <div className="bnr-summary-card">
          <div className="bnr-summary-icon scheduled">
            <Calendar size={24} />
          </div>
          <div className="bnr-summary-info">
            <span className="bnr-summary-label">Scheduled</span>
            <span className="bnr-summary-value" style={{ color: '#2563EB' }}>
              {loading ? <span className="bnr-skeleton" style={{ display: 'inline-block', width: '40px', height: '24px' }}></span> : summary.scheduled}
            </span>
            <span className="bnr-summary-subtext">Upcoming campaigns</span>
          </div>
        </div>

        <div className="bnr-summary-card">
          <div className="bnr-summary-icon expired">
            <Clock size={24} />
          </div>
          <div className="bnr-summary-info">
            <span className="bnr-summary-label">Expired</span>
            <span className="bnr-summary-value" style={{ color: '#64748B' }}>
              {loading ? <span className="bnr-skeleton" style={{ display: 'inline-block', width: '40px', height: '24px' }}></span> : summary.expired}
            </span>
            <span className="bnr-summary-subtext">Past validity dates</span>
          </div>
        </div>

        <div className="bnr-summary-card">
          <div className="bnr-summary-icon draft">
            <Sparkles size={24} />
          </div>
          <div className="bnr-summary-info">
            <span className="bnr-summary-label">Draft</span>
            <span className="bnr-summary-value" style={{ color: '#D97706' }}>
              {loading ? <span className="bnr-skeleton" style={{ display: 'inline-block', width: '40px', height: '24px' }}></span> : summary.draft}
            </span>
            <span className="bnr-summary-subtext">Unpublished drafts</span>
          </div>
        </div>
      </div>

      {/* Filter Card */}
      <div className="bnr-filter-card">
        <div className="bnr-search-bar-row">
          <div className="bnr-search-input-wrapper">
            <Search size={18} className="bnr-search-icon" />
            <input
              type="text"
              className="bnr-search-input"
              placeholder="Search title, subtitle, or placement..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search banners"
            />
            {search && (
              <button
                className="bnr-clear-search-btn"
                onClick={() => setSearch('')}
                aria-label="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <select
            className="bnr-select"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by status"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="EXPIRED">Expired</option>
            <option value="DISABLED">Disabled</option>
            <option value="DRAFT">Draft</option>
          </select>

          <select
            className="bnr-select"
            value={positionFilter}
            onChange={(e) => {
              setPositionFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by position"
          >
            <option value="ALL">All Positions</option>
            <option value="HOMEPAGE_HERO">Homepage Hero</option>
            <option value="PROMOTIONAL_BANNER">Promotional Banner</option>
            <option value="NEW_LAUNCHES">New Launches</option>
            <option value="SPECIAL_DEALS">Special Deals</option>
            <option value="CATEGORY_BANNER">Category Banner</option>
          </select>

          <select
            className="bnr-select"
            value={dateFilter}
            onChange={(e) => {
              setDateFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by date"
          >
            <option value="all">All Dates</option>
            <option value="today">Today</option>
            <option value="this_week">This Week</option>
            <option value="this_month">This Month</option>
          </select>

          <select
            className="bnr-select"
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value);
              setPage(1);
            }}
            aria-label="Sort banners"
          >
            <option value="sort_order">Sort Order Priority</option>
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="title_asc">Title A–Z</option>
            <option value="title_desc">Title Z–A</option>
            <option value="updated">Recently Updated</option>
            <option value="ending_soon">Ending Soon</option>
          </select>

          {(search || statusFilter !== 'ALL' || positionFilter !== 'ALL' || dateFilter !== 'all' || sortBy !== 'sort_order') && (
            <button
              className="bnr-btn bnr-btn-secondary bnr-btn-sm"
              onClick={() => {
                setSearch('');
                setStatusFilter('ALL');
                setPositionFilter('ALL');
                setDateFilter('all');
                setSortBy('sort_order');
                setPage(1);
              }}
              style={{ height: '42px' }}
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Table Container */}
      <div className="bnr-table-container">
        {loading ? (
          <div style={{ padding: '24px' }}>
            {[1, 2, 3, 4].map(i => (
              <div
                key={i}
                className="bnr-skeleton"
                style={{ height: '70px', marginBottom: '14px', borderRadius: '10px' }}
              />
            ))}
          </div>
        ) : error ? (
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <AlertCircle size={44} style={{ color: 'var(--bnr-danger)', margin: '0 auto 16px' }} />
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--bnr-text-main)', margin: '0 0 8px' }}>
              Unable to load banners
            </h3>
            <p style={{ color: 'var(--bnr-text-muted)', maxWidth: '420px', margin: '0 auto 20px', fontSize: '14px' }}>
              {error}
            </p>
            <button className="bnr-btn bnr-btn-primary" onClick={() => fetchBanners()}>
              Try Again
            </button>
          </div>
        ) : banners.length === 0 ? (
          <div style={{ padding: '70px 20px', textAlign: 'center' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'var(--bnr-primary-light)',
                color: 'var(--bnr-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 18px',
                fontSize: '28px'
              }}
            >
              🖼️
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--bnr-text-main)', margin: '0 0 8px' }}>
              No banners found
            </h3>
            <p style={{ color: 'var(--bnr-text-muted)', maxWidth: '440px', margin: '0 auto 22px', fontSize: '14px' }}>
              {search || statusFilter !== 'ALL' || positionFilter !== 'ALL'
                ? 'No banners match your filter criteria. Try adjusting or clearing your filters.'
                : 'Create your first promotional banner to display it on the Medicare PLUS customer website.'}
            </p>
            <button className="bnr-btn bnr-btn-primary" onClick={handleOpenCreate}>
              <Plus size={16} />
              <span>+ Create Banner</span>
            </button>
          </div>
        ) : (
          <div className="bnr-table-responsive">
            <table className="bnr-table">
              <thead>
                <tr>
                  <th style={{ width: '300px' }}>BANNER</th>
                  <th>POSITION</th>
                  <th>BADGE / CTA</th>
                  <th>VALIDITY</th>
                  <th>STATUS</th>
                  <th>ORDER</th>
                  <th>UPDATED</th>
                  <th style={{ textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {banners.map((banner, idx) => {
                  const imgUrl = resolveImageUrl(banner.image);
                  return (
                    <tr key={banner.id}>
                      {/* Banner Image & Title */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <div className="bnr-thumbnail-container" onClick={() => handleOpenPreview(banner)} style={{ cursor: 'pointer' }}>
                            {banner.image ? (
                              <img
                                src={imgUrl}
                                alt={banner.title}
                                className="bnr-thumbnail-img"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            <div className="bnr-no-image" style={{ display: banner.image ? 'none' : 'flex' }}>
                              <ImageIcon size={20} />
                              <span>No image</span>
                            </div>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0 }}>
                            <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--bnr-text-main)' }}>
                              {banner.title}
                            </span>
                            {banner.subtitle && (
                              <span style={{ fontSize: '12px', color: 'var(--bnr-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '220px' }}>
                                {banner.subtitle}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Position */}
                      <td>
                        {renderPositionBadge(banner.position)}
                      </td>

                      {/* Badge / CTA */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {banner.badge && (
                            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--bnr-primary)', background: 'var(--bnr-primary-light)', padding: '2px 8px', borderRadius: '4px', width: 'fit-content' }}>
                              {banner.badge}
                            </span>
                          )}
                          {banner.button_text && (
                            <span style={{ fontSize: '12px', color: 'var(--bnr-text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <strong>{banner.button_text}</strong> → {banner.button_url || '/shop'}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Validity */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', fontSize: '12px', gap: '2px' }}>
                          {banner.start_date || banner.end_date ? (
                            <>
                              <span>{formatDate(banner.start_date) || 'Immediate'}</span>
                              <span style={{ color: 'var(--bnr-text-light)', fontSize: '11px' }}>to</span>
                              <span style={{ fontWeight: 600 }}>{formatDate(banner.end_date) || 'No Expiry'}</span>
                            </>
                          ) : (
                            <span style={{ color: 'var(--bnr-text-muted)' }}>Always Active</span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td>
                        {renderStatusBadge(banner)}
                      </td>

                      {/* Sort Order */}
                      <td>
                        <div className="bnr-order-ctrl">
                          <span style={{ fontWeight: 700, minWidth: '18px', textAlign: 'center' }}>
                            {banner.sort_order || 1}
                          </span>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <button
                              type="button"
                              className="bnr-order-btn"
                              onClick={() => handleMoveOrder(banner, 'up')}
                              disabled={idx === 0 && page === 1}
                              title="Move Up"
                              aria-label="Move Up"
                            >
                              <ChevronUp size={12} />
                            </button>
                            <button
                              type="button"
                              className="bnr-order-btn"
                              onClick={() => handleMoveOrder(banner, 'down')}
                              disabled={idx === banners.length - 1 && page === totalPages}
                              title="Move Down"
                              aria-label="Move Down"
                            >
                              <ChevronDown size={12} />
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Updated */}
                      <td>
                        <span style={{ fontSize: '12px', color: 'var(--bnr-text-muted)' }}>
                          {formatDate(banner.updated_at || banner.created_at)}
                        </span>
                      </td>

                      {/* Actions */}
                      <td>
                        <div className="bnr-actions-cell">
                          {/* Preview */}
                          <button
                            type="button"
                            className="bnr-action-btn preview"
                            onClick={() => handleOpenPreview(banner)}
                            title="Preview Banner"
                            aria-label={`Preview ${banner.title}`}
                          >
                            <Eye size={14} />
                            <span>Preview</span>
                          </button>

                          {/* Edit */}
                          <button
                            type="button"
                            className="bnr-action-btn edit"
                            onClick={() => handleOpenEdit(banner)}
                            title="Edit Banner"
                            aria-label={`Edit ${banner.title}`}
                          >
                            <Edit2 size={14} />
                            <span>Edit</span>
                          </button>

                          {/* Duplicate */}
                          <button
                            type="button"
                            className="bnr-action-btn"
                            onClick={() => handleDuplicateClick(banner)}
                            title="Duplicate Banner"
                            aria-label={`Duplicate ${banner.title}`}
                          >
                            <Copy size={14} />
                          </button>

                          {/* Disable / Enable */}
                          {banner.status === 'INACTIVE' || banner.computed_status === 'DISABLED' ? (
                            <button
                              type="button"
                              className="bnr-action-btn enable"
                              onClick={() => handleToggleStatusClick(banner)}
                              title="Enable Banner"
                              aria-label={`Enable ${banner.title}`}
                            >
                              <ToggleLeft size={14} />
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="bnr-action-btn disable"
                              onClick={() => handleToggleStatusClick(banner)}
                              title="Disable Banner"
                              aria-label={`Disable ${banner.title}`}
                            >
                              <ToggleRight size={14} />
                            </button>
                          )}

                          {/* Delete */}
                          <button
                            type="button"
                            className="bnr-action-btn"
                            style={{ color: 'var(--bnr-text-light)' }}
                            onClick={() => handleDeleteClick(banner)}
                            title="Delete Banner"
                            aria-label={`Delete ${banner.title}`}
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
        )}

        {/* Pagination Bar */}
        {!loading && !error && banners.length > 0 && (
          <div className="bnr-pagination-bar">
            <div className="bnr-pagination-info">
              Showing <strong>{Math.min((page - 1) * limit + 1, totalRecords)}</strong>–
              <strong>{Math.min(page * limit, totalRecords)}</strong> of <strong>{totalRecords}</strong> banners
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--bnr-text-muted)' }}>
                <span>Rows:</span>
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(parseInt(e.target.value));
                    setPage(1);
                  }}
                  className="bnr-select"
                  style={{ height: '32px', padding: '0 8px' }}
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>

              <div className="bnr-pagination-controls">
                <button
                  className="bnr-page-btn"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  aria-label="Previous page"
                >
                  <ChevronLeft size={16} />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                  .map((p, idx, arr) => {
                    const prev = arr[idx - 1];
                    return (
                      <React.Fragment key={p}>
                        {prev && p - prev > 1 && <span style={{ padding: '0 4px', color: 'var(--bnr-text-light)' }}>…</span>}
                        <button
                          className={`bnr-page-btn ${p === page ? 'active' : ''}`}
                          onClick={() => setPage(p)}
                        >
                          {p}
                        </button>
                      </React.Fragment>
                    );
                  })}

                <button
                  className="bnr-page-btn"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  aria-label="Next page"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      <BannerPreviewModal
        banner={previewBanner}
        isOpen={isPreviewModalOpen}
        onClose={() => {
          setIsPreviewModalOpen(false);
          setPreviewBanner(null);
        }}
      />

      {/* Create / Edit Form Modal */}
      <AdminBannerModal
        banner={editingBanner}
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingBanner(null);
        }}
        onSaved={(msg) => {
          showToast(msg, 'success');
          fetchBanners();
        }}
      />

      {/* Action Confirmation Modal */}
      {confirmModal.isOpen && confirmModal.banner && (
        <div
          className="bnr-modal-overlay"
          onClick={() => !confirmModal.loading && setConfirmModal({ isOpen: false, type: null, banner: null, loading: false })}
          role="dialog"
          aria-modal="true"
        >
          <div className="bnr-modal" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div className="bnr-modal-header">
              <h3 style={{ fontSize: '16px' }}>
                {confirmModal.type === 'disable' && 'Disable Banner?'}
                {confirmModal.type === 'enable' && 'Enable Banner?'}
                {confirmModal.type === 'duplicate' && 'Duplicate Banner?'}
                {confirmModal.type === 'delete' && 'Delete Banner?'}
              </h3>
              <button
                className="bnr-modal-close"
                onClick={() => !confirmModal.loading && setConfirmModal({ isOpen: false, type: null, banner: null, loading: false })}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className="bnr-modal-body">
              <div style={{ textAlign: 'center', padding: '10px 0' }}>
                <strong style={{ fontSize: '16px', color: 'var(--bnr-text-main)', display: 'block', marginBottom: '8px' }}>
                  {confirmModal.banner.title}
                </strong>

                <p style={{ margin: 0, fontSize: '14px', color: 'var(--bnr-text-muted)' }}>
                  {confirmModal.type === 'disable' && (
                    <>This banner will immediately stop displaying on the customer website.</>
                  )}
                  {confirmModal.type === 'enable' && (
                    <>This banner will become active and appear on the customer website according to its position and schedule.</>
                  )}
                  {confirmModal.type === 'duplicate' && (
                    <>A copy of this banner will be created in Draft status. You can edit and publish it anytime.</>
                  )}
                  {confirmModal.type === 'delete' && (
                    <>This banner will be removed from banner management and customer display.</>
                  )}
                </p>
              </div>
            </div>

            <div className="bnr-modal-footer">
              <button
                type="button"
                className="bnr-btn bnr-btn-secondary"
                onClick={() => setConfirmModal({ isOpen: false, type: null, banner: null, loading: false })}
                disabled={confirmModal.loading}
              >
                Cancel
              </button>

              <button
                type="button"
                className={`bnr-btn ${confirmModal.type === 'delete' || confirmModal.type === 'disable' ? 'bnr-btn-danger' : 'bnr-btn-primary'}`}
                onClick={executeConfirmAction}
                disabled={confirmModal.loading}
              >
                {confirmModal.loading ? 'Processing...' : (
                  confirmModal.type === 'disable' ? 'Disable' : confirmModal.type === 'enable' ? 'Enable' : confirmModal.type === 'duplicate' ? 'Duplicate' : 'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
