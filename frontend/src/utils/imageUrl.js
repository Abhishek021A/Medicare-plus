import placeholderImg from '../assets/images/medicine-placeholder.jpg';

export const resolveImageUrl = (img, fallback = placeholderImg) => {
  if (!img) return fallback;
  if (
    img.startsWith('http://') ||
    img.startsWith('https://') ||
    img.startsWith('data:') ||
    img.startsWith('blob:')
  ) {
    return img;
  }

  const apiBase = import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace('/api/index.php', '')
    : 'http://localhost:8080/pharmacy_api';

  // If it's a bare filename like 'hero-1.jpg' without leading slash or folder, assume /uploads/banners/
  if (!img.includes('/')) {
    return `${apiBase}/uploads/banners/${img}`;
  }

  return `${apiBase}${img.startsWith('/') ? '' : '/'}${img}`;
};

export default resolveImageUrl;
