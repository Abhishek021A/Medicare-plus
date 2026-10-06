import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Users,
  UserCheck,
  UserPlus,
  UserX,
  ShoppingBag,
  IndianRupee,
  Search,
  RefreshCw,
  Download,
  Eye,
  Edit2,
  Filter,
  X,
  Calendar,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  CheckCircle2,
  Mail,
  Phone
} from 'lucide-react';
import { adminCustomerService } from '../../../services/adminApi';
import EditCustomerModal from './EditCustomerModal';
import BlockCustomerModal from './BlockCustomerModal';
import './AdminCustomers.css';

export default function AdminCustomers() {
  const navigate = useNavigate();

  // State
  const [customers, setCustomers] = useState([]);
  const [summary, setSummary] = useState({
    total: 0,
    active: 0,
    new: 0,
    blocked: 0,
    orders: 0,
    revenue: 0
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [datePreset, setDatePreset] = useState('ALL');
  const [orderFilter, setOrderFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('newest');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1
  });

  const [showFilters, setShowFilters] = useState(false);

  // Modals state
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [targetBlockStatus, setTargetBlockStatus] = useState('BLOCKED');

  // Toast message
  const [toastMessage, setToastMessage] = useState(null);
  const toastTimeoutRef = useRef(null);

  const showToast = (msg, type = 'success') => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage({ text: msg, type });
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Debounce search input (350ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch Customers from API
  const fetchCustomers = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const params = {
        page,
        limit,
        search: debouncedSearch.trim(),
        sort: sortBy
      };

      if (statusFilter !== 'ALL') {
        params.status = statusFilter;
      }

      if (datePreset !== 'ALL') {
        params.date_filter = datePreset;
      }

      if (orderFilter !== 'ALL') {
        params.order_activity = orderFilter;
      }

      const res = await adminCustomerService.getCustomers(params);

      if (res && res.success) {
        const data = res.data || res;
        setCustomers(data.customers || []);
        if (data.summary) {
          setSummary(data.summary);
        }
        if (data.pagination) {
          setPagination(data.pagination);
        }
      } else {
        setError(res.message || 'Unable to load customers list.');
      }
    } catch (err) {
      console.error('Error fetching customers:', err);
      setError('Unable to load customers. Please check database connection and try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, limit, debouncedSearch, statusFilter, datePreset, orderFilter, sortBy]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Clear filters
  const handleClearFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setStatusFilter('ALL');
    setDatePreset('ALL');
    setOrderFilter('ALL');
    setSortBy('newest');
    setPage(1);
  };

  const hasActiveFilters = Boolean(
    debouncedSearch || statusFilter !== 'ALL' || datePreset !== 'ALL' || orderFilter !== 'ALL' || sortBy !== 'newest'
  );

  // Handle Edit Action
  const openEditModal = (customer, e) => {
    if (e) e.stopPropagation();
    setSelectedCustomer(customer);
    setIsEditModalOpen(true);
  };

  const handleEditSuccess = (updatedCustomer) => {
    setCustomers((prev) =>
      prev.map((c) => (c.id === updatedCustomer.id ? { ...c, ...updatedCustomer } : c))
    );
    showToast('Customer updated successfully', 'success');
  };

  // Handle Block / Unblock Action
  const openBlockModal = (customer, action, e) => {
    if (e) e.stopPropagation();
    setSelectedCustomer(customer);
    setTargetBlockStatus(action === 'block' ? 'BLOCKED' : 'ACTIVE');
    setIsBlockModalOpen(true);
  };

  const handleBlockSuccess = (customerId, newStatus, updatedSummary) => {
    setCustomers((prev) =>
      prev.map((c) => (c.id === customerId ? { ...c, status: newStatus } : c))
    );
    if (updatedSummary) {
      setSummary(updatedSummary);
    }
    showToast(
      newStatus === 'BLOCKED' ? 'Customer blocked successfully' : 'Customer unblocked successfully',
      'success'
    );
  };

  // Handle Export Customers
  const handleExport = async () => {
    setExporting(true);
    try {
      const params = {
        search: debouncedSearch.trim(),
        status: statusFilter !== 'ALL' ? statusFilter : undefined
      };
      const res = await adminCustomerService.exportCustomers(params);
      if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
        // Convert to CSV
        const headers = Object.keys(res.data[0]);
        const csvRows = [];
        csvRows.push(headers.join(','));

        for (const row of res.data) {
          const values = headers.map((header) => {
            const val = row[header] ?? '';
            const escaped = ('' + val).replace(/"/g, '""');
            return `"${escaped}"`;
          });
          csvRows.push(values.join(','));
        }

        const csvString = csvRows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `customers_export_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast(`Exported ${res.data.length} customer records.`, 'success');
      } else {
        showToast('No customer records to export with current filters.', 'error');
      }
    } catch (err) {
      console.error('Export error:', err);
      showToast('Failed to export customers.', 'error');
    } finally {
      setExporting(false);
    }
  };

  const formatCurrency = (amt) => {
    const num = parseFloat(amt) || 0;
    return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="cus-page-wrapper">
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          zIndex: 9999,
          padding: '12px 20px',
          borderRadius: '10px',
          backgroundColor: toastMessage.type === 'error' ? '#EF4444' : '#087F73',
          color: '#FFFFFF',
          fontSize: '14px',
          fontWeight: 600,
          boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
          animation: 'cusFadeIn 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {toastMessage.type === 'error' ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header & Breadcrumb */}
      <div className="cus-header">
        <div className="cus-title-wrap">
          <div className="cus-breadcrumb">
            <Link to="/admin">Admin</Link>
            <span>/</span>
            <span className="cus-breadcrumb-current">Customers</span>
          </div>
          <h1>Customers</h1>
          <p className="cus-subtitle">
            Manage customer accounts, orders, prescriptions, addresses, and activity.
          </p>
        </div>

        <div className="cus-header-actions">
          <button
            className="cus-btn cus-btn-secondary"
            onClick={handleExport}
            disabled={exporting || loading}
          >
            <Download size={16} />
            <span>{exporting ? 'Exporting...' : 'Export Customers'}</span>
          </button>
          <button
            className="cus-btn cus-btn-primary"
            onClick={() => fetchCustomers(true)}
            disabled={refreshing || loading}
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="cus-summary-grid">
        <div className="cus-summary-card">
          <div className="cus-summary-icon total">
            <Users size={24} />
          </div>
          <div className="cus-summary-info">
            <span className="cus-summary-label">Total Customers</span>
            <span className="cus-summary-value">
              {loading ? '...' : summary.total?.toLocaleString('en-IN') || 0}
            </span>
            <span className="cus-summary-subtext">Registered accounts</span>
          </div>
        </div>

        <div className="cus-summary-card">
          <div className="cus-summary-icon active">
            <UserCheck size={24} />
          </div>
          <div className="cus-summary-info">
            <span className="cus-summary-label">Active Customers</span>
            <span className="cus-summary-value" style={{ color: 'var(--cus-primary)' }}>
              {loading ? '...' : summary.active?.toLocaleString('en-IN') || 0}
            </span>
            <span className="cus-summary-subtext">Verified & Active</span>
          </div>
        </div>

        <div className="cus-summary-card">
          <div className="cus-summary-icon new">
            <UserPlus size={24} />
          </div>
          <div className="cus-summary-info">
            <span className="cus-summary-label">New Customers</span>
            <span className="cus-summary-value" style={{ color: '#2563EB' }}>
              {loading ? '...' : summary.new?.toLocaleString('en-IN') || 0}
            </span>
            <span className="cus-summary-subtext">Last 30 days</span>
          </div>
        </div>

        <div className="cus-summary-card">
          <div className="cus-summary-icon blocked">
            <UserX size={24} />
          </div>
          <div className="cus-summary-info">
            <span className="cus-summary-label">Blocked / Suspended</span>
            <span className="cus-summary-value" style={{ color: 'var(--cus-danger)' }}>
              {loading ? '...' : summary.blocked?.toLocaleString('en-IN') || 0}
            </span>
            <span className="cus-summary-subtext">Restricted access</span>
          </div>
        </div>

        <div className="cus-summary-card">
          <div className="cus-summary-icon orders">
            <ShoppingBag size={24} />
          </div>
          <div className="cus-summary-info">
            <span className="cus-summary-label">Total Orders</span>
            <span className="cus-summary-value" style={{ color: '#7C3AED' }}>
              {loading ? '...' : summary.orders?.toLocaleString('en-IN') || 0}
            </span>
            <span className="cus-summary-subtext">Customer purchases</span>
          </div>
        </div>

        <div className="cus-summary-card">
          <div className="cus-summary-icon revenue">
            <IndianRupee size={24} />
          </div>
          <div className="cus-summary-info">
            <span className="cus-summary-label">Customer Revenue</span>
            <span className="cus-summary-value" style={{ color: '#059669' }}>
              {loading ? '...' : formatCurrency(summary.revenue)}
            </span>
            <span className="cus-summary-subtext">Paid order total</span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="cus-filter-card">
        <div className="cus-search-bar-row">
          <div className="cus-search-input-wrapper">
            <Search size={18} className="cus-search-icon" />
            <input
              type="text"
              className="cus-search-input"
              placeholder="Search customers by name, email, phone, ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                className="cus-clear-search-btn"
                onClick={() => setSearch('')}
                title="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <button
            className={`cus-filter-toggle-btn ${showFilters || hasActiveFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={16} />
            <span>Filters</span>
            {hasActiveFilters && (
              <span style={{
                background: 'var(--cus-primary)',
                color: '#fff',
                fontSize: '11px',
                borderRadius: '50%',
                width: '18px',
                height: '18px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700
              }}>
                •
              </span>
            )}
          </button>

          {hasActiveFilters && (
            <button
              className="cus-btn cus-btn-secondary cus-btn-sm"
              onClick={handleClearFilters}
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* Expandable Filter Grid */}
        {showFilters && (
          <div className="cus-filters-grid">
            <div className="cus-filter-group">
              <label>Status</label>
              <select
                className="cus-select"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="ALL">All Customers</option>
                <option value="ACTIVE">Active</option>
                <option value="BLOCKED">Blocked / Inactive</option>
              </select>
            </div>

            <div className="cus-filter-group">
              <label>Registration Date</label>
              <select
                className="cus-select"
                value={datePreset}
                onChange={(e) => {
                  setDatePreset(e.target.value);
                  setPage(1);
                }}
              >
                <option value="ALL">All Time</option>
                <option value="today">Today</option>
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
                <option value="this_month">This Month</option>
              </select>
            </div>

            <div className="cus-filter-group">
              <label>Order Activity</label>
              <select
                className="cus-select"
                value={orderFilter}
                onChange={(e) => {
                  setOrderFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="ALL">All Customers</option>
                <option value="has_orders">Has Placed Orders</option>
                <option value="no_orders">No Orders Yet</option>
              </select>
            </div>

            <div className="cus-filter-group">
              <label>Sort By</label>
              <select
                className="cus-select"
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setPage(1);
                }}
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="name_asc">Name A-Z</option>
                <option value="name_desc">Name Z-A</option>
                <option value="spent_desc">Highest Spend</option>
                <option value="spent_asc">Lowest Spend</option>
                <option value="orders_desc">Most Orders</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Error Banner */}
      {error && (
        <div style={{
          padding: '16px 20px',
          borderRadius: '12px',
          backgroundColor: '#FEF2F2',
          border: '1px solid #FECACA',
          color: '#991B1B',
          marginBottom: '22px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertTriangle size={20} />
            <span>{error}</span>
          </div>
          <button
            className="cus-btn cus-btn-secondary cus-btn-sm"
            onClick={() => fetchCustomers()}
          >
            Try Again
          </button>
        </div>
      )}

      {/* Main Table Container */}
      <div className="cus-table-container">
        {/* Desktop / Tablet Table */}
        <div className="cus-table-responsive">
          <table className="cus-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Email / Phone</th>
                <th>Joined</th>
                <th>Orders</th>
                <th>Total Spent</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                // Skeletons
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx}>
                    <td>
                      <div className="cus-user-cell">
                        <div className="cus-skeleton" style={{ width: '40px', height: '40px', borderRadius: '50%' }} />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div className="cus-skeleton" style={{ width: '130px', height: '14px' }} />
                          <div className="cus-skeleton" style={{ width: '70px', height: '10px' }} />
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div className="cus-skeleton" style={{ width: '150px', height: '12px' }} />
                        <div className="cus-skeleton" style={{ width: '90px', height: '10px' }} />
                      </div>
                    </td>
                    <td><div className="cus-skeleton" style={{ width: '80px', height: '12px' }} /></td>
                    <td><div className="cus-skeleton" style={{ width: '60px', height: '12px' }} /></td>
                    <td><div className="cus-skeleton" style={{ width: '70px', height: '12px' }} /></td>
                    <td><div className="cus-skeleton" style={{ width: '75px', height: '24px', borderRadius: '9999px' }} /></td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="cus-skeleton" style={{ width: '140px', height: '30px', marginLeft: 'auto' }} />
                    </td>
                  </tr>
                ))
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '60px 20px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '50%',
                        backgroundColor: '#F1F5F9',
                        color: '#64748B',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Users size={32} />
                      </div>
                      <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--cus-text-main)' }}>
                        No customers found
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--cus-text-muted)', maxWidth: '360px' }}>
                        {hasActiveFilters
                          ? 'No customers match your current search and filter criteria.'
                          : 'No customers have registered in the database yet.'}
                      </div>
                      {hasActiveFilters && (
                        <button
                          className="cus-btn cus-btn-primary cus-btn-sm"
                          onClick={handleClearFilters}
                          style={{ marginTop: '8px' }}
                        >
                          Clear Filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                customers.map((c) => {
                  const isBlocked = c.status === 'BLOCKED' || c.status === 'INACTIVE';
                  return (
                    <tr
                      key={c.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/admin/customers/${c.id}`)}
                    >
                      {/* Customer Cell */}
                      <td>
                        <div className="cus-user-cell">
                          <div className="cus-avatar">{c.initials || 'CU'}</div>
                          <div className="cus-user-meta">
                            <span className="cus-user-name">{c.name}</span>
                            <span className="cus-user-id">{c.customer_code || `CUS-${c.id}`}</span>
                          </div>
                        </div>
                      </td>

                      {/* Contact Cell */}
                      <td>
                        <div className="cus-contact-cell" onClick={(e) => e.stopPropagation()}>
                          <a href={`mailto:${c.email}`} className="cus-contact-link">
                            <Mail size={13} style={{ color: 'var(--cus-text-muted)' }} />
                            <span>{c.email}</span>
                          </a>
                          {c.phone && (
                            <a href={`tel:${c.phone}`} className="cus-contact-phone" style={{ textDecoration: 'none' }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <Phone size={12} />
                                {c.phone}
                              </span>
                            </a>
                          )}
                        </div>
                      </td>

                      {/* Joined Date */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                          <Calendar size={13} style={{ color: 'var(--cus-text-light)' }} />
                          <span>{formatDate(c.created_at)}</span>
                        </div>
                      </td>

                      {/* Orders */}
                      <td>
                        <span style={{ fontWeight: 600 }}>
                          {c.order_count} {c.order_count === 1 ? 'Order' : 'Orders'}
                        </span>
                      </td>

                      {/* Total Spent */}
                      <td>
                        <span style={{ fontWeight: 700, color: 'var(--cus-text-main)' }}>
                          {formatCurrency(c.total_spent)}
                        </span>
                      </td>

                      {/* Status */}
                      <td>
                        <span className={`cus-badge ${isBlocked ? 'cus-badge-blocked' : 'cus-badge-active'}`}>
                          <span className="cus-badge-dot" />
                          <span>{isBlocked ? 'Blocked' : 'Active'}</span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'right' }}>
                        <div className="cus-actions-cell" style={{ justifyContent: 'flex-end' }} onClick={(e) => e.stopPropagation()}>
                          <button
                            className="cus-action-btn view"
                            onClick={() => navigate(`/admin/customers/${c.id}`)}
                            title="View Customer Profile"
                          >
                            <Eye size={13} />
                            <span>View</span>
                          </button>

                          <button
                            className="cus-action-btn"
                            onClick={(e) => openEditModal(c, e)}
                            title="Edit Customer"
                          >
                            <Edit2 size={13} />
                            <span>Edit</span>
                          </button>

                          {isBlocked ? (
                            <button
                              className="cus-action-btn unblock"
                              onClick={(e) => openBlockModal(c, 'unblock', e)}
                              title="Unblock Customer"
                            >
                              <CheckCircle2 size={13} />
                              <span>Unblock</span>
                            </button>
                          ) : (
                            <button
                              className="cus-action-btn block"
                              onClick={(e) => openBlockModal(c, 'block', e)}
                              title="Block Customer"
                            >
                              <ShieldAlert size={13} />
                              <span>Block</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards (under 768px) */}
        <div className="cus-mobile-cards" style={{ padding: '16px' }}>
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="cus-skeleton" style={{ height: '140px', borderRadius: '12px' }} />
            ))
          ) : customers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--cus-text-muted)' }}>
              No customers found.
            </div>
          ) : (
            customers.map((c) => {
              const isBlocked = c.status === 'BLOCKED' || c.status === 'INACTIVE';
              return (
                <div key={c.id} className="cus-mobile-card">
                  <div className="cus-mobile-card-header">
                    <div className="cus-user-cell">
                      <div className="cus-avatar">{c.initials || 'CU'}</div>
                      <div className="cus-user-meta">
                        <span className="cus-user-name">{c.name}</span>
                        <span className="cus-user-id">{c.customer_code || `CUS-${c.id}`}</span>
                      </div>
                    </div>
                    <span className={`cus-badge ${isBlocked ? 'cus-badge-blocked' : 'cus-badge-active'}`}>
                      <span className="cus-badge-dot" />
                      <span>{isBlocked ? 'Blocked' : 'Active'}</span>
                    </span>
                  </div>

                  <div style={{ fontSize: '13px', color: 'var(--cus-text-muted)' }}>
                    <div>{c.email}</div>
                    {c.phone && <div>{c.phone}</div>}
                  </div>

                  <div className="cus-mobile-card-stats">
                    <div>
                      <span style={{ color: 'var(--cus-text-light)' }}>Orders: </span>
                      <strong style={{ color: 'var(--cus-text-main)' }}>{c.order_count}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--cus-text-light)' }}>Spent: </span>
                      <strong style={{ color: 'var(--cus-text-main)' }}>{formatCurrency(c.total_spent)}</strong>
                    </div>
                  </div>

                  <div className="cus-mobile-card-actions">
                    <button
                      className="cus-btn cus-btn-primary cus-btn-sm"
                      style={{ flex: 1 }}
                      onClick={() => navigate(`/admin/customers/${c.id}`)}
                    >
                      <Eye size={13} />
                      <span>View</span>
                    </button>
                    <button
                      className="cus-btn cus-btn-secondary cus-btn-sm"
                      onClick={(e) => openEditModal(c, e)}
                    >
                      <Edit2 size={13} />
                    </button>
                    {isBlocked ? (
                      <button
                        className="cus-btn cus-btn-success cus-btn-sm"
                        onClick={(e) => openBlockModal(c, 'unblock', e)}
                      >
                        Unblock
                      </button>
                    ) : (
                      <button
                        className="cus-btn cus-btn-danger cus-btn-sm"
                        onClick={(e) => openBlockModal(c, 'block', e)}
                      >
                        Block
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination Bar */}
        <div className="cus-pagination-bar">
          <div className="cus-pagination-info">
            Showing {customers.length > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0}–
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
            <strong>{pagination.total}</strong> customers
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
              <span style={{ color: 'var(--cus-text-muted)' }}>Rows:</span>
              <select
                className="cus-select"
                style={{ height: '32px', padding: '2px 8px' }}
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>

            <div className="cus-pagination-controls">
              <button
                className="cus-page-btn"
                disabled={page <= 1}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                aria-label="Previous page"
              >
                <ChevronLeft size={16} />
              </button>

              {Array.from({ length: pagination.totalPages || 1 }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === pagination.totalPages || Math.abs(p - page) <= 1)
                .map((p, idx, arr) => {
                  const showEllipsis = idx > 0 && p - arr[idx - 1] > 1;
                  return (
                    <React.Fragment key={p}>
                      {showEllipsis && <span style={{ padding: '0 4px', color: 'var(--cus-text-light)' }}>...</span>}
                      <button
                        className={`cus-page-btn ${p === page ? 'active' : ''}`}
                        onClick={() => setPage(p)}
                      >
                        {p}
                      </button>
                    </React.Fragment>
                  );
                })}

              <button
                className="cus-page-btn"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((prev) => Math.min(pagination.totalPages, prev + 1))}
                aria-label="Next page"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Customer Modal */}
      <EditCustomerModal
        customer={selectedCustomer}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={handleEditSuccess}
      />

      {/* Block / Unblock Modal */}
      <BlockCustomerModal
        customer={selectedCustomer}
        targetStatus={targetBlockStatus}
        isOpen={isBlockModalOpen}
        onClose={() => setIsBlockModalOpen(false)}
        onSuccess={handleBlockSuccess}
      />
    </div>
  );
}
