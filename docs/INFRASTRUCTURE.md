# Trading Platform - Infrastructure Documentation

Complete architecture overview and infrastructure details.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Technology Stack](#technology-stack)
3. [Network Architecture](#network-architecture)
4. [Database Architecture](#database-architecture)
5. [Container Orchestration](#container-orchestration)
6. [Security Architecture](#security-architecture)
7. [Monitoring & Observability](#monitoring--observability)
8. [Disaster Recovery](#disaster-recovery)
9. [Scaling Strategy](#scaling-strategy)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              INTERNET                                    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         CloudFlare / CDN                                │
│                    (DDoS Protection, Caching)                           │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      Load Balancer (NGINX/ALB)                          │
│              ┌──────────────────────────────────────┐                   │
│              │  SSL Termination, Rate Limiting      │                   │
│              │  WebSocket Support, Health Checks    │                   │
│              └──────────────────────────────────────┘                   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
            ┌───────────────────────┴───────────────────────┐
            ▼                                               ▼
┌──────────────────────────────┐              ┌──────────────────────────────┐
│      Frontend (React)        │              │      Backend API (Node.js)   │
│  ┌────────────────────────┐  │              │  ┌────────────────────────┐  │
│  │  Nginx Static Server   │  │              │  │  Express.js API        │  │
│  │  - Static Assets       │  │              │  │  - REST API            │  │
│  │  - Client-side Routing │  │              │  │  - WebSocket Server    │  │
│  └────────────────────────┘  │              │  │  - Authentication      │  │
│                              │              │  │  - Business Logic      │  │
│  Replicas: 2+                │              │  └────────────────────────┘  │
└──────────────────────────────┘              │                              │
                                              │  Replicas: 2+                │
                                              └──────────────────────────────┘
                                                               │
                                    ┌──────────────────────────┼──────────────────────────┐
                                    ▼                          ▼                          ▼
                         ┌─────────────────┐        ┌─────────────────┐        ┌─────────────────┐
                         │   PostgreSQL    │        │     Redis       │        │  Background     │
                         │   (Primary)     │        │  (Cache/Queue)  │        │    Workers      │
                         │                 │        │                 │        │                 │
                         │  - User Data    │        │  - Sessions     │        │  - Dividends    │
                         │  - Trading Data │        │  - Rate Limits  │        │  - Notifications│
                         │  - Financials   │        │  - Job Queues   │        │  - Emails       │
                         └─────────────────┘        └─────────────────┘        └─────────────────┘
                                    │
                         ┌──────────┴──────────┐
                         ▼                     ▼
                ┌─────────────────┐   ┌─────────────────┐
                │  PostgreSQL     │   │    S3 Storage   │
                │  (Read Replica) │   │                 │
                └─────────────────┘   │  - Documents    │
                                      │  - Backups      │
                                      │  - Logs         │
                                      └─────────────────┘
```

---

## Technology Stack

### Frontend

| Component | Technology | Purpose |
|-----------|------------|---------|
| Framework | React 18+ | UI Library |
| Language | TypeScript | Type Safety |
| Styling | Tailwind CSS | CSS Framework |
| State | Redux Toolkit | State Management |
| Charts | TradingView | Stock Charts |
| Build | Vite | Build Tool |

### Backend

| Component | Technology | Purpose |
|-----------|------------|---------|
| Runtime | Node.js 20+ | JavaScript Runtime |
| Framework | Express.js | Web Framework |
| ORM | Prisma | Database ORM |
| Auth | JWT | Authentication |
| Validation | Zod | Schema Validation |
| Queue | Bull + Redis | Job Processing |

### Database

| Component | Technology | Purpose |
|-----------|------------|---------|
| Primary DB | PostgreSQL 15 | Main Database |
| Cache | Redis 7 | Caching & Sessions |
| Queue | Redis 7 | Job Queues |

### Infrastructure

| Component | Technology | Purpose |
|-----------|------------|---------|
| Container | Docker | Containerization |
| Orchestration | Docker Compose / ECS | Container Management |
| Proxy | Nginx | Reverse Proxy |
| SSL | Let's Encrypt | HTTPS Certificates |
| DNS | Route 53 | Domain Management |
| CDN | CloudFlare | Content Delivery |

---

## Network Architecture

### VPC Structure (AWS)

```
VPC: 10.0.0.0/16
│
├── Public Subnets (10.0.1.0/24, 10.0.2.0/24)
│   ├── Load Balancer
│   ├── NAT Gateways
│   └── Bastion Host (optional)
│
├── Private Subnets (10.0.10.0/24, 10.0.20.0/24)
│   ├── Application Servers (ECS/Fargate)
│   ├── Background Workers
│   └── Redis Cache
│
└── Database Subnets (10.0.100.0/24, 10.0.200.0/24)
    ├── PostgreSQL Primary
    └── PostgreSQL Replica
```

### Security Groups

| Group | Inbound | Outbound |
|-------|---------|----------|
| ALB | 80, 443 (0.0.0.0/0) | All |
| ECS Tasks | 3000 (ALB) | All |
| Database | 5432 (ECS) | All |
| Redis | 6379 (ECS) | All |

### Port Usage

| Port | Service | Description |
|------|---------|-------------|
| 80 | HTTP | Redirect to HTTPS |
| 443 | HTTPS | Main application |
| 3000 | API | Backend API (internal) |
| 5432 | PostgreSQL | Database (internal) |
| 6379 | Redis | Cache/Queue (internal) |

---

## Database Architecture

### PostgreSQL Schema

```
┌─────────────────────────────────────────────────────────────┐
│                    PostgreSQL 15                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │    users    │  │  companies  │  │   orders    │         │
│  ├─────────────┤  ├─────────────┤  ├─────────────┤         │
│  │ id (PK)     │  │ id (PK)     │  │ id (PK)     │         │
│  │ email       │  │ owner_id    │  │ user_id     │         │
│  │ password    │  │ name        │  │ company_id  │         │
│  │ kyc_status  │  │ valuation   │  │ type        │         │
│  │ wallet_fiat │  │ share_price │  │ quantity    │         │
│  │ ...         │  │ ...         │  │ status      │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   trades    │  │  dividends  │  │transactions │         │
│  ├─────────────┤  ├─────────────┤  ├─────────────┤         │
│  │ id (PK)     │  │ id (PK)     │  │ id (PK)     │         │
│  │ buyer_id    │  │ company_id  │  │ user_id     │         │
│  │ seller_id   │  │ amount      │  │ type        │         │
│  │ quantity    │  │ status      │  │ amount      │         │
│  │ price       │  │ ...         │  │ status      │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Database Replication

```
┌─────────────────┐         ┌─────────────────┐
│  PostgreSQL     │◄────────│  PostgreSQL     │
│  (Primary)      │  Async  │  (Read Replica) │
│  - Writes       │  Repl.  │  - Reads        │
│  - Transactions │         │  - Reporting    │
└─────────────────┘         └─────────────────┘
```

### Backup Strategy

| Type | Frequency | Retention | Storage |
|------|-----------|-----------|---------|
| Full | Daily | 30 days | S3 |
| Incremental | Hourly | 7 days | S3 |
| Point-in-time | Continuous | 7 days | RDS |

---

## Container Orchestration

### Docker Compose Services

```yaml
services:
  # Application Layer
  app:          # Backend API (2+ replicas)
  web:          # Frontend (2+ replicas)
  nginx:        # Reverse Proxy
  
  # Data Layer
  db:           # PostgreSQL
  redis:        # Redis Cache
  
  # Background Processing
  worker:       # Queue Workers
  scheduler:    # Cron Jobs
  
  # Utilities
  backup:       # Automated Backups
  certbot:      # SSL Certificate Management
```

### ECS Task Definitions (AWS)

| Service | CPU | Memory | Replicas |
|---------|-----|--------|----------|
| Backend | 512 | 1024 | 2-4 |
| Frontend | 256 | 512 | 2-4 |
| Worker | 256 | 512 | 1-2 |

---

## Security Architecture

### Defense in Depth

```
┌─────────────────────────────────────────────────────────────┐
│  Layer 1: Network Security                                   │
│  - VPC Isolation                                            │
│  - Security Groups                                          │
│  - NACLs                                                    │
├─────────────────────────────────────────────────────────────┤
│  Layer 2: Application Security                               │
│  - WAF (Web Application Firewall)                           │
│  - Rate Limiting                                            │
│  - DDoS Protection                                          │
├─────────────────────────────────────────────────────────────┤
│  Layer 3: API Security                                       │
│  - JWT Authentication                                       │
│  - Input Validation                                         │
│  - CORS Configuration                                       │
├─────────────────────────────────────────────────────────────┤
│  Layer 4: Data Security                                      │
│  - Encryption at Rest                                       │
│  - Encryption in Transit                                    │
│  - Database Access Control                                  │
├─────────────────────────────────────────────────────────────┤
│  Layer 5: Operational Security                               │
│  - Secrets Management                                       │
│  - Audit Logging                                            │
│  - Monitoring & Alerting                                    │
└─────────────────────────────────────────────────────────────┘
```

### Security Headers

| Header | Value | Purpose |
|--------|-------|---------|
| Strict-Transport-Security | max-age=63072000 | HSTS |
| X-Frame-Options | SAMEORIGIN | Clickjacking |
| X-Content-Type-Options | nosniff | MIME sniffing |
| Content-Security-Policy | ... | XSS protection |
| X-XSS-Protection | 1; mode=block | XSS filter |

### Authentication Flow

```
┌─────────┐                    ┌─────────┐                    ┌─────────┐
│  Client │ ──Login Request──► │   API   │ ──Validate───────► │   DB    │
│         │                    │         │    Credentials     │         │
│         │ ◄─Access Token──── │         │ ◄───────────────── │         │
│         │    Refresh Token   │         │                    │         │
│         │                    │         │                    │         │
│         │ ──API Request────► │         │ ──Verify Token────►│  Redis  │
│         │  (Access Token)    │         │                    │         │
│         │ ◄─Response──────── │         │ ◄───────────────── │         │
└─────────┘                    └─────────┘                    └─────────┘
```

---

## Monitoring & Observability

### Monitoring Stack

```
┌─────────────────────────────────────────────────────────────┐
│                    Monitoring Stack                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Sentry    │  │  LogRocket  │  │ CloudWatch  │         │
│  │             │  │             │  │             │         │
│  │ Error       │  │ Session     │  │ Metrics     │         │
│  │ Tracking    │  │ Replay      │  │ Logs        │         │
│  │ Performance │  │ Analytics   │  │ Alarms      │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  Prometheus │  │   Grafana   │  │    PagerDuty│         │
│  │             │  │             │  │             │         │
│  │ Metrics     │  │ Dashboards  │  │ Alerting    │         │
│  │ Collection  │  │             │  │ Escalation  │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Key Metrics

| Category | Metric | Threshold |
|----------|--------|-----------|
| Performance | API Response Time | < 200ms |
| Performance | Database Query Time | < 50ms |
| Availability | Uptime | > 99.9% |
| Error Rate | 5xx Errors | < 0.1% |
| Resources | CPU Usage | < 80% |
| Resources | Memory Usage | < 80% |

### Alerting Rules

| Condition | Severity | Action |
|-----------|----------|--------|
| 5xx errors > 1% | Critical | Page on-call |
| API latency > 500ms | Warning | Slack notification |
| DB connections > 80% | Warning | Email alert |
| Disk usage > 85% | Warning | Email alert |

---

## Disaster Recovery

### RPO/RTO Targets

| Scenario | RPO | RTO |
|----------|-----|-----|
| Database Failure | 1 hour | 30 minutes |
| Complete Region Failure | 24 hours | 4 hours |
| Data Corruption | 1 hour | 2 hours |

### Recovery Procedures

```
┌─────────────────────────────────────────────────────────────┐
│              Disaster Recovery Procedures                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Database Failure                                         │
│     ├─ Promote read replica to primary                      │
│     ├─ Update connection strings                            │
│     └─ Restore from backup if needed                        │
│                                                              │
│  2. Application Failure                                      │
│     ├─ Restart containers                                   │
│     ├─ Rollback to previous version                         │
│     └─ Scale up additional instances                        │
│                                                              │
│  3. Complete Region Failure                                  │
│     ├─ Activate disaster recovery region                    │
│     ├─ Restore database from cross-region backup            │
│     ├─ Update DNS to DR region                              │
│     └─ Verify all services operational                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Scaling Strategy

### Horizontal Scaling

```
┌─────────────────────────────────────────────────────────────┐
│                    Scaling Strategy                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                  Load Balancer                       │   │
│  └─────────────────────────────────────────────────────┘   │
│                           │                                  │
│         ┌─────────────────┼─────────────────┐               │
│         ▼                 ▼                 ▼               │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐       │
│  │   App 1     │   │   App 2     │   │   App N     │       │
│  │  (Active)   │   │  (Active)   │   │  (Active)   │       │
│  └─────────────┘   └─────────────┘   └─────────────┘       │
│                                                              │
│  Auto-scaling triggers:                                      │
│  - CPU > 70% for 5 minutes → Scale up                       │
│  - CPU < 30% for 10 minutes → Scale down                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Scaling Limits

| Resource | Min | Max | Notes |
|----------|-----|-----|-------|
| API Servers | 2 | 10 | Based on CPU |
| Frontend | 2 | 6 | Based on CPU |
| Database | 1 | 2 | Multi-AZ |
| Redis | 1 | 2 | Cluster mode |

---

## Cost Optimization

### Reserved Capacity

| Service | Savings |
|---------|---------|
| RDS Reserved | ~40% |
| EC2 Reserved | ~30% |
| Savings Plans | ~20% |

### Cost Monitoring

- AWS Cost Explorer for tracking
- Budget alerts at 80% of monthly budget
- Tag-based cost allocation

---

## Documentation

- [Deployment Guide](./DEPLOYMENT.md)
- [Troubleshooting Guide](./TROUBLESHOOTING.md)
- [API Documentation](./API.md)
- [Security Runbook](./SECURITY.md)
