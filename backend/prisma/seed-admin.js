// Admin User Seed Script
// Run this after deployment to create the first admin user

const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedAdmin() {
  try {
    console.log('🌱 Seeding admin user...');

    // Admin credentials from deployment config
    const adminData = {
      email: 'admin@trademe.com',
      full_name: 'Napole Weng',
      password: 'SuperSecure123!',
      phone: '+2250789070000',
      role: 'admin',
      kyc_status: 'verified', // Auto-verify admin
    };

    // Check if admin already exists
    const existingAdmin = await prisma.users.findUnique({
      where: { email: adminData.email },
    });

    if (existingAdmin) {
      console.log('⚠️  Admin user already exists:', adminData.email);
      console.log('   Skipping creation.');
      return;
    }

    // Hash password
    const SALT_ROUNDS = 12;
    const password_hash = await bcrypt.hash(adminData.password, SALT_ROUNDS);

    // Create admin user
    const admin = await prisma.users.create({
      data: {
        email: adminData.email,
        full_name: adminData.full_name,
        phone: adminData.phone,
        password_hash: password_hash,
        role: adminData.role,
        kyc_status: adminData.kyc_status,
        wallet_fiat: 0,
        wallet_crypto_usdt: 0,
        wallet_crypto_btc: 0,
      },
      select: {
        id: true,
        email: true,
        full_name: true,
        role: true,
        created_at: true,
      },
    });

    console.log('✅ Admin user created successfully!');
    console.log('');
    console.log('Admin Details:');
    console.log('  ID:', admin.id);
    console.log('  Email:', admin.email);
    console.log('  Name:', admin.full_name);
    console.log('  Role:', admin.role);
    console.log('  Created:', admin.created_at);
    console.log('');
    console.log('Login Credentials:');
    console.log('  Email: admin@trademe.com');
    console.log('  Password: SuperSecure123!');
    console.log('');
    console.log('⚠️  IMPORTANT: Change the password after first login!');

  } catch (error) {
    console.error('❌ Error seeding admin:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seedAdmin();
