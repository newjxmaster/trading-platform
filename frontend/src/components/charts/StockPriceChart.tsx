import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  ComposedChart,
} from 'recharts';
import { Card } from '@components/ui/Card';
import { PriceHistory } from '@types/index';
import { formatCurrency, formatDate } from '@utils/formatters';

// ============================================
// Stock Price Chart Component
// ============================================

interface StockPriceChartProps {
  data: PriceHistory[];
  showVolume?: boolean;
  height?: number;
}

export const StockPriceChart: React.FC<StockPriceChartProps> = ({
  data,
  showVolume = false,
  height = 300,
}) => {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-secondary-400">
        No price data available
      </div>
    );
  }

  // Format data for chart
  const chartData = data.map(item => ({
    date: new Date(item.timestamp).toLocaleDateString(),
    price: item.price,
    volume: item.volume || 0,
  }));

  const minPrice = Math.min(...chartData.map(d => d.price));
  const maxPrice = Math.max(...chartData.map(d => d.price));
  const priceRange = maxPrice - minPrice;

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-secondary-200 rounded-lg shadow-lg">
          <p className="text-sm text-secondary-500 mb-1">{label}</p>
          <p className="text-lg font-bold text-secondary-900">
            {formatCurrency(payload[0].value)}
          </p>
          {showVolume && payload[1] && (
            <p className="text-sm text-secondary-500 mt-1">
              Volume: {payload[1].value.toLocaleString()}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  if (showVolume) {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={chartData}>
          <defs>
            <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: '#E5E7EB' }}
          />
          <YAxis 
            yAxisId="price"
            domain={[minPrice - priceRange * 0.1, maxPrice + priceRange * 0.1]}
            tickFormatter={(value) => `$${value}`}
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: '#E5E7EB' }}
          />
          <YAxis 
            yAxisId="volume"
            orientation="right"
            tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
            tick={{ fontSize: 10 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar 
            yAxisId="volume"
            dataKey="volume" 
            fill="#E5E7EB" 
            opacity={0.5}
          />
          <Area
            yAxisId="price"
            type="monotone"
            dataKey="price"
            stroke="#3B82F6"
            strokeWidth={2}
            fill="url(#priceGradient)"
          />
        </ComposedChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={chartData}>
        <defs>
          <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
        <XAxis 
          dataKey="date" 
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={{ stroke: '#E5E7EB' }}
        />
        <YAxis 
          domain={[minPrice - priceRange * 0.1, maxPrice + priceRange * 0.1]}
          tickFormatter={(value) => `$${value}`}
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={{ stroke: '#E5E7EB' }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="price"
          stroke="#3B82F6"
          strokeWidth={2}
          fill="url(#priceGradient)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};

export default StockPriceChart;
