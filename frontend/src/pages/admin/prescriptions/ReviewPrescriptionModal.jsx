import React, { useState, useEffect } from 'react';
import { 
  X, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  HelpCircle, 
  FileText, 
  User, 
  Loader2 
} from 'lucide-react';
import { adminPrescriptionService } from '../../../services/adminApi';

const REJECTION_REASONS = [
  'Unreadable prescription',
  'Invalid prescription',
  'Expired prescription',
  'Missing information',
  'Wrong document',
  'Medicine not covered by prescription',
  'Other'
];

const ReviewPrescriptionModal = ({ 
  isOpen, 
  onClose, 
  prescription, 
  actionType, // 'APPROVE' | 'REJECT' | 'NEEDS_CLARIFICATION'
  onSuccess 
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [customerMessage, setCustomerMessage] = useState('');
  const [adminNotes, setAdminNotes] = useState('');

  // Reset inputs when modal opens or prescription changes
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setRejectReason('');
      setCustomerMessage('');
      setAdminNotes(prescription?.admin_notes || '');
    }
  }, [isOpen, prescription?.id, actionType]);

  if (!isOpen || !prescription) return null;

  const isApprove = actionType === 'APPROVE';
  const isReject = actionType === 'REJECT';
  const isClarification = actionType === 'NEEDS_CLARIFICATION';

  const formatStatus = (s) => {
    switch ((s || 'PENDING').toUpperCase()) {
      case 'APPROVED': return 'Approved';
      case 'REJECTED': return 'Rejected';
      case 'NEEDS_CLARIFICATION': return 'Needs Clarification';
      default: return 'Pending Review';
    }
  };

  const getErrorMessage = (err) => {
    const status = err.response?.status;
    if (status === 401) return 'Your session has expired. Please log in again.';
    if (status === 403) return 'You do not have permission to review prescriptions.';
    if (status === 404) return 'Prescription not found.';
    if (status === 409) return err.response?.data?.message || 'Prescription has already been reviewed.';
    if (status === 500) return 'Unable to update prescription. Please try again.';
    return err.response?.data?.message || err.message || 'Unable to complete prescription review.';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Strict Validation
    if (isReject && !rejectReason.trim()) {
      setError('Please select a rejection reason.');
      return;
    }

    if (isClarification && !customerMessage.trim()) {
      setError('Please provide clarification instructions for the customer.');
      return;
    }

    setLoading(true);

    try {
      let payload = {};

      if (isApprove) {
        payload = {
          decision: 'approved',
          status: 'APPROVED',
          admin_notes: adminNotes.trim(),
          notes: adminNotes.trim() ? `Approved with note: ${adminNotes.trim()}` : 'Prescription verified and approved by admin.'
        };
      } else if (isReject) {
        payload = {
          decision: 'rejected',
          status: 'REJECTED',
          reason: rejectReason,
          rejection_reason: rejectReason,
          admin_notes: adminNotes.trim(),
          customer_message: `Prescription rejected: ${rejectReason}${adminNotes ? ` (${adminNotes.trim()})` : ''}`,
          notes: `Prescription rejected: ${rejectReason}. Notes: ${adminNotes.trim()}`
        };
      } else if (isClarification) {
        payload = {
          decision: 'clarification',
          status: 'NEEDS_CLARIFICATION',
          customer_message: customerMessage.trim(),
          admin_notes: adminNotes.trim(),
          notes: `Clarification requested: "${customerMessage.trim()}". Internal notes: ${adminNotes.trim()}`
        };
      }

      const res = await adminPrescriptionService.updateStatus(prescription.id, payload);
      if (res && res.success) {
        const updatedData = res.data?.prescription || res.prescription || res.data || {
          ...prescription,
          status: payload.status,
          admin_notes: payload.admin_notes,
          rejection_reason: payload.rejection_reason
        };
        if (onSuccess) onSuccess(updatedData);
        onClose();
      } else {
        setError(res?.message || 'Unable to update prescription status.');
      }
    } catch (err) {
      console.error('Failed to review prescription:', err);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="rx-modal-overlay" 
      onClick={(e) => { if (e.target === e.currentTarget && !loading) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="rx-review-modal-title"
    >
      <div className="rx-confirm-modal" style={{ maxWidth: '540px', width: '92%' }}>
        <div className="rx-confirm-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid #E5E9EB' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {isApprove && (
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#ECFDF5', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle2 size={20} />
              </div>
            )}
            {isReject && (
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#FEF2F2', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <XCircle size={20} />
              </div>
            )}
            {isClarification && (
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#F0F9FF', color: '#0284C7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <HelpCircle size={20} />
              </div>
            )}
            <h3 id="rx-review-modal-title" style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#1E293B' }}>
              {isApprove && 'Approve Prescription?'}
              {isReject && 'Reject Prescription'}
              {isClarification && 'Request Clarification'}
            </h3>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            disabled={loading}
            style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: 4 }}
            aria-label="Close dialog"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ padding: '20px 24px' }}>
            {/* Quick Context Summary Card */}
            <div style={{ background: '#F8FAFC', borderRadius: '10px', padding: '14px 18px', marginBottom: '18px', border: '1px solid #E2E8F0', display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' }}>
              <div>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748B', fontWeight: 700, display: 'block' }}>Prescription</span>
                <span style={{ fontWeight: 700, color: '#087F73', fontFamily: 'monospace', fontSize: '15px' }}>
                  {prescription.prescription_number || `RX-${prescription.id}`}
                </span>
              </div>
              <div>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748B', fontWeight: 700, display: 'block' }}>Customer</span>
                <span style={{ fontWeight: 600, color: '#1E293B', fontSize: '13.5px' }}>
                  {prescription.customer_name || 'Customer'}
                </span>
              </div>
              <div style={{ gridColumn: 'span 2', paddingTop: '8px', borderTop: '1px dashed #CBD5E1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: '#64748B' }}>Current Status:</span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: prescription.status === 'APPROVED' ? '#059669' : prescription.status === 'REJECTED' ? '#DC2626' : '#D97706' }}>
                  ● {formatStatus(prescription.status)}
                </span>
              </div>
            </div>

            {error && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            {/* APPROVE SPECIFIC */}
            {isApprove && (
              <div>
                <p style={{ fontSize: '13.5px', color: '#475569', lineHeight: 1.5, margin: '0 0 16px' }}>
                  Confirming this prescription verifies it has a valid medical practitioner authorization. The customer's order will be eligible to proceed to fulfillment.
                </p>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Review Note <span style={{ fontWeight: 400, color: '#94A3B8' }}>(Optional)</span>
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Prescription verified successfully..."
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', fontSize: '13px', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none', resize: 'vertical' }}
                  />
                  <span style={{ fontSize: '11.5px', color: '#64748B', display: 'block', marginTop: '4px' }}>
                    🔒 This note is saved in the clinical audit history.
                  </span>
                </div>
              </div>
            )}

            {/* REJECT SPECIFIC */}
            {isReject && (
              <div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Reason <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <select
                    value={rejectReason}
                    onChange={(e) => {
                      setRejectReason(e.target.value);
                      if (error) setError(null);
                    }}
                    style={{ width: '100%', padding: '10px 12px', fontSize: '13.5px', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none', background: '#FFFFFF' }}
                    required
                  >
                    <option value="">[ Select reason ▼ ]</option>
                    {REJECTION_REASONS.map((r, i) => (
                      <option key={i} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Additional Notes <span style={{ fontWeight: 400, color: '#94A3B8' }}>(Optional)</span>
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Provide explanatory notes or customer notification instructions..."
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', fontSize: '13px', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none', resize: 'vertical' }}
                  />
                </div>
              </div>
            )}

            {/* NEEDS CLARIFICATION SPECIFIC */}
            {isClarification && (
              <div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Clarification Instructions for Customer <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Please upload a clearer image showing the doctor's signature and prescription date..."
                    value={customerMessage}
                    onChange={(e) => {
                      setCustomerMessage(e.target.value);
                      if (error) setError(null);
                    }}
                    style={{ width: '100%', padding: '10px 12px', fontSize: '13px', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none', resize: 'vertical' }}
                    required
                  />
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Internal Staff Notes <span style={{ fontWeight: 400, color: '#94A3B8' }}>(Optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Confidential pharmacy notes..."
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', fontSize: '13px', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none' }}
                  />
                </div>
              </div>
            )}
          </div>

          <div style={{ padding: '14px 24px', background: '#F8FAFC', borderTop: '1px solid #E5E9EB', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rx-btn rx-btn-outline"
            >
              Cancel
            </button>

            {isApprove && (
              <button
                type="submit"
                disabled={loading}
                className="rx-btn rx-btn-success"
              >
                {loading ? <Loader2 size={16} className="spin-anim" /> : <CheckCircle2 size={16} />}
                <span>{loading ? 'Approving...' : 'Approve Prescription'}</span>
              </button>
            )}

            {isReject && (
              <button
                type="submit"
                disabled={loading}
                className="rx-btn rx-btn-danger"
              >
                {loading ? <Loader2 size={16} className="spin-anim" /> : <XCircle size={16} />}
                <span>{loading ? 'Rejecting...' : 'Reject Prescription'}</span>
              </button>
            )}

            {isClarification && (
              <button
                type="submit"
                disabled={loading}
                className="rx-btn rx-btn-primary"
              >
                {loading ? <Loader2 size={16} className="spin-anim" /> : <HelpCircle size={16} />}
                <span>{loading ? 'Sending...' : 'Request Clarification'}</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReviewPrescriptionModal;
