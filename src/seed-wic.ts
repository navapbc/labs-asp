import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';

// Load environment variables
config();

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting WIC benefits database seeding...');

  try {
    // Create Sarah Johnson as the main participant
    const participant = await prisma.participant.create({
      data: {
        participantId: 'WIC-SJ-2025-001',
        firstName: 'Sarah',
        lastName: 'Johnson',
        dateOfBirth: new Date('1999-11-15'), // 24 years old (born Nov 15, 1999)
        homeAddress: '456 Oak Street, Riverside, CA 92503',
        mailingAddress: '456 Oak Street, Riverside, CA 92503',
        mobileNumber: '(951) 555-0789',
        canReceiveTexts: true,
        preferredLanguage: 'English',
        email: 'sarah.johnson@email.com',
        
        // MediCal information - assume she doesn't have it for WIC eligibility
        hasMediCal: false,
        mediCalCaseNumber: null,
        mediCalAmount: null,
        
        // WIC specific fields - undefined means unknown, agent will determine
        isPregnant: undefined,
        isPostPartum: undefined,
        isInfantBreastfeeding: undefined,
        isInfantFormula: undefined,
        hasChildren0to5: undefined,
        hasDependents: undefined, // Agent will determine if she has dependents
        
        // Income information
        monthlyIncome: 2500.00,
        occupation: 'Part-time grocery store worker',
      },
    });

    console.log(`✅ Created participant: ${participant.firstName} ${participant.lastName} (ID: ${participant.participantId})`);

    // Create additional sample data for testing
    const participant2 = await prisma.participant.create({
      data: {
        participantId: 'WIC-MB-2025-002',
        firstName: 'Maria',
        lastName: 'Rodriguez',
        dateOfBirth: new Date('1995-08-22'), // 28 years old
        homeAddress: '789 Pine Avenue, Riverside, CA 92505',
        mailingAddress: '789 Pine Avenue, Riverside, CA 92505',
        mobileNumber: '(951) 555-0456',
        canReceiveTexts: true,
        preferredLanguage: 'Spanish',
        email: 'maria.rodriguez@email.com',
        
        // MediCal information
        hasMediCal: true,
        mediCalCaseNumber: 'MC-12345678',
        mediCalAmount: 150.00,
        
        // WIC specific fields - undefined means unknown, agent will determine
        isPregnant: undefined,
        isPostPartum: undefined,
        isInfantBreastfeeding: undefined,
        isInfantFormula: undefined,
        hasChildren0to5: undefined,
        hasDependents: undefined, // Agent will determine if she has dependents
        
        // Income information
        monthlyIncome: 1800.00,
        occupation: 'Restaurant server',
      },
    });

    console.log(`✅ Created participant: ${participant2.firstName} ${participant2.lastName} (ID: ${participant2.participantId})`);

    console.log('\n🎉 WIC benefits database seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   • ${await prisma.participant.count()} participants created`);
    
    console.log('\n👥 Participants:');
    const allParticipants = await prisma.participant.findMany();
    
    allParticipants.forEach((p: any) => {
      console.log(`   • ${p.firstName} ${p.lastName} (${p.participantId})`);
      console.log(`     - Address: ${p.homeAddress}`);
      console.log(`     - Income: $${p.monthlyIncome}/month`);
      console.log(`     - WIC eligibility fields: To be determined by agent`);
    });

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('❌ Seed script failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log('🔌 Database connection closed');
  }); 