import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  FileText, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  Search, 
  RefreshCw, 
  Download, 
  Eye, 
  Filter, 
  ExternalLink, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Calendar, 
  AlertTriangle,
  MoreVertical
} from 'lucide-react';
import { adminPrescriptionService } from '../../../services/adminApi';
import PrescriptionPreviewModal from './PrescriptionPreviewModal';
import ReviewPrescriptionModal from './ReviewPrescriptionModal';
import './AdminPrescriptions.css';

export default function AdminPrescriptions() {
  // Data state
  const [prescriptions, setPrescriptions] = useState([]);
  const [summary, setSummary] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    needsClarification: 0
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1
  });

  // UI state
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  // Modals state
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewActionType, setReviewActionType] = useState('APPROVE');

  // Search debounce timer
  const searchTimeoutRef = useRef(null);

  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPagination(prev => ({ ...prev, page: 1 }));
    }, 400);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchTerm]);

  // Fetch summary and prescriptions from MySQL backend
  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        search: debouncedSearch,
        status: statusFilter,
        dateFilter: dateFilter,
        startDate: startDate,
        endDate: endDate,
        sortBy: sortBy
      };

      const res = await adminPrescriptionService.getPrescriptions(params);

      if (res && res.success) {
        setPrescriptions(res.data.prescriptions || []);
        if (res.data.pagination) {
          setPagination(prev => ({
            ...prev,
            total: res.data.pagination.total,
            totalPages: res.data.pagination.totalPages || 1
          }));
        }
        if (res.data.summary) {
          setSummary(res.data.summary);
        }
      } else {
        throw new Error(res?.message || 'Failed to fetch prescriptions.');
      }
    } catch (err) {
      console.error('Error fetching prescriptions:', err);
      setError(err.response?.data?.message || err.message || 'Unable to load prescription data from the server.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [pagination.page, pagination.limit, debouncedSearch, statusFilter, dateFilter, startDate, endDate, sortBy]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Toast auto-clear
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // Status Filter Change
  const handleStatusFilterChange = (status) => {
    setStatusFilter(status);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // Reset Filters
  const handleResetFilters = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    setStatusFilter('ALL');
    setDateFilter('ALL');
    setStartDate('');
    setEndDate('');
    setSortBy('newest');
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // Handle Export CSV
  const handleExport = async () => {
    try {
      showToast('Generating prescriptions export CSV...');
      const params = {
        search: debouncedSearch,
        status: statusFilter,
        dateFilter: dateFilter,
        startDate: startDate,
        endDate: endDate
      };

      const csvData = await adminPrescriptionService.exportPrescriptions(params);
      
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `prescriptions_export_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showToast('Export downloaded successfully.');
    } catch (err) {
      console.error('Export failed:', err);
      alert('Unable to export prescriptions at this time.');
    }
  };

  // Handle opening preview modal
  const handleOpenPreview = (rx) => {
    setSelectedPrescription(rx);
    setPreviewModalOpen(true);
  };

  // Handle opening review modal
  const handleOpenReview = (rx, type) => {
    setSelectedPrescription(rx);
    setReviewActionType(type);
    setReviewModalOpen(true);
  };

  // Callback on review success
  const handleReviewSuccess = (updatedRx) => {
    if (!updatedRx) return;
    
    const targetId = updatedRx.id || selectedPrescription?.id;
    const newStatus = (updatedRx.status || '').toUpperCase();
    const oldRx = prescriptions.find(p => p.id === targetId) || selectedPrescription;
    const oldStatus = (oldRx?.status || 'PENDING').toUpperCase();
    const reviewerName = updatedRx.reviewed_by_name || updatedRx.reviewer_name || 'Super Admin';

    const mergedRx = {
      ...oldRx,
      ...updatedRx,
      id: targetId,
      status: newStatus,
      reviewed_by_name: reviewerName,
      reviewed_at: updatedRx.reviewed_at || new Date().toISOString()
    };

    // 1. Immediately update table state directly without browser reload
    setPrescriptions(prev =>
      prev.map(item => item.id === targetId ? { ...item, ...mergedRx } : item)
    );

    // 2. Immediately update summary card counts
    if (oldStatus !== newStatus) {
      setSummary(prev => {
        const nextSummary = { ...prev };
        if (oldStatus === 'PENDING' && nextSummary.pending > 0) nextSummary.pending--;
        if (oldStatus === 'APPROVED' && nextSummary.approved > 0) nextSummary.approved--;
        if (oldStatus === 'REJECTED' && nextSummary.rejected > 0) nextSummary.rejected--;
        if (oldStatus === 'NEEDS_CLARIFICATION' && nextSummary.needsClarification > 0) nextSummary.needsClarification--;

        if (newStatus === 'PENDING') nextSummary.pending = (nextSummary.pending || 0) + 1;
        if (newStatus === 'APPROVED') nextSummary.approved = (nextSummary.approved || 0) + 1;
        if (newStatus === 'REJECTED') nextSummary.rejected = (nextSummary.rejected || 0) + 1;
        if (newStatus === 'NEEDS_CLARIFICATION') nextSummary.needsClarification = (nextSummary.needsClarification || 0) + 1;

        return nextSummary;
      });
    }

    if (previewModalOpen && selectedPrescription?.id === targetId) {
      setSelectedPrescription(mergedRx);
    }

    showToast(`Prescription ${mergedRx.prescription_number || `RX-${targetId}`} marked as ${newStatus}.`);

    // Background sync with database
    fetchData(true);
  };

  // Helper for status badge styling
  const renderStatusBadge = (status) => {
    const s = (status || 'PENDING').toUpperCase();
    let badgeClass = 'rx-status-pending';
    let label = 'Pending Review';

    if (s === 'APPROVED') {
      badgeClass = 'rx-status-approved';
      label = 'Approved';
    } else if (s === 'REJECTED') {
      badgeClass = 'rx-status-rejected';
      label = 'Rejected';
    } else if (s === 'NEEDS_CLARIFICATION') {
      badgeClass = 'rx-status-clarification';
      label = 'Needs Clarification';
    }

    return (
      <span className={`rx-status-badge ${badgeClass}`}>
        <span className="rx-status-dot" />
        {label}
      </span>
    );
  };

  return (
    <div className="rx-page-wrapper">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          zIndex: 9999,
          backgroundColor: '#087F73',
          color: '#FFFFFF',
          padding: '12px 20px',
          borderRadius: '8px',
          boxShadow: '0 8px 24px rgba(8, 127, 115, 0.25)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '14px',
          fontWeight: 600,
          animation: 'rxFadeIn 0.25s ease'
        }}>
          <CheckCircle2 size={18} />
          <span>{toastMessage}</span>
          <button 
            type="button" 
            onClick={() => setToastMessage(null)} 
            style={{ background: 'none', border: 'none', color: '#FFFFFF', cursor: 'pointer', padding: '2px', display: 'flex' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Header and Breadcrumbs */}
      <div className="rx-header">
        <div>
          <div className="rx-breadcrumb">
            <Link to="/admin">Admin</Link>
            <span className="separator">/</span>
            <span className="current">Prescriptions</span>
          </div>
          <h1 className="rx-header-title">Prescriptions</h1>
          <p className="rx-header-subtitle">
            Review and manage customer prescriptions securely.
          </p>
        </div>

        <div className="rx-header-actions">
          <button
            type="button"
            className="rx-btn rx-btn-outline"
            onClick={() => fetchData(true)}
            disabled={refreshing || loading}
            aria-label="Refresh prescriptions data"
          >
            <RefreshCw size={15} className={refreshing ? 'spin-anim' : ''} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            className="rx-btn rx-btn-primary"
            onClick={handleExport}
            disabled={loading || pagination.total === 0}
            aria-label="Export prescriptions as CSV"
          >
            <Download size={15} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* 5 Summary Metric Cards */}
      <div className="rx-summary-grid">
        {/* Total Prescriptions */}
        <div 
          className="rx-card rx-card-total" 
          onClick={() => handleStatusFilterChange('ALL')}
          style={{ cursor: 'pointer' }}
          title="Click to view all prescriptions"
        >
          <div className="rx-card-header">
            <span className="rx-card-title">Total Prescriptions</span>
            <div className="rx-card-icon-wrap icon-rx-total">
              <FileText size={18} />
            </div>
          </div>
          {loading ? (
            <div className="rx-skeleton-line" style={{ width: '40%', height: '28px', marginBottom: '8px' }} />
          ) : (
            <div className="rx-card-value">{summary.total || 0}</div>
          )}
          <div className="rx-card-subtext">All submitted records</div>
        </div>

        {/* Pending Review */}
        <div 
          className="rx-card rx-card-pending" 
          onClick={() => handleStatusFilterChange('PENDING')}
          style={{ cursor: 'pointer', borderColor: statusFilter === 'PENDING' ? '#F59E0B' : undefined }}
          title="Click to filter Pending Review"
        >
          <div className="rx-card-header">
            <span className="rx-card-title">Pending Review</span>
            <div className="rx-card-icon-wrap icon-rx-pending">
              <Clock size={18} />
            </div>
          </div>
          {loading ? (
            <div className="rx-skeleton-line" style={{ width: '35%', height: '28px', marginBottom: '8px' }} />
          ) : (
            <div className="rx-card-value" style={{ color: '#D97706' }}>{summary.pending || 0}</div>
          )}
          <div className="rx-card-subtext">Awaiting verification</div>
        </div>

        {/* Approved */}
        <div 
          className="rx-card rx-card-approved" 
          onClick={() => handleStatusFilterChange('APPROVED')}
          style={{ cursor: 'pointer', borderColor: statusFilter === 'APPROVED' ? '#10B981' : undefined }}
          title="Click to filter Approved"
        >
          <div className="rx-card-header">
            <span className="rx-card-title">Approved</span>
            <div className="rx-card-icon-wrap icon-rx-approved">
              <CheckCircle2 size={18} />
            </div>
          </div>
          {loading ? (
            <div className="rx-skeleton-line" style={{ width: '35%', height: '28px', marginBottom: '8px' }} />
          ) : (
            <div className="rx-card-value" style={{ color: '#059669' }}>{summary.approved || 0}</div>
          )}
          <div className="rx-card-subtext">Verified & cleared</div>
        </div>

        {/* Rejected */}
        <div 
          className="rx-card rx-card-rejected" 
          onClick={() => handleStatusFilterChange('REJECTED')}
          style={{ cursor: 'pointer', borderColor: statusFilter === 'REJECTED' ? '#EF4444' : undefined }}
          title="Click to filter Rejected"
        >
          <div className="rx-card-header">
            <span className="rx-card-title">Rejected</span>
            <div className="rx-card-icon-wrap icon-rx-rejected">
              <XCircle size={18} />
            </div>
          </div>
          {loading ? (
            <div className="rx-skeleton-line" style={{ width: '35%', height: '28px', marginBottom: '8px' }} />
          ) : (
            <div className="rx-card-value" style={{ color: '#DC2626' }}>{summary.rejected || 0}</div>
          )}
          <div className="rx-card-subtext">Invalid or unreadable</div>
        </div>

        {/* Needs Clarification */}
        <div 
          className="rx-card rx-card-clarification" 
          onClick={() => handleStatusFilterChange('NEEDS_CLARIFICATION')}
          style={{ cursor: 'pointer', borderColor: statusFilter === 'NEEDS_CLARIFICATION' ? '#0284C7' : undefined }}
          title="Click to filter Needs Clarification"
        >
          <div className="rx-card-header">
            <span className="rx-card-title">Needs Clarification</span>
            <div className="rx-card-icon-wrap icon-rx-clarification">
              <HelpCircle size={18} />
            </div>
          </div>
          {loading ? (
            <div className="rx-skeleton-line" style={{ width: '35%', height: '28px', marginBottom: '8px' }} />
          ) : (
            <div className="rx-card-value" style={{ color: '#0284C7' }}>{summary.needsClarification || 0}</div>
          )}
          <div className="rx-card-subtext">Waiting on customer reply</div>
        </div>
      </div>

      {/* Main Filter & Search Toolbar */}
      <div className="rx-toolbar-card">
        {/* Search */}
        <div className="rx-search-container">
          <Search size={16} className="rx-search-icon" />
          <input
            type="text"
            className="rx-search-input"
            placeholder="Search prescription ID, customer, phone, order..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Search prescriptions"
          />
          {searchTerm && (
            <button 
              type="button" 
              className="rx-search-clear" 
              onClick={() => setSearchTerm('')}
              aria-label="Clear search input"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Filters Group */}
        <div className="rx-filters-group">
          {/* Status Filter */}
          <div className="rx-select-wrapper">
            <select
              className="rx-select"
              value={statusFilter}
              onChange={(e) => handleStatusFilterChange(e.target.value)}
              aria-label="Filter by Status"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending Review</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="NEEDS_CLARIFICATION">Needs Clarification</option>
            </select>
            <Filter size={14} className="rx-select-arrow" />
          </div>

          {/* Date Filter */}
          <div className="rx-select-wrapper">
            <select
              className="rx-select"
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
              aria-label="Filter by Date"
            >
              <option value="ALL">All Time</option>
              <option value="TODAY">Today</option>
              <option value="WEEK">Last 7 Days</option>
              <option value="MONTH">Last 30 Days</option>
              <option value="CUSTOM">Custom Date Range...</option>
            </select>
            <Calendar size={14} className="rx-select-arrow" />
          </div>

          {/* Sort By */}
          <div className="rx-select-wrapper">
            <select
              className="rx-select"
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
              aria-label="Sort prescriptions"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="updated">Recently Updated</option>
            </select>
          </div>

          {/* Clear Filters Button */}
          {(searchTerm || statusFilter !== 'ALL' || dateFilter !== 'ALL' || sortBy !== 'newest') && (
            <button
              type="button"
              className="rx-btn rx-btn-outline rx-btn-sm"
              onClick={handleResetFilters}
            >
              <X size={14} />
              <span>Clear Filters</span>
            </button>
          )}
        </div>

        {/* Custom Date Inputs if 'CUSTOM' selected */}
        {dateFilter === 'CUSTOM' && (
          <div className="rx-custom-date-row">
            <span style={{ fontSize: '12.5px', color: '#64748B', fontWeight: 600 }}>From:</span>
            <input
              type="date"
              className="rx-date-input"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
            />
            <span style={{ fontSize: '12.5px', color: '#64748B', fontWeight: 600 }}>To:</span>
            <input
              type="date"
              className="rx-date-input"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
            />
          </div>
        )}
      </div>

      {/* Error State */}
      {error && !loading && (
        <div className="rx-table-card">
          <div className="rx-error-state">
            <div className="rx-error-icon">
              <AlertTriangle size={32} />
            </div>
            <h3 className="rx-error-title">Unable to load prescriptions</h3>
            <p className="rx-error-desc">{error}</p>
            <button
              type="button"
              className="rx-btn rx-btn-primary"
              onClick={() => fetchData()}
            >
              <RefreshCw size={15} />
              <span>Try Again</span>
            </button>
          </div>
        </div>
      )}

      {/* Prescriptions Table Card */}
      {!error && (
        <div className="rx-table-card">
          <div className="rx-table-responsive">
            <table className="rx-table">
              <thead>
                <tr>
                  <th>Prescription</th>
                  <th>Customer</th>
                  <th>Uploaded</th>
                  <th>File</th>
                  <th>Order</th>
                  <th>Status</th>
                  <th>Reviewed By</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {/* Loading Skeleton */}
                {loading && (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={`skeleton-${i}`}>
                      <td><div className="rx-skeleton-line" style={{ width: '80px', height: '16px' }} /></td>
                      <td>
                        <div className="rx-customer-cell">
                          <div className="rx-skeleton-avatar" />
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div className="rx-skeleton-line" style={{ width: '110px' }} />
                            <div className="rx-skeleton-line" style={{ width: '150px' }} />
                          </div>
                        </div>
                      </td>
                      <td><div className="rx-skeleton-line" style={{ width: '120px' }} /></td>
                      <td><div className="rx-skeleton-line" style={{ width: '70px' }} /></td>
                      <td><div className="rx-skeleton-line" style={{ width: '80px' }} /></td>
                      <td><div className="rx-skeleton-badge" /></td>
                      <td><div className="rx-skeleton-line" style={{ width: '90px' }} /></td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="rx-skeleton-line" style={{ width: '100px', marginLeft: 'auto' }} />
                      </td>
                    </tr>
                  ))
                )}

                {/* Empty State */}
                {!loading && prescriptions.length === 0 && (
                  <tr>
                    <td colSpan={8}>
                      <div className="rx-empty-state">
                        <div className="rx-empty-icon">
                          <FileText size={32} />
                        </div>
                        <h3 className="rx-empty-title">
                          {searchTerm || statusFilter !== 'ALL' || dateFilter !== 'ALL'
                            ? 'No prescriptions match your filters'
                            : 'No prescriptions submitted yet'}
                        </h3>
                        <p className="rx-empty-desc">
                          {searchTerm || statusFilter !== 'ALL' || dateFilter !== 'ALL'
                            ? 'Try loosening your search terms or resetting the active filters.'
                            : 'Customer prescription uploads will appear here for human clinical verification.'}
                        </p>
                        {(searchTerm || statusFilter !== 'ALL' || dateFilter !== 'ALL') && (
                          <button
                            type="button"
                            className="rx-btn rx-btn-outline"
                            onClick={handleResetFilters}
                          >
                            Clear Filters
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )}

                {/* Data Rows */}
                {!loading && prescriptions.map((rx) => {
                  const initials = (rx.customer_name || 'Customer')
                    .split(' ')
                    .map(n => n[0])
                    .join('')
                    .substring(0, 2)
                    .toUpperCase();

                  const uploadedFormatted = rx.created_at
                    ? new Date(rx.created_at).toLocaleDateString('en-US', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })
                    : '—';

                  const uploadTime = rx.created_at
                    ? new Date(rx.created_at).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                    : '';

                  const rxStatus = (rx.status || 'PENDING').toUpperCase();

                  return (
                    <tr key={rx.id}>
                      {/* Prescription Reference */}
                      <td>
                        <Link 
                          to={`/admin/prescriptions/${rx.id}`}
                          className="rx-num-link"
                          title="View prescription full details"
                        >
                          {rx.prescription_number || `RX-${rx.id}`}
                        </Link>
                      </td>

                      {/* Customer Info */}
                      <td>
                        <div className="rx-customer-cell">
                          <div className="rx-avatar">
                            {initials}
                          </div>
                          <div className="rx-customer-info">
                            <span className="rx-customer-name">
                              {rx.customer_name || 'Anonymous User'}
                            </span>
                            <span className="rx-customer-sub">
                              {rx.customer_email || 'No email provided'}
                            </span>
                            {rx.customer_phone && (
                              <span className="rx-customer-sub" style={{ fontSize: '11px' }}>
                                📞 {rx.customer_phone}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Upload Date & Time */}
                      <td>
                        <div style={{ fontWeight: 600, color: '#1E293B', fontSize: '13px' }}>
                          {uploadedFormatted}
                        </div>
                        {uploadTime && (
                          <div style={{ fontSize: '11.5px', color: '#64748B' }}>
                            {uploadTime}
                          </div>
                        )}
                      </td>

                      {/* File Preview Trigger */}
                      <td>
                        <button
                          type="button"
                          className="rx-action-btn rx-action-btn-primary"
                          onClick={() => handleOpenPreview(rx)}
                          title="Open document viewer modal"
                        >
                          <Eye size={13} />
                          <span>Preview</span>
                        </button>
                      </td>

                      {/* Linked Order */}
                      <td>
                        {rx.order_number ? (
                          <Link
                            to={`/admin/orders/${rx.order_id || ''}`}
                            style={{ color: '#087F73', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                            title="Go to linked order"
                          >
                            <span>{rx.order_number}</span>
                            <ExternalLink size={12} />
                          </Link>
                        ) : (
                          <span style={{ color: '#94A3B8', fontSize: '12px' }}>Not linked</span>
                        )}
                      </td>

                      {/* Status */}
                      <td>
                        {renderStatusBadge(rx.status)}
                      </td>

                      {/* Reviewed By */}
                      <td>
                        {rx.reviewed_by_name ? (
                          <div>
                            <span style={{ fontWeight: 600, color: '#334155', fontSize: '13px' }}>
                              {rx.reviewed_by_name}
                            </span>
                            {rx.reviewed_at && (
                              <span style={{ display: 'block', fontSize: '11px', color: '#64748B' }}>
                                {new Date(rx.reviewed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: '#94A3B8', fontSize: '12px', fontStyle: 'italic' }}>
                            Not reviewed
                          </span>
                        )}
                      </td>

                      {/* Table Actions */}
                      <td style={{ textAlign: 'right' }}>
                        <div className="rx-row-actions" onClick={(e) => e.stopPropagation()}>
                          <Link
                            to={`/admin/prescriptions/${rx.id}`}
                            className="rx-action-btn"
                            title="View Full Prescription Details"
                          >
                            <Eye size={13} />
                            <span>View</span>
                          </Link>

                          {/* Quick action buttons based on status */}
                          {rxStatus === 'PENDING' && (
                            <>
                              <button
                                type="button"
                                className="rx-action-btn"
                                style={{ color: '#10B981', borderColor: '#A7F3D0', backgroundColor: '#F0FDF4' }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenReview(rx, 'APPROVE');
                                }}
                                title="Approve Prescription"
                              >
                                <CheckCircle2 size={13} />
                                <span>Approve</span>
                              </button>

                              <button
                                type="button"
                                className="rx-action-btn"
                                style={{ color: '#EF4444', borderColor: '#FECACA', backgroundColor: '#FEF2F2' }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenReview(rx, 'REJECT');
                                }}
                                title="Reject Prescription"
                              >
                                <XCircle size={13} />
                                <span>Reject</span>
                              </button>
                            </>
                          )}

                          {rxStatus === 'APPROVED' && (
                            <span 
                              className="rx-action-btn"
                              style={{ color: '#059669', borderColor: '#A7F3D0', backgroundColor: '#ECFDF5', cursor: 'default' }}
                              title="Prescription has already been approved"
                            >
                              <CheckCircle2 size={13} />
                              <span>Approved</span>
                            </span>
                          )}

                          {rxStatus === 'REJECTED' && (
                            <span 
                              className="rx-action-btn"
                              style={{ color: '#DC2626', borderColor: '#FECACA', backgroundColor: '#FEF2F2', cursor: 'default' }}
                              title="Prescription has been rejected"
                            >
                              <XCircle size={13} />
                              <span>Rejected</span>
                            </span>
                          )}

                          {rxStatus === 'NEEDS_CLARIFICATION' && (
                            <>
                              <button
                                type="button"
                                className="rx-action-btn"
                                style={{ color: '#10B981', borderColor: '#A7F3D0', backgroundColor: '#F0FDF4' }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenReview(rx, 'APPROVE');
                                }}
                                title="Approve Resubmission"
                              >
                                <CheckCircle2 size={13} />
                                <span>Approve</span>
                              </button>
                              <button
                                type="button"
                                className="rx-action-btn"
                                style={{ color: '#EF4444', borderColor: '#FECACA', backgroundColor: '#FEF2F2' }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenReview(rx, 'REJECT');
                                }}
                                title="Reject Resubmission"
                              >
                                <XCircle size={13} />
                                <span>Reject</span>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Bar */}
          {!loading && prescriptions.length > 0 && (
            <div className="rx-pagination-bar">
              <div className="rx-pagination-info">
                <span>
                  Showing {Math.min((pagination.page - 1) * pagination.limit + 1, pagination.total)}–
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} prescriptions
                </span>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>Rows:</span>
                  <select
                    className="rx-page-size-select"
                    value={pagination.limit}
                    onChange={(e) => setPagination(prev => ({ ...prev, limit: Number(e.target.value), page: 1 }))}
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>

              <div className="rx-pagination-nav">
                <button
                  type="button"
                  className="rx-page-num-btn"
                  onClick={() => setPagination(prev => ({ ...prev, page: Math.max(prev.page - 1, 1) }))}
                  disabled={pagination.page <= 1}
                  aria-label="Previous page"
                >
                  <ChevronLeft size={16} />
                </button>

                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === pagination.totalPages || Math.abs(p - pagination.page) <= 1)
                  .map((p, idx, arr) => (
                    <React.Fragment key={p}>
                      {idx > 0 && p - arr[idx - 1] > 1 && (
                        <span style={{ padding: '0 4px', color: '#94A3B8' }}>...</span>
                      )}
                      <button
                        type="button"
                        className={`rx-page-num-btn ${pagination.page === p ? 'active' : ''}`}
                        onClick={() => setPagination(prev => ({ ...prev, page: p }))}
                      >
                        {p}
                      </button>
                    </React.Fragment>
                  ))}

                <button
                  type="button"
                  className="rx-page-num-btn"
                  onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.page + 1, pagination.totalPages) }))}
                  disabled={pagination.page >= pagination.totalPages}
                  aria-label="Next page"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Document Preview Modal */}
      <PrescriptionPreviewModal
        isOpen={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        prescription={selectedPrescription}
        onOpenReviewModal={(rx, type) => {
          setPreviewModalOpen(false);
          handleOpenReview(rx, type);
        }}
      />

      {/* Review Prescription Action Modal */}
      <ReviewPrescriptionModal
        isOpen={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        prescription={selectedPrescription}
        actionType={reviewActionType}
        onSuccess={handleReviewSuccess}
      />
    </div>
  );
}
