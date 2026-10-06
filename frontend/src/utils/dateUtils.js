// frontend/src/utils/dateUtils.js

/**
 * Format relative time (e.g. 'Just now', '2m ago', '1h ago', 'Yesterday', '01 Oct 2026')
 */
export const formatRelativeTime = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString.replace(' ', 'T'));
  if (isNaN(date.getTime())) return dateString;

  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 30) {
    return 'Just now';
  }
  if (diffInSeconds < 60) {
    return `${diffInSeconds}s ago`;
  }
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  }
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  }
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) {
    return 'Yesterday';
  }
  if (diffInDays < 7) {
    return `${diffInDays}d ago`;
  }

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

/**
 * Format full date and time (e.g. '01 Oct 2026, 05:05 PM')
 */
export const formatDateTime = (dateString) => {
  if (!dateString) return '—';
  const date = new Date(dateString.replace(' ', 'T'));
  if (isNaN(date.getTime())) return dateString;

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

/**
 * Format date only (e.g. '01 Oct 2026')
 */
export const formatDate = (dateString) => {
  if (!dateString) return '—';
  const date = new Date(dateString.replace(' ', 'T'));
  if (isNaN(date.getTime())) return dateString;

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};
