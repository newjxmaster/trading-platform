import React from 'react';
import { Building2, TrendingUp, TrendingDown, Users, DollarSign } from 'lucide-react';
import { Card, CardContent } from '@components/ui/Card';
import { Badge } from '@components/ui/Badge';
import { Company } from '../../types';
import { formatCurrency, formatPercentage, formatNumber, formatBusinessType } from '@utils/formatters';

// ============================================
// Company Card Component
// ============================================

interface CompanyCardProps {
  company: Company;
  onClick?: () => void;
  showActions?: boolean;
}

export const CompanyCard: React.FC<CompanyCardProps> = ({ 
  company, 
  onClick,
  showActions: _showActions = false 
}) => {
  void _showActions; // Unused but kept for API compatibility
  const isPriceUp = (company.priceChangePercent || 0) >= 0;
  const marketCap = company.currentPrice * company.totalShares;
  const publicOffering = ((company.totalShares - company.availableShares) / company.totalShares) * 100;

  return (
    <Card 
      className="hover:shadow-elevated transition-all cursor-pointer group"
      onClick={onClick}
    >
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center overflow-hidden">
              {company.businessPhotoUrl ? (
                <img 
                  src={company.businessPhotoUrl} 
                  alt={company.businessName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Building2 className="w-6 h-6 text-primary-600" />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-secondary-900 group-hover:text-primary-600 transition-colors">
                {company.businessName}
              </h3>
              <p className="text-sm text-secondary-500">
                {formatBusinessType(company.businessType)}
              </p>
            </div>
          </div>
          <Badge variant={company.listingStatus === 'active' ? 'success' : 'warning'}>
            {company.listingStatus}
          </Badge>
        </div>

        {/* Price */}
        <div className="flex items-baseline gap-2 mb-4">
          <span className="text-2xl font-bold text-secondary-900">
            {formatCurrency(company.currentPrice)}
          </span>
          <span className={`flex items-center gap-1 text-sm ${
            isPriceUp ? 'text-success-600' : 'text-danger-600'
          }`}>
            {isPriceUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            {isPriceUp ? '+' : ''}{formatPercentage(company.priceChangePercent || 0)}
          </span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="p-2 bg-secondary-50 rounded-lg">
            <div className="flex items-center gap-1 text-xs text-secondary-500 mb-1">
              <DollarSign className="w-3 h-3" />
              Market Cap
            </div>
            <p className="font-medium text-sm">{formatCompactCurrency(marketCap)}</p>
          </div>
          <div className="p-2 bg-secondary-50 rounded-lg">
            <div className="flex items-center gap-1 text-xs text-secondary-500 mb-1">
              <Users className="w-3 h-3" />
              Public Offering
            </div>
            <p className="font-medium text-sm">{publicOffering.toFixed(1)}%</p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-secondary-100">
          <div className="flex items-center gap-2">
            <span className="text-xs text-secondary-500">Available:</span>
            <span className="text-sm font-medium">{formatNumber(company.availableShares)} shares</span>
          </div>
          {company.dividendYield && (
            <Badge variant="success" className="text-xs">
              {formatPercentage(company.dividendYield)} yield
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// ============================================
// Compact Currency Formatter
// ============================================

const formatCompactCurrency = (value: number): string => {
  if (value >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(1)}B`;
  }
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(1)}K`;
  }
  return formatCurrency(value);
};

export default CompanyCard;
