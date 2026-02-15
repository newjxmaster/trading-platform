import React from 'react';
import { TrendingUp, TrendingDown, PieChart, DollarSign, Wallet } from 'lucide-react';
import { Card, CardContent } from '@components/ui/Card';
import { useTradingStore } from '@stores/tradingStore';
import { useWalletStore } from '@stores/walletStore';
import { formatCurrency, formatPercentage } from '@utils/formatters';

// ============================================
// Portfolio Summary Component
// ============================================

export const PortfolioSummary: React.FC = () => {
  const { portfolio } = useTradingStore();
  const { balance } = useWalletStore();

  const { summary, holdings } = portfolio;
  const isProfitable = (summary.totalProfitLoss || 0) >= 0;
  const totalReturn = (summary.totalProfitLoss || 0) + (summary.totalDividendsEarned || 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Portfolio Value */}
      <Card className="bg-gradient-to-br from-primary-500 to-primary-600 text-white">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <PieChart className="w-5 h-5" />
            </div>
            <span className="text-primary-100 text-sm">Portfolio</span>
          </div>
          <p className="text-3xl font-bold">{formatCurrency(summary.totalValue)}</p>
          <p className="text-primary-100 text-sm mt-1">
            {holdings.length} {holdings.length === 1 ? 'holding' : 'holdings'}
          </p>
        </CardContent>
      </Card>

      {/* Total Return */}
      <Card className={isProfitable 
        ? 'bg-gradient-to-br from-success-500 to-success-600 text-white' 
        : 'bg-gradient-to-br from-danger-500 to-danger-600 text-white'
      }>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              {isProfitable ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
            </div>
            <span className={`${isProfitable ? 'text-success-100' : 'text-danger-100'} text-sm`}>
              Total Return
            </span>
          </div>
          <p className="text-3xl font-bold">
            {isProfitable ? '+' : ''}{formatCurrency(totalReturn)}
          </p>
          <p className={`${isProfitable ? 'text-success-100' : 'text-danger-100'} text-sm mt-1`}>
            {isProfitable ? '+' : ''}{formatPercentage(summary.profitLossPercent || 0)}
          </p>
        </CardContent>
      </Card>

      {/* Dividends Earned */}
      <Card className="bg-gradient-to-br from-warning-500 to-warning-600 text-white">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
            <span className="text-warning-100 text-sm">Dividends</span>
          </div>
          <p className="text-3xl font-bold">{formatCurrency(summary.totalDividendsEarned || 0)}</p>
          <p className="text-warning-100 text-sm mt-1">
            Lifetime earnings
          </p>
        </CardContent>
      </Card>

      {/* Available Balance */}
      <Card className="bg-gradient-to-br from-secondary-700 to-secondary-800 text-white">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
            <span className="text-secondary-300 text-sm">Available</span>
          </div>
          <p className="text-3xl font-bold">{formatCurrency(balance.fiat)}</p>
          <p className="text-secondary-300 text-sm mt-1">
            Ready to invest
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default PortfolioSummary;
