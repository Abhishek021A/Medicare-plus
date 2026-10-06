import React, { useState, useEffect } from 'react';
import { 
  Search, Plus, Edit, Trash2, Eye, Filter, RefreshCw, AlertTriangle
} from 'lucide-react';
import { adminCategoryService } from '../../../services/adminApi';
import { useToast } from '../../../context/ToastContext';
import AdminCategoryForm from './AdminCategoryForm';
import './AdminCategories.css';

export default function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [filteredCategories, setFilteredCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  
  // Drawer/Modal State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Delete Modal
  const [categoryToDelete, setCategoryToDelete] = useState(null);

  const { addToast } = useToast();

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await adminCategoryService.getCategories();
      if (response.success) {
        setCategories(response.data || []);
        setFilteredCategories(response.data || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch categories. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Apply filters
    let result = categories;
    
    if (statusFilter !== 'ALL') {
      result = result.filter(c => c.status === statusFilter);
    }
    
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      result = result.filter(c => 
        c.name?.toLowerCase().includes(lowerTerm) || 
        c.slug?.toLowerCase().includes(lowerTerm)
      );
    }
    
    setFilteredCategories(result);
    setCurrentPage(1); // Reset to page 1 on filter change
  }, [categories, searchTerm, statusFilter]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredCategories.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentCategories = filteredCategories.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleAddClick = () => {
    setSelectedCategory(null);
    setIsFormOpen(true);
  };

  const handleEditClick = (category) => {
    setSelectedCategory(category);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (formData, categoryId) => {
    setIsSubmitting(true);
    try {
      let response;
      if (categoryId) {
        response = await adminCategoryService.updateCategory(categoryId, formData);
      } else {
        response = await adminCategoryService.createCategory(formData);
      }
      
      if (response.success) {
        addToast('success', response.message);
        setIsFormOpen(false);
        fetchCategories(); // Refresh list
      }
    } catch (err) {
      addToast('error', err.response?.data?.message || 'Failed to save category');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRequest = (category) => {
    setCategoryToDelete(category);
  };

  const confirmDelete = async () => {
    if (!categoryToDelete) return;
    
    try {
      const response = await adminCategoryService.deleteCategory(categoryToDelete.id);
      if (response.success) {
        addToast('success', 'Category deleted successfully');
        setCategories(categories.filter(c => c.id !== categoryToDelete.id));
      }
    } catch (err) {
      addToast('error', err.response?.data?.message || 'Failed to delete category');
    } finally {
      setCategoryToDelete(null);
    }
  };

  const handleStatusToggle = async (category) => {
    const newStatus = category.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    // Optimistic UI update
    setCategories(categories.map(c => c.id === category.id ? { ...c, status: newStatus } : c));
    
    try {
      // We send a partial update via FormData
      const formData = new FormData();
      formData.append('name', category.name);
      formData.append('slug', category.slug);
      formData.append('status', newStatus);
      if(category.description) formData.append('description', category.description);
      if(category.parent_id) formData.append('parent_id', category.parent_id);
      if(category.sort_order) formData.append('sort_order', category.sort_order);
      formData.append('show_on_homepage', category.show_on_homepage == 1);
      
      await adminCategoryService.updateCategory(category.id, formData);
      addToast('success', `Category ${newStatus.toLowerCase()} successfully`);
    } catch (err) {
      // Revert on error
      setCategories(categories.map(c => c.id === category.id ? { ...c, status: category.status } : c));
      addToast('error', 'Failed to update status');
    }
  };

  return (
    <div className="admin-categories-page">
      <div className="ac-header-actions">
        <div className="ac-title">
          <h1>Categories</h1>
          <p>Manage your pharmacy product categories</p>
        </div>
        <button className="btn-add-category" onClick={handleAddClick}>
          <Plus size={20} /> Add Category
        </button>
      </div>

      <div className="ac-filters-toolbar">
        <div className="ac-search">
          <Search size={18} />
          <input 
            type="text" 
            placeholder="Search categories by name or slug..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <select 
          className="ac-filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="ALL">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
        
        {(searchTerm || statusFilter !== 'ALL') && (
          <button 
            className="ac-clear-btn"
            onClick={() => { setSearchTerm(''); setStatusFilter('ALL'); }}
          >
            Clear Filters
          </button>
        )}
      </div>

      <div className="ac-table-container">
        {isLoading ? (
          <div className="ac-loading-skeleton">
            {[1, 2, 3, 4, 5].map(i => <div key={i} className="skeleton-row"></div>)}
          </div>
        ) : error ? (
          <div className="ac-empty-state">
            <AlertTriangle size={48} color="#EF4444" />
            <h3>Error loading categories</h3>
            <p>{error}</p>
            <button className="btn-add-category mt-3 mx-auto" onClick={fetchCategories}>
              <RefreshCw size={18} /> Retry
            </button>
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="ac-empty-state">
            <Filter size={48} />
            <h3>No categories found</h3>
            <p>We couldn't find any categories matching your criteria.</p>
            {categories.length === 0 && (
              <button className="btn-add-category mt-3 mx-auto" onClick={handleAddClick}>
                <Plus size={18} /> Create your first category
              </button>
            )}
          </div>
        ) : (
          <table className="ac-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Parent</th>
                <th>Products</th>
                <th>Sort Order</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentCategories.map(cat => (
                <tr key={cat.id}>
                  <td>
                    <div className="ac-cat-info">
                      <div className="ac-img-placeholder">
                        {cat.image ? (
                          <img src={
                            import.meta.env.VITE_API_URL 
                              ? import.meta.env.VITE_API_URL.replace('/api', '') + '/' + cat.image
                              : `http://localhost/pharmacy_store/${cat.image}`
                          } alt={cat.name} />
                        ) : (
                          <span>IMG</span>
                        )}
                      </div>
                      <div>
                        <span className="ac-name">{cat.name}</span>
                        <span className="ac-slug">/{cat.slug}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span style={{ color: cat.parent_name ? '#111827' : '#9CA3AF' }}>
                      {cat.parent_name || 'None'}
                    </span>
                  </td>
                  <td>
                    <strong>{cat.product_count || 0}</strong> items
                  </td>
                  <td>{cat.sort_order}</td>
                  <td>
                    <span 
                      className={`ac-badge-status ${cat.status?.toLowerCase()}`}
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleStatusToggle(cat)}
                      title="Click to toggle status"
                    >
                      {cat.status}
                    </span>
                  </td>
                  <td>
                    <div className="ac-actions" style={{ justifyContent: 'flex-end' }}>
                      <button className="ac-btn-action edit" onClick={() => handleEditClick(cat)} title="Edit Category">
                        <Edit size={16} />
                      </button>
                      <button className="ac-btn-action delete" onClick={() => handleDeleteRequest(cat)} title="Delete Category">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination Controls */}
      {!isLoading && !error && filteredCategories.length > 0 && (
        <div className="ac-pagination">
          <button 
            className="ac-page-btn" 
            disabled={currentPage === 1}
            onClick={() => handlePageChange(currentPage - 1)}
          >
            Previous
          </button>
          
          <div className="ac-page-numbers">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button 
                key={page}
                className={`ac-page-number ${currentPage === page ? 'active' : ''}`}
                onClick={() => handlePageChange(page)}
              >
                {page}
              </button>
            ))}
          </div>

          <button 
            className="ac-page-btn" 
            disabled={currentPage === totalPages}
            onClick={() => handlePageChange(currentPage + 1)}
          >
            Next
          </button>
        </div>
      )}

      <AdminCategoryForm 
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        category={selectedCategory}
        categories={categories}
        onSubmit={handleFormSubmit}
        isSubmitting={isSubmitting}
      />

      {categoryToDelete && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-icon danger">
              <AlertTriangle size={24} />
            </div>
            <h3>Delete Category</h3>
            <p>Are you sure you want to delete <strong>{categoryToDelete.name}</strong>? This action cannot be undone.</p>
            {categoryToDelete.product_count > 0 && (
              <p style={{ color: '#EF4444', fontWeight: 500 }}>
                Warning: This category contains {categoryToDelete.product_count} products. Please reassign them before deleting.
              </p>
            )}
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setCategoryToDelete(null)}>Cancel</button>
              <button 
                className="btn-danger" 
                onClick={confirmDelete}
              >
                Yes, Delete Category
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
