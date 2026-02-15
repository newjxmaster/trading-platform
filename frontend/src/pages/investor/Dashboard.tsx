import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  TrendingUp, 
  Wallet, 
  Building2, 
  ArrowRight, 
  Bell,
  PieChart,
  Activity,
  DollarSign
} from 'lucide-react';
import { Card, CardHeader, CardContent, CardFooter } from '@components/ui/Card';
import { Button } from '@components/ui/Button';
import { Badge } from '@components/ui/Badge';
import { LoadingSpinner } from '@components/feedback/LoadingSpinner';
import { PortfolioSummary } from '@components/trading/PortfolioSummary';
import { useAuthStore } from '@stores/authStore';
import { useTradingStore } from '@stores/tradingStore';
import { useWalletStore } from '@stores/walletStore';
import { tradingApi, dividendApi } from '@services/api';
import { formatCurrency, formatPercentage, formatRelativeTime } from '@utils/formatters';
import { StockHolding, DividendPayout, Trade } from '@types/index';

// ============================================
// Investor Dashboard Component
// ============================================

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { portfolio, fetchPortfolio } = useTradingStore();
  const { balance, fetchBalance } = useWalletStore();
  
  const [isLoading, setIsLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState<Trade[]>([]);
  const [upcomingDividends, setUpcomingDividends] = useState<DividendPayout[]>([]);
  const [notifications, setNotifications] = useState(3);

  // ============================================
  // Fetch Dashboard Data
  // ============================================

  useEffect(() => {
    const loadDashboardData = async () => {
      setIsLoading(true);
      try {
        await Promise.all([
          fetchPortfolio(),
          fetchBalance(),
          fetchRecentActivity(),
          fetchUpcomingDividends(),
        ]);
      } catch (error) {
        console.error('Error loading dashboard:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, [fetchPortfolio, fetchBalance]);

  const fetchRecentActivity = async () => {
    try {
      const response = await tradingApi.getTradeHistory({ page: 1, limit: 5 });
      if (response.data.success && response.data.data) {
        setRecentActivity(response.data.data as Trade[]);
      }
    } catch (error) {
      console.error('Error fetching recent activity:', error);
    }
  };

  const fetchUpcomingDividends = async () => {
    try {
      const response = await dividendApi.getUpcoming();
      if (response.data.success && response.data.data) {
        setUpcomingDividends(response.data.data as DividendPayout[]);
      }
    } catch (error) {
      console.error('Error fetching upcoming dividends:', error);
    }
  };

  // ============================================
  // Quick Action Handlers
  // ============================================

  const handleBrowseMarketplace = () => {
    navigate('/investor/marketplace');
  };

  const handleViewPortfolio = () => {
    navigate('/investor/portfolio');
  };

  const handleDeposit = () => {
    navigate('/investor/wallet', { state: { tab: 'deposit' } });
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">
            Welcome back, {user?.fullName?.split(' ')[0] || 'Investor'}!
          </h1>
          <p className="text-secondary-500 mt-1">
            Here's what's happening with your investments today
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="relative"
            onClick={() => setNotifications(0)}
          >
            <Bell className="w-5 h-5" />
            {notifications > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-danger-500 text-white text-xs rounded-full flex items-center justify-center">
                {notifications}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Portfolio Summary */}
      <PortfolioSummary />

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-primary-500 to-primary-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Building2 className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <p className="text-primary-100 text-sm">Browse Companies</p>
                <p className="text-white font-semibold">Find New Investments</p>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="mt-4 w-full bg-white text-primary-600 hover:bg-primary-50"
              onClick={handleBrowseMarketplace}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Explore Marketplace
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-success-500 to-success-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <PieChart className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <p className="text-success-100 text-sm">Your Portfolio</p>
                <p className="text-white font-semibold">Track Performance</p>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="mt-4 w-full bg-white text-success-600 hover:bg-success-50"
              onClick={handleViewPortfolio}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              View Portfolio
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-secondary-700 to-secondary-800 text-white">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Wallet className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <p className="text-secondary-300 text-sm">Wallet Balance</p>
                <p className="text-white font-semibold">{formatCurrency(balance.fiat)}</p>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="mt-4 w-full bg-white text-secondary-800 hover:bg-secondary-100"
              onClick={handleDeposit}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Add Funds
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Holdings */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader
              title="Your Holdings"
              subtitle={`${portfolio.holdings.length} companies in your portfolio`}
              action={
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleViewPortfolio}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  View All
                </Button>
              }
            />
            <CardContent>
              {portfolio.holdings.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-secondary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <PieChart className="w-8 h-8 text-secondary-400" />
                  </div>
                  <h3 className="text-lg font-medium text-secondary-900 mb-2">
                    No Holdings Yet
                  </h3>
                  <p className="text-secondary-500 mb-4">
                    Start building your portfolio by investing in companies
                  </p>
                  <Button onClick={handleBrowseMarketplace}>
                    Browse Marketplace
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {portfolio.holdings.slice(0, 4).map((holding) => (
                    <HoldingItem key={holding.id} holding={holding} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Upcoming Dividends */}
          <Card>
            <CardHeader
              title="Upcoming Dividends"
              subtitle="Expected payments this month"
            />
            <CardContent>
              {upcomingDividends.length === 0 ? (
                <div className="text-center py-6">
                  <DollarSign className="w-10 h-10 text-secondary-300 mx-auto mb-2" />
                  <p className="text-sm text-secondary-500">
                    No upcoming dividends
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingDividends.slice(0, 3).map((dividend) => (
                    <div
                      key={dividend.id}
                      className="flex items-center justify-between p-3 bg-secondary-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-secondary-900">
                          {dividend.company?.businessName}
                        </p>
                        <p className="text-xs text-secondary-500">
                          {formatRelativeTime(dividend.dividend?.distributionDate)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-success-600">
                          +{formatCurrency(dividend.payoutAmount)}
                        </p>
                        <p className="text-xs text-secondary-500">
                          {dividend.sharesHeld} shares
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader
              title="Recent Activity"
              subtitle="Your latest transactions"
            />
            <CardContent>
              {recentActivity.length === 0 ? (
                <div className="text-center py-6">
                  <Activity className="w-10 h-10 text-secondary-300 mx-auto mb-2" />
                  <p className="text-sm text-secondary-500">
                    No recent activity
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentActivity.slice(0, 4).map((trade) => (
                    <div
                      key={trade.id}
                      className="flex items-center justify-between py-2 border-b border-secondary-100 last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          trade.buyerId === user?.id 
                            ? 'bg-success-100 text-success-600' 
                            : 'bg-danger-100 text-danger-600'
                        }`}>
                          {trade.buyerId === user?.id ? (
                            <TrendingUp className="w-4 h-4" />
                          ) : (
                            <TrendingUp className="w-4 h-4 rotate-180" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-secondary-900">
                            {trade.buyerId === user?.id ? 'Bought' : 'Sold'} {trade.quantity} shares
                          </p>
                          <p className="text-xs text-secondary-500">
                            {trade.company?.businessName}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-secondary-900">
                          {formatCurrency(trade.totalAmount)}
                        </p>
                        <p className="text-xs text-secondary-500">
                          {formatRelativeTime(trade.executedAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

// ============================================
// Holding Item Component
// ============================================

interface HoldingItemProps {
  holding: StockHolding;
}

const HoldingItem: React.FC<HoldingItemProps> = ({ holding }) => {
  const isProfitable = (holding.profitLoss || 0) >= 0;

  return (
    <div className="flex items-center justify-between p-4 bg-secondary-50 rounded-lg hover:bg-secondary-100 transition-colors">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
          <Building2 className="w-5 h-5 text-primary-600" />
        </div>
        <div>
          <p className="font-medium text-secondary-900">
            {holding.company?.businessName}
          </p>
          <p className="text-sm text-secondary-500">
            {holding.sharesOwned} shares @ {formatCurrency(holding.averageBuyPrice)}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className="font-semibold text-secondary-900">
          {formatCurrency(holding.currentValue || 0)}
        </p>
        <p className={`text-sm ${isProfitable ? 'text-success-600' : 'text-danger-600'}`}>
          {isProfitable ? '+' : ''}
          {formatCurrency(holding.profitLoss || 0)} ({formatPercentage(holding.profitLossPercent || 0)})
        </p>
      </div>
    </div>
  );
};

export default Dashboard;
