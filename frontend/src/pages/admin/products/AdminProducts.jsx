import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Filter, Edit, Trash2, MoreVertical, Loader2, ShoppingBag } from 'lucide-react';
import { adminProductService } from '../../../services/adminApi';
import { useToast } from '../../../context/ToastContext';
import './AdminProducts.css';

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const { addToast } = useToast();

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      const response = await adminProductService.getProducts();
      if (response.success) {
        setProducts(response.data || []);
        setFilteredProducts(response.data || []);
      }
    } catch (error) {
      addToast('error', 'Failed to fetch products');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let result = products;
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(p => 
        p.name?.toLowerCase().includes(lower) || 
        p.sku?.toLowerCase().includes(lower) ||
        p.medicine_group_name?.toLowerCase().includes(lower) ||
        p.brand_name?.toLowerCase().includes(lower)
      );
    }
    setFilteredProducts(result);
    setCurrentPage(1);
  }, [searchTerm, products]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentProducts = filteredProducts.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await adminProductService.deleteProduct(id);
        addToast('success', 'Product deleted successfully');
        fetchProducts(); // Refresh list
      } catch (error) {
        addToast('error', 'Failed to delete product');
      }
    }
  };

  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    const baseUrl = import.meta.env.VITE_API_URL 
      ? import.meta.env.VITE_API_URL.replace('/api/index.php', '') 
      : 'http://localhost:8080/pharmacy_api';
    return `${baseUrl}${imagePath}`;
  };

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>Products</h1>
          <p>Manage your store's inventory and product listings</p>
        </div>
        <Link to="/admin/products/create" className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus size={18} /> Add New Product
        </Link>
      </div>

      <div className="admin-card">
        <div className="admin-toolbar">
          <div className="toolbar-search">
            <Search size={18} className="search-icon" />
            <input 
              type="text" 
              placeholder="Search medicines by name, SKU or group..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="toolbar-actions">
            <button className="btn-outline">
              <Filter size={16} /> Filter
            </button>
          </div>
        </div>

        <div className="table-responsive">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Image</th>
                <th>Medicine Name</th>
                <th>Medicine Group</th>
                <th>SKU</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="8" className="text-center py-10">
                    <Loader2 size={32} className="spinner mx-auto" />
                    <p className="mt-2 text-muted">Loading products...</p>
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-10">
                    <p className="text-muted">No products found.</p>
                  </td>
                </tr>
              ) : (
                currentProducts.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <div className="product-image-mini" style={{ width: '56px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9', borderRadius: '8px', overflow: 'hidden' }}>
                        {product.image ? (
                           <img 
                            src={getImageUrl(product.image)} 
                            alt={product.name} 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'block';
                            }}
                          />
                        ) : null}
                        <ShoppingBag size={24} style={{ display: product.image ? 'none' : 'block', color: '#94a3b8' }} />
                      </div>
                    </td>
                    <td>
                      <span className="product-name" style={{ fontWeight: '600', color: '#1e293b' }}>{product.name}</span>
                    </td>
                    <td>
                      {product.medicine_group_name ? (
                        <span style={{ backgroundColor: 'rgba(8, 127, 115, 0.1)', color: '#087F73', padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem', fontWeight: '500' }}>
                          {product.medicine_group_name}
                        </span>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                    <td className="text-muted" style={{ fontSize: '0.9rem' }}>{product.sku}</td>
                    <td className="fw-bold" style={{ fontWeight: '600' }}>₹{Number(product.price).toFixed(2)}</td>
                    <td>
                      <span className={`stock-badge`} style={{ color: product.stock_quantity > 10 ? '#10b981' : (product.stock_quantity > 0 ? '#f59e0b' : '#ef4444'), fontWeight: '500', fontSize: '0.9rem' }}>
                        {product.stock_quantity > 10 ? `${product.stock_quantity} in stock` : (product.stock_quantity > 0 ? `Low stock (${product.stock_quantity})` : 'Out of stock')}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge`} style={{ backgroundColor: product.status === 'ACTIVE' ? '#dcfce7' : '#f1f5f9', color: product.status === 'ACTIVE' ? '#166534' : '#475569', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: '600' }}>
                        {product.status}
                      </span>
                    </td>
                    <td className="text-right">
                      <div className="action-buttons" style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <Link to={`/admin/products/edit/${product.id}`} className="btn-icon" aria-label="Edit" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '6px', backgroundColor: '#f8fafc', color: '#334155', border: '1px solid #e2e8f0' }}>
                          <Edit size={16} />
                        </Link>
                        <button 
                          className="btn-icon text-danger" 
                          aria-label="Delete"
                          onClick={() => handleDelete(product.id)}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '6px', backgroundColor: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', cursor: 'pointer' }}
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
        
        {!isLoading && filteredProducts.length > 0 && (
          <div className="pagination-wrapper">
            <span className="text-muted text-sm" style={{ fontSize: '0.9rem', color: '#64748b' }}>
              Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredProducts.length)} of {filteredProducts.length} results
            </span>
            <div className="pagination-controls" style={{ display: 'flex', gap: '8px' }}>
              <button 
                className="btn-page" 
                disabled={currentPage === 1}
                onClick={() => handlePageChange(currentPage - 1)}
                style={{ padding: '6px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', backgroundColor: '#fff', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.5 : 1 }}
              >
                Previous
              </button>
              
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button 
                  key={page}
                  className={`btn-page ${currentPage === page ? 'active' : ''}`}
                  onClick={() => handlePageChange(page)}
                  style={{ 
                    padding: '6px 12px', 
                    border: '1px solid',
                    borderColor: currentPage === page ? '#087F73' : '#e2e8f0', 
                    borderRadius: '6px', 
                    backgroundColor: currentPage === page ? '#087F73' : '#fff', 
                    color: currentPage === page ? '#fff' : '#333',
                    cursor: 'pointer' 
                  }}
                >
                  {page}
                </button>
              ))}

              <button 
                className="btn-page" 
                disabled={currentPage === totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
                style={{ padding: '6px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', backgroundColor: '#fff', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', opacity: currentPage === totalPages ? 0.5 : 1 }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
