import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@hooks/useAuth';
import { useTradingStore, selectPortfolioSummary } from '@stores/tradingStore';
import { useWalletStore, selectTotalBalance } from '@stores/walletStore';
import { Card, CardHeader, CardContent } from '@components/ui/Card';
import { Button } from '@components/ui/Button';
import { Badge } from '@components/ui/Badge';
import { PageLoading } from '@components/feedback/LoadingSpinner';
import { EmptyState } from '@components/feedback/ErrorMessage';
import { 
  formatCurrency, 
  formatPercentage, 
  formatNumber,
  getChangeColorClass 
} from '@utils/formatters';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Building2, 
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Activity,
  Clock
} from 'lucide-react';

// ============================================
// Stat Card Component
// ============================================

interface StatCardProps {
  title: string;
  value: string;
  change?: number;
  changeLabel?: string;
  icon: React.ReactNode;
  iconBg: string;
  href?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  change,
  changeLabel,
  icon,
  iconBg,
  href,
}) => {
  const content = (
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm text-secondary-500 mb-1">{title}</p>
        <p className="text-2xl font-bold text-secondary-900">{value}</p>
        {change !== undefined && (
          <div className="flex items-center gap-1 mt-1">
            {change >= 0 ? (
              <TrendingUp className="w-4 h-4 text-success-500" />
            ) : (
              <TrendingDown className="w-4 h-4 text-danger-500" />
            )}
            <span className={cn('text-sm font-medium', getChangeColorClass(change))}>
              {change >= 0 ? '+' : ''}{change.toFixed(2)}%
            </span>
            {changeLabel && (
              <span className="text-sm text-secondary-400">{changeLabel}</span>
            )}
          </div>
        )}
      </div>
      <div className={cn('p-3 rounded-xl', iconBg)}>
        {icon}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link to={href}>
        <Card className="hover:shadow-elevated transition-shadow cursor-pointer h-full">
          <CardContent className="p-5">{content}</CardContent>
        </Card>
      </Link>
    );
  }

  return (
    <Card className="h-full">
      <CardContent className="p-5">{content}</CardContent>
    </Card>
  );
};

// ============================================
// Recent Activity Component
// ============================================

const RecentActivity: React.FC = () => {
  const activities = [
    { id: 1, type: 'buy', description: 'Bought 50 shares of SuperMart ABC', amount: 575.00, date: '2 hours ago' },
    { id: 2, type: 'dividend', description: 'Received dividend from Factory XYZ', amount: 125.50, date: '1 day ago' },
    { id: 3, type: 'deposit', description: 'Wallet deposit via Wave', amount: 1000.00, date: '3 days ago' },
    { id: 4, type: 'sell', description: 'Sold 25 shares of TechStore Inc', amount: 312.50, date: '5 days ago' },
  ];

  return (
    <Card>
      <CardHeader 
        title="Recent Activity" 
        action={
          <Link to="/transactions" className="text-sm text-primary-600 hover:text-primary-700">
            View All
          </Link>
        }
      />
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center',
                  activity.type === 'buy' && 'bg-success-100 text-success-600',
                  activity.type === 'sell' && 'bg-danger-100 text-danger-600',
                  activity.type === 'dividend' && 'bg-primary-100 text-primary-600',
                  activity.type === 'deposit' && 'bg-warning-100 text-warning-600',
                )}>
                  {activity.type === 'buy' && <ArrowUpRight className="w-5 h-5" />}
                  {activity.type === 'sell' && <ArrowDownRight className="w-5 h-5" />}
                  {activity.type === 'dividend' && <DollarSign className="w-5 h-5" />}
                  {activity.type === 'deposit' && <Wallet className="w-5 h-5" />}
                </div>
                <div>
                  <p className="text-sm font-medium text-secondary-900">{activity.description}</p>
                  <p className="text-xs text-secondary-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {activity.date}
                  </p>
                </div>
              </div>
              <span className={cn(
                'text-sm font-medium',
                activity.type === 'sell' || activity.type === 'dividend' || activity.type === 'deposit'
                  ? 'text-success-600'
                  : 'text-danger-600'
              )}>
                {activity.type === 'buy' ? '-' : '+'}{formatCurrency(activity.amount)}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

// ============================================
// Top Holdings Component
// ============================================

const TopHoldings: React.FC = () => {
  const { holdings, fetchPortfolio } = useTradingStore();

  useEffect(() => {
    fetchPortfolio();
  }, [fetchPortfolio]);

  if (holdings.length === 0) {
    return (
      <Card>
        <CardHeader title="Your Holdings" />
        <CardContent>
          <EmptyState
            icon={<PieChart className="w-8 h-8" />}
            title="No holdings yet"
            description="Start building your portfolio by investing in companies"
            action={
              <Link to="/marketplace">
                <Button>Browse Marketplace</Button>
              </Link>
            }
          />
        </CardContent>
      </Card>
    );
  }

  const topHoldings = holdings.slice(0, 5);

  return (
    <Card>
      <CardHeader 
        title="Your Holdings" 
        action={
          <Link to="/portfolio" className="text-sm text-primary-600 hover:text-primary-700">
            View All
          </Link>
        }
      />
      <CardContent>
        <div className="space-y-3">
          {topHoldings.map((holding) => (
            <div key={holding.id} className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-secondary-900">
                    {holding.company?.businessName || 'Unknown Company'}
                  </p>
                  <p className="text-xs text-secondary-500">
                    {formatNumber(holding.sharesOwned)} shares
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-secondary-900">
                  {formatCurrency(holding.currentValue)}
                </p>
                <p className={cn(
                  'text-xs',
                  getChangeColorClass(holding.profitLossPercent)
                )}>
                  {holding.profitLossPercent && holding.profitLossPercent >= 0 ? '+' : ''}
                  {formatPercentage(holding.profitLossPercent)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

// ============================================
// Dashboard Page Component
// ============================================

const Dashboard: React.FC = () => {
  const { user, isInvestor } = useAuth();
  const { fetchPortfolio, isLoading: portfolioLoading } = useTradingStore();
  const { fetchWallet, isLoading: walletLoading } = useWalletStore();
  const portfolioSummary = useTradingStore(selectPortfolioSummary);
  const totalBalance = useWalletStore(selectTotalBalance);

  useEffect(() => {
    fetchPortfolio();
    fetchWallet();
  }, [fetchPortfolio, fetchWallet]);

  if (portfolioLoading || walletLoading) {
    return <PageLoading />;
  }

  const isInvestorUser = isInvestor();

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">
            Welcome back, {user?.fullName?.split(' ')[0]}!
          </h1>
          <p className="text-secondary-600 mt-1">
            Here's what's happening with your investments today.
          </p>
        </div>
        <div className="flex gap-3">
          {isInvestorUser && (
            <Link to="/marketplace">
              <Button leftIcon={<TrendingUp className="w-4 h-4" />}>
                Explore Market
              </Button>
            </Link>
          )}
          <Link to="/wallet">
            <Button variant="outline" leftIcon={<Wallet className="w-4 h-4" />}>
              Add Funds
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isInvestorUser && (
          <StatCard
            title="Portfolio Value"
            value={formatCurrency(portfolioSummary.totalValue)}
            change={portfolioSummary.totalReturnPercent}
            changeLabel="all time"
            icon={<PieChart className="w-6 h-6 text-primary-600" />}
            iconBg="bg-primary-100"
            href="/portfolio"
          />
        )}
        <StatCard
          title="Wallet Balance"
          value={formatCurrency(totalBalance)}
          icon={<Wallet className="w-6 h-6 text-success-600" />}
          iconBg="bg-success-100"
          href="/wallet"
        />
        {isInvestorUser && (
          <>
            <StatCard
              title="Total Return"
              value={formatCurrency(portfolioSummary.totalReturn)}
              change={portfolioSummary.totalReturnPercent}
              changeLabel="all time"
              icon={<Activity className="w-6 h-6 text-warning-600" />}
              iconBg="bg-warning-100"
              href="/portfolio"
            />
            <StatCard
              title="Dividends Earned"
              value={formatCurrency(portfolioSummary.totalDividends)}
              icon={<DollarSign className="w-6 h-6 text-info-600" />}
              iconBg="bg-blue-100"
              href="/portfolio/dividends"
            />
          </>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          <RecentActivity />
          
          {/* Quick Actions */}
          <Card>
            <CardHeader title="Quick Actions" />
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {isInvestorUser && (
                  <Link to="/marketplace">
                    <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-primary-50 hover:bg-primary-100 transition-colors cursor-pointer">
                      <TrendingUp className="w-6 h-6 text-primary-600" />
                      <span className="text-sm font-medium text-primary-900">Buy Stocks</span>
                    </div>
                  </Link>
                )}
                <Link to="/wallet/deposit">
                  <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-success-50 hover:bg-success-100 transition-colors cursor-pointer">
                    <ArrowUpRight className="w-6 h-6 text-success-600" />
                    <span className="text-sm font-medium text-success-900">Deposit</span>
                  </div>
                </Link>
                <Link to="/wallet/withdraw">
                  <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-warning-50 hover:bg-warning-100 transition-colors cursor-pointer">
                    <ArrowDownRight className="w-6 h-6 text-warning-600" />
                    <span className="text-sm font-medium text-warning-900">Withdraw</span>
                  </div>
                </Link>
                <Link to="/settings">
                  <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-secondary-100 hover:bg-secondary-200 transition-colors cursor-pointer">
                    <Activity className="w-6 h-6 text-secondary-600" />
                    <span className="text-sm font-medium text-secondary-900">Settings</span>
                  </div>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {isInvestorUser && <TopHoldings />}
          
          {/* Market Overview */}
          <Card>
            <CardHeader 
              title="Market Overview" 
              action={
                <Badge variant="success" dot>Live</Badge>
              }
            />
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-secondary-600">Total Companies</span>
                  <span className="text-sm font-medium text-secondary-900">156</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-secondary-600">Trading Volume (24h)</span>
                  <span className="text-sm font-medium text-secondary-900">$2.4M</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-secondary-600">Market Cap</span>
                  <span className="text-sm font-medium text-secondary-900">$48.2M</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-secondary-600">Avg. Dividend Yield</span>
                  <span className="text-sm font-medium text-success-600">8.4%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

// Need to import cn for the component
import { cn } from '@utils/helpers';

export default Dashboard;
