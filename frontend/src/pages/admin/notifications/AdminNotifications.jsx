import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  RefreshCw,
  Search,
  Filter,
  Trash2,
  Check,
  Eye,
  ShoppingCart,
  Pill,
  Package,
  Star,
  Users,
  AlertTriangle,
  Settings,
  ChevronRight,
  ChevronLeft,
  Calendar,
  ArrowUpDown,
  ExternalLink,
  X,
  Clock,
  ShieldAlert,
  SlidersHorizontal,
  Info,
  Layers,
  Sparkles
} from 'lucide-react';
import { adminNotificationService } from '../../../services/adminApi';
import { formatRelativeTime, formatDateTime } from '../../../utils/dateUtils';
import { useToast } from '../../../context/ToastContext';
import './AdminNotifications.css';

export default function AdminNotifications() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { addToast } = useToast();

  // URL or State Filters
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all'); // 'all' | 'unread' | 'read'
  const [typeFilter, setTypeFilter] = useState(searchParams.get('type') || 'ALL');
  const [priorityFilter, setPriorityFilter] = useState(searchParams.get('priority') || 'ALL');
  const [sortOption, setSortOption] = useState(searchParams.get('sort') || 'newest');
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
  const [limit, setLimit] = useState(Number(searchParams.get('limit')) || 10);

  // Async & UI State
  const [notifications, setNotifications] = useState([]);
  const [summary, setSummary] = useState({
    all: 0,
    unread: 0,
    read: 0,
    orders: 0,
    prescriptions: 0,
    reviews: 0,
    inventory: 0,
    customers: 0,
    system: 0,
    high_priority: 0
  });
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Modals State
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [deleteCandidate, setDeleteCandidate] = useState(null);
  const [clearReadModalOpen, setClearReadModalOpen] = useState(false);

  // Debounce search input (350ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Sync state to URL search parameters for linkability
  useEffect(() => {
    const params = new URLSearchParams();
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (typeFilter !== 'ALL') params.set('type', typeFilter);
    if (priorityFilter !== 'ALL') params.set('priority', priorityFilter);
    if (sortOption !== 'newest') params.set('sort', sortOption);
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (page > 1) params.set('page', page);
    if (limit !== 10) params.set('limit', limit);
    setSearchParams(params, { replace: true });
  }, [statusFilter, typeFilter, priorityFilter, sortOption, debouncedSearch, page, limit, setSearchParams]);

  // Fetch Notifications from MySQL API
  const fetchNotifications = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const params = {
        page,
        limit,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        type: typeFilter !== 'ALL' ? typeFilter : undefined,
        priority: priorityFilter !== 'ALL' ? priorityFilter : undefined,
        sort: sortOption,
        search: debouncedSearch || undefined
      };

      const response = await adminNotificationService.getNotifications(params);

      if (response && response.success) {
        setNotifications(response.data.notifications || []);
        setSummary(response.data.summary || {});
        setPagination(response.data.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 });
      } else {
        throw new Error(response?.message || 'Failed to fetch notifications');
      }
    } catch (err) {
      console.error('Error loading notifications:', err);
      setError(err?.response?.data?.message || err.message || 'Unable to load notifications. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, limit, statusFilter, typeFilter, priorityFilter, sortOption, debouncedSearch]);

  // Trigger load on filter changes
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Listen to external update events
  useEffect(() => {
    const handleSync = () => fetchNotifications();
    window.addEventListener('medicare_notifications_updated', handleSync);
    return () => window.removeEventListener('medicare_notifications_updated', handleSync);
  }, [fetchNotifications]);

  // Notify header bell to update count
  const broadcastUpdate = () => {
    window.dispatchEvent(new CustomEvent('medicare_notifications_updated'));
  };

  // Mark single as read
  const handleMarkAsRead = async (notif, e) => {
    if (e) e.stopPropagation();
    try {
      // Optimistic update
      setNotifications(prev =>
        prev.map(n => (n.id === notif.id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n))
      );
      setSummary(prev => ({
        ...prev,
        unread: Math.max(0, prev.unread - 1),
        read: prev.read + 1
      }));

      await adminNotificationService.markAsRead(notif.id);
      broadcastUpdate();
      addToast('success', 'Notification marked as read');
    } catch (err) {
      console.error('Failed to mark read:', err);
      fetchNotifications();
      addToast('error', 'Could not update notification status');
    }
  };

  // Mark single as unread
  const handleMarkAsUnread = async (notif, e) => {
    if (e) e.stopPropagation();
    try {
      setNotifications(prev =>
        prev.map(n => (n.id === notif.id ? { ...n, is_read: false, read_at: null } : n))
      );
      setSummary(prev => ({
        ...prev,
        unread: prev.unread + 1,
        read: Math.max(0, prev.read - 1)
      }));

      await adminNotificationService.markAsUnread(notif.id);
      broadcastUpdate();
      addToast('info', 'Notification marked as unread');
    } catch (err) {
      console.error('Failed to mark unread:', err);
      fetchNotifications();
      addToast('error', 'Could not update notification status');
    }
  };

  // Mark all active as read
  const handleMarkAllAsRead = async () => {
    try {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setSummary(prev => ({
        ...prev,
        read: prev.read + prev.unread,
        unread: 0
      }));

      await adminNotificationService.markAllAsRead();
      broadcastUpdate();
      addToast('success', 'All notifications marked as read');
    } catch (err) {
      console.error('Failed to mark all as read:', err);
      fetchNotifications();
      addToast('error', 'Failed to mark all notifications as read');
    }
  };

  // Delete notification
  const confirmDelete = async () => {
    if (!deleteCandidate) return;
    const notifId = deleteCandidate.id;
    try {
      setNotifications(prev => prev.filter(n => n.id !== notifId));
      if (!deleteCandidate.is_read) {
        setSummary(prev => ({ ...prev, unread: Math.max(0, prev.unread - 1) }));
      }
      setSummary(prev => ({ ...prev, all: Math.max(0, prev.all - 1) }));
      setDeleteCandidate(null);

      await adminNotificationService.deleteNotification(notifId);
      broadcastUpdate();
      addToast('success', 'Notification deleted successfully');
    } catch (err) {
      console.error('Failed to delete notification:', err);
      fetchNotifications();
      addToast('error', 'Unable to delete notification');
    }
  };

  // Clear read notifications
  const confirmClearRead = async () => {
    try {
      setClearReadModalOpen(false);
      setNotifications(prev => prev.filter(n => !n.is_read));
      setSummary(prev => ({
        ...prev,
        all: prev.unread,
        read: 0
      }));

      await adminNotificationService.clearReadNotifications();
      broadcastUpdate();
      addToast('success', 'Read notifications cleared successfully');
    } catch (err) {
      console.error('Failed to clear read notifications:', err);
      fetchNotifications();
      addToast('error', 'Failed to clear read notifications');
    }
  };

  // Direct entity navigation action
  const handleActionClick = async (notif, e) => {
    if (e) e.stopPropagation();

    // Mark as read if not already
    if (!notif.is_read) {
      try {
        await adminNotificationService.markAsRead(notif.id);
        broadcastUpdate();
      } catch (err) {
        // Continue navigation
      }
    }

    const targetUrl = notif.action_url || '/admin';
    navigate(targetUrl);
  };

  // Card click: open detail modal and mark as read
  const handleCardClick = (notif) => {
    setSelectedNotification(notif);
    if (!notif.is_read) {
      handleMarkAsRead(notif);
    }
  };

  // Icon renderer for notification types
  const renderTypeIcon = (type) => {
    const t = String(type || '').toUpperCase();
    switch (t) {
      case 'ORDER':
        return <ShoppingCart size={20} />;
      case 'PRESCRIPTION':
        return <Pill size={20} />;
      case 'INVENTORY':
        return <Package size={20} />;
      case 'REVIEW':
        return <Star size={20} />;
      case 'CUSTOMER':
        return <Users size={20} />;
      case 'PAYMENT':
        return <CheckCheck size={20} />;
      case 'SECURITY':
        return <ShieldAlert size={20} />;
      default:
        return <Bell size={20} />;
    }
  };

  // Action button label based on type
  const getActionLabel = (notif) => {
    const t = String(notif.type || '').toUpperCase();
    switch (t) {
      case 'ORDER':
        return 'View Order';
      case 'PRESCRIPTION':
        return 'Review Rx';
      case 'INVENTORY':
        return 'View Stock';
      case 'REVIEW':
        return 'View Review';
      case 'CUSTOMER':
        return 'View Customer';
      default:
        return 'View Details';
    }
  };

  // Priority badge styling
  const renderPriorityBadge = (priority) => {
    const p = String(priority || 'NORMAL').toUpperCase();
    let badgeClass = 'priority-normal';
    if (p === 'CRITICAL') badgeClass = 'priority-critical';
    else if (p === 'HIGH') badgeClass = 'priority-high';
    else if (p === 'LOW') badgeClass = 'priority-low';

    return <span className={`notif-badge ${badgeClass}`}>{p}</span>;
  };

  return (
    <div className="notif-page-wrapper">
      {/* Header */}
      <header className="notif-header">
        <div className="notif-title-wrap">
          <nav className="notif-breadcrumb" aria-label="Breadcrumb">
            <Link to="/admin">Dashboard</Link>
            <ChevronRight size={14} />
            <span className="notif-breadcrumb-current">Notifications</span>
          </nav>
          <h1>Notifications</h1>
          <p className="notif-subtitle">
            Stay updated with orders, prescriptions, reviews, inventory and system activity.
          </p>
        </div>

        <div className="notif-header-actions">
          {summary.unread > 0 && (
            <button
              type="button"
              className="notif-btn notif-btn-secondary"
              onClick={handleMarkAllAsRead}
              title="Mark all notifications as read"
            >
              <CheckCheck size={16} />
              <span>Mark All as Read</span>
            </button>
          )}

          {summary.read > 0 && (
            <button
              type="button"
              className="notif-btn notif-btn-secondary"
              onClick={() => setClearReadModalOpen(true)}
              title="Remove archived read notifications"
            >
              <Trash2 size={15} />
              <span>Clear Read</span>
            </button>
          )}

          <button
            type="button"
            className="notif-btn notif-btn-primary"
            onClick={() => fetchNotifications(true)}
            disabled={refreshing}
            title="Refresh notifications"
          >
            <RefreshCw size={15} className={refreshing ? 'notif-spin' : ''} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </header>

      {/* Summary / Quick Stats Cards */}
      <section className="notif-stats-grid" aria-label="Notification Summary">
        <div
          className={`notif-stat-card ${statusFilter === 'all' && typeFilter === 'ALL' ? 'active' : ''}`}
          onClick={() => {
            setStatusFilter('all');
            setTypeFilter('ALL');
            setPage(1);
          }}
          title="Show all notifications"
        >
          <div className="notif-stat-info">
            <span className="notif-stat-label">All</span>
            <span className="notif-stat-count">{summary.all || 0}</span>
          </div>
          <div className="notif-stat-icon-wrap" style={{ backgroundColor: '#F1F5F9', color: '#475569' }}>
            <Layers size={20} />
          </div>
        </div>

        <div
          className={`notif-stat-card ${statusFilter === 'unread' ? 'active' : ''}`}
          onClick={() => {
            setStatusFilter('unread');
            setPage(1);
          }}
          title="Show unread notifications"
        >
          <div className="notif-stat-info">
            <span className="notif-stat-label">Unread</span>
            <span className="notif-stat-count" style={{ color: '#087F73' }}>
              {summary.unread || 0}
            </span>
          </div>
          <div className="notif-stat-icon-wrap" style={{ backgroundColor: '#E6F7F5', color: '#087F73' }}>
            <Bell size={20} />
          </div>
        </div>

        <div
          className={`notif-stat-card ${typeFilter === 'ORDER' ? 'active' : ''}`}
          onClick={() => {
            setTypeFilter(typeFilter === 'ORDER' ? 'ALL' : 'ORDER');
            setPage(1);
          }}
          title="Filter by Orders"
        >
          <div className="notif-stat-info">
            <span className="notif-stat-label">Orders</span>
            <span className="notif-stat-count">{summary.orders || 0}</span>
          </div>
          <div className="notif-stat-icon-wrap" style={{ backgroundColor: '#EFF6FF', color: '#2563EB' }}>
            <ShoppingCart size={20} />
          </div>
        </div>

        <div
          className={`notif-stat-card ${typeFilter === 'PRESCRIPTION' ? 'active' : ''}`}
          onClick={() => {
            setTypeFilter(typeFilter === 'PRESCRIPTION' ? 'ALL' : 'PRESCRIPTION');
            setPage(1);
          }}
          title="Filter by Prescriptions"
        >
          <div className="notif-stat-info">
            <span className="notif-stat-label">Prescriptions</span>
            <span className="notif-stat-count">{summary.prescriptions || 0}</span>
          </div>
          <div className="notif-stat-icon-wrap" style={{ backgroundColor: '#E6F7F5', color: '#087F73' }}>
            <Pill size={20} />
          </div>
        </div>

        <div
          className={`notif-stat-card ${typeFilter === 'REVIEW' ? 'active' : ''}`}
          onClick={() => {
            setTypeFilter(typeFilter === 'REVIEW' ? 'ALL' : 'REVIEW');
            setPage(1);
          }}
          title="Filter by Reviews"
        >
          <div className="notif-stat-info">
            <span className="notif-stat-label">Reviews</span>
            <span className="notif-stat-count">{summary.reviews || 0}</span>
          </div>
          <div className="notif-stat-icon-wrap" style={{ backgroundColor: '#FFFBEB', color: '#D97706' }}>
            <Star size={20} />
          </div>
        </div>

        <div
          className={`notif-stat-card ${typeFilter === 'INVENTORY' ? 'active' : ''}`}
          onClick={() => {
            setTypeFilter(typeFilter === 'INVENTORY' ? 'ALL' : 'INVENTORY');
            setPage(1);
          }}
          title="Filter by Inventory alerts"
        >
          <div className="notif-stat-info">
            <span className="notif-stat-label">Inventory</span>
            <span className="notif-stat-count" style={{ color: '#EF4444' }}>
              {summary.inventory || 0}
            </span>
          </div>
          <div className="notif-stat-icon-wrap" style={{ backgroundColor: '#FEF2F2', color: '#EF4444' }}>
            <Package size={20} />
          </div>
        </div>
      </section>

      {/* Filter and Search Bar */}
      <section className="notif-filter-card" aria-label="Notification Filters">
        <div className="notif-filter-top-row">
          {/* Status Tabs */}
          <div className="notif-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={statusFilter === 'all'}
              className={`notif-tab ${statusFilter === 'all' ? 'active' : ''}`}
              onClick={() => {
                setStatusFilter('all');
                setPage(1);
              }}
            >
              All <span className="notif-tab-count">{summary.all || 0}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={statusFilter === 'unread'}
              className={`notif-tab ${statusFilter === 'unread' ? 'active' : ''}`}
              onClick={() => {
                setStatusFilter('unread');
                setPage(1);
              }}
            >
              Unread <span className="notif-tab-count">{summary.unread || 0}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={statusFilter === 'read'}
              className={`notif-tab ${statusFilter === 'read' ? 'active' : ''}`}
              onClick={() => {
                setStatusFilter('read');
                setPage(1);
              }}
            >
              Read <span className="notif-tab-count">{summary.read || 0}</span>
            </button>
          </div>

          {/* Search Input with Debounce */}
          <div className="notif-search-box">
            <Search size={16} className="notif-search-icon" />
            <input
              type="text"
              className="notif-search-input"
              placeholder="Search by title, description, ID, customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Search notifications"
            />
            {searchTerm && (
              <button
                type="button"
                className="notif-btn-icon"
                style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)' }}
                onClick={() => setSearchTerm('')}
                title="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Bottom Secondary Filter Dropdowns */}
        <div className="notif-filter-bottom-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: '#64748B' }}>
            <Filter size={14} /> Filter:
          </div>

          {/* Type Dropdown */}
          <select
            className="notif-select"
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by Type"
          >
            <option value="ALL">All Types</option>
            <option value="ORDER">Orders</option>
            <option value="PRESCRIPTION">Prescriptions</option>
            <option value="REVIEW">Reviews</option>
            <option value="INVENTORY">Inventory</option>
            <option value="CUSTOMER">Customers</option>
            <option value="PAYMENT">Payments</option>
            <option value="SYSTEM">System</option>
          </select>

          {/* Priority Dropdown */}
          <select
            className="notif-select"
            value={priorityFilter}
            onChange={(e) => {
              setPriorityFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by Priority"
          >
            <option value="ALL">All Priorities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="NORMAL">Normal</option>
            <option value="LOW">Low</option>
          </select>

          {/* Sort Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}>
            <span style={{ fontSize: '12px', color: '#64748B' }}>Sort:</span>
            <select
              className="notif-select"
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              aria-label="Sort notifications"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="highest_priority">Highest Priority</option>
              <option value="unread_first">Unread First</option>
            </select>
          </div>

          {/* Reset Filters button */}
          {(statusFilter !== 'all' || typeFilter !== 'ALL' || priorityFilter !== 'ALL' || searchTerm) && (
            <button
              type="button"
              className="notif-btn notif-btn-secondary notif-btn-sm"
              onClick={() => {
                setStatusFilter('all');
                setTypeFilter('ALL');
                setPriorityFilter('ALL');
                setSearchTerm('');
                setPage(1);
              }}
              style={{ color: '#EF4444' }}
            >
              Reset Filters
            </button>
          )}
        </div>
      </section>

      {/* Main Notifications List Container */}
      <section className="notif-list-card" aria-label="Notifications List">
        <div className="notif-list-header">
          <span>
            {loading ? 'Fetching updates...' : `Showing ${notifications.length} of ${pagination.total} notifications`}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>Per page:</span>
            <select
              className="notif-select"
              style={{ height: '28px', padding: '2px 8px', fontSize: '12px' }}
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        {/* Loading Skeleton */}
        {loading && (
          <div className="notif-items">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="notif-row" style={{ cursor: 'default' }}>
                <div className="notif-skeleton" style={{ width: '42px', height: '42px', borderRadius: '12px' }} />
                <div style={{ flex: 1 }}>
                  <div className="notif-skeleton" style={{ width: '35%', height: '16px', marginBottom: '8px' }} />
                  <div className="notif-skeleton" style={{ width: '70%', height: '14px', marginBottom: '8px' }} />
                  <div className="notif-skeleton" style={{ width: '20%', height: '12px' }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="notif-empty-state">
            <div className="notif-empty-icon" style={{ backgroundColor: '#FEF2F2', color: '#EF4444' }}>
              <AlertTriangle size={32} />
            </div>
            <div className="notif-empty-title">Unable to load notifications</div>
            <p className="notif-empty-desc">{error}</p>
            <button
              type="button"
              className="notif-btn notif-btn-primary"
              onClick={() => fetchNotifications()}
            >
              <RefreshCw size={14} /> Try Again
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && notifications.length === 0 && (
          <div className="notif-empty-state">
            <div className="notif-empty-icon">
              <Bell size={32} />
            </div>
            <div className="notif-empty-title">
              {statusFilter === 'unread' ? "You're all caught up!" : 'No notifications found'}
            </div>
            <p className="notif-empty-desc">
              {statusFilter === 'unread'
                ? 'No unread notifications at the moment. All system activities are up to date.'
                : 'No notifications match your current filter criteria. Try clearing filters or search term.'}
            </p>
            {(statusFilter !== 'all' || typeFilter !== 'ALL' || priorityFilter !== 'ALL' || searchTerm) && (
              <button
                type="button"
                className="notif-btn notif-btn-secondary"
                onClick={() => {
                  setStatusFilter('all');
                  setTypeFilter('ALL');
                  setPriorityFilter('ALL');
                  setSearchTerm('');
                  setPage(1);
                }}
              >
                Clear Filters
              </button>
            )}
          </div>
        )}

        {/* Populated Notifications */}
        {!loading && !error && notifications.length > 0 && (
          <div className="notif-items">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className={`notif-row ${!notif.is_read ? 'unread' : ''}`}
                onClick={() => handleCardClick(notif)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCardClick(notif);
                }}
                aria-label={`${notif.title}: ${notif.message}`}
              >
                {/* Dot */}
                <div className={`notif-unread-dot ${notif.is_read ? 'read' : ''}`} />

                {/* Type Icon */}
                <div className={`notif-icon-box ${String(notif.type || '').toLowerCase()}`}>
                  {renderTypeIcon(notif.type)}
                </div>

                {/* Body */}
                <div className="notif-body">
                  <div className="notif-title-row">
                    <span className="notif-title-text">{notif.title}</span>
                    {renderPriorityBadge(notif.priority)}
                    {notif.metadata?.order_number && (
                      <span className="notif-entity-tag">#{notif.metadata.order_number}</span>
                    )}
                    {notif.metadata?.prescription_number && (
                      <span className="notif-entity-tag">#{notif.metadata.prescription_number}</span>
                    )}
                    {notif.metadata?.sku && (
                      <span className="notif-entity-tag">SKU: {notif.metadata.sku}</span>
                    )}
                  </div>

                  <div className="notif-message-text">{notif.message}</div>

                  <div className="notif-meta-row">
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} /> {formatRelativeTime(notif.created_at)}
                    </span>
                    <span>•</span>
                    <span style={{ textTransform: 'capitalize' }}>{String(notif.type || '').toLowerCase()}</span>
                    {notif.is_read && notif.read_at && (
                      <>
                        <span>•</span>
                        <span style={{ color: '#10B981' }}>Read {formatRelativeTime(notif.read_at)}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="notif-actions">
                  {notif.action_url && (
                    <button
                      type="button"
                      className="notif-btn notif-btn-secondary notif-btn-sm"
                      onClick={(e) => handleActionClick(notif, e)}
                      title={`Navigate to ${getActionLabel(notif)}`}
                    >
                      <span>{getActionLabel(notif)}</span>
                      <ExternalLink size={12} />
                    </button>
                  )}

                  {!notif.is_read ? (
                    <button
                      type="button"
                      className="notif-btn-icon"
                      onClick={(e) => handleMarkAsRead(notif, e)}
                      title="Mark as read"
                      aria-label="Mark as read"
                    >
                      <Check size={16} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="notif-btn-icon"
                      onClick={(e) => handleMarkAsUnread(notif, e)}
                      title="Mark as unread"
                      aria-label="Mark as unread"
                    >
                      <Bell size={16} />
                    </button>
                  )}

                  <button
                    type="button"
                    className="notif-btn-icon danger"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteCandidate(notif);
                    }}
                    title="Delete notification"
                    aria-label="Delete notification"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination Bar */}
        {!loading && !error && pagination.totalPages > 1 && (
          <div className="notif-pagination-bar">
            <div>
              Showing {(page - 1) * limit + 1}–{Math.min(page * limit, pagination.total)} of {pagination.total} notifications
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                className="notif-btn notif-btn-secondary notif-btn-sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft size={14} /> Previous
              </button>

              <span style={{ fontSize: '12px', fontWeight: 600, padding: '0 8px' }}>
                Page {page} of {pagination.totalPages}
              </span>

              <button
                type="button"
                className="notif-btn notif-btn-secondary notif-btn-sm"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Notification Detail Modal */}
      {selectedNotification && (
        <div
          className="notif-modal-overlay"
          onClick={() => setSelectedNotification(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className="notif-modal" onClick={(e) => e.stopPropagation()}>
            <div className="notif-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className={`notif-icon-box ${String(selectedNotification.type || '').toLowerCase()}`} style={{ width: '36px', height: '36px' }}>
                  {renderTypeIcon(selectedNotification.type)}
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#1E293B' }}>
                    {selectedNotification.title}
                  </h3>
                  <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                    Type: {selectedNotification.type}
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="notif-btn-icon"
                onClick={() => setSelectedNotification(null)}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className="notif-modal-body">
              <div style={{ fontSize: '14px', lineHeight: 1.6, color: '#334155', marginBottom: '16px', background: '#F8FAFC', padding: '14px', borderRadius: '8px' }}>
                {selectedNotification.message}
              </div>

              <div className="notif-detail-grid">
                <span className="notif-detail-label">Priority:</span>
                <span className="notif-detail-value">{renderPriorityBadge(selectedNotification.priority)}</span>

                <span className="notif-detail-label">Status:</span>
                <span className="notif-detail-value" style={{ fontWeight: 600, color: selectedNotification.is_read ? '#10B981' : '#087F73' }}>
                  {selectedNotification.is_read ? 'Read' : 'Unread'}
                </span>

                <span className="notif-detail-label">Received At:</span>
                <span className="notif-detail-value">{formatDateTime(selectedNotification.created_at)}</span>

                {selectedNotification.read_at && (
                  <>
                    <span className="notif-detail-label">Read At:</span>
                    <span className="notif-detail-value">{formatDateTime(selectedNotification.read_at)}</span>
                  </>
                )}

                {selectedNotification.entity_type && (
                  <>
                    <span className="notif-detail-label">Related Entity:</span>
                    <span className="notif-detail-value" style={{ textTransform: 'capitalize' }}>
                      {selectedNotification.entity_type} (ID: {selectedNotification.entity_id})
                    </span>
                  </>
                )}

                {selectedNotification.metadata && Object.keys(selectedNotification.metadata).length > 0 && (
                  <>
                    <span className="notif-detail-label">Metadata:</span>
                    <div className="notif-detail-value">
                      <pre style={{
                        background: '#F1F5F9',
                        padding: '10px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        overflowX: 'auto',
                        margin: 0
                      }}>
                        {JSON.stringify(selectedNotification.metadata, null, 2)}
                      </pre>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="notif-modal-footer">
              <div style={{ display: 'flex', gap: '8px' }}>
                {selectedNotification.is_read ? (
                  <button
                    type="button"
                    className="notif-btn notif-btn-secondary notif-btn-sm"
                    onClick={() => {
                      handleMarkAsUnread(selectedNotification);
                      setSelectedNotification(prev => ({ ...prev, is_read: false, read_at: null }));
                    }}
                  >
                    <Bell size={14} /> Mark as Unread
                  </button>
                ) : (
                  <button
                    type="button"
                    className="notif-btn notif-btn-secondary notif-btn-sm"
                    onClick={() => {
                      handleMarkAsRead(selectedNotification);
                      setSelectedNotification(prev => ({ ...prev, is_read: true, read_at: new Date().toISOString() }));
                    }}
                  >
                    <Check size={14} /> Mark as Read
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                {selectedNotification.action_url && (
                  <button
                    type="button"
                    className="notif-btn notif-btn-primary notif-btn-sm"
                    onClick={() => {
                      const url = selectedNotification.action_url;
                      setSelectedNotification(null);
                      navigate(url);
                    }}
                  >
                    <span>{getActionLabel(selectedNotification)}</span>
                    <ExternalLink size={14} />
                  </button>
                )}
                <button
                  type="button"
                  className="notif-btn notif-btn-secondary notif-btn-sm"
                  onClick={() => setSelectedNotification(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteCandidate && (
        <div
          className="notif-modal-overlay"
          onClick={() => setDeleteCandidate(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className="notif-modal" style={{ maxWidth: '420px' }} onClick={(e) => e.stopPropagation()}>
            <div className="notif-modal-header">
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#DC2626' }}>
                Delete Notification
              </h3>
              <button
                type="button"
                className="notif-btn-icon"
                onClick={() => setDeleteCandidate(null)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="notif-modal-body">
              <p style={{ fontSize: '14px', color: '#475569', margin: '0 0 8px' }}>
                Are you sure you want to delete this notification?
              </p>
              <div style={{ background: '#F8FAFC', padding: '10px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, color: '#1E293B' }}>
                {deleteCandidate.title}
              </div>
            </div>
            <div className="notif-modal-footer" style={{ justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                className="notif-btn notif-btn-secondary notif-btn-sm"
                onClick={() => setDeleteCandidate(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="notif-btn notif-btn-danger-outline notif-btn-sm"
                onClick={confirmDelete}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear Read Notifications Modal */}
      {clearReadModalOpen && (
        <div
          className="notif-modal-overlay"
          onClick={() => setClearReadModalOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div className="notif-modal" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div className="notif-modal-header">
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#1E293B' }}>
                Clear Read Notifications
              </h3>
              <button
                type="button"
                className="notif-btn-icon"
                onClick={() => setClearReadModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="notif-modal-body">
              <p style={{ fontSize: '14px', color: '#475569', margin: 0 }}>
                This will remove all {summary.read} read notifications from your list. Unread notifications will remain intact.
              </p>
            </div>
            <div className="notif-modal-footer" style={{ justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                className="notif-btn notif-btn-secondary notif-btn-sm"
                onClick={() => setClearReadModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="notif-btn notif-btn-primary notif-btn-sm"
                onClick={confirmClearRead}
              >
                Clear Read
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
