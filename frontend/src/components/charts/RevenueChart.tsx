import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Line,
  ComposedChart,
} from 'recharts';
import { RevenueReport } from '@types/index';
import { formatCurrency } from '@utils/formatters';

// ============================================
// Revenue Chart Component
// ============================================

interface RevenueChartProps {
  data: RevenueReport[];
  height?: number;
  showProfit?: boolean;
  showDividend?: boolean;
}

export const RevenueChart: React.FC<RevenueChartProps> = ({
  data,
  height = 300,
  showProfit = true,
  showDividend = true,
}) => {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-secondary-400">
        No revenue data available
      </div>
    );
  }

  // Sort by date and format data
  const sortedData = [...data].sort((a, b) => {
    const dateA = new Date(a.reportYear, a.reportMonth - 1);
    const dateB = new Date(b.reportYear, b.reportMonth - 1);
    return dateA.getTime() - dateB.getTime();
  });

  const chartData = sortedData.map(item => ({
    period: `${item.reportMonth}/${item.reportYear}`,
    revenue: item.netRevenue,
    profit: item.netProfit,
    dividend: item.dividendPool,
    costs: item.totalWithdrawals + (item.operatingCosts || 0),
  }));

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-secondary-200 rounded-lg shadow-lg">
          <p className="text-sm font-medium text-secondary-900 mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <span className="text-sm text-secondary-600 flex items-center gap-2">
                <span 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: entry.color }}
                />
                {entry.name}
              </span>
              <span className="text-sm font-medium">{formatCurrency(entry.value)}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
        <XAxis 
          dataKey="period" 
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={{ stroke: '#E5E7EB' }}
        />
        <YAxis 
          tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={{ stroke: '#E5E7EB' }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        
        <Bar 
          dataKey="revenue" 
          name="Revenue" 
          fill="#3B82F6" 
          radius={[4, 4, 0, 0]}
        />
        
        {showProfit && (
          <Bar 
            dataKey="profit" 
            name="Net Profit" 
            fill="#10B981" 
            radius={[4, 4, 0, 0]}
          />
        )}
        
        {showDividend && (
          <Line 
            type="monotone" 
            dataKey="dividend" 
            name="Dividend Pool" 
            stroke="#F59E0B" 
            strokeWidth={2}
            dot={{ fill: '#F59E0B', strokeWidth: 2 }}
          />
        )}
        
        <Bar 
          dataKey="costs" 
          name="Costs" 
          fill="#EF4444" 
          radius={[4, 4, 0, 0]}
          opacity={0.5}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
};

export default RevenueChart;
