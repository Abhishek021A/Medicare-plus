import { Link } from 'react-router-dom';
import { Home, Search, AlertCircle } from 'lucide-react';
import './NotFound.css';

export default function NotFound() {
  return (
    <div className="not-found-page">
      <div className="container">
        <div className="not-found-content">
          
          <div className="error-code">404</div>
          
          <div className="error-icon-wrapper">
            <AlertCircle size={60} className="text-primary" />
          </div>

          <h1 className="mb-20">Oops! Page Not Found</h1>
          
          <p className="text-muted mb-40 max-w-600 mx-auto">
            It looks like you've reached a dead end. The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
          </p>

          <div className="action-buttons">
            <Link to="/" className="btn-primary btn-lg">
              <Home size={20} className="mr-10" /> Back to Home
            </Link>
            <Link to="/shop" className="btn-outline btn-lg">
              <Search size={20} className="mr-10" /> Browse Products
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
