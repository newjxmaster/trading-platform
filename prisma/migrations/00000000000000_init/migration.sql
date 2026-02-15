-- Trading Platform for SMBs - Initial Migration
-- PostgreSQL Database Schema
-- Generated: February 2025

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE "KycStatus" AS ENUM ('pending', 'verified', 'rejected');
CREATE TYPE "UserRole" AS ENUM ('investor', 'business_owner', 'admin');
CREATE TYPE "BusinessType" AS ENUM ('small_business', 'medium_business');
CREATE TYPE "VerificationStatus" AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE "ListingStatus" AS ENUM ('draft', 'ipo', 'active', 'suspended');
CREATE TYPE "RevenueVerificationStatus" AS ENUM ('auto_verified', 'pending_review', 'verified', 'rejected');
CREATE TYPE "DividendPaymentStatus" AS ENUM ('pending', 'processing', 'completed', 'failed');
CREATE TYPE "PayoutStatus" AS ENUM ('pending', 'processing', 'completed', 'failed');
CREATE TYPE "PaymentMethod" AS ENUM ('wave', 'orange_money', 'bank_transfer', 'wallet', 'card', 'crypto');
CREATE TYPE "OrderType" AS ENUM ('market', 'limit');
CREATE TYPE "OrderSide" AS ENUM ('buy', 'sell');
CREATE TYPE "OrderStatus" AS ENUM ('pending', 'partial', 'filled', 'cancelled');
CREATE TYPE "TransactionType" AS ENUM ('deposit', 'withdrawal', 'dividend', 'trade', 'fee');
CREATE TYPE "TransactionStatus" AS ENUM ('pending', 'processing', 'completed', 'failed', 'cancelled');
CREATE TYPE "BankTransactionType" AS ENUM ('credit', 'debit');

-- ============================================
-- TABLES
-- ============================================

-- Users Table
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "phone" TEXT,
    "kyc_status" "KycStatus" NOT NULL DEFAULT 'pending',
    "id_document_url" TEXT,
    "selfie_url" TEXT,
    "kyc_verified_at" TIMESTAMP(3),
    "wallet_fiat" DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    "wallet_crypto_usdt" DECIMAL(15,8) NOT NULL DEFAULT 0.00000000,
    "wallet_crypto_usdc" DECIMAL(15,8) NOT NULL DEFAULT 0.00000000,
    "wallet_crypto_btc" DECIMAL(15,8) NOT NULL DEFAULT 0.00000000,
    "wallet_crypto_eth" DECIMAL(15,8) NOT NULL DEFAULT 0.00000000,
    "role" "UserRole" NOT NULL DEFAULT 'investor',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_login_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- Companies Table
CREATE TABLE "companies" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "owner_id" UUID NOT NULL,
    "business_name" TEXT NOT NULL,
    "business_type" "BusinessType" NOT NULL,
    "category" TEXT,
    "description" TEXT,
    "address" TEXT,
    "city" TEXT,
    "country" TEXT,
    "years_in_operation" INTEGER,
    "registration_certificate_url" TEXT NOT NULL,
    "manager_id_card_url" TEXT NOT NULL,
    "business_photo_url" TEXT NOT NULL,
    "partner_bank_name" TEXT NOT NULL,
    "bank_account_number" TEXT NOT NULL,
    "bank_account_name" TEXT,
    "bank_api_connected" BOOLEAN NOT NULL DEFAULT false,
    "bank_access_token" TEXT,
    "bank_token_expires_at" TIMESTAMP(3),
    "initial_valuation" DECIMAL(15,2) NOT NULL,
    "total_shares" INTEGER NOT NULL,
    "available_shares" INTEGER NOT NULL,
    "retained_shares" INTEGER NOT NULL DEFAULT 0,
    "current_price" DECIMAL(10,2) NOT NULL,
    "ipo_date" TIMESTAMP(3),
    "minimum_investment" DECIMAL(10,2),
    "verification_status" "VerificationStatus" NOT NULL DEFAULT 'pending',
    "verification_notes" TEXT,
    "verified_by" UUID,
    "verified_at" TIMESTAMP(3),
    "listing_status" "ListingStatus" NOT NULL DEFAULT 'draft',
    "last_month_revenue" DECIMAL(15,2),
    "this_month_revenue" DECIMAL(15,2),
    "total_dividends_paid" DECIMAL(15,2) DEFAULT 0.00,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- Revenue Reports Table
CREATE TABLE "revenue_reports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "report_month" INTEGER NOT NULL,
    "report_year" INTEGER NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "total_deposits" DECIMAL(15,2) NOT NULL,
    "total_withdrawals" DECIMAL(15,2) NOT NULL,
    "net_revenue" DECIMAL(15,2) NOT NULL,
    "operating_costs" DECIMAL(15,2),
    "other_expenses" DECIMAL(15,2),
    "gross_profit" DECIMAL(15,2),
    "platform_fee" DECIMAL(15,2) NOT NULL,
    "net_profit" DECIMAL(15,2) NOT NULL,
    "dividend_pool" DECIMAL(15,2) NOT NULL,
    "reinvestment_amount" DECIMAL(15,2) NOT NULL,
    "verification_status" "RevenueVerificationStatus" NOT NULL DEFAULT 'auto_verified',
    "verified_by" UUID,
    "verified_at" TIMESTAMP(3),
    "verification_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "revenue_reports_pkey" PRIMARY KEY ("id")
);

-- Dividends Table
CREATE TABLE "dividends" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "revenue_report_id" UUID NOT NULL,
    "total_dividend_pool" DECIMAL(15,2) NOT NULL,
    "total_shares_eligible" INTEGER NOT NULL,
    "amount_per_share" DECIMAL(10,4) NOT NULL,
    "payment_status" "DividendPaymentStatus" NOT NULL DEFAULT 'pending',
    "distribution_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dividends_pkey" PRIMARY KEY ("id")
);

-- Dividend Payouts Table
CREATE TABLE "dividend_payouts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "dividend_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "shares_held" INTEGER NOT NULL,
    "payout_amount" DECIMAL(15,2) NOT NULL,
    "payment_method" "PaymentMethod" NOT NULL,
    "payment_reference" TEXT,
    "status" "PayoutStatus" NOT NULL DEFAULT 'pending',
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dividend_payouts_pkey" PRIMARY KEY ("id")
);

-- Stock Holdings Table
CREATE TABLE "stock_holdings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "shares_owned" INTEGER NOT NULL DEFAULT 0,
    "average_buy_price" DECIMAL(10,2),
    "total_invested" DECIMAL(15,2),
    "total_dividends_earned" DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    "first_purchased_at" TIMESTAMP(3),
    "last_purchased_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_holdings_pkey" PRIMARY KEY ("id")
);

-- Orders Table
CREATE TABLE "orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "order_type" "OrderType" NOT NULL,
    "side" "OrderSide" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" DECIMAL(10,2),
    "filled_quantity" INTEGER NOT NULL DEFAULT 0,
    "remaining_quantity" INTEGER NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3),

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- Trades Table
CREATE TABLE "trades" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "buy_order_id" UUID NOT NULL,
    "sell_order_id" UUID NOT NULL,
    "buyer_id" UUID NOT NULL,
    "seller_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "total_amount" DECIMAL(15,2) NOT NULL,
    "platform_fee" DECIMAL(15,2) NOT NULL,
    "executed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trades_pkey" PRIMARY KEY ("id")
);

-- Transactions Table
CREATE TABLE "transactions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "transaction_type" "TransactionType" NOT NULL,
    "payment_method" "PaymentMethod" NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "fee_amount" DECIMAL(15,2),
    "fee_currency" TEXT,
    "status" "TransactionStatus" NOT NULL DEFAULT 'pending',
    "reference_id" TEXT,
    "external_transaction_id" TEXT,
    "metadata" JSONB,
    "crypto_address" TEXT,
    "crypto_tx_hash" TEXT,
    "crypto_confirmations" INTEGER,
    "bank_account_number" TEXT,
    "bank_reference" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- Price History Table
CREATE TABLE "price_history" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "volume" INTEGER NOT NULL DEFAULT 0,
    "revenue_growth" DECIMAL(5,4),
    "profit_margin" DECIMAL(5,4),
    "performance_score" DECIMAL(5,4),
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "price_history_pkey" PRIMARY KEY ("id")
);

-- Bank Transactions Table
CREATE TABLE "bank_transactions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "transaction_date" TIMESTAMP(3) NOT NULL,
    "transaction_type" "BankTransactionType" NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "balance_after" DECIMAL(15,2),
    "description" TEXT,
    "bank_reference" TEXT,
    "bank_transaction_id" TEXT,
    "category" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bank_transactions_pkey" PRIMARY KEY ("id")
);

-- Admin Logs Table
CREATE TABLE "admin_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "admin_id" UUID NOT NULL,
    "action_type" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" UUID,
    "details" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "previous_values" JSONB,
    "current_values" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_logs_pkey" PRIMARY KEY ("id")
);

-- ============================================
-- UNIQUE CONSTRAINTS
-- ============================================

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "revenue_reports_company_id_report_month_report_year_key" ON "revenue_reports"("company_id", "report_month", "report_year");
CREATE UNIQUE INDEX "dividends_revenue_report_id_key" ON "dividends"("revenue_report_id");
CREATE UNIQUE INDEX "stock_holdings_user_id_company_id_key" ON "stock_holdings"("user_id", "company_id");

-- ============================================
-- FOREIGN KEYS
-- ============================================

-- Companies
ALTER TABLE "companies" ADD CONSTRAINT "companies_owner_id_fkey" 
    FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Revenue Reports
ALTER TABLE "revenue_reports" ADD CONSTRAINT "revenue_reports_company_id_fkey" 
    FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "revenue_reports" ADD CONSTRAINT "revenue_reports_verified_by_fkey" 
    FOREIGN KEY ("verified_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Dividends
ALTER TABLE "dividends" ADD CONSTRAINT "dividends_company_id_fkey" 
    FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dividends" ADD CONSTRAINT "dividends_revenue_report_id_fkey" 
    FOREIGN KEY ("revenue_report_id") REFERENCES "revenue_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Dividend Payouts
ALTER TABLE "dividend_payouts" ADD CONSTRAINT "dividend_payouts_dividend_id_fkey" 
    FOREIGN KEY ("dividend_id") REFERENCES "dividends"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dividend_payouts" ADD CONSTRAINT "dividend_payouts_user_id_fkey" 
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Stock Holdings
ALTER TABLE "stock_holdings" ADD CONSTRAINT "stock_holdings_user_id_fkey" 
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "stock_holdings" ADD CONSTRAINT "stock_holdings_company_id_fkey" 
    FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Orders
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_fkey" 
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "orders" ADD CONSTRAINT "orders_company_id_fkey" 
    FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Trades
ALTER TABLE "trades" ADD CONSTRAINT "trades_buy_order_id_fkey" 
    FOREIGN KEY ("buy_order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "trades" ADD CONSTRAINT "trades_sell_order_id_fkey" 
    FOREIGN KEY ("sell_order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "trades" ADD CONSTRAINT "trades_buyer_id_fkey" 
    FOREIGN KEY ("buyer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "trades" ADD CONSTRAINT "trades_seller_id_fkey" 
    FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "trades" ADD CONSTRAINT "trades_company_id_fkey" 
    FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Transactions
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_fkey" 
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Price History
ALTER TABLE "price_history" ADD CONSTRAINT "price_history_company_id_fkey" 
    FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Bank Transactions
ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_company_id_fkey" 
    FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Admin Logs
ALTER TABLE "admin_logs" ADD CONSTRAINT "admin_logs_admin_id_fkey" 
    FOREIGN KEY ("admin_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Users Indexes
CREATE INDEX "users_email_idx" ON "users"("email");
CREATE INDEX "users_kyc_status_idx" ON "users"("kyc_status");
CREATE INDEX "users_role_idx" ON "users"("role");
CREATE INDEX "users_created_at_idx" ON "users"("created_at");

-- Companies Indexes
CREATE INDEX "companies_owner_id_idx" ON "companies"("owner_id");
CREATE INDEX "companies_business_type_idx" ON "companies"("business_type");
CREATE INDEX "companies_category_idx" ON "companies"("category");
CREATE INDEX "companies_verification_status_idx" ON "companies"("verification_status");
CREATE INDEX "companies_listing_status_idx" ON "companies"("listing_status");
CREATE INDEX "companies_current_price_idx" ON "companies"("current_price");
CREATE INDEX "companies_created_at_idx" ON "companies"("created_at");

-- Revenue Reports Indexes
CREATE INDEX "revenue_reports_company_id_idx" ON "revenue_reports"("company_id");
CREATE INDEX "revenue_reports_report_month_year_idx" ON "revenue_reports"("report_month", "report_year");
CREATE INDEX "revenue_reports_verification_status_idx" ON "revenue_reports"("verification_status");
CREATE INDEX "revenue_reports_created_at_idx" ON "revenue_reports"("created_at");

-- Dividends Indexes
CREATE INDEX "dividends_company_id_idx" ON "dividends"("company_id");
CREATE INDEX "dividends_payment_status_idx" ON "dividends"("payment_status");
CREATE INDEX "dividends_distribution_date_idx" ON "dividends"("distribution_date");
CREATE INDEX "dividends_created_at_idx" ON "dividends"("created_at");

-- Dividend Payouts Indexes
CREATE INDEX "dividend_payouts_dividend_id_idx" ON "dividend_payouts"("dividend_id");
CREATE INDEX "dividend_payouts_user_id_idx" ON "dividend_payouts"("user_id");
CREATE INDEX "dividend_payouts_status_idx" ON "dividend_payouts"("status");
CREATE INDEX "dividend_payouts_created_at_idx" ON "dividend_payouts"("created_at");

-- Stock Holdings Indexes
CREATE INDEX "stock_holdings_user_id_idx" ON "stock_holdings"("user_id");
CREATE INDEX "stock_holdings_company_id_idx" ON "stock_holdings"("company_id");
CREATE INDEX "stock_holdings_shares_owned_idx" ON "stock_holdings"("shares_owned");

-- Orders Indexes
CREATE INDEX "orders_user_id_idx" ON "orders"("user_id");
CREATE INDEX "orders_company_id_idx" ON "orders"("company_id");
CREATE INDEX "orders_side_idx" ON "orders"("side");
CREATE INDEX "orders_status_idx" ON "orders"("status");
CREATE INDEX "orders_order_type_idx" ON "orders"("order_type");
CREATE INDEX "orders_price_idx" ON "orders"("price");
CREATE INDEX "orders_created_at_idx" ON "orders"("created_at");
CREATE INDEX "orders_company_side_status_idx" ON "orders"("company_id", "side", "status");
CREATE INDEX "orders_company_side_status_price_idx" ON "orders"("company_id", "side", "status", "price");

-- Trades Indexes
CREATE INDEX "trades_buy_order_id_idx" ON "trades"("buy_order_id");
CREATE INDEX "trades_sell_order_id_idx" ON "trades"("sell_order_id");
CREATE INDEX "trades_buyer_id_idx" ON "trades"("buyer_id");
CREATE INDEX "trades_seller_id_idx" ON "trades"("seller_id");
CREATE INDEX "trades_company_id_idx" ON "trades"("company_id");
CREATE INDEX "trades_executed_at_idx" ON "trades"("executed_at");
CREATE INDEX "trades_company_executed_at_idx" ON "trades"("company_id", "executed_at");

-- Transactions Indexes
CREATE INDEX "transactions_user_id_idx" ON "transactions"("user_id");
CREATE INDEX "transactions_transaction_type_idx" ON "transactions"("transaction_type");
CREATE INDEX "transactions_payment_method_idx" ON "transactions"("payment_method");
CREATE INDEX "transactions_status_idx" ON "transactions"("status");
CREATE INDEX "transactions_reference_id_idx" ON "transactions"("reference_id");
CREATE INDEX "transactions_created_at_idx" ON "transactions"("created_at");
CREATE INDEX "transactions_user_created_at_idx" ON "transactions"("user_id", "created_at");

-- Price History Indexes
CREATE INDEX "price_history_company_id_idx" ON "price_history"("company_id");
CREATE INDEX "price_history_timestamp_idx" ON "price_history"("timestamp");
CREATE INDEX "price_history_company_timestamp_idx" ON "price_history"("company_id", "timestamp");

-- Bank Transactions Indexes
CREATE INDEX "bank_transactions_company_id_idx" ON "bank_transactions"("company_id");
CREATE INDEX "bank_transactions_transaction_date_idx" ON "bank_transactions"("transaction_date");
CREATE INDEX "bank_transactions_company_date_idx" ON "bank_transactions"("company_id", "transaction_date");
CREATE INDEX "bank_transactions_transaction_type_idx" ON "bank_transactions"("transaction_type");
CREATE INDEX "bank_transactions_bank_reference_idx" ON "bank_transactions"("bank_reference");

-- Admin Logs Indexes
CREATE INDEX "admin_logs_admin_id_idx" ON "admin_logs"("admin_id");
CREATE INDEX "admin_logs_action_type_idx" ON "admin_logs"("action_type");
CREATE INDEX "admin_logs_target_type_idx" ON "admin_logs"("target_type");
CREATE INDEX "admin_logs_target_id_idx" ON "admin_logs"("target_id");
CREATE INDEX "admin_logs_created_at_idx" ON "admin_logs"("created_at");
CREATE INDEX "admin_logs_admin_created_at_idx" ON "admin_logs"("admin_id", "created_at");

-- ============================================
-- VIEWS (for reporting and analytics)
-- ============================================

-- User Portfolio Summary View
CREATE VIEW "user_portfolio_summary" AS
SELECT 
    sh.user_id,
    sh.company_id,
    c.business_name,
    c.current_price,
    sh.shares_owned,
    sh.average_buy_price,
    sh.total_invested,
    (sh.shares_owned * c.current_price) as current_value,
    ((sh.shares_owned * c.current_price) - COALESCE(sh.total_invested, 0)) as profit_loss,
    CASE 
        WHEN sh.total_invested > 0 
        THEN (((sh.shares_owned * c.current_price) - sh.total_invested) / sh.total_invested * 100)
        ELSE 0 
    END as profit_loss_percentage,
    sh.total_dividends_earned
FROM stock_holdings sh
JOIN companies c ON sh.company_id = c.id
WHERE sh.shares_owned > 0;

-- Company Trading Volume View (Daily)
CREATE VIEW "daily_trading_volume" AS
SELECT 
    company_id,
    DATE(executed_at) as trade_date,
    SUM(quantity) as total_volume,
    SUM(total_amount) as total_value,
    COUNT(*) as trade_count,
    AVG(price) as avg_price,
    MIN(price) as min_price,
    MAX(price) as max_price
FROM trades
GROUP BY company_id, DATE(executed_at);

-- Monthly Revenue Summary View
CREATE VIEW "monthly_revenue_summary" AS
SELECT 
    company_id,
    report_year,
    report_month,
    net_revenue,
    net_profit,
    dividend_pool,
    platform_fee,
    verification_status
FROM revenue_reports
ORDER BY company_id, report_year DESC, report_month DESC;

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON "users"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON "companies"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stock_holdings_updated_at BEFORE UPDATE ON "stock_holdings"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON "orders"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON "transactions"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate remaining_quantity on order insert
CREATE OR REPLACE FUNCTION set_order_remaining_quantity()
RETURNS TRIGGER AS $$
BEGIN
    NEW.remaining_quantity = NEW.quantity;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER set_order_remaining_quantity_trigger BEFORE INSERT ON "orders"
    FOR EACH ROW EXECUTE FUNCTION set_order_remaining_quantity();

-- ============================================
-- ROW LEVEL SECURITY (Optional - enable if needed)
-- ============================================

-- Enable RLS on tables (disabled by default, enable with ALTER TABLE ... ENABLE ROW LEVEL SECURITY)
-- Example policies can be added here if needed

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE "users" IS 'User accounts for investors, business owners, and admins';
COMMENT ON TABLE "companies" IS 'Businesses registered for IPO and trading';
COMMENT ON TABLE "revenue_reports" IS 'Monthly revenue reports from bank API data';
COMMENT ON TABLE "dividends" IS 'Dividend distribution records per company per month';
COMMENT ON TABLE "dividend_payouts" IS 'Individual shareholder dividend payouts';
COMMENT ON TABLE "stock_holdings" IS 'User portfolio - stock ownership tracking';
COMMENT ON TABLE "orders" IS 'Trading order book - buy/sell orders';
COMMENT ON TABLE "trades" IS 'Executed trade transactions';
COMMENT ON TABLE "transactions" IS 'User wallet transactions - deposits, withdrawals, fees';
COMMENT ON TABLE "price_history" IS 'Historical stock prices for charts';
COMMENT ON TABLE "bank_transactions" IS 'Raw bank API transaction data';
COMMENT ON TABLE "admin_logs" IS 'Audit log for admin actions';
