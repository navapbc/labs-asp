import { config } from 'dotenv';
import { query, pgPool } from './lib/db';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load environment variables first
config({ path: '.env' });

// Using centralized PostgreSQL client from ./lib/db

interface Apricot360Participant {
  "Participant name": {
    "First": string;
    "Middle": string | null;
    "Last": string;
  };
  "CalWorks ID (if applicable)": string | null;
  "Date of birth": string;
  "Primary language spoken at home": string;
  "Preferred method of contact": string;
  "Cell phone": string;
  "Email": string;
  "Address": {
    "Line 1": string;
    "City": string;
    "State": string;
    "Zip": string;
  };
  "Pregnancy/child status": string | null;
  "List other sources of public financial assistance": string | null;
  "Is there an expectant mother in the home?": string | null;
  "Type": string | null;
  "Name of primary family member": {
    "First": string;
    "Middle": string | null;
    "Last": string;
  } | null;
}

// Utility functions for parsing APRICOT360 data
function toStringOrNull(value: string | null | undefined): string | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  return value.trim();
}

function parseDateMinimal(dateStr: string): Date | null {
  if (!dateStr || dateStr.trim() === '') return null;
  
  try {
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
    return null;
  } catch (error) {
    console.warn(`Storing invalid date as null: "${dateStr}"`);
    return null;
  }
}

function parsePhoneNumber(phone: string | null): string | null {
  if (!phone) return null;
  // Clean up phone number but preserve format
  return phone.trim();
}

function buildFullAddress(address: any): string | null {
  if (!address) return null;
  
  const parts = [];
  if (address["Line 1"]) parts.push(address["Line 1"]);
  if (address["City"]) parts.push(address["City"]);
  if (address["State"]) parts.push(address["State"]);
  if (address["Zip"]) parts.push(address["Zip"]);
  
  return parts.length > 0 ? parts.join(', ') : null;
}

function generateParticipantId(firstName: string, lastName: string, dateOfBirth: string): string {
  // Generate a unique participant ID for APRICOT360 data
  // Format: APRICOT-{FirstInitial}{LastInitial}-{YYYYMMDD}-{random}
  const firstInitial = firstName.charAt(0).toUpperCase();
  const lastInitial = lastName.charAt(0).toUpperCase();
  const dateOnly = dateOfBirth.replace(/-/g, '');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  
  return `APRICOT-${firstInitial}${lastInitial}-${dateOnly}-${random}`;
}

function parsePregnancyStatus(pregnancyStatus: string | null): { isPregnant: boolean | null, isPostPartum: boolean | null } {
  if (!pregnancyStatus) return { isPregnant: null, isPostPartum: null };
  
  const status = pregnancyStatus.toLowerCase();
  if (status.includes('pregnant')) return { isPregnant: true, isPostPartum: null };
  if (status.includes('postpartum') || status.includes('post-partum')) return { isPregnant: null, isPostPartum: true };
  
  return { isPregnant: null, isPostPartum: null };
}

async function seedFromApricot360JSON(jsonFilePath: string) {
  console.log('🌱 Starting APRICOT360 JSON database seeding...');
  console.log(`📁 Reading from: ${jsonFilePath}`);

  try {
    // Read and parse JSON file
    const jsonContent = readFileSync(jsonFilePath, 'utf8');
    const participants: Apricot360Participant[] = JSON.parse(jsonContent);
    
    console.log(`📊 Found ${participants.length} participants in APRICOT360 dataset`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let index = 0; index < participants.length; index++) {
      const participant = participants[index];
      try {
        console.log(`\n🔄 Processing APRICOT360 record ${index + 1}/${participants.length}: ${participant["Participant name"]?.First || 'Unknown'} ${participant["Participant name"]?.Last || 'Unknown'}`);
        
        // Extract participant data
        const firstName = participant["Participant name"]?.First;
        const lastName = participant["Participant name"]?.Last;
        const middleName = participant["Participant name"]?.Middle;
        
        if (!firstName) {
          console.warn(`⚠️  Skipping record ${index + 1}: Missing first name`);
          errorCount++;
          continue;
        }
        
        // Generate unique participant ID for APRICOT360
        const participantId = generateParticipantId(firstName, lastName || '', participant["Date of birth"] || '');
        const dateOfBirth = parseDateMinimal(participant["Date of birth"]);
        const homeAddress = buildFullAddress(participant["Address"]);
        const mobileNumber = parsePhoneNumber(participant["Cell phone"]);
        const email = toStringOrNull(participant["Email"]);
        const preferredLanguage = toStringOrNull(participant["Primary language spoken at home"]) || 'English';
        const benefitsReceiving = toStringOrNull(participant["List other sources of public financial assistance"]);
        const calWorksId = toStringOrNull(participant["CalWorks ID (if applicable)"]);
        
        // Parse pregnancy status
        const { isPregnant, isPostPartum } = parsePregnancyStatus(participant["Pregnancy/child status"]);
        
        // Parse expectant mother status
        const expectantMotherInHome = participant["Is there an expectant mother in the home?"];
        const hasExpectantMother = expectantMotherInHome ? 
          (expectantMotherInHome.toLowerCase().includes('yes') ? true : 
           expectantMotherInHome.toLowerCase().includes('no') ? false : null) : null;
        
        // Parse preferred contact method
        const preferredContactMethod = toStringOrNull(participant["Preferred method of contact"]);
        
        // Parse participant type
        const participantType = toStringOrNull(participant["Type"]);
        
        // Create participant data for APRICOT360
        const participantData: any = {
          participantId,
          firstName,
          lastName: toStringOrNull(lastName),
          dateOfBirth,
          homeAddress,
          mobileNumber,
          email,
          preferredLanguage,
          benefitsReceiving,
          isPregnant,
          isPostPartum,
          // APRICOT360 specific fields
          calWorksId,
          preferredContactMethod,
          expectantMotherInHome: hasExpectantMother,
          participantType,
          datasourcetype: 'APRICOT360',
          // WIC fields that we'll leave as null for agent determination
          isInfantBreastfeeding: null,
          isInfantFormula: null,
          hasChildren0to5: null,
          hasDependents: participant["Name of primary family member"] ? true : null,
          // Set defaults for fields not in APRICOT360 data
          hasMediCal: benefitsReceiving?.toLowerCase().includes('medical') || false,
          canReceiveTexts: preferredContactMethod?.toLowerCase().includes('text') || false,
        };
        
        // Try to create participant, handle duplicates gracefully
        let createdParticipant;
        try {
          const insertQuery = `
            INSERT INTO participants (
              participant_id, first_name, last_name, date_of_birth, home_address, mailing_address,
              mobile_number, can_receive_texts, preferred_language, email, has_medi_cal,
              medi_cal_case_number, medi_cal_amount, is_pregnant, is_post_partum, 
              is_infant_breastfeeding, is_infant_formula, has_children0to5, monthly_income,
              occupation, has_dependents, benefits_receiving, ethnicity, gender_identity,
              is_veteran, on_probation, race, relationship_status, sex_at_birth, datasourcetype,
              calworks_id, preferred_contact_method, expectant_mother_in_home, participant_type
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34)
            RETURNING *
          `;
          
          const result = await query(insertQuery, [
            participantData.participantId,
            participantData.firstName,
            participantData.lastName || null,
            participantData.dateOfBirth || null,
            participantData.homeAddress || null,
            participantData.mailingAddress || null, // Not in APRICOT360 data
            participantData.mobileNumber || null,
            participantData.canReceiveTexts || false,
            participantData.preferredLanguage || 'English',
            participantData.email || null,
            participantData.hasMediCal || false,
            participantData.mediCalCaseNumber || null, // Not in APRICOT360 data
            participantData.mediCalAmount || null, // Not in APRICOT360 data
            participantData.isPregnant || null,
            participantData.isPostPartum || null,
            participantData.isInfantBreastfeeding || null,
            participantData.isInfantFormula || null,
            participantData.hasChildren0to5 || null,
            participantData.monthlyIncome || null, // Not in APRICOT360 data
            participantData.occupation || null, // Not in APRICOT360 data
            participantData.hasDependents || null,
            participantData.benefitsReceiving || null,
            participantData.ethnicity || null, // Not in APRICOT360 data
            participantData.genderIdentity || null, // Not in APRICOT360 data
            participantData.isVeteran || null, // Not in APRICOT360 data
            participantData.onProbation || null, // Not in APRICOT360 data
            participantData.race || null, // Not in APRICOT360 data
            participantData.relationshipStatus || null, // Not in APRICOT360 data
            participantData.sexAtBirth || null, // Not in APRICOT360 data
            participantData.datasourcetype,
            participantData.calWorksId || null,
            participantData.preferredContactMethod || null,
            participantData.expectantMotherInHome || null,
            participantData.participantType || null,
          ]);
          
          createdParticipant = result.rows[0];
        } catch (error: any) {
          if (error.code === '23505' && error.constraint?.includes('participant_id')) {
            console.warn(`⚠️  Participant ${participantId} already exists, skipping...`);
            errorCount++;
            continue;
          } else {
            throw error;
          }
        }
        
        console.log(`✅ Created APRICOT360 participant: ${createdParticipant.first_name} ${createdParticipant.last_name || ''} (ID: ${createdParticipant.participant_id})`);
        
        // Handle primary family member if provided
        const primaryFamilyMember = participant["Name of primary family member"];
        if (primaryFamilyMember && primaryFamilyMember.First) {
          try {
            const dependentFirstName = primaryFamilyMember.First;
            const dependentLastName = toStringOrNull(primaryFamilyMember.Last);
            
            const insertDependentQuery = `
              INSERT INTO household_dependents (
                participant_id, first_name, last_name, age, date_of_birth, relationship, 
                sex_at_birth, gender_identity, ethnicity, race, is_infant, is_child0to5, datasourcetype
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
              RETURNING *
            `;
            
            const dependentResult = await query(insertDependentQuery, [
              createdParticipant.id,
              dependentFirstName,
              dependentLastName,
              null, // Age not provided in APRICOT360 data
              null, // Date of birth not provided for family members
              'Primary family member', // Relationship from APRICOT360 context
              null, // Sex at birth not provided
              null, // Gender identity not provided
              null, // Ethnicity not provided
              null, // Race not provided
              null, // Is infant - to be determined by agent
              null, // Is child 0-5 - to be determined by agent
              'APRICOT360', // Data source type
            ]);
            
            const dependent = dependentResult.rows[0];
            console.log(`   👥 Added primary family member: ${dependent.first_name} ${dependent.last_name || ''}`);
          } catch (depError: any) {
            console.warn(`⚠️  Failed to create family member for ${participantId}:`, depError.message);
          }
        }
        
        successCount++;
        
      } catch (error: any) {
        console.error(`❌ Error processing APRICOT360 record ${index + 1}:`, error.message);
        console.error(`   Raw data: ${JSON.stringify(participant, null, 2)}`);
        errorCount++;
        // Continue processing other records
      }
    }
    
    console.log('\n🎉 APRICOT360 seeding completed!');
    console.log(`📊 Summary:`);
    console.log(`   • ${successCount} APRICOT360 participants created successfully`);
    console.log(`   • ${errorCount} records failed or skipped`);
    
    const participantCountResult = await query('SELECT COUNT(*) FROM participants WHERE datasourcetype = \'APRICOT360\'');
    const dependentCountResult = await query('SELECT COUNT(*) FROM household_dependents WHERE datasourcetype = \'APRICOT360\'');
    console.log(`   • ${participantCountResult.rows[0].count} APRICOT360 participants in database`);
    console.log(`   • ${dependentCountResult.rows[0].count} APRICOT360 household dependents in database`);
    
    // Show overall totals
    const totalParticipantCountResult = await query('SELECT COUNT(*) FROM participants');
    const totalDependentCountResult = await query('SELECT COUNT(*) FROM household_dependents');
    console.log(`   • ${totalParticipantCountResult.rows[0].count} total participants in database`);
    console.log(`   • ${totalDependentCountResult.rows[0].count} total household dependents in database`);
    
  } catch (error) {
    console.error('❌ Error during APRICOT360 database operations:', error);
    throw error;
  }
}

async function main() {
  try {
    // You can specify the JSON file path here
    const jsonFilePath = process.argv[2] || join(process.cwd(), 'apricot360_synthetic_dataset.json');
    const shouldClearApricotData = process.argv.includes('--clear-apricot');
    const shouldClearAllData = process.argv.includes('--clear-all');
    
    console.log(`📂 Looking for APRICOT360 JSON file at: ${jsonFilePath}`);
    
    if (shouldClearAllData) {
      console.log('🗑️  Clearing ALL participant data...');
      await query('DELETE FROM household_dependents');
      await query('DELETE FROM participants');
      console.log('✅ All data cleared');
    } else if (shouldClearApricotData) {
      console.log('🗑️  Clearing existing APRICOT360 data...');
      await query('DELETE FROM household_dependents WHERE datasourcetype = \'APRICOT360\'');
      await query('DELETE FROM participants WHERE datasourcetype = \'APRICOT360\'');
      console.log('✅ APRICOT360 data cleared');
    }
    
    await seedFromApricot360JSON(jsonFilePath);
    
  } catch (error) {
    console.error('❌ APRICOT360 seed script failed:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('❌ APRICOT360 seed script failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await pgPool.end();
    console.log('🔌 Database connection closed');
  });
