import React, { useEffect, useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  Activity,
  BarChart3,
  Clock,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { Card, CardHeader, CardContent } from '@components/ui/Card';
import { Button } from '@components/ui/Button';
import { Badge } from '@components/ui/Badge';
import { LoadingSpinner } from '@components/feedback/LoadingSpinner';
import { StockPriceChart } from '@components/charts/StockPriceChart';
import { useAuthStore } from '@stores/authStore';
import { companyApi, tradingApi } from '@services/api';
import { Company, PriceHistory, Trade } from '@types/index';
import { formatCurrency, formatNumber, formatPercentage, formatDate } from '@utils/formatters';

// ============================================
// Stock Performance Component
// ============================================

export const StockPerformance: React.FC = () => {
  const { user } = useAuthStore();
  
  const [company, setCompany] = useState<Company | null>(null);
  const [priceHistory, setPriceHistory] = useState<PriceHistory[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'1D' | '1W' | '1M' | '3M' | '1Y' | 'ALL'>('1M');

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
          
          const [priceRes, tradesRes] = await Promise.all([
            companyApi.getPriceHistory(companies[0].id),
            tradingApi.getTradeHistory({ page: 1, limit: 100 }),
          ]);
          
          if (priceRes.data.success) {
            setPriceHistory(priceRes.data.data as PriceHistory[]);
          }
          if (tradesRes.data.success) {
            setTrades(tradesRes.data.data as Trade[]);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================
  // Calculate Stats
  // ============================================

  const currentPrice = company?.currentPrice || 0;
  const initialPrice = company?.initialValuation && company?.totalShares 
    ? company.initialValuation / company.totalShares 
    : currentPrice;
  
  const priceChange = currentPrice - initialPrice;
  const priceChangePercent = initialPrice > 0 ? (priceChange / initialPrice) * 100 : 0;
  
  const todayTrades = trades.filter(t => {
    const tradeDate = new Date(t.executedAt);
    const today = new Date();
    return tradeDate.toDateString() === today.toDateString();
  });
  
  const todayVolume = todayTrades.reduce((sum, t) => sum + t.quantity, 0);
  const totalVolume = trades.reduce((sum, t) => sum + t.quantity, 0);
  const avgDailyVolume = totalVolume / Math.max(priceHistory.length, 1);
  
  const high24h = priceHistory.length > 0 
    ? Math.max(...priceHistory.map(p => p.price)) 
    : currentPrice;
  const low24h = priceHistory.length > 0 
    ? Math.min(...priceHistory.map(p => p.price)) 
    : currentPrice;

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
  // Render Stock Performance
  // ============================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-secondary-900">Stock Performance</h1>
        <p className="text-secondary-500 mt-1">
          Track your stock price and trading activity
        </p>
      </div>

      {/* Price Header */}
      <Card className="bg-gradient-to-br from-secondary-900 to-secondary-800 text-white">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <p className="text-secondary-300 text-sm mb-1">Current Share Price</p>
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-bold">{formatCurrency(currentPrice)}</span>
                <span className={`flex items-center gap-1 text-lg ${
                  priceChangePercent >= 0 ? 'text-success-400' : 'text-danger-400'
                }`}>
                  {priceChangePercent >= 0 ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                  {priceChangePercent >= 0 ? '+' : ''}{formatPercentage(priceChangePercent)}
                </span>
              </div>
              <p className="text-secondary-400 text-sm mt-1">
                vs IPO price of {formatCurrency(initialPrice)}
              </p>
            </div>
            <div className="flex gap-3">
              {(['1D', '1W', '1M', '3M', '1Y', 'ALL'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    timeRange === range
                      ? 'bg-white text-secondary-900'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="24h High"
          value={formatCurrency(high24h)}
          icon={TrendingUp}
          color="success"
        />
        <StatCard
          title="24h Low"
          value={formatCurrency(low24h)}
          icon={TrendingDown}
          color="danger"
        />
        <StatCard
          title="Today's Volume"
          value={formatNumber(todayVolume)}
          icon={Activity}
          color="primary"
        />
        <StatCard
          title="Avg Daily Volume"
          value={formatNumber(Math.round(avgDailyVolume))}
          icon={BarChart3}
          color="secondary"
        />
      </div>

      {/* Price Chart */}
      <Card>
        <CardHeader title="Price History" />
        <CardContent>
          <StockPriceChart 
            data={priceHistory} 
            showVolume
            height={400}
          />
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Performance Metrics" />
          <CardContent>
            <div className="space-y-4">
              <MetricRow
                label="Market Cap"
                value={formatCurrency(currentPrice * (company?.totalShares || 0))}
              />
              <MetricRow
                label="Initial Valuation"
                value={formatCurrency(company?.initialValuation || 0)}
              />
              <MetricRow
                label="Total Return"
                value={`${priceChangePercent >= 0 ? '+' : ''}${formatPercentage(priceChangePercent)}`}
                valueColor={priceChangePercent >= 0 ? 'text-success-600' : 'text-danger-600'}
              />
              <MetricRow
                label="Total Shares"
                value={formatNumber(company?.totalShares || 0)}
              />
              <MetricRow
                label="Available Shares"
                value={formatNumber(company?.availableShares || 0)}
              />
              <MetricRow
                label="Total Volume (All Time)"
                value={formatNumber(totalVolume)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Recent Trades" />
          <CardContent>
            {trades.length === 0 ? (
              <div className="text-center py-8">
                <Activity className="w-10 h-10 text-secondary-300 mx-auto mb-2" />
                <p className="text-secondary-500">No trades yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {trades.slice(0, 10).map((trade) => (
                  <div 
                    key={trade.id}
                    className="flex items-center justify-between py-2 border-b border-secondary-100 last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        trade.price >= currentPrice ? 'bg-success-100' : 'bg-danger-100'
                      }`}>
                        {trade.price >= currentPrice ? (
                          <TrendingUp className="w-4 h-4 text-success-600" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-danger-600" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-secondary-900">
                          {formatNumber(trade.quantity)} shares
                        </p>
                        <p className="text-xs text-secondary-500">
                          {formatDate(trade.executedAt)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-secondary-900">
                        {formatCurrency(trade.price)}
                      </p>
                      <p className="text-xs text-secondary-500">
                        {formatCurrency(trade.totalAmount)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Price History Table */}
      <Card>
        <CardHeader title="Historical Prices" />
        <CardContent>
          {priceHistory.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="w-10 h-10 text-secondary-300 mx-auto mb-2" />
              <p className="text-secondary-500">No price history available</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-secondary-200">
                    <th className="text-left py-3 px-4 text-sm font-medium text-secondary-500">Date</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-secondary-500">Price</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-secondary-500">Volume</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-secondary-500">Change</th>
                  </tr>
                </thead>
                <tbody>
                  {priceHistory.slice(0, 20).map((price, index) => {
                    const prevPrice = priceHistory[index + 1]?.price || price.price;
                    const change = price.price - prevPrice;
                    const changePercent = prevPrice > 0 ? (change / prevPrice) * 100 : 0;
                    
                    return (
                      <tr key={price.id} className="border-b border-secondary-100 hover:bg-secondary-50">
                        <td className="py-3 px-4">
                          {formatDate(price.timestamp)}
                        </td>
                        <td className="py-3 px-4 text-right font-medium">
                          {formatCurrency(price.price)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {formatNumber(price.volume)}
                        </td>
                        <td className={`py-3 px-4 text-right ${
                          change >= 0 ? 'text-success-600' : 'text-danger-600'
                        }`}>
                          {change >= 0 ? '+' : ''}{formatPercentage(changePercent)}
                        </td>
                      </tr>
                    );
                  })}
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
  color: 'primary' | 'success' | 'danger' | 'secondary';
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, color }) => {
  const colorClasses = {
    primary: 'bg-primary-100 text-primary-600',
    success: 'bg-success-100 text-success-600',
    danger: 'bg-danger-100 text-danger-600',
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
// Metric Row Component
// ============================================

interface MetricRowProps {
  label: string;
  value: string;
  valueColor?: string;
}

const MetricRow: React.FC<MetricRowProps> = ({ label, value, valueColor }) => (
  <div className="flex items-center justify-between py-2 border-b border-secondary-100 last:border-0">
    <span className="text-secondary-500">{label}</span>
    <span className={`font-medium ${valueColor || 'text-secondary-900'}`}>{value}</span>
  </div>
);

export default StockPerformance;
