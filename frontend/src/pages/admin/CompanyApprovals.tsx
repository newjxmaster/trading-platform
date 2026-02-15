import React, { useEffect, useState } from 'react';
import { 
  Building2, 
  CheckCircle2, 
  XCircle, 
  Eye,
  FileText,
  Image,
  User,
  Search,
  Filter,
  AlertCircle,
  Clock
} from 'lucide-react';
import { Card, CardContent } from '@components/ui/Card';
import { Button } from '@components/ui/Button';
import { Input } from '@components/ui/Input';
import { Badge } from '@components/ui/Badge';
import { Modal } from '@components/ui/Modal';
import { LoadingSpinner } from '@components/feedback/LoadingSpinner';
import { adminApi } from '@services/api';
import { Company } from '../../types';
import { formatCurrency, formatDate, formatBusinessType } from '@utils/formatters';

// ============================================
// Company Approvals Component
// ============================================

interface VerificationChecklist {
  registrationCertificate: boolean;
  managerIdCard: boolean;
  businessPhoto: boolean;
  bankConnected: boolean;
  ipoDetails: boolean;
}

export const CompanyApprovals: React.FC = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [_checklist, _setChecklist] = useState<VerificationChecklist>({
    registrationCertificate: false,
    managerIdCard: false,
    businessPhoto: false,
    bankConnected: false,
    ipoDetails: false,
  });
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // ============================================
  // Fetch Data
  // ============================================

  useEffect(() => {
    fetchPendingCompanies();
  }, []);

  const fetchPendingCompanies = async () => {
    setIsLoading(true);
    try {
      const response = await adminApi.getPendingCompanies();
      if (response.data.success && response.data.data) {
        const data = response.data.data as Company[];
        setCompanies(data);
        setFilteredCompanies(data);
      }
    } catch (error) {
      console.error('Error fetching pending companies:', error);
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
      setFilteredCompanies(
        companies.filter(c =>
          c.businessName.toLowerCase().includes(query) ||
          c.category?.toLowerCase().includes(query)
        )
      );
    } else {
      setFilteredCompanies(companies);
    }
  }, [searchQuery, companies]);

  // ============================================
  // Approval Handlers
  // ============================================

  const handleApprove = async () => {
    if (!selectedCompany) return;
    
    setIsProcessing(true);
    try {
      const response = await adminApi.verifyCompany(selectedCompany.id, {
        status: 'approved',
      });
      
      if (response.data.success) {
        setCompanies(prev => prev.filter(c => c.id !== selectedCompany.id));
        setSelectedCompany(null);
      }
    } catch (error) {
      console.error('Error approving company:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedCompany || !rejectionReason) return;
    
    setIsProcessing(true);
    try {
      const response = await adminApi.verifyCompany(selectedCompany.id, {
        status: 'rejected',
        reason: rejectionReason,
      });
      
      if (response.data.success) {
        setCompanies(prev => prev.filter(c => c.id !== selectedCompany.id));
        setSelectedCompany(null);
        setShowRejectionModal(false);
        setRejectionReason('');
      }
    } catch (error) {
      console.error('Error rejecting company:', error);
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
  // Render Company Approvals
  // ============================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">Company Approvals</h1>
          <p className="text-secondary-500 mt-1">
            Review and approve pending company applications
          </p>
        </div>
        <Badge variant="warning" className="text-base px-4 py-2">
          {companies.length} Pending
        </Badge>
      </div>

      {/* Search */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" />
          <Input
            placeholder="Search companies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" leftIcon={<Filter className="w-4 h-4" />}>
          Filter
        </Button>
      </div>

      {/* Companies List */}
      {filteredCompanies.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <CheckCircle2 className="w-16 h-16 text-success-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-secondary-900 mb-2">
              All Caught Up!
            </h3>
            <p className="text-secondary-500">
              No pending company approvals at the moment
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredCompanies.map((company) => (
            <CompanyCard
              key={company.id}
              company={company}
              onReview={() => setSelectedCompany(company)}
            />
          ))}
        </div>
      )}

      {/* Review Modal */}
      {selectedCompany && (
        <Modal
          isOpen={!!selectedCompany}
          onClose={() => setSelectedCompany(null)}
          title="Review Company Application"
          size="lg"
        >
          <div className="space-y-6">
            {/* Company Info */}
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 bg-primary-100 rounded-xl flex items-center justify-center">
                <Building2 className="w-8 h-8 text-primary-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-secondary-900">
                  {selectedCompany.businessName}
                </h3>
                <p className="text-secondary-500">
                  {formatBusinessType(selectedCompany.businessType)} • {selectedCompany.category}
                </p>
                <p className="text-sm text-secondary-400 mt-1">
                  Submitted: {formatDate(selectedCompany.createdAt)}
                </p>
              </div>
            </div>

            {/* Description */}
            <div className="p-4 bg-secondary-50 rounded-lg">
              <p className="text-sm text-secondary-600">{selectedCompany.description}</p>
            </div>

            {/* Verification Checklist */}
            <div>
              <h4 className="font-medium text-secondary-900 mb-3">Verification Checklist</h4>
              <div className="space-y-2">
                <ChecklistItem
                  label="Registration Certificate"
                  checked={!!selectedCompany.registrationCertificateUrl}
                  onChange={(checked: boolean) => _setChecklist((prev: VerificationChecklist) => ({ ...prev, registrationCertificate: checked }))}
                />
                <ChecklistItem
                  label="Manager ID Card"
                  checked={!!selectedCompany.managerIdCardUrl}
                  onChange={(checked: boolean) => _setChecklist((prev: VerificationChecklist) => ({ ...prev, managerIdCard: checked }))}
                />
                <ChecklistItem
                  label="Business Photo"
                  checked={!!selectedCompany.businessPhotoUrl}
                  onChange={(checked: boolean) => _setChecklist((prev: VerificationChecklist) => ({ ...prev, businessPhoto: checked }))}
                />
                <ChecklistItem
                  label="Bank Account Connected"
                  checked={selectedCompany.bankApiConnected}
                  onChange={(checked: boolean) => _setChecklist((prev: VerificationChecklist) => ({ ...prev, bankConnected: checked }))}
                />
                <ChecklistItem
                  label="IPO Details Configured"
                  checked={selectedCompany.initialValuation > 0}
                  onChange={(checked: boolean) => _setChecklist((prev: VerificationChecklist) => ({ ...prev, ipoDetails: checked }))}
                />
              </div>
            </div>

            {/* Documents */}
            <div>
              <h4 className="font-medium text-secondary-900 mb-3">Documents</h4>
              <div className="grid grid-cols-3 gap-3">
                <DocumentPreview
                  title="Registration"
                  url={selectedCompany.registrationCertificateUrl}
                  icon={FileText}
                />
                <DocumentPreview
                  title="ID Card"
                  url={selectedCompany.managerIdCardUrl}
                  icon={User}
                />
                <DocumentPreview
                  title="Business Photo"
                  url={selectedCompany.businessPhotoUrl}
                  icon={Image}
                />
              </div>
            </div>

            {/* IPO Details */}
            {selectedCompany.initialValuation > 0 && (
              <div className="p-4 bg-secondary-50 rounded-lg">
                <h4 className="font-medium text-secondary-900 mb-3">IPO Details</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-secondary-500">Valuation</p>
                    <p className="font-medium">{formatCurrency(selectedCompany.initialValuation)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-secondary-500">Total Shares</p>
                    <p className="font-medium">{selectedCompany.totalShares.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-secondary-500">Share Price</p>
                    <p className="font-medium">{formatCurrency(selectedCompany.currentPrice)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-secondary-500">Bank</p>
                    <p className="font-medium">{selectedCompany.partnerBankName}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-secondary-200">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setSelectedCompany(null)}
              >
                Close
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                onClick={() => setShowRejectionModal(true)}
                leftIcon={<XCircle className="w-4 h-4" />}
              >
                Reject
              </Button>
              <Button
                className="flex-1"
                onClick={handleApprove}
                isLoading={isProcessing}
                leftIcon={<CheckCircle2 className="w-4 h-4" />}
              >
                Approve
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Rejection Modal */}
      <Modal
        isOpen={showRejectionModal}
        onClose={() => setShowRejectionModal(false)}
        title="Reject Application"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-danger-50 rounded-lg">
            <AlertCircle className="w-5 h-5 text-danger-500" />
            <p className="text-sm text-danger-700">
              Please provide a reason for rejection
            </p>
          </div>
          <textarea
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Enter rejection reason..."
            rows={4}
            className="w-full px-4 py-2.5 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowRejectionModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              onClick={handleReject}
              isLoading={isProcessing}
              disabled={!rejectionReason}
            >
              Confirm Rejection
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// ============================================
// Company Card Component
// ============================================

interface CompanyCardProps {
  company: Company;
  onReview: () => void;
}

const CompanyCard: React.FC<CompanyCardProps> = ({ company, onReview }) => (
  <Card className="hover:shadow-elevated transition-shadow">
    <CardContent className="p-5">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
            <Building2 className="w-6 h-6 text-primary-600" />
          </div>
          <div>
            <h3 className="font-semibold text-secondary-900">{company.businessName}</h3>
            <p className="text-sm text-secondary-500">
              {formatBusinessType(company.businessType)}
            </p>
          </div>
        </div>
        <Badge variant="warning">Pending</Badge>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-2 bg-secondary-50 rounded-lg">
          <p className="text-xs text-secondary-500">Category</p>
          <p className="text-sm font-medium capitalize">{company.category || 'N/A'}</p>
        </div>
        <div className="p-2 bg-secondary-50 rounded-lg">
          <p className="text-xs text-secondary-500">Valuation</p>
          <p className="text-sm font-medium">{formatCurrency(company.initialValuation)}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm text-secondary-500 mb-4">
        <Clock className="w-4 h-4" />
        <span>Submitted {formatDate(company.createdAt)}</span>
      </div>

      <Button onClick={onReview} className="w-full" leftIcon={<Eye className="w-4 h-4" />}>
        Review Application
      </Button>
    </CardContent>
  </Card>
);

// ============================================
// Checklist Item Component
// ============================================

interface ChecklistItemProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

const ChecklistItem: React.FC<ChecklistItemProps> = ({ label, checked, onChange }) => (
  <label className="flex items-center gap-3 p-3 bg-secondary-50 rounded-lg cursor-pointer hover:bg-secondary-100 transition-colors">
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="w-5 h-5 text-primary-600 rounded border-secondary-300 focus:ring-primary-500"
    />
    <span className={`flex-1 ${checked ? 'text-secondary-900' : 'text-secondary-500'}`}>
      {label}
    </span>
    {checked && <CheckCircle2 className="w-5 h-5 text-success-500" />}
  </label>
);

// ============================================
// Document Preview Component
// ============================================

interface DocumentPreviewProps {
  title: string;
  url?: string;
  icon: React.ElementType;
}

const DocumentPreview: React.FC<DocumentPreviewProps> = ({ title, url, icon: Icon }) => (
  <div className={`p-3 rounded-lg border-2 ${url ? 'border-success-200 bg-success-50' : 'border-secondary-200 bg-secondary-50'}`}>
    <div className={`w-10 h-10 rounded-lg flex items-center justify-center mx-auto mb-2 ${url ? 'bg-success-100' : 'bg-secondary-100'}`}>
      <Icon className={`w-5 h-5 ${url ? 'text-success-600' : 'text-secondary-400'}`} />
    </div>
    <p className="text-xs text-center text-secondary-600">{title}</p>
    {url && (
      <a 
        href={url} 
        target="_blank" 
        rel="noopener noreferrer"
        className="text-xs text-primary-600 text-center block mt-1 hover:underline"
      >
        View
      </a>
    )}
  </div>
);

export default CompanyApprovals;
