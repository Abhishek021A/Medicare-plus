import React, { useState, useEffect, useRef } from 'react';
import { X, UploadCloud, XCircle, Loader2 } from 'lucide-react';

export default function AdminCategoryForm({ 
  isOpen, 
  onClose, 
  category, 
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

  // Initialize form when category changes
  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name || '',
        slug: category.slug || '',
        description: category.description || '',
        parent_id: category.parent_id || '',
        status: category.status || 'ACTIVE',
        sort_order: category.sort_order || 0,
        show_on_homepage: category.show_on_homepage == 1 || category.show_on_homepage === true
      });
      // If editing and has image
      if (category.image) {
        setImagePreview(import.meta.env.VITE_API_URL 
          ? import.meta.env.VITE_API_URL.replace('/api', '') + '/' + category.image
          : `http://localhost/pharmacy_store/${category.image}`);
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
  }, [category, isOpen]);

  // Prevent circular category hierarchy
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
    if (!category) return categories.filter(c => c.status === 'ACTIVE');
    const descendantIds = getDescendantIds(category.id, categories);
    return categories.filter(c => 
      c.id !== category.id && 
      !descendantIds.includes(c.id) && 
      c.status === 'ACTIVE'
    );
  }, [categories, category]);

  // Auto-generate slug from name
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
      .replace(/\s+/g, '-')           // Replace spaces with -
      .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
      .replace(/\-\-+/g, '-')         // Replace multiple - with single -
      .replace(/^-+/, '')             // Trim - from start of text
      .replace(/-+$/, '');            // Trim - from end of text
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      setFormData({ ...formData, [name]: checked ? 'ACTIVE' : 'INACTIVE' });
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
    
    // Validate size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('Image size should be less than 2MB');
      return;
    }

    setImageFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target.result);
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Custom validation
    const newErrors = {};
    if (!formData.name || !formData.name.trim()) newErrors.name = "Category Name is required.";
    if (!formData.slug || !formData.slug.trim()) newErrors.slug = "Slug is required.";
    if (formData.parent_id && category && (formData.parent_id == category.id || getDescendantIds(category.id, categories).includes(parseInt(formData.parent_id)))) {
      newErrors.parent_id = "Invalid parent category (circular reference detected).";
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return; // Stop submission
    }
    
    setErrors({});
    
    // Create FormData for multipart submission
    const submitData = new FormData();
    submitData.append('name', formData.name);
    submitData.append('slug', formData.slug);
    submitData.append('description', formData.description);
    submitData.append('parent_id', formData.parent_id || '');
    submitData.append('status', formData.status);
    submitData.append('sort_order', formData.sort_order);
    submitData.append('show_on_homepage', formData.show_on_homepage);
    
    if (imageFile) {
      submitData.append('image', imageFile);
    }

    onSubmit(submitData, category?.id);
  };

  if (!isOpen) return null;

  return (
    <div className="ac-drawer-overlay">
      <div className="ac-drawer">
        <div className="ac-drawer-header">
          <h2>{category ? 'Edit Category' : 'Add New Category'}</h2>
          <button className="btn-close-drawer" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form id="categoryForm" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', height: '100%', flex: 1, overflow: 'hidden' }}>
          <div className="ac-drawer-body">
            
            <div className="form-group">
              <label>Category Name *</label>
              <input 
                type="text" 
                name="name" 
                value={formData.name} 
                onChange={handleNameChange}
                placeholder="e.g. Vitamins & Supplements"
                style={errors.name ? { borderColor: '#EF4444' } : {}}
              />
              {errors.name && <span style={{ color: '#EF4444', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>{errors.name}</span>}
            </div>

            <div className="form-group">
              <label>Slug *</label>
              <input 
                type="text" 
                name="slug" 
                value={formData.slug} 
                onChange={handleInputChange}
                placeholder="e.g. vitamins-supplements"
                style={errors.slug ? { borderColor: '#EF4444' } : {}}
              />
              {errors.slug && <span style={{ color: '#EF4444', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>{errors.slug}</span>}
            </div>

            <div className="form-group">
              <label>Parent Category</label>
              <select 
                name="parent_id" 
                value={formData.parent_id} 
                onChange={handleInputChange}
                className={errors.parent_id ? 'error-border' : ''}
                style={errors.parent_id ? { borderColor: '#EF4444' } : {}}
              >
                <option value="">None (Top Level)</option>
                {validParentOptions.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {errors.parent_id && <span style={{ color: '#EF4444', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>{errors.parent_id}</span>}
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea 
                name="description" 
                value={formData.description} 
                onChange={handleInputChange}
                placeholder="Brief description of this category..."
                rows="3"
              ></textarea>
            </div>

            <div className="form-group">
              <label>Category Image</label>
              {imagePreview ? (
                <div className="image-preview-container">
                  <img src={imagePreview} alt="Preview" />
                  <button 
                    type="button" 
                    className="btn-remove-image"
                    onClick={() => {
                      setImagePreview(null);
                      setImageFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                  >
                    <XCircle size={18} />
                  </button>
                </div>
              ) : (
                <div 
                  className={`image-upload-area ${isDragging ? 'drag-over' : ''}`}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <UploadCloud size={32} className="upload-icon" />
                  <div className="upload-text">Click to upload or drag & drop</div>
                  <div className="upload-hint">SVG, PNG, JPG or GIF (max. 2MB)</div>
                </div>
              )}
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                style={{ display: 'none' }}
              />
            </div>

            <div className="form-group">
              <label>Sort Order</label>
              <input 
                type="number" 
                name="sort_order" 
                value={formData.sort_order} 
                onChange={handleInputChange}
                min="0"
              />
            </div>

            <div className="form-group switch-group">
              <div>
                <label>Status</label>
                <span className="upload-hint">Enable or disable category visibility</span>
              </div>
              <label className="toggle-switch">
                <input 
                  type="checkbox" 
                  name="status"
                  checked={formData.status === 'ACTIVE'}
                  onChange={handleInputChange}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="form-group switch-group">
              <div>
                <label>Show on Homepage</label>
                <span className="upload-hint">Display this category on the main homepage</span>
              </div>
              <label className="toggle-switch">
                <input 
                  type="checkbox" 
                  name="show_on_homepage"
                  checked={formData.show_on_homepage}
                  onChange={(e) => setFormData({ ...formData, show_on_homepage: e.target.checked })}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

          </div>

          <div className="ac-drawer-footer">
            <button type="button" className="btn-cancel" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="btn-save" disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 size={18} className="spinner" /> Saving...</> : 'Save Category'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
