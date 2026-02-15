import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  DollarSign, 
  PieChart, 
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Calculator,
  Info
} from 'lucide-react';
import { Card, CardHeader, CardContent } from '@components/ui/Card';
import { Button } from '@components/ui/Button';
import { Input } from '@components/ui/Input';

import { formatCurrency, formatNumber } from '@utils/formatters';

// ============================================
// Step 5: IPO Configuration Component
// ============================================

export const Step5_IPOConfig: React.FC = () => {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    initialValuation: 100000,
    totalShares: 10000,
    publicOfferingPercent: 70,
    minimumInvestment: 100,
  });

  // ============================================
  // Calculations
  // ============================================

  const sharePrice = formData.initialValuation / formData.totalShares;
  const publicShares = Math.round(formData.totalShares * (formData.publicOfferingPercent / 100));
  const retainedShares = formData.totalShares - publicShares;
  const capitalRaised = publicShares * sharePrice;
  const minShares = Math.ceil(formData.minimumInvestment / sharePrice);

  // ============================================
  // Handlers
  // ============================================

  const handleInputChange = (field: string, value: number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleContinue = () => {
    localStorage.setItem('registration_ipo', JSON.stringify(formData));
    navigate('/registration/step6');
  };

  // ============================================
  // Render
  // ============================================

  return (
    <div className="max-w-2xl mx-auto py-8">
      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-4 mb-8">
        {[1, 2, 3, 4, 5, 6].map((step) => (
          <div key={step} className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-medium ${
              step <= 5 ? 'bg-primary-500 text-white' : 'bg-secondary-200 text-secondary-500'
            }`}>
              {step < 5 ? <CheckCircle2 className="w-5 h-5" /> : step}
            </div>
            {step < 6 && <div className={`w-8 h-1 rounded ${step < 5 ? 'bg-primary-500' : 'bg-secondary-200'}`} />}
          </div>
        ))}
      </div>

      <Card>
        <CardHeader 
          title="Configure Your IPO"
          subtitle="Step 5 of 6 - Set up your public offering"
        />
        <CardContent>
          <div className="space-y-6">
            {/* Valuation */}
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Initial Valuation (USD)
              </label>
              <Input
                type="number"
                value={formData.initialValuation}
                onChange={(e) => handleInputChange('initialValuation', parseFloat(e.target.value) || 0)}
                leftIcon={<DollarSign className="w-4 h-4" />}
              />
              <p className="text-xs text-secondary-500 mt-1">
                Based on: Assets + Revenue + Growth potential
              </p>
            </div>

            {/* Total Shares */}
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Total Shares to Issue
              </label>
              <Input
                type="number"
                value={formData.totalShares}
                onChange={(e) => handleInputChange('totalShares', parseInt(e.target.value) || 0)}
                leftIcon={<PieChart className="w-4 h-4" />}
              />
              <p className="text-xs text-secondary-500 mt-1">
                Suggested: 10,000 - 100,000 shares for easy trading
              </p>
            </div>

            {/* Public Offering Percentage */}
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Public Offering (%)
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="10"
                  max="90"
                  value={formData.publicOfferingPercent}
                  onChange={(e) => handleInputChange('publicOfferingPercent', parseInt(e.target.value))}
                  className="flex-1"
                />
                <span className="w-16 text-right font-medium">{formData.publicOfferingPercent}%</span>
              </div>
              <p className="text-xs text-secondary-500 mt-1">
                Recommended: 60-80%. You retain: {100 - formData.publicOfferingPercent}%
              </p>
            </div>

            {/* Minimum Investment */}
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Minimum Investment (USD)
              </label>
              <Input
                type="number"
                value={formData.minimumInvestment}
                onChange={(e) => handleInputChange('minimumInvestment', parseFloat(e.target.value) || 0)}
                leftIcon={<DollarSign className="w-4 h-4" />}
              />
              <p className="text-xs text-secondary-500 mt-1">
                Suggested: $10 - $100 to encourage small investors
              </p>
            </div>

            {/* IPO Summary */}
            <div className="p-6 bg-secondary-50 rounded-xl space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Calculator className="w-5 h-5 text-primary-600" />
                <h4 className="font-semibold text-secondary-900">IPO Summary</h4>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-white rounded-lg">
                  <p className="text-sm text-secondary-500">Share Price</p>
                  <p className="text-lg font-bold text-secondary-900">{formatCurrency(sharePrice)}</p>
                </div>
                <div className="p-3 bg-white rounded-lg">
                  <p className="text-sm text-secondary-500">Shares for Public</p>
                  <p className="text-lg font-bold text-secondary-900">{formatNumber(publicShares)}</p>
                </div>
                <div className="p-3 bg-white rounded-lg">
                  <p className="text-sm text-secondary-500">Shares You Retain</p>
                  <p className="text-lg font-bold text-secondary-900">{formatNumber(retainedShares)}</p>
                </div>
                <div className="p-3 bg-white rounded-lg">
                  <p className="text-sm text-secondary-500">Minimum Shares</p>
                  <p className="text-lg font-bold text-secondary-900">{formatNumber(minShares)}</p>
                </div>
              </div>

              <div className="p-4 bg-success-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-success-800 font-medium">Expected Capital Raised</span>
                  <span className="text-2xl font-bold text-success-600">
                    {formatCurrency(capitalRaised)}
                  </span>
                </div>
              </div>
            </div>

            {/* Info Note */}
            <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
              <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-800">Important</p>
                <p className="text-sm text-blue-600">
                  Your IPO configuration will be reviewed by our team before going live. 
                  You can modify these settings later from your company dashboard.
                </p>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => navigate('/registration/step4')}
                leftIcon={<ArrowLeft className="w-4 h-4" />}
              >
                Back
              </Button>
              <Button
                type="button"
                className="flex-1"
                onClick={handleContinue}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Review
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Step5_IPOConfig;
