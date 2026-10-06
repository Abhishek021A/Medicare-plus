import React, { useState, useEffect } from 'react';
import { 
  X, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  RotateCcw, 
  Download, 
  ExternalLink, 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  Package, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  AlertCircle, 
  ShieldCheck, 
  Eye 
} from 'lucide-react';
import { Link } from 'react-router-dom';

const PrescriptionPreviewModal = ({ 
  isOpen, 
  onClose, 
  prescription, 
  onOpenReviewModal 
}) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  // Reset zoom & rotation whenever a new prescription is opened
  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setRotation(0);
    }
  }, [isOpen, prescription?.id]);

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !prescription) return null;

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);
  const handleReset = () => {
    setZoom(1);
    setRotation(0);
  };

  // Determine file type and URL
  const fileUrl = prescription.file_url || prescription.file_path;
  const isPdf = prescription.mime_type === 'application/pdf' || 
                (prescription.original_filename && prescription.original_filename.toLowerCase().endsWith('.pdf')) ||
                (prescription.file_path && prescription.file_path.toLowerCase().endsWith('.pdf'));

  // Status badge config
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

  const formattedDate = prescription.created_at 
    ? new Date(prescription.created_at).toLocaleDateString('en-US', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : 'Unknown date';

  const avatarInitials = (prescription.customer_name || 'Customer')
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <div 
      className="rx-modal-overlay" 
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="rx-preview-title"
    >
      <div className="rx-preview-modal-card">
        {/* Top Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid #E5E9EB', backgroundColor: '#FFFFFF' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '16px', fontWeight: '700', color: '#1E293B', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={18} color="#087F73" />
              <span id="rx-preview-title">Prescription {prescription.prescription_number || `RX-${prescription.id}`}</span>
            </span>
            <span className={`rx-status-badge ${getBadgeClass()}`}>
              <span className="rx-status-dot" />
              {getStatusLabel()}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Link 
              to={`/admin/prescriptions/${prescription.id}`}
              className="rx-btn rx-btn-outline rx-btn-sm"
              style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <ExternalLink size={14} />
              Full Details
            </Link>
            <button 
              type="button"
              onClick={onClose}
              className="rx-btn rx-btn-outline rx-btn-sm"
              style={{ padding: '6px 8px' }}
              aria-label="Close prescription preview"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Main Layout: Split 2-column view */}
        <div className="rx-preview-layout">
          {/* Left Column: Document Pane with Interactive Controls */}
          <div className="rx-doc-pane">
            <div className="rx-doc-toolbar">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: '#CBD5E1' }}>
                <Eye size={15} />
                <span>{prescription.original_filename || 'Prescription Document'}</span>
                {prescription.file_size && (
                  <span style={{ opacity: 0.7 }}>
                    ({(prescription.file_size / 1024).toFixed(0)} KB)
                  </span>
                )}
              </div>

              <div className="rx-doc-controls">
                <button 
                  type="button" 
                  onClick={handleZoomIn} 
                  className="rx-doc-btn" 
                  title="Zoom In (+25%)"
                  disabled={zoom >= 3}
                >
                  <ZoomIn size={14} />
                </button>
                <button 
                  type="button" 
                  onClick={handleZoomOut} 
                  className="rx-doc-btn" 
                  title="Zoom Out (-25%)"
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
                  title="Reset Zoom & Orientation"
                >
                  <RotateCcw size={14} />
                  <span style={{ fontSize: '11px' }}>{Math.round(zoom * 100)}%</span>
                </button>
                <a 
                  href={fileUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="rx-doc-btn" 
                  title="Open Full Size in New Tab"
                  download={prescription.original_filename || `prescription_${prescription.prescription_number || prescription.id}`}
                >
                  <Download size={14} />
                </a>
              </div>
            </div>

            {/* Document Viewport */}
            <div className="rx-doc-viewport">
              {isPdf ? (
                <iframe
                  src={`${fileUrl}#toolbar=0&navpanes=0`}
                  title="Prescription PDF Document"
                  style={{
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    borderRadius: '4px',
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
                  className="rx-doc-img"
                  style={{
                    transform: `scale(${zoom}) rotate(${rotation}deg)`,
                    transformOrigin: 'center center'
                  }}
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="400" height="300" fill="%23f1f5f9"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="14" fill="%2364748b">Document preview unavailable</text></svg>';
                  }}
                />
              )}
            </div>
          </div>

          {/* Right Column: Customer Details, Order Details, and Review Actions */}
          <div className="rx-review-pane">
            {/* Customer Section */}
            <div className="rx-review-section">
              <div className="rx-section-title">
                <User size={15} color="#087F73" />
                Customer Information
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '12px' }}>
                <div className="rx-avatar" style={{ width: '44px', height: '44px', fontSize: '15px' }}>
                  {avatarInitials}
                </div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: '700', color: '#1E293B' }}>
                    {prescription.customer_name || 'Customer'}
                  </div>
                  <div style={{ fontSize: '13px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Mail size={13} />
                    {prescription.customer_email || 'No email provided'}
                  </div>
                </div>
              </div>

              {prescription.customer_phone && (
                <div style={{ fontSize: '12.5px', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                  <Phone size={13} color="#64748B" />
                  <span>{prescription.customer_phone}</span>
                </div>
              )}
            </div>

            {/* Submission & Order Connection */}
            <div className="rx-review-section">
              <div className="rx-section-title">
                <Package size={15} color="#087F73" />
                Prescription & Order Link
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px' }}>
                <div>
                  <span style={{ color: '#64748B', display: 'block', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>Uploaded</span>
                  <span style={{ fontWeight: 600, color: '#1E293B' }}>{formattedDate}</span>
                </div>

                <div>
                  <span style={{ color: '#64748B', display: 'block', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>Linked Order</span>
                  {prescription.order_number ? (
                    <Link 
                      to={`/admin/orders/${prescription.order_id || ''}`}
                      style={{ color: '#087F73', fontWeight: '700', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      {prescription.order_number}
                      <ExternalLink size={12} />
                    </Link>
                  ) : (
                    <span style={{ color: '#94A3B8', fontStyle: 'italic' }}>Not linked to an order</span>
                  )}
                </div>
              </div>

              {prescription.customer_message && (
                <div style={{ marginTop: '12px', padding: '10px 12px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '12.5px' }}>
                  <span style={{ display: 'block', fontWeight: 600, color: '#334155', marginBottom: '2px', fontSize: '11.5px' }}>
                    Customer Note:
                  </span>
                  <span style={{ color: '#475569' }}>{prescription.customer_message}</span>
                </div>
              )}
            </div>

            {/* Review Information / Audit */}
            <div className="rx-review-section">
              <div className="rx-section-title">
                <ShieldCheck size={15} color="#087F73" />
                Verification Status
              </div>

              <div style={{ background: '#F8FAFC', borderRadius: '10px', padding: '14px', border: '1px solid #E2E8F0', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: '#64748B' }}>Current Status:</span>
                  <span className={`rx-status-badge ${getBadgeClass()}`}>
                    <span className="rx-status-dot" />
                    {getStatusLabel()}
                  </span>
                </div>

                {prescription.reviewed_by_name && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ color: '#64748B' }}>Verified By:</span>
                    <span style={{ fontWeight: 600, color: '#1E293B' }}>{prescription.reviewed_by_name}</span>
                  </div>
                )}

                {prescription.reviewed_at && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ color: '#64748B' }}>Verified At:</span>
                    <span style={{ color: '#334155' }}>
                      {new Date(prescription.reviewed_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                    </span>
                  </div>
                )}

                {prescription.admin_notes && (
                  <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed #CBD5E1' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                      Internal Staff Notes
                    </span>
                    <p style={{ margin: 0, color: '#334155', fontSize: '12.5px', lineHeight: 1.4 }}>
                      {prescription.admin_notes}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Admin Review Action Controls */}
            <div className="rx-review-section" style={{ borderBottom: 'none', marginTop: 'auto', paddingTop: '16px' }}>
              <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#1E293B', display: 'block', marginBottom: '10px' }}>
                Take Administrative Action:
              </span>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {status !== 'APPROVED' && (
                  <button
                    type="button"
                    onClick={() => onOpenReviewModal(prescription, 'APPROVE')}
                    className="rx-btn rx-btn-success"
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    <CheckCircle2 size={16} />
                    <span>Approve Prescription</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => onOpenReviewModal(prescription, 'NEEDS_CLARIFICATION')}
                  className="rx-btn rx-btn-outline"
                  style={{ width: '100%', justifyContent: 'center', borderColor: '#BAE6FD', color: '#0284C7', backgroundColor: '#F0F9FF' }}
                >
                  <HelpCircle size={16} />
                  <span>Request Clarification</span>
                </button>

                {status !== 'REJECTED' && (
                  <button
                    type="button"
                    onClick={() => onOpenReviewModal(prescription, 'REJECT')}
                    className="rx-btn rx-btn-danger"
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    <XCircle size={16} />
                    <span>Reject Prescription</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrescriptionPreviewModal;
