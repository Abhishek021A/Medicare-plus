import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  UploadCloud, FileText, File, Image as ImageIcon, FileCheck, X, ChevronRight, AlertCircle, FilePlus, Eye
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './Prescriptions.css';

const Prescriptions = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Upload state
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  
  // Modal state
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (currentUser) {
      fetchPrescriptions();
    } else {
      setLoading(false);
    }
  }, [currentUser]);

  const fetchPrescriptions = async () => {
    setLoading(true);
    try {
      // The backend returns the current customer's prescriptions when called without admin auth
      const res = await api.getPrescriptions();
      if (res.success) {
        setPrescriptions(res.data.prescriptions || res.data || []);
      } else {
        setError(res.message || 'Failed to load prescriptions.');
      }
    } catch (err) {
      setError('Error connecting to the server.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    validateAndSetFile(selectedFile);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    validateAndSetFile(droppedFile);
  };

  const validateAndSetFile = (selectedFile) => {
    setUploadError('');
    setUploadSuccess(false);

    if (!selectedFile) return;

    // Validate type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(selectedFile.type)) {
      setUploadError('Unsupported file type. Please upload a JPG, PNG, WEBP, or PDF.');
      return;
    }

    // Validate size (8MB)
    if (selectedFile.size > 8 * 1024 * 1024) {
      setUploadError('File size exceeds the 8MB limit.');
      return;
    }

    setFile(selectedFile);

    if (selectedFile.type.startsWith('image/')) {
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  };

  const clearFile = () => {
    setFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUpload = async () => {
    if (!file) return;
    
    setUploading(true);
    setUploadError('');
    setUploadSuccess(false);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('customer_message', 'Uploaded via customer portal');

    try {
      const res = await api.uploadPrescription(formData);
      if (res.success) {
        setUploadSuccess(true);
        clearFile();
        fetchPrescriptions(); // Refresh list
      } else {
        setUploadError(res.message || 'Failed to upload prescription.');
      }
    } catch (err) {
      setUploadError('An error occurred during upload. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const getStatusBadge = (status) => {
    const s = status ? status.toUpperCase() : 'PENDING';
    let className = 'status-badge ';
    if (s === 'PENDING') className += 'badge-amber';
    else if (s === 'APPROVED') className += 'badge-green';
    else if (s === 'REJECTED') className += 'badge-red';
    else if (s === 'UNDER_REVIEW' || s === 'NEEDS_CLARIFICATION') className += 'badge-blue';
    else className += 'badge-gray';
    
    return <span className={className}>{s.replace('_', ' ')}</span>;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const d = new Date(dateString);
    return d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // Not logged in state
  if (!currentUser) {
    return (
      <div className="prescriptions-page">
        <div className="container page-container text-center not-logged-in">
          <div className="auth-prompt">
            <UploadCloud size={64} className="prompt-icon" />
            <h2>Login to Upload Prescription</h2>
            <p>You need to be logged in to upload and manage your prescriptions securely.</p>
            <div className="auth-buttons">
              <Link to="/login" className="btn btn-primary">Login</Link>
              <Link to="/register" className="btn btn-outline">Create Account</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="prescriptions-page">
      {/* Breadcrumb */}
      <div className="breadcrumb-wrapper">
        <div className="container">
          <Link to="/">Home</Link>
          <ChevronRight size={14} />
          <span>Prescriptions</span>
        </div>
      </div>

      {/* Hero Section */}
      <section className="prescription-hero">
        <div className="container">
          <div className="hero-grid">
            <div className="hero-content">
              <h1>Manage Your Prescriptions</h1>
              <p>Upload your prescription and we'll help you find the medicines you need. Fast, secure, and reliable.</p>
              
              <div className="features-list">
                <div className="feature-item"><FileCheck size={18}/> Easy Upload</div>
                <div className="feature-item"><FileCheck size={18}/> Secure Review</div>
                <div className="feature-item"><FileCheck size={18}/> Safe Delivery</div>
              </div>
            </div>
            
            <div className="hero-image-wrapper">
              <div className={`upload-card ${isDragOver ? 'drag-over' : ''}`}>
                <h3 className="upload-card-title">Upload Prescription</h3>
                
                {!file ? (
                  <div 
                    className="drag-drop-zone"
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <UploadCloud size={48} className="upload-icon" />
                    <h4>Drag & Drop your file here</h4>
                    <p>or click to browse</p>
                    <span className="file-limits">Supported: JPG, PNG, WEBP, PDF (Max: 8MB)</span>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileChange} 
                      accept=".jpg,.jpeg,.png,.webp,.pdf" 
                      style={{ display: 'none' }} 
                    />
                  </div>
                ) : (
                  <div className="file-preview-area">
                    <div className="file-preview-content">
                      {previewUrl ? (
                        <img src={previewUrl} alt="Preview" className="image-preview" />
                      ) : (
                        <div className="pdf-preview">
                          <FileText size={48} />
                        </div>
                      )}
                      <div className="file-details">
                        <span className="file-name">{file.name}</span>
                        <span className="file-size">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                      </div>
                      <button className="remove-file-btn" onClick={clearFile} disabled={uploading}>
                        <X size={20} />
                      </button>
                    </div>
                    
                    <button 
                      className="btn btn-primary w-100 upload-action-btn"
                      onClick={handleUpload}
                      disabled={uploading}
                    >
                      {uploading ? 'Uploading...' : 'Upload Prescription'}
                    </button>
                  </div>
                )}
                
                {uploadError && <div className="upload-alert error"><AlertCircle size={16}/> {uploadError}</div>}
                {uploadSuccess && <div className="upload-alert success"><FileCheck size={16}/> Prescription uploaded successfully!</div>}
                
                <p className="medical-disclaimer">
                  * Prescription verification is subject to review by authorized pharmacy staff. Do not upload prescriptions belonging to another person.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Prescriptions List Section */}
      <section className="prescriptions-list-section section-padding">
        <div className="container">
          <div className="section-header">
            <h2>My Prescriptions</h2>
          </div>

          {loading ? (
            <div className="loading-state">
              <div className="skeleton-card"></div>
              <div className="skeleton-card"></div>
              <div className="skeleton-card"></div>
            </div>
          ) : prescriptions.length === 0 ? (
            <div className="empty-state">
              <FilePlus size={64} className="empty-icon" />
              <h3>No prescriptions yet</h3>
              <p>Upload your prescription above to get started.</p>
              <button className="btn btn-primary mt-15" onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})}>
                Upload Prescription
              </button>
            </div>
          ) : (
            <div className="prescriptions-grid">
              {prescriptions.map((rx) => (
                <div key={rx.id} className="prescription-card">
                  <div className="card-header">
                    <div className="rx-id-group">
                      <FileText size={20} className="rx-icon" />
                      <span className="rx-id">{rx.prescription_number || `RX-${rx.id}`}</span>
                    </div>
                    {getStatusBadge(rx.status)}
                  </div>
                  
                  <div className="card-body">
                    <div className="rx-detail-row">
                      <span className="rx-label">Uploaded</span>
                      <span className="rx-value">{formatDate(rx.created_at)}</span>
                    </div>
                    <div className="rx-detail-row">
                      <span className="rx-label">File</span>
                      <span className="rx-value file-name-value text-truncate" title={rx.original_filename || 'document'}>
                        {rx.original_filename || (rx.file_path ? rx.file_path.split('/').pop() : 'prescription')}
                      </span>
                    </div>
                    {rx.order_number && (
                      <div className="rx-detail-row">
                        <span className="rx-label">Order</span>
                        <Link to={`/account/orders/${rx.order_id}`} className="rx-value order-link">
                          {rx.order_number}
                        </Link>
                      </div>
                    )}
                    {rx.rejection_reason && rx.status === 'REJECTED' && (
                      <div className="rx-detail-row rejection-row">
                        <span className="rx-label">Reason</span>
                        <span className="rx-value text-danger text-truncate" title={rx.rejection_reason}>{rx.rejection_reason}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="card-footer">
                    <button className="btn btn-outline btn-sm w-100" onClick={() => setSelectedPrescription(rx)}>
                      <Eye size={16} /> View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Modal for viewing details and file preview */}
      {selectedPrescription && (
        <div className="modal-overlay active" onClick={() => setSelectedPrescription(null)}>
          <div className="prescription-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Prescription Details ({selectedPrescription.prescription_number || `RX-${selectedPrescription.id}`})</h3>
              <button className="close-btn" onClick={() => setSelectedPrescription(null)}>
                <X size={24} />
              </button>
            </div>
            <div className="modal-body">
              <div className="modal-status-bar">
                Status: {getStatusBadge(selectedPrescription.status)}
                <span className="modal-date">Uploaded: {formatDate(selectedPrescription.created_at)}</span>
              </div>
              
              <div className="modal-file-preview">
                {selectedPrescription.mime_type === 'application/pdf' ? (
                  <iframe 
                    src={selectedPrescription.file_url || `${import.meta.env.VITE_API_URL || 'http://localhost:8080/pharmacy_api/api'}/../${selectedPrescription.file_path}`} 
                    title="PDF Preview" 
                    className="pdf-iframe" 
                  />
                ) : (
                  <img 
                    src={selectedPrescription.file_url || `${import.meta.env.VITE_API_URL || 'http://localhost:8080/pharmacy_api/api'}/../${selectedPrescription.file_path}`} 
                    alt="Prescription" 
                    className="img-preview" 
                  />
                )}
              </div>
              
              {selectedPrescription.rejection_reason && selectedPrescription.status === 'REJECTED' && (
                <div className="modal-notes error-notes">
                  <strong>Rejection Reason:</strong> {selectedPrescription.rejection_reason}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Prescriptions;
