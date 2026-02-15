import React, { useEffect, useState } from 'react';
import { 
  Search, 
  CheckCircle2,
  XCircle,
  Eye,
  User,
  AlertCircle,
  Mail,
  Phone
} from 'lucide-react';
import { Card, CardContent } from '@components/ui/Card';
import { Button } from '@components/ui/Button';
import { Input } from '@components/ui/Input';
import { Badge } from '@components/ui/Badge';
import { Modal } from '@components/ui/Modal';
import { LoadingSpinner } from '@components/feedback/LoadingSpinner';
import { adminApi } from '@services/api';
import { User as UserType, KycStatus, UserRole } from '../../types';
import { formatDate, formatPhoneNumber } from '../../utils/formatters';

// ============================================
// User Management Component
// ============================================

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<UserType[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | ''>('');
  const [kycFilter, setKycFilter] = useState<KycStatus | ''>('');
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // ============================================
  // Fetch Data
  // ============================================

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const response = await adminApi.getUsers({ page: 1, limit: 100 });
      if (response.data.success && response.data.data) {
        const data = response.data.data as UserType[];
        setUsers(data);
        setFilteredUsers(data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================
  // Filter Logic
  // ============================================

  useEffect(() => {
    let result = [...users];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(u =>
        u.fullName.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query) ||
        u.phone?.toLowerCase().includes(query)
      );
    }

    if (roleFilter) {
      result = result.filter(u => u.role === roleFilter);
    }

    if (kycFilter) {
      result = result.filter(u => u.kycStatus === kycFilter);
    }

    setFilteredUsers(result);
  }, [searchQuery, roleFilter, kycFilter, users]);

  // ============================================
  // KYC Handlers
  // ============================================

  const handleVerifyKyc = async (userId: string) => {
    setIsProcessing(true);
    try {
      // API call to verify KYC
      setUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, kycStatus: 'verified' } : u
      ));
      setSelectedUser(null);
    } catch (error) {
      console.error('Error verifying KYC:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectKyc = async (userId: string) => {
    setIsProcessing(true);
    try {
      // API call to reject KYC
      setUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, kycStatus: 'rejected' } : u
      ));
      setSelectedUser(null);
    } catch (error) {
      console.error('Error rejecting KYC:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // ============================================
  // Render Loading State
  // ============================================

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // ============================================
  // Render User Management
  // ============================================

  const pendingKycCount = users.filter(u => u.kycStatus === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">User Management</h1>
          <p className="text-secondary-500 mt-1">
            Manage users and verify KYC documents
          </p>
        </div>
        {pendingKycCount > 0 && (
          <Badge variant="warning" className="text-base px-4 py-2">
            {pendingKycCount} KYC Pending
          </Badge>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard title="Total Users" value={users.length} color="primary" />
        <StatCard title="Investors" value={users.filter(u => u.role === 'investor').length} color="success" />
        <StatCard title="Business Owners" value={users.filter(u => u.role === 'business_owner').length} color="warning" />
        <StatCard title="Verified KYC" value={users.filter(u => u.kycStatus === 'verified').length} color="secondary" />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" />
          <Input
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as UserRole)}
          className="px-4 py-2.5 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All Roles</option>
          <option value="investor">Investor</option>
          <option value="business_owner">Business Owner</option>
          <option value="admin">Admin</option>
        </select>
        <select
          value={kycFilter}
          onChange={(e) => setKycFilter(e.target.value as KycStatus)}
          className="px-4 py-2.5 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All KYC Status</option>
          <option value="pending">Pending</option>
          <option value="verified">Verified</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-secondary-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-secondary-500">User</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-secondary-500">Role</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-secondary-500">KYC Status</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-secondary-500">Wallet</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-secondary-500">Joined</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-secondary-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b border-secondary-100 hover:bg-secondary-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-primary-600" />
                        </div>
                        <div>
                          <p className="font-medium text-secondary-900">{user.fullName}</p>
                          <p className="text-sm text-secondary-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <RoleBadge role={user.role} />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <KycBadge status={user.kycStatus} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <p className="font-medium">${user.walletFiat.toLocaleString()}</p>
                    </td>
                    <td className="py-3 px-4 text-center text-secondary-500">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedUser(user)}
                        leftIcon={<Eye className="w-4 h-4" />}
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* User Detail Modal */}
      {selectedUser && (
        <Modal
          isOpen={!!selectedUser}
          onClose={() => setSelectedUser(null)}
          title="User Details"
          size="md"
        >
          <div className="space-y-6">
            {/* User Info */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
                <User className="w-8 h-8 text-primary-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-secondary-900">{selectedUser.fullName}</h3>
                <RoleBadge role={selectedUser.role} />
              </div>
            </div>

            {/* Contact Info */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-secondary-50 rounded-lg">
                <Mail className="w-5 h-5 text-secondary-400" />
                <span className="text-secondary-900">{selectedUser.email}</span>
              </div>
              {selectedUser.phone && (
                <div className="flex items-center gap-3 p-3 bg-secondary-50 rounded-lg">
                  <Phone className="w-5 h-5 text-secondary-400" />
                  <span className="text-secondary-900">{formatPhoneNumber(selectedUser.phone)}</span>
                </div>
              )}
            </div>

            {/* Wallet Info */}
            <div className="p-4 bg-secondary-50 rounded-lg">
              <h4 className="font-medium text-secondary-900 mb-3">Wallet Balances</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-secondary-500">Fiat (USD)</p>
                  <p className="text-lg font-bold">${selectedUser.walletFiat.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-secondary-500">USDT</p>
                  <p className="text-lg font-bold">{selectedUser.walletCryptoUsdt.toFixed(2)}</p>
                </div>
              </div>
            </div>

            {/* KYC Section */}
            <div className="p-4 bg-secondary-50 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-secondary-900">KYC Verification</h4>
                <KycBadge status={selectedUser.kycStatus} />
              </div>
              
              {selectedUser.kycStatus === 'pending' && (
                <div className="flex gap-3 mt-4">
                  <Button
                    variant="danger"
                    className="flex-1"
                    onClick={() => handleRejectKyc(selectedUser.id)}
                    isLoading={isProcessing}
                    leftIcon={<XCircle className="w-4 h-4" />}
                  >
                    Reject
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => handleVerifyKyc(selectedUser.id)}
                    isLoading={isProcessing}
                    leftIcon={<CheckCircle2 className="w-4 h-4" />}
                  >
                    Verify
                  </Button>
                </div>
              )}

              {selectedUser.idDocumentUrl && (
                <div className="mt-4">
                  <p className="text-sm text-secondary-500 mb-2">ID Document</p>
                  <a
                    href={selectedUser.idDocumentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-600 hover:underline text-sm"
                  >
                    View Document
                  </a>
                </div>
              )}
            </div>

            {/* Account Info */}
            <div className="flex items-center justify-between text-sm text-secondary-500">
              <span>Joined: {formatDate(selectedUser.createdAt)}</span>
              <span>ID: {selectedUser.id.slice(0, 8)}...</span>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ============================================
// Stat Card Component
// ============================================

const StatCard: React.FC<{ title: string; value: number; color: string }> = ({ title, value }) => {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-sm text-secondary-500">{title}</p>
        <p className="text-2xl font-bold text-secondary-900">{value.toLocaleString()}</p>
      </CardContent>
    </Card>
  );
};

// ============================================
// Role Badge Component
// ============================================

const RoleBadge: React.FC<{ role: UserRole }> = ({ role }) => {
  const roleConfig = {
    investor: { variant: 'primary' as const, label: 'Investor' },
    business_owner: { variant: 'success' as const, label: 'Business Owner' },
    admin: { variant: 'danger' as const, label: 'Admin' },
  };

  const config = roleConfig[role];

  return <Badge variant={config.variant}>{config.label}</Badge>;
};

// ============================================
// KYC Badge Component
// ============================================

const KycBadge: React.FC<{ status: KycStatus }> = ({ status }) => {
  const statusConfig = {
    pending: { variant: 'warning' as const, icon: AlertCircle },
    verified: { variant: 'success' as const, icon: CheckCircle2 },
    rejected: { variant: 'danger' as const, icon: XCircle },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className="gap-1">
      <Icon className="w-3 h-3" />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
};

export default UserManagement;
