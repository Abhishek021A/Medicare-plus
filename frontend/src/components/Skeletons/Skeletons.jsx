import React from 'react';
import './Skeletons.css';

// Base Shimmer Component
export const Shimmer = () => (
  <div className="shimmer-wrapper">
    <div className="shimmer"></div>
  </div>
);

// 1. Product Skeleton
export const ProductSkeleton = () => {
  return (
    <div className="skeleton-card product-skeleton">
      <Shimmer />
      <div className="skeleton-img"></div>
      <div className="skeleton-content">
        <div className="skeleton-line title"></div>
        <div className="skeleton-line short"></div>
        <div className="skeleton-line price mt-20"></div>
        <div className="skeleton-button mt-15"></div>
      </div>
    </div>
  );
};

// 2. Category Skeleton
export const CategorySkeleton = () => {
  return (
    <div className="skeleton-card category-skeleton">
      <Shimmer />
      <div className="skeleton-icon-circle"></div>
      <div className="skeleton-line title mt-15"></div>
      <div className="skeleton-line desc"></div>
    </div>
  );
};

// 3. Blog Skeleton
export const BlogSkeleton = () => {
  return (
    <div className="skeleton-card blog-skeleton">
      <Shimmer />
      <div className="skeleton-img blog-img"></div>
      <div className="skeleton-content">
        <div className="skeleton-meta">
          <div className="skeleton-line very-short"></div>
          <div className="skeleton-line very-short"></div>
        </div>
        <div className="skeleton-line title mt-15"></div>
        <div className="skeleton-line title"></div>
        <div className="skeleton-line desc mt-15"></div>
        <div className="skeleton-line desc"></div>
      </div>
    </div>
  );
};
