import prisma from './prisma.js';
import bcrypt from 'bcryptjs';
import { calculateLoan, generateSchedule } from './services/loanCalculation.js';

async function seed() {
  console.log('Seeding database...');

  // Clean existing data
  await prisma.subscription.deleteMany();
  await prisma.licenseCode.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.paymentSchedule.deleteMany();
  await prisma.document.deleteMany();
  await prisma.loan.deleteMany();
  await prisma.borrower.deleteMany();
  await prisma.user.deleteMany();
  await prisma.lender.deleteMany();
  await prisma.admin.deleteMany();

  // Create platform admin (password: superadmin)
  const adminPassword = await bcrypt.hash('superadmin', 10);
  await prisma.admin.create({
    data: { email: 'admin@checkdebt.app', password: adminPassword, name: 'Platform Admin' },
  });
  console.log('  Created platform admin: admin@checkdebt.app / superadmin');

  // Create a lender (with 3-month trial) — based in Bangkok
  const trialEnds = new Date();
  trialEnds.setMonth(trialEnds.getMonth() + 3);
  const lender = await prisma.lender.create({
    data: {
      name: 'สินเชื่อด่วน จำกัด',
      trial_ends_at: trialEnds,
      address: '123/45 ถ.สุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพฯ 10110',
      lat: 13.7234,
      lng: 100.5601,
    },
  });

  // Create owner user (password: admin123)
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const owner = await prisma.user.create({
    data: {
      email: 'admin@quickfund.com',
      password: hashedPassword,
      name: 'สมชาย ผู้จัดการ',
      role: 'owner',
      lender_id: lender.id,
    },
  });

  // Create staff user (password: staff123)
  const staffPassword = await bcrypt.hash('staff123', 10);
  await prisma.user.create({
    data: {
      email: 'staff@quickfund.com',
      password: staffPassword,
      name: 'สมหญิง พนักงาน',
      role: 'staff',
      lender_id: lender.id,
    },
  });

  // Create borrowers — Thai names, addresses with coordinates for each
  const borrowers = await Promise.all([
    prisma.borrower.create({
      data: {
        lender_id: lender.id,
        name: 'สุภาพร ใจดี',
        phone: '081-234-5678',
        registered_address: '99/5 หมู่ 3 ต.บางพลี อ.บางพลี จ.สมุทรปราการ 10540',
        registered_lat: 13.6048,
        registered_lng: 100.7053,
        residential_address: '25/10 ซ.สุขุมวิท 77 แขวงอ่อนนุช เขตสวนหลวง กรุงเทพฯ 10250',
        residential_lat: 13.6614,
        residential_lng: 100.6658,
        work_address: 'อาคารสีลมคอมเพล็กซ์ ชั้น 12 ถ.สีลม แขวงสีลม เขตบางรัก กรุงเทพฯ 10500',
        work_lat: 13.7262,
        work_lng: 100.5234,
        lat: 13.6614,
        lng: 100.6658,
      },
    }),
    prisma.borrower.create({
      data: {
        lender_id: lender.id,
        name: 'วิชัย มั่นคง',
        phone: '089-876-5432',
        registered_address: '55/2 ถ.รัชดาภิเษก แขวงดินแดง เขตดินแดง กรุงเทพฯ 10400',
        registered_lat: 13.7648,
        registered_lng: 100.5564,
        residential_address: '88/3 หมู่ 5 ต.คลองหนึ่ง อ.คลองหลวง จ.ปทุมธานี 12120',
        residential_lat: 14.0651,
        residential_lng: 100.6151,
        work_address: 'ตลาดนัดรังสิต ถ.พหลโยธิน ต.ประชาธิปัตย์ อ.ธัญบุรี จ.ปทุมธานี 12130',
        work_lat: 14.0365,
        work_lng: 100.5955,
        lat: 14.0651,
        lng: 100.6151,
      },
    }),
    prisma.borrower.create({
      data: {
        lender_id: lender.id,
        name: 'นภา สว่างจิต',
        phone: '062-345-6789',
        registered_address: '123 ถ.พระราม 2 แขวงแสมดำ เขตบางขุนเทียน กรุงเทพฯ 10150',
        registered_lat: 13.6363,
        registered_lng: 100.4476,
        residential_address: '45/7 ซ.เพชรเกษม 69 แขวงหลักสอง เขตบางแค กรุงเทพฯ 10160',
        residential_lat: 13.6863,
        residential_lng: 100.4276,
        lat: 13.6863,
        lng: 100.4276,
      },
    }),
  ]);

  // Create loans with auto-generated schedules
  const loanConfigs = [
    {
      borrower_id: borrowers[0].id,
      principal: 50000,
      interest_rate: 2,
      interest_rate_unit: 'monthly',
      term_length: 6,
      term_unit: 'months',
      payment_frequency: 'monthly',
      interest_behavior: 'simple',
      disbursed_at: new Date('2026-01-15'),
    },
    {
      borrower_id: borrowers[1].id,
      principal: 20000,
      interest_rate: 0.1,
      interest_rate_unit: 'daily',
      term_length: 90,
      term_unit: 'days',
      payment_frequency: 'weekly',
      interest_behavior: 'capitalize',
      disbursed_at: new Date('2026-03-01'),
    },
    {
      borrower_id: borrowers[2].id,
      principal: 100000,
      interest_rate: 12,
      interest_rate_unit: 'yearly',
      term_length: 12,
      term_unit: 'months',
      payment_frequency: 'monthly',
      interest_behavior: 'simple',
      disbursed_at: new Date('2026-02-01'),
    },
  ];

  for (const config of loanConfigs) {
    const calc = calculateLoan({
      principal: config.principal,
      interest_rate: config.interest_rate,
      interest_rate_unit: config.interest_rate_unit,
      interest_method: 'flat',
      term_length: config.term_length,
      term_unit: config.term_unit,
      payment_frequency: config.payment_frequency,
      interest_behavior: config.interest_behavior,
    });

    const loan = await prisma.loan.create({
      data: {
        lender_id: lender.id,
        borrower_id: config.borrower_id,
        principal: config.principal,
        interest_rate: config.interest_rate,
        interest_rate_unit: config.interest_rate_unit,
        interest_method: 'flat',
        term_length: config.term_length,
        term_unit: config.term_unit,
        payment_frequency: config.payment_frequency,
        interest_behavior: config.interest_behavior,
        daily_rate: calc.daily_rate,
        total_interest: calc.total_interest,
        total_payable: calc.total_payable,
        installment_count: calc.installment_count,
        installment_amount: calc.installment_amount,
        outstanding_balance: calc.total_payable,
        disbursed_at: config.disbursed_at,
      },
    });

    // Generate schedule
    const schedule = generateSchedule({
      ...loan,
      disbursed_at: config.disbursed_at,
    });

    for (const item of schedule) {
      await prisma.paymentSchedule.create({
        data: {
          lender_id: lender.id,
          loan_id: loan.id,
          installment: item.installment,
          due_date: item.due_date,
          principal_due: item.principal_due,
          interest_due: item.interest_due,
          total_due: item.total_due,
        },
      });
    }

    console.log(`  Created loan for ${config.principal} to borrower ${config.borrower_id}`);
  }

  console.log('\nSeed complete!');
  console.log('Login credentials:');
  console.log('  Owner: admin@quickfund.com / admin123');
  console.log('  Staff: staff@quickfund.com / staff123');
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
