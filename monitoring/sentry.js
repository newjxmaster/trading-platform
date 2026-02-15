// Trading Platform - Sentry Configuration
// Error tracking and performance monitoring

const Sentry = require('@sentry/node');
const { ProfilingIntegration } = require('@sentry/profiling-node');

// Initialize Sentry
const initSentry = () => {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    release: process.env.RELEASE_VERSION || 'unknown',
    
    // Performance monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    
    // Profiling
    profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    integrations: [
      new ProfilingIntegration(),
    ],
    
    // Error filtering
    beforeSend(event) {
      // Filter out known errors
      if (shouldIgnoreError(event)) {
        return null;
      }
      
      // Sanitize sensitive data
      return sanitizeEvent(event);
    },
    
    // Ignore certain errors
    ignoreErrors: [
      'Network Error',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'Request timeout',
      'AbortError',
    ],
    
    // Ignore certain URLs
    denyUrls: [
      /extensions\//i,
      /^chrome:\/\//i,
      /^chrome-extension:\/\//i,
    ],
  });
  
  console.log('Sentry initialized');
};

// Check if error should be ignored
const shouldIgnoreError = (event) => {
  const errorMessage = event.exception?.values?.[0]?.value || '';
  
  // Ignore specific error patterns
  const ignoredPatterns = [
    /ResizeObserver loop limit exceeded/i,
    /Non-Error promise rejection captured with value/i,
  ];
  
  return ignoredPatterns.some(pattern => pattern.test(errorMessage));
};

// Sanitize sensitive data from events
const sanitizeEvent = (event) => {
  // Remove sensitive headers
  if (event.request?.headers) {
    delete event.request.headers['authorization'];
    delete event.request.headers['cookie'];
    delete event.request.headers['x-api-key'];
  }
  
  // Remove sensitive data from user context
  if (event.user) {
    delete event.user.password;
    delete event.user.token;
    delete event.user.ssn;
    delete event.user.idNumber;
  }
  
  // Sanitize URL query parameters
  if (event.request?.url) {
    const url = new URL(event.request.url);
    ['token', 'password', 'secret', 'api_key'].forEach(param => {
      url.searchParams.delete(param);
    });
    event.request.url = url.toString();
  }
  
  return event;
};

// Express middleware for Sentry
const sentryMiddleware = () => {
  return Sentry.Handlers.requestHandler();
};

// Express error handler for Sentry
const sentryErrorHandler = () => {
  return Sentry.Handlers.errorHandler({
    shouldHandleError(error) {
      // Capture all 500 errors
      if (error.statusCode >= 500) {
        return true;
      }
      
      // Capture specific error types
      const captureTypes = [
        'DatabaseError',
        'PaymentError',
        'TradingError',
        'AuthenticationError',
      ];
      
      return captureTypes.includes(error.name);
    },
  });
};

// Custom error capture
const captureError = (error, context = {}) => {
  Sentry.withScope((scope) => {
    // Add context
    Object.entries(context).forEach(([key, value]) => {
      scope.setExtra(key, value);
    });
    
    // Set level based on error type
    if (error.statusCode >= 500) {
      scope.setLevel('error');
    } else if (error.statusCode >= 400) {
      scope.setLevel('warning');
    }
    
    Sentry.captureException(error);
  });
};

// Capture message
const captureMessage = (message, level = 'info', context = {}) => {
  Sentry.withScope((scope) => {
    Object.entries(context).forEach(([key, value]) => {
      scope.setExtra(key, value);
    });
    scope.setLevel(level);
    Sentry.captureMessage(message);
  });
};

// Set user context
const setUser = (user) => {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.fullName,
  });
};

// Clear user context
const clearUser = () => {
  Sentry.setUser(null);
};

// Performance monitoring - start transaction
const startTransaction = (name, op) => {
  return Sentry.startTransaction({
    name,
    op,
  });
};

// Monitor specific function
const monitorFunction = async (fn, name, context = {}) => {
  const transaction = startTransaction(name, 'function');
  
  try {
    const result = await fn();
    transaction.setStatus('ok');
    return result;
  } catch (error) {
    transaction.setStatus('error');
    captureError(error, context);
    throw error;
  } finally {
    transaction.finish();
  }
};

module.exports = {
  initSentry,
  sentryMiddleware,
  sentryErrorHandler,
  captureError,
  captureMessage,
  setUser,
  clearUser,
  startTransaction,
  monitorFunction,
  Sentry,
};
