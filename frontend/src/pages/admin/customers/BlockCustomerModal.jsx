import React, { useState, useEffect } from 'react';
import { X, ShieldAlert, CheckCircle2, Loader2 } from 'lucide-react';
import { adminCustomerService } from '../../../services/adminApi';

export default function BlockCustomerModal({ customer, targetStatus, isOpen, onClose, onSuccess }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const isBlocking = targetStatus === 'BLOCKED';

  useEffect(() => {
    if (isOpen) {
      setError('');
    }
  }, [isOpen]);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !customer) return null;

  const handleConfirm = async () => {
    setError('');
    setSubmitting(true);
    try {
      const res = await adminCustomerService.updateStatus(customer.id, targetStatus);
      if (res && res.success) {
        onSuccess(customer.id, targetStatus, res.summary || res.data?.summary);
        onClose();
      } else {
        setError(res.message || 'Unable to update customer status.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update customer status. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="cus-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="cus-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cus-modal-header">
          <div className="cus-modal-title-wrap">
            <div className={`cus-modal-icon-badge ${isBlocking ? 'danger' : 'success'}`}>
              {isBlocking ? <ShieldAlert size={20} /> : <CheckCircle2 size={20} />}
            </div>
            <div>
              <h3>{isBlocking ? 'Block Customer Account' : 'Unblock Customer Account'}</h3>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--cus-text-muted)' }}>
                {customer.customer_code || `CUS-${customer.id}`} • {customer.name}
              </p>
            </div>
          </div>
          <button className="cus-modal-close" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        <div className="cus-modal-body">
          {error && (
            <div style={{
              padding: '10px 14px',
              borderRadius: '8px',
              backgroundColor: 'var(--cus-danger-bg)',
              color: 'var(--cus-danger)',
              fontSize: '13px',
              border: '1px solid var(--cus-danger-border)'
            }}>
              {error}
            </div>
          )}

          <div style={{
            background: isBlocking ? '#FEF2F2' : '#F0FDF4',
            border: `1px solid ${isBlocking ? '#FECACA' : '#BBF7D0'}`,
            borderRadius: '12px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
          }}>
            <div style={{ fontWeight: 600, color: isBlocking ? '#991B1B' : '#166534', fontSize: '14px' }}>
              {isBlocking ? 'Are you sure you want to block this customer?' : 'Restore customer account access?'}
            </div>
            <div style={{ fontSize: '13px', color: isBlocking ? '#B91C1C' : '#15803D' }}>
              {isBlocking 
                ? 'This will immediately prevent the customer from logging in, checking out, and uploading prescriptions until unblocked.'
                : 'This will restore active login privileges and allow the customer to resume purchases and account access.'
              }
            </div>
          </div>

          <div className="cus-info-list" style={{ marginTop: '4px' }}>
            <div className="cus-info-item">
              <span className="cus-info-label">Customer Name</span>
              <span className="cus-info-val">{customer.name}</span>
            </div>
            <div className="cus-info-item">
              <span className="cus-info-label">Email Address</span>
              <span className="cus-info-val">{customer.email}</span>
            </div>
            <div className="cus-info-item">
              <span className="cus-info-label">Current Status</span>
              <span className="cus-info-val" style={{ textTransform: 'capitalize' }}>
                {customer.status?.toLowerCase() || 'active'}
              </span>
            </div>
          </div>
        </div>

        <div className="cus-modal-footer">
          <button
            type="button"
            className="cus-btn cus-btn-secondary"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="button"
            className={`cus-btn ${isBlocking ? 'cus-btn-danger' : 'cus-btn-primary'}`}
            onClick={handleConfirm}
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>{isBlocking ? 'Blocking...' : 'Unblocking...'}</span>
              </>
            ) : (
              isBlocking ? 'Block Customer' : 'Unblock Customer'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
