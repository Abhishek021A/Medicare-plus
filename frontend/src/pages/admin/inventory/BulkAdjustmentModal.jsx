import React, { useState } from 'react';
import { X, Layers, TrendingUp, TrendingDown, Loader2, AlertCircle } from 'lucide-react';
import { adminInventoryService } from '../../../services/adminApi';
import { useToast } from '../../../context/ToastContext';

export default function BulkAdjustmentModal({
  isOpen,
  onClose,
  selectedProducts = [],
  onSuccess
}) {
  const [formData, setFormData] = useState({
    type: 'Add Stock',
    quantity: '',
    reason: 'Bulk Stock Update',
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const { addToast } = useToast();

  if (!isOpen || selectedProducts.length === 0) return null;

  const reasons = {
    'Add Stock': ['Bulk Supplier Delivery', 'Batch Receipt', 'General Stock Replenishment'],
    'Remove Stock': ['Bulk Inventory Shrinkage', 'Batch Expiry Removal', 'Damaged Consignment'],
    'Set Stock': ['Physical Inventory Audit', 'Annual Stock Reconciliation']
  };

  const handleTypeChange = (newType) => {
    setFormData(prev => ({
      ...prev,
      type: newType,
      reason: reasons[newType][0]
    }));
    setErrorMsg('');
  };

  const parsedQty = parseInt(formData.quantity) || 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    const qty = parseInt(formData.quantity);
    if (isNaN(qty) || qty < 0) {
      setErrorMsg('Please enter a valid quantity (0 or greater).');
      return;
    }

    if (formData.type !== 'Set Stock' && qty === 0) {
      setErrorMsg('Quantity must be greater than 0.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await adminInventoryService.bulkAdjustStock({
        product_ids: selectedProducts.map(p => p.id),
        type: formData.type,
        quantity: qty,
        reason: formData.reason,
        notes: formData.notes
      });

      if (response.success) {
        addToast('success', response.message || 'Bulk adjustment applied successfully.');
        if (onSuccess) {
          onSuccess(response);
        }
        onClose();
      } else {
        setErrorMsg(response.message || 'Failed to update stock in bulk.');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update stock in bulk. Please try again.';
      setErrorMsg(msg);
      addToast('error', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="inv-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="inv-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="inv-modal-header">
          <h2 className="inv-modal-title">
            <Layers size={20} color="#087F73" />
            Bulk Adjust Stock ({selectedProducts.length} Products)
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
            {/* Selected Products Preview Summary */}
            <div style={{
              backgroundColor: '#F8FAFC',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
              padding: '12px',
              marginBottom: '18px',
              maxHeight: '120px',
              overflowY: 'auto'
            }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', marginBottom: '6px' }}>
                Affected Items:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {selectedProducts.map(p => (
                  <span 
                    key={p.id}
                    style={{
                      fontSize: '11.5px',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #CBD5E1',
                      borderRadius: '4px',
                      padding: '2px 8px',
                      color: '#1E293B'
                    }}
                  >
                    {p.name} ({p.stock_quantity} in stock)
                  </span>
                ))}
              </div>
            </div>

            {/* Adjustment Type Selector */}
            <div className="inv-form-group">
              <label className="inv-form-label">
                Adjustment Action <span className="required">*</span>
              </label>
              <div className="inv-type-selector">
                <label className="inv-type-option">
                  <input
                    type="radio"
                    name="bulkType"
                    checked={formData.type === 'Add Stock'}
                    onChange={() => handleTypeChange('Add Stock')}
                  />
                  <div className="inv-type-card">
                    <TrendingUp size={18} color={formData.type === 'Add Stock' ? '#087F73' : '#64748B'} />
                    <span className="inv-type-card-title">Add To All</span>
                    <span className="inv-type-card-desc">+ units</span>
                  </div>
                </label>

                <label className="inv-type-option">
                  <input
                    type="radio"
                    name="bulkType"
                    checked={formData.type === 'Remove Stock'}
                    onChange={() => handleTypeChange('Remove Stock')}
                  />
                  <div className="inv-type-card">
                    <TrendingDown size={18} color={formData.type === 'Remove Stock' ? '#EF4444' : '#64748B'} />
                    <span className="inv-type-card-title">Remove</span>
                    <span className="inv-type-card-desc">- units</span>
                  </div>
                </label>

                <label className="inv-type-option">
                  <input
                    type="radio"
                    name="bulkType"
                    checked={formData.type === 'Set Stock'}
                    onChange={() => handleTypeChange('Set Stock')}
                  />
                  <div className="inv-type-card">
                    <Layers size={18} color={formData.type === 'Set Stock' ? '#3B82F6' : '#64748B'} />
                    <span className="inv-type-card-title">Set Exact</span>
                    <span className="inv-type-card-desc">= units</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Quantity */}
            <div className="inv-form-group">
              <label className="inv-form-label">
                Quantity to Apply to Each Product <span className="required">*</span>
              </label>
              <input
                type="number"
                className={`inv-form-control ${errorMsg ? 'is-invalid' : ''}`}
                value={formData.quantity}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, quantity: e.target.value }));
                  setErrorMsg('');
                }}
                placeholder="0"
                min="0"
                step="1"
                required
              />
              {errorMsg && (
                <div className="inv-form-error-msg">
                  <AlertCircle size={14} />
                  <span>{errorMsg}</span>
                </div>
              )}
            </div>

            {/* Reason */}
            <div className="inv-form-group">
              <label className="inv-form-label">
                Reason <span className="required">*</span>
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

            {/* Notes */}
            <div className="inv-form-group">
              <label className="inv-form-label">Administrative Notes (Optional)</label>
              <textarea
                className="inv-form-control"
                rows={2}
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Details of bulk adjustment or batch release..."
              />
            </div>
          </div>

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
              disabled={isSubmitting || parsedQty < 0 || (formData.type !== 'Set Stock' && parsedQty === 0)}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="spin-slow" />
                  Applying to {selectedProducts.length} items...
                </>
              ) : (
                `Apply to ${selectedProducts.length} Products`
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
