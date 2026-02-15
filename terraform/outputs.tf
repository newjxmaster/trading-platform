# Trading Platform - Terraform Outputs
# Useful information after infrastructure creation

# =============================================================================
# VPC
# =============================================================================

output "vpc_id" {
  description = "ID of the VPC"
  value       = aws_vpc.main.id
}

output "vpc_cidr" {
  description = "CIDR block of the VPC"
  value       = aws_vpc.main.cidr_block
}

# =============================================================================
# SUBNETS
# =============================================================================

output "public_subnet_ids" {
  description = "IDs of public subnets"
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "IDs of private subnets"
  value       = aws_subnet.private[*].id
}

output "database_subnet_ids" {
  description = "IDs of database subnets"
  value       = aws_subnet.database[*].id
}

# =============================================================================
# DATABASE
# =============================================================================

output "db_endpoint" {
  description = "RDS endpoint"
  value       = aws_db_instance.main.endpoint
  sensitive   = true
}

output "db_name" {
  description = "RDS database name"
  value       = aws_db_instance.main.db_name
}

output "db_username" {
  description = "RDS username"
  value       = aws_db_instance.main.username
}

output "db_password" {
  description = "RDS password"
  value       = random_password.db_password.result
  sensitive   = true
}

# =============================================================================
# REDIS
# =============================================================================

output "redis_endpoint" {
  description = "Redis endpoint"
  value       = aws_elasticache_replication_group.main.primary_endpoint_address
  sensitive   = true
}

# =============================================================================
# LOAD BALANCER
# =============================================================================

output "alb_dns_name" {
  description = "DNS name of the Application Load Balancer"
  value       = aws_lb.main.dns_name
}

output "alb_zone_id" {
  description = "Zone ID of the Application Load Balancer"
  value       = aws_lb.main.zone_id
}

# =============================================================================
# ECR
# =============================================================================

output "ecr_backend_repository_url" {
  description = "URL of the backend ECR repository"
  value       = aws_ecr_repository.backend.repository_url
}

output "ecr_frontend_repository_url" {
  description = "URL of the frontend ECR repository"
  value       = aws_ecr_repository.frontend.repository_url
}

# =============================================================================
# S3
# =============================================================================

output "s3_documents_bucket" {
  description = "Name of the documents S3 bucket"
  value       = aws_s3_bucket.documents.id
}

output "s3_backups_bucket" {
  description = "Name of the backups S3 bucket"
  value       = aws_s3_bucket.backups.id
}

output "s3_logs_bucket" {
  description = "Name of the logs S3 bucket"
  value       = aws_s3_bucket.logs.id
}

# =============================================================================
# ECS
# =============================================================================

output "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  value       = aws_ecs_cluster.main.name
}

output "ecs_cluster_arn" {
  description = "ARN of the ECS cluster"
  value       = aws_ecs_cluster.main.arn
}

# =============================================================================
# SECURITY GROUPS
# =============================================================================

output "security_group_alb_id" {
  description = "ID of the ALB security group"
  value       = aws_security_group.alb.id
}

output "security_group_ecs_id" {
  description = "ID of the ECS tasks security group"
  value       = aws_security_group.ecs_tasks.id
}

output "security_group_database_id" {
  description = "ID of the database security group"
  value       = aws_security_group.database.id
}

# =============================================================================
# ROUTE 53
# =============================================================================

output "route53_zone_id" {
  description = "ID of the Route 53 zone"
  value       = data.aws_route53_zone.main.zone_id
}

# =============================================================================
# CERTIFICATE
# =============================================================================

output "acm_certificate_arn" {
  description = "ARN of the ACM certificate"
  value       = aws_acm_certificate.main.arn
}

# =============================================================================
# USEFUL COMMANDS
# =============================================================================

output "connect_to_database" {
  description = "Command to connect to the database"
  value       = "psql -h ${aws_db_instance.main.endpoint} -U ${aws_db_instance.main.username} -d ${aws_db_instance.main.db_name}"
  sensitive   = true
}

output "ssh_to_instance" {
  description = "SSH command placeholder"
  value       = "ssh -i ~/.ssh/trading-platform ec2-user@<instance-ip>"
}
