import React, { useState, useEffect } from 'react';
import { X, UserCheck, AlertCircle, Loader2 } from 'lucide-react';
import { adminCustomerService } from '../../../services/adminApi';

export default function EditCustomerModal({ customer, isOpen, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    status: 'ACTIVE'
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  useEffect(() => {
    if (customer) {
      setFormData({
        first_name: customer.first_name || '',
        last_name: customer.last_name || '',
        email: customer.email || '',
        phone: customer.phone || '',
        status: customer.status || 'ACTIVE'
      });
      setErrors({});
      setServerError('');
    }
  }, [customer, isOpen]);

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

  const validate = () => {
    const errs = {};
    if (!formData.first_name.trim()) {
      errs.first_name = 'First name is required.';
    }
    if (!formData.last_name.trim()) {
      errs.last_name = 'Last name is required.';
    }
    if (!formData.email.trim()) {
      errs.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errs.email = 'Please enter a valid email address.';
    }
    if (formData.phone && !/^[0-9+\s\-()]{7,20}$/.test(formData.phone.trim())) {
      errs.phone = 'Please enter a valid phone number.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    if (!validate()) return;

    setSubmitting(true);
    try {
      const res = await adminCustomerService.updateCustomer(customer.id, {
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        name: `${formData.first_name.trim()} ${formData.last_name.trim()}`,
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        status: formData.status
      });

      if (res && res.success) {
        onSuccess(res.data || res.customer);
        onClose();
      } else {
        setServerError(res.message || 'Unable to update customer.');
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Failed to update customer. Please check the details.';
      setServerError(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="cus-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="cus-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cus-modal-header">
          <div className="cus-modal-title-wrap">
            <div className="cus-modal-icon-badge edit">
              <UserCheck size={20} />
            </div>
            <div>
              <h3>Edit Customer</h3>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--cus-text-muted)' }}>
                {customer.customer_code || `CUS-${customer.id}`} • {customer.name}
              </p>
            </div>
          </div>
          <button className="cus-modal-close" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="cus-modal-body">
            {serverError && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 14px',
                borderRadius: '8px',
                backgroundColor: 'var(--cus-danger-bg)',
                color: 'var(--cus-danger)',
                fontSize: '13px',
                border: '1px solid var(--cus-danger-border)'
              }}>
                <AlertCircle size={16} />
                <span>{serverError}</span>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div className="cus-form-group">
                <label htmlFor="first_name">First Name *</label>
                <input
                  id="first_name"
                  type="text"
                  className="cus-form-input"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  placeholder="e.g. Abhishek"
                  disabled={submitting}
                />
                {errors.first_name && <span className="cus-form-error">{errors.first_name}</span>}
              </div>

              <div className="cus-form-group">
                <label htmlFor="last_name">Last Name *</label>
                <input
                  id="last_name"
                  type="text"
                  className="cus-form-input"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  placeholder="e.g. Barik"
                  disabled={submitting}
                />
                {errors.last_name && <span className="cus-form-error">{errors.last_name}</span>}
              </div>
            </div>

            <div className="cus-form-group">
              <label htmlFor="email">Email Address *</label>
              <input
                id="email"
                type="email"
                className="cus-form-input"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="customer@example.com"
                disabled={submitting}
              />
              {errors.email && <span className="cus-form-error">{errors.email}</span>}
            </div>

            <div className="cus-form-group">
              <label htmlFor="phone">Phone Number</label>
              <input
                id="phone"
                type="tel"
                className="cus-form-input"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="e.g. 9876543210"
                disabled={submitting}
              />
              {errors.phone && <span className="cus-form-error">{errors.phone}</span>}
            </div>

            <div className="cus-form-group">
              <label htmlFor="status">Account Status</label>
              <select
                id="status"
                className="cus-select"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                disabled={submitting}
              >
                <option value="ACTIVE">Active (Can place orders & login)</option>
                <option value="BLOCKED">Blocked (Account access restricted)</option>
                <option value="INACTIVE">Inactive (Deactivated)</option>
              </select>
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
              type="submit"
              className="cus-btn cus-btn-primary"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
