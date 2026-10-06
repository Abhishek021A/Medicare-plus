import React, { useState, useEffect, useRef } from 'react';
import { adminBrandService } from '../../../services/adminApi';
import { useToast } from '../../../context/ToastContext';

export default function AdminBrandForm({ isOpen, onClose, onSuccess, brand = null }) {
  const { showToast } = useToast();
  
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    website: '',
    status: 'ACTIVE',
    featured: false,
    sort_order: 0
  });
  
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  const fileInputRef = useRef(null);

  // Initialize form when opened or brand changes
  useEffect(() => {
    if (isOpen) {
      if (brand) {
        setFormData({
          name: brand.name || '',
          slug: brand.slug || '',
          description: brand.description || '',
          website: brand.website || '',
          status: brand.status || 'ACTIVE',
          featured: brand.featured == 1 || brand.featured === true,
          sort_order: brand.sort_order || 0
        });
        
        if (brand.logo) {
          const API_BASE = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api/index.php', '') : 'http://localhost:8080/pharmacy_api';
          setLogoPreview(`${API_BASE}/${brand.logo}`);
        } else {
          setLogoPreview(null);
        }
      } else {
        // Reset form for new brand
        setFormData({
          name: '',
          slug: '',
          description: '',
          website: '',
          status: 'ACTIVE',
          featured: false,
          sort_order: 0
        });
        setLogoPreview(null);
      }
      setLogoFile(null);
    }
  }, [isOpen, brand]);

  // Auto-generate slug from name if creating a new brand
  const handleNameChange = (e) => {
    const newName = e.target.value;
    const newSlug = newName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    
    setFormData(prev => ({
      ...prev,
      name: newName,
      // Only auto-update slug if we are creating a new brand OR if the user hasn't manually edited the slug
      slug: prev.slug === '' || (brand === null && prev.slug === prev.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')) ? newSlug : prev.slug
    }));
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };
  
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };
  
  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };
  
  const handleFile = (file) => {
    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      showToast('error', 'Only JPG, PNG and WEBP images are allowed');
      return;
    }
    
    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      showToast('error', 'Image size must be less than 5MB');
      return;
    }
    
    setLogoFile(file);
    const objectUrl = URL.createObjectURL(file);
    setLogoPreview(objectUrl);
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.slug) {
      showToast('error', 'Name and Slug are required');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Use FormData if we have a file, otherwise standard JSON
      let submitData;
      
      if (logoFile) {
        submitData = new FormData();
        Object.keys(formData).forEach(key => {
          submitData.append(key, formData[key]);
        });
        submitData.append('logo', logoFile);
      } else {
        submitData = { ...formData };
      }
      
      if (brand) {
        await adminBrandService.updateBrand(brand.id, submitData);
        showToast('success', 'Brand updated successfully');
      } else {
        await adminBrandService.createBrand(submitData);
        showToast('success', 'Brand created successfully');
      }
      
      onSuccess();
    } catch (error) {
      console.error('Error saving brand:', error);
      const errorMsg = error.response?.data?.message || 'Unable to save brand. Please try again.';
      showToast('error', errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="admin-modal-overlay brand-drawer-overlay" onClick={onClose} style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
      backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
      display: 'flex', justifyContent: 'flex-end'
    }}>
      <div className="admin-drawer brand-drawer-content" onClick={e => e.stopPropagation()} style={{
        backgroundColor: '#fff', width: '100%', maxWidth: '480px', height: '100%', 
        overflowY: 'auto', display: 'flex', flexDirection: 'column', boxShadow: '-5px 0 15px rgba(0,0,0,0.1)'
      }}>
        
        <div className="drawer-header" style={{ padding: '20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#333' }}>
            {brand ? 'Edit Brand' : 'Add New Brand'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#666' }}>
            &times;
          </button>
        </div>
        
        <div className="drawer-body" style={{ padding: '20px', flex: 1 }}>
          <form id="brandForm" onSubmit={handleSubmit}>
            
            <div className="form-group" style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Brand Name *</label>
              <input 
                type="text" 
                name="name"
                value={formData.name}
                onChange={handleNameChange}
                required
                className="form-control"
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
                placeholder="e.g. Health Plus"
              />
            </div>
            
            <div className="form-group" style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Slug *</label>
              <input 
                type="text" 
                name="slug"
                value={formData.slug}
                onChange={handleChange}
                required
                className="form-control"
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
              />
              <small style={{ color: '#888', display: 'block', marginTop: '4px' }}>Unique identifier for URL (e.g. health-plus)</small>
            </div>
            
            <div className="form-group" style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Description</label>
              <textarea 
                name="description"
                value={formData.description}
                onChange={handleChange}
                className="form-control"
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd', minHeight: '80px', resize: 'vertical' }}
              ></textarea>
            </div>
            
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Brand Logo</label>
              
              {logoPreview ? (
                <div style={{ position: 'relative', marginBottom: '10px' }}>
                  <img src={logoPreview} alt="Preview" className="brand-logo-preview-large" />
                  <button 
                    type="button" 
                    onClick={removeLogo}
                    style={{ position: 'absolute', top: '15px', right: '15px', background: 'rgba(255,255,255,0.9)', border: '1px solid #ddd', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', color: '#c5221f' }}
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div 
                  className={`logo-upload-dropzone ${isDragging ? 'drag-active' : ''}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="logo-upload-icon"><i className="fa-solid fa-cloud-arrow-up"></i></div>
                  <p style={{ margin: '0 0 5px 0', fontWeight: '500' }}>Drag & Drop Image</p>
                  <p style={{ margin: '0', fontSize: '0.8rem', color: '#666' }}>or click to browse (Max 5MB)</p>
                </div>
              )}
              
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="image/jpeg, image/jpg, image/png, image/webp"
                style={{ display: 'none' }}
              />
            </div>
            
            <div className="form-group" style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Website</label>
              <input 
                type="url" 
                name="website"
                value={formData.website}
                onChange={handleChange}
                className="form-control"
                placeholder="https://..."
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '20px', marginBottom: '15px' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '10px', fontWeight: '500' }}>Status</label>
                <select 
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>
              
              <div className="form-group" style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '10px', fontWeight: '500' }}>Sort Order</label>
                <input 
                  type="number" 
                  name="sort_order"
                  value={formData.sort_order}
                  onChange={handleChange}
                  min="0"
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
                />
              </div>
            </div>
            
            <div className="form-group" style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px', backgroundColor: '#F6F9F8', borderRadius: '8px', border: '1px solid #eee' }}>
              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '4px' }}>Featured Brand</label>
                <span style={{ fontSize: '0.85rem', color: '#666' }}>Show in the Featured Brands section</span>
              </div>
              
              <label className="toggle-switch">
                <input 
                  type="checkbox" 
                  name="featured"
                  checked={formData.featured}
                  onChange={handleChange}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
            
          </form>
        </div>
        
        <div className="drawer-footer" style={{ padding: '20px', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'flex-end', gap: '10px', backgroundColor: '#fafafa' }}>
          <button 
            type="button" 
            onClick={onClose}
            style={{ padding: '10px 15px', borderRadius: '6px', border: '1px solid #ddd', background: '#fff', cursor: 'pointer', fontWeight: '500' }}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            form="brandForm"
            style={{ padding: '10px 20px', borderRadius: '6px', border: 'none', background: '#087F73', color: '#fff', cursor: 'pointer', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px' }}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <><i className="fa-solid fa-spinner fa-spin"></i> Saving...</>
            ) : (
              <>{brand ? 'Update Brand' : 'Create Brand'}</>
            )}
          </button>
        </div>
        
      </div>
    </div>
  );
}
