import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  PieChart, 
  TrendingUp, 
  TrendingDown, 
  ArrowRight, 
  Calendar,
  DollarSign,
  Building2,
  ShoppingCart,
  History,
  Wallet
} from 'lucide-react';
import { Card, CardHeader, CardContent } from '@components/ui/Card';
import { Button } from '@components/ui/Button';
import { Badge } from '@components/ui/Badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@components/ui/Tabs';
import { LoadingSpinner } from '@components/feedback/LoadingSpinner';
import { PortfolioSummary } from '@components/trading/PortfolioSummary';
import { PortfolioChart } from '@components/charts/PortfolioChart';
import { DividendCalendar } from '@components/trading/DividendCalendar';
import { TransactionList } from '@components/trading/TransactionList';
import { useTradingStore } from '@stores/tradingStore';
import { tradingApi, dividendApi } from '@services/api';
import { StockHolding, Trade, DividendPayout } from '@types/index';
import { formatCurrency, formatPercentage, formatNumber, getChangeColorClass } from '@utils/formatters';

// ============================================
// Portfolio Component
// ============================================

export const Portfolio: React.FC = () => {
  const navigate = useNavigate();
  const { portfolio, fetchPortfolio } = useTradingStore();
  
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('holdings');
  const [tradeHistory, setTradeHistory] = useState<Trade[]>([]);
  const [dividendHistory, setDividendHistory] = useState<DividendPayout[]>([]);

  // ============================================
  // Fetch Portfolio Data
  // ============================================

  useEffect(() => {
    loadPortfolioData();
  }, []);

  const loadPortfolioData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        fetchPortfolio(),
        fetchTradeHistory(),
        fetchDividendHistory(),
      ]);
    } catch (error) {
      console.error('Error loading portfolio:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTradeHistory = async () => {
    try {
      const response = await tradingApi.getTradeHistory({ page: 1, limit: 50 });
      if (response.data.success && response.data.data) {
        setTradeHistory(response.data.data as Trade[]);
      }
    } catch (error) {
      console.error('Error fetching trade history:', error);
    }
  };

  const fetchDividendHistory = async () => {
    try {
      const response = await dividendApi.getHistory({ page: 1, limit: 50 });
      if (response.data.success && response.data.data) {
        setDividendHistory(response.data.data as DividendPayout[]);
      }
    } catch (error) {
      console.error('Error fetching dividend history:', error);
    }
  };

  // ============================================
  // Event Handlers
  // ============================================

  const handleBrowseMarketplace = () => {
    navigate('/investor/marketplace');
  };

  const handleViewCompany = (companyId: string) => {
    navigate(`/investor/companies/${companyId}`);
  };

  const handleTrade = (companyId: string, side: 'buy' | 'sell') => {
    navigate(`/investor/companies/${companyId}`, { state: { tradeSide: side } });
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
  // Render Portfolio
  // ============================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">My Portfolio</h1>
          <p className="text-secondary-500 mt-1">
            Track your investments and earnings
          </p>
        </div>
        <Button
          onClick={handleBrowseMarketplace}
          rightIcon={<ArrowRight className="w-4 h-4" />}
        >
          Explore Marketplace
        </Button>
      </div>

      {/* Portfolio Summary */}
      <PortfolioSummary />

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start">
          <TabsTrigger value="holdings">Holdings</TabsTrigger>
          <TabsTrigger value="allocation">Allocation</TabsTrigger>
          <TabsTrigger value="dividends">Dividends</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        {/* Holdings Tab */}
        <TabsContent value="holdings" className="space-y-6">
          {portfolio.holdings.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <div className="w-20 h-20 bg-secondary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <PieChart className="w-10 h-10 text-secondary-400" />
                </div>
                <h3 className="text-xl font-semibold text-secondary-900 mb-2">
                  Your Portfolio is Empty
                </h3>
                <p className="text-secondary-500 mb-6 max-w-md mx-auto">
                  Start building your portfolio by investing in promising businesses
                </p>
                <Button onClick={handleBrowseMarketplace}>
                  Browse Marketplace
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {portfolio.holdings.map((holding) => (
                <HoldingCard 
                  key={holding.id} 
                  holding={holding}
                  onView={() => handleViewCompany(holding.companyId)}
                  onTrade={(side) => handleTrade(holding.companyId, side)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Allocation Tab */}
        <TabsContent value="allocation" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader title="Portfolio Allocation" />
              <CardContent>
                <PortfolioChart holdings={portfolio.holdings} height={350} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader title="Allocation Breakdown" />
              <CardContent>
                <div className="space-y-4">
                  {portfolio.holdings.map((holding) => {
                    const allocation = (holding.currentValue || 0) / portfolio.summary.totalValue * 100;
                    return (
                      <div key={holding.id} className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-5 h-5 text-primary-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-secondary-900">
                              {holding.company?.businessName}
                            </span>
                            <span className="text-sm text-secondary-500">
                              {allocation.toFixed(1)}%
                            </span>
                          </div>
                          <div className="h-2 bg-secondary-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary-500 rounded-full"
                              style={{ width: `${allocation}%` }}
                            />
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-secondary-900">
                            {formatCurrency(holding.currentValue || 0)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Dividends Tab */}
        <TabsContent value="dividends" className="space-y-6">
          <DividendCalendar payouts={dividendHistory} />
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-6">
          <TransactionList trades={tradeHistory} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// ============================================
// Holding Card Component
// ============================================

interface HoldingCardProps {
  holding: StockHolding;
  onView: () => void;
  onTrade: (side: 'buy' | 'sell') => void;
}

const HoldingCard: React.FC<HoldingCardProps> = ({ holding, onView, onTrade }) => {
  const isProfitable = (holding.profitLoss || 0) >= 0;
  const totalReturn = (holding.profitLoss || 0) + (holding.totalDividendsEarned || 0);

  return (
    <Card className="hover:shadow-elevated transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
              <Building2 className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <h3 className="font-semibold text-secondary-900">
                {holding.company?.businessName}
              </h3>
              <p className="text-sm text-secondary-500">
                {formatNumber(holding.sharesOwned)} shares
              </p>
            </div>
          </div>
          <Badge variant={isProfitable ? 'success' : 'danger'}>
            {isProfitable ? '+' : ''}{formatPercentage(holding.profitLossPercent || 0)}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="p-3 bg-secondary-50 rounded-lg">
            <p className="text-xs text-secondary-500 mb-1">Current Value</p>
            <p className="font-semibold text-secondary-900">
              {formatCurrency(holding.currentValue || 0)}
            </p>
          </div>
          <div className="p-3 bg-secondary-50 rounded-lg">
            <p className="text-xs text-secondary-500 mb-1">Total Return</p>
            <p className={`font-semibold ${totalReturn >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
              {totalReturn >= 0 ? '+' : ''}{formatCurrency(totalReturn)}
            </p>
          </div>
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-sm">
            <span className="text-secondary-500">Avg Buy Price</span>
            <span className="text-secondary-900">{formatCurrency(holding.averageBuyPrice)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-secondary-500">Current Price</span>
            <span className="text-secondary-900">
              {formatCurrency(holding.company?.currentPrice || 0)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-secondary-500">Dividends Earned</span>
            <span className="text-success-600">
              +{formatCurrency(holding.totalDividendsEarned)}
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={onView}
          >
            View Details
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => onTrade('buy')}
            leftIcon={<ShoppingCart className="w-4 h-4" />}
          >
            Buy More
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => onTrade('sell')}
          >
            Sell
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default Portfolio;
