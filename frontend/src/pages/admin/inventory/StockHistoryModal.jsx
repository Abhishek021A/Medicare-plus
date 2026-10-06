import React, { useState, useEffect, useCallback } from 'react';
import { X, History, ArrowRight, Search, Loader2, Calendar, Filter } from 'lucide-react';
import { adminInventoryService } from '../../../services/adminApi';
import { useToast } from '../../../context/ToastContext';
import ProductThumbnail from './ProductThumbnail';

export default function StockHistoryModal({ isOpen, onClose, product = null }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [typeFilter, setTypeFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const { addToast } = useToast();

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit,
        type: typeFilter !== 'All' ? typeFilter : undefined,
        search: searchQuery ? searchQuery.trim() : undefined
      };

      const productId = product ? product.id : undefined;
      const response = await adminInventoryService.getHistory(productId, params);

      if (response.success) {
        setHistory(response.data || []);
        if (response.pagination) {
          setTotalPages(response.pagination.totalPages || 1);
          setTotalCount(response.pagination.total || 0);
        }
      }
    } catch (error) {
      addToast('error', 'Failed to retrieve stock movement history.');
    } finally {
      setLoading(false);
    }
  }, [page, limit, typeFilter, searchQuery, product, addToast]);

  useEffect(() => {
    if (isOpen) {
      setPage(1);
      fetchHistory();
    }
  }, [isOpen, fetchHistory]);

  if (!isOpen) return null;

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const getTypeBadge = (type) => {
    switch (type) {
      case 'Add Stock':
        return <span className="inv-badge badge-in-stock"><span className="inv-badge-dot" /> + Stock Added</span>;
      case 'Remove Stock':
        return <span className="inv-badge badge-out-of-stock"><span className="inv-badge-dot" /> - Stock Removed</span>;
      case 'Set Stock':
        return <span className="inv-badge" style={{ backgroundColor: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' }}>● Count Override</span>;
      case 'Order':
        return <span className="inv-badge" style={{ backgroundColor: '#FFF7ED', color: '#C2410C', border: '1px solid #FED7AA' }}>● Customer Order</span>;
      case 'Order Cancellation':
        return <span className="inv-badge" style={{ backgroundColor: '#FAF5FF', color: '#7E22CE', border: '1px solid #E9D5FF' }}>● Order Restored</span>;
      default:
        return <span className="inv-badge" style={{ backgroundColor: '#F1F5F9', color: '#475569' }}>{type}</span>;
    }
  };

  return (
    <div className="inv-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="inv-modal-card modal-lg" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="inv-modal-header">
          <div>
            <h2 className="inv-modal-title">
              <History size={20} color="#087F73" />
              {product ? `Stock History: ${product.name}` : 'Global Stock Movement History'}
            </h2>
            <div style={{ fontSize: '13px', color: '#64748B', marginTop: '2px' }}>
              {product 
                ? `SKU: ${product.sku || 'N/A'} • Audit trail for stock changes, deliveries and orders` 
                : 'Complete audit log of all warehouse movements, receipts, orders and reconciliations'}
            </div>
          </div>
          <button 
            type="button" 
            className="inv-modal-close-btn" 
            onClick={onClose} 
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Filters Toolbar */}
        <div style={{
          padding: '14px 24px',
          borderBottom: '1px solid #E5E9EB',
          backgroundColor: '#F8FAFC',
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          flexWrap: 'wrap'
        }}>
          {!product && (
            <div style={{ position: 'relative', flex: '1 1 200px' }}>
              <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
              <input
                type="text"
                placeholder="Search product, SKU, reason..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                style={{
                  width: '100%',
                  padding: '7px 12px 7px 32px',
                  fontSize: '13px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  outline: 'none',
                  backgroundColor: '#FFFFFF'
                }}
              />
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12.5px', color: '#64748B', fontWeight: 500 }}>Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              style={{
                padding: '6px 10px',
                fontSize: '13px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                color: '#1E293B',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="All">All Movements</option>
              <option value="Add Stock">Add Stock</option>
              <option value="Remove Stock">Remove Stock</option>
              <option value="Set Stock">Set Stock</option>
              <option value="Order">Customer Orders</option>
              <option value="Order Cancellation">Order Cancellations</option>
            </select>
          </div>

          <div style={{ marginLeft: 'auto', fontSize: '12px', color: '#64748B' }}>
            Total records: <strong style={{ color: '#1E293B' }}>{totalCount}</strong>
          </div>
        </div>

        {/* Modal Table Content */}
        <div className="inv-modal-body" style={{ padding: 0 }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <Loader2 size={32} className="spin-slow" style={{ margin: '0 auto 12px', color: '#087F73' }} />
              <div style={{ fontSize: '14px', color: '#64748B' }}>Loading stock transaction logs...</div>
            </div>
          ) : history.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748B' }}>
              <History size={40} strokeWidth={1.5} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
              <div style={{ fontWeight: 600, fontSize: '16px', color: '#1E293B', marginBottom: '4px' }}>
                No movement history found
              </div>
              <div style={{ fontSize: '13px' }}>
                {searchQuery || typeFilter !== 'All' 
                  ? 'No records match your active search or filters.' 
                  : 'No inventory transactions have been recorded yet.'}
              </div>
            </div>
          ) : (
            <div className="inv-table-responsive">
              <table className="inv-table" style={{ fontSize: '13px' }}>
                <thead>
                  <tr>
                    <th>Date & Time</th>
                    {!product && <th>Product</th>}
                    <th>Movement</th>
                    <th>Qty</th>
                    <th>Stock Change</th>
                    <th>Reason / Notes</th>
                    <th>Logged By</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map(record => (
                    <tr key={record.id}>
                      <td style={{ whiteSpace: 'nowrap', color: '#475569', fontSize: '12.5px' }}>
                        {formatDate(record.created_at)}
                      </td>

                      {!product && (
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <ProductThumbnail image={record.product_image} name={record.product_name} size={32} />
                            <div>
                              <div style={{ fontWeight: 600, color: '#1E293B' }}>
                                {record.product_name || `Product #${record.product_id}`}
                              </div>
                              {record.product_sku && (
                                <div style={{ fontSize: '11px', color: '#64748B', fontFamily: 'monospace' }}>
                                  {record.product_sku}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      )}

                      <td>{getTypeBadge(record.type)}</td>

                      <td style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
                        <span style={{
                          color: record.type === 'Add Stock' || record.type === 'Order Cancellation' ? '#059669' :
                                 record.type === 'Remove Stock' || record.type === 'Order' ? '#DC2626' : '#2563EB'
                        }}>
                          {record.type === 'Add Stock' || record.type === 'Order Cancellation' ? `+${record.quantity}` :
                           record.type === 'Remove Stock' || record.type === 'Order' ? `-${record.quantity}` :
                           `=${record.new_stock}`}
                        </span>
                      </td>

                      <td style={{ whiteSpace: 'nowrap' }}>
                        <span style={{ color: '#64748B' }}>{record.previous_stock}</span>
                        <ArrowRight size={13} style={{ margin: '0 6px', verticalAlign: 'middle', color: '#94A3B8' }} />
                        <strong style={{ color: '#1E293B' }}>{record.new_stock}</strong>
                      </td>

                      <td>
                        <div style={{ fontWeight: 500, color: '#1E293B' }}>{record.reason || '—'}</div>
                        {record.notes && (
                          <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '2px' }}>
                            {record.notes}
                          </div>
                        )}
                      </td>

                      <td style={{ whiteSpace: 'nowrap', fontSize: '12px' }}>
                        {record.admin_name ? (
                          <span style={{ fontWeight: 600, color: '#087F73' }}>
                            {record.admin_name}
                          </span>
                        ) : record.admin_id ? (
                          <span style={{ color: '#64748B' }}>Admin #{record.admin_id}</span>
                        ) : (
                          <span style={{ color: '#94A3B8', fontStyle: 'italic' }}>System / Order</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Footer with Pagination */}
        <div className="inv-modal-footer" style={{ justifyContent: 'space-between' }}>
          <div style={{ fontSize: '12.5px', color: '#64748B' }}>
            Page {page} of {totalPages || 1}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="inv-btn inv-btn-outline inv-btn-sm"
              disabled={page <= 1}
              onClick={() => setPage(prev => Math.max(1, prev - 1))}
            >
              Previous
            </button>
            <button
              type="button"
              className="inv-btn inv-btn-outline inv-btn-sm"
              disabled={page >= totalPages}
              onClick={() => setPage(prev => prev + 1)}
            >
              Next
            </button>
            <button
              type="button"
              className="inv-btn inv-btn-primary inv-btn-sm"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
