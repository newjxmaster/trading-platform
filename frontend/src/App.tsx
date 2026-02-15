import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuth } from '@hooks/useAuth';
import { Layout, AuthLayout, DashboardLayout } from '@components/layout';
import { PageLoading } from '@components/feedback/LoadingSpinner';
import { NotFound } from '@components/feedback/ErrorMessage';

// ============================================
// Lazy Load Pages
// ============================================

const Login = lazy(() => import('@pages/Login'));
const Register = lazy(() => import('@pages/Register'));
const Dashboard = lazy(() => import('@pages/Dashboard'));
const Marketplace = lazy(() => import('@pages/Marketplace'));
const Portfolio = lazy(() => import('@pages/Portfolio'));

// ============================================
// React Query Client
// ============================================

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

// ============================================
// Protected Route Component
// ============================================

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('investor' | 'business_owner' | 'admin')[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  allowedRoles 
}) => {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) {
    return <PageLoading />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

// ============================================
// Public Route Component (redirect if authenticated)
// ============================================

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <PageLoading />;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

// ============================================
// App Routes Component
// ============================================

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <AuthLayout>
              <Suspense fallback={<PageLoading />}>
                <Login />
              </Suspense>
            </AuthLayout>
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <AuthLayout>
              <Suspense fallback={<PageLoading />}>
                <Register />
              </Suspense>
            </AuthLayout>
          </PublicRoute>
        }
      />

      {/* Protected Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route
          path="dashboard"
          element={
            <Suspense fallback={<PageLoading />}>
              <Dashboard />
            </Suspense>
          }
        />
        <Route
          path="marketplace"
          element={
            <ProtectedRoute allowedRoles={['investor', 'admin']}>
              <Suspense fallback={<PageLoading />}>
                <Marketplace />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="portfolio"
          element={
            <ProtectedRoute allowedRoles={['investor', 'admin']}>
              <Suspense fallback={<PageLoading />}>
                <Portfolio />
              </Suspense>
            </ProtectedRoute>
          }
        />
        
        {/* Placeholder routes for future implementation */}
        <Route
          path="wallet"
          element={
            <Suspense fallback={<PageLoading />}>
              <div className="p-8 text-center">
                <h1 className="text-2xl font-bold text-secondary-900 mb-4">Wallet</h1>
                <p className="text-secondary-600">Coming soon...</p>
              </div>
            </Suspense>
          }
        />
        <Route
          path="company"
          element={
            <ProtectedRoute allowedRoles={['business_owner', 'admin']}>
              <Suspense fallback={<PageLoading />}>
                <div className="p-8 text-center">
                  <h1 className="text-2xl font-bold text-secondary-900 mb-4">My Company</h1>
                  <p className="text-secondary-600">Coming soon...</p>
                </div>
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="settings"
          element={
            <Suspense fallback={<PageLoading />}>
              <div className="p-8 text-center">
                <h1 className="text-2xl font-bold text-secondary-900 mb-4">Settings</h1>
                <p className="text-secondary-600">Coming soon...</p>
              </div>
            </Suspense>
          }
        />
        <Route
          path="help"
          element={
            <Suspense fallback={<PageLoading />}>
              <div className="p-8 text-center">
                <h1 className="text-2xl font-bold text-secondary-900 mb-4">Help & Support</h1>
                <p className="text-secondary-600">Coming soon...</p>
              </div>
            </Suspense>
          }
        />
      </Route>

      {/* Admin Routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route
          index
          element={
            <Suspense fallback={<PageLoading />}>
              <div className="p-8 text-center">
                <h1 className="text-2xl font-bold text-secondary-900 mb-4">Admin Dashboard</h1>
                <p className="text-secondary-600">Coming soon...</p>
              </div>
            </Suspense>
          }
        />
        <Route
          path="companies"
          element={
            <Suspense fallback={<PageLoading />}>
              <div className="p-8 text-center">
                <h1 className="text-2xl font-bold text-secondary-900 mb-4">Company Approvals</h1>
                <p className="text-secondary-600">Coming soon...</p>
              </div>
            </Suspense>
          }
        />
        <Route
          path="users"
          element={
            <Suspense fallback={<PageLoading />}>
              <div className="p-8 text-center">
                <h1 className="text-2xl font-bold text-secondary-900 mb-4">User Management</h1>
                <p className="text-secondary-600">Coming soon...</p>
              </div>
            </Suspense>
          }
        />
        <Route
          path="revenue"
          element={
            <Suspense fallback={<PageLoading />}>
              <div className="p-8 text-center">
                <h1 className="text-2xl font-bold text-secondary-900 mb-4">Revenue Reports</h1>
                <p className="text-secondary-600">Coming soon...</p>
              </div>
            </Suspense>
          }
        />
      </Route>

      {/* 404 Route */}
      <Route
        path="*"
        element={
          <Layout>
            <NotFound onBack={() => window.history.back()} />
          </Layout>
        }
      />
    </Routes>
  );
};

// ============================================
// Main App Component
// ============================================

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
