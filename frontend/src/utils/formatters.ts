// ============================================
// Formatters Utility
// ============================================

/**
 * Format currency with proper symbol and decimals
 */
export const formatCurrency = (value: number | string | undefined): string => {
  if (value === undefined || value === null) return '$0.00';
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(numValue)) return '$0.00';
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numValue);
};

/**
 * Format compact currency (e.g., $1.2M, $450K)
 */
export const formatCompactCurrency = (value: number | string | undefined): string => {
  if (value === undefined || value === null) return '$0';
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(numValue)) return '$0';
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(numValue);
};

/**
 * Format cryptocurrency amount
 */
export const formatCrypto = (value: number | string | undefined, symbol: string = 'USDT'): string => {
  if (value === undefined || value === null) return `0 ${symbol}`;
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(numValue)) return `0 ${symbol}`;
  
  const decimals = symbol === 'BTC' ? 8 : 2;
  return `${numValue.toFixed(decimals)} ${symbol}`;
};

/**
 * Format percentage
 */
export const formatPercentage = (value: number | string | undefined, decimals: number = 2): string => {
  if (value === undefined || value === null) return '0%';
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(numValue)) return '0%';
  
  return `${numValue >= 0 ? '+' : ''}${numValue.toFixed(decimals)}%`;
};

/**
 * Format number with commas
 */
export const formatNumber = (value: number | string | undefined): string => {
  if (value === undefined || value === null) return '0';
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(numValue)) return '0';
  
  return new Intl.NumberFormat('en-US').format(numValue);
};

/**
 * Format compact number (e.g., 1.2M, 450K)
 */
export const formatCompactNumber = (value: number | string | undefined): string => {
  if (value === undefined || value === null) return '0';
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(numValue)) return '0';
  
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(numValue);
};

/**
 * Format date
 */
export const formatDate = (date: string | Date | undefined): string => {
  if (!date) return '-';
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) return '-';
  
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(dateObj);
};

/**
 * Format date with time
 */
export const formatDateTime = (date: string | Date | undefined): string => {
  if (!date) return '-';
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) return '-';
  
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(dateObj);
};

/**
 * Format relative time (e.g., "2 hours ago", "3 days ago")
 */
export const formatRelativeTime = (date: string | Date | undefined): string => {
  if (!date) return '-';
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) return '-';
  
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 604800)} weeks ago`;
  
  return formatDate(date);
};

/**
 * Format phone number
 */
export const formatPhoneNumber = (phone: string | undefined): string => {
  if (!phone) return '-';
  
  // Remove non-numeric characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Format based on length
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  if (cleaned.length > 10) {
    return `+${cleaned.slice(0, cleaned.length - 10)} ${cleaned.slice(-10, -7)} ${cleaned.slice(-7, -4)} ${cleaned.slice(-4)}`;
  }
  
  return phone;
};

/**
 * Format business type for display
 */
export const formatBusinessType = (type: string | undefined): string => {
  if (!type) return '-';
  
  const typeMap: Record<string, string> = {
    small_business: 'Small Business',
    medium_business: 'Medium Business',
    investor: 'Investor',
    business_owner: 'Business Owner',
    admin: 'Administrator',
  };
  
  return typeMap[type] || type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

/**
 * Get color class based on value change
 */
export const getChangeColorClass = (value: number): string => {
  if (value > 0) return 'text-success-600';
  if (value < 0) return 'text-danger-600';
  return 'text-secondary-600';
};

/**
 * Get status color class
 */
export const getStatusColorClass = (status: string): string => {
  const statusMap: Record<string, string> = {
    active: 'text-success-600',
    inactive: 'text-secondary-600',
    pending: 'text-warning-600',
    verified: 'text-success-600',
    rejected: 'text-danger-600',
    approved: 'text-success-600',
    completed: 'text-success-600',
    failed: 'text-danger-600',
    cancelled: 'text-secondary-600',
  };
  
  return statusMap[status.toLowerCase()] || 'text-secondary-600';
};

/**
 * Truncate text with ellipsis
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (!text || text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
};

/**
 * Format file size
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
