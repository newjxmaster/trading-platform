import React, { useState } from 'react';
import { 
  TrendingUp, 
  Users, 
  Building2, 
  DollarSign,
  Download
} from 'lucide-react';
import { Card, CardHeader, CardContent } from '@components/ui/Card';
import { Button } from '@components/ui/Button';
import { Badge } from '@components/ui/Badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@components/ui/Tabs';
import { formatCurrency, formatNumber } from '../../utils/formatters';

// ============================================
// Analytics Component
// ============================================

export const Analytics: React.FC = () => {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');

  // Mock data - would come from API
  const platformStats = {
    totalUsers: 15420,
    totalCompanies: 342,
    totalTradingVolume: 28475000,
    totalDividendsDistributed: 1250000,
    monthlyGrowth: 12.5,
    activeInvestors: 8750,
    activeCompanies: 298,
  };

  const tradingData = [
    { date: '2025-01-01', volume: 45000, trades: 120 },
    { date: '2025-01-02', volume: 52000, trades: 145 },
    { date: '2025-01-03', volume: 48000, trades: 132 },
    { date: '2025-01-04', volume: 61000, trades: 178 },
    { date: '2025-01-05', volume: 55000, trades: 156 },
    { date: '2025-01-06', volume: 67000, trades: 189 },
    { date: '2025-01-07', volume: 72000, trades: 201 },
  ];

  const userGrowthData = [
    { month: 'Jan', investors: 1200, businesses: 45 },
    { month: 'Feb', investors: 1450, businesses: 52 },
    { month: 'Mar', investors: 1680, businesses: 61 },
    { month: 'Apr', investors: 1920, businesses: 68 },
    { month: 'May', investors: 2150, businesses: 75 },
    { month: 'Jun', investors: 2400, businesses: 82 },
  ];

  const categoryDistribution = [
    { name: 'Retail', value: 85, color: '#3B82F6' },
    { name: 'Manufacturing', value: 62, color: '#10B981' },
    { name: 'Food & Beverage', value: 48, color: '#F59E0B' },
    { name: 'Services', value: 73, color: '#8B5CF6' },
    { name: 'Technology', value: 34, color: '#EC4899' },
    { name: 'Other', value: 40, color: '#6B7280' },
  ];

  const topCompanies = [
    { name: 'SuperMart ABC', volume: 1250000, trades: 3420, growth: 15.2 },
    { name: 'Factory XYZ', volume: 980000, trades: 2890, growth: 8.7 },
    { name: 'Bakery Plus', volume: 750000, trades: 2150, growth: 22.1 },
    { name: 'Tech Solutions', volume: 620000, trades: 1890, growth: -3.5 },
    { name: 'Green Farms', volume: 580000, trades: 1650, growth: 12.8 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">Platform Analytics</h1>
          <p className="text-secondary-500 mt-1">
            Comprehensive insights into platform performance
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as typeof timeRange)}
            className="px-4 py-2.5 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="1y">Last Year</option>
          </select>
          <Button variant="outline" leftIcon={<Download className="w-4 h-4" />}>
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Users"
          value={formatNumber(platformStats.totalUsers)}
          change={+12.5}
          icon={Users}
          color="primary"
        />
        <MetricCard
          title="Companies Listed"
          value={formatNumber(platformStats.totalCompanies)}
          change={+8.3}
          icon={Building2}
          color="success"
        />
        <MetricCard
          title="Trading Volume"
          value={formatCurrency(platformStats.totalTradingVolume)}
          change={+23.7}
          icon={TrendingUp}
          color="warning"
        />
        <MetricCard
          title="Dividends Paid"
          value={formatCurrency(platformStats.totalDividendsDistributed)}
          change={+15.2}
          icon={DollarSign}
          color="secondary"
        />
      </div>

      {/* Main Charts */}
      <Tabs defaultValue="trading">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="trading">Trading Activity</TabsTrigger>
          <TabsTrigger value="users">User Growth</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
        </TabsList>

        <TabsContent value="trading" className="space-y-6">
          <Card>
            <CardHeader title="Trading Volume & Activity" />
            <CardContent>
              <div className="h-80">
                {/* Trading chart would go here */}
                <div className="flex items-end justify-between h-full gap-2">
                  {tradingData.map((d, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-2">
                      <div 
                        className="w-full bg-primary-500 rounded-t-lg transition-all"
                        style={{ height: `${(d.volume / 80000) * 100}%` }}
                      />
                      <span className="text-xs text-secondary-500">{d.date.slice(5)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader title="Top Performing Companies" />
              <CardContent>
                <div className="space-y-4">
                  {topCompanies.map((company, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-secondary-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center text-sm font-medium text-primary-600">
                          {index + 1}
                        </span>
                        <div>
                          <p className="font-medium text-secondary-900">{company.name}</p>
                          <p className="text-xs text-secondary-500">{company.trades.toLocaleString()} trades</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(company.volume)}</p>
                        <p className={`text-xs ${company.growth >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
                          {company.growth >= 0 ? '+' : ''}{company.growth}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader title="Trading Statistics" />
              <CardContent>
                <div className="space-y-4">
                  <StatRow label="Total Trades (30d)" value="45,230" />
                  <StatRow label="Average Daily Volume" value={formatCurrency(58000)} />
                  <StatRow label="Average Trade Size" value={formatCurrency(1250)} />
                  <StatRow label="Active Traders" value="8,750" />
                  <StatRow label="New Traders (30d)" value="1,240" />
                  <StatRow label="Platform Fees (30d)" value={formatCurrency(142500)} />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader title="User Growth Over Time" />
            <CardContent>
              <div className="h-80">
                <div className="flex items-end justify-between h-full gap-4">
                  {userGrowthData.map((d, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-2">
                      <div className="w-full flex gap-1">
                        <div 
                          className="flex-1 bg-primary-500 rounded-t"
                          style={{ height: `${(d.investors / 2500) * 100}%` }}
                        />
                        <div 
                          className="flex-1 bg-success-500 rounded-t"
                          style={{ height: `${(d.businesses / 100) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-secondary-500">{d.month}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-center gap-6 mt-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-primary-500 rounded" />
                    <span className="text-sm text-secondary-600">Investors</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-success-500 rounded" />
                    <span className="text-sm text-secondary-600">Businesses</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader title="User Demographics" />
              <CardContent>
                <div className="space-y-3">
                  <DemographicRow label="Investors" value={8750} total={15420} color="bg-primary-500" />
                  <DemographicRow label="Business Owners" value={342} total={15420} color="bg-success-500" />
                  <DemographicRow label="Admins" value={12} total={15420} color="bg-danger-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader title="KYC Status" />
              <CardContent>
                <div className="space-y-3">
                  <DemographicRow label="Verified" value={12340} total={15420} color="bg-success-500" />
                  <DemographicRow label="Pending" value={2450} total={15420} color="bg-warning-500" />
                  <DemographicRow label="Rejected" value={630} total={15420} color="bg-danger-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader title="Engagement" />
              <CardContent>
                <div className="space-y-4">
                  <div className="p-3 bg-secondary-50 rounded-lg">
                    <p className="text-sm text-secondary-500">Daily Active Users</p>
                    <p className="text-2xl font-bold text-secondary-900">3,420</p>
                    <p className="text-xs text-success-600">+12% vs last week</p>
                  </div>
                  <div className="p-3 bg-secondary-50 rounded-lg">
                    <p className="text-sm text-secondary-500">Avg Session Duration</p>
                    <p className="text-2xl font-bold text-secondary-900">12m 34s</p>
                    <p className="text-xs text-success-600">+5% vs last week</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-6">
          <Card>
            <CardHeader title="Platform Revenue" />
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-primary-50 rounded-lg">
                  <p className="text-sm text-primary-700">Trading Fees</p>
                  <p className="text-2xl font-bold text-primary-900">{formatCurrency(142500)}</p>
                </div>
                <div className="p-4 bg-success-50 rounded-lg">
                  <p className="text-sm text-success-700">Platform Fees (5%)</p>
                  <p className="text-2xl font-bold text-success-900">{formatCurrency(62500)}</p>
                </div>
                <div className="p-4 bg-secondary-50 rounded-lg">
                  <p className="text-sm text-secondary-700">Total Revenue</p>
                  <p className="text-2xl font-bold text-secondary-900">{formatCurrency(205000)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader title="Company Categories" />
              <CardContent>
                <div className="space-y-4">
                  {categoryDistribution.map((cat, index) => (
                    <div key={index}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-secondary-700">{cat.name}</span>
                        <span className="text-sm font-medium">{cat.value} companies</span>
                      </div>
                      <div className="h-2 bg-secondary-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all"
                          style={{ 
                            width: `${(cat.value / 85) * 100}%`,
                            backgroundColor: cat.color 
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader title="Category Performance" />
              <CardContent>
                <div className="space-y-4">
                  <div className="p-3 bg-secondary-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-secondary-700">Retail</span>
                      <Badge variant="success">+18.2%</Badge>
                    </div>
                  </div>
                  <div className="p-3 bg-secondary-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-secondary-700">Manufacturing</span>
                      <Badge variant="success">+12.5%</Badge>
                    </div>
                  </div>
                  <div className="p-3 bg-secondary-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-secondary-700">Food & Beverage</span>
                      <Badge variant="success">+22.1%</Badge>
                    </div>
                  </div>
                  <div className="p-3 bg-secondary-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-secondary-700">Technology</span>
                      <Badge variant="danger">-3.5%</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// ============================================
// Metric Card Component
// ============================================

interface MetricCardProps {
  title: string;
  value: string;
  change: number;
  icon: React.ElementType;
  color: 'primary' | 'success' | 'warning' | 'secondary';
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, change, icon: Icon, color }) => {
  const colorClasses = {
    primary: 'bg-primary-100 text-primary-600',
    success: 'bg-success-100 text-success-600',
    warning: 'bg-warning-100 text-warning-600',
    secondary: 'bg-secondary-100 text-secondary-600',
  };

  const isPositive = change >= 0;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-secondary-500">{title}</p>
            <p className="text-2xl font-bold text-secondary-900 mt-1">{value}</p>
            <div className={`flex items-center gap-1 mt-2 text-sm ${isPositive ? 'text-success-600' : 'text-danger-600'}`}>
              <span>{isPositive ? '+' : ''}{change}%</span>
              <span className="text-secondary-400">vs last period</span>
            </div>
          </div>
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// ============================================
// Stat Row Component
// ============================================

const StatRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex items-center justify-between py-2 border-b border-secondary-100 last:border-0">
    <span className="text-secondary-600">{label}</span>
    <span className="font-medium text-secondary-900">{value}</span>
  </div>
);

// ============================================
// Demographic Row Component
// ============================================

const DemographicRow: React.FC<{ label: string; value: number; total: number; color: string }> = ({ 
  label, value, total, color 
}) => (
  <div>
    <div className="flex items-center justify-between mb-1">
      <span className="text-sm text-secondary-700">{label}</span>
      <span className="text-sm font-medium">{value.toLocaleString()}</span>
    </div>
    <div className="h-2 bg-secondary-100 rounded-full overflow-hidden">
      <div 
        className={`h-full ${color} rounded-full transition-all`}
        style={{ width: `${(value / total) * 100}%` }}
      />
    </div>
  </div>
);

export default Analytics;
