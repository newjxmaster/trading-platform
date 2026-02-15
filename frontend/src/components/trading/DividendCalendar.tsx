import React, { useState } from 'react';
import { Calendar, DollarSign, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@components/ui/Card';
import { Badge } from '@components/ui/Badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@components/ui/Tabs';
import { DividendPayout } from '@types/index';
import { formatCurrency, formatDate, formatRelativeTime } from '@utils/formatters';

// ============================================
// Dividend Calendar Component
// ============================================

interface DividendCalendarProps {
  payouts: DividendPayout[];
}

export const DividendCalendar: React.FC<DividendCalendarProps> = ({ payouts }) => {
  const [activeTab, setActiveTab] = useState('upcoming');

  // Filter payouts
  const upcomingPayouts = payouts.filter(p => p.status === 'pending');
  const receivedPayouts = payouts.filter(p => p.status === 'paid');

  // Group by month
  const groupByMonth = (items: DividendPayout[]) => {
    const grouped: Record<string, DividendPayout[]> = {};
    items.forEach(item => {
      const date = new Date(item.dividend?.distributionDate || item.createdAt);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(item);
    });
    return grouped;
  };

  const groupedUpcoming = groupByMonth(upcomingPayouts);
  const groupedReceived = groupByMonth(receivedPayouts);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <Card>
      <CardHeader 
        title="Dividend Calendar" 
        subtitle="Track your dividend payments"
      />
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full">
            <TabsTrigger value="upcoming">
              Upcoming
              {upcomingPayouts.length > 0 && (
                <span className="ml-2 w-5 h-5 bg-primary-500 text-white text-xs rounded-full flex items-center justify-center">
                  {upcomingPayouts.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="received">
              Received
              {receivedPayouts.length > 0 && (
                <span className="ml-2 text-xs text-secondary-500">
                  ({receivedPayouts.length})
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="space-y-4">
            {upcomingPayouts.length === 0 ? (
              <EmptyState message="No upcoming dividends" icon={Clock} />
            ) : (
              Object.entries(groupedUpcoming)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([monthKey, items]) => {
                  const [year, month] = monthKey.split('-');
                  const monthTotal = items.reduce((sum, i) => sum + i.payoutAmount, 0);
                  
                  return (
                    <MonthSection
                      key={monthKey}
                      title={`${monthNames[parseInt(month) - 1]} ${year}`}
                      total={monthTotal}
                      items={items}
                      type="upcoming"
                    />
                  );
                })
            )}
          </TabsContent>

          <TabsContent value="received" className="space-y-4">
            {receivedPayouts.length === 0 ? (
              <EmptyState message="No received dividends yet" icon={CheckCircle2} />
            ) : (
              Object.entries(groupedReceived)
                .sort(([a], [b]) => b.localeCompare(a))
                .map(([monthKey, items]) => {
                  const [year, month] = monthKey.split('-');
                  const monthTotal = items.reduce((sum, i) => sum + i.payoutAmount, 0);
                  
                  return (
                    <MonthSection
                      key={monthKey}
                      title={`${monthNames[parseInt(month) - 1]} ${year}`}
                      total={monthTotal}
                      items={items}
                      type="received"
                    />
                  );
                })
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

// ============================================
// Month Section Component
// ============================================

interface MonthSectionProps {
  title: string;
  total: number;
  items: DividendPayout[];
  type: 'upcoming' | 'received';
}

const MonthSection: React.FC<MonthSectionProps> = ({ title, total, items, type }) => (
  <div className="border border-secondary-200 rounded-lg overflow-hidden">
    <div className="flex items-center justify-between p-3 bg-secondary-50 border-b border-secondary-200">
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-secondary-400" />
        <span className="font-medium text-secondary-900">{title}</span>
      </div>
      <span className="font-semibold text-success-600">{formatCurrency(total)}</span>
    </div>
    <div className="divide-y divide-secondary-100">
      {items.map((payout) => (
        <div key={payout.id} className="flex items-center justify-between p-3 hover:bg-secondary-50">
          <div>
            <p className="font-medium text-secondary-900">
              {payout.company?.businessName}
            </p>
            <p className="text-sm text-secondary-500">
              {payout.sharesHeld} shares
            </p>
          </div>
          <div className="text-right">
            <p className="font-semibold text-success-600">
              +{formatCurrency(payout.payoutAmount)}
            </p>
            <p className="text-xs text-secondary-400">
              {type === 'upcoming' 
                ? formatRelativeTime(payout.dividend?.distributionDate)
                : formatDate(payout.createdAt)
              }
            </p>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// ============================================
// Empty State Component
// ============================================

interface EmptyStateProps {
  message: string;
  icon: React.ElementType;
}

const EmptyState: React.FC<EmptyStateProps> = ({ message, icon: Icon }) => (
  <div className="text-center py-12">
    <div className="w-16 h-16 bg-secondary-100 rounded-full flex items-center justify-center mx-auto mb-4">
      <Icon className="w-8 h-8 text-secondary-400" />
    </div>
    <p className="text-secondary-500">{message}</p>
  </div>
);

export default DividendCalendar;
