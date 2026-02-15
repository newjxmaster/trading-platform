import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCompanyStore } from '../stores/companyStore';
import { useTradingStore } from '../stores/tradingStore';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { CardSkeleton } from '../components/feedback/LoadingSpinner';
import { ErrorMessage, EmptyState } from '../components/feedback/ErrorMessage';
import { 
  formatCurrency, 
  formatPercentage, 
  formatNumber,
  getChangeColorClass,
  formatBusinessType 
} from '../utils/formatters';
import { cn } from '../utils/helpers';
import { useDebounce } from '../hooks/useDebounce';
import { 
  Search, 
  Filter, 
  Building2,
  ArrowUpRight,
  DollarSign,
  BarChart3
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Company } from '../types';

// ============================================
// Company Card Component
// ============================================

interface CompanyCardProps {
  company: Company;
  onBuy: (company: Company) => void;
}

const CompanyCard: React.FC<CompanyCardProps> = ({ company, onBuy }) => {
  const priceChange = company.priceChangePercent || 0;
  const isPositive = priceChange >= 0;

  return (
    <Card className="hover:shadow-elevated transition-all duration-200 h-full flex flex-col">
      <CardContent className="p-5 flex flex-col h-full">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Building2 className="w-6 h-6 text-primary-600" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-secondary-900 truncate">
                {company.businessName}
              </h3>
              <p className="text-sm text-secondary-500">
                {formatBusinessType(company.businessType)}
              </p>
            </div>
          </div>
          <Badge variant={company.listingStatus === 'active' ? 'success' : 'default'}>
            {company.listingStatus}
          </Badge>
        </div>

        {/* Price Info */}
        <div className="mb-4">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-secondary-900">
              {formatCurrency(company.currentPrice)}
            </span>
            <span className={cn('flex items-center text-sm font-medium', getChangeColorClass(priceChange))}>
              {isPositive ? '+' : ''}{priceChange.toFixed(2)}%
            </span>
          </div>
          <p className="text-sm text-secondary-500 mt-1">
            per share
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-4 flex-1">
          <div>
            <p className="text-xs text-secondary-500 mb-0.5">Available Shares</p>
            <p className="text-sm font-medium text-secondary-900">
              {formatNumber(company.availableShares)}
            </p>
          </div>
          <div>
            <p className="text-xs text-secondary-500 mb-0.5">Dividend Yield</p>
            <p className="text-sm font-medium text-success-600">
              {formatPercentage(company.dividendYield || 0)}
            </p>
          </div>
          <div>
            <p className="text-xs text-secondary-500 mb-0.5">Valuation</p>
            <p className="text-sm font-medium text-secondary-900">
              {formatCurrency(company.initialValuation)}
            </p>
          </div>
          <div>
            <p className="text-xs text-secondary-500 mb-0.5">Category</p>
            <p className="text-sm font-medium text-secondary-900 capitalize">
              {company.category || '-'}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-auto">
          <Link to={`/companies/${company.id}`} className="flex-1">
            <Button variant="outline" fullWidth size="sm">
              Details
            </Button>
          </Link>
          <Button 
            fullWidth 
            size="sm" 
            leftIcon={<ArrowUpRight className="w-4 h-4" />}
            onClick={() => onBuy(company)}
          >
            Buy
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// ============================================
// Buy Modal Component
// ============================================

interface BuyModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: Company | null;
}

const BuyModal: React.FC<BuyModalProps> = ({ isOpen, onClose, company }) => {
  const [quantity, setQuantity] = useState(1);
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [limitPrice, setLimitPrice] = useState('');
  const { placeOrder, isLoading } = useTradingStore();

  if (!company) return null;

  const totalCost = quantity * company.currentPrice;
  const platformFee = totalCost * 0.005; // 0.5% fee
  const total = totalCost + platformFee;

  const handleSubmit = async () => {
    try {
      await placeOrder({
        companyId: company.id,
        orderType,
        side: 'buy',
        quantity,
        price: orderType === 'limit' ? parseFloat(limitPrice) : undefined,
      });
      toast.success(`Order placed successfully for ${quantity} shares of ${company.businessName}`);
      onClose();
      setQuantity(1);
    } catch (error) {
      toast.error('Failed to place order. Please try again.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Buy ${company.businessName}`}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            isLoading={isLoading}
            loadingText="Placing Order..."
          >
            Confirm Purchase
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Order Type */}
        <div>
          <label className="text-sm font-medium text-secondary-700 mb-2 block">
            Order Type
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setOrderType('market')}
              className={cn(
                'flex-1 py-2 px-4 rounded-lg text-sm font-medium border-2 transition-colors',
                orderType === 'market'
                  ? 'border-primary-600 bg-primary-50 text-primary-700'
                  : 'border-secondary-200 text-secondary-600 hover:border-secondary-300'
              )}
            >
              Market Order
            </button>
            <button
              type="button"
              onClick={() => setOrderType('limit')}
              className={cn(
                'flex-1 py-2 px-4 rounded-lg text-sm font-medium border-2 transition-colors',
                orderType === 'limit'
                  ? 'border-primary-600 bg-primary-50 text-primary-700'
                  : 'border-secondary-200 text-secondary-600 hover:border-secondary-300'
              )}
            >
              Limit Order
            </button>
          </div>
        </div>

        {/* Current Price */}
        <div className="bg-secondary-50 rounded-lg p-3">
          <p className="text-sm text-secondary-600">Current Price</p>
          <p className="text-xl font-bold text-secondary-900">
            {formatCurrency(company.currentPrice)}
          </p>
        </div>

        {/* Limit Price (for limit orders) */}
        {orderType === 'limit' && (
          <Input
            label="Limit Price"
            type="number"
            placeholder="Enter your limit price"
            value={limitPrice}
            onChange={(e) => setLimitPrice(e.target.value)}
            leftIcon={<DollarSign className="w-5 h-5" />}
          />
        )}

        {/* Quantity */}
        <div>
          <label className="text-sm font-medium text-secondary-700 mb-2 block">
            Number of Shares
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="w-10 h-10 rounded-lg border border-secondary-300 flex items-center justify-center hover:bg-secondary-50"
            >
              -
            </button>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="flex-1 text-center py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
            <button
              type="button"
              onClick={() => setQuantity(quantity + 1)}
              className="w-10 h-10 rounded-lg border border-secondary-300 flex items-center justify-center hover:bg-secondary-50"
            >
              +
            </button>
          </div>
        </div>

        {/* Summary */}
        <div className="border-t border-secondary-200 pt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-secondary-600">Subtotal</span>
            <span className="font-medium">{formatCurrency(totalCost)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-secondary-600">Platform Fee (0.5%)</span>
            <span className="font-medium">{formatCurrency(platformFee)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold pt-2 border-t border-secondary-200">
            <span className="text-secondary-900">Total</span>
            <span className="text-primary-600">{formatCurrency(total)}</span>
          </div>
        </div>
      </div>
    </Modal>
  );
};

// ============================================
// Filter Panel Component
// ============================================

const categoryOptions = [
  { value: '', label: 'All Categories' },
  { value: 'supermarket', label: 'Supermarket' },
  { value: 'factory', label: 'Factory' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'cafe', label: 'Cafe' },
  { value: 'pharmacy', label: 'Pharmacy' },
  { value: 'retail', label: 'Retail Store' },
];

const sortOptions = [
  { value: 'newest', label: 'Newest First' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'performance', label: 'Top Performers' },
  { value: 'dividend', label: 'Highest Dividend' },
];

// ============================================
// Marketplace Page Component
// ============================================

const Marketplace: React.FC = () => {
  const { 
    companies, 
    isLoading, 
    error, 
    fetchCompanies,
  } = useCompanyStore();
  
  // Local state for filters
  const [filters, setFilters] = useState({
    category: '',
    sortBy: 'newest',
    sortOrder: 'desc' as 'asc' | 'desc',
  });
  const clearFilters = () => setFilters({ category: '', sortBy: 'newest', sortOrder: 'desc' });
  const pagination = { page: 1, totalPages: 1, total: companies.length };
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [isBuyModalOpen, setIsBuyModalOpen] = useState(false);

  const debouncedSearch = useDebounce(searchQuery, 300);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const handleSearch = (value: string) => {
    setSearchQuery(value);
  };

  const handleBuy = (company: Company) => {
    setSelectedCompany(company);
    setIsBuyModalOpen(true);
  };

  const filteredCompanies = companies.filter(company =>
    company.businessName.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
    (company.category?.toLowerCase() || '').includes(debouncedSearch.toLowerCase())
  );

  if (isLoading && companies.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-secondary-900">Marketplace</h1>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <ErrorMessage
        title="Failed to load marketplace"
        message={error}
        onRetry={fetchCompanies}
        variant="page"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">Marketplace</h1>
          <p className="text-secondary-600 mt-1">
            Discover and invest in promising businesses
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-secondary-500">
          <BarChart3 className="w-4 h-4" />
          <span>{pagination.total} companies listed</span>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" />
          <input
            type="text"
            placeholder="Search companies..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        <Button
          variant="outline"
          leftIcon={<Filter className="w-4 h-4" />}
          onClick={() => setShowFilters(!showFilters)}
        >
          Filters
        </Button>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-white rounded-xl border border-secondary-200 p-4 animate-slide-down">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <select
              className="px-4 py-2.5 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
            >
              {categoryOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <select
              className="px-4 py-2.5 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              value={`${filters.sortBy}_${filters.sortOrder}`}
              onChange={(e) => {
                const [sortBy, sortOrder] = e.target.value.split('_');
                setFilters({ ...filters, sortBy, sortOrder: sortOrder as 'asc' | 'desc' });
              }}
            >
              {sortOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <div className="flex items-end">
              <Button variant="ghost" onClick={clearFilters} className="w-full">
                Clear Filters
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Companies Grid */}
      {filteredCompanies.length === 0 ? (
        <EmptyState
          icon={<Search className="w-8 h-8" />}
          title="No companies found"
          description="Try adjusting your search or filters"
          action={
            <Button variant="outline" onClick={clearFilters}>
              Clear Filters
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredCompanies.map((company) => (
            <CompanyCard 
              key={company.id} 
              company={company} 
              onBuy={handleBuy}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page === 1}
            onClick={() => fetchCompanies({ page: pagination.page - 1 })}
          >
            Previous
          </Button>
          <span className="text-sm text-secondary-600">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page === pagination.totalPages}
            onClick={() => fetchCompanies({ page: pagination.page + 1 })}
          >
            Next
          </Button>
        </div>
      )}

      {/* Buy Modal */}
      <BuyModal
        isOpen={isBuyModalOpen}
        onClose={() => setIsBuyModalOpen(false)}
        company={selectedCompany}
      />
    </div>
  );
};

export default Marketplace;
