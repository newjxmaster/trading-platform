import React, { useState } from 'react';
import { 
  ArrowDownLeft, 
  ArrowUpRight, 
  TrendingUp, 
  TrendingDown,
  Search,
  Filter,
  Download
} from 'lucide-react';
import { Card, CardHeader, CardContent } from '@components/ui/Card';
import { Button } from '@components/ui/Button';
import { Input } from '@components/ui/Input';
import { Badge } from '@components/ui/Badge';
import { Transaction, Trade } from '../../types';
import { formatCurrency, formatRelativeTime } from '../../utils/formatters';

// ============================================
// Transaction List Component
// ============================================

interface TransactionListProps {
  trades?: Trade[];
  transactions?: Transaction[];
  showTypeFilter?: boolean;
}

export const TransactionList: React.FC<TransactionListProps> = ({ 
  trades = [], 
  transactions = [],
  showTypeFilter = false 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Combine and filter data
  const allItems = [
    ...trades.map(t => ({ ...t, itemType: 'trade' as const })),
    ...transactions.map(t => ({ ...t, itemType: 'transaction' as const })),
  ];

  const filteredItems = allItems.filter(item => {
    const matchesSearch = searchQuery === '' || 
      (item.itemType === 'trade' && (item as Trade).company?.businessName?.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesType = typeFilter === 'all' || 
      (item.itemType === 'trade' && typeFilter === 'trade') ||
      (item.itemType === 'transaction' && (item as Transaction).type === typeFilter);
    
    return matchesSearch && matchesType;
  });

  // Sort by date (newest first)
  const sortedItems = filteredItems.sort((a, b) => {
    const dateA = a.itemType === 'trade' 
      ? new Date((a as Trade).executedAt).getTime() 
      : new Date((a as Transaction).createdAt).getTime();
    const dateB = b.itemType === 'trade' 
      ? new Date((b as Trade).executedAt).getTime() 
      : new Date((b as Transaction).createdAt).getTime();
    return dateB - dateA;
  });

  // Export to CSV
  const handleExport = () => {
    const csvContent = [
      ['Date', 'Type', 'Description', 'Amount', 'Status'].join(','),
      ...sortedItems.map(item => {
        if (item.itemType === 'trade') {
          const trade = item as Trade;
          return [
            trade.executedAt,
            'Trade',
            `${trade.buyerId === 'user' ? 'Buy' : 'Sell'} ${trade.quantity} shares`,
            trade.totalAmount,
            'Completed'
          ].join(',');
        } else {
          const tx = item as Transaction;
          return [
            tx.createdAt,
            tx.type,
            tx.description,
            tx.amount,
            tx.status
          ].join(',');
        }
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <Card>
      <CardHeader 
        title="Transaction History"
        subtitle={`${sortedItems.length} transactions`}
        action={
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleExport}
            leftIcon={<Download className="w-4 h-4" />}
          >
            Export
          </Button>
        }
      />
      <CardContent>
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
            <Input
              placeholder="Search transactions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          {showTypeFilter && (
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Types</option>
              <option value="trade">Trades</option>
              <option value="deposit">Deposits</option>
              <option value="withdrawal">Withdrawals</option>
              <option value="dividend">Dividends</option>
              <option value="fee">Fees</option>
            </select>
          )}
        </div>

        {/* Transactions List */}
        {sortedItems.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-secondary-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Filter className="w-8 h-8 text-secondary-400" />
            </div>
            <p className="text-secondary-500">No transactions found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sortedItems.map((item, index) => {
              if (item.itemType === 'trade') {
                return <TradeItem key={index} trade={item as Trade} />;
              } else {
                return <TransactionItem key={index} transaction={item as Transaction} />;
              }
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ============================================
// Trade Item Component
// ============================================

const TradeItem: React.FC<{ trade: Trade }> = ({ trade }) => {
  const isBuy = trade.buyerId === 'user'; // Would check against current user

  return (
    <div className="flex items-center justify-between p-4 bg-secondary-50 rounded-lg hover:bg-secondary-100 transition-colors">
      <div className="flex items-center gap-4">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
          isBuy ? 'bg-success-100' : 'bg-danger-100'
        }`}>
          {isBuy ? (
            <ArrowDownLeft className={`w-5 h-5 ${isBuy ? 'text-success-600' : 'text-danger-600'}`} />
          ) : (
            <ArrowUpRight className={`w-5 h-5 ${isBuy ? 'text-success-600' : 'text-danger-600'}`} />
          )}
        </div>
        <div>
          <p className="font-medium text-secondary-900">
            {isBuy ? 'Bought' : 'Sold'} {trade.quantity} shares
          </p>
          <p className="text-sm text-secondary-500">
            {trade.company?.businessName}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className={`font-semibold ${isBuy ? 'text-danger-600' : 'text-success-600'}`}>
          {isBuy ? '-' : '+'}{formatCurrency(trade.totalAmount)}
        </p>
        <p className="text-xs text-secondary-500">
          {formatRelativeTime(trade.executedAt)}
        </p>
      </div>
    </div>
  );
};

// ============================================
// Transaction Item Component
// ============================================

const TransactionItem: React.FC<{ transaction: Transaction }> = ({ transaction }) => {
  const getIcon = () => {
    switch (transaction.type) {
      case 'deposit':
        return <ArrowDownLeft className="w-5 h-5 text-success-600" />;
      case 'withdrawal':
        return <ArrowUpRight className="w-5 h-5 text-danger-600" />;
      case 'dividend':
        return <TrendingUp className="w-5 h-5 text-success-600" />;
      case 'fee':
        return <TrendingDown className="w-5 h-5 text-danger-600" />;
      default:
        return <ArrowDownLeft className="w-5 h-5 text-secondary-600" />;
    }
  };

  const getColorClass = () => {
    switch (transaction.type) {
      case 'deposit':
      case 'dividend':
        return 'bg-success-100';
      case 'withdrawal':
      case 'fee':
        return 'bg-danger-100';
      default:
        return 'bg-secondary-100';
    }
  };

  const isPositive = ['deposit', 'dividend'].includes(transaction.type);

  return (
    <div className="flex items-center justify-between p-4 bg-secondary-50 rounded-lg hover:bg-secondary-100 transition-colors">
      <div className="flex items-center gap-4">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getColorClass()}`}>
          {getIcon()}
        </div>
        <div>
          <p className="font-medium text-secondary-900 capitalize">
            {transaction.type}
          </p>
          <p className="text-sm text-secondary-500">
            {transaction.description}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className={`font-semibold ${isPositive ? 'text-success-600' : 'text-danger-600'}`}>
          {isPositive ? '+' : '-'}{formatCurrency(transaction.amount)}
        </p>
        <div className="flex items-center justify-end gap-2">
          <Badge variant={transaction.status === 'completed' ? 'success' : 'warning'} className="text-xs">
            {transaction.status}
          </Badge>
          <p className="text-xs text-secondary-500">
            {formatRelativeTime(transaction.createdAt)}
          </p>
        </div>
      </div>
    </div>
  );
};

export default TransactionList;
