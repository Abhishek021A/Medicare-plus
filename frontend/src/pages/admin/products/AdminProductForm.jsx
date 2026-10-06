import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Save, Loader2, Upload, X } from 'lucide-react';
import { adminProductService, adminCategoryService, adminBrandService } from '../../../services/adminApi';
import { useToast } from '../../../context/ToastContext';
import './AdminProducts.css';

export default function AdminProductForm() {
  const { id } = useParams();
  const isEditMode = !!id;
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    sku: '',
    price: '',
    sale_price: '',
    stock_quantity: 0,
    medicine_group_id: '',
    category_id: '',
    subcategory_id: '',
    brand_id: '',
    status: 'ACTIVE',
    short_description: '',
    description: '',
    ingredients: '',
    usage_instructions: '',
    warnings: '',
    prescription_required: false,
    featured: false,
    bestseller: false,
    new_launch: false
  });

  const [mainImage, setMainImage] = useState(null);
  const [mainImagePreview, setMainImagePreview] = useState(null);
  const [galleryImages, setGalleryImages] = useState([]);
  const [galleryPreviews, setGalleryPreviews] = useState([]);
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    fetchCategories();
    fetchBrands();
    if (isEditMode) {
      fetchProduct();
    }
  }, [id]);

  // Generate slug automatically from name if not edit mode
  useEffect(() => {
    if (!isEditMode && formData.name) {
      const generatedSlug = formData.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
      setFormData(prev => ({ ...prev, slug: generatedSlug }));
    }
  }, [formData.name, isEditMode]);

  const fetchCategories = async () => {
    try {
      const response = await adminCategoryService.getCategories();
      if (response.success) {
        setCategories(response.data || []);
      }
    } catch (error) {
      console.error('Failed to load categories', error);
    }
  };

  const fetchBrands = async () => {
    try {
      const response = await adminBrandService.getBrands();
      if (response.success) {
        setBrands(response.data || []);
      }
    } catch (error) {
      console.error('Failed to load brands', error);
    }
  };

  const fetchProduct = async () => {
    try {
      setIsLoading(true);
      const response = await adminProductService.getProduct(id);
      if (response.success && response.data) {
        setFormData(prev => ({ ...prev, ...response.data }));
        if (response.data.image) {
           // We store full URL for preview
           setMainImagePreview(import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api/index.php', '') + response.data.image : 'http://localhost:8000' + response.data.image);
        }
        if (response.data.gallery_images && Array.isArray(response.data.gallery_images)) {
           const previews = response.data.gallery_images.map(img => 
             import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api/index.php', '') + img.image_url : 'http://localhost:8000' + img.image_url
           );
           setGalleryPreviews(previews);
        }
      }
    } catch (error) {
      addToast('error', 'Failed to load product details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    // Clear error for this field
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleMainImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setMainImage(file);
      setMainImagePreview(URL.createObjectURL(file));
    }
  };

  const handleGalleryChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      setGalleryImages(prev => [...prev, ...files]);
      const newPreviews = files.map(file => URL.createObjectURL(file));
      setGalleryPreviews(prev => [...prev, ...newPreviews]);
    }
  };

  const removeGalleryImage = (index) => {
    setGalleryImages(prev => prev.filter((_, i) => i !== index));
    setGalleryPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = "Product name is required.";
    if (!formData.sku.trim()) errors.sku = "SKU is required.";
    if (!formData.slug.trim()) errors.slug = "Slug is required.";
    if (!formData.medicine_group_id) errors.medicine_group_id = "Please select a medicine group.";
    if (!formData.category_id) errors.category_id = "Please select a category.";
    if (!formData.price || isNaN(formData.price) || Number(formData.price) <= 0) errors.price = "Price must be greater than 0.";
    if (formData.stock_quantity === '' || isNaN(formData.stock_quantity) || Number(formData.stock_quantity) < 0) errors.stock_quantity = "Valid stock quantity is required.";
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      addToast('error', 'Please fix the highlighted errors');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const submitData = new FormData();
      
      // Append all text fields
      Object.keys(formData).forEach(key => {
        if (formData[key] !== null && formData[key] !== undefined) {
          // Send boolean as 1 or 0
          if (typeof formData[key] === 'boolean') {
             submitData.append(key, formData[key] ? '1' : '0');
          } else {
             submitData.append(key, formData[key]);
          }
        }
      });

      // Append images
      if (mainImage) {
        submitData.append('image', mainImage);
      }
      
      galleryImages.forEach((file) => {
        submitData.append('gallery_images[]', file);
      });

      if (isEditMode) {
        // Use _method=PUT to bypass PHP's inability to parse multipart PUT
        submitData.append('_method', 'PUT');
        await adminProductService.updateProduct(id, submitData);
        addToast('success', 'Product updated successfully');
      } else {
        await adminProductService.createProduct(submitData);
        addToast('success', 'Product created successfully');
      }
      
      // Navigate and force refresh of products state in parent is handled by remounting component when navigating
      navigate('/admin/products');
    } catch (error) {
      console.error(error);
      const errorMessage = error.response?.data?.message || `Failed to ${isEditMode ? 'update' : 'create'} product.`;
      addToast('error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div className="flex-align-center gap-15">
          <Link to="/admin/products" className="btn-icon" aria-label="Go back">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1>{isEditMode ? 'Edit Product' : 'Add New Product'}</h1>
          </div>
        </div>
        <button 
          className="btn-primary" 
          onClick={handleSubmit} 
          disabled={isLoading}
        >
          {isLoading ? <Loader2 className="spinner" size={18} /> : <Save size={18} />}
          {isLoading ? 'Creating Product...' : (isEditMode ? 'Save Changes' : 'Create Product')}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="product-form-grid">
        <div className="form-main-col">
          {/* Basic Info */}
          <div className="admin-card mb-20 p-20">
            <h3 className="card-title">Basic Information</h3>
            <div className="form-row">
                <div className="form-group flex-1">
                <label>Product Name *</label>
                <input 
                    type="text" 
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className={`form-input ${formErrors.name ? 'error-border' : ''}`}
                />
                {formErrors.name && <span className="error-text">{formErrors.name}</span>}
                </div>
                <div className="form-group flex-1">
                <label>Slug *</label>
                <input 
                    type="text" 
                    name="slug"
                    value={formData.slug}
                    onChange={handleChange}
                    className={`form-input ${formErrors.slug ? 'error-border' : ''}`}
                />
                {formErrors.slug && <span className="error-text">{formErrors.slug}</span>}
                </div>
            </div>
            
            <div className="form-group mt-15">
              <label>Short Description</label>
              <textarea 
                name="short_description"
                value={formData.short_description}
                onChange={handleChange}
                rows="2"
                className="form-input"
              ></textarea>
            </div>
            
            <div className="form-group mt-15">
              <label>Full Description</label>
              <textarea 
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows="5"
                className="form-input"
              ></textarea>
            </div>
          </div>
          
          {/* Product Media */}
          <div className="admin-card mb-20 p-20">
            <h3 className="card-title">Product Images</h3>
            <div className="form-group">
                <label>Main Image</label>
                <div className="image-upload-area">
                    <input type="file" accept="image/*" onChange={handleMainImageChange} id="main-image-upload" className="hidden" />
                    <label htmlFor="main-image-upload" className="upload-label">
                        {mainImagePreview ? (
                            <img src={mainImagePreview} alt="Preview" className="preview-image" />
                        ) : (
                            <div className="upload-placeholder">
                                <Upload size={24} />
                                <span>Click to upload main image</span>
                            </div>
                        )}
                    </label>
                </div>
            </div>
            
            <div className="form-group mt-15">
                <label>Gallery Images</label>
                <input type="file" accept="image/*" multiple onChange={handleGalleryChange} className="form-input mb-10" />
                <div className="gallery-previews">
                    {galleryPreviews.map((preview, index) => (
                        <div key={index} className="gallery-preview-item">
                            <img src={preview} alt={`Gallery ${index}`} />
                            <button type="button" onClick={() => removeGalleryImage(index)} className="btn-remove-image">
                                <X size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
          </div>

          {/* Details */}
          <div className="admin-card mb-20 p-20">
            <h3 className="card-title">Product Details</h3>
            <div className="form-group">
              <label>Ingredients</label>
              <textarea 
                name="ingredients"
                value={formData.ingredients}
                onChange={handleChange}
                rows="3"
                className="form-input"
              ></textarea>
            </div>
            <div className="form-group mt-15">
              <label>Usage Instructions</label>
              <textarea 
                name="usage_instructions"
                value={formData.usage_instructions}
                onChange={handleChange}
                rows="3"
                className="form-input"
              ></textarea>
            </div>
            <div className="form-group mt-15">
              <label>Warnings</label>
              <textarea 
                name="warnings"
                value={formData.warnings}
                onChange={handleChange}
                rows="3"
                className="form-input"
              ></textarea>
            </div>
          </div>

          {/* Pricing */}
          <div className="admin-card mb-20 p-20">
            <h3 className="card-title">Pricing & Inventory</h3>
            <div className="form-row">
              <div className="form-group flex-1">
                <label>Price (₹) *</label>
                <input 
                  type="number" 
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  className={`form-input ${formErrors.price ? 'error-border' : ''}`}
                />
                {formErrors.price && <span className="error-text">{formErrors.price}</span>}
              </div>
              <div className="form-group flex-1">
                <label>Sale Price (₹)</label>
                <input 
                  type="number" 
                  name="sale_price"
                  value={formData.sale_price}
                  onChange={handleChange}
                  className="form-input"
                />
              </div>
            </div>
            <div className="form-row mt-15">
              <div className="form-group flex-1">
                <label>SKU (Stock Keeping Unit) *</label>
                <input 
                  type="text" 
                  name="sku"
                  value={formData.sku}
                  onChange={handleChange}
                  className={`form-input ${formErrors.sku ? 'error-border' : ''}`}
                />
                {formErrors.sku && <span className="error-text">{formErrors.sku}</span>}
              </div>
              <div className="form-group flex-1">
                <label>Stock Quantity *</label>
                <input 
                  type="number" 
                  name="stock_quantity"
                  value={formData.stock_quantity}
                  onChange={handleChange}
                  className={`form-input ${formErrors.stock_quantity ? 'error-border' : ''}`}
                />
                {formErrors.stock_quantity && <span className="error-text">{formErrors.stock_quantity}</span>}
              </div>
            </div>
          </div>
        </div>

        <div className="form-side-col">
          {/* Status */}
          <div className="admin-card mb-20 p-20">
            <h3 className="card-title">Status</h3>
            <div className="form-group">
              <select 
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="form-input"
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive / Draft</option>
              </select>
            </div>
          </div>

          {/* Categorization */}
          <div className="admin-card mb-20 p-20">
            <h3 className="card-title">Organization</h3>
            <div className="form-group">
              <label>Medicine Group *</label>
              <select 
                name="medicine_group_id"
                value={formData.medicine_group_id}
                onChange={handleChange}
                className={`form-input ${formErrors.medicine_group_id ? 'error-border' : ''}`}
              >
                <option value="">Select Medicine Group</option>
                {categories.filter(c => !c.parent_id).map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
              {formErrors.medicine_group_id && <span className="error-text">{formErrors.medicine_group_id}</span>}
            </div>
            <div className="form-group mt-15">
              <label>Category *</label>
              <select 
                name="category_id"
                value={formData.category_id}
                onChange={handleChange}
                className={`form-input ${formErrors.category_id ? 'error-border' : ''}`}
                disabled={!formData.medicine_group_id}
              >
                <option value="">Select Category</option>
                {categories.filter(c => c.parent_id == formData.medicine_group_id).map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
              {formErrors.category_id && <span className="error-text">{formErrors.category_id}</span>}
            </div>
            <div className="form-group mt-15">
              <label>Subcategory</label>
              <select 
                name="subcategory_id"
                value={formData.subcategory_id}
                onChange={handleChange}
                className="form-input"
                disabled={!formData.category_id}
              >
                <option value="">Select Subcategory</option>
                {categories.filter(c => c.parent_id == formData.category_id).map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group mt-15">
              <label>Brand</label>
              <select 
                name="brand_id"
                value={formData.brand_id}
                onChange={handleChange}
                className="form-input"
              >
                <option value="">Select Brand</option>
                {brands.map(brand => (
                    <option key={brand.id} value={brand.id}>{brand.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Flags */}
          <div className="admin-card mb-20 p-20">
            <h3 className="card-title">Options</h3>
            <div className="checkbox-group">
              <label className="checkbox-label">
                <input 
                  type="checkbox" 
                  name="prescription_required"
                  checked={formData.prescription_required}
                  onChange={handleChange}
                />
                Requires Prescription
              </label>
            </div>
            <div className="checkbox-group mt-10">
              <label className="checkbox-label">
                <input 
                  type="checkbox" 
                  name="featured"
                  checked={formData.featured}
                  onChange={handleChange}
                />
                Featured Product
              </label>
            </div>
            <div className="checkbox-group mt-10">
              <label className="checkbox-label">
                <input 
                  type="checkbox" 
                  name="bestseller"
                  checked={formData.bestseller}
                  onChange={handleChange}
                />
                Best Seller
              </label>
            </div>
            <div className="checkbox-group mt-10">
              <label className="checkbox-label">
                <input 
                  type="checkbox" 
                  name="new_launch"
                  checked={formData.new_launch}
                  onChange={handleChange}
                />
                New Launch
              </label>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
