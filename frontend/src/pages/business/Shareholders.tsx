import React, { useEffect, useState } from 'react';
import { 
  Users, 
  PieChart, 
  TrendingUp, 
  User,
  Share2,
  Download,
  Search
} from 'lucide-react';
import { Card, CardHeader, CardContent } from '@components/ui/Card';
import { Button } from '@components/ui/Button';
import { Input } from '@components/ui/Input';
import { Badge } from '@components/ui/Badge';
import { LoadingSpinner } from '@components/feedback/LoadingSpinner';
import { useAuthStore } from '@stores/authStore';
import { companyApi } from '@services/api';
import { Company } from '../../types';
import { formatCurrency, formatNumber } from '../../utils/formatters';

// ============================================
// Shareholders Component
// ============================================

interface ShareholderData {
  userId: string;
  name: string;
  email: string;
  shares: number;
  ownershipPercent: number;
  investmentValue: number;
  joinDate: string;
  avatar?: string;
}

export const Shareholders: React.FC = () => {
  const { user } = useAuthStore();
  
  const [company, setCompany] = useState<Company | null>(null);
  const [shareholders, setShareholders] = useState<ShareholderData[]>([]);
  const [filteredShareholders, setFilteredShareholders] = useState<ShareholderData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // ============================================
  // Fetch Data
  // ============================================

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      const companyRes = await companyApi.getAll({ filter: `owner:${user.id}` });
      if (companyRes.data.success && companyRes.data.data) {
        const companies = companyRes.data.data as Company[];
        if (companies.length > 0) {
          setCompany(companies[0]);
          
          const shareholdersRes = await companyApi.getShareholders(companies[0].id);
          if (shareholdersRes.data.success && shareholdersRes.data.data) {
            const data = shareholdersRes.data.data as ShareholderData[];
            setShareholders(data);
            setFilteredShareholders(data);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching shareholders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================
  // Search Filter
  // ============================================

  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      setFilteredShareholders(
        shareholders.filter(s =>
          s.name.toLowerCase().includes(query) ||
          s.email.toLowerCase().includes(query)
        )
      );
    } else {
      setFilteredShareholders(shareholders);
    }
  }, [searchQuery, shareholders]);

  // ============================================
  // Calculate Stats
  // ============================================

  const totalShareholders = shareholders.length;
  const totalSharesHeld = shareholders.reduce((sum, s) => sum + s.shares, 0);
  const totalInvestment = shareholders.reduce((sum, s) => sum + s.investmentValue, 0);
  const avgInvestment = totalShareholders > 0 ? totalInvestment / totalShareholders : 0;

  // ============================================
  // Export Data
  // ============================================

  const handleExport = () => {
    const csvContent = [
      ['Name', 'Email', 'Shares', 'Ownership %', 'Investment Value', 'Join Date'].join(','),
      ...shareholders.map(s => [
        s.name,
        s.email,
        s.shares,
        s.ownershipPercent.toFixed(2),
        s.investmentValue,
        s.joinDate
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shareholders-${company?.businessName || 'export'}.csv`;
    a.click();
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
  // Render Shareholders
  // ============================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">Shareholders</h1>
          <p className="text-secondary-500 mt-1">
            View and manage your company's investors
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleExport}
            leftIcon={<Download className="w-4 h-4" />}
          >
            Export CSV
          </Button>
          <Button
            leftIcon={<Share2 className="w-4 h-4" />}
          >
            Share Report
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Shareholders"
          value={formatNumber(totalShareholders)}
          icon={Users}
          color="primary"
        />
        <StatCard
          title="Shares Held"
          value={formatNumber(totalSharesHeld)}
          icon={PieChart}
          color="success"
        />
        <StatCard
          title="Total Investment"
          value={formatCurrency(totalInvestment)}
          icon={TrendingUp}
          color="warning"
        />
        <StatCard
          title="Avg Investment"
          value={formatCurrency(avgInvestment)}
          icon={User}
          color="secondary"
        />
      </div>

      {/* Ownership Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Ownership Breakdown" />
          <CardContent>
            <div className="space-y-4">
              {/* Company Retained */}
              {company && (
                <OwnershipBar
                  label="Company Retained"
                  shares={company.totalShares - totalSharesHeld}
                  totalShares={company.totalShares}
                  color="bg-primary-500"
                />
              )}
              {/* Top Shareholders */}
              {shareholders.slice(0, 5).map((shareholder, index) => (
                <OwnershipBar
                  key={shareholder.userId}
                  label={shareholder.name}
                  shares={shareholder.shares}
                  totalShares={company?.totalShares || 1}
                  color={index === 0 ? 'bg-success-500' : index === 1 ? 'bg-warning-500' : 'bg-secondary-400'}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Investment Distribution" />
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-secondary-50 rounded-lg text-center">
                <p className="text-3xl font-bold text-secondary-900">
                  {shareholders.filter(s => s.shares < 100).length}
                </p>
                <p className="text-sm text-secondary-500">Small Investors</p>
                <p className="text-xs text-secondary-400">(&lt; 100 shares)</p>
              </div>
              <div className="p-4 bg-secondary-50 rounded-lg text-center">
                <p className="text-3xl font-bold text-secondary-900">
                  {shareholders.filter(s => s.shares >= 100 && s.shares < 500).length}
                </p>
                <p className="text-sm text-secondary-500">Medium Investors</p>
                <p className="text-xs text-secondary-400">(100-500 shares)</p>
              </div>
              <div className="p-4 bg-secondary-50 rounded-lg text-center">
                <p className="text-3xl font-bold text-secondary-900">
                  {shareholders.filter(s => s.shares >= 500 && s.shares < 1000).length}
                </p>
                <p className="text-sm text-secondary-500">Large Investors</p>
                <p className="text-xs text-secondary-400">(500-1000 shares)</p>
              </div>
              <div className="p-4 bg-secondary-50 rounded-lg text-center">
                <p className="text-3xl font-bold text-secondary-900">
                  {shareholders.filter(s => s.shares >= 1000).length}
                </p>
                <p className="text-sm text-secondary-500">Major Investors</p>
                <p className="text-xs text-secondary-400">(&gt; 1000 shares)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Shareholders List */}
      <Card>
        <CardHeader 
          title="Shareholder List"
          action={
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
              <Input
                placeholder="Search shareholders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
          }
        />
        <CardContent>
          {filteredShareholders.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-secondary-300 mx-auto mb-3" />
              <p className="text-secondary-500">No shareholders found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-secondary-200">
                    <th className="text-left py-3 px-4 text-sm font-medium text-secondary-500">Investor</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-secondary-500">Shares</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-secondary-500">Ownership</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-secondary-500">Investment</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-secondary-500">Join Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredShareholders.map((shareholder, index) => (
                    <tr 
                      key={shareholder.userId}
                      className="border-b border-secondary-100 hover:bg-secondary-50"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                            {shareholder.avatar ? (
                              <img 
                                src={shareholder.avatar} 
                                alt={shareholder.name}
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              <User className="w-5 h-5 text-primary-600" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-secondary-900">{shareholder.name}</p>
                            <p className="text-sm text-secondary-500">{shareholder.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-medium">
                        {formatNumber(shareholder.shares)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Badge variant={index < 3 ? 'success' : 'default'}>
                          {shareholder.ownershipPercent.toFixed(2)}%
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {formatCurrency(shareholder.investmentValue)}
                      </td>
                      <td className="py-3 px-4 text-center text-secondary-500">
                        {new Date(shareholder.joinDate).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// ============================================
// Stat Card Component
// ============================================

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ElementType;
  color: 'primary' | 'success' | 'warning' | 'secondary';
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, color }) => {
  const colorClasses = {
    primary: 'bg-primary-100 text-primary-600',
    success: 'bg-success-100 text-success-600',
    warning: 'bg-warning-100 text-warning-600',
    secondary: 'bg-secondary-100 text-secondary-600',
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm text-secondary-500">{title}</p>
            <p className="text-lg font-bold text-secondary-900">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// ============================================
// Ownership Bar Component
// ============================================

interface OwnershipBarProps {
  label: string;
  shares: number;
  totalShares: number;
  color: string;
}

const OwnershipBar: React.FC<OwnershipBarProps> = ({ label, shares, totalShares, color }) => {
  const percentage = (shares / totalShares) * 100;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-secondary-900">{label}</span>
        <span className="text-sm text-secondary-500">
          {formatNumber(shares)} shares ({percentage.toFixed(1)}%)
        </span>
      </div>
      <div className="h-2 bg-secondary-100 rounded-full overflow-hidden">
        <div 
          className={`h-full ${color} rounded-full transition-all duration-500`}
          style={{ width: `${Math.max(percentage, 0.5)}%` }}
        />
      </div>
    </div>
  );
};

export default Shareholders;
