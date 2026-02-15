import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTradingStore, selectPortfolioSummary } from '@stores/tradingStore';
import { Card, CardHeader, CardContent } from '@components/ui/Card';
import { Button } from '@components/ui/Button';
import { TableSkeleton } from '../components/feedback/LoadingSpinner';
import { ErrorMessage, EmptyState } from '@components/feedback/ErrorMessage';
import { 
  formatCurrency, 
  formatPercentage, 
  formatNumber
} from '../utils/formatters';
import { cn } from '@utils/helpers';
import { 
  PieChart,
  DollarSign,
  Building2,
  ArrowUpRight,
  
  Calendar,
  Wallet,
  Activity
} from 'lucide-react';

// ============================================
// Portfolio Stat Card Component
// ============================================

interface StatCardProps {
  title: string;
  value: string;
  subValue?: string;
  icon: React.ReactNode;
  iconBg: string;
  trend?: 'up' | 'down' | 'neutral';
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subValue,
  icon,
  iconBg,
  trend = 'neutral',
}) => {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-secondary-500 mb-1">{title}</p>
            <p className="text-2xl font-bold text-secondary-900">{value}</p>
            {subValue && (
              <p className={cn(
                'text-sm mt-1',
                trend === 'up' && 'text-success-600',
                trend === 'down' && 'text-danger-600',
                trend === 'neutral' && 'text-secondary-500'
              )}>
                {subValue}
              </p>
            )}
          </div>
          <div className={cn('p-3 rounded-xl', iconBg)}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// ============================================
// Holdings Table Component
// ============================================

const HoldingsTable: React.FC = () => {
  const { portfolio } = useTradingStore();
  const holdings = portfolio.holdings;

  if (holdings.length === 0) {
    return (
      <EmptyState
        icon={<PieChart className="w-8 h-8" />}
        title="No holdings yet"
        description="Start building your portfolio by investing in companies on the marketplace"
        action={
          <Link to="/marketplace">
            <Button>Browse Marketplace</Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-secondary-200">
            <th className="text-left py-3 px-4 text-sm font-medium text-secondary-500">Company</th>
            <th className="text-right py-3 px-4 text-sm font-medium text-secondary-500">Shares</th>
            <th className="text-right py-3 px-4 text-sm font-medium text-secondary-500">Avg Price</th>
            <th className="text-right py-3 px-4 text-sm font-medium text-secondary-500">Current</th>
            <th className="text-right py-3 px-4 text-sm font-medium text-secondary-500">Value</th>
            <th className="text-right py-3 px-4 text-sm font-medium text-secondary-500">P/L</th>
            <th className="text-center py-3 px-4 text-sm font-medium text-secondary-500">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-secondary-100">
          {holdings.map((holding: { id: string; companyId: string; sharesOwned: number; averageBuyPrice: number; currentValue?: number; profitLoss?: number; profitLossPercent?: number; company?: { businessName?: string; category?: string; currentPrice?: number } }) => {
            const profitLoss = holding.profitLoss || 0;
            const profitLossPercent = holding.profitLossPercent || 0;
            const isProfitable = profitLoss >= 0;

            return (
              <tr key={holding.id} className="hover:bg-secondary-50 transition-colors">
                <td className="py-4 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-5 h-5 text-primary-600" />
                    </div>
                    <div>
                      <p className="font-medium text-secondary-900">
                        {holding.company?.businessName || 'Unknown Company'}
                      </p>
                      <p className="text-xs text-secondary-500 capitalize">
                        {holding.company?.category}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4 text-right">
                  <span className="font-medium text-secondary-900">
                    {formatNumber(holding.sharesOwned)}
                  </span>
                </td>
                <td className="py-4 px-4 text-right">
                  <span className="text-secondary-600">
                    {formatCurrency(holding.averageBuyPrice)}
                  </span>
                </td>
                <td className="py-4 px-4 text-right">
                  <span className="text-secondary-900">
                    {formatCurrency(holding.company?.currentPrice || 0)}
                  </span>
                </td>
                <td className="py-4 px-4 text-right">
                  <span className="font-medium text-secondary-900">
                    {formatCurrency(holding.currentValue || 0)}
                  </span>
                </td>
                <td className="py-4 px-4 text-right">
                  <div className={cn(
                    'flex flex-col items-end',
                    isProfitable ? 'text-success-600' : 'text-danger-600'
                  )}>
                    <span className="font-medium">
                      {isProfitable ? '+' : ''}{formatCurrency(profitLoss)}
                    </span>
                    <span className="text-xs">
                      {isProfitable ? '+' : ''}{profitLossPercent.toFixed(2)}%
                    </span>
                  </div>
                </td>
                <td className="py-4 px-4 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Link to={`/companies/${holding.companyId}`}>
                      <Button variant="outline" size="sm">
                        View
                      </Button>
                    </Link>
                    <Button size="sm" variant="danger">
                      Sell
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

// ============================================
// Dividend Calendar Component
// ============================================

const DividendCalendar: React.FC = () => {
  const upcomingDividends = [
    { id: 1, company: 'SuperMart ABC', date: '2025-03-15', expectedAmount: 96.00, shares: 100 },
    { id: 2, company: 'Factory XYZ', date: '2025-03-20', expectedAmount: 160.00, shares: 250 },
    { id: 3, company: 'TechStore Inc', date: '2025-04-01', expectedAmount: 45.00, shares: 50 },
  ];

  return (
    <Card>
      <CardHeader 
        title="Upcoming Dividends" 
        action={
          <Link to="/portfolio/dividends" className="text-sm text-primary-600 hover:text-primary-700">
            View All
          </Link>
        }
      />
      <CardContent>
        <div className="space-y-4">
          {upcomingDividends.map((dividend) => (
            <div key={dividend.id} className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-success-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-success-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-secondary-900">{dividend.company}</p>
                  <p className="text-xs text-secondary-500">
                    {dividend.shares} shares • {new Date(dividend.date).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <span className="text-sm font-medium text-success-600">
                +{formatCurrency(dividend.expectedAmount)}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

// ============================================
// Portfolio Page Component
// ============================================

const Portfolio: React.FC = () => {
  const { portfolio, fetchPortfolio, isLoading, error } = useTradingStore();
  const holdings = portfolio.holdings;
  const portfolioSummary = useTradingStore(selectPortfolioSummary);

  useEffect(() => {
    fetchPortfolio();
  }, [fetchPortfolio]);

  if (isLoading && holdings.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-secondary-900">My Portfolio</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="p-5"><div className="h-20 bg-secondary-100 animate-pulse rounded" /></CardContent></Card>
          ))}
        </div>
        <TableSkeleton rows={5} columns={7} />
      </div>
    );
  }

  if (error) {
    return (
      <ErrorMessage
        title="Failed to load portfolio"
        message={error}
        onRetry={fetchPortfolio}
        variant="page"
      />
    );
  }

  const totalReturnTrend = portfolioSummary.totalProfitLoss >= 0 ? 'up' : 'down';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">My Portfolio</h1>
          <p className="text-secondary-600 mt-1">
            Track your investments and earnings
          </p>
        </div>
        <div className="flex gap-3">
          <Link to="/marketplace">
            <Button leftIcon={<ArrowUpRight className="w-4 h-4" />}>
              Buy More
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Value"
          value={formatCurrency(portfolioSummary.totalValue)}
          subValue={`${holdings.length} holdings`}
          icon={<Wallet className="w-6 h-6 text-primary-600" />}
          iconBg="bg-primary-100"
        />
        <StatCard
          title="Total Invested"
          value={formatCurrency(portfolioSummary.totalInvestment)}
          icon={<DollarSign className="w-6 h-6 text-secondary-600" />}
          iconBg="bg-secondary-100"
        />
        <StatCard
          title="Total Return"
          value={formatCurrency(portfolioSummary.totalProfitLoss)}
          subValue={formatPercentage(portfolioSummary.profitLossPercent)}
          icon={totalReturnTrend === 'up' ? <Activity className="w-6 h-6 text-success-600" /> : <Activity className="w-6 h-6 text-danger-600" />}
          iconBg={totalReturnTrend === 'up' ? 'bg-success-100' : 'bg-danger-100'}
          trend={totalReturnTrend}
        />
        <StatCard
          title="Dividends Earned"
          value={formatCurrency(portfolioSummary.totalDividendsEarned)}
          icon={<Activity className="w-6 h-6 text-warning-600" />}
          iconBg="bg-warning-100"
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Holdings Table */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader 
              title="Your Holdings" 
              action={
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    Export
                  </Button>
                </div>
              }
            />
            <CardContent>
              <HoldingsTable />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <DividendCalendar />
          
          {/* Performance Chart Placeholder */}
          <Card>
            <CardHeader title="Performance" />
            <CardContent>
              <div className="h-48 bg-secondary-50 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <Activity className="w-10 h-10 text-secondary-300 mx-auto mb-2" />
                  <p className="text-sm text-secondary-500">Performance chart coming soon</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Portfolio;
