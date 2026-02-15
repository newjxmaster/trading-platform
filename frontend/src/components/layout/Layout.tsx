import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { cn } from '@utils/helpers';
import { useIsMobile } from '@hooks/useMediaQuery';
import { Toaster } from 'react-hot-toast';

// ============================================
// Layout Props Interface
// ============================================

interface LayoutProps {
  children?: React.ReactNode;
  showSidebar?: boolean;
}

// ============================================
// Layout Component
// ============================================

export const Layout: React.FC<LayoutProps> = ({ 
  children,
  showSidebar = true 
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen bg-secondary-50">
      {/* Toast Notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 5000,
          style: {
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: '0.5rem',
            padding: '1rem',
          },
          success: {
            iconTheme: {
              primary: '#22c55e',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />

      {/* Navbar */}
      <Navbar />

      {/* Main Content Area */}
      <div className="flex">
        {/* Sidebar - Desktop only when showSidebar is true */}
        {showSidebar && !isMobile && (
          <Sidebar isOpen={true} onClose={() => {}} />
        )}

        {/* Mobile Sidebar */}
        {showSidebar && isMobile && (
          <Sidebar 
            isOpen={isSidebarOpen} 
            onClose={() => setIsSidebarOpen(false)} 
          />
        )}

        {/* Main Content */}
        <main 
          className={cn(
            'flex-1 min-h-[calc(100vh-4rem)]',
            !showSidebar && 'w-full'
          )}
        >
          <div className="p-4 sm:p-6 lg:p-8">
            {children || <Outlet />}
          </div>
        </main>
      </div>
    </div>
  );
};

// ============================================
// Auth Layout (for login/register pages)
// ============================================

export const AuthLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 flex items-center justify-center p-4">
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 5000,
        }}
      />
      {children}
    </div>
  );
};

// ============================================
// Dashboard Layout (with sidebar)
// ============================================

export const DashboardLayout: React.FC = () => {
  return (
    <Layout showSidebar={true}>
      <Outlet />
    </Layout>
  );
};

export default Layout;
