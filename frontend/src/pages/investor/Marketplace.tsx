import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  Building2,
  X
} from 'lucide-react';
import { Card, CardContent } from '@components/ui/Card';
import { Button } from '@components/ui/Button';
import { Input } from '@components/ui/Input';
import { Select } from '@components/ui/Select';
import { Badge } from '@components/ui/Badge';

import { LoadingSpinner } from '@components/feedback/LoadingSpinner';
import { CompanyCard } from '@components/trading/CompanyCard';
import { useSocket } from '@hooks/useSocket';
import { companyApi } from '@services/api';
import { Company, FilterOptions } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { debounce } from '@utils/helpers';

// ============================================
// Marketplace Component
// ============================================

const CATEGORIES = [
  { value: '', label: 'All Categories' },
  { value: 'supermarket', label: 'Supermarket' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'cafe', label: 'Cafe' },
  { value: 'pharmacy', label: 'Pharmacy' },
  { value: 'factory', label: 'Factory' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'wholesale', label: 'Wholesale' },
  { value: 'bakery', label: 'Bakery' },
  { value: 'textile', label: 'Textile' },
  { value: 'retail', label: 'Retail Store' },
  { value: 'other', label: 'Other' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'performance', label: 'Top Performers' },
  { value: 'dividend', label: 'Highest Dividend' },
  { value: 'volume', label: 'Most Traded' },
];

export const Marketplace: React.FC = () => {
  const navigate = useNavigate();
  const { subscribeToPriceUpdates } = useSocket();
  
  // ============================================
  // State
  // ============================================
  
  const [companies, setCompanies] = useState<Company[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    businessType: undefined,
    category: undefined,
    minPrice: undefined,
    maxPrice: undefined,
    minDividendYield: undefined,
    sortBy: 'newest',
    sortOrder: 'desc',
  });

  // ============================================
  // Fetch Companies
  // ============================================

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    setIsLoading(true);
    try {
      const response = await companyApi.getAll({ 
        page: 1, 
        limit: 100,
        filter: 'active'
      });
      if (response.data.success && response.data.data) {
        const fetchedCompanies = response.data.data as Company[];
        setCompanies(fetchedCompanies);
        setFilteredCompanies(fetchedCompanies);
      }
    } catch (error) {
      console.error('Error fetching companies:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================
  // Real-time Price Updates
  // ============================================

  useEffect(() => {
    const unsubscribe = subscribeToPriceUpdates((data) => {
      setCompanies(prev => 
        prev.map(company => 
          company.id === data.companyId
            ? { 
                ...company, 
                currentPrice: data.price,
                priceChange: data.change,
                priceChangePercent: data.changePercent
              }
            : company
        )
      );
    });

    return () => {
      unsubscribe?.();
    };
  }, [subscribeToPriceUpdates]);

  // ============================================
  // Search & Filter Logic
  // ============================================

  const applyFilters = useCallback(() => {
    let result = [...companies];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(company =>
        company.businessName.toLowerCase().includes(query) ||
        company.category?.toLowerCase().includes(query) ||
        company.description?.toLowerCase().includes(query)
      );
    }

    // Business type filter
    if (filters.businessType) {
      result = result.filter(company => 
        company.businessType === filters.businessType
      );
    }

    // Category filter
    if (filters.category) {
      result = result.filter(company => 
        company.category?.toLowerCase() === filters.category?.toLowerCase()
      );
    }

    // Price range filter
    if (filters.minPrice !== undefined) {
      result = result.filter(company => 
        company.currentPrice >= filters.minPrice!
      );
    }
    if (filters.maxPrice !== undefined) {
      result = result.filter(company => 
        company.currentPrice <= filters.maxPrice!
      );
    }

    // Dividend yield filter
    if (filters.minDividendYield !== undefined) {
      result = result.filter(company => 
        (company.dividendYield || 0) >= filters.minDividendYield!
      );
    }

    // Sorting
    result = sortCompanies(result, filters.sortBy || 'newest');

    setFilteredCompanies(result);
  }, [companies, searchQuery, filters]);

  const sortCompanies = (companiesToSort: Company[], sortBy: string): Company[] => {
    const sorted = [...companiesToSort];
    
    switch (sortBy) {
      case 'price_asc':
        return sorted.sort((a, b) => a.currentPrice - b.currentPrice);
      case 'price_desc':
        return sorted.sort((a, b) => b.currentPrice - a.currentPrice);
      case 'performance':
        return sorted.sort((a, b) => (b.priceChangePercent || 0) - (a.priceChangePercent || 0));
      case 'dividend':
        return sorted.sort((a, b) => (b.dividendYield || 0) - (a.dividendYield || 0));
      case 'volume':
        return sorted.sort((a, b) => (b.availableShares || 0) - (a.availableShares || 0));
      case 'newest':
      default:
        return sorted.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    }
  };

  // Debounced search
  const debouncedSearch = useCallback(
    debounce(() => applyFilters(), 300),
    [applyFilters]
  );

  useEffect(() => {
    debouncedSearch();
  }, [searchQuery, filters, debouncedSearch]);

  // ============================================
  // Event Handlers
  // ============================================

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleFilterChange = (key: keyof FilterOptions, value: unknown) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      businessType: undefined,
      category: undefined,
      minPrice: undefined,
      maxPrice: undefined,
      minDividendYield: undefined,
      sortBy: 'newest',
      sortOrder: 'desc',
    });
    setSearchQuery('');
  };

  const handleCompanyClick = (companyId: string) => {
    navigate(`/investor/companies/${companyId}`);
  };

  const hasActiveFilters = 
    filters.businessType || 
    filters.category || 
    filters.minPrice !== undefined || 
    filters.maxPrice !== undefined ||
    filters.minDividendYield !== undefined ||
    searchQuery;

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
  // Render Marketplace
  // ============================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">Marketplace</h1>
          <p className="text-secondary-500 mt-1">
            Browse and invest in verified businesses
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-secondary-500">
          <Building2 className="w-4 h-4" />
          <span>{filteredCompanies.length} companies available</span>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" />
          <Input
            placeholder="Search companies..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Select
            value={filters.sortBy}
            onChange={(value) => handleFilterChange('sortBy', value)}
            options={SORT_OPTIONS}
            className="w-44"
          />
          <Button
            variant={showFilters ? 'primary' : 'outline'}
            onClick={() => setShowFilters(!showFilters)}
            leftIcon={<Filter className="w-4 h-4" />}
          >
            Filters
            {hasActiveFilters && (
              <span className="ml-2 w-5 h-5 bg-primary-600 text-white text-xs rounded-full flex items-center justify-center">
                !
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Active Filters */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-secondary-500">Active filters:</span>
          {searchQuery && (
            <Badge variant="primary" className="gap-1">
              Search: {searchQuery}
              <X className="w-3 h-3 cursor-pointer" onClick={() => setSearchQuery('')} />
            </Badge>
          )}
          {filters.businessType && (
            <Badge variant="primary" className="gap-1">
              {filters.businessType === 'small_business' ? 'Small Business' : 'Medium Business'}
              <X className="w-3 h-3 cursor-pointer" onClick={() => handleFilterChange('businessType', undefined)} />
            </Badge>
          )}
          {filters.category && (
            <Badge variant="primary" className="gap-1">
              {CATEGORIES.find(c => c.value === filters.category)?.label}
              <X className="w-3 h-3 cursor-pointer" onClick={() => handleFilterChange('category', undefined)} />
            </Badge>
          )}
          {(filters.minPrice !== undefined || filters.maxPrice !== undefined) && (
            <Badge variant="primary" className="gap-1">
              Price: {formatCurrency(filters.minPrice || 0)} - {formatCurrency(filters.maxPrice || '∞')}
              <X className="w-3 h-3 cursor-pointer" onClick={() => {
                handleFilterChange('minPrice', undefined);
                handleFilterChange('maxPrice', undefined);
              }} />
            </Badge>
          )}
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear all
          </Button>
        </div>
      )}

      {/* Filter Panel */}
      {showFilters && (
        <Card className="bg-secondary-50">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  Business Type
                </label>
                <Select
                  value={filters.businessType || ''}
                  onChange={(value) => handleFilterChange('businessType', value || undefined)}
                  options={[
                    { value: '', label: 'All Types' },
                    { value: 'small_business', label: 'Small Business' },
                    { value: 'medium_business', label: 'Medium Business' },
                  ]}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  Category
                </label>
                <Select
                  value={filters.category || ''}
                  onChange={(value) => handleFilterChange('category', value || undefined)}
                  options={CATEGORIES}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  Min Price
                </label>
                <Input
                  type="number"
                  placeholder="$0"
                  value={filters.minPrice || ''}
                  onChange={(e) => handleFilterChange('minPrice', e.target.value ? parseFloat(e.target.value) : undefined)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  Max Price
                </label>
                <Input
                  type="number"
                  placeholder="∞"
                  value={filters.maxPrice || ''}
                  onChange={(e) => handleFilterChange('maxPrice', e.target.value ? parseFloat(e.target.value) : undefined)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Company Grid */}
      {filteredCompanies.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-20 h-20 bg-secondary-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-10 h-10 text-secondary-400" />
          </div>
          <h3 className="text-xl font-semibold text-secondary-900 mb-2">
            No companies found
          </h3>
          <p className="text-secondary-500 mb-6 max-w-md mx-auto">
            Try adjusting your search or filters to find what you're looking for
          </p>
          <Button onClick={clearFilters} variant="outline">
            Clear Filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredCompanies.map((company) => (
            <CompanyCard
              key={company.id}
              company={company}
              onClick={() => handleCompanyClick(company.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Marketplace;
