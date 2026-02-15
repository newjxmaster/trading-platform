# Company Management Module

Complete company registration, verification, and management system for the Trading Platform.

## Features

### Multi-Step Company Registration (6 Steps)

1. **Business Information** - Name, type, category, description, address, years in operation
2. **Document Upload** - Registration certificate, manager ID, business photo
3. **Bank Account Connection** - Partner bank integration with verification
4. **IPO Configuration** - Valuation, shares, pricing with auto-calculations
5. **Review & Submit** - Summary before submission
6. **Admin Verification** - Pending approval queue

### Document Upload Service

- **Storage**: AWS S3 or Cloudinary
- **Supported Types**: PDF, JPG, PNG
- **Size Limits**: 5MB for documents, 10MB for photos
- **Features**: Validation, signed URLs, deletion

### Admin Verification System

- **Verification Checklist**:
  - Registration Certificate (valid, matches, not expired)
  - Manager ID Card (clear, valid, name matches)
  - Business Photo (actual business, quality, location)
  - Bank Account (connected, verified)
  - IPO Details (reasonable valuation)

- **Actions**: Approve, Reject, Request More Info

### IPO Configuration

- Auto-calculated share price: `Valuation ÷ Total Shares`
- Public offering: 50-90% (default 70%)
- Capital raised calculation
- Minimum investment validation

## API Endpoints

### Company Routes (`/api/companies`)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/register` | Complete registration | Business Owner |
| POST | `/register/step1` | Save business info | Business Owner |
| POST | `/register/step2/:companyId` | Upload documents | Business Owner |
| POST | `/register/step3/:companyId` | Connect bank | Business Owner |
| POST | `/register/step4/:companyId` | Configure IPO | Business Owner |
| POST | `/register/submit/:companyId` | Submit for verification | Business Owner |
| POST | `/ipo/calculate` | Preview IPO calculation | Business Owner |
| GET | `/` | List companies | Public |
| GET | `/my` | Get user's companies | Business Owner |
| GET | `/document-requirements` | Get doc requirements | Public |
| GET | `/:id` | Get company details | Public |
| GET | `/:id/financials` | Get revenue reports | Public |
| GET | `/:id/shareholders` | Get shareholders | Public |
| GET | `/:id/metrics` | Get performance metrics | Public |
| PATCH | `/:id` | Update company | Owner/Admin |
| POST | `/:id/documents` | Upload document | Business Owner |
| GET | `/:id/documents/:documentKey/url` | Get document URL | Owner/Admin |

### Admin Routes (`/api/admin`)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/dashboard/stats` | Platform statistics | Admin |
| GET | `/logs` | Admin action logs | Admin |
| GET | `/companies/pending` | Pending companies | Admin |
| GET | `/companies/pending/:id` | Pending company details | Admin |
| GET | `/companies/all` | All companies | Admin |
| GET | `/companies/:id` | Full company details | Admin |
| PATCH | `/companies/:id/verify` | Approve/Reject company | Admin |
| GET | `/companies/:id/document-url` | Get document for review | Admin |
| POST | `/companies/:id/suspend` | Suspend company | Admin |
| POST | `/companies/:id/reactivate` | Reactivate company | Admin |
| GET | `/revenue/pending` | Pending revenue reports | Admin |
| GET | `/revenue/:id` | Revenue report details | Admin |
| PATCH | `/revenue/:id/verify` | Verify/Reject revenue | Admin |
| GET | `/users` | List all users | Admin |
| GET | `/users/:id` | User details | Admin |
| PATCH | `/users/:id/kyc` | Update KYC status | Admin |

## Usage Example

### Register a Company

```typescript
import { companyService } from './companies';

// Step 1: Business Information
const step1Result = await companyService.saveStep1(ownerId, {
  business_name: "SuperMart ABC",
  business_type: BusinessType.SMALL_BUSINESS,
  category: BusinessCategory.SUPERMARKET,
  description: "A local supermarket providing...",
  physical_address: "123 Main Street, City",
  years_in_operation: 5,
});

// Step 2: Documents (with file uploads)
const step2Result = await companyService.saveStep2(companyId, {
  registration_certificate: file1,
  manager_id_card: file2,
  business_photo: file3,
});

// Step 3: Bank Connection
const step3Result = await companyService.saveStep3(companyId, {
  partner_bank_name: "Ecobank",
  bank_account_number: "1234567890",
});

// Step 4: IPO Configuration
const step4Result = await companyService.saveStep4(companyId, {
  initial_valuation: 100000,
  total_shares: 10000,
  public_offering_percentage: 70,
  minimum_investment: 100,
});

// Submit for verification
await companyService.submitForVerification(companyId);
```

### Admin Verification

```typescript
import { adminService } from './companies';

// Get pending companies
const pending = await adminService.getPendingCompanies();

// Approve a company
await adminService.verifyCompany(companyId, adminId, {
  registration_certificate_verified: true,
  manager_id_verified: true,
  business_photo_verified: true,
  bank_account_verified: true,
  ipo_details_reviewed: true,
  ipo_assessment: 'reasonable',
});

// Reject a company
await adminService.rejectCompany(companyId, adminId, 
  "Document unclear",
  "Please provide a clearer registration certificate"
);
```

## Environment Variables

```bash
# Storage Provider (s3 or cloudinary)
STORAGE_PROVIDER=s3

# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_REGION=us-east-1
AWS_S3_BUCKET=trading-platform-documents

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# JWT Configuration
JWT_SECRET=your_jwt_secret
JWT_EXPIRE=15m
```

## Database Schema

The module uses the following Prisma models:

- `companies` - Company information and IPO details
- `verification_checklist` - Admin verification checklist
- `revenue_reports` - Monthly revenue reports
- `stock_holdings` - Shareholder information
- `admin_logs` - Admin action audit trail
