import React, { useState, useEffect, useCallback } from 'react';
import { adminBrandService } from '../../../services/adminApi';
import { useToast } from '../../../context/ToastContext';
import AdminBrandForm from './AdminBrandForm';
import './AdminBrands.css';

export default function AdminBrands() {
  const { showToast } = useToast();
  
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
  const [filters, setFilters] = useState({
    status: 'ALL',
    featured: 'ALL'
  });
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  
  const [pagination, setPagination] = useState({
    page: 1,
    perPage: 10
  });

  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    brand: null,
    isDeleting: false
  });

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPagination(prev => ({ ...prev, page: 1 }));
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch Brands
  const fetchBrands = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        search: debouncedSearch
      };
      
      const response = await adminBrandService.getBrands(params);
      
      if (response.success) {
        setBrands(response.data);
      } else {
        showToast('error', response.message || 'Failed to fetch brands');
      }
    } catch (error) {
      console.error("Error fetching brands:", error);
      showToast('error', 'Unable to load brands. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, showToast]);

  useEffect(() => {
    fetchBrands();
  }, [fetchBrands]);

  // Apply frontend filters and pagination (since backend API currently doesn't implement pagination & filtering directly)
  let filteredBrands = brands;
  
  if (filters.status !== 'ALL') {
    filteredBrands = filteredBrands.filter(b => b.status === filters.status);
  }
  
  if (filters.featured !== 'ALL') {
    const isFeatured = filters.featured === 'FEATURED';
    filteredBrands = filteredBrands.filter(b => (b.featured == 1) === isFeatured);
  }
  
  const totalItems = filteredBrands.length;
  const totalPages = Math.ceil(totalItems / pagination.perPage) || 1;
  const currentBrands = filteredBrands.slice(
    (pagination.page - 1) * pagination.perPage,
    pagination.page * pagination.perPage
  );

  // Actions
  const handleAddClick = () => {
    setSelectedBrand(null);
    setIsDrawerOpen(true);
  };

  const handleEditClick = (brand) => {
    setSelectedBrand(brand);
    setIsDrawerOpen(true);
  };

  const handleDeleteClick = (brand) => {
    setDeleteModal({
      isOpen: true,
      brand,
      isDeleting: false
    });
  };

  const confirmDelete = async () => {
    const brand = deleteModal.brand;
    setDeleteModal(prev => ({ ...prev, isDeleting: true }));
    
    try {
      const response = await adminBrandService.deleteBrand(brand.id);
      if (response.success) {
        showToast('success', 'Brand deleted successfully.');
        setDeleteModal({ isOpen: false, brand: null, isDeleting: false });
        fetchBrands();
      }
    } catch (error) {
      console.error('Error deleting brand:', error);
      const errorMsg = error.response?.data?.message || 'Unable to delete brand.';
      showToast('error', errorMsg);
      setDeleteModal(prev => ({ ...prev, isDeleting: false }));
    }
  };

  const toggleStatus = async (brand) => {
    const newStatus = brand.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    
    // Optimistic update
    setBrands(brands.map(b => b.id === brand.id ? { ...b, status: newStatus } : b));
    
    try {
      await adminBrandService.updateBrandStatus(brand.id, newStatus);
      showToast('success', 'Brand status updated.');
    } catch (error) {
      // Revert on error
      setBrands(brands.map(b => b.id === brand.id ? { ...b, status: brand.status } : b));
      showToast('error', 'Unable to update brand status.');
    }
  };

  const toggleFeatured = async (brand) => {
    const newFeatured = brand.featured == 1 ? 0 : 1;
    
    // Optimistic update
    setBrands(brands.map(b => b.id === brand.id ? { ...b, featured: newFeatured } : b));
    
    try {
      await adminBrandService.updateBrandFeatured(brand.id, newFeatured === 1);
      showToast('success', 'Brand featured status updated.');
    } catch (error) {
      // Revert on error
      setBrands(brands.map(b => b.id === brand.id ? { ...b, featured: brand.featured } : b));
      showToast('error', 'Unable to update featured status.');
    }
  };

  const API_BASE = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api/index.php', '') : 'http://localhost:8080/pharmacy_api';

  return (
    <div className="admin-page">
      <div className="admin-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h1 style={{ margin: '0 0 5px 0', color: '#1a1a1a' }}>Brands</h1>
          <p style={{ margin: 0, color: '#666' }}>Manage pharmacy brands and manufacturers</p>
        </div>
        
        <div className="admin-page-header-actions" style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <div className="search-input-wrapper">
            <i className="fa-solid fa-search"></i>
            <input 
              type="text" 
              placeholder="Search brands..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div style={{ position: 'relative' }}>
            <button 
              className="admin-btn-secondary"
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              style={{ background: '#fff', border: '1px solid #ddd', padding: '10px 15px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <i className="fa-solid fa-filter"></i>
              Filter
            </button>
            
            {isFilterOpen && (
              <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '10px', background: '#fff', borderRadius: '8px', boxShadow: '0 5px 15px rgba(0,0,0,0.1)', border: '1px solid #eee', width: '250px', padding: '15px', zIndex: 100, animation: 'fadeIn 0.2s ease' }}>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '0.9rem' }}>Status</label>
                  <select 
                    value={filters.status}
                    onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                  >
                    <option value="ALL">All</option>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '0.9rem' }}>Featured</label>
                  <select 
                    value={filters.featured}
                    onChange={(e) => setFilters(prev => ({ ...prev, featured: e.target.value }))}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                  >
                    <option value="ALL">All</option>
                    <option value="FEATURED">Featured</option>
                    <option value="NOT_FEATURED">Not Featured</option>
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button 
                    onClick={() => { setFilters({ status: 'ALL', featured: 'ALL' }); setIsFilterOpen(false); }}
                    style={{ flex: 1, padding: '8px', background: '#f5f5f5', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    Clear
                  </button>
                  <button 
                    onClick={() => setIsFilterOpen(false)}
                    style={{ flex: 1, padding: '8px', background: '#087F73', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>
          
          <button 
            className="admin-btn-primary" 
            onClick={handleAddClick}
            style={{ background: '#087F73', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '500', boxShadow: '0 4px 6px rgba(8, 127, 115, 0.2)' }}
          >
            <i className="fa-solid fa-plus"></i>
            Add New Brand
          </button>
        </div>
      </div>

      <div className="admin-card" style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)', border: '1px solid #f0f0f0', overflow: 'hidden', marginTop: '20px' }}>
        
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
            <i className="fa-solid fa-spinner fa-spin fa-2x" style={{ color: '#087F73', marginBottom: '15px' }}></i>
            <p>Loading brands...</p>
          </div>
        ) : currentBrands.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#F6F9F8', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto', color: '#087F73', fontSize: '32px' }}>
              <i className="fa-solid fa-tag"></i>
            </div>
            <h3 style={{ margin: '0 0 10px 0', color: '#333' }}>
              {debouncedSearch || filters.status !== 'ALL' || filters.featured !== 'ALL' 
                ? "No brands match your search" 
                : "No brands found"}
            </h3>
            <p style={{ color: '#666', margin: '0 0 20px 0' }}>
              {debouncedSearch || filters.status !== 'ALL' || filters.featured !== 'ALL' 
                ? "Try clearing your filters or search term."
                : "Get started by creating your first brand."}
            </p>
            {(debouncedSearch || filters.status !== 'ALL' || filters.featured !== 'ALL') && (
              <button 
                onClick={() => { setSearchTerm(''); setFilters({status: 'ALL', featured: 'ALL'}); }}
                style={{ background: '#f5f5f5', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}
              >
                Clear Search & Filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table className="brands-table admin-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#F9FAFB', borderBottom: '2px solid #eee' }}>
                    <th style={{ padding: '15px', color: '#666', fontWeight: '600', fontSize: '0.85rem', textTransform: 'uppercase' }}>Brand</th>
                    <th style={{ padding: '15px', color: '#666', fontWeight: '600', fontSize: '0.85rem', textTransform: 'uppercase' }}>Slug</th>
                    <th style={{ padding: '15px', color: '#666', fontWeight: '600', fontSize: '0.85rem', textTransform: 'uppercase' }}>Products</th>
                    <th style={{ padding: '15px', color: '#666', fontWeight: '600', fontSize: '0.85rem', textTransform: 'uppercase' }}>Status</th>
                    <th style={{ padding: '15px', color: '#666', fontWeight: '600', fontSize: '0.85rem', textTransform: 'uppercase' }}>Featured</th>
                    <th style={{ padding: '15px', color: '#666', fontWeight: '600', fontSize: '0.85rem', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentBrands.map(brand => (
                    <tr key={brand.id} className="brands-table-row" style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td data-label="Brand" style={{ padding: '15px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                          {brand.logo ? (
                            <img src={`${API_BASE}/${brand.logo}`} alt={brand.name} className="brand-logo-preview" />
                          ) : (
                            <div className="brand-logo-preview" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aaa', fontSize: '18px' }}>
                              <i className="fa-regular fa-image"></i>
                            </div>
                          )}
                          <span style={{ fontWeight: '500', color: '#333' }}>{brand.name}</span>
                        </div>
                      </td>
                      <td data-label="Slug" style={{ padding: '15px', color: '#666' }}>
                        {brand.slug}
                      </td>
                      <td data-label="Products" style={{ padding: '15px' }}>
                        <span style={{ background: '#f5f5f5', padding: '4px 10px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: '600', color: '#555' }}>
                          {brand.product_count || 0}
                        </span>
                      </td>
                      <td data-label="Status" style={{ padding: '15px' }}>
                        <label className="toggle-switch">
                          <input 
                            type="checkbox" 
                            checked={brand.status === 'ACTIVE'}
                            onChange={() => toggleStatus(brand)}
                          />
                          <span className="toggle-slider"></span>
                        </label>
                      </td>
                      <td data-label="Featured" style={{ padding: '15px' }}>
                        <label className="toggle-switch">
                          <input 
                            type="checkbox" 
                            checked={brand.featured == 1}
                            onChange={() => toggleFeatured(brand)}
                          />
                          <span className="toggle-slider"></span>
                        </label>
                      </td>
                      <td data-label="Actions" style={{ padding: '15px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                          <button 
                            onClick={() => handleEditClick(brand)}
                            style={{ background: '#e6f4ea', color: '#137333', border: 'none', width: '32px', height: '32px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            title="Edit"
                          >
                            <i className="fa-solid fa-pen"></i>
                          </button>
                          <button 
                            onClick={() => handleDeleteClick(brand)}
                            style={{ background: '#fce8e6', color: '#c5221f', border: 'none', width: '32px', height: '32px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            title="Delete"
                          >
                            <i className="fa-solid fa-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px', borderTop: '1px solid #f0f0f0', background: '#fafafa', flexWrap: 'wrap', gap: '15px' }}>
                <div style={{ color: '#666', fontSize: '0.9rem' }}>
                  Showing {(pagination.page - 1) * pagination.perPage + 1}–{Math.min(pagination.page * pagination.perPage, totalItems)} of {totalItems} brands
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <select 
                    value={pagination.perPage}
                    onChange={(e) => setPagination({ page: 1, perPage: Number(e.target.value) })}
                    style={{ padding: '5px 10px', borderRadius: '4px', border: '1px solid #ddd', background: '#fff' }}
                  >
                    <option value={10}>10 per page</option>
                    <option value={25}>25 per page</option>
                    <option value={50}>50 per page</option>
                    <option value={100}>100 per page</option>
                  </select>
                  
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <button 
                      disabled={pagination.page === 1}
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                      style={{ padding: '5px 10px', border: '1px solid #ddd', borderRadius: '4px', background: pagination.page === 1 ? '#f5f5f5' : '#fff', cursor: pagination.page === 1 ? 'not-allowed' : 'pointer' }}
                    >
                      Previous
                    </button>
                    
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <button 
                        key={page}
                        onClick={() => setPagination(prev => ({ ...prev, page }))}
                        style={{ 
                          width: '32px', height: '32px', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer',
                          background: pagination.page === page ? '#087F73' : '#fff',
                          color: pagination.page === page ? '#fff' : '#333'
                        }}
                      >
                        {page}
                      </button>
                    ))}
                    
                    <button 
                      disabled={pagination.page === totalPages}
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                      style={{ padding: '5px 10px', border: '1px solid #ddd', borderRadius: '4px', background: pagination.page === totalPages ? '#f5f5f5' : '#fff', cursor: pagination.page === totalPages ? 'not-allowed' : 'pointer' }}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Brand Form Drawer */}
      <AdminBrandForm 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        onSuccess={() => {
          setIsDrawerOpen(false);
          fetchBrands();
        }}
        brand={selectedBrand}
      />
      
      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn 0.2s ease' }}>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '30px', width: '90%', maxWidth: '400px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#fce8e6', color: '#c5221f', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', margin: '0 auto 20px auto' }}>
              <i className="fa-solid fa-triangle-exclamation"></i>
            </div>
            <h3 style={{ textAlign: 'center', margin: '0 0 10px 0', fontSize: '1.25rem' }}>Delete Brand?</h3>
            <p style={{ textAlign: 'center', color: '#666', margin: '0 0 25px 0' }}>
              Are you sure you want to delete <strong>{deleteModal.brand?.name}</strong>? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '15px' }}>
              <button 
                onClick={() => setDeleteModal({ isOpen: false, brand: null, isDeleting: false })}
                style={{ flex: 1, padding: '12px', background: '#f5f5f5', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '500' }}
                disabled={deleteModal.isDeleting}
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete}
                style={{ flex: 1, padding: '12px', background: '#c5221f', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '500', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                disabled={deleteModal.isDeleting}
              >
                {deleteModal.isDeleting ? (
                  <><i className="fa-solid fa-spinner fa-spin"></i> Deleting...</>
                ) : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
