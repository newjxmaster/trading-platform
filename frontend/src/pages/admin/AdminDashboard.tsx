import React, { useEffect, useState } from 'react';
import { 
  Users, 
  Building2, 
  TrendingUp, 
  DollarSign,
  Activity,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { Card, CardHeader, CardContent } from '@components/ui/Card';
import { Button } from '@components/ui/Button';
import { Badge } from '@components/ui/Badge';
import { LoadingSpinner } from '@components/feedback/LoadingSpinner';
import { adminApi } from '@services/api';
import { AdminStats } from '@types/index';
import { formatCurrency, formatNumber, formatCompactNumber } from '@utils/formatters';

// ============================================
// Admin Dashboard Component
// ============================================

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState<Array<{
    id: string;
    type: string;
    description: string;
    timestamp: string;
    status: string;
  }>>([]);

  // ============================================
  // Fetch Data
  // ============================================

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const response = await adminApi.getStats();
      if (response.data.success && response.data.data) {
        setStats(response.data.data as AdminStats);
      }
      
      // Mock recent activity - would come from API
      setRecentActivity([
        { id: '1', type: 'company', description: 'SuperMart ABC submitted for approval', timestamp: new Date().toISOString(), status: 'pending' },
        { id: '2', type: 'user', description: 'New investor registered: John Doe', timestamp: new Date(Date.now() - 3600000).toISOString(), status: 'completed' },
        { id: '3', type: 'trade', description: 'Trade executed: 100 shares of Factory XYZ', timestamp: new Date(Date.now() - 7200000).toISOString(), status: 'completed' },
        { id: '4', type: 'revenue', description: 'Revenue report verified for Bakery Plus', timestamp: new Date(Date.now() - 10800000).toISOString(), status: 'completed' },
      ]);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
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
  // Render Dashboard
  // ============================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-secondary-900">Admin Dashboard</h1>
        <p className="text-secondary-500 mt-1">
          Platform overview and key metrics
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Users"
          value={formatNumber(stats?.totalUsers || 0)}
          change={+12}
          icon={Users}
          color="primary"
        />
        <StatCard
          title="Companies"
          value={formatNumber(stats?.totalCompanies || 0)}
          change={+5}
          icon={Building2}
          color="success"
        />
        <StatCard
          title="Trading Volume"
          value={formatCompactCurrency(stats?.totalTradingVolume || 0)}
          change={+23}
          icon={TrendingUp}
          color="warning"
        />
        <StatCard
          title="Dividends Paid"
          value={formatCompactCurrency(stats?.totalDividendsDistributed || 0)}
          change={+8}
          icon={DollarSign}
          color="secondary"
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SecondaryStatCard
          title="Pending Verifications"
          value={stats?.pendingVerifications || 0}
          icon={AlertCircle}
          href="/admin/approvals"
        />
        <SecondaryStatCard
          title="Monthly Revenue"
          value={formatCurrency(stats?.monthlyRevenue || 0)}
          icon={DollarSign}
        />
        <SecondaryStatCard
          title="Active Today"
          value="1,234"
          icon={Activity}
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader 
              title="Recent Activity" 
              action={
                <Button variant="ghost" size="sm">View All</Button>
              }
            />
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <ActivityItem key={activity.id} activity={activity} />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="space-y-6">
          <Card>
            <CardHeader title="Quick Actions" />
            <CardContent>
              <div className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  leftIcon={<Building2 className="w-4 h-4" />}
                  href="/admin/approvals"
                >
                  Review Pending Companies
                  {stats?.pendingVerifications ? (
                    <Badge variant="danger" className="ml-auto">
                      {stats.pendingVerifications}
                    </Badge>
                  ) : null}
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  leftIcon={<DollarSign className="w-4 h-4" />}
                  href="/admin/revenue"
                >
                  Verify Revenue Reports
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  leftIcon={<Users className="w-4 h-4" />}
                  href="/admin/users"
                >
                  Manage Users
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  leftIcon={<Activity className="w-4 h-4" />}
                  href="/admin/analytics"
                >
                  View Analytics
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="System Status" />
            <CardContent>
              <div className="space-y-3">
                <StatusItem label="API" status="operational" />
                <StatusItem label="Database" status="operational" />
                <StatusItem label="WebSocket" status="operational" />
                <StatusItem label="Payment Gateway" status="operational" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

// ============================================
// Stat Card Component
// ============================================

interface StatCardProps {
  title: string;
  value: string;
  change: number;
  icon: React.ElementType;
  color: 'primary' | 'success' | 'warning' | 'secondary';
}

const StatCard: React.FC<StatCardProps> = ({ title, value, change, icon: Icon, color }) => {
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
              {isPositive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
              <span>{isPositive ? '+' : ''}{change}%</span>
              <span className="text-secondary-400">vs last month</span>
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
// Secondary Stat Card Component
// ============================================

interface SecondaryStatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  href?: string;
}

const SecondaryStatCard: React.FC<SecondaryStatCardProps> = ({ title, value, icon: Icon, href }) => (
  <Card className={href ? 'cursor-pointer hover:shadow-elevated transition-shadow' : ''}>
    <CardContent className="p-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-secondary-100 rounded-lg flex items-center justify-center">
          <Icon className="w-5 h-5 text-secondary-600" />
        </div>
        <div>
          <p className="text-sm text-secondary-500">{title}</p>
          <p className="text-lg font-bold text-secondary-900">{value}</p>
        </div>
      </div>
    </CardContent>
  </Card>
);

// ============================================
// Activity Item Component
// ============================================

interface ActivityItemProps {
  activity: {
    id: string;
    type: string;
    description: string;
    timestamp: string;
    status: string;
  };
}

const ActivityItem: React.FC<ActivityItemProps> = ({ activity }) => {
  const typeIcons: Record<string, React.ElementType> = {
    company: Building2,
    user: Users,
    trade: TrendingUp,
    revenue: DollarSign,
  };

  const Icon = typeIcons[activity.type] || Activity;

  return (
    <div className="flex items-start gap-4 p-3 hover:bg-secondary-50 rounded-lg transition-colors">
      <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 text-primary-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-secondary-900">{activity.description}</p>
        <p className="text-xs text-secondary-500 mt-1">
          {new Date(activity.timestamp).toLocaleString()}
        </p>
      </div>
      <Badge variant={activity.status === 'completed' ? 'success' : 'warning'}>
        {activity.status}
      </Badge>
    </div>
  );
};

// ============================================
// Status Item Component
// ============================================

const StatusItem: React.FC<{ label: string; status: string }> = ({ label, status }) => (
  <div className="flex items-center justify-between">
    <span className="text-sm text-secondary-600">{label}</span>
    <div className="flex items-center gap-2">
      <span className="w-2 h-2 bg-success-500 rounded-full" />
      <span className="text-sm text-success-600 capitalize">{status}</span>
    </div>
  </div>
);

export default AdminDashboard;
