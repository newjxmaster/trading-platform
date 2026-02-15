import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { StockHolding } from '../../types';
import { formatCurrency, formatPercentage } from '@utils/formatters';

// ============================================
// Portfolio Chart Component
// ============================================

interface PortfolioChartProps {
  holdings: StockHolding[];
  height?: number;
  showLegend?: boolean;
}

const COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Yellow
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#84CC16', // Lime
];

export const PortfolioChart: React.FC<PortfolioChartProps> = ({
  holdings,
  height = 300,
  showLegend = true,
}) => {
  if (holdings.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-secondary-400">
        No portfolio data available
      </div>
    );
  }

  // Calculate total value
  const totalValue = holdings.reduce((sum, h) => sum + (h.currentValue || 0), 0);

  // Prepare chart data
  const chartData = holdings.map(holding => ({
    name: holding.company?.businessName || 'Unknown',
    value: holding.currentValue || 0,
    shares: holding.sharesOwned,
    percentage: totalValue > 0 ? ((holding.currentValue || 0) / totalValue) * 100 : 0,
  }));

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-secondary-200 rounded-lg shadow-lg">
          <p className="font-medium text-secondary-900 mb-1">{data.name}</p>
          <p className="text-sm text-secondary-600">
            Value: {formatCurrency(data.value)}
          </p>
          <p className="text-sm text-secondary-600">
            Shares: {data.shares.toLocaleString()}
          </p>
          <p className="text-sm text-secondary-600">
            Allocation: {formatPercentage(data.percentage)}
          </p>
        </div>
      );
    }
    return null;
  };

  // Custom legend
  const CustomLegend = ({ payload }: any) => {
    return (
      <ul className="space-y-2 mt-4">
        {payload.map((entry: any, index: number) => (
          <li key={index} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-sm text-secondary-700">{entry.value}</span>
            </div>
            <span className="text-sm font-medium text-secondary-900">
              {formatPercentage(chartData[index]?.percentage || 0)}
            </span>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="flex flex-col lg:flex-row items-center gap-6">
      <div className="w-full lg:w-1/2">
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
            >
              {chartData.map((_entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={COLORS[index % COLORS.length]} 
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      
      {showLegend && (
        <div className="w-full lg:w-1/2">
          <CustomLegend payload={chartData.map((d, i) => ({ value: d.name, color: COLORS[i % COLORS.length] }))} />
        </div>
      )}
    </div>
  );
};

export default PortfolioChart;
