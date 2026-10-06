const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

const directories = [
  'components/Header',
  'components/Footer',
  'components/Hero',
  'components/ProductCard',
  'components/CategoryCard',
  'components/PromoBanner',
  'components/ServiceCard',
  'components/SectionTitle',
  'components/Rating',
  'components/Price',
  'components/SearchBar',
  'components/CartDrawer',
  'components/WishlistButton',
  'components/QuantitySelector',
  'components/Breadcrumb',
  'components/Pagination',
  'components/FilterSidebar',
  'components/MobileFilter',
  'components/ProductGallery',
  'components/ReviewCard',
  'components/Newsletter',
  'components/Modal',
  'components/Toast',
  'components/LoadingSkeleton',
  'components/EmptyState',
  'pages',
  'layouts',
  'hooks',
  'services',
  'context',
  'utils',
  'assets/images',
  'assets/icons',
  'styles'
];

const files = [
  'pages/Home.jsx',
  'pages/Shop.jsx',
  'pages/ProductDetails.jsx',
  'pages/Categories.jsx',
  'pages/CategoryProducts.jsx',
  'pages/SearchResults.jsx',
  'pages/Cart.jsx',
  'pages/Checkout.jsx',
  'pages/Login.jsx',
  'pages/Register.jsx',
  'pages/Account.jsx',
  'pages/Orders.jsx',
  'pages/OrderDetails.jsx',
  'pages/Wishlist.jsx',
  'pages/About.jsx',
  'pages/Contact.jsx',
  'pages/Blog.jsx',
  'pages/BlogDetails.jsx',
  'pages/FAQ.jsx',
  'pages/PrivacyPolicy.jsx',
  'pages/Terms.jsx',
  'pages/NotFound.jsx',
  'layouts/MainLayout.jsx',
  'layouts/AccountLayout.jsx',
  'hooks/useProducts.js',
  'hooks/useCart.js',
  'hooks/useWishlist.js',
  'hooks/useAuth.js',
  'hooks/useDebounce.js',
  'services/api.js',
  'services/productService.js',
  'services/cartService.js',
  'services/orderService.js',
  'services/authService.js',
  'services/categoryService.js',
  'context/AuthContext.jsx',
  'context/CartContext.jsx',
  'context/WishlistContext.jsx',
  'utils/formatPrice.js',
  'utils/validation.js',
  'utils/constants.js',
  'styles/globals.css',
  'styles/variables.css',
  'styles/animations.css'
];

directories.forEach(dir => {
  const dirPath = path.join(srcDir, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
});

files.forEach(file => {
  const filePath = path.join(srcDir, file);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, '// TODO: Implement\n');
  }
});

console.log('Project structure successfully scaffolded!');
