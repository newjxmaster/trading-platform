import React from 'react';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@components/ui/Card';
import { Badge } from '@components/ui/Badge';
import { OrderBook as OrderBookType } from '@types/index';
import { formatCurrency, formatNumber } from '@utils/formatters';

// ============================================
// Order Book Component
// ============================================

interface OrderBookProps {
  orderBook: OrderBookType | null;
  currentPrice: number;
}

export const OrderBook: React.FC<OrderBookProps> = ({ orderBook, currentPrice }) => {
  if (!orderBook) {
    return (
      <Card>
        <CardHeader title="Order Book" />
        <CardContent>
          <div className="text-center py-8">
            <Activity className="w-10 h-10 text-secondary-300 mx-auto mb-2" />
            <p className="text-secondary-500">No orders available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { buyOrders, sellOrders, spread } = orderBook;
  
  // Sort orders by price
  const sortedBuyOrders = [...buyOrders].sort((a, b) => b.price - a.price);
  const sortedSellOrders = [...sellOrders].sort((a, b) => a.price - b.price);

  // Calculate totals
  const totalBuyVolume = buyOrders.reduce((sum, o) => sum + o.quantity, 0);
  const totalSellVolume = sellOrders.reduce((sum, o) => sum + o.quantity, 0);
  const maxVolume = Math.max(totalBuyVolume, totalSellVolume, 1);

  return (
    <Card>
      <CardHeader 
        title="Order Book" 
        subtitle={`Spread: ${formatCurrency(spread)}`}
      />
      <CardContent className="p-0">
        <div className="grid grid-cols-2">
          {/* Buy Orders (Bids) */}
          <div className="border-r border-secondary-200">
            <div className="flex items-center justify-between p-3 bg-success-50 border-b border-success-100">
              <span className="text-sm font-medium text-success-700">Buy Orders</span>
              <Badge variant="success">{formatNumber(totalBuyVolume)}</Badge>
            </div>
            <div className="max-h-80 overflow-auto">
              <table className="w-full">
                <thead className="bg-secondary-50 sticky top-0">
                  <tr>
                    <th className="text-left py-2 px-3 text-xs font-medium text-secondary-500">Price</th>
                    <th className="text-right py-2 px-3 text-xs font-medium text-secondary-500">Qty</th>
                    <th className="text-right py-2 px-3 text-xs font-medium text-secondary-500">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedBuyOrders.map((order, index) => (
                    <OrderRow 
                      key={order.id} 
                      order={order} 
                      type="buy"
                      maxVolume={maxVolume}
                    />
                  ))}
                  {sortedBuyOrders.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-secondary-400 text-sm">
                        No buy orders
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sell Orders (Asks) */}
          <div>
            <div className="flex items-center justify-between p-3 bg-danger-50 border-b border-danger-100">
              <span className="text-sm font-medium text-danger-700">Sell Orders</span>
              <Badge variant="danger">{formatNumber(totalSellVolume)}</Badge>
            </div>
            <div className="max-h-80 overflow-auto">
              <table className="w-full">
                <thead className="bg-secondary-50 sticky top-0">
                  <tr>
                    <th className="text-left py-2 px-3 text-xs font-medium text-secondary-500">Price</th>
                    <th className="text-right py-2 px-3 text-xs font-medium text-secondary-500">Qty</th>
                    <th className="text-right py-2 px-3 text-xs font-medium text-secondary-500">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedSellOrders.map((order, index) => (
                    <OrderRow 
                      key={order.id} 
                      order={order} 
                      type="sell"
                      maxVolume={maxVolume}
                    />
                  ))}
                  {sortedSellOrders.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-secondary-400 text-sm">
                        No sell orders
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Current Price */}
        <div className="p-4 bg-secondary-50 border-t border-secondary-200 text-center">
          <span className="text-sm text-secondary-500">Current Price</span>
          <p className="text-2xl font-bold text-secondary-900">{formatCurrency(currentPrice)}</p>
        </div>
      </CardContent>
    </Card>
  );
};

// ============================================
// Order Row Component
// ============================================

interface OrderRowProps {
  order: {
    id: string;
    price: number;
    quantity: number;
  };
  type: 'buy' | 'sell';
  maxVolume: number;
}

const OrderRow: React.FC<OrderRowProps> = ({ order, type, maxVolume }) => {
  const total = order.price * order.quantity;
  const volumePercent = (order.quantity / maxVolume) * 100;

  return (
    <tr className="relative hover:bg-secondary-50 transition-colors">
      {/* Volume Bar */}
      <div 
        className={`absolute top-0 ${type === 'buy' ? 'right-0' : 'left-0'} h-full opacity-10 ${
          type === 'buy' ? 'bg-success-500' : 'bg-danger-500'
        }`}
        style={{ width: `${Math.max(volumePercent, 5)}%` }}
      />
      
      <td className={`py-2 px-3 text-sm font-medium ${
        type === 'buy' ? 'text-success-600' : 'text-danger-600'
      }`}>
        {formatCurrency(order.price)}
      </td>
      <td className="py-2 px-3 text-sm text-right text-secondary-700">
        {formatNumber(order.quantity)}
      </td>
      <td className="py-2 px-3 text-sm text-right text-secondary-500">
        {formatCurrency(total)}
      </td>
    </tr>
  );
};

export default OrderBook;
