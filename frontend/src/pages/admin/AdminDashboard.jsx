import { useState, useEffect } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts';
import { 
  TrendingUp, Users, ShoppingBag, AlertCircle, Eye, CheckCircle2, 
  Package, Clock, FileText, ArrowLeftRight, Edit 
} from 'lucide-react';
import './AdminDashboard.css';

// Mock Data
const salesData = [
  { name: 'Mon', sales: 40000, orders: 120 },
  { name: 'Tue', sales: 30000, orders: 98 },
  { name: 'Wed', sales: 20000, orders: 86 },
  { name: 'Thu', sales: 27800, orders: 108 },
  { name: 'Fri', sales: 18900, orders: 64 },
  { name: 'Sat', sales: 23900, orders: 90 },
  { name: 'Sun', sales: 34900, orders: 130 },
];

const orderData = [
  { name: 'Pending', value: 120 },
  { name: 'Confirmed', value: 340 },
  { name: 'Processing', value: 210 },
  { name: 'Shipped', value: 180 },
  { name: 'Delivered', value: 450 },
  { name: 'Cancelled', value: 50 },
];

const COLORS = ['#f59e0b', '#3b82f6', '#8b5cf6', '#0ea5e9', '#10b981', '#ef4444'];

const recentOrders = [
  { id: '#ORD-10248', customer: 'Rahul Sharma', date: '10 Sep 2026', items: '3 Items', amount: '₹1,249', payment: 'Paid', status: 'Processing' },
  { id: '#ORD-10247', customer: 'Priya Patel', date: '10 Sep 2026', items: '1 Item', amount: '₹850', payment: 'Unpaid', status: 'Pending' },
  { id: '#ORD-10246', customer: 'Amit Kumar', date: '09 Sep 2026', items: '5 Items', amount: '₹3,420', payment: 'Paid', status: 'Shipped' },
  { id: '#ORD-10245', customer: 'Sneha Gupta', date: '09 Sep 2026', items: '2 Items', amount: '₹450', payment: 'Paid', status: 'Delivered' },
  { id: '#ORD-10244', customer: 'Vikram Singh', date: '08 Sep 2026', items: '4 Items', amount: '₹2,100', payment: 'Refunded', status: 'Cancelled' },
  { id: '#ORD-10243', customer: 'Deepak Verma', date: '08 Sep 2026', items: '2 Items', amount: '₹1,850', payment: 'Paid', status: 'Confirmed' },
];

const topSellingProducts = [
  { id: 1, product: 'Vitamin C Tablets', category: 'Vitamins', orders: 248, units: 452, revenue: '₹1,82,000' },
  { id: 2, product: 'Omega 3 Capsules', category: 'Wellness', orders: 184, units: 291, revenue: '₹1,24,500' },
  { id: 3, product: 'Blood Pressure Monitor', category: 'Medical Devices', orders: 96, units: 104, revenue: '₹98,400' },
];

const lowStockProducts = [
  { id: 1, product: 'Paracetamol 500mg', sku: 'MED-PARA-500', stock: 12, status: 'Low Stock' },
  { id: 2, product: 'Amoxicillin 250mg', sku: 'MED-AMOX-250', stock: 0, status: 'Out of Stock' },
  { id: 3, product: 'Thermometer Digital', sku: 'DEV-THER-DIG', stock: 4, status: 'Low Stock' },
];

const miniSparklineData = [
  { val: 10 }, { val: 20 }, { val: 15 }, { val: 25 }, { val: 22 }, { val: 30 }, { val: 28 }, { val: 35 }
];

export default function AdminDashboard() {
  const [dashboardStats, setDashboardStats] = useState(null);

  // Simulate fetching data from PHP API
  useEffect(() => {
    // In final implementation, this will be an API call
    setDashboardStats({
      sales: { value: '₹2,48,560', trend: '+12.8%' },
      orders: { value: '1,248', trend: '+8.4%' },
      customers: { value: '8,642', trend: '+14.2%' },
      products: { value: '1,284', trend: '+4.5%' },
      pendingOrders: { value: '28', trend: null },
      pendingPrescriptions: { value: '12', trend: null },
      lowStock: { value: '18', trend: null },
      returnRequests: { value: '7', trend: null },
    });
  }, []);

  const renderSparkline = (color) => (
    <div className="sparkline-container">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={miniSparklineData}>
          <Line type="monotone" dataKey="val" stroke={color} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <div>
          <h1>Dashboard</h1>
          <p>Here's what's happening with your pharmacy store today.</p>
        </div>
        <div className="dashboard-date-selector">
          <select className="date-select" defaultValue="today">
            <option value="today">Today</option>
            <option value="7days">7 Days</option>
            <option value="30days">30 Days</option>
            <option value="custom">Custom</option>
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-header">
            <h3>TOTAL SALES</h3>
            <div className="kpi-icon sales"><TrendingUp size={18} /></div>
          </div>
          <div className="kpi-value">{dashboardStats?.sales.value || '...'}</div>
          <div className="kpi-footer">
            <span className="kpi-trend positive">{dashboardStats?.sales.trend}</span>
            <span className="kpi-comparison">vs last month</span>
            {renderSparkline('#087F73')}
          </div>
        </div>
        
        <div className="kpi-card">
          <div className="kpi-header">
            <h3>TOTAL ORDERS</h3>
            <div className="kpi-icon orders"><ShoppingBag size={18} /></div>
          </div>
          <div className="kpi-value">{dashboardStats?.orders.value || '...'}</div>
          <div className="kpi-footer">
            <span className="kpi-trend positive">{dashboardStats?.orders.trend}</span>
            <span className="kpi-comparison">vs last month</span>
            {renderSparkline('#3b82f6')}
          </div>
        </div>
        
        <div className="kpi-card">
          <div className="kpi-header">
            <h3>CUSTOMERS</h3>
            <div className="kpi-icon customers"><Users size={18} /></div>
          </div>
          <div className="kpi-value">{dashboardStats?.customers.value || '...'}</div>
          <div className="kpi-footer">
            <span className="kpi-trend positive">{dashboardStats?.customers.trend}</span>
            <span className="kpi-comparison">vs last month</span>
            {renderSparkline('#8b5cf6')}
          </div>
        </div>
        
        <div className="kpi-card">
          <div className="kpi-header">
            <h3>PRODUCTS</h3>
            <div className="kpi-icon products"><Package size={18} /></div>
          </div>
          <div className="kpi-value">{dashboardStats?.products.value || '...'}</div>
          <div className="kpi-footer">
            <span className="kpi-trend positive">{dashboardStats?.products.trend}</span>
            <span className="kpi-comparison">vs last month</span>
            {renderSparkline('#10b981')}
          </div>
        </div>

        <div className="kpi-card warning">
          <div className="kpi-header">
            <h3>PENDING ORDERS</h3>
            <div className="kpi-icon warning-icon"><Clock size={18} /></div>
          </div>
          <div className="kpi-value">{dashboardStats?.pendingOrders.value || '...'}</div>
          <div className="kpi-footer">
            <span className="kpi-comparison">Requires attention</span>
          </div>
        </div>

        <div className="kpi-card warning">
          <div className="kpi-header">
            <h3>PENDING PRESCRIPTIONS</h3>
            <div className="kpi-icon warning-icon"><FileText size={18} /></div>
          </div>
          <div className="kpi-value">{dashboardStats?.pendingPrescriptions.value || '...'}</div>
          <div className="kpi-footer">
            <span className="kpi-comparison">Requires review</span>
          </div>
        </div>

        <div className="kpi-card danger">
          <div className="kpi-header">
            <h3>LOW STOCK</h3>
            <div className="kpi-icon danger-icon"><AlertCircle size={18} /></div>
          </div>
          <div className="kpi-value">{dashboardStats?.lowStock.value || '...'}</div>
          <div className="kpi-footer">
            <span className="kpi-comparison">Needs reordering</span>
          </div>
        </div>

        <div className="kpi-card danger">
          <div className="kpi-header">
            <h3>RETURN REQUESTS</h3>
            <div className="kpi-icon danger-icon"><ArrowLeftRight size={18} /></div>
          </div>
          <div className="kpi-value">{dashboardStats?.returnRequests.value || '...'}</div>
          <div className="kpi-footer">
            <span className="kpi-comparison">Needs processing</span>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="charts-grid">
        <div className="chart-card sales-chart">
          <div className="chart-header-row">
            <h3>Sales Overview</h3>
            <div className="chart-filters">
              <button className="chart-filter active">7 Days</button>
              <button className="chart-filter">30 Days</button>
              <button className="chart-filter">3 Months</button>
              <button className="chart-filter">6 Months</button>
              <button className="chart-filter">1 Year</button>
            </div>
          </div>
          <div className="chart-body">
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={salesData} margin={{ top: 10, right: 30, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#087F73" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#087F73" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7774', fontSize: 12 }} dy={10} />
                <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#6B7774', fontSize: 12 }} tickFormatter={(val) => `₹${val/1000}k`} />
                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#6B7774', fontSize: 12 }} />
                
                <RechartsTooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.08)' }}
                  labelStyle={{ fontWeight: 'bold', color: '#17201F', marginBottom: '5px' }}
                  formatter={(value, name) => [
                    name === 'sales' ? `₹${value.toLocaleString()}` : value, 
                    name === 'sales' ? 'Sales' : 'Orders'
                  ]}
                />
                
                <Area yAxisId="left" type="monotone" dataKey="sales" stroke="#087F73" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" activeDot={{ r: 6, fill: '#087F73', stroke: '#fff', strokeWidth: 2 }} />
                <Area yAxisId="right" type="monotone" dataKey="orders" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorOrders)" activeDot={{ r: 6, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-card orders-chart">
          <div className="chart-header-row">
            <h3>Orders Overview</h3>
          </div>
          <div className="chart-body">
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie
                  data={orderData}
                  cx="50%"
                  cy="45%"
                  innerRadius={80}
                  outerRadius={110}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                >
                  {orderData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.08)' }}
                  itemStyle={{ color: '#17201F', fontWeight: '500' }}
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={36}
                  iconType="circle"
                  wrapperStyle={{ fontSize: '0.8rem', color: '#6B7774', paddingTop: '20px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Data Tables & Cards */}
      <div className="data-grid">
        <div className="dashboard-tables-column">
          <div className="recent-orders-card">
            <div className="card-header">
              <h3>Recent Orders</h3>
              <button className="btn-view-all">View All</button>
            </div>
            <div className="table-responsive">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Date</th>
                    <th>Items</th>
                    <th>Amount</th>
                    <th>Payment</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map(order => (
                    <tr key={order.id}>
                      <td className="fw-medium text-dark">{order.id}</td>
                      <td className="fw-medium">{order.customer}</td>
                      <td className="text-muted">{order.date}</td>
                      <td>{order.items}</td>
                      <td className="fw-bold">{order.amount}</td>
                      <td>
                        <span className={`payment-badge ${order.payment.toLowerCase()}`}>
                          {order.payment}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge ${order.status.toLowerCase()}`}>
                          {order.status}
                        </span>
                      </td>
                      <td>
                        <button className="btn-icon" aria-label="View Order"><Eye size={18} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="top-products-card">
            <div className="card-header">
              <h3>Top Selling Products</h3>
              <button className="btn-view-all">View All</button>
            </div>
            <div className="table-responsive">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Category</th>
                    <th>Orders</th>
                    <th>Units Sold</th>
                    <th>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {topSellingProducts.map(product => (
                    <tr key={product.id}>
                      <td className="fw-medium text-dark">{product.product}</td>
                      <td><span className="category-badge">{product.category}</span></td>
                      <td>{product.orders}</td>
                      <td>{product.units}</td>
                      <td className="fw-bold">{product.revenue}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="low-stock-card">
            <div className="card-header">
              <h3>Low Stock Products</h3>
              <button className="btn-view-all">View Inventory</button>
            </div>
            <div className="table-responsive">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>SKU</th>
                    <th>Stock</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStockProducts.map(product => (
                    <tr key={product.id}>
                      <td className="fw-medium text-dark">{product.product}</td>
                      <td className="text-muted">{product.sku}</td>
                      <td className="fw-bold text-dark">{product.stock}</td>
                      <td>
                        <span className={`status-badge ${product.status.replace(/ /g, '-').toLowerCase()}`}>
                          {product.status}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button className="btn-icon" aria-label="View Product"><Eye size={18} /></button>
                          <button className="btn-icon" aria-label="Edit Product"><Edit size={18} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="side-cards">
          <div className="action-card alert">
            <div className="action-icon alert-icon">
              <AlertCircle size={24} />
            </div>
            <div className="action-content">
              <h4>Low Stock Alerts</h4>
              <p>18 products need attention</p>
              <button className="btn-link">View Products &rarr;</button>
            </div>
          </div>
          
          <div className="action-card info">
            <div className="action-icon info-icon">
              <CheckCircle2 size={24} />
            </div>
            <div className="action-content">
              <h4>Prescription Requests</h4>
              <p>12 pending verifications</p>
              <button className="btn-link">Review Now &rarr;</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
