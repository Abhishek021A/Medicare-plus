import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  FileText, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Package, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  Download, 
  ExternalLink, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  RotateCcw, 
  RefreshCw, 
  AlertTriangle,
  Send,
  MessageSquare
} from 'lucide-react';
import { adminPrescriptionService } from '../../../services/adminApi';
import ReviewPrescriptionModal from './ReviewPrescriptionModal';
import './AdminPrescriptions.css';

export default function AdminPrescriptionDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [prescription, setPrescription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Document viewer controls
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  // Review Modal state
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [actionType, setActionType] = useState('APPROVE');

  // Quick internal note editing
  const [internalNote, setInternalNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  const fetchPrescriptionDetails = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await adminPrescriptionService.getPrescriptionDetails(id);
      const rxData = res?.data?.prescription || res?.prescription || res?.data;
      if (res && res.success && rxData) {
        setPrescription(rxData);
        setInternalNote(rxData.admin_notes || '');
      } else {
        throw new Error(res?.message || 'Prescription record not found.');
      }
    } catch (err) {
      console.error('Error fetching prescription details:', err);
      setError(err.response?.data?.message || err.message || 'Unable to load prescription details.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    fetchPrescriptionDetails();
  }, [fetchPrescriptionDetails]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);
  const handleReset = () => {
    setZoom(1);
    setRotation(0);
  };

  const handleOpenReview = (type) => {
    setActionType(type);
    setReviewModalOpen(true);
  };

  const handleReviewSuccess = (updated) => {
    if (updated) {
      setPrescription(prev => ({
        ...prev,
        ...updated,
        status: (updated.status || prev.status).toUpperCase(),
        reviewed_by_name: updated.reviewed_by_name || updated.reviewer_name || 'Super Admin',
        reviewed_at: updated.reviewed_at || new Date().toISOString()
      }));
    }
    showToast(`Prescription status updated successfully.`);
    fetchPrescriptionDetails(true);
  };

  const handleSaveInternalNote = async (e) => {
    e.preventDefault();
    if (!prescription) return;
    setSavingNote(true);

    try {
      const res = await adminPrescriptionService.updateStatus(prescription.id, {
        status: prescription.status,
        admin_notes: internalNote,
        notes: `Internal note updated: ${internalNote}`
      });

      if (res && res.success) {
        showToast('Internal notes saved securely.');
        fetchPrescriptionDetails(true);
      } else {
        alert(res?.message || 'Failed to save note.');
      }
    } catch (err) {
      console.error('Failed to save internal note:', err);
      alert(err.response?.data?.message || 'Server error while saving note.');
    } finally {
      setSavingNote(false);
    }
  };

  if (loading) {
    return (
      <div className="rx-page-wrapper">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
          <div className="rx-skeleton-line" style={{ width: '140px', height: '18px' }} />
        </div>
        <div className="rx-skeleton-line" style={{ width: '280px', height: '36px', marginBottom: '12px' }} />
        <div className="rx-skeleton-line" style={{ width: '420px', height: '20px', marginBottom: '32px' }} />

        <div className="rx-details-grid">
          <div>
            <div className="rx-card" style={{ height: '500px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="rx-skeleton-line" style={{ width: '60%', height: '20px' }} />
            </div>
          </div>
          <div>
            <div className="rx-card" style={{ height: '240px', marginBottom: '20px' }}>
              <div className="rx-skeleton-line" style={{ width: '40%', height: '20px', marginBottom: '16px' }} />
              <div className="rx-skeleton-line" style={{ width: '80%', height: '16px', marginBottom: '12px' }} />
              <div className="rx-skeleton-line" style={{ width: '60%', height: '16px' }} />
            </div>
            <div className="rx-card" style={{ height: '240px' }}>
              <div className="rx-skeleton-line" style={{ width: '40%', height: '20px', marginBottom: '16px' }} />
              <div className="rx-skeleton-line" style={{ width: '80%', height: '16px', marginBottom: '12px' }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !prescription) {
    return (
      <div className="rx-page-wrapper">
        <div className="rx-breadcrumb" style={{ marginBottom: '20px' }}>
          <Link to="/admin/prescriptions">← Back to Prescriptions</Link>
        </div>
        <div className="rx-table-card">
          <div className="rx-error-state">
            <div className="rx-error-icon">
              <AlertTriangle size={32} />
            </div>
            <h3 className="rx-error-title">Prescription Not Found</h3>
            <p className="rx-error-desc">{error || 'The requested prescription record could not be found or has been removed.'}</p>
            <Link to="/admin/prescriptions" className="rx-btn rx-btn-primary">
              Return to Prescriptions List
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const status = (prescription.status || 'PENDING').toUpperCase();
  const getBadgeClass = () => {
    switch (status) {
      case 'APPROVED': return 'rx-status-approved';
      case 'REJECTED': return 'rx-status-rejected';
      case 'NEEDS_CLARIFICATION': return 'rx-status-clarification';
      default: return 'rx-status-pending';
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case 'APPROVED': return 'Approved';
      case 'REJECTED': return 'Rejected';
      case 'NEEDS_CLARIFICATION': return 'Needs Clarification';
      default: return 'Pending Review';
    }
  };

  const fileUrl = prescription.file_url || prescription.file_path;
  const isPdf = prescription.mime_type === 'application/pdf' || 
                (prescription.original_filename && prescription.original_filename.toLowerCase().endsWith('.pdf'));

  const avatarInitials = (prescription.customer_name || 'Customer')
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const uploadFormatted = prescription.created_at
    ? new Date(prescription.created_at).toLocaleDateString('en-US', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : 'Unknown';

  return (
    <div className="rx-page-wrapper">
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          zIndex: 9999,
          backgroundColor: '#087F73',
          color: '#FFFFFF',
          padding: '12px 20px',
          borderRadius: '8px',
          boxShadow: '0 8px 24px rgba(8, 127, 115, 0.25)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '14px',
          fontWeight: 600
        }}>
          <CheckCircle2 size={18} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header & Navigation */}
      <div className="rx-header">
        <div>
          <div className="rx-breadcrumb">
            <Link to="/admin">Admin</Link>
            <span className="separator">/</span>
            <Link to="/admin/prescriptions">Prescriptions</Link>
            <span className="separator">/</span>
            <span className="current">{prescription.prescription_number || `RX-${prescription.id}`}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', marginTop: '6px' }}>
            <h1 className="rx-header-title" style={{ margin: 0 }}>
              Prescription {prescription.prescription_number || `RX-${prescription.id}`}
            </h1>
            <span className={`rx-status-badge ${getBadgeClass()}`}>
              <span className="rx-status-dot" />
              {getStatusLabel()}
            </span>
          </div>

          <p className="rx-header-subtitle" style={{ marginTop: '4px' }}>
            Uploaded by <strong>{prescription.customer_name || 'Customer'}</strong> on {uploadFormatted}
          </p>
        </div>

        <div className="rx-header-actions">
          <Link
            to="/admin/prescriptions"
            className="rx-btn rx-btn-outline"
          >
            <ArrowLeft size={15} />
            <span>Back to Prescriptions</span>
          </Link>

          <button
            type="button"
            className="rx-btn rx-btn-outline"
            onClick={() => fetchPrescriptionDetails(true)}
            disabled={refreshing}
          >
            <RefreshCw size={15} className={refreshing ? 'spin-anim' : ''} />
            <span>Refresh</span>
          </button>

          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            download={prescription.original_filename || `prescription_${prescription.prescription_number || prescription.id}`}
            className="rx-btn rx-btn-primary"
          >
            <Download size={15} />
            <span>Download Document</span>
          </a>
        </div>
      </div>

      {/* 2-Column Detail Layout */}
      <div className="rx-details-grid">
        {/* Left Column: Document Viewer + Linked Order Details */}
        <div>
          {/* Document Viewer Card */}
          <div className="rx-card" style={{ padding: 0, overflow: 'hidden', marginBottom: '24px' }}>
            <div style={{ padding: '14px 20px', background: '#0F172A', color: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                <FileText size={16} color="#087F73" />
                <span style={{ fontWeight: 600 }}>{prescription.original_filename || 'Prescription File'}</span>
                {prescription.file_size && (
                  <span style={{ color: '#94A3B8', fontSize: '12px' }}>
                    ({(prescription.file_size / 1024).toFixed(0)} KB)
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button 
                  type="button" 
                  onClick={handleZoomIn} 
                  className="rx-doc-btn" 
                  title="Zoom In"
                  disabled={zoom >= 3}
                >
                  <ZoomIn size={14} />
                </button>
                <button 
                  type="button" 
                  onClick={handleZoomOut} 
                  className="rx-doc-btn" 
                  title="Zoom Out"
                  disabled={zoom <= 0.5}
                >
                  <ZoomOut size={14} />
                </button>
                <button 
                  type="button" 
                  onClick={handleRotate} 
                  className="rx-doc-btn" 
                  title="Rotate 90°"
                >
                  <RotateCw size={14} />
                </button>
                <button 
                  type="button" 
                  onClick={handleReset} 
                  className="rx-doc-btn" 
                  title="Reset"
                >
                  <RotateCcw size={14} />
                  <span style={{ fontSize: '11px' }}>{Math.round(zoom * 100)}%</span>
                </button>
                <a 
                  href={fileUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="rx-doc-btn" 
                  title="Open Full Resolution"
                >
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>

            <div style={{ height: '540px', backgroundColor: '#1E293B', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'auto', padding: '24px' }}>
              {isPdf ? (
                <iframe
                  src={`${fileUrl}#toolbar=0`}
                  title="Prescription PDF Document"
                  style={{
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    borderRadius: '6px',
                    backgroundColor: '#FFFFFF',
                    transform: `scale(${zoom}) rotate(${rotation}deg)`,
                    transformOrigin: 'center center',
                    transition: 'transform 0.2s ease'
                  }}
                />
              ) : (
                <img
                  src={fileUrl}
                  alt={`Prescription ${prescription.prescription_number || prescription.id}`}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain',
                    boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
                    borderRadius: '4px',
                    transform: `scale(${zoom}) rotate(${rotation}deg)`,
                    transformOrigin: 'center center',
                    transition: 'transform 0.2s ease'
                  }}
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="400" height="300" fill="%23f1f5f9"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="14" fill="%2364748b">Document preview unavailable</text></svg>';
                  }}
                />
              )}
            </div>
          </div>

          {/* Linked Order Section */}
          <div className="rx-card" style={{ marginBottom: '24px' }}>
            <div className="rx-card-header" style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Package size={18} color="#087F73" />
                <span style={{ fontSize: '15px', fontWeight: '700', color: '#1E293B' }}>
                  Linked Order Details
                </span>
              </div>

              {prescription.order_number && (
                <Link
                  to={`/admin/orders/${prescription.order_id}`}
                  className="rx-btn rx-btn-outline rx-btn-sm"
                  style={{ textDecoration: 'none' }}
                >
                  <span>View Order #{prescription.order_number}</span>
                  <ExternalLink size={13} />
                </Link>
              )}
            </div>

            {prescription.order_number ? (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '14px', background: '#F8FAFC', padding: '14px', borderRadius: '10px', marginBottom: '16px', border: '1px solid #E2E8F0' }}>
                  <div>
                    <span style={{ fontSize: '11.5px', color: '#64748B', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Order ID</span>
                    <span style={{ fontWeight: 700, color: '#087F73' }}>{prescription.order_number}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: '11.5px', color: '#64748B', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Order Status</span>
                    <span style={{ fontWeight: 600, color: '#1E293B' }}>{prescription.order_status || 'PROCESSING'}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: '11.5px', color: '#64748B', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Total Amount</span>
                    <span style={{ fontWeight: 700, color: '#1E293B' }}>
                      ₹{parseFloat(prescription.order_total || 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Items in the order */}
                {prescription.order_items && prescription.order_items.length > 0 && (
                  <div>
                    <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '8px' }}>
                      Medicines In This Order:
                    </span>
                    <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden' }}>
                      {prescription.order_items.map((item, idx) => (
                        <div 
                          key={idx} 
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'space-between', 
                            padding: '10px 14px', 
                            borderBottom: idx === prescription.order_items.length - 1 ? 'none' : '1px solid #F1F5F9',
                            backgroundColor: item.prescription_required ? '#F0FDF4' : '#FFFFFF'
                          }}
                        >
                          <div>
                            <span style={{ fontWeight: 600, fontSize: '13.5px', color: '#1E293B', display: 'block' }}>
                              {item.product_name}
                            </span>
                            <span style={{ fontSize: '12px', color: '#64748B' }}>
                              Qty: {item.quantity} × ₹{parseFloat(item.price || 0).toFixed(2)}
                            </span>
                          </div>

                          {item.prescription_required ? (
                            <span style={{ fontSize: '11px', fontWeight: 700, color: '#087F73', background: '#E6F7F5', padding: '3px 8px', borderRadius: '4px' }}>
                              Rx Required
                            </span>
                          ) : (
                            <span style={{ fontSize: '11px', color: '#64748B' }}>
                              OTC / General
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ padding: '24px', textAlign: 'center', color: '#64748B', background: '#F8FAFC', borderRadius: '10px' }}>
                <p style={{ margin: 0, fontSize: '13.5px' }}>
                  This prescription was uploaded directly to the customer's account and is not yet linked to an active checkout order.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Review Controls, Customer Card, Notes, Timeline */}
        <div>
          {/* Clinical Review Actions Card */}
          <div className="rx-card" style={{ marginBottom: '24px', borderTop: '4px solid #087F73' }}>
            <div className="rx-card-header" style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={18} color="#087F73" />
                <span style={{ fontSize: '15px', fontWeight: '700', color: '#1E293B' }}>
                  Verification & Review
                </span>
              </div>
              <span className={`rx-status-badge ${getBadgeClass()}`}>
                <span className="rx-status-dot" />
                {getStatusLabel()}
              </span>
            </div>

            <p style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.5, margin: '0 0 16px' }}>
              Review the physician signature, issue date, patient identity, and prescribed medications before approving.
            </p>

            {/* Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              {status === 'APPROVED' ? (
                <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', padding: '12px 14px', borderRadius: '8px', fontSize: '13.5px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <CheckCircle2 size={16} />
                  <span>Prescription Approved</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => handleOpenReview('APPROVE')}
                  className="rx-btn rx-btn-success"
                  style={{ width: '100%', padding: '11px', fontSize: '14px' }}
                >
                  <CheckCircle2 size={16} />
                  <span>Approve Prescription</span>
                </button>
              )}

              {status !== 'APPROVED' && status !== 'REJECTED' && (
                <button
                  type="button"
                  onClick={() => handleOpenReview('NEEDS_CLARIFICATION')}
                  className="rx-btn rx-btn-outline"
                  style={{ width: '100%', padding: '10px', fontSize: '14px', borderColor: '#BAE6FD', color: '#0284C7', backgroundColor: '#F0F9FF' }}
                >
                  <HelpCircle size={16} />
                  <span>Request Customer Clarification</span>
                </button>
              )}

              {status === 'REJECTED' ? (
                <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B', padding: '12px 14px', borderRadius: '8px', fontSize: '13.5px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <XCircle size={16} />
                  <span>Prescription Rejected</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => handleOpenReview('REJECT')}
                  className="rx-btn rx-btn-danger"
                  style={{ width: '100%', padding: '10px', fontSize: '14px' }}
                >
                  <XCircle size={16} />
                  <span>Reject Prescription</span>
                </button>
              )}
            </div>

            {/* Staff Internal Notes form */}
            <form onSubmit={handleSaveInternalNote} style={{ borderTop: '1px solid #E5E9EB', paddingTop: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#334155' }}>
                  Internal Staff Notes
                </label>
                <span style={{ fontSize: '11px', color: '#64748B' }}>🔒 Admin-only</span>
              </div>
              <textarea
                rows={3}
                placeholder="Add confidential review notes, verification findings, or pharmacist remarks..."
                value={internalNote}
                onChange={(e) => setInternalNote(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', fontSize: '13px', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none', resize: 'vertical' }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button
                  type="submit"
                  disabled={savingNote}
                  className="rx-btn rx-btn-outline rx-btn-sm"
                >
                  {savingNote ? <RefreshCw size={13} className="spin-anim" /> : <Send size={13} />}
                  <span>Save Notes</span>
                </button>
              </div>
            </form>
          </div>

          {/* Customer Information Card */}
          <div className="rx-card" style={{ marginBottom: '24px' }}>
            <div className="rx-card-header" style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <User size={18} color="#087F73" />
                <span style={{ fontSize: '15px', fontWeight: '700', color: '#1E293B' }}>
                  Customer Details
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
              <div className="rx-avatar" style={{ width: '48px', height: '48px', fontSize: '16px' }}>
                {avatarInitials}
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#1E293B' }}>
                  {prescription.customer_name || 'Customer'}
                </h3>
                <span style={{ fontSize: '12px', color: '#64748B' }}>
                  Account ID: #{prescription.user_id || '—'}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#334155' }}>
                <Mail size={15} color="#64748B" />
                <span>{prescription.customer_email || 'No email provided'}</span>
              </div>

              {prescription.customer_phone && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#334155' }}>
                  <Phone size={15} color="#64748B" />
                  <span>{prescription.customer_phone}</span>
                </div>
              )}

              {prescription.shipping_address && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', color: '#334155', marginTop: '4px' }}>
                  <MapPin size={15} color="#64748B" style={{ marginTop: '2px', flexShrink: 0 }} />
                  <span style={{ lineHeight: 1.4 }}>{prescription.shipping_address}</span>
                </div>
              )}
            </div>

            {/* Customer Message / Clarification Note */}
            {prescription.customer_message && (
              <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#0284C7', fontWeight: 600, fontSize: '12px', marginBottom: '4px' }}>
                  <MessageSquare size={14} />
                  <span>Customer Message / Clarification:</span>
                </div>
                <p style={{ margin: 0, fontSize: '13px', color: '#0369A1' }}>
                  {prescription.customer_message}
                </p>
              </div>
            )}
          </div>

          {/* Audit History Timeline */}
          <div className="rx-card">
            <div className="rx-card-header" style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={18} color="#087F73" />
                <span style={{ fontSize: '15px', fontWeight: '700', color: '#1E293B' }}>
                  Activity & Verification History
                </span>
              </div>
            </div>

            <div className="rx-timeline-list">
              {/* If history entries exist */}
              {prescription.history && prescription.history.length > 0 ? (
                prescription.history.map((hist, idx) => (
                  <div key={idx} className="rx-timeline-item">
                    <div className="rx-timeline-dot" />
                    <div className="rx-timeline-content">
                      <div className="rx-timeline-status">
                        {hist.new_status ? hist.new_status.replace('_', ' ') : 'Updated'}
                      </div>
                      <div className="rx-timeline-meta">
                        {new Date(hist.created_at).toLocaleString('en-US', {
                          dateStyle: 'medium',
                          timeStyle: 'short'
                        })}
                        {hist.admin_name && ` • by ${hist.admin_name}`}
                      </div>
                      {hist.notes && (
                        <div className="rx-timeline-notes">
                          {hist.notes}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                /* Fallback initial entry */
                <div className="rx-timeline-item">
                  <div className="rx-timeline-dot" />
                  <div className="rx-timeline-content">
                    <div className="rx-timeline-status">Uploaded Document</div>
                    <div className="rx-timeline-meta">
                      {uploadFormatted} • by Customer
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Review Prescription Action Modal */}
      <ReviewPrescriptionModal
        isOpen={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        prescription={prescription}
        actionType={actionType}
        onSuccess={handleReviewSuccess}
      />
    </div>
  );
}
