// Trading Platform for SMBs - Seed Data
// Run with: npx prisma db seed

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...\n');

  // Clear existing data (optional - for clean seed)
  console.log('Clearing existing data...');
  await prisma.adminLog.deleteMany();
  await prisma.bankTransaction.deleteMany();
  await prisma.priceHistory.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.trade.deleteMany();
  await prisma.order.deleteMany();
  await prisma.dividendPayout.deleteMany();
  await prisma.dividend.deleteMany();
  await prisma.revenueReport.deleteMany();
  await prisma.stockHolding.deleteMany();
  await prisma.company.deleteMany();
  await prisma.user.deleteMany();
  console.log('✅ Existing data cleared\n');

  // Hash password for all users (same password for testing)
  const passwordHash = await bcrypt.hash('Password123!', 12);

  // ============================================
  // CREATE USERS
  // ============================================
  console.log('Creating users...');

  // Admin User
  const admin = await prisma.user.create({
    data: {
      email: 'admin@tradingplatform.com',
      password_hash: passwordHash,
      full_name: 'System Administrator',
      phone: '+2250100000001',
      kyc_status: 'verified',
      role: 'admin',
      wallet_fiat: 10000.00,
      kyc_verified_at: new Date('2024-01-01'),
    },
  });
  console.log(`✅ Admin created: ${admin.email}`);

  // Investor Users
  const investor1 = await prisma.user.create({
    data: {
      email: 'john.investor@email.com',
      password_hash: passwordHash,
      full_name: 'John Smith',
      phone: '+2250100000002',
      kyc_status: 'verified',
      role: 'investor',
      wallet_fiat: 5000.00,
      wallet_crypto_usdt: 1000.00,
      kyc_verified_at: new Date('2024-01-15'),
    },
  });
  console.log(`✅ Investor created: ${investor1.email}`);

  const investor2 = await prisma.user.create({
    data: {
      email: 'sarah.investor@email.com',
      password_hash: passwordHash,
      full_name: 'Sarah Johnson',
      phone: '+2250100000003',
      kyc_status: 'verified',
      role: 'investor',
      wallet_fiat: 10000.00,
      wallet_crypto_usdt: 2500.00,
      kyc_verified_at: new Date('2024-02-01'),
    },
  });
  console.log(`✅ Investor created: ${investor2.email}`);

  const investor3 = await prisma.user.create({
    data: {
      email: 'mike.investor@email.com',
      password_hash: passwordHash,
      full_name: 'Mike Williams',
      phone: '+2250100000004',
      kyc_status: 'pending',
      role: 'investor',
      wallet_fiat: 500.00,
    },
  });
  console.log(`✅ Investor created: ${investor3.email}`);

  // Business Owner Users
  const businessOwner1 = await prisma.user.create({
    data: {
      email: 'marie.supermart@email.com',
      password_hash: passwordHash,
      full_name: 'Marie Kouassi',
      phone: '+2250100000005',
      kyc_status: 'verified',
      role: 'business_owner',
      wallet_fiat: 2000.00,
      kyc_verified_at: new Date('2024-01-10'),
    },
  });
  console.log(`✅ Business Owner created: ${businessOwner1.email}`);

  const businessOwner2 = await prisma.user.create({
    data: {
      email: 'jean.factory@email.com',
      password_hash: passwordHash,
      full_name: 'Jean-Baptiste Mensah',
      phone: '+2250100000006',
      kyc_status: 'verified',
      role: 'business_owner',
      wallet_fiat: 5000.00,
      kyc_verified_at: new Date('2024-01-20'),
    },
  });
  console.log(`✅ Business Owner created: ${businessOwner2.email}`);

  const businessOwner3 = await prisma.user.create({
    data: {
      email: 'amina.restaurant@email.com',
      password_hash: passwordHash,
      full_name: 'Amina Diallo',
      phone: '+2250100000007',
      kyc_status: 'verified',
      role: 'business_owner',
      wallet_fiat: 1500.00,
      kyc_verified_at: new Date('2024-02-05'),
    },
  });
  console.log(`✅ Business Owner created: ${businessOwner3.email}`);

  console.log('\n');

  // ============================================
  // CREATE COMPANIES
  // ============================================
  console.log('Creating companies...');

  // Company 1: SuperMart ABC (Active, IPO completed)
  const company1 = await prisma.company.create({
    data: {
      owner_id: businessOwner1.id,
      business_name: 'SuperMart ABC',
      business_type: 'small_business',
      category: 'supermarket',
      description: 'A well-established neighborhood supermarket offering groceries, household items, and fresh produce. Operating for 5 years with consistent monthly revenue.',
      address: 'Rue des Jardins, Cocody',
      city: 'Abidjan',
      country: 'Côte d\'Ivoire',
      years_in_operation: 5,
      registration_certificate_url: 'https://storage.example.com/docs/supermart_reg.pdf',
      manager_id_card_url: 'https://storage.example.com/docs/marie_id.pdf',
      business_photo_url: 'https://storage.example.com/photos/supermart.jpg',
      partner_bank_name: 'Ecobank',
      bank_account_number: 'CI1234567890',
      bank_account_name: 'SuperMart ABC',
      bank_api_connected: true,
      initial_valuation: 100000.00,
      total_shares: 10000,
      available_shares: 3000,
      retained_shares: 3000,
      current_price: 11.50,
      ipo_date: new Date('2024-06-01'),
      minimum_investment: 50.00,
      verification_status: 'approved',
      listing_status: 'active',
      verified_by: admin.id,
      verified_at: new Date('2024-05-28'),
      last_month_revenue: 90000.00,
      this_month_revenue: 95000.00,
    },
  });
  console.log(`✅ Company created: ${company1.business_name}`);

  // Company 2: Factory XYZ (Active, IPO completed)
  const company2 = await prisma.company.create({
    data: {
      owner_id: businessOwner2.id,
      business_name: 'Factory XYZ',
      business_type: 'medium_business',
      category: 'factory',
      description: 'Manufacturing plant producing packaging materials for food and beverage industry. 10+ years experience with major clients across West Africa.',
      address: 'Zone Industrielle, Port-Bouët',
      city: 'Abidjan',
      country: 'Côte d\'Ivoire',
      years_in_operation: 12,
      registration_certificate_url: 'https://storage.example.com/docs/factory_reg.pdf',
      manager_id_card_url: 'https://storage.example.com/docs/jean_id.pdf',
      business_photo_url: 'https://storage.example.com/photos/factory.jpg',
      partner_bank_name: 'SGBCI',
      bank_account_number: 'CI0987654321',
      bank_account_name: 'Factory XYZ SA',
      bank_api_connected: true,
      initial_valuation: 500000.00,
      total_shares: 50000,
      available_shares: 15000,
      retained_shares: 15000,
      current_price: 12.80,
      ipo_date: new Date('2024-07-01'),
      minimum_investment: 100.00,
      verification_status: 'approved',
      listing_status: 'active',
      verified_by: admin.id,
      verified_at: new Date('2024-06-25'),
      last_month_revenue: 180000.00,
      this_month_revenue: 195000.00,
    },
  });
  console.log(`✅ Company created: ${company2.business_name}`);

  // Company 3: Le Petit Bistro (Active, IPO completed)
  const company3 = await prisma.company.create({
    data: {
      owner_id: businessOwner3.id,
      business_name: 'Le Petit Bistro',
      business_type: 'small_business',
      category: 'restaurant',
      description: 'Popular French-Ivorian fusion restaurant in the heart of Abidjan. Known for authentic cuisine and excellent service.',
      address: 'Boulevard de la République, Plateau',
      city: 'Abidjan',
      country: 'Côte d\'Ivoire',
      years_in_operation: 3,
      registration_certificate_url: 'https://storage.example.com/docs/bistro_reg.pdf',
      manager_id_card_url: 'https://storage.example.com/docs/amina_id.pdf',
      business_photo_url: 'https://storage.example.com/photos/bistro.jpg',
      partner_bank_name: 'NSIA Bank',
      bank_account_number: 'CI1122334455',
      bank_account_name: 'Le Petit Bistro',
      bank_api_connected: true,
      initial_valuation: 50000.00,
      total_shares: 5000,
      available_shares: 2000,
      retained_shares: 1500,
      current_price: 12.00,
      ipo_date: new Date('2024-08-01'),
      minimum_investment: 25.00,
      verification_status: 'approved',
      listing_status: 'active',
      verified_by: admin.id,
      verified_at: new Date('2024-07-28'),
      last_month_revenue: 45000.00,
      this_month_revenue: 48000.00,
    },
  });
  console.log(`✅ Company created: ${company3.business_name}`);

  // Company 4: Tech Solutions (Pending approval)
  const company4 = await prisma.company.create({
    data: {
      owner_id: businessOwner1.id,
      business_name: 'Tech Solutions CI',
      business_type: 'small_business',
      category: 'technology',
      description: 'IT services company providing software development and tech support for SMEs.',
      address: 'Angré, Cocody',
      city: 'Abidjan',
      country: 'Côte d\'Ivoire',
      years_in_operation: 2,
      registration_certificate_url: 'https://storage.example.com/docs/tech_reg.pdf',
      manager_id_card_url: 'https://storage.example.com/docs/marie_id2.pdf',
      business_photo_url: 'https://storage.example.com/photos/tech.jpg',
      partner_bank_name: 'Ecobank',
      bank_account_number: 'CI5566778899',
      bank_account_name: 'Tech Solutions CI',
      bank_api_connected: false,
      initial_valuation: 75000.00,
      total_shares: 7500,
      available_shares: 5250,
      retained_shares: 2250,
      current_price: 10.00,
      minimum_investment: 50.00,
      verification_status: 'pending',
      listing_status: 'draft',
    },
  });
  console.log(`✅ Company created: ${company4.business_name} (pending approval)`);

  console.log('\n');

  // ============================================
  // CREATE STOCK HOLDINGS (Portfolio)
  // ============================================
  console.log('Creating stock holdings...');

  // John holds SuperMart and Factory shares
  const holding1 = await prisma.stockHolding.create({
    data: {
      user_id: investor1.id,
      company_id: company1.id,
      shares_owned: 100,
      average_buy_price: 10.50,
      total_invested: 1050.00,
      total_dividends_earned: 114.00,
      first_purchased_at: new Date('2024-06-15'),
      last_purchased_at: new Date('2024-06-15'),
    },
  });
  console.log(`✅ Holding: ${investor1.full_name} - ${company1.business_name}: ${holding1.shares_owned} shares`);

  const holding2 = await prisma.stockHolding.create({
    data: {
      user_id: investor1.id,
      company_id: company2.id,
      shares_owned: 50,
      average_buy_price: 12.00,
      total_invested: 600.00,
      total_dividends_earned: 32.00,
      first_purchased_at: new Date('2024-07-20'),
      last_purchased_at: new Date('2024-07-20'),
    },
  });
  console.log(`✅ Holding: ${investor1.full_name} - ${company2.business_name}: ${holding2.shares_owned} shares`);

  // Sarah holds all three companies
  const holding3 = await prisma.stockHolding.create({
    data: {
      user_id: investor2.id,
      company_id: company1.id,
      shares_owned: 250,
      average_buy_price: 10.00,
      total_invested: 2500.00,
      total_dividends_earned: 285.00,
      first_purchased_at: new Date('2024-06-05'),
      last_purchased_at: new Date('2024-06-20'),
    },
  });
  console.log(`✅ Holding: ${investor2.full_name} - ${company1.business_name}: ${holding3.shares_owned} shares`);

  const holding4 = await prisma.stockHolding.create({
    data: {
      user_id: investor2.id,
      company_id: company2.id,
      shares_owned: 200,
      average_buy_price: 11.50,
      total_invested: 2300.00,
      total_dividends_earned: 128.00,
      first_purchased_at: new Date('2024-07-10'),
      last_purchased_at: new Date('2024-07-25'),
    },
  });
  console.log(`✅ Holding: ${investor2.full_name} - ${company2.business_name}: ${holding4.shares_owned} shares`);

  const holding5 = await prisma.stockHolding.create({
    data: {
      user_id: investor2.id,
      company_id: company3.id,
      shares_owned: 100,
      average_buy_price: 10.00,
      total_invested: 1000.00,
      total_dividends_earned: 60.00,
      first_purchased_at: new Date('2024-08-10'),
      last_purchased_at: new Date('2024-08-10'),
    },
  });
  console.log(`✅ Holding: ${investor2.full_name} - ${company3.business_name}: ${holding5.shares_owned} shares`);

  console.log('\n');

  // ============================================
  // CREATE REVENUE REPORTS
  // ============================================
  console.log('Creating revenue reports...');

  // SuperMart Revenue Reports
  const report1 = await prisma.revenueReport.create({
    data: {
      company_id: company1.id,
      report_month: 6,
      report_year: 2024,
      period_start: new Date('2024-06-01'),
      period_end: new Date('2024-06-30'),
      total_deposits: 85000.00,
      total_withdrawals: 65000.00,
      net_revenue: 20000.00,
      operating_costs: 60000.00,
      other_expenses: 5000.00,
      gross_profit: 20000.00,
      platform_fee: 1000.00,
      net_profit: 19000.00,
      dividend_pool: 11400.00,
      reinvestment_amount: 7600.00,
      verification_status: 'verified',
      verified_by: admin.id,
      verified_at: new Date('2024-07-02'),
    },
  });
  console.log(`✅ Revenue Report: ${company1.business_name} - June 2024`);

  const report2 = await prisma.revenueReport.create({
    data: {
      company_id: company1.id,
      report_month: 7,
      report_year: 2024,
      period_start: new Date('2024-07-01'),
      period_end: new Date('2024-07-31'),
      total_deposits: 90000.00,
      total_withdrawals: 70000.00,
      net_revenue: 20000.00,
      operating_costs: 65000.00,
      other_expenses: 5000.00,
      gross_profit: 20000.00,
      platform_fee: 1000.00,
      net_profit: 19000.00,
      dividend_pool: 11400.00,
      reinvestment_amount: 7600.00,
      verification_status: 'verified',
      verified_by: admin.id,
      verified_at: new Date('2024-08-02'),
    },
  });
  console.log(`✅ Revenue Report: ${company1.business_name} - July 2024`);

  const report3 = await prisma.revenueReport.create({
    data: {
      company_id: company1.id,
      report_month: 8,
      report_year: 2024,
      period_start: new Date('2024-08-01'),
      period_end: new Date('2024-08-31'),
      total_deposits: 95000.00,
      total_withdrawals: 72000.00,
      net_revenue: 23000.00,
      operating_costs: 67000.00,
      other_expenses: 5000.00,
      gross_profit: 23000.00,
      platform_fee: 1150.00,
      net_profit: 21850.00,
      dividend_pool: 13110.00,
      reinvestment_amount: 8740.00,
      verification_status: 'verified',
      verified_by: admin.id,
      verified_at: new Date('2024-09-02'),
    },
  });
  console.log(`✅ Revenue Report: ${company1.business_name} - August 2024`);

  // Factory XYZ Revenue Reports
  const report4 = await prisma.revenueReport.create({
    data: {
      company_id: company2.id,
      report_month: 7,
      report_year: 2024,
      period_start: new Date('2024-07-01'),
      period_end: new Date('2024-07-31'),
      total_deposits: 180000.00,
      total_withdrawals: 140000.00,
      net_revenue: 40000.00,
      operating_costs: 135000.00,
      other_expenses: 5000.00,
      gross_profit: 40000.00,
      platform_fee: 2000.00,
      net_profit: 38000.00,
      dividend_pool: 22800.00,
      reinvestment_amount: 15200.00,
      verification_status: 'verified',
      verified_by: admin.id,
      verified_at: new Date('2024-08-02'),
    },
  });
  console.log(`✅ Revenue Report: ${company2.business_name} - July 2024`);

  const report5 = await prisma.revenueReport.create({
    data: {
      company_id: company2.id,
      report_month: 8,
      report_year: 2024,
      period_start: new Date('2024-08-01'),
      period_end: new Date('2024-08-31'),
      total_deposits: 195000.00,
      total_withdrawals: 150000.00,
      net_revenue: 45000.00,
      operating_costs: 145000.00,
      other_expenses: 5000.00,
      gross_profit: 45000.00,
      platform_fee: 2250.00,
      net_profit: 42750.00,
      dividend_pool: 25650.00,
      reinvestment_amount: 17100.00,
      verification_status: 'verified',
      verified_by: admin.id,
      verified_at: new Date('2024-09-02'),
    },
  });
  console.log(`✅ Revenue Report: ${company2.business_name} - August 2024`);

  // Le Petit Bistro Revenue Report
  const report6 = await prisma.revenueReport.create({
    data: {
      company_id: company3.id,
      report_month: 8,
      report_year: 2024,
      period_start: new Date('2024-08-01'),
      period_end: new Date('2024-08-31'),
      total_deposits: 48000.00,
      total_withdrawals: 38000.00,
      net_revenue: 10000.00,
      operating_costs: 35000.00,
      other_expenses: 3000.00,
      gross_profit: 10000.00,
      platform_fee: 500.00,
      net_profit: 9500.00,
      dividend_pool: 5700.00,
      reinvestment_amount: 3800.00,
      verification_status: 'verified',
      verified_by: admin.id,
      verified_at: new Date('2024-09-02'),
    },
  });
  console.log(`✅ Revenue Report: ${company3.business_name} - August 2024`);

  console.log('\n');

  // ============================================
  // CREATE DIVIDENDS
  // ============================================
  console.log('Creating dividends...');

  // SuperMart Dividends
  const dividend1 = await prisma.dividend.create({
    data: {
      company_id: company1.id,
      revenue_report_id: report1.id,
      total_dividend_pool: 11400.00,
      total_shares_eligible: 10000,
      amount_per_share: 1.14,
      payment_status: 'completed',
      distribution_date: new Date('2024-07-05'),
    },
  });
  console.log(`✅ Dividend: ${company1.business_name} - June 2024: $${dividend1.amount_per_share}/share`);

  const dividend2 = await prisma.dividend.create({
    data: {
      company_id: company1.id,
      revenue_report_id: report2.id,
      total_dividend_pool: 11400.00,
      total_shares_eligible: 10000,
      amount_per_share: 1.14,
      payment_status: 'completed',
      distribution_date: new Date('2024-08-05'),
    },
  });
  console.log(`✅ Dividend: ${company1.business_name} - July 2024: $${dividend2.amount_per_share}/share`);

  const dividend3 = await prisma.dividend.create({
    data: {
      company_id: company1.id,
      revenue_report_id: report3.id,
      total_dividend_pool: 13110.00,
      total_shares_eligible: 10000,
      amount_per_share: 1.311,
      payment_status: 'completed',
      distribution_date: new Date('2024-09-05'),
    },
  });
  console.log(`✅ Dividend: ${company1.business_name} - August 2024: $${dividend3.amount_per_share}/share`);

  // Factory XYZ Dividends
  const dividend4 = await prisma.dividend.create({
    data: {
      company_id: company2.id,
      revenue_report_id: report4.id,
      total_dividend_pool: 22800.00,
      total_shares_eligible: 50000,
      amount_per_share: 0.456,
      payment_status: 'completed',
      distribution_date: new Date('2024-08-05'),
    },
  });
  console.log(`✅ Dividend: ${company2.business_name} - July 2024: $${dividend4.amount_per_share}/share`);

  const dividend5 = await prisma.dividend.create({
    data: {
      company_id: company2.id,
      revenue_report_id: report5.id,
      total_dividend_pool: 25650.00,
      total_shares_eligible: 50000,
      amount_per_share: 0.513,
      payment_status: 'completed',
      distribution_date: new Date('2024-09-05'),
    },
  });
  console.log(`✅ Dividend: ${company2.business_name} - August 2024: $${dividend5.amount_per_share}/share`);

  // Le Petit Bistro Dividend
  const dividend6 = await prisma.dividend.create({
    data: {
      company_id: company3.id,
      revenue_report_id: report6.id,
      total_dividend_pool: 5700.00,
      total_shares_eligible: 5000,
      amount_per_share: 1.14,
      payment_status: 'completed',
      distribution_date: new Date('2024-09-05'),
    },
  });
  console.log(`✅ Dividend: ${company3.business_name} - August 2024: $${dividend6.amount_per_share}/share`);

  console.log('\n');

  // ============================================
  // CREATE DIVIDEND PAYOUTS
  // ============================================
  console.log('Creating dividend payouts...');

  // John payouts
  await prisma.dividendPayout.create({
    data: {
      dividend_id: dividend1.id,
      user_id: investor1.id,
      shares_held: 100,
      payout_amount: 114.00,
      payment_method: 'wallet',
      status: 'completed',
      paid_at: new Date('2024-07-05'),
    },
  });
  console.log(`✅ Payout: ${investor1.full_name} - June dividend: $114.00`);

  await prisma.dividendPayout.create({
    data: {
      dividend_id: dividend2.id,
      user_id: investor1.id,
      shares_held: 100,
      payout_amount: 114.00,
      payment_method: 'wallet',
      status: 'completed',
      paid_at: new Date('2024-08-05'),
    },
  });
  console.log(`✅ Payout: ${investor1.full_name} - July dividend: $114.00`);

  await prisma.dividendPayout.create({
    data: {
      dividend_id: dividend3.id,
      user_id: investor1.id,
      shares_held: 100,
      payout_amount: 131.10,
      payment_method: 'wallet',
      status: 'completed',
      paid_at: new Date('2024-09-05'),
    },
  });
  console.log(`✅ Payout: ${investor1.full_name} - August dividend: $131.10`);

  // Sarah payouts
  await prisma.dividendPayout.create({
    data: {
      dividend_id: dividend1.id,
      user_id: investor2.id,
      shares_held: 250,
      payout_amount: 285.00,
      payment_method: 'wallet',
      status: 'completed',
      paid_at: new Date('2024-07-05'),
    },
  });
  console.log(`✅ Payout: ${investor2.full_name} - June dividend: $285.00`);

  await prisma.dividendPayout.create({
    data: {
      dividend_id: dividend2.id,
      user_id: investor2.id,
      shares_held: 250,
      payout_amount: 285.00,
      payment_method: 'wallet',
      status: 'completed',
      paid_at: new Date('2024-08-05'),
    },
  });
  console.log(`✅ Payout: ${investor2.full_name} - July dividend: $285.00`);

  console.log('\n');

  // ============================================
  // CREATE ORDERS
  // ============================================
  console.log('Creating orders...');

  // Active buy orders
  const order1 = await prisma.order.create({
    data: {
      user_id: investor3.id,
      company_id: company1.id,
      order_type: 'limit',
      side: 'buy',
      quantity: 50,
      price: 11.00,
      filled_quantity: 0,
      remaining_quantity: 50,
      status: 'pending',
      expires_at: new Date('2024-12-31'),
    },
  });
  console.log(`✅ Order: ${investor3.full_name} - BUY 50 ${company1.business_name} @ $11.00`);

  const order2 = await prisma.order.create({
    data: {
      user_id: investor1.id,
      company_id: company2.id,
      order_type: 'limit',
      side: 'buy',
      quantity: 30,
      price: 12.50,
      filled_quantity: 0,
      remaining_quantity: 30,
      status: 'pending',
      expires_at: new Date('2024-12-31'),
    },
  });
  console.log(`✅ Order: ${investor1.full_name} - BUY 30 ${company2.business_name} @ $12.50`);

  // Active sell orders
  const order3 = await prisma.order.create({
    data: {
      user_id: investor1.id,
      company_id: company1.id,
      order_type: 'limit',
      side: 'sell',
      quantity: 25,
      price: 12.00,
      filled_quantity: 0,
      remaining_quantity: 25,
      status: 'pending',
      expires_at: new Date('2024-12-31'),
    },
  });
  console.log(`✅ Order: ${investor1.full_name} - SELL 25 ${company1.business_name} @ $12.00`);

  console.log('\n');

  // ============================================
  // CREATE TRADES
  // ============================================
  console.log('Creating trades...');

  const trade1 = await prisma.trade.create({
    data: {
      buy_order_id: order1.id,
      sell_order_id: order3.id,
      buyer_id: investor3.id,
      seller_id: investor1.id,
      company_id: company1.id,
      quantity: 10,
      price: 11.50,
      total_amount: 115.00,
      platform_fee: 0.58,
      executed_at: new Date('2024-09-10'),
    },
  });
  console.log(`✅ Trade: ${investor3.full_name} bought 10 shares from ${investor1.full_name} @ $11.50`);

  console.log('\n');

  // ============================================
  // CREATE TRANSACTIONS
  // ============================================
  console.log('Creating transactions...');

  // Deposit transactions
  const txn1 = await prisma.transaction.create({
    data: {
      user_id: investor1.id,
      transaction_type: 'deposit',
      payment_method: 'wave',
      amount: 2000.00,
      currency: 'XOF',
      fee_amount: 20.00,
      fee_currency: 'XOF',
      status: 'completed',
      reference_id: 'WAVE123456',
      completed_at: new Date('2024-06-01'),
    },
  });
  console.log(`✅ Transaction: ${investor1.full_name} - Deposit $2000 via Wave`);

  const txn2 = await prisma.transaction.create({
    data: {
      user_id: investor2.id,
      transaction_type: 'deposit',
      payment_method: 'card',
      amount: 5000.00,
      currency: 'USD',
      fee_amount: 145.30,
      fee_currency: 'USD',
      status: 'completed',
      reference_id: 'STRIPE_CH_123',
      completed_at: new Date('2024-06-05'),
    },
  });
  console.log(`✅ Transaction: ${investor2.full_name} - Deposit $5000 via Card`);

  const txn3 = await prisma.transaction.create({
    data: {
      user_id: investor2.id,
      transaction_type: 'deposit',
      payment_method: 'crypto',
      amount: 2500.00,
      currency: 'USDT',
      status: 'completed',
      reference_id: '0xabc123def456',
      crypto_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEbD',
      crypto_tx_hash: '0xdef789ghi012',
      crypto_confirmations: 12,
      completed_at: new Date('2024-06-06'),
    },
  });
  console.log(`✅ Transaction: ${investor2.full_name} - Deposit $2500 USDT`);

  // Trade fee transaction
  const txn4 = await prisma.transaction.create({
    data: {
      user_id: investor3.id,
      transaction_type: 'fee',
      payment_method: 'wallet',
      amount: 0.58,
      currency: 'USD',
      status: 'completed',
      reference_id: `FEE_${trade1.id}`,
      completed_at: new Date('2024-09-10'),
    },
  });
  console.log(`✅ Transaction: ${investor3.full_name} - Trading fee $0.58`);

  console.log('\n');

  // ============================================
  // CREATE PRICE HISTORY
  // ============================================
  console.log('Creating price history...');

  // SuperMart price history
  const priceHistoryData1 = [
    { price: 10.00, volume: 7000, timestamp: new Date('2024-06-01') },
    { price: 10.20, volume: 500, timestamp: new Date('2024-06-15') },
    { price: 10.50, volume: 800, timestamp: new Date('2024-07-01') },
    { price: 10.80, volume: 600, timestamp: new Date('2024-07-15') },
    { price: 11.00, volume: 900, timestamp: new Date('2024-08-01') },
    { price: 11.30, volume: 700, timestamp: new Date('2024-08-15') },
    { price: 11.50, volume: 1000, timestamp: new Date('2024-09-01') },
  ];

  for (const data of priceHistoryData1) {
    await prisma.priceHistory.create({
      data: {
        company_id: company1.id,
        ...data,
      },
    });
  }
  console.log(`✅ Price History: ${company1.business_name} - ${priceHistoryData1.length} records`);

  // Factory XYZ price history
  const priceHistoryData2 = [
    { price: 10.00, volume: 15000, timestamp: new Date('2024-07-01') },
    { price: 11.00, volume: 2000, timestamp: new Date('2024-07-15') },
    { price: 11.50, volume: 2500, timestamp: new Date('2024-08-01') },
    { price: 12.00, volume: 1800, timestamp: new Date('2024-08-15') },
    { price: 12.50, volume: 2200, timestamp: new Date('2024-09-01') },
    { price: 12.80, volume: 1500, timestamp: new Date('2024-09-15') },
  ];

  for (const data of priceHistoryData2) {
    await prisma.priceHistory.create({
      data: {
        company_id: company2.id,
        ...data,
      },
    });
  }
  console.log(`✅ Price History: ${company2.business_name} - ${priceHistoryData2.length} records`);

  console.log('\n');

  // ============================================
  // CREATE BANK TRANSACTIONS
  // ============================================
  console.log('Creating bank transactions...');

  // SuperMart daily deposits for September
  const bankTxns1 = [
    { date: '2024-09-01', type: 'credit' as const, amount: 2800.00, balance: 52800.00, desc: 'Daily sales' },
    { date: '2024-09-02', type: 'credit' as const, amount: 3200.00, balance: 56000.00, desc: 'Daily sales' },
    { date: '2024-09-03', type: 'debit' as const, amount: 5000.00, balance: 51000.00, desc: 'Supplier payment' },
    { date: '2024-09-03', type: 'credit' as const, amount: 2900.00, balance: 53900.00, desc: 'Daily sales' },
    { date: '2024-09-04', type: 'credit' as const, amount: 3100.00, balance: 57000.00, desc: 'Daily sales' },
    { date: '2024-09-05', type: 'credit' as const, amount: 3500.00, balance: 60500.00, desc: 'Daily sales' },
  ];

  for (const txn of bankTxns1) {
    await prisma.bankTransaction.create({
      data: {
        company_id: company1.id,
        transaction_date: new Date(txn.date),
        transaction_type: txn.type,
        amount: txn.amount,
        balance_after: txn.balance,
        description: txn.desc,
        bank_reference: `ECO${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        category: txn.type === 'credit' ? 'sales' : 'expense',
      },
    });
  }
  console.log(`✅ Bank Transactions: ${company1.business_name} - ${bankTxns1.length} records`);

  console.log('\n');

  // ============================================
  // CREATE ADMIN LOGS
  // ============================================
  console.log('Creating admin logs...');

  await prisma.adminLog.create({
    data: {
      admin_id: admin.id,
      action_type: 'approve_company',
      target_type: 'company',
      target_id: company1.id,
      details: { reason: 'All documents verified, bank connected' },
      ip_address: '192.168.1.100',
      previous_values: { verification_status: 'pending' },
      current_values: { verification_status: 'approved' },
    },
  });
  console.log(`✅ Admin Log: Company ${company1.business_name} approved`);

  await prisma.adminLog.create({
    data: {
      admin_id: admin.id,
      action_type: 'approve_company',
      target_type: 'company',
      target_id: company2.id,
      details: { reason: 'All documents verified, bank connected' },
      ip_address: '192.168.1.100',
      previous_values: { verification_status: 'pending' },
      current_values: { verification_status: 'approved' },
    },
  });
  console.log(`✅ Admin Log: Company ${company2.business_name} approved`);

  await prisma.adminLog.create({
    data: {
      admin_id: admin.id,
      action_type: 'verify_revenue',
      target_type: 'revenue_report',
      target_id: report1.id,
      details: { month: 6, year: 2024 },
      ip_address: '192.168.1.100',
    },
  });
  console.log(`✅ Admin Log: Revenue report verified`);

  console.log('\n');
  console.log('============================================');
  console.log('✅ SEED COMPLETED SUCCESSFULLY!');
  console.log('============================================');
  console.log('\nSummary:');
  console.log('- 1 Admin user');
  console.log('- 3 Investor users');
  console.log('- 3 Business owner users');
  console.log('- 4 Companies (3 active, 1 pending)');
  console.log('- 5 Stock holdings');
  console.log('- 6 Revenue reports');
  console.log('- 6 Dividends');
  console.log('- 6 Dividend payouts');
  console.log('- 3 Orders');
  console.log('- 1 Trade');
  console.log('- 4 Transactions');
  console.log('- 13 Price history records');
  console.log('- 6 Bank transactions');
  console.log('- 3 Admin logs');
  console.log('\nTest Credentials:');
  console.log('Admin: admin@tradingplatform.com / Password123!');
  console.log('Investor: john.investor@email.com / Password123!');
  console.log('Business Owner: marie.supermart@email.com / Password123!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
