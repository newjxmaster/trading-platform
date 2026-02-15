import React from 'react';
import { TrendingUp, TrendingDown, DollarSign, Clock, Target } from 'lucide-react';
import { Card, CardContent } from '@components/ui/Card';
import { formatCurrency, formatPercentage } from '@utils/formatters';

// ============================================
// Performance Metrics Component
// ============================================

interface PerformanceMetricsProps {
  metrics: {
    totalReturn: number;
    totalReturnPercent: number;
    dayChange: number;
    dayChangePercent: number;
    bestPerformer?: {
      name: string;
      return: number;
    };
    worstPerformer?: {
      name: string;
      return: number;
    };
    dividendYield: number;
    avgHoldingPeriod: number;
  };
}

export const PerformanceMetrics: React.FC<PerformanceMetricsProps> = ({ metrics }) => {
  const isTotalPositive = metrics.totalReturn >= 0;
  const isDayPositive = metrics.dayChange >= 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* Total Return */}
      <MetricCard
        title="Total Return"
        value={formatCurrency(metrics.totalReturn)}
        subtitle={formatPercentage(metrics.totalReturnPercent)}
        isPositive={isTotalPositive}
        icon={isTotalPositive ? TrendingUp : TrendingDown}
      />

      {/* Day Change */}
      <MetricCard
        title="Today's Change"
        value={formatCurrency(metrics.dayChange)}
        subtitle={formatPercentage(metrics.dayChangePercent)}
        isPositive={isDayPositive}
        icon={isDayPositive ? TrendingUp : TrendingDown}
      />

      {/* Dividend Yield */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-warning-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-warning-600" />
            </div>
            <div>
              <p className="text-sm text-secondary-500">Dividend Yield</p>
              <p className="text-xl font-bold text-secondary-900">
                {formatPercentage(metrics.dividendYield)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Best Performer */}
      {metrics.bestPerformer && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-success-100 rounded-lg flex items-center justify-center">
                <Target className="w-5 h-5 text-success-600" />
              </div>
              <div>
                <p className="text-sm text-secondary-500">Best Performer</p>
                <p className="text-sm font-medium text-secondary-900 truncate max-w-[150px]">
                  {metrics.bestPerformer.name}
                </p>
                <p className="text-sm text-success-600">
                  +{formatPercentage(metrics.bestPerformer.return)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Worst Performer */}
      {metrics.worstPerformer && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-danger-100 rounded-lg flex items-center justify-center">
                <Target className="w-5 h-5 text-danger-600" />
              </div>
              <div>
                <p className="text-sm text-secondary-500">Worst Performer</p>
                <p className="text-sm font-medium text-secondary-900 truncate max-w-[150px]">
                  {metrics.worstPerformer.name}
                </p>
                <p className="text-sm text-danger-600">
                  {formatPercentage(metrics.worstPerformer.return)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Avg Holding Period */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-secondary-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-secondary-600" />
            </div>
            <div>
              <p className="text-sm text-secondary-500">Avg Holding Period</p>
              <p className="text-xl font-bold text-secondary-900">
                {metrics.avgHoldingPeriod} days
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// ============================================
// Metric Card Component
// ============================================

interface MetricCardProps {
  title: string;
  value: string;
  subtitle: string;
  isPositive: boolean;
  icon: React.ElementType;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, subtitle, isPositive, icon: Icon }) => (
  <Card>
    <CardContent className="p-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
          isPositive ? 'bg-success-100' : 'bg-danger-100'
        }`}>
          <Icon className={`w-5 h-5 ${isPositive ? 'text-success-600' : 'text-danger-600'}`} />
        </div>
        <div>
          <p className="text-sm text-secondary-500">{title}</p>
          <p className="text-xl font-bold text-secondary-900">{value}</p>
          <p className={`text-sm ${isPositive ? 'text-success-600' : 'text-danger-600'}`}>
            {subtitle}
          </p>
        </div>
      </div>
    </CardContent>
  </Card>
);

export default PerformanceMetrics;
