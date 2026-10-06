import React, { useState, useEffect } from 'react';
import { 
  Search, Plus, Edit, Trash2, Eye, Filter, RefreshCw, AlertTriangle 
} from 'lucide-react';
import { adminCategoryService } from '../../../services/adminApi';
import { useToast } from '../../../context/ToastContext';
import AdminSubcategoryForm from './AdminSubcategoryForm';
import './AdminCategories.css'; // Reuse styles

export default function AdminSubcategories() {
  const [allCategories, setAllCategories] = useState([]); // Holds both parents and subcategories
  const [subcategories, setSubcategories] = useState([]);
  const [filteredSubcategories, setFilteredSubcategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [parentFilter, setParentFilter] = useState('ALL');
  
  // Drawer/Modal State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Delete Modal
  const [subcategoryToDelete, setSubcategoryToDelete] = useState(null);

  const { addToast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await adminCategoryService.getCategories();
      if (response.success) {
        const data = response.data || [];
        setAllCategories(data);
        
        // Subcategories are categories with a parent_id
        const subs = data.filter(c => c.parent_id);
        setSubcategories(subs);
        setFilteredSubcategories(subs);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch subcategories. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Apply filters
    let result = subcategories;
    
    if (statusFilter !== 'ALL') {
      result = result.filter(c => c.status === statusFilter);
    }

    if (parentFilter !== 'ALL') {
      result = result.filter(c => c.parent_id == parentFilter);
    }
    
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      result = result.filter(c => 
        c.name?.toLowerCase().includes(lowerTerm) || 
        c.slug?.toLowerCase().includes(lowerTerm) ||
        c.parent_name?.toLowerCase().includes(lowerTerm)
      );
    }
    
    setFilteredSubcategories(result);
    setCurrentPage(1); // Reset to page 1 on filter change
  }, [subcategories, searchTerm, statusFilter, parentFilter]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredSubcategories.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentSubcategories = filteredSubcategories.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleAddClick = () => {
    setSelectedSubcategory(null);
    setIsFormOpen(true);
  };

  const handleEditClick = (subcategory) => {
    setSelectedSubcategory(subcategory);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (formData, id) => {
    setIsSubmitting(true);
    try {
      let response;
      if (id) {
        response = await adminCategoryService.updateCategory(id, formData);
      } else {
        response = await adminCategoryService.createCategory(formData);
      }
      
      if (response.success) {
        addToast('success', response.message || (id ? 'Subcategory updated successfully' : 'Subcategory created successfully'));
        setIsFormOpen(false);
        fetchData(); // Refresh list
      }
    } catch (err) {
      addToast('error', err.response?.data?.message || 'Failed to save subcategory');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRequest = (subcategory) => {
    setSubcategoryToDelete(subcategory);
  };

  const confirmDelete = async () => {
    if (!subcategoryToDelete) return;
    
    try {
      const response = await adminCategoryService.deleteCategory(subcategoryToDelete.id);
      if (response.success) {
        addToast('success', 'Subcategory deleted successfully');
        fetchData(); // Refresh all
      }
    } catch (err) {
      addToast('error', err.response?.data?.message || 'Cannot delete this subcategory because products are assigned to it. Please move the products first.');
    } finally {
      setSubcategoryToDelete(null);
    }
  };

  const handleStatusToggle = async (subcategory) => {
    const newStatus = subcategory.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    // Optimistic UI update
    setSubcategories(subcategories.map(c => c.id === subcategory.id ? { ...c, status: newStatus } : c));
    
    try {
      // Send a partial update via FormData
      const formData = new FormData();
      formData.append('name', subcategory.name);
      formData.append('slug', subcategory.slug);
      formData.append('status', newStatus);
      if(subcategory.description) formData.append('description', subcategory.description);
      if(subcategory.parent_id) formData.append('parent_id', subcategory.parent_id);
      if(subcategory.sort_order) formData.append('sort_order', subcategory.sort_order);
      formData.append('show_on_homepage', subcategory.show_on_homepage ? '1' : '0');
      // For PUT simulating in PHP we use _method
      formData.append('_method', 'PUT');

      const response = await adminCategoryService.updateCategory(subcategory.id, formData);
      
      if (response.success) {
        addToast('success', `Subcategory status set to ${newStatus}`);
      } else {
        throw new Error(response.message);
      }
    } catch (err) {
      // Revert on failure
      setSubcategories(subcategories.map(c => c.id === subcategory.id ? { ...c, status: subcategory.status } : c));
      addToast('error', 'Failed to update status');
    }
  };

  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    return import.meta.env.VITE_API_URL 
      ? import.meta.env.VITE_API_URL.replace('/api', '') + '/' + imagePath 
      : `http://localhost:8080/pharmacy_api/${imagePath}`;
  };

  // Extract top-level categories for filter dropdown
  const topLevelCategories = allCategories.filter(c => !c.parent_id);

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>Subcategories</h1>
          <p>Manage product subcategories under each main category</p>
        </div>
        <button className="btn-primary" onClick={handleAddClick}>
          <Plus size={18} /> Add New Subcategory
        </button>
      </div>

      <div className="admin-card">
        {/* Toolbar */}
        <div className="admin-toolbar">
          <div className="toolbar-search">
            <Search size={18} className="search-icon" />
            <input 
              type="text" 
              placeholder="Search subcategories..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="toolbar-filters">
            <select 
              className="filter-select" 
              value={parentFilter} 
              onChange={(e) => setParentFilter(e.target.value)}
            >
              <option value="ALL">All Parent Categories</option>
              {topLevelCategories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <select 
              className="filter-select" 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
            <button className="btn-icon" onClick={fetchData} title="Refresh">
              <RefreshCw size={18} className={isLoading ? 'spinning' : ''} />
            </button>
          </div>
        </div>

        {/* Content Area */}
        {error ? (
          <div className="error-state p-30 text-center">
            <AlertTriangle size={48} className="text-danger mx-auto mb-15" />
            <h3>Error Loading Data</h3>
            <p className="text-muted">{error}</p>
            <button className="btn-primary mt-15 mx-auto" onClick={fetchData}>
              Try Again
            </button>
          </div>
        ) : (
          <>
            <div className="table-responsive">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Subcategory Details</th>
                    <th>Parent Category</th>
                    <th>Products</th>
                    <th>Status</th>
                    <th>Sort</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan="6" className="text-center py-30">
                        <Loader2 size={32} className="spinner mx-auto" />
                        <p className="mt-10 text-muted">Loading subcategories...</p>
                      </td>
                    </tr>
                  ) : filteredSubcategories.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center py-30">
                        <div className="empty-state">
                          <p className="text-muted mb-10">No subcategories found matching your criteria.</p>
                          {(searchTerm || statusFilter !== 'ALL' || parentFilter !== 'ALL') ? (
                            <button 
                              className="btn-outline mx-auto"
                              onClick={() => {
                                setSearchTerm('');
                                setStatusFilter('ALL');
                                setParentFilter('ALL');
                              }}
                            >
                              Clear Filters
                            </button>
                          ) : (
                            <button className="btn-primary mx-auto" onClick={handleAddClick}>
                              Add Your First Subcategory
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    currentSubcategories.map((subcat) => (
                      <tr key={subcat.id}>
                        <td>
                          <div className="category-cell">
                            <div className="category-img-wrapper">
                              {subcat.image ? (
                                <img src={getImageUrl(subcat.image)} alt={subcat.name} />
                              ) : (
                                <div className="category-img-placeholder">
                                  {subcat.name.charAt(0)}
                                </div>
                              )}
                            </div>
                            <div className="category-info">
                              <span className="category-name">{subcat.name}</span>
                              <span className="category-slug">/{subcat.slug}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="parent-badge" style={{ backgroundColor: 'rgba(8, 127, 115, 0.1)', color: '#087F73', padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem', fontWeight: '500' }}>
                            {subcat.parent_name || 'Unknown'}
                          </span>
                        </td>
                        <td>
                          <span className="count-badge">{subcat.product_count || 0} Products</span>
                        </td>
                        <td>
                          <label className="toggle-switch">
                            <input 
                              type="checkbox" 
                              checked={subcat.status === 'ACTIVE'}
                              onChange={() => handleStatusToggle(subcat)}
                            />
                            <span className="toggle-slider"></span>
                          </label>
                        </td>
                        <td>{subcat.sort_order}</td>
                        <td className="text-right">
                          <div className="action-buttons">
                            <button 
                              className="btn-icon text-primary" 
                              onClick={() => handleEditClick(subcat)}
                              title="Edit"
                            >
                              <Edit size={16} />
                            </button>
                            <button 
                              className="btn-icon text-danger" 
                              onClick={() => handleDeleteRequest(subcat)}
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {!isLoading && filteredSubcategories.length > 0 && (
              <div className="pagination-wrapper">
                <span className="pagination-info">
                  Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredSubcategories.length)} of {filteredSubcategories.length} subcategories
                </span>
                <div className="pagination-controls">
                  <button 
                    className="btn-page" 
                    disabled={currentPage === 1}
                    onClick={() => handlePageChange(currentPage - 1)}
                  >
                    Previous
                  </button>
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                    // Show a limited number of page buttons (simple logic)
                    if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                      return (
                        <button 
                          key={page}
                          className={`btn-page ${currentPage === page ? 'active' : ''}`}
                          onClick={() => handlePageChange(page)}
                        >
                          {page}
                        </button>
                      );
                    } else if (page === currentPage - 2 || page === currentPage + 2) {
                      return <span key={page} className="page-ellipsis">...</span>;
                    }
                    return null;
                  })}

                  <button 
                    className="btn-page" 
                    disabled={currentPage === totalPages}
                    onClick={() => handlePageChange(currentPage + 1)}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {subcategoryToDelete && (
        <div className="modal-backdrop">
          <div className="modal-content delete-modal">
            <div className="modal-header">
              <h3>Delete Subcategory?</h3>
              <button className="btn-close" onClick={() => setSubcategoryToDelete(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete <strong>{subcategoryToDelete.name}</strong>?</p>
              {subcategoryToDelete.product_count > 0 && (
                 <div style={{ padding: '12px', backgroundColor: '#fef2f2', color: '#ef4444', borderRadius: '6px', marginTop: '10px', fontSize: '14px' }}>
                    <AlertTriangle size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'text-bottom' }} />
                    Cannot delete this subcategory because {subcategoryToDelete.product_count} products are assigned to it. Please move the products first.
                 </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-outline" onClick={() => setSubcategoryToDelete(null)}>Cancel</button>
              <button 
                className="btn-danger" 
                onClick={confirmDelete}
                disabled={subcategoryToDelete.product_count > 0}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Slide-out Form Drawer */}
      <AdminSubcategoryForm 
        isOpen={isFormOpen} 
        onClose={() => setIsFormOpen(false)}
        subcategory={selectedSubcategory}
        categories={allCategories}
        onSubmit={handleFormSubmit}
        isSubmitting={isSubmitting}
      />
      
    </div>
  );
}
