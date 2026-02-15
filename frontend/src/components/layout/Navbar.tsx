import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@utils/helpers';
import { useAuth } from '@hooks/useAuth';
import { Button } from '@components/ui/Button';
import {
  Menu,
  X,
  Home,
  TrendingUp,
  Wallet,
  Building2,
  User,
  LogOut,
  Bell,
  Search,
} from 'lucide-react';

// ============================================
// Navigation Item Interface
// ============================================

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles?: ('investor' | 'business_owner' | 'admin')[];
}

// ============================================
// Navigation Items
// ============================================

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: <Home className="w-5 h-5" />, roles: ['investor', 'business_owner', 'admin'] },
  { label: 'Marketplace', href: '/marketplace', icon: <TrendingUp className="w-5 h-5" />, roles: ['investor', 'admin'] },
  { label: 'Portfolio', href: '/portfolio', icon: <Building2 className="w-5 h-5" />, roles: ['investor', 'admin'] },
  { label: 'Wallet', href: '/wallet', icon: <Wallet className="w-5 h-5" />, roles: ['investor', 'business_owner', 'admin'] },
];

// ============================================
// Navbar Component
// ============================================

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout, isInvestor, isBusinessOwner, isAdmin } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Filter nav items based on user role
  const filteredNavItems = navItems.filter((item) => {
    if (!item.roles) return true;
    if (isInvestor()) return item.roles.includes('investor');
    if (isBusinessOwner()) return item.roles.includes('business_owner');
    if (isAdmin()) return item.roles.includes('admin');
    return false;
  });

  const handleLogout = async () => {
    await logout();
  };

  return (
    <nav className="sticky top-0 z-40 bg-white border-b border-secondary-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-secondary-900 hidden sm:block">
              TradeFlow
            </span>
          </Link>

          {/* Desktop Navigation */}
          {isAuthenticated && (
            <div className="hidden md:flex items-center gap-1">
              {filteredNavItems.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-secondary-600 hover:bg-secondary-50 hover:text-secondary-900'
                    )}
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                );
              })}
            </div>
          )}

          {/* Right Section */}
          <div className="flex items-center gap-2">
            {/* Search - Desktop */}
            {isAuthenticated && (
              <div className="hidden lg:flex items-center">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
                  <input
                    type="text"
                    placeholder="Search companies..."
                    className="pl-9 pr-4 py-2 text-sm bg-secondary-50 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 w-64"
                  />
                </div>
              </div>
            )}

            {/* Notifications */}
            {isAuthenticated && (
              <button className="relative p-2 text-secondary-600 hover:bg-secondary-100 rounded-lg transition-colors">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger-500 rounded-full" />
              </button>
            )}

            {/* User Menu - Desktop */}
            {isAuthenticated ? (
              <div className="hidden md:flex items-center gap-3 ml-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-primary-600" />
                  </div>
                  <div className="hidden lg:block text-left">
                    <p className="text-sm font-medium text-secondary-900">
                      {user?.fullName}
                    </p>
                    <p className="text-xs text-secondary-500 capitalize">
                      {user?.role?.replace('_', ' ')}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  leftIcon={<LogOut className="w-4 h-4" />}
                >
                  <span className="hidden sm:inline">Logout</span>
                </Button>
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <Link to="/login">
                  <Button variant="ghost" size="sm">
                    Sign In
                  </Button>
                </Link>
                <Link to="/register">
                  <Button size="sm">Get Started</Button>
                </Link>
              </div>
            )}

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 text-secondary-600 hover:bg-secondary-100 rounded-lg transition-colors"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-secondary-200 bg-white">
          <div className="px-4 py-3 space-y-1">
            {/* Mobile Search */}
            {isAuthenticated && (
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
                  <input
                    type="text"
                    placeholder="Search companies..."
                    className="w-full pl-9 pr-4 py-2 text-sm bg-secondary-50 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
            )}

            {/* Mobile Nav Items */}
            {isAuthenticated ? (
              <>
                {filteredNavItems.map((item) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-primary-50 text-primary-700'
                          : 'text-secondary-600 hover:bg-secondary-50'
                      )}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      {item.icon}
                      {item.label}
                    </Link>
                  );
                })}
                <div className="border-t border-secondary-200 pt-3 mt-3">
                  <div className="flex items-center gap-3 px-3 py-2">
                    <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-primary-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-secondary-900">
                        {user?.fullName}
                      </p>
                      <p className="text-xs text-secondary-500 capitalize">
                        {user?.role?.replace('_', ' ')}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-sm font-medium text-danger-600 hover:bg-danger-50 rounded-lg transition-colors"
                  >
                    <LogOut className="w-5 h-5" />
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <div className="space-y-2 py-2">
                <Link
                  to="/login"
                  className="flex items-center justify-center w-full px-4 py-2.5 text-sm font-medium text-secondary-700 bg-secondary-100 rounded-lg hover:bg-secondary-200 transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="flex items-center justify-center w-full px-4 py-2.5 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
