import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Tag,
  Plus,
  Search,
  X,
  RefreshCw,
  Download,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Users,
  Percent,
  IndianRupee,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit2,
  ToggleLeft,
  ToggleRight,
  Trash2,
  AlertCircle,
  HelpCircle,
  TrendingUp,
  Ban,
  Layers
} from 'lucide-react';
import { adminCouponService } from '../../../services/adminApi';
import CouponUsageModal from './CouponUsageModal';
import './AdminCoupons.css';

export default function AdminCoupons() {
  const navigate = useNavigate();

  // State
  const [coupons, setCoupons] = useState([]);
  const [summary, setSummary] = useState({
    total: 0,
    active: 0,
    expired: 0,
    scheduled: 0,
    redemptions: 0,
    discountGiven: 0
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [discountTypeFilter, setDiscountTypeFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('newest');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Modals state
  const [usageCoupon, setUsageCoupon] = useState(null);
  const [isUsageModalOpen, setIsUsageModalOpen] = useState(false);

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    type: null, // 'disable' | 'enable' | 'archive'
    coupon: null,
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

  // Fetch Coupons & Summary
  const fetchCoupons = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const params = {
        search: debouncedSearch,
        status: statusFilter,
        discount_type: discountTypeFilter,
        sort: sortBy,
        page,
        limit
      };

      const res = await adminCouponService.getCoupons(params);

      if (res && res.success) {
        setCoupons(res.data?.coupons || []);
        if (res.data?.pagination) {
          setPage(res.data.pagination.page);
          setTotalPages(res.data.pagination.totalPages || 1);
          setTotalRecords(res.data.pagination.total || 0);
        }
        if (res.data?.summary) {
          setSummary(res.data.summary);
        }
      } else {
        setError(res?.message || 'Failed to load coupons');
      }
    } catch (err) {
      console.error('Error loading coupons:', err);
      setError(err.response?.data?.message || 'Unable to load coupons. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [debouncedSearch, statusFilter, discountTypeFilter, sortBy, page, limit]);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  // Currency & Date formatting helpers
  const formatCurrency = (amt) => {
    const num = parseFloat(amt) || 0;
    return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  // Actions
  const handleOpenUsage = (coupon) => {
    setUsageCoupon(coupon);
    setIsUsageModalOpen(true);
  };

  const handleToggleStatusClick = (coupon) => {
    const isCurrentlyActive = coupon.status === 'ACTIVE' || coupon.computed_status === 'ACTIVE';

    if (isCurrentlyActive) {
      // Prompt confirm to disable
      setConfirmModal({
        isOpen: true,
        type: 'disable',
        coupon,
        loading: false
      });
    } else {
      // Enabling
      // Check if expired
      if (coupon.computed_status === 'EXPIRED' || (coupon.expiry_date && new Date(coupon.expiry_date) < new Date())) {
        showToast('This coupon has expired. Update the validity dates before enabling it.', 'error');
        return;
      }

      setConfirmModal({
        isOpen: true,
        type: 'enable',
        coupon,
        loading: false
      });
    }
  };

  const handleArchiveClick = (coupon) => {
    setConfirmModal({
      isOpen: true,
      type: 'archive',
      coupon,
      loading: false
    });
  };

  const executeConfirmAction = async () => {
    const { type, coupon } = confirmModal;
    if (!coupon) return;

    setConfirmModal(prev => ({ ...prev, loading: true }));

    try {
      if (type === 'disable') {
        const res = await adminCouponService.toggleStatus(coupon.id, 'INACTIVE');
        if (res.success) {
          showToast(`Coupon "${coupon.code}" has been disabled.`, 'success');
          fetchCoupons();
        } else {
          showToast(res.message || 'Failed to disable coupon.', 'error');
        }
      } else if (type === 'enable') {
        const res = await adminCouponService.toggleStatus(coupon.id, 'ACTIVE');
        if (res.success) {
          showToast(`Coupon "${coupon.code}" has been enabled.`, 'success');
          fetchCoupons();
        } else {
          showToast(res.message || 'Failed to enable coupon.', 'error');
        }
      } else if (type === 'archive') {
        const res = await adminCouponService.deleteCoupon(coupon.id);
        if (res.success) {
          showToast(`Coupon "${coupon.code}" archived successfully.`, 'success');
          fetchCoupons();
        } else {
          showToast(res.message || 'Failed to archive coupon.', 'error');
        }
      }
      setConfirmModal({ isOpen: false, type: null, coupon: null, loading: false });
    } catch (err) {
      const msg = err.response?.data?.message || 'Operation failed. Please try again.';
      showToast(msg, 'error');
      setConfirmModal(prev => ({ ...prev, loading: false }));
    }
  };

  // Export CSV
  const handleExport = async () => {
    try {
      showToast('Preparing export...', 'info');
      const params = {
        search: debouncedSearch,
        status: statusFilter
      };
      const res = await adminCouponService.exportCoupons(params);

      if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
        const data = res.data;
        const headers = Object.keys(data[0]);
        const csvRows = [];
        csvRows.push(headers.join(','));

        for (const row of data) {
          const values = headers.map(header => {
            const escaped = ('' + (row[header] ?? '')).replace(/"/g, '""');
            return `"${escaped}"`;
          });
          csvRows.push(values.join(','));
        }

        const csvString = csvRows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `coupons-export-${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast(`Exported ${data.length} coupon records.`, 'success');
      } else {
        showToast('No coupons to export for current filters.', 'error');
      }
    } catch (err) {
      console.error('Export error:', err);
      showToast('Failed to export coupons.', 'error');
    }
  };

  // Status Badge Renderer
  const renderStatusBadge = (coupon) => {
    const status = coupon.computed_status || coupon.status || 'ACTIVE';

    switch (status) {
      case 'ACTIVE':
        return (
          <span className="cpn-status-badge cpn-status-active">
            <span className="cpn-status-dot"></span>
            Active
          </span>
        );
      case 'SCHEDULED':
        return (
          <span className="cpn-status-badge cpn-status-scheduled">
            <span className="cpn-status-dot"></span>
            Scheduled
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="cpn-status-badge cpn-status-expired">
            <span className="cpn-status-dot"></span>
            Expired
          </span>
        );
      case 'DISABLED':
      case 'INACTIVE':
      default:
        return (
          <span className="cpn-status-badge cpn-status-disabled">
            <span className="cpn-status-dot"></span>
            Disabled
          </span>
        );
    }
  };

  return (
    <div className="cpn-page-wrapper">
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
            animation: 'cpnFadeIn 0.25s ease'
          }}
        >
          {toastMessage.type === 'error' ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="cpn-header">
        <div className="cpn-title-wrap">
          <div className="cpn-breadcrumb">
            <Link to="/admin">Admin</Link>
            <span>/</span>
            <span className="cpn-breadcrumb-current">Coupons</span>
          </div>
          <h1>Coupons</h1>
          <p className="cpn-subtitle">
            Create and manage discount codes, usage limits, eligibility, and promotional offers.
          </p>
        </div>

        <div className="cpn-header-actions">
          <button
            className="cpn-btn cpn-btn-secondary"
            onClick={handleExport}
            aria-label="Export coupons to CSV"
          >
            <Download size={16} />
            <span>Export</span>
          </button>

          <button
            className="cpn-btn cpn-btn-secondary"
            onClick={() => fetchCoupons(true)}
            disabled={refreshing || loading}
            aria-label="Refresh coupons list"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>

          <Link
            to="/admin/coupons/create"
            className="cpn-btn cpn-btn-primary"
            aria-label="Create new coupon"
          >
            <Plus size={16} />
            <span>+ Create Coupon</span>
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="cpn-summary-grid">
        <div className="cpn-summary-card">
          <div className="cpn-summary-icon total">
            <Tag size={24} />
          </div>
          <div className="cpn-summary-info">
            <span className="cpn-summary-label">Total Coupons</span>
            <span className="cpn-summary-value">
              {loading ? <span className="cpn-skeleton" style={{ display: 'inline-block', width: '40px', height: '24px' }}></span> : summary.total}
            </span>
            <span className="cpn-summary-subtext">All created codes</span>
          </div>
        </div>

        <div className="cpn-summary-card">
          <div className="cpn-summary-icon active">
            <CheckCircle2 size={24} />
          </div>
          <div className="cpn-summary-info">
            <span className="cpn-summary-label">Active</span>
            <span className="cpn-summary-value" style={{ color: 'var(--cpn-primary)' }}>
              {loading ? <span className="cpn-skeleton" style={{ display: 'inline-block', width: '40px', height: '24px' }}></span> : summary.active}
            </span>
            <span className="cpn-summary-subtext">Currently available</span>
          </div>
        </div>

        <div className="cpn-summary-card">
          <div className="cpn-summary-icon expired">
            <Clock size={24} />
          </div>
          <div className="cpn-summary-info">
            <span className="cpn-summary-label">Expired</span>
            <span className="cpn-summary-value">
              {loading ? <span className="cpn-skeleton" style={{ display: 'inline-block', width: '40px', height: '24px' }}></span> : summary.expired}
            </span>
            <span className="cpn-summary-subtext">Past validity date</span>
          </div>
        </div>

        <div className="cpn-summary-card">
          <div className="cpn-summary-icon scheduled">
            <Calendar size={24} />
          </div>
          <div className="cpn-summary-info">
            <span className="cpn-summary-label">Scheduled</span>
            <span className="cpn-summary-value" style={{ color: '#2563EB' }}>
              {loading ? <span className="cpn-skeleton" style={{ display: 'inline-block', width: '40px', height: '24px' }}></span> : summary.scheduled}
            </span>
            <span className="cpn-summary-subtext">Upcoming campaigns</span>
          </div>
        </div>

        <div className="cpn-summary-card">
          <div className="cpn-summary-icon redemptions">
            <Users size={24} />
          </div>
          <div className="cpn-summary-info">
            <span className="cpn-summary-label">Total Redemptions</span>
            <span className="cpn-summary-value" style={{ color: '#D97706' }}>
              {loading ? <span className="cpn-skeleton" style={{ display: 'inline-block', width: '50px', height: '24px' }}></span> : summary.redemptions}
            </span>
            <span className="cpn-summary-subtext">Times used in orders</span>
          </div>
        </div>

        <div className="cpn-summary-card">
          <div className="cpn-summary-icon discount">
            <IndianRupee size={24} />
          </div>
          <div className="cpn-summary-info">
            <span className="cpn-summary-label">Total Discount Given</span>
            <span className="cpn-summary-value" style={{ color: '#059669', fontSize: '20px' }}>
              {loading ? <span className="cpn-skeleton" style={{ display: 'inline-block', width: '70px', height: '24px' }}></span> : formatCurrency(summary.discountGiven)}
            </span>
            <span className="cpn-summary-subtext">Cumulative savings</span>
          </div>
        </div>
      </div>

      {/* Filter Card */}
      <div className="cpn-filter-card">
        <div className="cpn-search-bar-row">
          <div className="cpn-search-input-wrapper">
            <Search size={18} className="cpn-search-icon" />
            <input
              type="text"
              className="cpn-search-input"
              placeholder="Search coupon code or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search coupons"
            />
            {search && (
              <button
                className="cpn-clear-search-btn"
                onClick={() => setSearch('')}
                aria-label="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <select
            className="cpn-select"
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
          </select>

          <select
            className="cpn-select"
            value={discountTypeFilter}
            onChange={(e) => {
              setDiscountTypeFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by discount type"
          >
            <option value="ALL">All Types</option>
            <option value="PERCENTAGE">Percentage (%)</option>
            <option value="FIXED">Fixed Amount (₹)</option>
          </select>

          <select
            className="cpn-select"
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value);
              setPage(1);
            }}
            aria-label="Sort coupons"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="code_asc">Code A–Z</option>
            <option value="code_desc">Code Z–A</option>
            <option value="discount_high">Highest Discount</option>
            <option value="discount_low">Lowest Discount</option>
            <option value="used_high">Most Used</option>
            <option value="used_low">Least Used</option>
            <option value="ending_soon">Ending Soon</option>
          </select>

          {(search || statusFilter !== 'ALL' || discountTypeFilter !== 'ALL' || sortBy !== 'newest') && (
            <button
              className="cpn-btn cpn-btn-secondary cpn-btn-sm"
              onClick={() => {
                setSearch('');
                setStatusFilter('ALL');
                setDiscountTypeFilter('ALL');
                setSortBy('newest');
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
      <div className="cpn-table-container">
        {loading ? (
          <div style={{ padding: '24px' }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="cpn-skeleton"
                style={{ height: '56px', marginBottom: '12px', borderRadius: '8px' }}
              />
            ))}
          </div>
        ) : error ? (
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <AlertCircle size={44} style={{ color: 'var(--cpn-danger)', margin: '0 auto 16px' }} />
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--cpn-text-main)', margin: '0 0 8px' }}>
              Unable to load coupons
            </h3>
            <p style={{ color: 'var(--cpn-text-muted)', maxWidth: '420px', margin: '0 auto 20px', fontSize: '14px' }}>
              {error}
            </p>
            <button className="cpn-btn cpn-btn-primary" onClick={() => fetchCoupons()}>
              Try Again
            </button>
          </div>
        ) : coupons.length === 0 ? (
          <div style={{ padding: '70px 20px', textAlign: 'center' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'var(--cpn-primary-light)',
                color: 'var(--cpn-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 18px',
                fontSize: '28px'
              }}
            >
              🎟
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--cpn-text-main)', margin: '0 0 8px' }}>
              No coupons found
            </h3>
            <p style={{ color: 'var(--cpn-text-muted)', maxWidth: '440px', margin: '0 auto 22px', fontSize: '14px' }}>
              {search || statusFilter !== 'ALL' || discountTypeFilter !== 'ALL'
                ? 'No coupons match your filter criteria. Try adjusting or clearing your filters.'
                : 'Create your first promotional discount code to start boosting customer sales.'}
            </p>
            <Link to="/admin/coupons/create" className="cpn-btn cpn-btn-primary">
              <Plus size={16} />
              <span>Create Coupon</span>
            </Link>
          </div>
        ) : (
          <div className="cpn-table-responsive">
            <table className="cpn-table">
              <thead>
                <tr>
                  <th>COUPON</th>
                  <th>TYPE</th>
                  <th>VALUE</th>
                  <th>MIN ORDER</th>
                  <th>VALIDITY</th>
                  <th>USAGE</th>
                  <th>STATUS</th>
                  <th style={{ textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((coupon) => {
                  const usedCount = parseInt(coupon.used_count) || 0;
                  const usageLimit = coupon.usage_limit ? parseInt(coupon.usage_limit) : null;
                  const usagePct = usageLimit ? Math.min(100, Math.round((usedCount / usageLimit) * 100)) : 0;
                  const isCurrentlyActive = coupon.computed_status === 'ACTIVE' || (coupon.status === 'ACTIVE' && coupon.computed_status !== 'EXPIRED' && coupon.computed_status !== 'SCHEDULED');

                  return (
                    <tr key={coupon.id}>
                      {/* Coupon */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="cpn-code-badge">{coupon.code}</span>
                            {coupon.first_order_only == 1 && (
                              <span
                                style={{
                                  fontSize: '11px',
                                  padding: '2px 8px',
                                  borderRadius: '999px',
                                  backgroundColor: '#EFF6FF',
                                  color: '#2563EB',
                                  fontWeight: 600,
                                  border: '1px solid #BFDBFE'
                                }}
                                title="Applies to first order only"
                              >
                                1st Order
                              </span>
                            )}
                          </div>
                          {coupon.description && (
                            <span style={{ fontSize: '12px', color: 'var(--cpn-text-muted)', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {coupon.description}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Type */}
                      <td>
                        <span
                          style={{
                            fontSize: '12px',
                            fontWeight: 600,
                            padding: '4px 10px',
                            borderRadius: '6px',
                            backgroundColor: coupon.discount_type === 'PERCENTAGE' ? '#F5F3FF' : '#EFF6FF',
                            color: coupon.discount_type === 'PERCENTAGE' ? '#7C3AED' : '#2563EB',
                            border: `1px solid ${coupon.discount_type === 'PERCENTAGE' ? '#DDD6FE' : '#BFDBFE'}`
                          }}
                        >
                          {coupon.discount_type === 'PERCENTAGE' ? 'Percentage' : 'Fixed Amount'}
                        </span>
                      </td>

                      {/* Value */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--cpn-text-main)' }}>
                            {coupon.discount_type === 'PERCENTAGE'
                              ? `${parseFloat(coupon.discount_value)}% OFF`
                              : formatCurrency(coupon.discount_value)}
                          </span>
                          {coupon.discount_type === 'PERCENTAGE' && coupon.max_discount_amount && parseFloat(coupon.max_discount_amount) > 0 && (
                            <span style={{ fontSize: '11px', color: 'var(--cpn-text-muted)' }}>
                              Max: {formatCurrency(coupon.max_discount_amount)}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Min Order */}
                      <td>
                        <span style={{ fontWeight: 500 }}>
                          {parseFloat(coupon.min_order_amount) > 0
                            ? formatCurrency(coupon.min_order_amount)
                            : <span style={{ color: 'var(--cpn-text-light)' }}>No minimum</span>}
                        </span>
                      </td>

                      {/* Validity */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '12px' }}>
                          {coupon.start_date || coupon.expiry_date ? (
                            <>
                              <span>{formatDate(coupon.start_date) || 'Immediate'}</span>
                              <span style={{ color: 'var(--cpn-text-light)', fontSize: '11px' }}>to</span>
                              <span style={{ fontWeight: 600 }}>{formatDate(coupon.expiry_date) || 'No Expiry'}</span>
                            </>
                          ) : (
                            <span style={{ color: 'var(--cpn-text-muted)' }}>Always Valid</span>
                          )}
                        </div>
                      </td>

                      {/* Usage */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '110px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 600 }}>
                            {usedCount} / {usageLimit ? usageLimit : 'Unlimited'} used
                          </span>
                          {usageLimit ? (
                            <div
                              style={{
                                width: '100%',
                                height: '5px',
                                backgroundColor: '#E2E8F0',
                                borderRadius: '999px',
                                overflow: 'hidden'
                              }}
                            >
                              <div
                                style={{
                                  width: `${usagePct}%`,
                                  height: '100%',
                                  backgroundColor: usagePct >= 100 ? 'var(--cpn-danger)' : usagePct > 80 ? 'var(--cpn-warning)' : 'var(--cpn-primary)',
                                  borderRadius: '999px',
                                  transition: 'width 0.3s'
                                }}
                              />
                            </div>
                          ) : (
                            <span style={{ fontSize: '10px', color: 'var(--cpn-text-light)' }}>No total cap</span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td>
                        {renderStatusBadge(coupon)}
                      </td>

                      {/* Actions */}
                      <td>
                        <div className="cpn-actions-cell">
                          {/* View Usage */}
                          <button
                            type="button"
                            className="cpn-action-btn"
                            onClick={() => handleOpenUsage(coupon)}
                            title="View Redemptions"
                            aria-label={`View redemptions for ${coupon.code}`}
                          >
                            <Eye size={14} />
                            <span>Usage</span>
                          </button>

                          {/* Edit */}
                          <button
                            type="button"
                            className="cpn-action-btn edit"
                            onClick={() => navigate(`/admin/coupons/edit/${coupon.id}`)}
                            title="Edit Coupon"
                            aria-label={`Edit ${coupon.code}`}
                          >
                            <Edit2 size={14} />
                            <span>Edit</span>
                          </button>

                          {/* Disable / Enable */}
                          {coupon.status === 'INACTIVE' || coupon.computed_status === 'DISABLED' ? (
                            <button
                              type="button"
                              className="cpn-action-btn enable"
                              onClick={() => handleToggleStatusClick(coupon)}
                              title="Enable Coupon"
                              aria-label={`Enable ${coupon.code}`}
                            >
                              <ToggleLeft size={14} />
                              <span>Enable</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="cpn-action-btn disable"
                              onClick={() => handleToggleStatusClick(coupon)}
                              title="Disable Coupon"
                              aria-label={`Disable ${coupon.code}`}
                            >
                              <ToggleRight size={14} />
                              <span>Disable</span>
                            </button>
                          )}

                          {/* Delete / Archive */}
                          <button
                            type="button"
                            className="cpn-action-btn"
                            style={{ color: 'var(--cpn-text-light)' }}
                            onClick={() => handleArchiveClick(coupon)}
                            title="Archive Coupon"
                            aria-label={`Archive ${coupon.code}`}
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
        {!loading && !error && coupons.length > 0 && (
          <div className="cpn-pagination-bar">
            <div className="cpn-pagination-info">
              Showing <strong>{Math.min((page - 1) * limit + 1, totalRecords)}</strong>–
              <strong>{Math.min(page * limit, totalRecords)}</strong> of <strong>{totalRecords}</strong> coupons
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--cpn-text-muted)' }}>
                <span>Rows:</span>
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(parseInt(e.target.value));
                    setPage(1);
                  }}
                  className="cpn-select"
                  style={{ height: '32px', padding: '0 8px' }}
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              <div className="cpn-pagination-controls">
                <button
                  className="cpn-page-btn"
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
                        {prev && p - prev > 1 && <span style={{ padding: '0 4px', color: 'var(--cpn-text-light)' }}>…</span>}
                        <button
                          className={`cpn-page-btn ${p === page ? 'active' : ''}`}
                          onClick={() => setPage(p)}
                        >
                          {p}
                        </button>
                      </React.Fragment>
                    );
                  })}

                <button
                  className="cpn-page-btn"
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

      {/* Redemption History Modal */}
      <CouponUsageModal
        coupon={usageCoupon}
        isOpen={isUsageModalOpen}
        onClose={() => {
          setIsUsageModalOpen(false);
          setUsageCoupon(null);
        }}
      />

      {/* Action Confirmation Modal */}
      {confirmModal.isOpen && confirmModal.coupon && (
        <div
          className="cpn-modal-overlay"
          onClick={() => !confirmModal.loading && setConfirmModal({ isOpen: false, type: null, coupon: null, loading: false })}
          role="dialog"
          aria-modal="true"
        >
          <div className="cpn-modal" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div className="cpn-modal-header">
              <h3 style={{ fontSize: '16px' }}>
                {confirmModal.type === 'disable' && 'Disable Coupon?'}
                {confirmModal.type === 'enable' && 'Enable Coupon?'}
                {confirmModal.type === 'archive' && 'Archive Coupon?'}
              </h3>
              <button
                className="cpn-modal-close"
                onClick={() => !confirmModal.loading && setConfirmModal({ isOpen: false, type: null, coupon: null, loading: false })}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className="cpn-modal-body">
              <div style={{ textAlign: 'center', padding: '10px 0' }}>
                <span className="cpn-code-badge" style={{ fontSize: '18px', padding: '8px 16px', marginBottom: '12px' }}>
                  {confirmModal.coupon.code}
                </span>

                <p style={{ margin: '12px 0 0 0', fontSize: '14px', color: 'var(--cpn-text-muted)' }}>
                  {confirmModal.type === 'disable' && (
                    <>Customers will no longer be able to apply this coupon code at checkout.</>
                  )}
                  {confirmModal.type === 'enable' && (
                    <>This coupon will become active immediately and can be applied by customers at checkout.</>
                  )}
                  {confirmModal.type === 'archive' && (
                    <>This coupon will be archived and removed from customer availability. Historical orders using this coupon will remain completely preserved.</>
                  )}
                </p>
              </div>
            </div>

            <div className="cpn-modal-footer">
              <button
                type="button"
                className="cpn-btn cpn-btn-secondary"
                onClick={() => setConfirmModal({ isOpen: false, type: null, coupon: null, loading: false })}
                disabled={confirmModal.loading}
              >
                Cancel
              </button>

              <button
                type="button"
                className={`cpn-btn ${confirmModal.type === 'archive' || confirmModal.type === 'disable' ? 'cpn-btn-danger' : 'cpn-btn-primary'}`}
                onClick={executeConfirmAction}
                disabled={confirmModal.loading}
              >
                {confirmModal.loading ? 'Processing...' : (
                  confirmModal.type === 'disable' ? 'Disable' : confirmModal.type === 'enable' ? 'Enable' : 'Archive'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
