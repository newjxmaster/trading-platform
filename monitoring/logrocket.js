// Trading Platform - LogRocket Configuration
// Session replay and user analytics

const LogRocket = require('logrocket');
const setupLogRocketReact = require('logrocket-react');

// Configuration
const LOGROCKET_APP_ID = process.env.LOGROCKET_ID;
const ENVIRONMENT = process.env.NODE_ENV || 'development';

// Initialize LogRocket (Frontend)
const initLogRocket = () => {
  if (!LOGROCKET_APP_ID) {
    console.warn('LogRocket ID not configured');
    return;
  }
  
  if (typeof window === 'undefined') {
    // Server-side, don't initialize
    return;
  }
  
  LogRocket.init(LOGROCKET_APP_ID, {
    release: process.env.REACT_APP_VERSION || 'unknown',
    console: {
      isEnabled: {
        log: ENVIRONMENT !== 'production',
        debug: ENVIRONMENT !== 'production',
        info: true,
        warn: true,
        error: true,
      },
    },
    network: {
      requestSanitizer: (request) => {
        // Sanitize sensitive headers
        if (request.headers) {
          delete request.headers['authorization'];
          delete request.headers['cookie'];
          delete request.headers['x-api-key'];
        }
        
        // Sanitize request body
        if (request.body) {
          try {
            const body = JSON.parse(request.body);
            delete body.password;
            delete body.token;
            delete body.creditCard;
            delete body.ssn;
            request.body = JSON.stringify(body);
          } catch (e) {
            // Not JSON, leave as is
          }
        }
        
        return request;
      },
      responseSanitizer: (response) => {
        // Sanitize sensitive response data
        if (response.body) {
          try {
            const body = JSON.parse(response.body);
            delete body.token;
            delete body.password;
            if (body.user) {
              delete body.user.password;
              delete body.user.ssn;
            }
            response.body = JSON.stringify(body);
          } catch (e) {
            // Not JSON, leave as is
          }
        }
        
        return response;
      },
    },
    dom: {
      // Sanitize sensitive input fields
      inputSanitizer: true,
      // Hide sensitive elements
      privateAttributeBlocklist: [
        'password',
        'credit-card',
        'ssn',
        'token',
        'secret',
      ],
    },
    browser: {
      urlSanitizer: (url) => {
        // Remove sensitive query parameters
        const sanitized = new URL(url);
        ['token', 'password', 'secret', 'api_key'].forEach(param => {
          sanitized.searchParams.delete(param);
        });
        return sanitized.toString();
      },
    },
  });
  
  // Setup React integration
  setupLogRocketReact(LogRocket);
  
  console.log('LogRocket initialized');
};

// Identify user
const identifyUser = (user) => {
  if (!LOGROCKET_APP_ID || typeof window === 'undefined') {
    return;
  }
  
  LogRocket.identify(user.id, {
    name: user.fullName,
    email: user.email,
    role: user.role,
    
    // Custom traits
    kycStatus: user.kycStatus,
    walletBalance: user.walletFiat,
    signupDate: user.createdAt,
  });
};

// Track custom events
const trackEvent = (eventName, properties = {}) => {
  if (!LOGROCKET_APP_ID || typeof window === 'undefined') {
    return;
  }
  
  LogRocket.track(eventName, properties);
};

// Track page views
const trackPageView = (pageName, properties = {}) => {
  trackEvent('Page View', {
    page: pageName,
    ...properties,
  });
};

// Track trading events
const trackTradingEvent = (eventType, data) => {
  trackEvent(`Trading: ${eventType}`, {
    companyId: data.companyId,
    companyName: data.companyName,
    shares: data.shares,
    price: data.price,
    total: data.total,
    orderType: data.orderType,
  });
};

// Track payment events
const trackPaymentEvent = (eventType, data) => {
  trackEvent(`Payment: ${eventType}`, {
    amount: data.amount,
    currency: data.currency,
    method: data.method,
    status: data.status,
  });
};

// Track errors
const trackError = (error, context = {}) => {
  if (!LOGROCKET_APP_ID || typeof window === 'undefined') {
    return;
  }
  
  LogRocket.captureException(error, {
    extra: context,
  });
};

// Create session URL for support
const getSessionURL = () => {
  if (!LOGROCKET_APP_ID || typeof window === 'undefined') {
    return null;
  }
  
  return LogRocket.sessionURL;
};

// Redux middleware for LogRocket
const logRocketMiddleware = () => {
  return (store) => (next) => (action) => {
    // Log actions (excluding sensitive ones)
    const sensitiveActions = [
      'auth/login',
      'auth/register',
      'auth/setCredentials',
      'payment/process',
    ];
    
    if (!sensitiveActions.includes(action.type)) {
      trackEvent('Redux Action', {
        type: action.type,
        // Don't log payload for security
      });
    }
    
    return next(action);
  };
};

// React error boundary integration
class LogRocketErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }
  
  componentDidCatch(error, errorInfo) {
    trackError(error, {
      componentStack: errorInfo.componentStack,
    });
  }
  
  render() {
    if (this.state.hasError) {
      return this.props.fallback || <div>Something went wrong.</div>;
    }
    
    return this.props.children;
  }
}

module.exports = {
  initLogRocket,
  identifyUser,
  trackEvent,
  trackPageView,
  trackTradingEvent,
  trackPaymentEvent,
  trackError,
  getSessionURL,
  logRocketMiddleware,
  LogRocketErrorBoundary,
  LogRocket,
};
