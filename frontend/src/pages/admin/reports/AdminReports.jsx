import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingBag,
  Users,
  CreditCard,
  Package,
  Tag,
  Star,
  FileText,
  AlertCircle,
  RefreshCw,
  Download,
  Printer,
  ChevronRight,
  Filter,
  Calendar,
  Layers,
  Award,
  CheckCircle2,
  Clock,
  XCircle,
  ShieldCheck,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  Sparkles,
  HelpCircle,
  Eye
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { adminReportService } from '../../../services/adminApi';
import { formatPrice, formatNumber } from '../../../utils/formatPrice';
import './AdminReports.css';

// Chart Theme Palette
const PALETTE = {
  primary: '#087F73',
  primaryLight: '#E6F7F5',
  tealDark: '#06635A',
  secondary: '#2563EB',
  purple: '#7C3AED',
  amber: '#F59E0B',
  emerald: '#10B981',
  rose: '#EF4444',
  cyan: '#06B6D4',
  indigo: '#4F46E5',
  slate: '#64748B'
};

const PIE_COLORS = [
  '#087F73', '#2563EB', '#10B981', '#F59E0B', '#7C3AED',
  '#EC4899', '#06B6D4', '#64748B', '#F97316', '#6366F1'
];

export default function AdminReports() {
  // Preset & Date Filter State
  const [preset, setPreset] = useState('30days');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [comparePrevious, setComparePrevious] = useState(true);

  // Secondary Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');

  // UI Interactive States
  const [salesMetric, setSalesMetric] = useState('sales'); // 'sales' | 'orders' | 'units'
  const [topProductsLimit, setTopProductsLimit] = useState(5);
  const [topCategoriesSort, setTopCategoriesSort] = useState('revenue'); // 'revenue' | 'orders'
  const [dailySalesSort, setDailySalesSort] = useState('date');
  const [dailySalesSortDir, setDailySalesSortDir] = useState('desc');
  const [dailyPage, setDailyPage] = useState(1);
  const [dailyPerPage, setDailyPerPage] = useState(10);

  // Async States
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [reportData, setReportData] = useState(null);

  // Fetch Reports from API
  const fetchReports = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const params = {
        preset,
        compare: comparePrevious ? '1' : '0'
      };

      if (preset === 'custom') {
        if (dateFrom) params.date_from = dateFrom;
        if (dateTo) params.date_to = dateTo;
      }
      if (statusFilter) params.status = statusFilter;
      if (categoryFilter) params.category_id = categoryFilter;
      if (paymentFilter) params.payment_method = paymentFilter;

      const response = await adminReportService.getDashboardReports(params);

      if (response && response.success) {
        setReportData(response.data);
      } else {
        throw new Error(response?.message || 'Failed to retrieve reports from server');
      }
    } catch (err) {
      console.error('Error fetching admin reports:', err);
      setError(err?.response?.data?.message || err.message || 'Unable to load reports. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [preset, dateFrom, dateTo, comparePrevious, statusFilter, categoryFilter, paymentFilter]);

  // Initial Load & On Filter Changes
  useEffect(() => {
    if (preset !== 'custom' || (dateFrom && dateTo)) {
      fetchReports();
    }
  }, [fetchReports, preset]);

  // Quick Preset Selection Handler
  const handlePresetSelect = (newPreset) => {
    setPreset(newPreset);
    setDailyPage(1);
  };

  // Custom Date Apply
  const handleCustomDateSubmit = (e) => {
    e.preventDefault();
    if (!dateFrom || !dateTo) return;
    setPreset('custom');
    setDailyPage(1);
    fetchReports();
  };

  // CSV Export Handler
  const handleExportCSV = () => {
    if (!reportData) return;

    try {
      const summary = reportData.summary || {};
      const dailySales = reportData.daily_sales || [];
      const topProducts = reportData.top_products || [];
      const categories = reportData.top_categories || [];

      let csv = `MEDICARE PLUS - REPORTS & ANALYTICS EXPORT\n`;
      csv += `Generated On: ${new Date().toLocaleString()}\n`;
      csv += `Period: ${reportData.meta?.date_from} to ${reportData.meta?.date_to}\n\n`;

      csv += `--- KPI SUMMARY ---\n`;
      csv += `Metric,Current,Previous,Change (%)\n`;
      csv += `Total Sales,${summary.total_sales || 0},${summary.prev_total_sales || 0},${summary.sales_change_pct}%\n`;
      csv += `Total Orders,${summary.total_orders || 0},${summary.prev_total_orders || 0},${summary.orders_change_pct}%\n`;
      csv += `Total Customers,${summary.total_customers || 0},${summary.prev_total_customers || 0},${summary.customers_change_pct}%\n`;
      csv += `Average Order Value,${summary.avg_order_value || 0},${summary.prev_avg_order_value || 0},${summary.aov_change_pct}%\n`;
      csv += `Products Sold,${summary.products_sold || 0},${summary.prev_products_sold || 0},${summary.products_sold_change_pct}%\n`;
      csv += `Total Discount,${summary.total_discount || 0},${summary.prev_total_discount || 0},${summary.discount_change_pct}%\n\n`;

      csv += `--- DAILY SALES ---\n`;
      csv += `Date,Orders,Gross Sales,Discount,Net Sales,AOV\n`;
      dailySales.forEach(row => {
        csv += `"${row.date}",${row.order_count},${row.gross_sales},${row.discount},${row.net_sales},${row.avg_order_value}\n`;
      });
      csv += `\n`;

      csv += `--- TOP PRODUCTS ---\n`;
      csv += `Product,SKU,Units Sold,Orders,Revenue\n`;
      topProducts.forEach(prod => {
        csv += `"${prod.name}","${prod.sku || ''}",${prod.units_sold},${prod.order_count},${prod.revenue}\n`;
      });
      csv += `\n`;

      csv += `--- TOP CATEGORIES ---\n`;
      csv += `Category,Orders,Units Sold,Revenue,Share (%)\n`;
      categories.forEach(cat => {
        csv += `"${cat.category_name}",${cat.order_count},${cat.units_sold},${cat.revenue},${cat.share_pct}%\n`;
      });

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `medicare_plus_reports_${reportData.meta?.date_from}_${reportData.meta?.date_to}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export CSV:', err);
      alert('Unable to export CSV. Please try again.');
    }
  };

  // Print Handler
  const handlePrint = () => {
    window.print();
  };

  // Trend Badge Component
  const renderTrendBadge = (changePct, isInverse = false) => {
    if (changePct === null || changePct === undefined || changePct === 'N/A') {
      return (
        <span className="rep-trend-pill neutral" title="No previous period comparison available">
          N/A
        </span>
      );
    }

    const num = Number(changePct);
    if (isNaN(num)) {
      return <span className="rep-trend-pill neutral">{changePct}</span>;
    }

    const isPositive = num > 0;
    const isZero = num === 0;

    let isGood = isPositive;
    if (isInverse) isGood = !isPositive;

    const badgeClass = isZero ? 'neutral' : (isGood ? 'up' : 'down');

    return (
      <span className={`rep-trend-pill ${badgeClass}`}>
        {!isZero && (isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />)}
        {isPositive ? `+${num}%` : `${num}%`}
      </span>
    );
  };

  // Custom Chart Tooltips
  const CustomSalesTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '8px',
          padding: '10px 14px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          fontSize: '12px'
        }}>
          <div style={{ fontWeight: 700, color: '#1E293B', marginBottom: '6px' }}>{label}</div>
          <div style={{ color: PALETTE.primary, fontWeight: 600 }}>
            Sales: {formatPrice(data.sales)}
          </div>
          <div style={{ color: PALETTE.secondary, fontWeight: 600, marginTop: '2px' }}>
            Orders: {formatNumber(data.orders)}
          </div>
          <div style={{ color: PALETTE.emerald, fontWeight: 600, marginTop: '2px' }}>
            Units Sold: {formatNumber(data.units)}
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomPieTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '8px',
          padding: '8px 12px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          fontSize: '12px'
        }}>
          <div style={{ fontWeight: 700, color: '#1E293B' }}>{data.name || data.status || data.category_name}</div>
          <div style={{ color: data.color || PALETTE.primary, fontWeight: 600, marginTop: '4px' }}>
            {data.revenue !== undefined ? `Revenue: ${formatPrice(data.revenue)}` : `Orders: ${formatNumber(data.count)}`}
          </div>
          {data.percentage !== undefined && (
            <div style={{ color: '#64748B', fontSize: '11px', marginTop: '2px' }}>
              Share: {data.percentage}%
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  // Paginated and Sorted Daily Sales Table
  const sortedDailySales = useMemo(() => {
    if (!reportData?.daily_sales) return [];
    const list = [...reportData.daily_sales];

    list.sort((a, b) => {
      let valA = a[dailySalesSort];
      let valB = b[dailySalesSort];

      if (dailySalesSort === 'date') {
        valA = new Date(valA).getTime();
        valB = new Date(valB).getTime();
      } else {
        valA = Number(valA) || 0;
        valB = Number(valB) || 0;
      }

      if (dailySalesSortDir === 'asc') {
        return valA > valB ? 1 : -1;
      }
      return valA < valB ? 1 : -1;
    });

    return list;
  }, [reportData?.daily_sales, dailySalesSort, dailySalesSortDir]);

  const totalDailyPages = Math.max(1, Math.ceil(sortedDailySales.length / dailyPerPage));
  const paginatedDailySales = useMemo(() => {
    const start = (dailyPage - 1) * dailyPerPage;
    return sortedDailySales.slice(start, start + dailyPerPage);
  }, [sortedDailySales, dailyPage, dailyPerPage]);

  const handleDailySort = (col) => {
    if (dailySalesSort === col) {
      setDailySalesSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setDailySalesSort(col);
      setDailySalesSortDir('desc');
    }
  };

  // Filter options derived from API or standard Medicare PLUS statuses
  const availableStatuses = [
    { value: '', label: 'All Statuses' },
    { value: 'DELIVERED', label: 'Delivered' },
    { value: 'SHIPPED', label: 'Shipped' },
    { value: 'PROCESSING', label: 'Processing' },
    { value: 'CONFIRMED', label: 'Confirmed' },
    { value: 'PENDING', label: 'Pending' },
    { value: 'CANCELLED', label: 'Cancelled' }
  ];

  const availablePayments = [
    { value: '', label: 'All Payment Methods' },
    { value: 'ONLINE', label: 'Online' },
    { value: 'CASH_ON_DELIVERY', label: 'Cash on Delivery' },
    { value: 'RAZORPAY', label: 'Razorpay' }
  ];

  // Loading Skeleton View
  if (loading && !reportData) {
    return (
      <div className="rep-page-wrapper">
        <div className="rep-header">
          <div>
            <div className="rep-skeleton" style={{ width: '140px', height: '18px', marginBottom: '8px' }} />
            <div className="rep-skeleton" style={{ width: '260px', height: '32px', marginBottom: '8px' }} />
            <div className="rep-skeleton" style={{ width: '380px', height: '16px' }} />
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <div className="rep-skeleton" style={{ width: '100px', height: '40px' }} />
            <div className="rep-skeleton" style={{ width: '100px', height: '40px' }} />
          </div>
        </div>

        {/* Filter bar skeleton */}
        <div className="rep-filter-card" style={{ marginBottom: '24px' }}>
          <div className="rep-skeleton" style={{ width: '100%', height: '42px' }} />
        </div>

        {/* KPI Skeletons */}
        <div className="rep-kpi-grid">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="rep-kpi-card">
              <div className="rep-skeleton" style={{ width: '60%', height: '14px', marginBottom: '12px' }} />
              <div className="rep-skeleton" style={{ width: '80%', height: '28px', marginBottom: '10px' }} />
              <div className="rep-skeleton" style={{ width: '45%', height: '14px' }} />
            </div>
          ))}
        </div>

        {/* Charts Grid Skeletons */}
        <div className="rep-charts-grid-2">
          <div className="rep-chart-card">
            <div className="rep-skeleton" style={{ width: '30%', height: '20px', marginBottom: '16px' }} />
            <div className="rep-skeleton" style={{ width: '100%', height: '280px' }} />
          </div>
          <div className="rep-chart-card">
            <div className="rep-skeleton" style={{ width: '40%', height: '20px', marginBottom: '16px' }} />
            <div className="rep-skeleton" style={{ width: '100%', height: '280px' }} />
          </div>
        </div>
      </div>
    );
  }

  // Error State View
  if (error && !reportData) {
    return (
      <div className="rep-page-wrapper">
        <div className="rep-empty-card" style={{ padding: '60px 20px', textAlign: 'center' }}>
          <div className="rep-empty-icon" style={{ margin: '0 auto 16px', color: '#EF4444' }}>
            <AlertCircle size={48} />
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1E293B', marginBottom: '8px' }}>
            Unable to load reports
          </h2>
          <p style={{ color: '#64748B', maxWidth: '420px', margin: '0 auto 20px', fontSize: '14px' }}>
            {error}
          </p>
          <button
            className="rep-btn rep-btn-primary"
            onClick={() => fetchReports()}
            style={{ margin: '0 auto' }}
          >
            <RefreshCw size={15} /> Try Again
          </button>
        </div>
      </div>
    );
  }

  const {
    summary = {},
    sales_trend = [],
    order_status = [],
    category_sales = [],
    payment_methods = [],
    top_products = [],
    top_categories = [],
    top_brands = [],
    customer_analytics = {},
    coupon_analytics = {},
    inventory_overview = {},
    review_analytics = {},
    prescription_analytics = {},
    meta = {}
  } = reportData || {};

  // Check if completely empty
  const hasOrders = (summary.total_orders || 0) > 0;

  return (
    <div className="rep-page-wrapper">
      {/* Hidden Header for High-Polish Print Layout */}
      <div className="rep-print-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#087F73', margin: 0 }}>
              Medicare PLUS — Official Analytics Report
            </h1>
            <p style={{ fontSize: '13px', color: '#475569', margin: '4px 0 0' }}>
              Reporting Period: {meta.date_from} to {meta.date_to} ({meta.period_label || preset})
            </p>
          </div>
          <div style={{ textAlign: 'right', fontSize: '12px', color: '#64748B' }}>
            <div>Printed On: {new Date().toLocaleString()}</div>
            <div>Confidential & Proprietary</div>
          </div>
        </div>
      </div>

      {/* Main Page Header */}
      <header className="rep-header">
        <div className="rep-title-wrap">
          <nav className="rep-breadcrumb" aria-label="Breadcrumb">
            <Link to="/admin">Dashboard</Link>
            <ChevronRight size={14} />
            <span className="rep-breadcrumb-current">Reports & Analytics</span>
          </nav>
          <h1>Reports & Analytics</h1>
          <p className="rep-subtitle">
            Track sales, orders, customers, products, inventory and business performance from MySQL.
          </p>
        </div>

        <div className="rep-header-actions">
          <button
            className="rep-btn rep-btn-secondary"
            onClick={handleExportCSV}
            title="Download report data as CSV spreadsheet"
            aria-label="Export CSV"
          >
            <Download size={15} />
            <span>Export CSV</span>
          </button>

          <button
            className="rep-btn rep-btn-secondary"
            onClick={handlePrint}
            title="Print or save as PDF"
            aria-label="Print Report"
          >
            <Printer size={15} />
            <span>Print Report</span>
          </button>

          <button
            className="rep-btn rep-btn-primary"
            onClick={() => fetchReports(true)}
            disabled={refreshing}
            title="Refresh analytics data"
            aria-label="Refresh Data"
          >
            <RefreshCw size={15} className={refreshing ? 'rep-spin' : ''} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </header>

      {/* Date Filter Card */}
      <section className="rep-filter-card" aria-label="Report Filters">
        <div className="rep-filter-row">
          <div className="rep-preset-pills">
            {[
              { id: 'today', label: 'Today' },
              { id: 'yesterday', label: 'Yesterday' },
              { id: '7days', label: 'Last 7 Days' },
              { id: '30days', label: 'Last 30 Days' },
              { id: 'this_month', label: 'This Month' },
              { id: 'last_month', label: 'Last Month' },
              { id: 'this_year', label: 'This Year' }
            ].map(p => (
              <button
                key={p.id}
                type="button"
                className={`rep-preset-pill ${preset === p.id ? 'active' : ''}`}
                onClick={() => handlePresetSelect(p.id)}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Custom Date Selector */}
          <form onSubmit={handleCustomDateSubmit} className="rep-custom-date-wrap">
            <input
              type="date"
              className="rep-date-input"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              aria-label="Start Date"
              title="Start Date"
            />
            <span style={{ color: '#94A3B8', fontSize: '13px' }}>→</span>
            <input
              type="date"
              className="rep-date-input"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              aria-label="End Date"
              title="End Date"
            />
            <button
              type="submit"
              className="rep-btn rep-btn-secondary rep-btn-sm"
              disabled={!dateFrom || !dateTo}
            >
              Apply Range
            </button>
          </form>

          {/* Compare Previous Period Toggle */}
          <label className="rep-toggle-label" title="Compare current period metrics against previous equivalent period">
            <input
              type="checkbox"
              className="rep-toggle-checkbox"
              checked={comparePrevious}
              onChange={(e) => setComparePrevious(e.target.checked)}
            />
            <span>Compare Previous Period</span>
          </label>
        </div>

        {/* Secondary Filters Bar */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '14px', paddingTop: '14px', borderTop: '1px solid #F1F5F9', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: '#64748B' }}>
            <Filter size={14} /> Filter By:
          </div>

          <select
            className="rep-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by Order Status"
          >
            {availableStatuses.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>

          <select
            className="rep-select"
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            aria-label="Filter by Payment Method"
          >
            {availablePayments.map(p => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>

          {(statusFilter || paymentFilter) && (
            <button
              type="button"
              className="rep-btn rep-btn-secondary rep-btn-sm"
              onClick={() => {
                setStatusFilter('');
                setPaymentFilter('');
              }}
              style={{ color: '#EF4444' }}
            >
              Reset Filters
            </button>
          )}

          {/* Active Period Label */}
          <div style={{ marginLeft: 'auto', fontSize: '12px', color: '#64748B' }}>
            Querying: <strong>{meta.date_from}</strong> to <strong>{meta.date_to}</strong>
            {comparePrevious && meta.prev_date_from && (
              <span style={{ marginLeft: '8px', color: '#94A3B8' }}>
                (Prior: {meta.prev_date_from} → {meta.prev_date_to})
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Row 1: KPI Summary Cards */}
      <section className="rep-kpi-grid" aria-label="Key Performance Indicators">
        {/* TOTAL SALES */}
        <div className="rep-kpi-card">
          <div className="rep-kpi-header">
            <span className="rep-kpi-label">Total Sales (Net)</span>
            <div className="rep-kpi-icon sales">
              <DollarSign size={20} />
            </div>
          </div>
          <div className="rep-kpi-value">{formatPrice(summary.total_sales || 0)}</div>
          <div className="rep-kpi-compare-row">
            {renderTrendBadge(summary.sales_change_pct)}
            <span className="rep-kpi-subtext">vs previous period</span>
          </div>
        </div>

        {/* TOTAL ORDERS */}
        <div className="rep-kpi-card">
          <div className="rep-kpi-header">
            <span className="rep-kpi-label">Total Orders</span>
            <div className="rep-kpi-icon orders">
              <ShoppingBag size={20} />
            </div>
          </div>
          <div className="rep-kpi-value">{formatNumber(summary.total_orders || 0)}</div>
          <div className="rep-kpi-compare-row">
            {renderTrendBadge(summary.orders_change_pct)}
            <span className="rep-kpi-subtext">vs previous period</span>
          </div>
        </div>

        {/* TOTAL CUSTOMERS */}
        <div className="rep-kpi-card">
          <div className="rep-kpi-header">
            <span className="rep-kpi-label">Active Customers</span>
            <div className="rep-kpi-icon customers">
              <Users size={20} />
            </div>
          </div>
          <div className="rep-kpi-value">{formatNumber(summary.total_customers || 0)}</div>
          <div className="rep-kpi-compare-row">
            {renderTrendBadge(summary.customers_change_pct)}
            <span className="rep-kpi-subtext">vs previous period</span>
          </div>
        </div>

        {/* AVERAGE ORDER VALUE */}
        <div className="rep-kpi-card">
          <div className="rep-kpi-header">
            <span className="rep-kpi-label">Avg. Order Value</span>
            <div className="rep-kpi-icon aov">
              <CreditCard size={20} />
            </div>
          </div>
          <div className="rep-kpi-value">{formatPrice(summary.avg_order_value || 0)}</div>
          <div className="rep-kpi-compare-row">
            {renderTrendBadge(summary.aov_change_pct)}
            <span className="rep-kpi-subtext">vs previous period</span>
          </div>
        </div>

        {/* PRODUCTS SOLD */}
        <div className="rep-kpi-card">
          <div className="rep-kpi-header">
            <span className="rep-kpi-label">Products Sold</span>
            <div className="rep-kpi-icon units">
              <Package size={20} />
            </div>
          </div>
          <div className="rep-kpi-value">{formatNumber(summary.products_sold || 0)}</div>
          <div className="rep-kpi-compare-row">
            {renderTrendBadge(summary.products_sold_change_pct)}
            <span className="rep-kpi-subtext">vs previous period</span>
          </div>
        </div>

        {/* TOTAL DISCOUNT */}
        <div className="rep-kpi-card">
          <div className="rep-kpi-header">
            <span className="rep-kpi-label">Total Discounts</span>
            <div className="rep-kpi-icon discount">
              <Tag size={20} />
            </div>
          </div>
          <div className="rep-kpi-value">{formatPrice(summary.total_discount || 0)}</div>
          <div className="rep-kpi-compare-row">
            {renderTrendBadge(summary.discount_change_pct, true)}
            <span className="rep-kpi-subtext">vs previous period</span>
          </div>
        </div>
      </section>

      {/* Row 2: Sales Overview Chart & Order Status Breakdown */}
      <section className="rep-charts-grid-2">
        {/* Large Sales Overview Chart */}
        <div className="rep-chart-card">
          <div className="rep-chart-header">
            <div>
              <h2 className="rep-chart-title">
                <Sparkles size={18} style={{ color: PALETTE.primary }} />
                Sales & Orders Overview
              </h2>
              <div className="rep-chart-subtitle">
                Grouped by {meta.group_by || 'day'} across selected timeline
              </div>
            </div>

            <div className="rep-chart-toggle-group">
              <button
                type="button"
                className={`rep-chart-toggle-btn ${salesMetric === 'sales' ? 'active' : ''}`}
                onClick={() => setSalesMetric('sales')}
              >
                Revenue (₹)
              </button>
              <button
                type="button"
                className={`rep-chart-toggle-btn ${salesMetric === 'orders' ? 'active' : ''}`}
                onClick={() => setSalesMetric('orders')}
              >
                Orders
              </button>
              <button
                type="button"
                className={`rep-chart-toggle-btn ${salesMetric === 'units' ? 'active' : ''}`}
                onClick={() => setSalesMetric('units')}
              >
                Units Sold
              </button>
            </div>
          </div>

          <div className="rep-chart-body">
            {sales_trend.length === 0 ? (
              <div className="rep-empty-card" style={{ height: '100%' }}>
                <AlertCircle size={32} style={{ color: '#94A3B8' }} />
                <p>No transaction data available in this time window.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={sales_trend}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={PALETTE.primary} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={PALETTE.primary} stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="ordersGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={PALETTE.secondary} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={PALETTE.secondary} stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis
                    dataKey="label"
                    stroke="#94A3B8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: '#E2E8F0' }}
                  />
                  <YAxis
                    stroke="#94A3B8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => {
                      if (salesMetric === 'sales') {
                        if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
                        if (val >= 1000) return `₹${(val / 1000).toFixed(0)}k`;
                        return `₹${val}`;
                      }
                      return val;
                    }}
                  />
                  <Tooltip content={<CustomSalesTooltip />} />
                  {salesMetric === 'sales' && (
                    <Area
                      type="monotone"
                      dataKey="sales"
                      stroke={PALETTE.primary}
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#salesGrad)"
                      activeDot={{ r: 6, stroke: '#FFFFFF', strokeWidth: 2 }}
                    />
                  )}
                  {salesMetric === 'orders' && (
                    <Area
                      type="monotone"
                      dataKey="orders"
                      stroke={PALETTE.secondary}
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#ordersGrad)"
                      activeDot={{ r: 6, stroke: '#FFFFFF', strokeWidth: 2 }}
                    />
                  )}
                  {salesMetric === 'units' && (
                    <Bar
                      dataKey="units"
                      fill={PALETTE.emerald}
                      radius={[4, 4, 0, 0]}
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Order Status Donut Chart */}
        <div className="rep-chart-card">
          <div className="rep-chart-header">
            <div>
              <h2 className="rep-chart-title">Order Status Breakdown</h2>
              <div className="rep-chart-subtitle">Distribution of all status orders</div>
            </div>
          </div>

          <div className="rep-chart-body" style={{ height: '200px' }}>
            {order_status.length === 0 ? (
              <div className="rep-empty-card" style={{ height: '100%' }}>
                <p>No orders found for this period.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={order_status}
                    dataKey="count"
                    nameKey="status"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {order_status.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color || PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Donut Legend */}
          <div className="rep-donut-legend">
            {order_status.map((item, index) => (
              <div key={item.status || index} className="rep-legend-item">
                <div className="rep-legend-left">
                  <div
                    className="rep-legend-dot"
                    style={{ backgroundColor: item.color || PIE_COLORS[index % PIE_COLORS.length] }}
                  />
                  <span>{item.status}</span>
                </div>
                <div className="rep-legend-right">
                  <span>{formatNumber(item.count)}</span>
                  <span style={{ fontSize: '11px', color: '#94A3B8' }}>({item.percentage}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Row 3: Sales by Category & Payment Methods */}
      <section className="rep-charts-grid-equal">
        {/* Category Revenue Bar Chart */}
        <div className="rep-chart-card">
          <div className="rep-chart-header">
            <div>
              <h2 className="rep-chart-title">Sales by Category</h2>
              <div className="rep-chart-subtitle">Top revenue-generating product categories</div>
            </div>
          </div>

          <div className="rep-chart-body">
            {category_sales.length === 0 ? (
              <div className="rep-empty-card" style={{ height: '100%' }}>
                <p>No category sales data for this period.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={category_sales}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                  <XAxis
                    type="number"
                    stroke="#94A3B8"
                    fontSize={11}
                    tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                  />
                  <YAxis
                    type="category"
                    dataKey="category_name"
                    stroke="#475569"
                    fontSize={11}
                    width={110}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(value) => [formatPrice(value), 'Revenue']}
                  />
                  <Bar
                    dataKey="revenue"
                    fill={PALETTE.primary}
                    radius={[0, 6, 6, 0]}
                  >
                    {category_sales.map((entry, index) => (
                      <Cell key={`cat-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Payment Methods Breakdown */}
        <div className="rep-chart-card">
          <div className="rep-chart-header">
            <div>
              <h2 className="rep-chart-title">Payment Method Share</h2>
              <div className="rep-chart-subtitle">Orders and volume by checkout method</div>
            </div>
          </div>

          <div className="rep-chart-body" style={{ height: '180px' }}>
            {payment_methods.length === 0 ? (
              <div className="rep-empty-card" style={{ height: '100%' }}>
                <p>No payment records in selected period.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={payment_methods}
                    dataKey="revenue"
                    nameKey="payment_method"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={3}
                  >
                    {payment_methods.map((entry, index) => (
                      <Cell key={`pm-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val, name, props) => [
                      `${formatPrice(val)} (${props.payload.percentage}%)`,
                      'Revenue'
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Payment List */}
          <div className="rep-donut-legend">
            {payment_methods.map((item, index) => (
              <div key={item.payment_method || index} className="rep-legend-item">
                <div className="rep-legend-left">
                  <div
                    className="rep-legend-dot"
                    style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                  />
                  <span>{item.payment_method}</span>
                </div>
                <div className="rep-legend-right">
                  <span>{formatPrice(item.revenue)}</span>
                  <span style={{ fontSize: '11px', color: '#94A3B8' }}>
                    ({item.order_count} orders • {item.percentage}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Row 4: Top Products & Top Categories Tables */}
      <section className="rep-charts-grid-equal">
        {/* Top Selling Products Table */}
        <div className="rep-chart-card">
          <div className="rep-chart-header">
            <div>
              <h2 className="rep-chart-title">
                <Award size={18} style={{ color: '#D97706' }} />
                Top Selling Products
              </h2>
              <div className="rep-chart-subtitle">Ranked by actual units sold and order revenue</div>
            </div>

            <div className="rep-chart-toggle-group">
              {[5, 10, 20].map(lim => (
                <button
                  key={lim}
                  type="button"
                  className={`rep-chart-toggle-btn ${topProductsLimit === lim ? 'active' : ''}`}
                  onClick={() => setTopProductsLimit(lim)}
                >
                  Top {lim}
                </button>
              ))}
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="rep-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>Rank</th>
                  <th>Product</th>
                  <th>SKU</th>
                  <th style={{ textAlign: 'right' }}>Units</th>
                  <th style={{ textAlign: 'right' }}>Orders</th>
                  <th style={{ textAlign: 'right' }}>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {top_products.slice(0, topProductsLimit).length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: '#94A3B8' }}>
                      No product sales recorded in this period.
                    </td>
                  </tr>
                ) : (
                  top_products.slice(0, topProductsLimit).map((prod, idx) => (
                    <tr key={prod.id || idx}>
                      <td>
                        <span className={`rep-rank-badge ${idx < 3 ? `top-${idx + 1}` : ''}`}>
                          {idx + 1}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#1E293B' }}>{prod.name}</div>
                      </td>
                      <td style={{ fontSize: '11px', color: '#64748B', fontFamily: 'monospace' }}>
                        {prod.sku || '—'}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>
                        {formatNumber(prod.units_sold)}
                      </td>
                      <td style={{ textAlign: 'right', color: '#64748B' }}>
                        {formatNumber(prod.order_count)}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: PALETTE.primary }}>
                        {formatPrice(prod.revenue)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Categories Table */}
        <div className="rep-chart-card">
          <div className="rep-chart-header">
            <div>
              <h2 className="rep-chart-title">Top Categories</h2>
              <div className="rep-chart-subtitle">Performance breakdown by medical category</div>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="rep-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th style={{ textAlign: 'right' }}>Orders</th>
                  <th style={{ textAlign: 'right' }}>Units</th>
                  <th style={{ textAlign: 'right' }}>Revenue</th>
                  <th style={{ textAlign: 'right' }}>Share</th>
                </tr>
              </thead>
              <tbody>
                {top_categories.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '30px', color: '#94A3B8' }}>
                      No category metrics available.
                    </td>
                  </tr>
                ) : (
                  top_categories.map((cat, idx) => (
                    <tr key={cat.category_id || idx}>
                      <td>
                        <div style={{ fontWeight: 600, color: '#1E293B' }}>{cat.category_name}</div>
                      </td>
                      <td style={{ textAlign: 'right', color: '#64748B' }}>
                        {formatNumber(cat.order_count)}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>
                        {formatNumber(cat.units_sold)}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: PALETTE.primary }}>
                        {formatPrice(cat.revenue)}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>
                        <span style={{
                          backgroundColor: '#E6F7F5',
                          color: '#087F73',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 700
                        }}>
                          {cat.share_pct}%
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Row 5: Customer Analytics & Coupon Analytics */}
      <section className="rep-charts-grid-equal">
        {/* Customer Overview */}
        <div className="rep-chart-card">
          <div className="rep-chart-header">
            <div>
              <h2 className="rep-chart-title">
                <Users size={18} style={{ color: PALETTE.purple }} />
                Customer Analytics
              </h2>
              <div className="rep-chart-subtitle">Acquisition, retention and activity status</div>
            </div>
          </div>

          <div className="rep-stats-list">
            <div className="rep-stat-box">
              <div className="rep-stat-box-label">Total Registered</div>
              <div className="rep-stat-box-val">{formatNumber(customer_analytics.total_customers || 0)}</div>
            </div>
            <div className="rep-stat-box">
              <div className="rep-stat-box-label">New in Selected Period</div>
              <div className="rep-stat-box-val" style={{ color: PALETTE.primary }}>
                +{formatNumber(customer_analytics.new_customers || 0)}
              </div>
            </div>
            <div className="rep-stat-box">
              <div className="rep-stat-box-label">Returning Buyers</div>
              <div className="rep-stat-box-val" style={{ color: PALETTE.secondary }}>
                {formatNumber(customer_analytics.returning_customers || 0)}
              </div>
            </div>
            <div className="rep-stat-box">
              <div className="rep-stat-box-label">Inactive (No Orders)</div>
              <div className="rep-stat-box-val" style={{ color: '#94A3B8' }}>
                {formatNumber(customer_analytics.inactive_customers || 0)}
              </div>
            </div>
          </div>

          {/* New Customer Registration Trend Mini Chart */}
          <div style={{ height: '140px', marginTop: '10px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', marginBottom: '8px' }}>
              Registration Trend
            </div>
            {(customer_analytics.registration_trend || []).length === 0 ? (
              <div style={{ textAlign: 'center', color: '#94A3B8', fontSize: '12px', paddingTop: '20px' }}>
                No customer registrations in this period.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={customer_analytics.registration_trend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="date" stroke="#94A3B8" fontSize={10} tickLine={false} />
                  <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    formatter={(val) => [val, 'New Registrations']}
                    labelStyle={{ color: '#1E293B', fontWeight: 600 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke={PALETTE.purple}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Coupon Report */}
        <div className="rep-chart-card">
          <div className="rep-chart-header">
            <div>
              <h2 className="rep-chart-title">
                <Tag size={18} style={{ color: '#DC2626' }} />
                Coupon & Discount Analytics
              </h2>
              <div className="rep-chart-subtitle">Redemptions, discounts granted, and revenue impact</div>
            </div>
          </div>

          <div className="rep-stats-list">
            <div className="rep-stat-box">
              <div className="rep-stat-box-label">Coupons Applied</div>
              <div className="rep-stat-box-val">{formatNumber(coupon_analytics.total_coupon_uses || 0)}</div>
            </div>
            <div className="rep-stat-box">
              <div className="rep-stat-box-label">Orders with Coupon</div>
              <div className="rep-stat-box-val">{formatNumber(coupon_analytics.coupon_orders || 0)}</div>
            </div>
            <div className="rep-stat-box">
              <div className="rep-stat-box-label">Total Discount Given</div>
              <div className="rep-stat-box-val" style={{ color: '#DC2626' }}>
                {formatPrice(coupon_analytics.total_discount || 0)}
              </div>
            </div>
            <div className="rep-stat-box">
              <div className="rep-stat-box-label">Revenue Generated</div>
              <div className="rep-stat-box-val" style={{ color: PALETTE.primary }}>
                {formatPrice(coupon_analytics.coupon_revenue || 0)}
              </div>
            </div>
          </div>

          {/* Top Coupons Table */}
          <div style={{ marginTop: '10px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', marginBottom: '8px' }}>
              Top Used Coupons
            </div>
            <table className="rep-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th style={{ textAlign: 'right' }}>Uses</th>
                  <th style={{ textAlign: 'right' }}>Discount</th>
                  <th style={{ textAlign: 'right' }}>Order Revenue</th>
                </tr>
              </thead>
              <tbody>
                {(coupon_analytics.top_coupons || []).length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '16px', color: '#94A3B8' }}>
                      No coupon redemptions recorded.
                    </td>
                  </tr>
                ) : (
                  (coupon_analytics.top_coupons || []).map((cpn, idx) => (
                    <tr key={cpn.code || idx}>
                      <td>
                        <span style={{
                          fontFamily: 'monospace',
                          fontWeight: 700,
                          backgroundColor: '#F1F5F9',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          color: '#0F172A'
                        }}>
                          {cpn.code}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{cpn.use_count}</td>
                      <td style={{ textAlign: 'right', color: '#DC2626', fontWeight: 600 }}>
                        {formatPrice(cpn.total_discount)}
                      </td>
                      <td style={{ textAlign: 'right', color: PALETTE.primary, fontWeight: 700 }}>
                        {formatPrice(cpn.total_revenue)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Row 6: Inventory Overview & Reviews/Prescriptions */}
      <section className="rep-charts-grid-equal">
        {/* Inventory Overview */}
        <div className="rep-chart-card">
          <div className="rep-chart-header">
            <div>
              <h2 className="rep-chart-title">
                <Package size={18} style={{ color: '#059669' }} />
                Inventory Overview
              </h2>
              <div className="rep-chart-subtitle">Stock valuation and replenishments needed</div>
            </div>
          </div>

          <div className="rep-stats-list">
            <div className="rep-stat-box">
              <div className="rep-stat-box-label">Retail Inventory Value</div>
              <div className="rep-stat-box-val" style={{ color: PALETTE.primary }}>
                {formatPrice(inventory_overview.retail_inventory_value || 0)}
              </div>
            </div>
            <div className="rep-stat-box">
              <div className="rep-stat-box-label">Total Stock Units</div>
              <div className="rep-stat-box-val">{formatNumber(inventory_overview.total_stock_units || 0)}</div>
            </div>
            <div className="rep-stat-box">
              <div className="rep-stat-box-label">Low Stock Alerts</div>
              <div className="rep-stat-box-val" style={{ color: '#D97706' }}>
                {formatNumber(inventory_overview.low_stock_count || 0)}
              </div>
            </div>
            <div className="rep-stat-box">
              <div className="rep-stat-box-label">Out of Stock</div>
              <div className="rep-stat-box-val" style={{ color: '#EF4444' }}>
                {formatNumber(inventory_overview.out_of_stock_count || 0)}
              </div>
            </div>
          </div>

          {/* Top Low Stock Alert Products */}
          <div style={{ marginTop: '10px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', marginBottom: '8px' }}>
              Products Requiring Restock
            </div>
            <table className="rep-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th style={{ textAlign: 'right' }}>Stock</th>
                  <th style={{ textAlign: 'right' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {(inventory_overview.low_stock_items || []).length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '16px', color: '#10B981' }}>
                      <CheckCircle2 size={16} style={{ display: 'inline', marginRight: '6px' }} />
                      All inventory stock levels are healthy!
                    </td>
                  </tr>
                ) : (
                  (inventory_overview.low_stock_items || []).map((item, idx) => (
                    <tr key={item.id || idx}>
                      <td style={{ fontWeight: 600 }}>{item.name}</td>
                      <td style={{ color: '#64748B', fontSize: '12px' }}>{item.category_name || '—'}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: Number(item.stock_quantity) === 0 ? '#EF4444' : '#D97706' }}>
                        {item.stock_quantity}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span style={{
                          backgroundColor: Number(item.stock_quantity) === 0 ? '#FEE2E2' : '#FEF3C7',
                          color: Number(item.stock_quantity) === 0 ? '#B91C1C' : '#92400E',
                          padding: '2px 8px',
                          borderRadius: '10px',
                          fontSize: '10px',
                          fontWeight: 700
                        }}>
                          {Number(item.stock_quantity) === 0 ? 'Out of Stock' : 'Low Stock'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Customer Reviews & Prescriptions Module Analytics */}
        <div className="rep-chart-card">
          <div className="rep-chart-header">
            <div>
              <h2 className="rep-chart-title">
                <Star size={18} style={{ color: '#F59E0B' }} />
                Reviews & Prescriptions
              </h2>
              <div className="rep-chart-subtitle">Customer satisfaction and clinical Rx pipeline</div>
            </div>
          </div>

          {/* Reviews Score Card */}
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center', marginBottom: '16px', background: '#F8FAFC', padding: '14px', borderRadius: '12px' }}>
            <div style={{ textAlign: 'center', minWidth: '90px' }}>
              <div style={{ fontSize: '32px', fontWeight: 800, color: '#1E293B', lineHeight: 1 }}>
                {review_analytics.average_rating || 0}
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '2px', color: '#F59E0B', margin: '4px 0' }}>
                {[1, 2, 3, 4, 5].map(st => (
                  <Star
                    key={st}
                    size={14}
                    fill={st <= Math.round(Number(review_analytics.average_rating || 0)) ? '#F59E0B' : 'transparent'}
                  />
                ))}
              </div>
              <div style={{ fontSize: '11px', color: '#64748B' }}>
                {review_analytics.approved_reviews || 0} approved
              </div>
            </div>

            {/* Rating Distribution Bars */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {[5, 4, 3, 2, 1].map(starNum => {
                const count = review_analytics.star_distribution?.[starNum] || 0;
                const total = review_analytics.total_reviews || 1;
                const pct = Math.round((count / total) * 100);

                return (
                  <div key={starNum} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px' }}>
                    <span style={{ width: '24px', color: '#64748B', fontWeight: 600 }}>{starNum}★</span>
                    <div style={{ flex: 1, height: '6px', background: '#E2E8F0', borderRadius: '4px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${pct}%`,
                          height: '100%',
                          backgroundColor: '#F59E0B',
                          borderRadius: '4px'
                        }}
                      />
                    </div>
                    <span style={{ width: '28px', textAlign: 'right', color: '#64748B' }}>{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Prescription Pipeline */}
          <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '14px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', marginBottom: '10px' }}>
              Prescription Status Pipeline
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', textAlign: 'center' }}>
              <div style={{ background: '#F8FAFC', padding: '10px', borderRadius: '8px' }}>
                <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Total</div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#1E293B', marginTop: '2px' }}>
                  {prescription_analytics.total_prescriptions || 0}
                </div>
              </div>
              <div style={{ background: '#FFFBEB', padding: '10px', borderRadius: '8px', border: '1px solid #FDE68A' }}>
                <div style={{ fontSize: '11px', color: '#B45309', fontWeight: 600 }}>Pending</div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#B45309', marginTop: '2px' }}>
                  {prescription_analytics.pending_review || 0}
                </div>
              </div>
              <div style={{ background: '#ECFDF5', padding: '10px', borderRadius: '8px', border: '1px solid #A7F3D0' }}>
                <div style={{ fontSize: '11px', color: '#065F46', fontWeight: 600 }}>Approved</div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#065F46', marginTop: '2px' }}>
                  {prescription_analytics.approved || 0}
                </div>
              </div>
              <div style={{ background: '#FEF2F2', padding: '10px', borderRadius: '8px', border: '1px solid #FECACA' }}>
                <div style={{ fontSize: '11px', color: '#991B1B', fontWeight: 600 }}>Rejected</div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#991B1B', marginTop: '2px' }}>
                  {prescription_analytics.rejected || 0}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Row 7: Daily Sales Table */}
      <section className="rep-chart-card" style={{ marginBottom: '40px' }} aria-label="Daily Sales Ledger">
        <div className="rep-chart-header">
          <div>
            <h2 className="rep-chart-title">
              <Calendar size={18} style={{ color: PALETTE.primary }} />
              Daily Sales Ledger
            </h2>
            <div className="rep-chart-subtitle">
              Granular breakdown of orders, gross receipts, discounts, and net revenue
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '12px', color: '#64748B' }}>Rows per page:</span>
            <select
              className="rep-select rep-btn-sm"
              value={dailyPerPage}
              onChange={(e) => {
                setDailyPerPage(Number(e.target.value));
                setDailyPage(1);
              }}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="rep-table">
            <thead>
              <tr>
                <th
                  onClick={() => handleDailySort('date')}
                  style={{ cursor: 'pointer' }}
                >
                  Date {dailySalesSort === 'date' && (dailySalesSortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  onClick={() => handleDailySort('order_count')}
                  style={{ cursor: 'pointer', textAlign: 'right' }}
                >
                  Orders {dailySalesSort === 'order_count' && (dailySalesSortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th style={{ textAlign: 'right' }}>Gross Sales</th>
                <th style={{ textAlign: 'right' }}>Discount</th>
                <th
                  onClick={() => handleDailySort('net_sales')}
                  style={{ cursor: 'pointer', textAlign: 'right' }}
                >
                  Net Sales {dailySalesSort === 'net_sales' && (dailySalesSortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th style={{ textAlign: 'right' }}>Avg. Order Value</th>
              </tr>
            </thead>
            <tbody>
              {paginatedDailySales.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#94A3B8' }}>
                    No daily sales recorded for the selected date range.
                  </td>
                </tr>
              ) : (
                paginatedDailySales.map((row, idx) => (
                  <tr key={row.date || idx}>
                    <td style={{ fontWeight: 600 }}>{row.date}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>
                      {formatNumber(row.order_count)}
                    </td>
                    <td style={{ textAlign: 'right', color: '#475569' }}>
                      {formatPrice(row.gross_sales)}
                    </td>
                    <td style={{ textAlign: 'right', color: '#DC2626' }}>
                      {Number(row.discount) > 0 ? `-${formatPrice(row.discount)}` : '₹0.00'}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: PALETTE.primary }}>
                      {formatPrice(row.net_sales)}
                    </td>
                    <td style={{ textAlign: 'right', color: '#64748B' }}>
                      {formatPrice(row.avg_order_value)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '14px', borderTop: '1px solid #F1F5F9', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ fontSize: '13px', color: '#64748B' }}>
            Showing {sortedDailySales.length === 0 ? 0 : (dailyPage - 1) * dailyPerPage + 1}–
            {Math.min(dailyPage * dailyPerPage, sortedDailySales.length)} of {sortedDailySales.length} records
          </div>

          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <button
              className="rep-btn rep-btn-secondary rep-btn-sm"
              disabled={dailyPage <= 1}
              onClick={() => setDailyPage(p => Math.max(1, p - 1))}
              aria-label="Previous Page"
            >
              <ChevronLeft size={14} /> Previous
            </button>

            <span style={{ fontSize: '12px', fontWeight: 600, padding: '0 8px', color: '#1E293B' }}>
              Page {dailyPage} of {totalDailyPages}
            </span>

            <button
              className="rep-btn rep-btn-secondary rep-btn-sm"
              disabled={dailyPage >= totalDailyPages}
              onClick={() => setDailyPage(p => Math.min(totalDailyPages, p + 1))}
              aria-label="Next Page"
            >
              Next <ChevronRightIcon size={14} />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
