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
      fullName: 'Napole Weng',
      password: 'SuperSecure123!',
      phone: '+2250789070000',
      role: 'admin',
      kycStatus: 'verified', // Auto-verify admin
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
    const passwordHash = await bcrypt.hash(adminData.password, SALT_ROUNDS);

    // Create admin user
    const admin = await prisma.users.create({
      data: {
        email: adminData.email,
        fullName: adminData.fullName,
        phone: adminData.phone,
        passwordHash: passwordHash,
        role: adminData.role,
        kycStatus: adminData.kycStatus,
        walletFiat: 0,
        walletCryptoUsdt: 0,
        walletCryptoBtc: 0,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        createdAt: true,
      },
    });

    console.log('✅ Admin user created successfully!');
    console.log('');
    console.log('Admin Details:');
    console.log('  ID:', admin.id);
    console.log('  Email:', admin.email);
    console.log('  Name:', admin.fullName);
    console.log('  Role:', admin.role);
    console.log('  Created:', admin.createdAt);
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
