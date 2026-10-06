import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  Package, 
  Boxes, 
  AlertTriangle, 
  AlertCircle, 
  TrendingUp, 
  Search, 
  Download, 
  History, 
  RefreshCw, 
  Layers, 
  Plus, 
  Clock, 
  ChevronDown, 
  X, 
  ChevronLeft, 
  ChevronRight,
  Filter,
  CheckSquare,
  Square,
  MinusSquare,
  ExternalLink
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { adminInventoryService, adminCategoryService } from '../../../services/adminApi';
import { useToast } from '../../../context/ToastContext';
import ProductThumbnail from './ProductThumbnail';
import StockAdjustmentModal from './StockAdjustmentModal';
import BulkAdjustmentModal from './BulkAdjustmentModal';
import StockHistoryModal from './StockHistoryModal';
import './AdminInventory.css';

export default function AdminInventory() {
  // Inventory state
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({
    totalProducts: 0,
    totalStockUnits: 0,
    lowStock: 0,
    outOfStock: 0,
    inventoryValue: 0
  });

  // Loading & error states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  // Filters & Sorting state
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortBy, setSortBy] = useState('updated_desc');
  const [categoriesList, setCategoriesList] = useState([]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Multi-select & Bulk actions state
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);

  // Single product Modals state
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyTargetProduct, setHistoryTargetProduct] = useState(null); // null means global history

  const { addToast } = useToast();
  const searchTimeoutRef = useRef(null);

  // Format Indian currency
  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(val || 0);
  };

  // Format numbers with Indian commas
  const formatNumber = (val) => {
    return new Intl.NumberFormat('en-IN').format(val || 0);
  };

  // Debounce search input (350ms)
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 350);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm]);

  // Load Categories for filter dropdown from real API
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await adminCategoryService.getCategories();
        if (res.success && Array.isArray(res.data)) {
          // Extract unique category names
          const uniqueNames = Array.from(new Set(res.data.map(c => c.name).filter(Boolean))).sort();
          setCategoriesList(uniqueNames);
        }
      } catch (err) {
        console.warn('Could not pre-load categories list for filter:', err);
      }
    };
    loadCategories();
  }, []);

  // Primary Fetch function connecting to backend MySQL API
  const fetchInventory = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    setFetchError(null);

    try {
      const params = {
        search: debouncedSearch.trim() || undefined,
        category: categoryFilter !== 'All' ? categoryFilter : undefined,
        status: statusFilter !== 'All' ? statusFilter : undefined,
        sort: sortBy,
        page: currentPage,
        limit: itemsPerPage
      };

      const response = await adminInventoryService.getInventory(params);

      if (response && response.success) {
        const data = response.data;

        // Support both structured pagination object and direct arrays
        if (data && data.items) {
          setItems(data.items);
          setTotalItems(data.pagination?.total || data.items.length);
          setTotalPages(data.pagination?.totalPages || Math.ceil((data.pagination?.total || data.items.length) / itemsPerPage) || 1);
          
          if (data.summary) {
            setSummary({
              totalProducts: data.summary.totalProducts ?? data.summary.total_products ?? 0,
              totalStockUnits: data.summary.totalStockUnits ?? data.summary.total_stock ?? 0,
              lowStock: data.summary.lowStock ?? data.summary.low_stock ?? 0,
              outOfStock: data.summary.outOfStock ?? data.summary.out_of_stock ?? 0,
              inventoryValue: data.summary.inventoryValue ?? data.summary.inventory_value ?? 0
            });
          }
        } else if (Array.isArray(data)) {
          setItems(data);
          setTotalItems(data.length);
          setTotalPages(Math.ceil(data.length / itemsPerPage) || 1);
        }
      } else {
        throw new Error(response?.message || 'Failed to retrieve inventory data');
      }
    } catch (err) {
      console.error('Inventory fetch error:', err);
      setFetchError(err.response?.data?.message || err.message || 'Unable to load inventory from server.');
      addToast('error', 'Error connecting to database. Please check your network or server.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [debouncedSearch, categoryFilter, statusFilter, sortBy, currentPage, itemsPerPage, addToast]);

  // Trigger fetch when parameters change
  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  // Handle Export CSV
  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      const params = {
        search: debouncedSearch.trim() || undefined,
        category: categoryFilter !== 'All' ? categoryFilter : undefined,
        status: statusFilter !== 'All' ? statusFilter : undefined,
        sort: sortBy
      };

      const res = await adminInventoryService.exportInventory(params);

      if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
        const headers = Object.keys(res.data[0]);
        const csvRows = [
          headers.join(','),
          ...res.data.map(row => 
            headers.map(h => {
              const val = row[h] !== null && row[h] !== undefined ? String(row[h]) : '';
              return `"${val.replace(/"/g, '""')}"`;
            }).join(',')
          )
        ];

        const blob = new Blob([csvRows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        const dateStr = new Date().toISOString().slice(0, 10);
        link.setAttribute('download', `medicare_plus_inventory_${dateStr}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        addToast('success', `Exported ${res.data.length} products to CSV.`);
      } else {
        addToast('error', 'No inventory records found to export.');
      }
    } catch (err) {
      console.error('Export error:', err);
      addToast('error', 'Failed to generate inventory CSV export.');
    } finally {
      setIsExporting(false);
    }
  };

  // Clear all filters
  const handleClearFilters = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    setCategoryFilter('All');
    setStatusFilter('All');
    setSortBy('updated_desc');
    setCurrentPage(1);
  };

  const hasActiveFilters = Boolean(
    searchTerm || categoryFilter !== 'All' || statusFilter !== 'All' || sortBy !== 'updated_desc'
  );

  // Checkbox Selection logic
  const handleSelectAllOnPage = (e) => {
    if (e.target.checked) {
      const newSet = new Set(selectedIds);
      items.forEach(item => newSet.add(item.id));
      setSelectedIds(newSet);
    } else {
      const newSet = new Set(selectedIds);
      items.forEach(item => newSet.delete(item.id));
      setSelectedIds(newSet);
    }
  };

  const handleSelectItem = (id) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const isAllPageSelected = items.length > 0 && items.every(item => selectedIds.has(item.id));
  const isSomePageSelected = items.some(item => selectedIds.has(item.id)) && !isAllPageSelected;

  const selectedProductsList = useMemo(() => {
    return items.filter(item => selectedIds.has(item.id));
  }, [items, selectedIds]);

  // Adjust stock handler
  const handleOpenAdjustModal = (product) => {
    setSelectedProduct(product);
    setIsAdjustmentModalOpen(true);
  };

  // Stock History handler (specific product)
  const handleOpenProductHistory = (product) => {
    setHistoryTargetProduct(product);
    setIsHistoryModalOpen(true);
  };

  // Global Stock History handler
  const handleOpenGlobalHistory = () => {
    setHistoryTargetProduct(null);
    setIsHistoryModalOpen(true);
  };

  // Callback on stock adjustment or bulk update success
  const handleMutationSuccess = (result) => {
    if (result && result.summary) {
      setSummary({
        totalProducts: result.summary.totalProducts ?? result.summary.total_products ?? 0,
        totalStockUnits: result.summary.totalStockUnits ?? result.summary.total_stock ?? 0,
        lowStock: result.summary.lowStock ?? result.summary.low_stock ?? 0,
        outOfStock: result.summary.outOfStock ?? result.summary.out_of_stock ?? 0,
        inventoryValue: result.summary.inventoryValue ?? result.summary.inventory_value ?? 0
      });
    }
    setSelectedIds(new Set());
    // Refresh table silently
    fetchInventory(true);
  };

  // Helper for Status Badge
  const renderStatusBadge = (status) => {
    switch (status) {
      case 'IN STOCK':
        return (
          <span className="inv-badge badge-in-stock">
            <span className="inv-badge-dot" />
            In Stock
          </span>
        );
      case 'LOW STOCK':
        return (
          <span className="inv-badge badge-low-stock">
            <span className="inv-badge-dot" />
            Low Stock
          </span>
        );
      case 'OUT OF STOCK':
        return (
          <span className="inv-badge badge-out-of-stock">
            <span className="inv-badge-dot" />
            Out of Stock
          </span>
        );
      default:
        return (
          <span className="inv-badge" style={{ backgroundColor: '#F1F5F9', color: '#64748B' }}>
            {status}
          </span>
        );
    }
  };

  return (
    <div className="inventory-page-wrapper">
      {/* 1. Page Header */}
      <div className="inv-header">
        <div>
          <nav className="inv-breadcrumb" aria-label="Breadcrumb">
            <Link to="/admin">Admin</Link>
            <span className="separator">/</span>
            <span className="current">Inventory</span>
          </nav>
          <h1 className="inv-header-title">Inventory</h1>
          <p className="inv-header-subtitle">
            Manage stock levels, stock movements, and inventory value
          </p>
        </div>

        <div className="inv-header-actions">
          {/* Refresh Button */}
          <button
            type="button"
            className="inv-btn inv-btn-outline inv-btn-icon-only"
            onClick={() => fetchInventory(true)}
            disabled={loading || refreshing}
            title="Refresh inventory"
            aria-label="Refresh inventory"
          >
            <RefreshCw size={18} className={refreshing ? 'spin-slow' : ''} />
          </button>

          {/* Global Inventory History Button */}
          <button
            type="button"
            className="inv-btn inv-btn-outline"
            onClick={handleOpenGlobalHistory}
            title="View global stock movements"
          >
            <History size={18} />
            <span>Inventory History</span>
          </button>

          {/* Export CSV Button */}
          <button
            type="button"
            className="inv-btn inv-btn-primary"
            onClick={handleExportCSV}
            disabled={isExporting || items.length === 0}
            title="Export filtered inventory to CSV"
          >
            <Download size={18} />
            <span>{isExporting ? 'Exporting...' : 'Export CSV'}</span>
          </button>
        </div>
      </div>

      {/* 2. Summary Cards (5 Premium Cards) */}
      <div className="inv-summary-grid">
        {/* Total Products */}
        <div className="inv-card inv-card-products">
          <div className="inv-card-header">
            <span className="inv-card-title">Total Products</span>
            <div className="inv-card-icon-wrap icon-products">
              <Package size={22} />
            </div>
          </div>
          <div>
            <div className="inv-card-value">
              {loading ? <div className="inv-skeleton" style={{ width: '80px', height: '28px' }} /> : formatNumber(summary.totalProducts)}
            </div>
            <div className="inv-card-subtext">Products in inventory</div>
          </div>
        </div>

        {/* Total Stock Units */}
        <div className="inv-card inv-card-stock">
          <div className="inv-card-header">
            <span className="inv-card-title">Total Stock Units</span>
            <div className="inv-card-icon-wrap icon-stock">
              <Boxes size={22} />
            </div>
          </div>
          <div>
            <div className="inv-card-value" style={{ color: '#087F73' }}>
              {loading ? <div className="inv-skeleton" style={{ width: '90px', height: '28px' }} /> : formatNumber(summary.totalStockUnits)}
            </div>
            <div className="inv-card-subtext">Total warehouse units</div>
          </div>
        </div>

        {/* Low Stock */}
        <div className="inv-card inv-card-low">
          <div className="inv-card-header">
            <span className="inv-card-title">Low Stock</span>
            <div className="inv-card-icon-wrap icon-low">
              <AlertTriangle size={22} />
            </div>
          </div>
          <div>
            <div className="inv-card-value" style={{ color: '#D97706' }}>
              {loading ? <div className="inv-skeleton" style={{ width: '60px', height: '28px' }} /> : formatNumber(summary.lowStock)}
            </div>
            <div className="inv-card-subtext">At or below safety limit</div>
          </div>
        </div>

        {/* Out of Stock */}
        <div className="inv-card inv-card-out">
          <div className="inv-card-header">
            <span className="inv-card-title">Out of Stock</span>
            <div className="inv-card-icon-wrap icon-out">
              <AlertCircle size={22} />
            </div>
          </div>
          <div>
            <div className="inv-card-value" style={{ color: '#DC2626' }}>
              {loading ? <div className="inv-skeleton" style={{ width: '60px', height: '28px' }} /> : formatNumber(summary.outOfStock)}
            </div>
            <div className="inv-card-subtext">Requires replenishment</div>
          </div>
        </div>

        {/* Inventory Value */}
        <div className="inv-card inv-card-value">
          <div className="inv-card-header">
            <span className="inv-card-title">Inventory Value</span>
            <div className="inv-card-icon-wrap icon-value">
              <TrendingUp size={22} />
            </div>
          </div>
          <div>
            <div className="inv-card-value" style={{ color: '#059669', fontSize: '24px' }}>
              {loading ? <div className="inv-skeleton" style={{ width: '130px', height: '28px' }} /> : formatCurrency(summary.inventoryValue)}
            </div>
            <div className="inv-card-subtext">Asset stock valuation</div>
          </div>
        </div>
      </div>

      {/* 3. Inventory Toolbar */}
      <div className="inv-toolbar-card">
        {/* Search Input */}
        <div className="inv-search-container">
          <Search size={18} className="inv-search-icon" />
          <input
            type="text"
            className="inv-search-input"
            placeholder="Search products, SKU, brand..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              type="button"
              className="inv-search-clear"
              onClick={() => {
                setSearchTerm('');
                setDebouncedSearch('');
              }}
              title="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Filter Dropdowns */}
        <div className="inv-filters-group">
          {/* Category Filter */}
          <div className="inv-select-wrapper">
            <select
              className="inv-select"
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setCurrentPage(1);
              }}
              aria-label="Filter by category"
            >
              <option value="All">All Categories</option>
              {categoriesList.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <ChevronDown size={16} className="inv-select-arrow" />
          </div>

          {/* Stock Status Filter */}
          <div className="inv-select-wrapper">
            <select
              className="inv-select"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              aria-label="Filter by stock status"
            >
              <option value="All">All Statuses</option>
              <option value="IN STOCK">In Stock</option>
              <option value="LOW STOCK">Low Stock</option>
              <option value="OUT OF STOCK">Out of Stock</option>
            </select>
            <ChevronDown size={16} className="inv-select-arrow" />
          </div>

          {/* Sort By Dropdown */}
          <div className="inv-select-wrapper" style={{ minWidth: '190px' }}>
            <select
              className="inv-select"
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setCurrentPage(1);
              }}
              aria-label="Sort inventory"
            >
              <option value="updated_desc">Latest Updated</option>
              <option value="updated_asc">Oldest Updated</option>
              <option value="name_asc">Product Name (A–Z)</option>
              <option value="name_desc">Product Name (Z–A)</option>
              <option value="stock_asc">Stock (Low → High)</option>
              <option value="stock_desc">Stock (High → Low)</option>
              <option value="price_asc">Price (Low → High)</option>
              <option value="price_desc">Price (High → Low)</option>
              <option value="value_asc">Inv. Value (Low → High)</option>
              <option value="value_desc">Inv. Value (High → Low)</option>
            </select>
            <ChevronDown size={16} className="inv-select-arrow" />
          </div>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <button
              type="button"
              className="inv-btn inv-btn-outline inv-btn-sm"
              onClick={handleClearFilters}
              title="Reset all filters"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* 4. Inventory Table Card */}
      <div className="inv-table-card">
        {fetchError ? (
          <div className="inv-error-state">
            <div className="inv-state-icon-box error">
              <AlertCircle size={32} />
            </div>
            <h3 className="inv-state-title">Something went wrong</h3>
            <p className="inv-state-desc">{fetchError}</p>
            <button
              type="button"
              className="inv-btn inv-btn-primary"
              onClick={() => fetchInventory()}
            >
              Try Again
            </button>
          </div>
        ) : (
          <div className="inv-table-responsive">
            <table className="inv-table">
              <thead>
                <tr>
                  <th className="col-checkbox">
                    <input
                      type="checkbox"
                      checked={isAllPageSelected}
                      ref={el => { if (el) el.indeterminate = isSomePageSelected; }}
                      onChange={handleSelectAllOnPage}
                      aria-label="Select all products on page"
                    />
                  </th>
                  <th style={{ minWidth: '260px' }}>Product</th>
                  <th style={{ minWidth: '130px' }}>SKU</th>
                  <th style={{ minWidth: '150px' }}>Category</th>
                  <th style={{ minWidth: '130px' }}>Brand</th>
                  <th style={{ minWidth: '130px' }}>Stock Status</th>
                  <th style={{ minWidth: '110px' }}>Current Stock</th>
                  <th style={{ minWidth: '90px' }}>Limit</th>
                  <th style={{ minWidth: '110px' }}>Price</th>
                  <th style={{ minWidth: '130px' }}>Inventory Value</th>
                  <th style={{ minWidth: '140px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  // Skeleton Rows (10 rows)
                  Array.from({ length: 10 }).map((_, idx) => (
                    <tr key={`skel-${idx}`} className="inv-row-skeleton">
                      <td className="col-checkbox">
                        <div className="inv-skeleton" style={{ width: '16px', height: '16px', margin: '0 auto' }} />
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div className="inv-skeleton" style={{ width: '48px', height: '48px', borderRadius: '10px' }} />
                          <div style={{ flex: 1 }}>
                            <div className="inv-skeleton" style={{ width: '70%', height: '16px', marginBottom: '6px' }} />
                            <div className="inv-skeleton" style={{ width: '40%', height: '12px' }} />
                          </div>
                        </div>
                      </td>
                      <td><div className="inv-skeleton" style={{ width: '80px', height: '14px' }} /></td>
                      <td><div className="inv-skeleton" style={{ width: '100px', height: '14px' }} /></td>
                      <td><div className="inv-skeleton" style={{ width: '80px', height: '14px' }} /></td>
                      <td><div className="inv-skeleton" style={{ width: '90px', height: '22px', borderRadius: '999px' }} /></td>
                      <td><div className="inv-skeleton" style={{ width: '50px', height: '16px' }} /></td>
                      <td><div className="inv-skeleton" style={{ width: '40px', height: '14px' }} /></td>
                      <td><div className="inv-skeleton" style={{ width: '70px', height: '14px' }} /></td>
                      <td><div className="inv-skeleton" style={{ width: '80px', height: '14px' }} /></td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="inv-skeleton" style={{ width: '100px', height: '30px', marginLeft: 'auto', borderRadius: '6px' }} />
                      </td>
                    </tr>
                  ))
                ) : items.length === 0 ? (
                  // Empty State
                  <tr>
                    <td colSpan={11}>
                      <div className="inv-empty-state">
                        <div className="inv-state-icon-box">
                          <Package size={32} />
                        </div>
                        <h3 className="inv-state-title">No inventory found</h3>
                        <p className="inv-state-desc">
                          {hasActiveFilters 
                            ? "No products match your active search and filter criteria. Try resetting or adjusting your search parameters."
                            : "Your pharmacy inventory currently has no products registered in the database."}
                        </p>
                        {hasActiveFilters && (
                          <button
                            type="button"
                            className="inv-btn inv-btn-outline"
                            onClick={handleClearFilters}
                          >
                            Clear All Filters
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  // Data Rows
                  items.map(product => {
                    const isSelected = selectedIds.has(product.id);
                    const stockQty = Number(product.stock_quantity) || 0;
                    const threshold = Number(product.low_stock_threshold) || 10;
                    const isLow = stockQty > 0 && stockQty <= threshold;
                    const isOut = stockQty <= 0;
                    const effectivePrice = product.sale_price !== null && Number(product.sale_price) > 0 
                      ? Number(product.sale_price) 
                      : Number(product.price);

                    return (
                      <tr key={product.id} className={isSelected ? 'row-selected' : ''}>
                        {/* Checkbox */}
                        <td className="col-checkbox">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleSelectItem(product.id)}
                            aria-label={`Select ${product.name}`}
                          />
                        </td>

                        {/* Product Cell (Thumbnail + Name + SKU) */}
                        <td>
                          <div className="inv-product-cell">
                            <ProductThumbnail 
                              image={product.image} 
                              name={product.name} 
                              size={48} 
                            />
                            <div className="inv-product-details">
                              <span className="inv-product-name" title={product.name}>
                                {product.name}
                              </span>
                              <span className="inv-product-sku">
                                {product.sku || 'SKU-NONE'}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* SKU */}
                        <td style={{ fontFamily: 'monospace', fontSize: '13px', color: '#475569' }}>
                          {product.sku || '—'}
                        </td>

                        {/* Category */}
                        <td style={{ color: '#334155' }}>
                          {product.category_name || 'Uncategorized'}
                        </td>

                        {/* Brand */}
                        <td style={{ color: '#475569' }}>
                          {product.brand_name || 'Generic'}
                        </td>

                        {/* Stock Status Badge */}
                        <td>
                          {renderStatusBadge(product.stock_status)}
                        </td>

                        {/* Current Stock */}
                        <td>
                          <div className="inv-stock-cell">
                            <span className={`inv-stock-qty ${isOut ? 'is-out' : isLow ? 'is-low' : ''}`}>
                              {stockQty}
                            </span>
                            <span className="inv-stock-units">units</span>
                          </div>
                        </td>

                        {/* Limit (Threshold) */}
                        <td>
                          <span className="inv-limit-badge" title="Alert trigger when stock reaches this level">
                            Limit: {threshold}
                          </span>
                        </td>

                        {/* Price */}
                        <td>
                          <div className="inv-price-val">
                            {formatCurrency(effectivePrice)}
                          </div>
                          {product.sale_price && Number(product.sale_price) > 0 && Number(product.sale_price) < Number(product.price) && (
                            <span style={{ fontSize: '11px', textDecoration: 'line-through', color: '#94A3B8' }}>
                              {formatCurrency(product.price)}
                            </span>
                          )}
                        </td>

                        {/* Inventory Value */}
                        <td>
                          <div className="inv-value-val">
                            {formatCurrency(product.inventory_value)}
                          </div>
                        </td>

                        {/* Actions */}
                        <td style={{ textAlign: 'right' }}>
                          <div className="inv-row-actions" style={{ justifyContent: 'flex-end' }}>
                            <button
                              type="button"
                              className="inv-action-btn inv-action-btn-adjust"
                              onClick={() => handleOpenAdjustModal(product)}
                              title="Adjust stock quantity"
                            >
                              <Plus size={14} strokeWidth={2.5} />
                              <span>Adjust</span>
                            </button>
                            <button
                              type="button"
                              className="inv-action-btn"
                              onClick={() => handleOpenProductHistory(product)}
                              title="View stock history for this product"
                              aria-label={`View stock history for ${product.name}`}
                            >
                              <Clock size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* 5. Pagination */}
        {!loading && items.length > 0 && (
          <div className="inv-pagination-bar">
            {/* Showing Info & Page Size */}
            <div className="inv-pagination-info">
              <span>
                Showing <strong style={{ color: '#1E293B' }}>{(currentPage - 1) * itemsPerPage + 1}</strong> to{' '}
                <strong style={{ color: '#1E293B' }}>{Math.min(currentPage * itemsPerPage, totalItems)}</strong> of{' '}
                <strong style={{ color: '#1E293B' }}>{totalItems}</strong> products
              </span>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '12px', color: '#94A3B8' }}>Rows per page:</span>
                <select
                  className="inv-page-size-select"
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  aria-label="Rows per page"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            {/* Navigation buttons */}
            <div className="inv-pagination-nav">
              <button
                type="button"
                className="inv-page-num-btn"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                aria-label="Previous page"
              >
                <ChevronLeft size={16} />
              </button>

              {/* Numbered page items with windowing */}
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => {
                  if (totalPages <= 7) return true;
                  return p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1;
                })
                .map((pageNum, idx, arr) => {
                  const prev = arr[idx - 1];
                  const hasGap = prev && pageNum - prev > 1;

                  return (
                    <React.Fragment key={pageNum}>
                      {hasGap && <span style={{ padding: '0 4px', color: '#94A3B8' }}>…</span>}
                      <button
                        type="button"
                        className={`inv-page-num-btn ${currentPage === pageNum ? 'active' : ''}`}
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </button>
                    </React.Fragment>
                  );
                })}

              <button
                type="button"
                className="inv-page-num-btn"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                aria-label="Next page"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 6. Floating Bulk Actions Bar (when products are selected) */}
      {selectedIds.size > 0 && (
        <div className="inv-bulk-bar" role="toolbar" aria-label="Bulk actions">
          <div className="inv-bulk-count">
            <span className="inv-bulk-badge">{selectedIds.size}</span>
            <span>product{selectedIds.size > 1 ? 's' : ''} selected</span>
          </div>

          <div className="inv-bulk-actions">
            <button
              type="button"
              className="inv-btn-bulk-adjust"
              onClick={() => setIsBulkModalOpen(true)}
            >
              <Layers size={15} />
              <span>Bulk Adjust</span>
            </button>

            <button
              type="button"
              className="inv-btn-bulk-cancel"
              onClick={() => setSelectedIds(new Set())}
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

      {/* 7. Stock Adjustment Modal (Single Product) */}
      <StockAdjustmentModal
        isOpen={isAdjustmentModalOpen}
        onClose={() => {
          setIsAdjustmentModalOpen(false);
          setSelectedProduct(null);
        }}
        product={selectedProduct}
        onSuccess={handleMutationSuccess}
      />

      {/* 8. Bulk Stock Adjustment Modal */}
      <BulkAdjustmentModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        selectedProducts={selectedProductsList}
        onSuccess={handleMutationSuccess}
      />

      {/* 9. Stock Movement History Modal (Product or Global) */}
      <StockHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => {
          setIsHistoryModalOpen(false);
          setHistoryTargetProduct(null);
        }}
        product={historyTargetProduct}
      />
    </div>
  );
}
