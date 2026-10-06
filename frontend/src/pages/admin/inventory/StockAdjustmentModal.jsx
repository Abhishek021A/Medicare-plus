import React, { useState, useEffect, useMemo } from 'react';
import { X, PackagePlus, AlertCircle, TrendingUp, TrendingDown, Layers, Loader2, ArrowRight } from 'lucide-react';
import { adminInventoryService } from '../../../services/adminApi';
import { useToast } from '../../../context/ToastContext';
import ProductThumbnail from './ProductThumbnail';

export default function StockAdjustmentModal({ 
  isOpen, 
  onClose, 
  product, 
  onSuccess 
}) {
  const [formData, setFormData] = useState({
    type: 'Add Stock',
    quantity: '',
    reason: '',
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState('');
  const { addToast } = useToast();

  const reasons = {
    'Add Stock': [
      'Stock Received / Supplier Restock',
      'Purchase Order Delivery',
      'Customer Return',
      'Inventory Recount (Surplus)',
      'Inter-branch Transfer In',
      'Other Addition'
    ],
    'Remove Stock': [
      'Damaged / Broken Goods',
      'Expired Medication',
      'Lost / Inventory Shrinkage',
      'Return to Manufacturer',
      'Internal Clinical Usage',
      'Inventory Recount (Deficit)',
      'Other Deduction'
    ],
    'Set Stock': [
      'Periodic Physical Stock Audit',
      'System Stock Reconciliation',
      'Initial Inventory Count',
      'Correction of Discrepancy'
    ]
  };

  useEffect(() => {
    if (isOpen && product) {
      setFormData({
        type: 'Add Stock',
        quantity: '',
        reason: reasons['Add Stock'][0],
        notes: ''
      });
      setValidationError('');
    }
  }, [isOpen, product]);

  const handleTypeChange = (newType) => {
    setFormData(prev => ({
      ...prev,
      type: newType,
      reason: reasons[newType][0]
    }));
    setValidationError('');
  };

  const handleQuantityChange = (val) => {
    setFormData(prev => ({ ...prev, quantity: val }));
    setValidationError('');
  };

  const currentStock = parseInt(product?.stock_quantity) || 0;
  const parsedQty = parseInt(formData.quantity) || 0;
  const threshold = parseInt(product?.low_stock_threshold) || 10;
  const effectivePrice = !empty(product?.sale_price) && parseFloat(product.sale_price) > 0 
    ? parseFloat(product.sale_price) 
    : parseFloat(product?.price || 0);

  function empty(val) {
    return val === null || val === undefined || val === '' || val === 0 || val === '0';
  }

  // Calculate resulting stock
  const { newStock, diff, valueImpact } = useMemo(() => {
    let calculated = currentStock;
    let difference = 0;

    if (formData.type === 'Add Stock') {
      calculated = currentStock + parsedQty;
      difference = parsedQty;
    } else if (formData.type === 'Remove Stock') {
      calculated = Math.max(0, currentStock - parsedQty);
      difference = -parsedQty;
    } else if (formData.type === 'Set Stock') {
      calculated = parsedQty;
      difference = parsedQty - currentStock;
    }

    const impact = difference * effectivePrice;
    return { newStock: calculated, diff: difference, valueImpact: impact };
  }, [currentStock, parsedQty, formData.type, effectivePrice]);

  // Compute resulting status badge
  const resultingStatus = useMemo(() => {
    if (newStock <= 0) return { label: 'Out of Stock', class: 'badge-out-of-stock' };
    if (newStock <= threshold) return { label: 'Low Stock', class: 'badge-low-stock' };
    return { label: 'In Stock', class: 'badge-in-stock' };
  }, [newStock, threshold]);

  if (!isOpen || !product) return null;

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val || 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError('');

    const qty = parseInt(formData.quantity);
    if (isNaN(qty) || qty < 0) {
      setValidationError('Please enter a valid positive quantity.');
      return;
    }

    if (formData.type !== 'Set Stock' && qty === 0) {
      setValidationError('Quantity must be greater than 0 for adding or removing stock.');
      return;
    }

    if (formData.type === 'Remove Stock' && qty > currentStock) {
      setValidationError(`Cannot remove ${qty} units. Only ${currentStock} units are currently available.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await adminInventoryService.adjustStock({
        product_id: product.id,
        type: formData.type,
        quantity: qty,
        reason: formData.reason,
        notes: formData.notes
      });

      if (response.success) {
        addToast('success', response.message || `Stock updated to ${response.new_stock} units.`);
        if (onSuccess) {
          onSuccess(response);
        }
        onClose();
      } else {
        setValidationError(response.message || 'Unable to update stock.');
      }
    } catch (error) {
      const msg = error.response?.data?.message || 'Unable to update stock. Please try again.';
      setValidationError(msg);
      addToast('error', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="inv-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="inv-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="inv-modal-header">
          <h2 className="inv-modal-title">
            <PackagePlus size={20} color="#087F73" />
            Adjust Inventory
          </h2>
          <button 
            type="button" 
            className="inv-modal-close-btn" 
            onClick={onClose} 
            disabled={isSubmitting}
            aria-label="Close dialog"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="inv-modal-body">
            {/* Product Snapshot Card */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              padding: '12px 14px',
              backgroundColor: '#F8FAFC',
              borderRadius: '10px',
              border: '1px solid #E2E8F0',
              marginBottom: '20px'
            }}>
              <ProductThumbnail image={product.image} name={product.name} size={48} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '14.5px', color: '#1E293B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {product.name}
                </div>
                <div style={{ display: 'flex', gap: '8px', fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                  <span>SKU: <strong style={{ color: '#334155' }}>{product.sku || 'N/A'}</strong></span>
                  <span>•</span>
                  <span>Unit Price: <strong style={{ color: '#087F73' }}>{formatCurrency(effectivePrice)}</strong></span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '11px', color: '#64748B' }}>Current Stock</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#1E293B' }}>{currentStock} <span style={{ fontSize: '12px', fontWeight: 500 }}>units</span></div>
              </div>
            </div>

            {/* Adjustment Type Selector */}
            <div className="inv-form-group">
              <label className="inv-form-label">
                Adjustment Type <span className="required">*</span>
              </label>
              <div className="inv-type-selector">
                <label className="inv-type-option">
                  <input
                    type="radio"
                    name="adjType"
                    checked={formData.type === 'Add Stock'}
                    onChange={() => handleTypeChange('Add Stock')}
                  />
                  <div className="inv-type-card">
                    <TrendingUp size={18} color={formData.type === 'Add Stock' ? '#087F73' : '#64748B'} />
                    <span className="inv-type-card-title">Add Stock</span>
                    <span className="inv-type-card-desc">Restock (+)</span>
                  </div>
                </label>

                <label className="inv-type-option">
                  <input
                    type="radio"
                    name="adjType"
                    checked={formData.type === 'Remove Stock'}
                    onChange={() => handleTypeChange('Remove Stock')}
                  />
                  <div className="inv-type-card">
                    <TrendingDown size={18} color={formData.type === 'Remove Stock' ? '#EF4444' : '#64748B'} />
                    <span className="inv-type-card-title">Remove</span>
                    <span className="inv-type-card-desc">Deductions (-)</span>
                  </div>
                </label>

                <label className="inv-type-option">
                  <input
                    type="radio"
                    name="adjType"
                    checked={formData.type === 'Set Stock'}
                    onChange={() => handleTypeChange('Set Stock')}
                  />
                  <div className="inv-type-card">
                    <Layers size={18} color={formData.type === 'Set Stock' ? '#3B82F6' : '#64748B'} />
                    <span className="inv-type-card-title">Set Stock</span>
                    <span className="inv-type-card-desc">Audit Override (=)</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Quantity Input */}
            <div className="inv-form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label className="inv-form-label" style={{ marginBottom: 0 }}>
                  {formData.type === 'Set Stock' ? 'New Total Stock Count' : 'Quantity to Adjust'} <span className="required">*</span>
                </label>
                <span style={{ fontSize: '12px', color: '#64748B' }}>
                  {formData.type === 'Add Stock' && 'Enter units to add'}
                  {formData.type === 'Remove Stock' && `Max available: ${currentStock}`}
                  {formData.type === 'Set Stock' && 'Set exact warehouse count'}
                </span>
              </div>
              <input
                type="number"
                className={`inv-form-control ${validationError ? 'is-invalid' : ''}`}
                value={formData.quantity}
                onChange={(e) => handleQuantityChange(e.target.value)}
                placeholder="0"
                min="0"
                step="1"
                required
                autoFocus
              />

              {/* Quick Increment Chips */}
              <div className="inv-quick-qty-buttons">
                {[5, 10, 25, 50, 100].map(val => (
                  <button
                    key={val}
                    type="button"
                    className="inv-quick-qty-btn"
                    onClick={() => {
                      const cur = parseInt(formData.quantity) || 0;
                      handleQuantityChange(formData.type === 'Set Stock' ? val : cur + val);
                    }}
                  >
                    +{val}
                  </button>
                ))}
                {formData.type === 'Remove Stock' && currentStock > 0 && (
                  <button
                    type="button"
                    className="inv-quick-qty-btn"
                    style={{ color: '#EF4444', borderColor: '#FECACA' }}
                    onClick={() => handleQuantityChange(currentStock)}
                  >
                    All ({currentStock})
                  </button>
                )}
              </div>

              {validationError && (
                <div className="inv-form-error-msg">
                  <AlertCircle size={14} />
                  <span>{validationError}</span>
                </div>
              )}
            </div>

            {/* Reason Dropdown */}
            <div className="inv-form-group">
              <label className="inv-form-label">
                Reason for Adjustment <span className="required">*</span>
              </label>
              <select
                className="inv-form-control"
                value={formData.reason}
                onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                required
              >
                {reasons[formData.type].map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            {/* Optional Notes */}
            <div className="inv-form-group">
              <label className="inv-form-label">
                Administrative Notes <span style={{ fontSize: '11px', color: '#94A3B8' }}>(Optional)</span>
              </label>
              <textarea
                className="inv-form-control"
                rows={2}
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Reference purchase order number, supplier batch, or discrepancy details..."
              />
            </div>

            {/* Real-time Calculation Preview Card */}
            <div className="inv-preview-box">
              <div className="inv-preview-header">Live Adjustment Preview</div>
              <div className="inv-preview-grid">
                <div className="inv-preview-stat-card">
                  <div className="inv-preview-stat-label">Current Stock</div>
                  <div className="inv-preview-stat-val">{currentStock}</div>
                </div>

                <div className="inv-preview-stat-card">
                  <div className="inv-preview-stat-label">Adjustment</div>
                  <div className="inv-preview-stat-val" style={{
                    color: diff > 0 ? '#10B981' : diff < 0 ? '#EF4444' : '#64748B'
                  }}>
                    {diff > 0 ? `+${diff}` : diff}
                  </div>
                </div>

                <div className="inv-preview-stat-card" style={{ borderColor: '#A3E5DE', backgroundColor: '#F0FDF9' }}>
                  <div className="inv-preview-stat-label">Resulting Stock</div>
                  <div className="inv-preview-stat-val result">{newStock}</div>
                </div>
              </div>

              {/* Status and Financial Impact summary */}
              <div style={{
                marginTop: '12px',
                paddingTop: '10px',
                borderTop: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ color: '#64748B' }}>Resulting Status:</span>
                  <span className={`inv-badge ${resultingStatus.class}`}>
                    <span className="inv-badge-dot" />
                    {resultingStatus.label}
                  </span>
                </div>
                <div>
                  <span style={{ color: '#64748B' }}>Value Impact: </span>
                  <strong style={{ color: valueImpact >= 0 ? '#10B981' : '#EF4444' }}>
                    {valueImpact >= 0 ? `+${formatCurrency(valueImpact)}` : formatCurrency(valueImpact)}
                  </strong>
                </div>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="inv-modal-footer">
            <button
              type="button"
              className="inv-btn inv-btn-outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inv-btn inv-btn-primary"
              disabled={isSubmitting || !!validationError || (formData.type !== 'Set Stock' && parsedQty <= 0)}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="spin-slow" />
                  Saving...
                </>
              ) : (
                'Save Adjustment'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
