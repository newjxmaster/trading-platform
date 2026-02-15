import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@utils/helpers';
import { useAuth } from '@hooks/useAuth';
import {
  Home,
  TrendingUp,
  Wallet,
  Building2,
  PieChart,
  Settings,
  HelpCircle,
  FileText,
  Users,
  BarChart3,
  Shield,
} from 'lucide-react';

// ============================================
// Sidebar Item Interface
// ============================================

interface SidebarItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles?: ('investor' | 'business_owner' | 'admin')[];
}

// ============================================
// Sidebar Sections
// ============================================

const mainItems: SidebarItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: <Home className="w-5 h-5" />, roles: ['investor', 'business_owner', 'admin'] },
  { label: 'Marketplace', href: '/marketplace', icon: <TrendingUp className="w-5 h-5" />, roles: ['investor', 'admin'] },
  { label: 'Portfolio', href: '/portfolio', icon: <PieChart className="w-5 h-5" />, roles: ['investor', 'admin'] },
  { label: 'My Company', href: '/company', icon: <Building2 className="w-5 h-5" />, roles: ['business_owner'] },
  { label: 'Wallet', href: '/wallet', icon: <Wallet className="w-5 h-5" />, roles: ['investor', 'business_owner', 'admin'] },
];

const adminItems: SidebarItem[] = [
  { label: 'Overview', href: '/admin', icon: <BarChart3 className="w-5 h-5" />, roles: ['admin'] },
  { label: 'Companies', href: '/admin/companies', icon: <Building2 className="w-5 h-5" />, roles: ['admin'] },
  { label: 'Users', href: '/admin/users', icon: <Users className="w-5 h-5" />, roles: ['admin'] },
  { label: 'Revenue Reports', href: '/admin/revenue', icon: <FileText className="w-5 h-5" />, roles: ['admin'] },
  { label: 'Settings', href: '/admin/settings', icon: <Shield className="w-5 h-5" />, roles: ['admin'] },
];

const supportItems: SidebarItem[] = [
  { label: 'Settings', href: '/settings', icon: <Settings className="w-5 h-5" />, roles: ['investor', 'business_owner', 'admin'] },
  { label: 'Help & Support', href: '/help', icon: <HelpCircle className="w-5 h-5" />, roles: ['investor', 'business_owner', 'admin'] },
];

// ============================================
// Sidebar Props Interface
// ============================================

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

// ============================================
// Sidebar Component
// ============================================

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const location = useLocation();
  const { isInvestor, isBusinessOwner, isAdmin } = useAuth();

  // Filter items based on user role
  const filterItems = (items: SidebarItem[]) => {
    return items.filter((item) => {
      if (!item.roles) return true;
      if (isInvestor()) return item.roles.includes('investor');
      if (isBusinessOwner()) return item.roles.includes('business_owner');
      if (isAdmin()) return item.roles.includes('admin');
      return false;
    });
  };

  const filteredMainItems = filterItems(mainItems);
  const filteredAdminItems = filterItems(adminItems);
  const filteredSupportItems = filterItems(supportItems);

  const renderNavItem = (item: SidebarItem) => {
    const isActive = location.pathname === item.href || location.pathname.startsWith(`${item.href}/`);

    return (
      <Link
        key={item.href}
        to={item.href}
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
          isActive
            ? 'bg-primary-600 text-white shadow-sm'
            : 'text-secondary-600 hover:bg-secondary-100 hover:text-secondary-900'
        )}
        onClick={() => onClose()}
      >
        <span className={cn('flex-shrink-0', isActive ? 'text-white' : 'text-secondary-400')}>
          {item.icon}
        </span>
        {item.label}
      </Link>
    );
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed lg:sticky top-0 left-0 z-50 h-screen w-64 bg-white border-r border-secondary-200 transition-transform duration-300 ease-in-out lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-2 px-4 py-4 border-b border-secondary-200">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-secondary-900">TradeFlow</span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
            {/* Main Navigation */}
            <div className="space-y-1">
              <p className="px-3 text-xs font-semibold text-secondary-400 uppercase tracking-wider mb-2">
                Main
              </p>
              {filteredMainItems.map(renderNavItem)}
            </div>

            {/* Admin Navigation */}
            {filteredAdminItems.length > 0 && (
              <div className="space-y-1">
                <p className="px-3 text-xs font-semibold text-secondary-400 uppercase tracking-wider mb-2">
                  Admin
                </p>
                {filteredAdminItems.map(renderNavItem)}
              </div>
            )}

            {/* Support Navigation */}
            <div className="space-y-1">
              <p className="px-3 text-xs font-semibold text-secondary-400 uppercase tracking-wider mb-2">
                Support
              </p>
              {filteredSupportItems.map(renderNavItem)}
            </div>
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-secondary-200">
            <div className="bg-primary-50 rounded-lg p-3">
              <p className="text-xs font-medium text-primary-900 mb-1">
                Need help?
              </p>
              <p className="text-xs text-primary-700 mb-2">
                Contact our support team
              </p>
              <Link
                to="/help"
                className="text-xs font-medium text-primary-600 hover:text-primary-700"
              >
                Get Support →
              </Link>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
