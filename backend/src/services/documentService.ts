/**
 * Document Upload Service
 * Trading Platform for Small & Medium Businesses
 * 
 * Handles document uploads to AWS S3 or Cloudinary
 * Supports: PDF, JPG, PNG (max 10MB)
 */

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';
import {
  DocumentType,
  FileUpload,
  DocumentValidationResult,
  DocumentUploadResult,
  DocumentDeleteResult,
  SignedUrlResult,
  UploadedDocument,
} from '../types/company.types';

// ============================================================================
// CONFIGURATION
// ============================================================================

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
};

const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'];

// Document type specific size limits
const DOCUMENT_SIZE_LIMITS: Record<DocumentType, number> = {
  [DocumentType.REGISTRATION_CERTIFICATE]: 5 * 1024 * 1024, // 5MB
  [DocumentType.MANAGER_ID_CARD]: 5 * 1024 * 1024, // 5MB
  [DocumentType.BUSINESS_PHOTO]: 10 * 1024 * 1024, // 10MB
  [DocumentType.TAX_CERTIFICATE]: 5 * 1024 * 1024, // 5MB
  [DocumentType.BANK_STATEMENT]: 5 * 1024 * 1024, // 5MB
  [DocumentType.OTHER]: 10 * 1024 * 1024, // 10MB
};

// Image resolution requirements
const MIN_IMAGE_DIMENSIONS = {
  width: 800,
  height: 600,
};

// ============================================================================
// STORAGE PROVIDER CONFIGURATION
// ============================================================================

type StorageProvider = 's3' | 'cloudinary';

const STORAGE_PROVIDER: StorageProvider = (process.env.STORAGE_PROVIDER as StorageProvider) || 's3';

// AWS S3 Configuration
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const S3_BUCKET = process.env.AWS_S3_BUCKET || 'trading-platform-documents';

// Cloudinary Configuration
if (STORAGE_PROVIDER === 'cloudinary') {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

// ============================================================================
// DOCUMENT SERVICE CLASS
// ============================================================================

export class DocumentService {
  private storageProvider: StorageProvider;

  constructor(provider: StorageProvider = STORAGE_PROVIDER) {
    this.storageProvider = provider;
  }

  // ============================================================================
  // VALIDATION METHODS
  // ============================================================================

  /**
   * Validate document before upload
   * Checks file type, size, and basic integrity
   */
  public validateDocument(
    file: FileUpload,
    documentType: DocumentType
  ): DocumentValidationResult {
    const errors: string[] = [];

    // Check if file exists
    if (!file || !file.buffer) {
      errors.push('No file provided');
      return { isValid: false, errors };
    }

    // Validate MIME type
    if (!this.isValidMimeType(file.mimetype)) {
      errors.push(
        `Invalid file type: ${file.mimetype}. Allowed types: PDF, JPG, PNG`
      );
    }

    // Validate file size
    const sizeLimit = DOCUMENT_SIZE_LIMITS[documentType] || MAX_FILE_SIZE;
    if (file.size > sizeLimit) {
      errors.push(
        `File size (${this.formatFileSize(file.size)}) exceeds limit of ${this.formatFileSize(sizeLimit)}`
      );
    }

    // Validate minimum file size (prevent empty files)
    if (file.size < 1024) {
      errors.push('File is too small (minimum 1KB)');
    }

    // Validate file extension
    const extension = this.getFileExtension(file.originalname);
    if (!ALLOWED_EXTENSIONS.includes(extension.toLowerCase())) {
      errors.push(`Invalid file extension: ${extension}`);
    }

    // For images, validate dimensions
    if (this.isImageFile(file.mimetype) && documentType === DocumentType.BUSINESS_PHOTO) {
      // Note: Image dimension validation would require sharp or similar library
      // This is a placeholder for that validation
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Quick validation for multiple documents
   */
  public validateMultipleDocuments(
    files: Array<{ file: FileUpload; documentType: DocumentType }>
  ): { isValid: boolean; results: Array<{ documentType: DocumentType; result: DocumentValidationResult }> } {
    let allValid = true;
    const results = files.map(({ file, documentType }) => {
      const result = this.validateDocument(file, documentType);
      if (!result.isValid) allValid = false;
      return { documentType, result };
    });

    return { isValid: allValid, results };
  }

  // ============================================================================
  // UPLOAD METHODS
  // ============================================================================

  /**
   * Upload a document to storage (S3 or Cloudinary)
   */
  public async uploadDocument(
    file: FileUpload,
    documentType: DocumentType,
    companyId: string,
    metadata?: Record<string, string>
  ): Promise<DocumentUploadResult> {
    try {
      // Validate first
      const validation = this.validateDocument(file, documentType);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.errors.join(', '),
        };
      }

      // Generate unique filename
      const key = this.generateFileKey(documentType, companyId, file.originalname);

      if (this.storageProvider === 's3') {
        return await this.uploadToS3(file, key, metadata);
      } else {
        return await this.uploadToCloudinary(file, documentType, companyId);
      }
    } catch (error) {
      console.error('Document upload error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown upload error',
      };
    }
  }

  /**
   * Upload multiple documents
   */
  public async uploadMultipleDocuments(
    files: Array<{
      file: FileUpload;
      documentType: DocumentType;
      metadata?: Record<string, string>;
    }>,
    companyId: string
  ): Promise<Array<DocumentUploadResult & { documentType: DocumentType }>> {
    const uploadPromises = files.map(async ({ file, documentType, metadata }) => {
      const result = await this.uploadDocument(file, documentType, companyId, metadata);
      return { ...result, documentType };
    });

    return Promise.all(uploadPromises);
  }

  /**
   * Upload to AWS S3
   */
  private async uploadToS3(
    file: FileUpload,
    key: string,
    metadata?: Record<string, string>
  ): Promise<DocumentUploadResult> {
    const command = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      Metadata: {
        'original-name': file.originalname,
        'uploaded-at': new Date().toISOString(),
        ...metadata,
      },
    });

    await s3Client.send(command);

    // Generate URL
    const url = `https://${S3_BUCKET}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`;

    return {
      success: true,
      url,
      key,
    };
  }

  /**
   * Upload to Cloudinary
   */
  private async uploadToCloudinary(
    file: FileUpload,
    documentType: DocumentType,
    companyId: string
  ): Promise<DocumentUploadResult> {
    return new Promise((resolve, reject) => {
      const folder = `trading-platform/${companyId}/${documentType}`;
      
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'auto',
          public_id: this.generateFileName(documentType, file.originalname),
          context: {
            company_id: companyId,
            document_type: documentType,
            original_name: file.originalname,
          },
        },
        (error, result) => {
          if (error) {
            reject({
              success: false,
              error: error.message,
            });
          } else if (result) {
            resolve({
              success: true,
              url: result.secure_url,
              key: result.public_id,
            });
          }
        }
      );

      // Convert buffer to stream and pipe to uploadStream
      const readableStream = Readable.from(file.buffer);
      readableStream.pipe(uploadStream);
    });
  }

  // ============================================================================
  // URL GENERATION METHODS
  // ============================================================================

  /**
   * Generate a signed URL for accessing a private document
   */
  public async getDocumentUrl(key: string, expiresIn: number = 3600): Promise<SignedUrlResult> {
    if (this.storageProvider === 's3') {
      return this.getS3SignedUrl(key, expiresIn);
    } else {
      return this.getCloudinaryUrl(key, expiresIn);
    }
  }

  /**
   * Generate S3 signed URL
   */
  private async getS3SignedUrl(key: string, expiresIn: number): Promise<SignedUrlResult> {
    const command = new GetObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn });

    return {
      url,
      expires_at: new Date(Date.now() + expiresIn * 1000),
    };
  }

  /**
   * Get Cloudinary URL (with optional transformation)
   */
  private async getCloudinaryUrl(
    publicId: string,
    expiresIn: number
  ): Promise<SignedUrlResult> {
    // Cloudinary URLs are generally public, but we can use signed URLs if needed
    const url = cloudinary.url(publicId, {
      sign_url: true,
      long_url_signature: true,
    });

    return {
      url,
      expires_at: new Date(Date.now() + expiresIn * 1000),
    };
  }

  // ============================================================================
  // DELETE METHODS
  // ============================================================================

  /**
   * Delete a document from storage
   */
  public async deleteDocument(key: string): Promise<DocumentDeleteResult> {
    try {
      if (this.storageProvider === 's3') {
        return await this.deleteFromS3(key);
      } else {
        return await this.deleteFromCloudinary(key);
      }
    } catch (error) {
      console.error('Document deletion error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown deletion error',
      };
    }
  }

  /**
   * Delete multiple documents
   */
  public async deleteMultipleDocuments(keys: string[]): Promise<DocumentDeleteResult[]> {
    const deletePromises = keys.map((key) => this.deleteDocument(key));
    return Promise.all(deletePromises);
  }

  /**
   * Delete from S3
   */
  private async deleteFromS3(key: string): Promise<DocumentDeleteResult> {
    const command = new DeleteObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
    });

    await s3Client.send(command);

    return { success: true };
  }

  /**
   * Delete from Cloudinary
   */
  private async deleteFromCloudinary(publicId: string): Promise<DocumentDeleteResult> {
    const result = await cloudinary.uploader.destroy(publicId);

    if (result.result === 'ok') {
      return { success: true };
    } else {
      return {
        success: false,
        error: `Cloudinary deletion failed: ${result.result}`,
      };
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Check if MIME type is valid
   */
  private isValidMimeType(mimetype: string): boolean {
    return mimetype in ALLOWED_MIME_TYPES;
  }

  /**
   * Check if file is an image
   */
  private isImageFile(mimetype: string): boolean {
    return mimetype.startsWith('image/');
  }

  /**
   * Get file extension
   */
  private getFileExtension(filename: string): string {
    const lastDotIndex = filename.lastIndexOf('.');
    return lastDotIndex === -1 ? '' : filename.substring(lastDotIndex);
  }

  /**
   * Generate unique file key for S3
   */
  private generateFileKey(
    documentType: DocumentType,
    companyId: string,
    originalName: string
  ): string {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 10);
    const extension = this.getFileExtension(originalName);
    const sanitizedName = originalName
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .substring(0, 50);

    return `companies/${companyId}/${documentType}/${timestamp}-${randomString}-${sanitizedName}`;
  }

  /**
   * Generate file name for Cloudinary
   */
  private generateFileName(documentType: DocumentType, originalName: string): string {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 10);
    const baseName = originalName.replace(/\.[^/.]+$/, '');
    const sanitizedName = baseName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);

    return `${timestamp}-${randomString}-${sanitizedName}`;
  }

  /**
   * Format file size for display
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Extract document info from uploaded file
   */
  public createUploadedDocument(
    url: string,
    key: string,
    documentType: DocumentType,
    originalName: string,
    size: number
  ): UploadedDocument {
    return {
      url,
      key,
      document_type: documentType,
      original_name: originalName,
      size,
      uploaded_at: new Date(),
    };
  }

  /**
   * Get document requirements for a specific type
   */
  public getDocumentRequirements(documentType: DocumentType): {
    maxSize: number;
    allowedTypes: string[];
    description: string;
  } {
    const requirements: Record<DocumentType, { maxSize: number; allowedTypes: string[]; description: string }> = {
      [DocumentType.REGISTRATION_CERTIFICATE]: {
        maxSize: 5 * 1024 * 1024,
        allowedTypes: ['application/pdf', 'image/jpeg', 'image/png'],
        description: 'Company registration certificate (PDF, JPG, PNG, max 5MB)',
      },
      [DocumentType.MANAGER_ID_CARD]: {
        maxSize: 5 * 1024 * 1024,
        allowedTypes: ['application/pdf', 'image/jpeg', 'image/png'],
        description: 'Manager ID card - front and back (PDF, JPG, PNG, max 5MB)',
      },
      [DocumentType.BUSINESS_PHOTO]: {
        maxSize: 10 * 1024 * 1024,
        allowedTypes: ['image/jpeg', 'image/png'],
        description: 'Business exterior photo (JPG, PNG, max 10MB, min 800x600)',
      },
      [DocumentType.TAX_CERTIFICATE]: {
        maxSize: 5 * 1024 * 1024,
        allowedTypes: ['application/pdf', 'image/jpeg', 'image/png'],
        description: 'Tax compliance certificate (PDF, JPG, PNG, max 5MB)',
      },
      [DocumentType.BANK_STATEMENT]: {
        maxSize: 5 * 1024 * 1024,
        allowedTypes: ['application/pdf', 'image/jpeg', 'image/png'],
        description: 'Recent bank statement (PDF, JPG, PNG, max 5MB)',
      },
      [DocumentType.OTHER]: {
        maxSize: 10 * 1024 * 1024,
        allowedTypes: ['application/pdf', 'image/jpeg', 'image/png'],
        description: 'Other supporting documents (PDF, JPG, PNG, max 10MB)',
      },
    };

    return requirements[documentType];
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const documentService = new DocumentService();

export default documentService;
