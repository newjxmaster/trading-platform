import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Building2, 
  MapPin, 
  Calendar, 
  TrendingUp, 
  TrendingDown,
  Users,
  FileText,
  ShoppingCart,
  Share2,
  Heart
} from 'lucide-react';
import { Card, CardHeader, CardContent } from '@components/ui/Card';
import { Button } from '@components/ui/Button';
import { Badge } from '@components/ui/Badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@components/ui/Tabs';
import { LoadingSpinner } from '@components/feedback/LoadingSpinner';
import { ErrorMessage } from '@components/feedback/ErrorMessage';
import { OrderBook } from '@components/trading/OrderBook';
import { StockPriceChart } from '@components/charts/StockPriceChart';
import { RevenueChart } from '@components/charts/RevenueChart';
import { OrderModal } from './OrderModal';
import { useSocket } from '@hooks/useSocket';
import { useAuthStore } from '@stores/authStore';
import { companyApi, tradingApi } from '@services/api';
import { Company, OrderBook as OrderBookType, PriceHistory, RevenueReport } from '../../types';
import { formatCurrency, formatPercentage, formatDate, formatNumber, formatBusinessType } from '../../utils/formatters';

// ============================================
// Company Detail Component
// ============================================

export const CompanyDetail: React.FC = () => {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const { user: _user } = useAuthStore();
  const { joinCompanyRoom, leaveCompanyRoom, subscribeToPriceUpdates } = useSocket();
  
  // ============================================
  // State
  // ============================================
  
  const [company, setCompany] = useState<Company | null>(null);
  const [orderBook, setOrderBook] = useState<OrderBookType | null>(null);
  const [priceHistory, setPriceHistory] = useState<PriceHistory[]>([]);
  const [revenueReports, setRevenueReports] = useState<RevenueReport[]>([]);
  const [shareholders, setShareholders] = useState<{ userId: string; shares: number; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isWatchlisted, setIsWatchlisted] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [orderSide, setOrderSide] = useState<'buy' | 'sell'>('buy');
  const [activeTab, setActiveTab] = useState('overview');

  // ============================================
  // Fetch Company Data
  // ============================================

  useEffect(() => {
    if (companyId) {
      fetchCompanyData();
      joinCompanyRoom(companyId);
    }

    return () => {
      if (companyId) {
        leaveCompanyRoom(companyId);
      }
    };
  }, [companyId, joinCompanyRoom, leaveCompanyRoom]);

  const fetchCompanyData = async () => {
    if (!companyId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const [companyRes, orderBookRes, priceHistoryRes, financialsRes, shareholdersRes] = await Promise.all([
        companyApi.getById(companyId),
        tradingApi.getOrderBook(companyId),
        companyApi.getPriceHistory(companyId),
        companyApi.getFinancials(companyId),
        companyApi.getShareholders(companyId),
      ]);

      if (companyRes.data.success) {
        setCompany(companyRes.data.data as Company);
      }
      if (orderBookRes.data.success) {
        setOrderBook(orderBookRes.data.data as OrderBookType);
      }
      if (priceHistoryRes.data.success) {
        setPriceHistory(priceHistoryRes.data.data as PriceHistory[]);
      }
      if (financialsRes.data.success) {
        setRevenueReports((financialsRes.data.data as { reports: RevenueReport[] }).reports);
      }
      if (shareholdersRes.data.success) {
        setShareholders(shareholdersRes.data.data as { userId: string; shares: number; name: string }[]);
      }
    } catch (err) {
      setError('Failed to load company details. Please try again.');
      console.error('Error fetching company data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================
  // Real-time Updates
  // ============================================

  useEffect(() => {
    const unsubscribe = subscribeToPriceUpdates((data) => {
      if (data.companyId === companyId && company) {
        setCompany({
          ...company,
          currentPrice: data.price,
          priceChange: data.change,
          priceChangePercent: data.changePercent,
        });
      }
    });

    return () => {
      unsubscribe?.();
    };
  }, [companyId, company, subscribeToPriceUpdates]);

  // ============================================
  // Event Handlers
  // ============================================

  const handleBuy = () => {
    setOrderSide('buy');
    setShowOrderModal(true);
  };

  const handleSell = () => {
    setOrderSide('sell');
    setShowOrderModal(true);
  };

  const handleOrderSuccess = () => {
    setShowOrderModal(false);
    fetchCompanyData(); // Refresh data
  };

  const toggleWatchlist = () => {
    setIsWatchlisted(!isWatchlisted);
    // TODO: Implement watchlist API call
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
  // Render Error State
  // ============================================

  if (error || !company) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <ErrorMessage 
          message={error || 'Company not found'} 
          onRetry={fetchCompanyData}
        />
        <Button 
          variant="outline" 
          className="mt-4 mx-auto block"
          onClick={() => navigate('/investor/marketplace')}
          leftIcon={<ArrowLeft className="w-4 h-4" />}
        >
          Back to Marketplace
        </Button>
      </div>
    );
  }

  // ============================================
  // Render Company Detail
  // ============================================

  const isPriceUp = (company.priceChangePercent || 0) >= 0;
  const marketCap = company.currentPrice * company.totalShares;
  const publicOfferingPercent = ((company.totalShares - company.availableShares) / company.totalShares) * 100;

  return (
    <div className="space-y-6">
      {/* Navigation */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/investor/marketplace')}
        leftIcon={<ArrowLeft className="w-4 h-4" />}
      >
        Back to Marketplace
      </Button>

      {/* Company Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
            {company.businessPhotoUrl ? (
              <img 
                src={company.businessPhotoUrl} 
                alt={company.businessName}
                className="w-full h-full object-cover rounded-xl"
              />
            ) : (
              <Building2 className="w-8 h-8 text-primary-600" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-secondary-900">{company.businessName}</h1>
              <Badge variant={company.listingStatus === 'active' ? 'success' : 'warning'}>
                {company.listingStatus.toUpperCase()}
              </Badge>
            </div>
            <div className="flex items-center gap-4 mt-2 text-sm text-secondary-500 flex-wrap">
              <span className="flex items-center gap-1">
                <Building2 className="w-4 h-4" />
                {formatBusinessType(company.businessType)}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {company.category}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                IPO: {formatDate(company.ipoDate)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleWatchlist}
            leftIcon={<Heart className={`w-5 h-5 ${isWatchlisted ? 'fill-danger-500 text-danger-500' : ''}`} />}
          >
            {isWatchlisted ? 'Watchlisted' : 'Watchlist'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<Share2 className="w-5 h-5" />}
          >
            Share
          </Button>
        </div>
      </div>

      {/* Price & Actions */}
      <Card className="bg-gradient-to-br from-secondary-900 to-secondary-800 text-white">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <p className="text-secondary-300 text-sm mb-1">Current Share Price</p>
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-bold">{formatCurrency(company.currentPrice)}</span>
                <span className={`flex items-center gap-1 text-lg ${isPriceUp ? 'text-success-400' : 'text-danger-400'}`}>
                  {isPriceUp ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                  {isPriceUp ? '+' : ''}{formatPercentage(company.priceChangePercent || 0)}
                </span>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                size="lg"
                className="bg-success-600 hover:bg-success-700 text-white"
                onClick={handleBuy}
                leftIcon={<ShoppingCart className="w-5 h-5" />}
              >
                Buy Shares
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10"
                onClick={handleSell}
              >
                Sell
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="financials">Financials</TabsTrigger>
          <TabsTrigger value="trading">Trading</TabsTrigger>
          <TabsTrigger value="shareholders">Shareholders</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Key Stats */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader title="Price Performance" />
                <CardContent>
                  <StockPriceChart 
                    data={priceHistory} 
                    height={300}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader title="About the Business" />
                <CardContent>
                  <p className="text-secondary-600 leading-relaxed">
                    {company.description || 'No description available.'}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Side Stats */}
            <div className="space-y-6">
              <Card>
                <CardHeader title="Key Statistics" />
                <CardContent className="space-y-4">
                  <StatItem label="Market Cap" value={formatCurrency(marketCap)} />
                  <StatItem label="Total Shares" value={formatNumber(company.totalShares)} />
                  <StatItem label="Available" value={formatNumber(company.availableShares)} />
                  <StatItem label="Initial Valuation" value={formatCurrency(company.initialValuation)} />
                  <StatItem label="Public Offering" value={`${publicOfferingPercent.toFixed(1)}%`} />
                  <StatItem 
                    label="Dividend Yield" 
                    value={company.dividendYield ? formatPercentage(company.dividendYield) : '-'} 
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader title="Latest Revenue Report" />
                <CardContent>
                  {revenueReports.length > 0 ? (
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-secondary-500">Period</span>
                        <span className="font-medium">
                          {revenueReports[0].reportMonth}/{revenueReports[0].reportYear}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-secondary-500">Revenue</span>
                        <span className="font-medium">{formatCurrency(revenueReports[0].netRevenue)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-secondary-500">Net Profit</span>
                        <span className="font-medium text-success-600">
                          {formatCurrency(revenueReports[0].netProfit)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-secondary-500">Dividend/Share</span>
                        <span className="font-medium text-success-600">
                          {formatCurrency(revenueReports[0].dividendPool / company.totalShares)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-secondary-500 text-center py-4">No revenue reports yet</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Financials Tab */}
        <TabsContent value="financials" className="space-y-6">
          <Card>
            <CardHeader title="Revenue History" />
            <CardContent>
              <RevenueChart data={revenueReports} height={350} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="Revenue Reports" />
            <CardContent>
              {revenueReports.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-secondary-300 mx-auto mb-3" />
                  <p className="text-secondary-500">No revenue reports available</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-secondary-200">
                        <th className="text-left py-3 px-4 text-sm font-medium text-secondary-500">Period</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-secondary-500">Revenue</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-secondary-500">Profit</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-secondary-500">Dividend Pool</th>
                        <th className="text-center py-3 px-4 text-sm font-medium text-secondary-500">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {revenueReports.map((report) => (
                        <tr key={report.id} className="border-b border-secondary-100 hover:bg-secondary-50">
                          <td className="py-3 px-4">
                            {report.reportMonth}/{report.reportYear}
                          </td>
                          <td className="py-3 px-4 text-right">{formatCurrency(report.netRevenue)}</td>
                          <td className="py-3 px-4 text-right text-success-600">
                            {formatCurrency(report.netProfit)}
                          </td>
                          <td className="py-3 px-4 text-right text-success-600">
                            {formatCurrency(report.dividendPool)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Badge variant={report.verificationStatus === 'verified' ? 'success' : 'warning'}>
                              {report.verificationStatus}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trading Tab */}
        <TabsContent value="trading" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <OrderBook 
              orderBook={orderBook} 
              currentPrice={company.currentPrice}
            />
            <Card>
              <CardHeader title="Trading Activity" />
              <CardContent>
                <StockPriceChart 
                  data={priceHistory} 
                  showVolume
                  height={350}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Shareholders Tab */}
        <TabsContent value="shareholders" className="space-y-6">
          <Card>
            <CardHeader 
              title="Shareholder Distribution" 
              subtitle={`${shareholders.length} total shareholders`}
            />
            <CardContent>
              {shareholders.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-secondary-300 mx-auto mb-3" />
                  <p className="text-secondary-500">No shareholders yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {shareholders.map((shareholder, index) => {
                    const ownershipPercent = (shareholder.shares / company.totalShares) * 100;
                    return (
                      <div key={shareholder.userId} className="flex items-center gap-4">
                        <span className="w-6 text-center text-secondary-400 font-medium">
                          {index + 1}
                        </span>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-secondary-900">
                              {shareholder.name}
                            </span>
                            <span className="text-sm text-secondary-500">
                              {formatNumber(shareholder.shares)} shares ({ownershipPercent.toFixed(2)}%)
                            </span>
                          </div>
                          <div className="h-2 bg-secondary-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary-500 rounded-full"
                              style={{ width: `${ownershipPercent}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Order Modal */}
      {showOrderModal && (
        <OrderModal
          isOpen={showOrderModal}
          onClose={() => setShowOrderModal(false)}
          company={company}
          side={orderSide}
          onSuccess={handleOrderSuccess}
        />
      )}
    </div>
  );
};

// ============================================
// Stat Item Component
// ============================================

interface StatItemProps {
  label: string;
  value: string;
}

const StatItem: React.FC<StatItemProps> = ({ label, value }) => (
  <div className="flex items-center justify-between py-2 border-b border-secondary-100 last:border-0">
    <span className="text-secondary-500">{label}</span>
    <span className="font-medium text-secondary-900">{value}</span>
  </div>
);

export default CompanyDetail;
