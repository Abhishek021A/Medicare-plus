import React, { useState, useEffect, useRef } from 'react';
import { X, UploadCloud, XCircle, Loader2 } from 'lucide-react';

export default function AdminSubcategoryForm({ 
  isOpen, 
  onClose, 
  subcategory, 
  categories, 
  onSubmit, 
  isSubmitting 
}) {
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    parent_id: '',
    status: 'ACTIVE',
    sort_order: 0,
    show_on_homepage: false
  });
  
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [errors, setErrors] = useState({});
  const fileInputRef = useRef(null);

  // Initialize form when subcategory changes
  useEffect(() => {
    if (subcategory) {
      setFormData({
        name: subcategory.name || '',
        slug: subcategory.slug || '',
        description: subcategory.description || '',
        parent_id: subcategory.parent_id || '',
        status: subcategory.status || 'ACTIVE',
        sort_order: subcategory.sort_order || 0,
        show_on_homepage: subcategory.show_on_homepage == 1 || subcategory.show_on_homepage === true
      });
      // If editing and has image
      if (subcategory.image) {
        setImagePreview(import.meta.env.VITE_API_URL 
          ? import.meta.env.VITE_API_URL.replace('/api', '') + '/' + subcategory.image
          : `http://localhost:8080/pharmacy_api/${subcategory.image}`);
      } else {
        setImagePreview(null);
      }
      setImageFile(null);
    } else {
      // Reset for create
      setFormData({
        name: '',
        slug: '',
        description: '',
        parent_id: '',
        status: 'ACTIVE',
        sort_order: 0,
        show_on_homepage: false
      });
      setImagePreview(null);
      setImageFile(null);
    }
    setErrors({});
  }, [subcategory, isOpen]);

  // Prevent circular hierarchy
  const getDescendantIds = (catId, allCategories) => {
    let descendants = [];
    const children = allCategories.filter(c => c.parent_id == catId);
    for (let child of children) {
      descendants.push(child.id);
      descendants = descendants.concat(getDescendantIds(child.id, allCategories));
    }
    return descendants;
  };

  const validParentOptions = React.useMemo(() => {
    if (!categories) return [];
    // Only allow top-level categories as parents for subcategories to keep it simple, or any active category that doesn't create a loop
    // Per requirements: "Only show main/top-level categories."
    return categories.filter(c => !c.parent_id && c.status === 'ACTIVE' && c.id !== subcategory?.id);
  }, [categories, subcategory]);

  const handleNameChange = (e) => {
    const name = e.target.value;
    setFormData(prev => ({
      ...prev,
      name,
      slug: prev.slug === '' || prev.slug === generateSlug(prev.name) 
        ? generateSlug(name) 
        : prev.slug
    }));
  };

  const generateSlug = (text) => {
    return text.toString().toLowerCase()
      .replace(/\s+/g, '-')           
      .replace(/[^\w\-]+/g, '')       
      .replace(/\-\-+/g, '-')         
      .replace(/^-+/, '')             
      .replace(/-+$/, '');            
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      if (name === 'show_on_homepage') {
        setFormData({ ...formData, [name]: checked });
      } else {
        setFormData({ ...formData, [name]: checked ? 'ACTIVE' : 'INACTIVE' });
      }
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    processFile(file);
  };

  const processFile = (file) => {
    if (!file) return;
    
    // Validate type
    if (!file.type.match('image.*')) {
      alert('Please upload an image file (PNG, JPG, JPEG)');
      return;
    }
    
    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size should be less than 5MB');
      return;
    }

    setImageFile(file);
    
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target.result);
    reader.readAsDataURL(file);
  };

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
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Subcategory name is required';
    if (!formData.slug.trim()) newErrors.slug = 'Slug is required';
    if (!formData.parent_id) newErrors.parent_id = 'Parent Category is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      const submitData = new FormData();
      Object.keys(formData).forEach(key => {
        if (typeof formData[key] === 'boolean') {
           submitData.append(key, formData[key] ? '1' : '0');
        } else {
           submitData.append(key, formData[key] !== null ? formData[key] : '');
        }
      });
      
      if (imageFile) {
        submitData.append('image', imageFile);
      }
      
      onSubmit(submitData, subcategory?.id);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`drawer-backdrop ${isOpen ? 'show' : ''}`} 
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className={`admin-drawer ${isOpen ? 'open' : ''}`}>
        <div className="drawer-header">
          <h2>{subcategory ? 'Edit Subcategory' : 'Add New Subcategory'}</h2>
          <button className="btn-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        
        <div className="drawer-content">
          <form id="subcategory-form" onSubmit={handleSubmit}>
            
            <div className="form-group">
              <label htmlFor="parent_id">Parent Category *</label>
              <select
                id="parent_id"
                name="parent_id"
                className={`form-control ${errors.parent_id ? 'is-invalid' : ''}`}
                value={formData.parent_id}
                onChange={handleInputChange}
              >
                <option value="">Select Parent Category</option>
                {validParentOptions.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              {errors.parent_id && <div className="error-feedback">{errors.parent_id}</div>}
              <small className="form-text text-muted">A subcategory must belong to a top-level category.</small>
            </div>

            <div className="form-group">
              <label htmlFor="name">Subcategory Name *</label>
              <input
                type="text"
                id="name"
                name="name"
                className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                value={formData.name}
                onChange={handleNameChange}
                placeholder="e.g. Pain Relief"
              />
              {errors.name && <div className="error-feedback">{errors.name}</div>}
            </div>
            
            <div className="form-group">
              <label htmlFor="slug">URL Slug *</label>
              <input
                type="text"
                id="slug"
                name="slug"
                className={`form-control ${errors.slug ? 'is-invalid' : ''}`}
                value={formData.slug}
                onChange={handleInputChange}
                placeholder="e.g. pain-relief"
              />
              {errors.slug && <div className="error-feedback">{errors.slug}</div>}
            </div>
            
            <div className="form-group">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                name="description"
                className="form-control"
                rows="3"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Brief description of the subcategory..."
              ></textarea>
            </div>
            
            <div className="form-group">
              <label>Subcategory Image</label>
              
              {!imagePreview ? (
                <div 
                  className={`image-upload-zone ${isDragging ? 'drag-over' : ''}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current.click()}
                >
                  <UploadCloud size={32} className="upload-icon" />
                  <p><strong>Click to upload</strong> or drag and drop</p>
                  <span className="upload-hint">SVG, PNG, JPG or GIF (max. 5MB)</span>
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    className="hidden-input"
                    accept="image/*"
                    onChange={handleFileChange}
                  />
                </div>
              ) : (
                <div className="image-preview-container">
                  <img src={imagePreview} alt="Preview" className="img-preview" />
                  <div className="preview-actions">
                    <button 
                      type="button" 
                      className="btn-replace"
                      onClick={() => fileInputRef.current.click()}
                    >
                      Replace
                    </button>
                    <button 
                      type="button" 
                      className="btn-remove"
                      onClick={removeImage}
                    >
                      <XCircle size={16} /> Remove
                    </button>
                  </div>
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    className="hidden-input"
                    accept="image/*"
                    onChange={handleFileChange}
                  />
                </div>
              )}
            </div>
            
            <div className="form-row">
              <div className="form-group flex-1">
                <label htmlFor="sort_order">Sort Order</label>
                <input
                  type="number"
                  id="sort_order"
                  name="sort_order"
                  className="form-control"
                  value={formData.sort_order}
                  onChange={handleInputChange}
                  min="0"
                />
              </div>
            </div>
            
            <div className="form-group switch-group">
              <div className="switch-wrapper">
                <label className="switch">
                  <input 
                    type="checkbox" 
                    name="status"
                    checked={formData.status === 'ACTIVE'}
                    onChange={handleInputChange}
                  />
                  <span className="slider round"></span>
                </label>
                <div>
                  <span className="switch-label">Active Status</span>
                  <span className="switch-hint">Hide subcategory from customers if inactive</span>
                </div>
              </div>
            </div>

            <div className="form-group switch-group">
              <div className="switch-wrapper">
                <label className="switch">
                  <input 
                    type="checkbox" 
                    name="show_on_homepage"
                    checked={formData.show_on_homepage}
                    onChange={handleInputChange}
                  />
                  <span className="slider round"></span>
                </label>
                <div>
                  <span className="switch-label">Show on Homepage</span>
                  <span className="switch-hint">Display this subcategory in homepage sections</span>
                </div>
              </div>
            </div>
            
          </form>
        </div>
        
        <div className="drawer-footer">
          <button type="button" className="btn-outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </button>
          <button 
            type="submit" 
            form="subcategory-form" 
            className="btn-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <><Loader2 size={16} className="spinner" /> Saving...</>
            ) : (
              <>{subcategory ? 'Update Subcategory' : 'Save Subcategory'}</>
            )}
          </button>
        </div>
      </div>
    </>
  );
}
