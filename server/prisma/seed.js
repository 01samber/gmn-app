import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');
  console.log('🧹 Clearing existing data...');

  // Clear existing data in correct order (respect foreign keys)
  await prisma.cost.deleteMany();
  await prisma.proposal.deleteMany();
  await prisma.file.deleteMany();
  await prisma.calendarEvent.deleteMany();
  await prisma.workOrder.deleteMany();
  await prisma.technician.deleteMany();
  await prisma.user.deleteMany();

  console.log('✅ Database cleared');

  // Create users
  const hashedPassword = await bcrypt.hash('demo123', 12);
  
  const adminUser = await prisma.user.create({
    data: {
      email: 'demo@gmn.com',
      password: hashedPassword,
      name: 'Demo Admin',
      role: 'admin',
    },
  });
  console.log('✅ Created admin user:', adminUser.email);

  // Create Samer - dispatcher user for commission testing
  const samerUser = await prisma.user.create({
    data: {
      email: 'samerr@gmn.com',
      password: hashedPassword,
      name: 'Samer R',
      role: 'dispatcher',
    },
  });
  console.log('✅ Created dispatcher user:', samerUser.email);

  // Create technicians
  const technicians = await Promise.all([
    prisma.technician.create({
      data: { id: 'john-smith', name: 'John Smith', trade: 'HVAC', phone: '555-0101', city: 'Austin', state: 'TX', hourlyRate: 75 },
    }),
    prisma.technician.create({
      data: { id: 'maria-garcia', name: 'Maria Garcia', trade: 'Plumbing', phone: '555-0102', city: 'Houston', state: 'TX', hourlyRate: 65 },
    }),
    prisma.technician.create({
      data: { id: 'mike-johnson', name: 'Mike Johnson', trade: 'Electrical', phone: '555-0103', city: 'Dallas', state: 'TX', hourlyRate: 80 },
    }),
    prisma.technician.create({
      data: { id: 'sarah-williams', name: 'Sarah Williams', trade: 'HVAC', phone: '555-0104', city: 'San Antonio', state: 'TX', hourlyRate: 70 },
    }),
    prisma.technician.create({
      data: { id: 'david-brown', name: 'David Brown', trade: 'General Maintenance', phone: '555-0105', city: 'Austin', state: 'TX', hourlyRate: 55 },
    }),
  ]);
  console.log('✅ Created', technicians.length, 'technicians');

  // Get current month dates
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  // Helper to generate random date within current month
  const randomDateThisMonth = () => {
    const day = Math.floor(Math.random() * (lastDayOfMonth.getDate() - 1)) + 1;
    return new Date(now.getFullYear(), now.getMonth(), day);
  };

  // Create 26 PAID work orders for Samer's commission test
  // Mix of different scenarios to test commission rules:
  // - Regular jobs (profit >= 75%)
  // - Low profit jobs (< 75% - excluded)
  // - Incurred jobs (count as 0.5)
  // - Low NTE jobs <= 225 (count as 0.5)
  // - Reassigned jobs (count as x2)
  
  const samerWorkOrders = [
    // Regular PAID jobs with good profit (>= 75%) - count as 1 each
    { woNumber: 'WO-S001', client: 'Alpha Corp', trade: 'HVAC', nte: 1000, cost: 200, notes: '' }, // Profit: 400% ✓
    { woNumber: 'WO-S002', client: 'Beta Inc', trade: 'Plumbing', nte: 800, cost: 150, notes: '' }, // Profit: 433% ✓
    { woNumber: 'WO-S003', client: 'Gamma LLC', trade: 'Electrical', nte: 1200, cost: 300, notes: '' }, // Profit: 300% ✓
    { woNumber: 'WO-S004', client: 'Delta Co', trade: 'HVAC', nte: 600, cost: 100, notes: '' }, // Profit: 500% ✓
    { woNumber: 'WO-S005', client: 'Epsilon Ltd', trade: 'Plumbing', nte: 900, cost: 200, notes: '' }, // Profit: 350% ✓
    { woNumber: 'WO-S006', client: 'Zeta Corp', trade: 'Electrical', nte: 750, cost: 150, notes: '' }, // Profit: 400% ✓
    { woNumber: 'WO-S007', client: 'Eta Inc', trade: 'HVAC', nte: 1100, cost: 250, notes: '' }, // Profit: 340% ✓
    { woNumber: 'WO-S008', client: 'Theta LLC', trade: 'Plumbing', nte: 850, cost: 180, notes: '' }, // Profit: 372% ✓
    { woNumber: 'WO-S009', client: 'Iota Co', trade: 'Electrical', nte: 950, cost: 200, notes: '' }, // Profit: 375% ✓
    { woNumber: 'WO-S010', client: 'Kappa Ltd', trade: 'HVAC', nte: 700, cost: 120, notes: '' }, // Profit: 483% ✓
    { woNumber: 'WO-S011', client: 'Lambda Corp', trade: 'Plumbing', nte: 1050, cost: 220, notes: '' }, // Profit: 377% ✓
    { woNumber: 'WO-S012', client: 'Mu Inc', trade: 'Electrical', nte: 800, cost: 160, notes: '' }, // Profit: 400% ✓
    { woNumber: 'WO-S013', client: 'Nu LLC', trade: 'HVAC', nte: 650, cost: 130, notes: '' }, // Profit: 400% ✓
    { woNumber: 'WO-S014', client: 'Xi Co', trade: 'Plumbing', nte: 720, cost: 140, notes: '' }, // Profit: 414% ✓
    { woNumber: 'WO-S015', client: 'Omicron Ltd', trade: 'Electrical', nte: 880, cost: 175, notes: '' }, // Profit: 403% ✓
    
    // Low profit jobs (< 75% profit ratio) - EXCLUDED from count
    { woNumber: 'WO-S016', client: 'Low Profit A', trade: 'HVAC', nte: 500, cost: 400, notes: '' }, // Profit: 25% ✗
    { woNumber: 'WO-S017', client: 'Low Profit B', trade: 'Plumbing', nte: 600, cost: 500, notes: '' }, // Profit: 20% ✗
    
    // Incurred jobs - count as 0.5
    { woNumber: 'WO-S018', client: 'Incurred Job A', trade: 'HVAC', nte: 800, cost: 150, notes: 'Incurred - trip charge only' }, // 0.5
    { woNumber: 'WO-S019', client: 'Incurred Job B', trade: 'Electrical', nte: 700, cost: 120, notes: 'Job marked as incurred' }, // 0.5
    
    // Low NTE jobs (<= $225) - count as 0.5
    { woNumber: 'WO-S020', client: 'Small Job A', trade: 'Plumbing', nte: 200, cost: 40, notes: '' }, // NTE <= 225, 0.5
    { woNumber: 'WO-S021', client: 'Small Job B', trade: 'HVAC', nte: 225, cost: 45, notes: '' }, // NTE <= 225, 0.5
    { woNumber: 'WO-S022', client: 'Small Job C', trade: 'Electrical', nte: 180, cost: 35, notes: '' }, // NTE <= 225, 0.5
    
    // Reassigned jobs - count as x2
    { woNumber: 'WO-S023', client: 'Reassign Corp A', trade: 'HVAC', nte: 900, cost: 180, notes: 'Reassigned from another dispatcher' }, // x2 = 2
    { woNumber: 'WO-S024', client: 'Reassign Corp B', trade: 'Plumbing', nte: 750, cost: 150, notes: 'Job reassigned' }, // x2 = 2
    
    // More regular jobs to reach 26 total
    { woNumber: 'WO-S025', client: 'Final Corp A', trade: 'Electrical', nte: 1000, cost: 200, notes: '' }, // Profit: 400% ✓
    { woNumber: 'WO-S026', client: 'Final Corp B', trade: 'HVAC', nte: 850, cost: 170, notes: '' }, // Profit: 400% ✓
  ];

  const techIds = ['john-smith', 'maria-garcia', 'mike-johnson', 'sarah-williams', 'david-brown'];
  
  console.log('📝 Creating 26 work orders for Samer...');
  
  for (let i = 0; i < samerWorkOrders.length; i++) {
    const woData = samerWorkOrders[i];
    const techId = techIds[i % techIds.length];
    const completedDate = randomDateThisMonth();
    
    // Create work order
    const wo = await prisma.workOrder.create({
      data: {
        woNumber: woData.woNumber,
        client: woData.client,
        trade: woData.trade,
        nte: woData.nte,
        status: 'paid', // All jobs are PAID for commission
        notes: woData.notes,
        city: 'Austin',
        state: 'TX',
        technicianId: techId,
        createdById: samerUser.id,
        completedAt: completedDate,
        updatedAt: completedDate, // Important for month filtering
      },
    });

    // Create cost for this work order
    await prisma.cost.create({
      data: {
        workOrderId: wo.id,
        technicianId: techId,
        amount: woData.cost,
        status: 'paid',
        note: `Labor and materials for ${woData.client}`,
        createdById: samerUser.id,
      },
    });
  }
  
  console.log('✅ Created 26 PAID work orders with costs for Samer');

  // Commission calculation breakdown for Samer:
  // =============================================
  // Regular jobs (15): WO-S001 to WO-S015 = 15 x 1 = 15
  // Excluded low profit (2): WO-S016, WO-S017 = 0
  // Incurred jobs (2): WO-S018, WO-S019 = 2 x 0.5 = 1
  // Low NTE jobs (3): WO-S020, WO-S021, WO-S022 = 3 x 0.5 = 1.5
  // Reassigned jobs (2): WO-S023, WO-S024 = 2 x 2 = 4
  // Regular jobs (2): WO-S025, WO-S026 = 2 x 1 = 2
  // =============================================
  // Total qualified count: 15 + 0 + 1 + 1.5 + 4 + 2 = 23.5
  // 
  // Wait - we need 26 total WOs, but qualified count determines rate
  // 23.5 WOs qualified -> Below 25 threshold = $0 per WO
  // 
  // Let me adjust to ensure we hit the 25-35 tier ($3 per WO)
  // Need at least 25 qualified WOs

  console.log('');
  console.log('📊 Expected Commission Calculation for Samer:');
  console.log('='.repeat(50));
  console.log('Regular good profit jobs: 17 x 1.0 = 17.0');
  console.log('Excluded (low profit):     2 x 0.0 = 0.0');
  console.log('Incurred jobs:             2 x 0.5 = 1.0');
  console.log('Low NTE (<=225):           3 x 0.5 = 1.5');
  console.log('Reassigned jobs:           2 x 2.0 = 4.0');
  console.log('='.repeat(50));
  console.log('Total WOs: 26');
  console.log('Qualified Count: 17 + 1 + 1.5 + 4 = 23.5');
  console.log('');
  console.log('⚠️  23.5 is below 25 WO threshold - NO commission!');
  console.log('');
  console.log('Adding 3 more good profit jobs to reach 26.5 qualified...');

  // Add 3 more good profit jobs to reach the 25-35 tier
  const extraJobs = [
    { woNumber: 'WO-S027', client: 'Extra Corp A', trade: 'HVAC', nte: 900, cost: 180 },
    { woNumber: 'WO-S028', client: 'Extra Corp B', trade: 'Plumbing', nte: 850, cost: 170 },
    { woNumber: 'WO-S029', client: 'Extra Corp C', trade: 'Electrical', nte: 800, cost: 160 },
  ];

  for (let i = 0; i < extraJobs.length; i++) {
    const woData = extraJobs[i];
    const techId = techIds[i % techIds.length];
    const completedDate = randomDateThisMonth();
    
    const wo = await prisma.workOrder.create({
      data: {
        woNumber: woData.woNumber,
        client: woData.client,
        trade: woData.trade,
        nte: woData.nte,
        status: 'paid',
        notes: '',
        city: 'Austin',
        state: 'TX',
        technicianId: techId,
        createdById: samerUser.id,
        completedAt: completedDate,
        updatedAt: completedDate,
      },
    });

    await prisma.cost.create({
      data: {
        workOrderId: wo.id,
        technicianId: techId,
        amount: woData.cost,
        status: 'paid',
        note: `Labor for ${woData.client}`,
        createdById: samerUser.id,
      },
    });
  }

  console.log('✅ Added 3 extra jobs');
  console.log('');
  console.log('📊 FINAL Commission Calculation for Samer:');
  console.log('='.repeat(50));
  console.log('Regular good profit jobs: 20 x 1.0 = 20.0');
  console.log('Excluded (low profit):     2 x 0.0 = 0.0');
  console.log('Incurred jobs:             2 x 0.5 = 1.0');
  console.log('Low NTE (<=225):           3 x 0.5 = 1.5');
  console.log('Reassigned jobs:           2 x 2.0 = 4.0');
  console.log('='.repeat(50));
  console.log('Total WOs: 29');
  console.log('Qualified Count: 20 + 1 + 1.5 + 4 = 26.5');
  console.log('Rate Tier: 25-35 WOs = $3 per WO');
  console.log('Expected Commission: 26.5 x $3 = $79.50');
  console.log('');

  console.log('🎉 Seeding complete!');
  console.log('');
  console.log('📋 Login Credentials:');
  console.log('   Admin:      demo@gmn.com / demo123');
  console.log('   Dispatcher: samerr@gmn.com / demo123');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
