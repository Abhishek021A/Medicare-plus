const fs = require('fs');
const path = require('path');

const basePath = path.join(__dirname, 'frontend', 'src', 'pages', 'admin');

const pages = [
  { dir: 'categories', files: ['AdminCategories', 'AdminCategoryForm'] },
  { dir: 'brands', files: ['AdminBrands'] },
  { dir: 'inventory', files: ['AdminInventory'] },
  { dir: 'orders', files: ['AdminOrders', 'AdminOrderDetails'] },
  { dir: 'prescriptions', files: ['AdminPrescriptions', 'AdminPrescriptionDetails'] },
  { dir: 'customers', files: ['AdminCustomers', 'AdminCustomerDetails'] },
  { dir: 'coupons', files: ['AdminCoupons', 'AdminCouponForm'] },
  { dir: 'banners', files: ['AdminBanners'] },
  { dir: 'blog', files: ['AdminBlog', 'AdminBlogForm'] },
  { dir: 'reviews', files: ['AdminReviews'] },
  { dir: 'reports', files: ['AdminReports'] },
  { dir: 'notifications', files: ['AdminNotifications'] },
  { dir: 'settings', files: ['AdminSettings'] },
  { dir: 'profile', files: ['AdminProfile'] },
];

pages.forEach(({ dir, files }) => {
  const dirPath = path.join(basePath, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  files.forEach(file => {
    const filePath = path.join(dirPath, `${file}.jsx`);
    const content = `import React from 'react';\n\nexport default function ${file}() {\n  return (\n    <div className="admin-page">\n      <div className="admin-page-header">\n        <div>\n          <h1>${file.replace('Admin', '')}</h1>\n          <p>Placeholder for ${file} module.</p>\n        </div>\n      </div>\n      <div className="admin-card p-20">\n        <p>This section is under construction.</p>\n      </div>\n    </div>\n  );\n}\n`;
    
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, content);
      console.log(`Created: ${filePath}`);
    }
  });
});

console.log('Admin pages generation complete.');
