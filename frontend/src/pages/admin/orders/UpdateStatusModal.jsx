import React, { useState, useEffect } from 'react';
import { X, RefreshCw, AlertCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { adminOrderService } from '../../../services/adminApi';
import { useToast } from '../../../context/ToastContext';

export default function UpdateStatusModal({
  isOpen = true,
  onClose,
  order,
  onSuccess
}) {
  const [newStatus, setNewStatus] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const { addToast } = useToast();

  const statusDefinitions = {
    PENDING: { label: 'Pending', desc: 'Order received, pending review' },
    CONFIRMED: { label: 'Confirmed', desc: 'Order approved and inventory reserved' },
    PROCESSING: { label: 'Processing', desc: 'Pharmacy is preparing items' },
    PACKED: { label: 'Packed', desc: 'Packed and ready for dispatch' },
    SHIPPED: { label: 'Shipped', desc: 'Handed over to delivery courier' },
    OUT_FOR_DELIVERY: { label: 'Out for Delivery', desc: 'Courier out for delivery today' },
    DELIVERED: { label: 'Delivered', desc: 'Package received by customer' },
    CANCELLED: { label: 'Cancelled', desc: 'Order cancelled, stock restored' },
    RETURNED: { label: 'Returned', desc: 'Customer returned package' },
    REFUNDED: { label: 'Refunded', desc: 'Order refunded to customer' }
  };

  const validTransitionsMap = {
    PENDING: ['CONFIRMED', 'CANCELLED'],
    CONFIRMED: ['PROCESSING', 'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED'],
    PROCESSING: ['PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED'],
    PACKED: ['SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'],
    SHIPPED: ['OUT_FOR_DELIVERY', 'DELIVERED', 'RETURNED'],
    OUT_FOR_DELIVERY: ['DELIVERED', 'RETURNED'],
    DELIVERED: ['RETURNED', 'REFUNDED'],
    CANCELLED: [],
    RETURNED: ['REFUNDED'],
    REFUNDED: []
  };

  const currentStatus = (order?.order_status || 'PENDING').toUpperCase();
  const allowedNextStatuses = validTransitionsMap[currentStatus] || [];
  const isTerminalState = allowedNextStatuses.length === 0;

  // Sync state on modal open
  useEffect(() => {
    if (order) {
      const allowed = validTransitionsMap[currentStatus] || [];
      setNewStatus(allowed[0] || '');
      setNotes('');
      setErrorMsg('');
    }
  }, [order, currentStatus]);

  // Keyboard accessibility: Escape closes modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isSubmitting && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, isSubmitting]);

  if (!isOpen || !order) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isTerminalState) {
      setErrorMsg(`Orders in ${currentStatus} status cannot be transitioned further.`);
      return;
    }

    if (!newStatus) {
      setErrorMsg('Please select a valid order status.');
      return;
    }

    if (newStatus === currentStatus) {
      setErrorMsg('The new status is identical to the current status.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      let response;
      if (newStatus === 'CANCELLED') {
        response = await adminOrderService.cancelOrder(order.id, {
          reason: notes || 'Cancelled by admin'
        });
      } else {
        response = await adminOrderService.updateOrderStatus(order.id, {
          status: newStatus,
          order_status: newStatus,
          notes: notes || `Status changed from ${currentStatus} to ${newStatus}`
        });
      }

      if (response && response.success) {
        const updatedOrder = response.data?.order || response.order || {
          ...order,
          order_status: newStatus,
          updated_at: new Date().toISOString()
        };

        addToast?.('Order status updated successfully', 'success');
        if (onSuccess) {
          onSuccess(updatedOrder);
        }
        onClose();
      } else {
        setErrorMsg(response?.message || 'Unable to update order status. Please try again.');
      }
    } catch (err) {
      console.error('Error updating order status:', err);
      const msg = err.response?.data?.message || err.message || 'Unable to update order status. Please try again.';
      setErrorMsg(msg);
      addToast?.(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isCancelling = newStatus === 'CANCELLED';

  return (
    <div className="inv-modal-overlay" onClick={isSubmitting ? undefined : onClose} role="dialog" aria-modal="true">
      <div className="inv-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="inv-modal-header">
          <h2 className="inv-modal-title">
            <RefreshCw size={20} color="#087F73" />
            Update Order Status
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
            {/* Order Snapshot */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 14px',
              backgroundColor: '#F8FAFC',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
              marginBottom: '18px'
            }}>
              <div>
                <div style={{ fontWeight: 700, color: '#087F73', fontSize: '15px' }}>
                  {order.order_number || `#ORD-${order.id}`}
                </div>
                <div style={{ fontSize: '12.5px', color: '#64748B' }}>
                  Customer: <strong>{order.customer_name || 'Customer'}</strong>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '11px', color: '#64748B' }}>Current Status</div>
                <span className={`ord-status-badge status-${currentStatus.toLowerCase()}`}>
                  <span className="ord-status-dot" />
                  {currentStatus}
                </span>
              </div>
            </div>

            {/* Status Select or Terminal Notice */}
            {isTerminalState ? (
              <div style={{
                padding: '14px',
                backgroundColor: '#F1F5F9',
                borderRadius: '8px',
                color: '#475569',
                fontSize: '13px',
                marginBottom: '16px'
              }}>
                This order is in <strong>{currentStatus}</strong> status, which is a terminal state. No further status transitions are allowed.
              </div>
            ) : (
              <div className="inv-form-group">
                <label className="inv-form-label">
                  New Status <span className="required">*</span>
                </label>
                <select
                  className="inv-form-control"
                  value={newStatus}
                  onChange={(e) => {
                    setNewStatus(e.target.value);
                    setErrorMsg('');
                  }}
                  required
                >
                  <option value="" disabled>Select Status ▼</option>
                  {allowedNextStatuses.map(stKey => {
                    const st = statusDefinitions[stKey] || { label: stKey, desc: '' };
                    return (
                      <option key={stKey} value={stKey}>
                        {st.label} — {st.desc}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            {/* Warning regarding inventory / payment */}
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              padding: '12px',
              backgroundColor: isCancelling ? '#FEF2F2' : '#FFFBEB',
              border: `1px solid ${isCancelling ? '#FECACA' : '#FDE68A'}`,
              borderRadius: '8px',
              marginBottom: '16px',
              color: isCancelling ? '#991B1B' : '#92400E',
              fontSize: '12.5px'
            }}>
              <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                {isCancelling ? (
                  <><strong>Important:</strong> Cancelling this order will automatically restore product stock units to inventory and mark paid orders for refund processing.</>
                ) : (
                  <><strong>Notice:</strong> Changing the order status may affect inventory/payment state.</>
                )}
              </div>
            </div>

            {/* Notes */}
            {!isTerminalState && (
              <div className="inv-form-group">
                <label className="inv-form-label">
                  Notes <span style={{ fontSize: '11px', color: '#94A3B8' }}>(Optional)</span>
                </label>
                <textarea
                  className="inv-form-control"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional notes regarding courier dispatch, packaging or customer update..."
                />
              </div>
            )}

            {errorMsg && (
              <div className="inv-form-error-msg">
                <AlertCircle size={15} />
                <span>{errorMsg}</span>
              </div>
            )}
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
            {!isTerminalState && (
              <button
                type="submit"
                className={`inv-btn ${isCancelling ? 'ord-btn' : 'inv-btn-primary'}`}
                style={isCancelling ? { backgroundColor: '#EF4444', color: '#FFFFFF', borderColor: '#EF4444' } : {}}
                disabled={isSubmitting || !newStatus || newStatus === currentStatus}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="spin-anim" />
                    Updating...
                  </>
                ) : (
                  isCancelling ? 'Confirm Cancellation' : 'Update Status'
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
