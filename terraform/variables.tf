# Trading Platform - Terraform Variables
# Configurable infrastructure parameters

# =============================================================================
# GENERAL
# =============================================================================

variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "trading-platform"
}

variable "environment" {
  description = "Environment name (production, staging, development)"
  type        = string
  default     = "production"
  
  validation {
    condition     = contains(["production", "staging", "development"], var.environment)
    error_message = "Environment must be production, staging, or development."
  }
}

variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

variable "domain_name" {
  description = "Primary domain name for the application"
  type        = string
  default     = "tradingplatform.com"
}

# =============================================================================
# NETWORKING
# =============================================================================

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "az_count" {
  description = "Number of availability zones to use"
  type        = number
  default     = 2
}

# =============================================================================
# DATABASE
# =============================================================================

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.medium"
}

variable "db_allocated_storage" {
  description = "Initial storage allocation for RDS (GB)"
  type        = number
  default     = 100
}

variable "db_max_allocated_storage" {
  description = "Maximum storage allocation for RDS (GB)"
  type        = number
  default     = 500
}

variable "db_backup_retention" {
  description = "Number of days to retain database backups"
  type        = number
  default     = 30
}

# =============================================================================
# REDIS
# =============================================================================

variable "redis_node_type" {
  description = "ElastiCache Redis node type"
  type        = string
  default     = "cache.t3.micro"
}

# =============================================================================
# ECS
# =============================================================================

variable "backend_cpu" {
  description = "CPU units for backend task"
  type        = number
  default     = 512
}

variable "backend_memory" {
  description = "Memory for backend task (MB)"
  type        = number
  default     = 1024
}

variable "frontend_cpu" {
  description = "CPU units for frontend task"
  type        = number
  default     = 256
}

variable "frontend_memory" {
  description = "Memory for frontend task (MB)"
  type        = number
  default     = 512
}

variable "backend_desired_count" {
  description = "Desired number of backend tasks"
  type        = number
  default     = 2
}

variable "frontend_desired_count" {
  description = "Desired number of frontend tasks"
  type        = number
  default     = 2
}

# =============================================================================
# LOGGING
# =============================================================================

variable "log_retention_days" {
  description = "Number of days to retain CloudWatch logs"
  type        = number
  default     = 30
}

# =============================================================================
# MONITORING
# =============================================================================

variable "alert_email" {
  description = "Email address for alerts"
  type        = string
  default     = "admin@tradingplatform.com"
}

# =============================================================================
# TAGS
# =============================================================================

variable "common_tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
  default = {
    Project   = "Trading Platform"
    ManagedBy = "Terraform"
  }
}
