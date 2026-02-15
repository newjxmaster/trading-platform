import React, { useEffect, useState } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Eye,
  Calendar,
  TrendingUp,
  TrendingDown,
  Search,
  Filter,
  AlertCircle,
  Building2
} from 'lucide-react';
import { Card, CardContent } from '@components/ui/Card';
import { Button } from '@components/ui/Button';
import { Input } from '@components/ui/Input';
import { Badge } from '@components/ui/Badge';
import { Modal } from '@components/ui/Modal';
import { LoadingSpinner } from '@components/feedback/LoadingSpinner';
import { adminApi } from '@services/api';
import { RevenueReport, Company } from '../../types';
import { formatCurrency } from '../../utils/formatters';

// ============================================
// Revenue Verification Component
// ============================================

interface ReportWithCompany extends RevenueReport {
  company?: Company;
}

export const RevenueVerification: React.FC = () => {
  const [reports, setReports] = useState<ReportWithCompany[]>([]);
  const [filteredReports, setFilteredReports] = useState<ReportWithCompany[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReport, setSelectedReport] = useState<ReportWithCompany | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // ============================================
  // Fetch Data
  // ============================================

  useEffect(() => {
    fetchPendingRevenue();
  }, []);

  const fetchPendingRevenue = async () => {
    setIsLoading(true);
    try {
      const response = await adminApi.getPendingRevenue();
      if (response.data.success && response.data.data) {
        const data = response.data.data as ReportWithCompany[];
        setReports(data);
        setFilteredReports(data);
      }
    } catch (error) {
      console.error('Error fetching pending revenue:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================
  // Search Filter
  // ============================================

  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      setFilteredReports(
        reports.filter(r =>
          r.company?.businessName.toLowerCase().includes(query) ||
          `${r.reportMonth}/${r.reportYear}`.includes(query)
        )
      );
    } else {
      setFilteredReports(reports);
    }
  }, [searchQuery, reports]);

  // ============================================
  // Verification Handlers
  // ============================================

  const handleVerify = async (reportId: string) => {
    setIsProcessing(true);
    try {
      const response = await adminApi.verifyRevenue(reportId, { status: 'verified' });
      if (response.data.success) {
        setReports(prev => prev.filter(r => r.id !== reportId));
        setSelectedReport(null);
      }
    } catch (error) {
      console.error('Error verifying revenue:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (reportId: string) => {
    setIsProcessing(true);
    try {
      const response = await adminApi.verifyRevenue(reportId, { status: 'rejected' });
      if (response.data.success) {
        setReports(prev => prev.filter(r => r.id !== reportId));
        setSelectedReport(null);
      }
    } catch (error) {
      console.error('Error rejecting revenue:', error);
    } finally {
      setIsProcessing(false);
    }
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
  // Render Revenue Verification
  // ============================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">Revenue Verification</h1>
          <p className="text-secondary-500 mt-1">
            Review and verify monthly revenue reports
          </p>
        </div>
        <Badge variant="warning" className="text-base px-4 py-2">
          {reports.length} Pending
        </Badge>
      </div>

      {/* Search */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" />
          <Input
            placeholder="Search by company or period..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" leftIcon={<Filter className="w-4 h-4" />}>
          Filter
        </Button>
      </div>

      {/* Reports List */}
      {filteredReports.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <CheckCircle2 className="w-16 h-16 text-success-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-secondary-900 mb-2">
              All Reports Verified
            </h3>
            <p className="text-secondary-500">
              No pending revenue reports to verify
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredReports.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              onReview={() => setSelectedReport(report)}
            />
          ))}
        </div>
      )}

      {/* Review Modal */}
      {selectedReport && (
        <Modal
          isOpen={!!selectedReport}
          onClose={() => setSelectedReport(null)}
          title="Review Revenue Report"
          size="lg"
        >
          <div className="space-y-6">
            {/* Company Info */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-primary-100 rounded-xl flex items-center justify-center">
                <Building2 className="w-7 h-7 text-primary-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-secondary-900">
                  {selectedReport.company?.businessName}
                </h3>
                <p className="text-secondary-500">
                  {selectedReport.reportMonth}/{selectedReport.reportYear}
                </p>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-success-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-success-600" />
                  <span className="text-sm text-success-700">Total Deposits</span>
                </div>
                <p className="text-2xl font-bold text-success-700">
                  {formatCurrency(selectedReport.totalDeposits)}
                </p>
              </div>
              <div className="p-4 bg-danger-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="w-5 h-5 text-danger-600" />
                  <span className="text-sm text-danger-700">Total Withdrawals</span>
                </div>
                <p className="text-2xl font-bold text-danger-700">
                  {formatCurrency(selectedReport.totalWithdrawals)}
                </p>
              </div>
            </div>

            {/* Detailed Breakdown */}
            <div className="p-4 bg-secondary-50 rounded-lg space-y-3">
              <h4 className="font-medium text-secondary-900">Financial Breakdown</h4>
              
              <div className="flex justify-between py-2 border-b border-secondary-200">
                <span className="text-secondary-600">Net Revenue</span>
                <span className="font-medium">{formatCurrency(selectedReport.netRevenue)}</span>
              </div>
              
              <div className="flex justify-between py-2 border-b border-secondary-200">
                <span className="text-secondary-600">Operating Costs</span>
                <span className="font-medium">{formatCurrency(selectedReport.operatingCosts || 0)}</span>
              </div>
              
              <div className="flex justify-between py-2 border-b border-secondary-200">
                <span className="text-secondary-600">Gross Profit</span>
                <span className="font-medium">{formatCurrency(selectedReport.grossProfit)}</span>
              </div>
              
              <div className="flex justify-between py-2 border-b border-secondary-200">
                <span className="text-secondary-600">Platform Fee (5%)</span>
                <span className="font-medium text-danger-600">-{formatCurrency(selectedReport.platformFee)}</span>
              </div>
              
              <div className="flex justify-between py-2">
                <span className="text-secondary-900 font-medium">Net Profit</span>
                <span className="font-bold text-success-600">{formatCurrency(selectedReport.netProfit)}</span>
              </div>
            </div>

            {/* Dividend Info */}
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-3">Dividend Distribution</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-blue-700">Dividend Pool (60%)</p>
                  <p className="text-lg font-bold text-blue-900">
                    {formatCurrency(selectedReport.dividendPool)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-blue-700">Reinvestment (40%)</p>
                  <p className="text-lg font-bold text-blue-900">
                    {formatCurrency(selectedReport.reinvestmentAmount)}
                  </p>
                </div>
              </div>
            </div>

            {/* Verification Status */}
            <div className="flex items-center gap-3 p-4 bg-yellow-50 rounded-lg">
              <AlertCircle className="w-5 h-5 text-yellow-500" />
              <div>
                <p className="text-sm font-medium text-yellow-800">Verification Status</p>
                <p className="text-sm text-yellow-700">
                  This report is currently: <Badge variant="warning">{selectedReport.verificationStatus}</Badge>
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-secondary-200">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setSelectedReport(null)}
              >
                Close
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                onClick={() => handleReject(selectedReport.id)}
                isLoading={isProcessing}
                leftIcon={<XCircle className="w-4 h-4" />}
              >
                Reject
              </Button>
              <Button
                className="flex-1"
                onClick={() => handleVerify(selectedReport.id)}
                isLoading={isProcessing}
                leftIcon={<CheckCircle2 className="w-4 h-4" />}
              >
                Verify
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ============================================
// Report Card Component
// ============================================

interface ReportCardProps {
  report: ReportWithCompany;
  onReview: () => void;
}

const ReportCard: React.FC<ReportCardProps> = ({ report, onReview }) => (
  <Card className="hover:shadow-elevated transition-shadow">
    <CardContent className="p-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
            <Building2 className="w-6 h-6 text-primary-600" />
          </div>
          <div>
            <h3 className="font-semibold text-secondary-900">
              {report.company?.businessName}
            </h3>
            <div className="flex items-center gap-3 text-sm text-secondary-500">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {report.reportMonth}/{report.reportYear}
              </span>
              <Badge variant="warning">{report.verificationStatus}</Badge>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-sm text-secondary-500">Revenue</p>
            <p className="font-semibold text-secondary-900">{formatCurrency(report.netRevenue)}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-secondary-500">Profit</p>
            <p className="font-semibold text-success-600">{formatCurrency(report.netProfit)}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-secondary-500">Dividend</p>
            <p className="font-semibold text-success-600">{formatCurrency(report.dividendPool)}</p>
          </div>
          <Button onClick={onReview} leftIcon={<Eye className="w-4 h-4" />}>
            Review
          </Button>
        </div>
      </div>
    </CardContent>
  </Card>
);

export default RevenueVerification;
