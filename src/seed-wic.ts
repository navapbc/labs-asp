import { query, pgPool } from './lib/db';
import { config } from 'dotenv';

// Load environment variables
config();

// Using centralized PostgreSQL client from ./lib/db

async function main() {
  console.log('🌱 Starting WIC benefits database seeding...');

  try {
    // Create Sarah Johnson as the main participant
    const insertQuery1 = `
      INSERT INTO participants (
        participant_id, first_name, last_name, date_of_birth, home_address, mailing_address,
        mobile_number, can_receive_texts, preferred_language, email, has_medi_cal,
        medi_cal_case_number, medi_cal_amount, is_pregnant, is_post_partum,
        is_infant_breastfeeding, is_infant_formula, has_children0to5, has_dependents,
        monthly_income, occupation
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
      RETURNING *
    `;
    
    const result1 = await query(insertQuery1, [
      'WIC-SJ-2025-001',
      'Sarah',
      'Johnson',
      new Date('1999-11-15'),
      '456 Oak Street, Riverside, CA 92503',
      '456 Oak Street, Riverside, CA 92503',
      '(951) 555-0789',
      true,
      'English',
      'sarah.johnson@email.com',
      false,
      null,
      null,
      null, // isPregnant - undefined means unknown, agent will determine
      null, // isPostPartum
      null, // isInfantBreastfeeding
      null, // isInfantFormula
      null, // hasChildren0to5
      null, // hasDependents - Agent will determine if she has dependents
      2500.00,
      'Part-time grocery store worker'
    ]);
    
    const participant = result1.rows[0];

    console.log(`✅ Created participant: ${participant.first_name} ${participant.last_name} (ID: ${participant.participant_id})`);

    // Create additional sample data for testing
    const insertQuery2 = `
      INSERT INTO participants (
        participant_id, first_name, last_name, date_of_birth, home_address, mailing_address,
        mobile_number, can_receive_texts, preferred_language, email, has_medi_cal,
        medi_cal_case_number, medi_cal_amount, is_pregnant, is_post_partum,
        is_infant_breastfeeding, is_infant_formula, has_children0to5, has_dependents,
        monthly_income, occupation
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
      RETURNING *
    `;
    
    const result2 = await query(insertQuery2, [
      'WIC-MB-2025-002',
      'Maria',
      'Rodriguez',
      new Date('1995-08-22'),
      '789 Pine Avenue, Riverside, CA 92505',
      '789 Pine Avenue, Riverside, CA 92505',
      '(951) 555-0456',
      true,
      'Spanish',
      'maria.rodriguez@email.com',
      true,
      'MC-12345678',
      150.00,
      null, // isPregnant - undefined means unknown, agent will determine
      null, // isPostPartum
      null, // isInfantBreastfeeding
      null, // isInfantFormula
      null, // hasChildren0to5
      null, // hasDependents - Agent will determine if she has dependents
      1800.00,
      'Restaurant server'
    ]);
    
    const participant2 = result2.rows[0];

    console.log(`✅ Created participant: ${participant2.first_name} ${participant2.last_name} (ID: ${participant2.participant_id})`);

    console.log('\n🎉 WIC benefits database seeding completed successfully!');
    console.log('\n📊 Summary:');
    
    // Get participant count
    const countResult = await query('SELECT COUNT(*) FROM participants');
    console.log(`   • ${countResult.rows[0].count} participants created`);
    
    console.log('\n👥 Participants:');
    const allParticipantsResult = await query('SELECT * FROM participants ORDER BY created_at');
    const allParticipants = allParticipantsResult.rows;
    
    allParticipants.forEach((p: any) => {
      console.log(`   • ${p.first_name} ${p.last_name} (${p.participant_id})`);
      console.log(`     - Address: ${p.home_address}`);
      console.log(`     - Income: $${p.monthly_income}/month`);
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
    await pgPool.end();
    console.log('🔌 Database connection closed');
  }); 