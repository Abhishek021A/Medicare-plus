import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  Filter,
  Calendar,
  ArrowUpDown,
  RefreshCw,
  Download,
  Eye,
  Edit3,
  Printer,
  X,
  ChevronLeft,
  ChevronRight,
  ShoppingBag,
  Clock,
  Settings,
  Truck,
  CheckCircle,
  AlertCircle,
  XCircle,
  IndianRupee,
  ChevronDown,
  User,
  Package,
  RotateCcw
} from 'lucide-react';
import { adminOrderService } from '../../../services/adminApi';
import { useToast } from '../../../context/ToastContext';
import UpdateStatusModal from './UpdateStatusModal';
import PrintableInvoice from './PrintableInvoice';
import './AdminOrders.css';

export default function AdminOrders() {
  const navigate = useNavigate();
  const { addToast } = useToast();

  // Orders and summary state
  const [orders, setOrders] = useState([]);
  const [summary, setSummary] = useState({
    totalOrders: 0,
    pending: 0,
    processing: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
    revenue: 0
  });

  // Loading & action states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  // Filters & sorting state
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('All');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('All');
  const [dateRangeFilter, setDateRangeFilter] = useState('All');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [sortBy, setSortBy] = useState('latest');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Modals state
  const [statusModalOrder, setStatusModalOrder] = useState(null);
  const [invoiceModalOrder, setInvoiceModalOrder] = useState(null);
  const [preparingPrintId, setPreparingPrintId] = useState(null);

  const searchTimeoutRef = useRef(null);

  // Format currency in Indian Rupees
  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(Number(val) || 0);
  };

  // Format date for display
  const formatDate = (dateStr) => {
    if (!dateStr) return { date: 'N/A', time: '' };
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return { date: dateStr, time: '' };
      const date = d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
      const time = d.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
      return { date, time };
    } catch {
      return { date: dateStr, time: '' };
    }
  };

  // Extract initials from customer name
  const getInitials = (name) => {
    if (!name) return 'CU';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Debounce search input (350ms)
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchTerm(val);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(val);
      setCurrentPage(1);
    }, 350);
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    setCurrentPage(1);
  };

  // Fetch orders from backend
  const fetchOrders = useCallback(async (isRefreshAction = false) => {
    if (isRefreshAction) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setFetchError(null);

    try {
      const params = {
        page: currentPage,
        limit: itemsPerPage,
        search: debouncedSearch.trim(),
        status: statusFilter !== 'All' ? statusFilter : undefined,
        payment_status: paymentStatusFilter !== 'All' ? paymentStatusFilter : undefined,
        payment_method: paymentMethodFilter !== 'All' ? paymentMethodFilter : undefined,
        date_range: dateRangeFilter !== 'All' && dateRangeFilter !== 'custom' ? dateRangeFilter : undefined,
        from_date: dateRangeFilter === 'custom' && fromDate ? fromDate : undefined,
        to_date: dateRangeFilter === 'custom' && toDate ? toDate : undefined,
        sort: sortBy
      };

      // Clean undefined params
      Object.keys(params).forEach(key => params[key] === undefined && delete params[key]);

      const [ordersRes, summaryRes] = await Promise.all([
        adminOrderService.getOrders(params),
        adminOrderService.getOrderSummary()
      ]);

      if (ordersRes.success) {
        setOrders(ordersRes.data?.orders || ordersRes.orders || []);
        const pagination = ordersRes.data?.pagination || ordersRes.pagination || {};
        setTotalOrders(pagination.total || 0);
        setTotalPages(pagination.totalPages || 1);
      } else {
        throw new Error(ordersRes.message || 'Failed to fetch orders');
      }

      if (summaryRes.success) {
        setSummary(summaryRes.data || summaryRes.summary || {
          totalOrders: 0,
          pending: 0,
          processing: 0,
          shipped: 0,
          delivered: 0,
          cancelled: 0,
          revenue: 0
        });
      }
    } catch (err) {
      console.error('Error fetching admin orders:', err);
      const msg = err.response?.data?.message || err.message || 'Something went wrong while loading order data.';
      setFetchError(msg);
      if (isRefreshAction) {
        addToast?.('Failed to refresh orders: ' + msg, 'error');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentPage, itemsPerPage, debouncedSearch, statusFilter, paymentStatusFilter, paymentMethodFilter, dateRangeFilter, fromDate, toDate, sortBy, addToast]);

  // Load orders when filters or pagination changes
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Refresh handler
  const handleRefresh = () => {
    fetchOrders(true);
  };

  // Reset all filters
  const handleClearFilters = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    setStatusFilter('All');
    setPaymentStatusFilter('All');
    setPaymentMethodFilter('All');
    setDateRangeFilter('All');
    setFromDate('');
    setToDate('');
    setSortBy('latest');
    setCurrentPage(1);
  };

  // Export orders to CSV
  const handleExport = async () => {
    try {
      setIsExporting(true);
      const params = {
        search: debouncedSearch.trim() || undefined,
        status: statusFilter !== 'All' ? statusFilter : undefined,
        payment_status: paymentStatusFilter !== 'All' ? paymentStatusFilter : undefined,
        payment_method: paymentMethodFilter !== 'All' ? paymentMethodFilter : undefined,
        from_date: dateRangeFilter === 'custom' && fromDate ? fromDate : undefined,
        to_date: dateRangeFilter === 'custom' && toDate ? toDate : undefined
      };

      Object.keys(params).forEach(key => params[key] === undefined && delete params[key]);

      const res = await adminOrderService.exportOrders(params);
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        // Convert array of objects to CSV
        const headers = Object.keys(res.data[0]);
        const csvRows = [
          headers.join(','),
          ...res.data.map(row => 
            headers.map(fieldName => {
              const val = row[fieldName] !== null && row[fieldName] !== undefined ? String(row[fieldName]) : '';
              return `"${val.replace(/"/g, '""')}"`;
            }).join(',')
          )
        ];
        const csvString = csvRows.join('\r\n');
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `medicare_orders_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        addToast?.(`Exported ${res.data.length} orders successfully.`, 'success');
      } else {
        addToast?.('No orders available to export with current filters.', 'warning');
      }
    } catch (err) {
      console.error('Export orders error:', err);
      addToast?.('Failed to export orders. Please try again.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // Print button handler with full order fetch & preparation state
  const handlePrintClick = async (orderId, e) => {
    e?.stopPropagation();
    if (preparingPrintId) return;

    setPreparingPrintId(orderId);
    try {
      const res = await adminOrderService.getOrderDetails(orderId);
      if (res && res.success) {
        const fullOrder = res.order || res.data;
        setInvoiceModalOrder(fullOrder);
      } else {
        throw new Error(res?.message || 'Failed to load order details');
      }
    } catch (err) {
      console.error('Error fetching order for invoice print:', err);
      addToast?.('Unable to load order details for print. Please try again.', 'error');
    } finally {
      setPreparingPrintId(null);
    }
  };

  // Callback when order status updated via modal
  const handleOrderStatusUpdated = (updatedOrder) => {
    if (!updatedOrder || !updatedOrder.id) return;
    // Update local orders list immediately
    setOrders(prev => prev.map(o => o.id === updatedOrder.id ? { ...o, ...updatedOrder } : o));
    // Refresh summary metrics from server
    adminOrderService.getOrderSummary().then(res => {
      if (res.success) setSummary(res.data);
    }).catch(console.error);
  };

  // Helper CSS class for Order Status badge
  const getStatusBadgeClass = (status) => {
    const s = String(status || '').toUpperCase();
    switch (s) {
      case 'PENDING':
        return 'status-pending';
      case 'CONFIRMED':
      case 'PROCESSING':
      case 'PACKED':
        return 'status-processing';
      case 'SHIPPED':
      case 'OUT_FOR_DELIVERY':
        return 'status-shipped';
      case 'DELIVERED':
        return 'status-delivered';
      case 'CANCELLED':
      case 'RETURNED':
      case 'REFUNDED':
        return 'status-cancelled';
      default:
        return 'status-pending';
    }
  };

  // Helper CSS style for Payment Status badge
  const getPaymentBadgeStyle = (status) => {
    const s = String(status || '').toUpperCase();
    switch (s) {
      case 'PAID':
        return { backgroundColor: '#ECFDF5', color: '#065F46', border: '1px solid #A7F3D0' };
      case 'PENDING':
        return { backgroundColor: '#FFFBEB', color: '#92400E', border: '1px solid #FDE68A' };
      case 'FAILED':
      case 'REFUNDED':
        return { backgroundColor: '#FEF2F2', color: '#991B1B', border: '1px solid #FECACA' };
      default:
        return { backgroundColor: '#F1F5F9', color: '#475569', border: '1px solid #CBD5E1' };
    }
  };

  // Format order status label for presentation
  const formatStatusLabel = (status) => {
    if (!status) return 'Pending';
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const hasActiveFilters = Boolean(
    debouncedSearch ||
    statusFilter !== 'All' ||
    paymentStatusFilter !== 'All' ||
    paymentMethodFilter !== 'All' ||
    dateRangeFilter !== 'All' ||
    sortBy !== 'latest'
  );

  return (
    <div className="orders-page-wrapper">
      {/* 1. Page Header & Breadcrumb */}
      <div className="ord-header">
        <div>
          <div className="ord-breadcrumb">
            <Link to="/admin">Admin</Link>
            <span className="separator">&gt;</span>
            <span className="current">Orders</span>
          </div>
          <h1 className="ord-header-title">Orders</h1>
          <p className="ord-header-subtitle">
            Manage customer orders, payments, fulfillment, and delivery.
          </p>
        </div>
        <div className="ord-header-actions">
          <button
            type="button"
            className="ord-btn ord-btn-outline"
            onClick={handleExport}
            disabled={isExporting || loading}
            aria-label="Export Orders to CSV"
          >
            <Download size={16} />
            {isExporting ? 'Exporting...' : 'Export Orders'}
          </button>
          <button
            type="button"
            className="ord-btn ord-btn-primary"
            onClick={handleRefresh}
            disabled={refreshing || loading}
            aria-label="Refresh Orders"
          >
            <RefreshCw size={16} className={refreshing ? 'spin-anim' : ''} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* 2. Premium Order Summary Cards (7 Cards) */}
      <div className="ord-summary-grid">
        {/* Total Orders */}
        <div className="ord-card ord-card-total">
          <div className="ord-card-header">
            <span className="ord-card-title">Total Orders</span>
            <div className="ord-card-icon-wrap icon-total">
              <ShoppingBag size={20} />
            </div>
          </div>
          <div>
            <div className="ord-card-value">
              {loading && !refreshing ? '...' : (summary.totalOrders || 0)}
            </div>
            <div className="ord-card-subtext">All historical orders</div>
          </div>
        </div>

        {/* Pending */}
        <div className="ord-card ord-card-pending">
          <div className="ord-card-header">
            <span className="ord-card-title">Pending</span>
            <div className="ord-card-icon-wrap icon-pending">
              <Clock size={20} />
            </div>
          </div>
          <div>
            <div className="ord-card-value">
              {loading && !refreshing ? '...' : (summary.pending || 0)}
            </div>
            <div className="ord-card-subtext">Awaiting confirmation</div>
          </div>
        </div>

        {/* Processing */}
        <div className="ord-card ord-card-processing">
          <div className="ord-card-header">
            <span className="ord-card-title">Processing</span>
            <div className="ord-card-icon-wrap icon-processing">
              <Settings size={20} />
            </div>
          </div>
          <div>
            <div className="ord-card-value">
              {loading && !refreshing ? '...' : (summary.processing || 0)}
            </div>
            <div className="ord-card-subtext">Confirmed & packing</div>
          </div>
        </div>

        {/* Shipped */}
        <div className="ord-card ord-card-shipped">
          <div className="ord-card-header">
            <span className="ord-card-title">Shipped</span>
            <div className="ord-card-icon-wrap icon-shipped">
              <Truck size={20} />
            </div>
          </div>
          <div>
            <div className="ord-card-value">
              {loading && !refreshing ? '...' : (summary.shipped || 0)}
            </div>
            <div className="ord-card-subtext">In-transit delivery</div>
          </div>
        </div>

        {/* Delivered */}
        <div className="ord-card ord-card-delivered">
          <div className="ord-card-header">
            <span className="ord-card-title">Delivered</span>
            <div className="ord-card-icon-wrap icon-delivered">
              <CheckCircle size={20} />
            </div>
          </div>
          <div>
            <div className="ord-card-value">
              {loading && !refreshing ? '...' : (summary.delivered || 0)}
            </div>
            <div className="ord-card-subtext">Successfully fulfilled</div>
          </div>
        </div>

        {/* Cancelled */}
        <div className="ord-card ord-card-cancelled">
          <div className="ord-card-header">
            <span className="ord-card-title">Cancelled</span>
            <div className="ord-card-icon-wrap icon-cancelled">
              <XCircle size={20} />
            </div>
          </div>
          <div>
            <div className="ord-card-value">
              {loading && !refreshing ? '...' : (summary.cancelled || 0)}
            </div>
            <div className="ord-card-subtext">Cancelled / Restocked</div>
          </div>
        </div>

        {/* Total Revenue */}
        <div className="ord-card ord-card-revenue">
          <div className="ord-card-header">
            <span className="ord-card-title">Total Revenue</span>
            <div className="ord-card-icon-wrap icon-revenue">
              <IndianRupee size={20} />
            </div>
          </div>
          <div>
            <div className="ord-card-value">
              {loading && !refreshing ? '...' : formatCurrency(summary.revenue || 0)}
            </div>
            <div className="ord-card-subtext">Realized from active orders</div>
          </div>
        </div>
      </div>

      {/* 3. Search + Filter Toolbar */}
      <div className="ord-toolbar-card">
        {/* Search */}
        <div className="ord-search-container">
          <Search size={18} className="ord-search-icon" />
          <input
            type="text"
            className="ord-search-input"
            placeholder="Search order ID, customer name, email, phone..."
            value={searchTerm}
            onChange={handleSearchChange}
            aria-label="Search orders"
          />
          {searchTerm && (
            <button
              type="button"
              className="ord-search-clear"
              onClick={handleClearSearch}
              aria-label="Clear search input"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Filter Dropdowns */}
        <div className="ord-filters-group">
          {/* Order Status */}
          <div className="ord-select-wrapper">
            <select
              className="ord-select"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              aria-label="Filter by order status"
            >
              <option value="All">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="PROCESSING">Processing</option>
              <option value="PACKED">Packed</option>
              <option value="SHIPPED">Shipped</option>
              <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
              <option value="DELIVERED">Delivered</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="RETURNED">Returned</option>
              <option value="REFUNDED">Refunded</option>
            </select>
            <ChevronDown size={14} className="ord-select-arrow" />
          </div>

          {/* Payment Status */}
          <div className="ord-select-wrapper">
            <select
              className="ord-select"
              value={paymentStatusFilter}
              onChange={(e) => { setPaymentStatusFilter(e.target.value); setCurrentPage(1); }}
              aria-label="Filter by payment status"
            >
              <option value="All">All Payments</option>
              <option value="PENDING">Pending</option>
              <option value="PAID">Paid</option>
              <option value="FAILED">Failed</option>
              <option value="REFUNDED">Refunded</option>
              <option value="PARTIALLY_REFUNDED">Partially Refunded</option>
            </select>
            <ChevronDown size={14} className="ord-select-arrow" />
          </div>

          {/* Payment Method */}
          <div className="ord-select-wrapper">
            <select
              className="ord-select"
              value={paymentMethodFilter}
              onChange={(e) => { setPaymentMethodFilter(e.target.value); setCurrentPage(1); }}
              aria-label="Filter by payment method"
            >
              <option value="All">All Methods</option>
              <option value="COD">Cash on Delivery</option>
              <option value="ONLINE">Razorpay / Online</option>
              <option value="UPI">UPI</option>
              <option value="CARD">Card</option>
              <option value="NET_BANKING">Net Banking</option>
            </select>
            <ChevronDown size={14} className="ord-select-arrow" />
          </div>

          {/* Date Range */}
          <div className="ord-select-wrapper">
            <select
              className="ord-select"
              value={dateRangeFilter}
              onChange={(e) => { setDateRangeFilter(e.target.value); setCurrentPage(1); }}
              aria-label="Filter by date range"
            >
              <option value="All">All Dates</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="last_7_days">Last 7 Days</option>
              <option value="last_30_days">Last 30 Days</option>
              <option value="this_month">This Month</option>
              <option value="last_month">Last Month</option>
              <option value="custom">Custom Range</option>
            </select>
            <ChevronDown size={14} className="ord-select-arrow" />
          </div>

          {/* Sort */}
          <div className="ord-select-wrapper">
            <select
              className="ord-select"
              value={sortBy}
              onChange={(e) => { setSortBy(e.target.value); setCurrentPage(1); }}
              aria-label="Sort orders"
            >
              <option value="latest">Latest Orders</option>
              <option value="oldest">Oldest Orders</option>
              <option value="highest_amount">Highest Amount</option>
              <option value="lowest_amount">Lowest Amount</option>
              <option value="customer_asc">Customer A-Z</option>
              <option value="customer_desc">Customer Z-A</option>
            </select>
            <ChevronDown size={14} className="ord-select-arrow" />
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              type="button"
              className="ord-btn ord-btn-outline ord-btn-sm"
              onClick={handleClearFilters}
              aria-label="Clear all applied filters"
              style={{ color: '#EF4444' }}
            >
              <RotateCcw size={14} />
              Clear Filters
            </button>
          )}
        </div>

        {/* Custom Date Range Row */}
        {dateRangeFilter === 'custom' && (
          <div className="ord-custom-date-row">
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ord-text-muted)' }}>
              From:
            </span>
            <input
              type="date"
              className="ord-date-input"
              value={fromDate}
              onChange={(e) => { setFromDate(e.target.value); setCurrentPage(1); }}
            />
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ord-text-muted)' }}>
              To:
            </span>
            <input
              type="date"
              className="ord-date-input"
              value={toDate}
              onChange={(e) => { setToDate(e.target.value); setCurrentPage(1); }}
            />
          </div>
        )}
      </div>

      {/* 4. Orders Table / States */}
      <div className="ord-table-card">
        {fetchError ? (
          /* Error State */
          <div className="ord-error-state">
            <div className="ord-error-icon">
              <AlertCircle size={32} />
            </div>
            <h2 className="ord-error-title">Unable to load orders</h2>
            <p className="ord-error-desc">{fetchError}</p>
            <button
              type="button"
              className="ord-btn ord-btn-primary"
              onClick={() => fetchOrders()}
            >
              Try Again
            </button>
          </div>
        ) : loading && !refreshing ? (
          /* Skeleton Loading State */
          <div className="ord-table-responsive">
            <table className="ord-table">
              <thead>
                <tr>
                  <th>ORDER</th>
                  <th>CUSTOMER</th>
                  <th>DATE</th>
                  <th>ITEMS</th>
                  <th>TOTAL</th>
                  <th>PAYMENT</th>
                  <th>STATUS</th>
                  <th style={{ textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {[...Array(itemsPerPage > 6 ? 6 : itemsPerPage)].map((_, i) => (
                  <tr key={i}>
                    <td><div className="ord-skeleton-line" style={{ width: '85px' }} /></td>
                    <td>
                      <div className="ord-customer-cell">
                        <div className="ord-skeleton-avatar" />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div className="ord-skeleton-line" style={{ width: '120px' }} />
                          <div className="ord-skeleton-line" style={{ width: '150px' }} />
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div className="ord-skeleton-line" style={{ width: '80px' }} />
                        <div className="ord-skeleton-line" style={{ width: '50px' }} />
                      </div>
                    </td>
                    <td><div className="ord-skeleton-line" style={{ width: '60px' }} /></td>
                    <td><div className="ord-skeleton-line" style={{ width: '80px' }} /></td>
                    <td><div className="ord-skeleton-badge" /></td>
                    <td><div className="ord-skeleton-badge" /></td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="ord-skeleton-line" style={{ width: '70px', marginLeft: 'auto' }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : orders.length === 0 ? (
          /* Empty State */
          <div className="ord-empty-state">
            <div className="ord-empty-icon">
              <Package size={34} />
            </div>
            <h2 className="ord-empty-title">
              {hasActiveFilters ? 'No matching orders found' : 'No orders have been placed yet'}
            </h2>
            <p className="ord-empty-desc">
              {hasActiveFilters
                ? 'Try adjusting your search criteria, date ranges, or status filters.'
                : 'Customer checkout orders will automatically populate here.'}
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                className="ord-btn ord-btn-outline"
                onClick={handleClearFilters}
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          /* Orders Table */
          <div className="ord-table-responsive">
            <table className="ord-table">
              <thead>
                <tr>
                  <th>ORDER</th>
                  <th>CUSTOMER</th>
                  <th>DATE</th>
                  <th>ITEMS</th>
                  <th>TOTAL</th>
                  <th>PAYMENT</th>
                  <th>STATUS</th>
                  <th style={{ textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const { date, time } = formatDate(order.created_at);
                  const itemCount = Number(order.item_count || 1);
                  const formattedTotal = formatCurrency(order.total_amount);

                  return (
                    <tr
                      key={order.id}
                      onClick={() => navigate(`/admin/orders/${order.id}`)}
                      style={{ cursor: 'pointer' }}
                    >
                      {/* Order Number */}
                      <td>
                        <Link
                          to={`/admin/orders/${order.id}`}
                          className="ord-num-link"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {order.order_number || `#ORD-${String(order.id).padStart(4, '0')}`}
                        </Link>
                      </td>

                      {/* Customer */}
                      <td>
                        <div className="ord-customer-cell">
                          <div className="ord-avatar">
                            {getInitials(order.customer_name)}
                          </div>
                          <div className="ord-customer-info">
                            <span className="ord-customer-name">
                              {order.customer_name || 'Registered Customer'}
                            </span>
                            <span className="ord-customer-sub">
                              {order.customer_email || 'No email registered'}
                            </span>
                            {order.customer_phone && (
                              <span className="ord-customer-sub" style={{ fontSize: '11px', color: '#64748B' }}>
                                {order.customer_phone}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Date & Time */}
                      <td>
                        <div className="ord-date-cell">
                          <span className="ord-date-main">{date}</span>
                          <span className="ord-date-time">{time}</span>
                        </div>
                      </td>

                      {/* Items */}
                      <td>
                        <span className="ord-items-badge">
                          {itemCount} {itemCount === 1 ? 'item' : 'items'}
                        </span>
                      </td>

                      {/* Total */}
                      <td>
                        <span className="ord-total-price">{formattedTotal}</span>
                      </td>

                      {/* Payment */}
                      <td>
                        <div className="ord-payment-cell">
                          <span
                            className="ord-pay-badge"
                            style={getPaymentBadgeStyle(order.payment_status)}
                          >
                            {order.payment_status || 'PENDING'}
                          </span>
                          <span className="ord-pay-method">
                            {order.payment_method === 'COD'
                              ? 'Cash on Delivery'
                              : (order.payment_method || 'Online Payment')}
                          </span>
                        </div>
                      </td>

                      {/* Order Status */}
                      <td>
                        <span className={`ord-status-badge ${getStatusBadgeClass(order.order_status)}`}>
                          <span className="ord-status-dot" />
                          {formatStatusLabel(order.order_status)}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'right' }}>
                        <div
                          className="ord-row-actions"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {/* View details */}
                          <Link
                            to={`/admin/orders/${order.id}`}
                            className="ord-action-btn"
                            title="View Full Order Details"
                            aria-label={`View order ${order.order_number}`}
                          >
                            <Eye size={14} />
                            View
                          </Link>

                          {/* Quick Status Update */}
                          <button
                            type="button"
                            className="ord-action-btn ord-action-btn-primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              setStatusModalOrder(order);
                            }}
                            title="Update Order Status"
                            aria-label={`Update order status for ${order.order_number || order.id}`}
                          >
                            <Edit3 size={14} />
                            <span>Status</span>
                          </button>

                          {/* Quick Print Invoice */}
                          <button
                            type="button"
                            className="ord-action-btn"
                            onClick={(e) => handlePrintClick(order.id, e)}
                            disabled={preparingPrintId === order.id}
                            title="Print Invoice"
                            aria-label={`Print invoice for ${order.order_number || order.id}`}
                          >
                            {preparingPrintId === order.id ? (
                              <>
                                <RefreshCw size={13} className="spin-anim" />
                                <span style={{ fontSize: '11px' }}>Preparing...</span>
                              </>
                            ) : (
                              <Printer size={14} />
                            )}
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

        {/* 5. Pagination */}
        {!loading && orders.length > 0 && (
          <div className="ord-pagination-bar">
            <div className="ord-pagination-info">
              <span>
                Showing <strong>{((currentPage - 1) * itemsPerPage) + 1}</strong> to{' '}
                <strong>{Math.min(currentPage * itemsPerPage, totalOrders)}</strong> of{' '}
                <strong>{totalOrders}</strong> orders
              </span>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>Per page:</span>
                <select
                  className="ord-page-size-select"
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  aria-label="Orders per page"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </label>
            </div>

            <div className="ord-pagination-nav">
              <button
                type="button"
                className="ord-page-num-btn"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                aria-label="Previous page"
              >
                <ChevronLeft size={16} />
              </button>

              {Array.from({ length: totalPages }, (_, idx) => idx + 1)
                .filter(page => (
                  page === 1 ||
                  page === totalPages ||
                  (page >= currentPage - 1 && page <= currentPage + 1)
                ))
                .map((page, idx, arr) => {
                  const showEllipsis = idx > 0 && page - arr[idx - 1] > 1;
                  return (
                    <React.Fragment key={page}>
                      {showEllipsis && <span style={{ padding: '0 4px', color: '#94A3B8' }}>...</span>}
                      <button
                        type="button"
                        className={`ord-page-num-btn ${currentPage === page ? 'active' : ''}`}
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </button>
                    </React.Fragment>
                  );
                })}

              <button
                type="button"
                className="ord-page-num-btn"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                aria-label="Next page"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Quick Status Update Modal */}
      {statusModalOrder && (
        <UpdateStatusModal
          isOpen={Boolean(statusModalOrder)}
          order={statusModalOrder}
          onClose={() => setStatusModalOrder(null)}
          onSuccess={handleOrderStatusUpdated}
        />
      )}

      {/* Quick Printable Invoice Modal */}
      {invoiceModalOrder && (
        <PrintableInvoice
          isOpen={Boolean(invoiceModalOrder)}
          order={invoiceModalOrder}
          onClose={() => setInvoiceModalOrder(null)}
        />
      )}
    </div>
  );
}
