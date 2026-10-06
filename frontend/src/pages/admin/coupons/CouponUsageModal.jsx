import React, { useState, useEffect } from 'react';
import { X, Users, ShoppingBag, Calendar, AlertCircle, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { adminCouponService } from '../../../services/adminApi';

export default function CouponUsageModal({ coupon, isOpen, onClose }) {
  const [usages, setUsages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && coupon) {
      setLoading(true);
      setError(null);
      adminCouponService.getCouponUsage(coupon.id)
        .then((res) => {
          if (res && res.success) {
            setUsages(res.data || []);
          } else {
            setError(res?.message || 'Unable to load usage data.');
          }
        })
        .catch((err) => {
          setError(err.response?.data?.message || 'Failed to load coupon usage.');
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [isOpen, coupon]);

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

  if (!isOpen || !coupon) return null;

  const formatCurrency = (amt) => {
    const num = parseFloat(amt) || 0;
    return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="cpn-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="cpn-modal" style={{ maxWidth: '680px' }} onClick={(e) => e.stopPropagation()}>
        <div className="cpn-modal-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="cpn-code-badge">{coupon.code}</span>
              <h3 style={{ margin: 0 }}>Redemption History</h3>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--cpn-text-muted)' }}>
              Total Uses: <strong>{coupon.used_count || usages.length}</strong> • Total Discount: <strong>{formatCurrency(coupon.total_discount_given || 0)}</strong>
            </p>
          </div>
          <button className="cpn-modal-close" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        <div className="cpn-modal-body" style={{ padding: 0 }}>
          {loading ? (
            <div style={{ padding: '40px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', color: 'var(--cpn-text-muted)' }}>
              <Loader2 size={20} className="animate-spin" />
              <span>Loading usage history...</span>
            </div>
          ) : error ? (
            <div style={{ padding: '24px', color: 'var(--cpn-danger)', textAlign: 'center' }}>
              <AlertCircle size={24} style={{ margin: '0 auto 8px' }} />
              <div>{error}</div>
            </div>
          ) : usages.length === 0 ? (
            <div style={{ padding: '50px 20px', textAlign: 'center', color: 'var(--cpn-text-muted)' }}>
              <Users size={36} style={{ color: 'var(--cpn-text-light)', margin: '0 auto 12px' }} />
              <p style={{ fontWeight: 600, margin: 0 }}>No redemptions yet</p>
              <p style={{ fontSize: '12px', margin: '4px 0 0 0' }}>This coupon has not been used in any customer orders.</p>
            </div>
          ) : (
            <div className="cpn-table-responsive">
              <table className="cpn-table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Order</th>
                    <th>Discount Given</th>
                    <th>Date Used</th>
                  </tr>
                </thead>
                <tbody>
                  {usages.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{u.customer_name || 'Customer'}</div>
                        <div style={{ fontSize: '11px', color: 'var(--cpn-text-muted)' }}>{u.customer_email || '—'}</div>
                      </td>
                      <td>
                        {u.order_id ? (
                          <Link
                            to={`/admin/orders/${u.order_id}`}
                            style={{ color: 'var(--cpn-primary)', fontWeight: 600, textDecoration: 'none' }}
                          >
                            {u.order_number || `ORD-${u.order_id}`}
                          </Link>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>
                        <strong style={{ color: '#059669' }}>
                          {formatCurrency(u.discount_amount)}
                        </strong>
                      </td>
                      <td>
                        <span style={{ fontSize: '12px', color: 'var(--cpn-text-muted)' }}>
                          {formatDate(u.created_at)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="cpn-modal-footer">
          <button type="button" className="cpn-btn cpn-btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
