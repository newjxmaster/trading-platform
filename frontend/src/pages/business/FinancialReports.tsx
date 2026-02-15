import React, { useEffect, useState } from 'react';
import { 
  FileText, 
  TrendingUp, 
  Calendar, 
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  DollarSign,
  Building2,
  X
} from 'lucide-react';
import { Card, CardHeader, CardContent } from '@components/ui/Card';
import { Button } from '@components/ui/Button';
import { Badge } from '@components/ui/Badge';
import { LoadingSpinner } from '@components/feedback/LoadingSpinner';
import { RevenueChart } from '@components/charts/RevenueChart';
import { useAuthStore } from '@stores/authStore';
import { companyApi, revenueApi } from '@services/api';
import { Company, RevenueReport, RevenueVerificationStatus } from '../../types';
import { formatCurrency } from '../../utils/formatters';

// ============================================
// Financial Reports Component
// ============================================

export const FinancialReports: React.FC = () => {
  const { user } = useAuthStore();
  
  const [company, setCompany] = useState<Company | null>(null);
  const [reports, setReports] = useState<RevenueReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedReport, setSelectedReport] = useState<RevenueReport | null>(null);

  // ============================================
  // Fetch Data
  // ============================================

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      // Get company
      const companyRes = await companyApi.getAll({ filter: `owner:${user.id}` });
      if (companyRes.data.success && companyRes.data.data) {
        const companies = companyRes.data.data as Company[];
        if (companies.length > 0) {
          setCompany(companies[0]);
          
          // Get revenue reports
          const reportsRes = await revenueApi.getReports(companies[0].id);
          if (reportsRes.data.success && reportsRes.data.data) {
            setReports((reportsRes.data.data as { reports: RevenueReport[] }).reports);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================
  // Sync Bank Data
  // ============================================

  const handleSync = async () => {
    if (!company) return;
    
    setIsSyncing(true);
    try {
      const response = await revenueApi.sync(company.id);
      if (response.data.success) {
        await fetchData();
      }
    } catch (error) {
      console.error('Error syncing data:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  // ============================================
  // Calculate Stats
  // ============================================

  const totalRevenue = reports.reduce((sum, r) => sum + r.netRevenue, 0);
  const totalProfit = reports.reduce((sum, r) => sum + r.netProfit, 0);
  const totalDividends = reports.reduce((sum, r) => sum + r.dividendPool, 0);
  const avgMonthlyRevenue = reports.length > 0 ? totalRevenue / reports.length : 0;

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
  // Render No Company State
  // ============================================

  if (!company) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <div className="w-20 h-20 bg-secondary-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Building2 className="w-10 h-10 text-secondary-400" />
        </div>
        <h2 className="text-2xl font-bold text-secondary-900 mb-2">
          No Company Found
        </h2>
        <p className="text-secondary-500">
          Register your company to view financial reports
        </p>
      </div>
    );
  }

  // ============================================
  // Render Financial Reports
  // ============================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">Financial Reports</h1>
          <p className="text-secondary-500 mt-1">
            View and manage your business revenue reports
          </p>
        </div>
        <Button
          onClick={handleSync}
          isLoading={isSyncing}
          disabled={!company.bankApiConnected}
          leftIcon={<RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />}
        >
          Sync from Bank
        </Button>
      </div>

      {/* Bank Connection Status */}
      {!company.bankApiConnected && (
        <div className="flex items-center gap-3 p-4 bg-warning-50 rounded-lg">
          <AlertCircle className="w-5 h-5 text-warning-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-warning-800 font-medium">Bank Account Not Connected</p>
            <p className="text-warning-600 text-sm">
              Connect your bank account to automatically sync revenue data
            </p>
          </div>
          <Button size="sm" variant="outline">
            Connect Bank
          </Button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Revenue"
          value={formatCurrency(totalRevenue)}
          icon={TrendingUp}
          color="primary"
        />
        <StatCard
          title="Net Profit"
          value={formatCurrency(totalProfit)}
          icon={DollarSign}
          color="success"
        />
        <StatCard
          title="Dividends Paid"
          value={formatCurrency(totalDividends)}
          icon={Calendar}
          color="warning"
        />
        <StatCard
          title="Avg Monthly"
          value={formatCurrency(avgMonthlyRevenue)}
          icon={Calendar}
          color="secondary"
        />
      </div>

      {/* Revenue Chart */}
      <Card>
        <CardHeader title="Revenue Trend" />
        <CardContent>
          <RevenueChart data={reports} height={350} />
        </CardContent>
      </Card>

      {/* Reports Table */}
      <Card>
        <CardHeader 
          title="Monthly Reports" 
          subtitle={`${reports.length} reports`}
        />
        <CardContent>
          {reports.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-secondary-300 mx-auto mb-3" />
              <p className="text-secondary-500">No revenue reports yet</p>
              <p className="text-sm text-secondary-400 mt-1">
                Reports will be generated automatically after bank sync
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-secondary-200">
                    <th className="text-left py-3 px-4 text-sm font-medium text-secondary-500">Period</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-secondary-500">Revenue</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-secondary-500">Costs</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-secondary-500">Profit</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-secondary-500">Dividend</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-secondary-500">Status</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-secondary-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((report) => (
                    <tr 
                      key={report.id} 
                      className="border-b border-secondary-100 hover:bg-secondary-50 cursor-pointer"
                      onClick={() => setSelectedReport(report)}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-secondary-400" />
                          <span className="font-medium">
                            {report.reportMonth}/{report.reportYear}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {formatCurrency(report.netRevenue)}
                      </td>
                      <td className="py-3 px-4 text-right text-danger-600">
                        {formatCurrency(report.totalWithdrawals)}
                      </td>
                      <td className="py-3 px-4 text-right text-success-600 font-medium">
                        {formatCurrency(report.netProfit)}
                      </td>
                      <td className="py-3 px-4 text-right text-success-600">
                        {formatCurrency(report.dividendPool)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <StatusBadge status={report.verificationStatus} />
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Button size="sm" variant="ghost">
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Report Detail Modal */}
      {selectedReport && (
        <ReportDetailModal
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
          totalShares={company.totalShares}
        />
      )}
    </div>
  );
};

// ============================================
// Stat Card Component
// ============================================

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ElementType;
  color: 'primary' | 'success' | 'warning' | 'secondary';
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, color }) => {
  const colorClasses = {
    primary: 'bg-primary-100 text-primary-600',
    success: 'bg-success-100 text-success-600',
    warning: 'bg-warning-100 text-warning-600',
    secondary: 'bg-secondary-100 text-secondary-600',
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm text-secondary-500">{title}</p>
            <p className="text-lg font-bold text-secondary-900">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// ============================================
// Status Badge Component
// ============================================

const StatusBadge: React.FC<{ status: RevenueVerificationStatus }> = ({ status }) => {
  const statusConfig = {
    auto_verified: { variant: 'success' as const, icon: CheckCircle2, label: 'Auto' },
    pending_review: { variant: 'warning' as const, icon: Clock, label: 'Pending' },
    verified: { variant: 'success' as const, icon: CheckCircle2, label: 'Verified' },
    rejected: { variant: 'danger' as const, icon: AlertCircle, label: 'Rejected' },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className="gap-1">
      <Icon className="w-3 h-3" />
      {config.label}
    </Badge>
  );
};

// ============================================
// Report Detail Modal Component
// ============================================

interface ReportDetailModalProps {
  report: RevenueReport;
  onClose: () => void;
  totalShares: number;
}

const ReportDetailModal: React.FC<ReportDetailModalProps> = ({ report, onClose, totalShares }) => {
  const dividendPerShare = report.dividendPool / totalShares;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-auto">
        <div className="p-6 border-b border-secondary-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-secondary-900">
            Report Details - {report.reportMonth}/{report.reportYear}
          </h3>
          <button onClick={onClose} className="text-secondary-400 hover:text-secondary-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-secondary-50 rounded-lg">
              <p className="text-sm text-secondary-500">Total Deposits</p>
              <p className="text-lg font-semibold text-success-600">
                {formatCurrency(report.totalDeposits)}
              </p>
            </div>
            <div className="p-4 bg-secondary-50 rounded-lg">
              <p className="text-sm text-secondary-500">Total Withdrawals</p>
              <p className="text-lg font-semibold text-danger-600">
                {formatCurrency(report.totalWithdrawals)}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b border-secondary-100">
              <span className="text-secondary-500">Net Revenue</span>
              <span className="font-medium">{formatCurrency(report.netRevenue)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-secondary-100">
              <span className="text-secondary-500">Operating Costs</span>
              <span className="font-medium">{formatCurrency(report.operatingCosts || 0)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-secondary-100">
              <span className="text-secondary-500">Gross Profit</span>
              <span className="font-medium">{formatCurrency(report.grossProfit)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-secondary-100">
              <span className="text-secondary-500">Platform Fee (5%)</span>
              <span className="font-medium text-danger-600">-{formatCurrency(report.platformFee)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-secondary-100">
              <span className="text-secondary-500">Net Profit</span>
              <span className="font-semibold text-success-600">{formatCurrency(report.netProfit)}</span>
            </div>
          </div>

          <div className="p-4 bg-success-50 rounded-lg">
            <p className="text-sm text-success-700 mb-2">Dividend Distribution</p>
            <div className="flex justify-between">
              <span className="text-success-800">Total Dividend Pool</span>
              <span className="font-semibold text-success-800">
                {formatCurrency(report.dividendPool)}
              </span>
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-success-800">Per Share</span>
              <span className="font-semibold text-success-800">
                {formatCurrency(dividendPerShare)}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-secondary-500">Verification Status</span>
            <StatusBadge status={report.verificationStatus} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinancialReports;
