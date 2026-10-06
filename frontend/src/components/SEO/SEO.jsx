import React from 'react';
import { Helmet } from 'react-helmet-async';

export default function SEO({ title, description, type = 'website' }) {
  const siteName = 'Medicare Plus';
  const fullTitle = title ? `${title} | ${siteName}` : siteName;
  const defaultDescription = 'Your trusted online pharmacy for medicines, vitamins, and healthcare products.';
  const finalDescription = description || defaultDescription;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={finalDescription} />
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={finalDescription} />
      <meta property="og:site_name" content={siteName} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={finalDescription} />
    </Helmet>
  );
}
