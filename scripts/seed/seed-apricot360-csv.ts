import { config } from 'dotenv';
import { query, pgPool } from '../../src/lib/db.js';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parse } from 'csv-parse/sync';

// Load environment variables first
config({ path: '.env' });

interface Apricot360CsvRow {
  'File open date': string;
  'Participant provided verbal consent to complete intake': string;
  'DPSS Referral Date': string;
  'Participant name (First)': string;
  'Participant name (Last)': string;
  'Participant name (Middle)': string;
  'CalWorks ID': string;
  'Date of birth': string;
  'Participant type': string;
  'Age at File open date': string;
  'Year of birth': string;
  'Funding Source': string;
  'Ethnicity': string;
  'Primary language spoken at home': string;
  'Gender': string;
  'Special needs': string;
  'Notes on special needs': string;
  'Are you a Farm Worker?': string;
  'Marital status (as of today)': string;
  'Participant notes': string;
  'Preferred method of contact': string;
  'Home phone': string;
  'Work phone': string;
  'Cell phone': string;
  'Main Phone': string;
  'Email': string;
  'NO CONTACT PER PARTICIPANT': string;
  'Address (City)': string;
  'Address (Country)': string;
  'Address (County)': string;
  'Address (Line 1)': string;
  'Address (Line 2)': string;
  'Address (State)': string;
  'Address (Zip)': string;
  'Mailing Address (City)': string;
  'Mailing Address (Country)': string;
  'Mailing Address (County)': string;
  'Mailing Address (Line 1)': string;
  'Mailing Address (Line 2)': string;
  'Mailing Address (State)': string;
  'Mailing Address (Zip)': string;
  'Consent form signed on:': string;
  'Consent valid until:': string;
  'Modification Date': string;
  'Created By': string;
  'Creation Date': string;
  'Name of primary family member (First)': string;
  'Name of primary family member (Last)': string;
  'Name of primary family member (Middle)': string;
  'Associated Family': string;
}

// Utility functions
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

function parseBoolean(value: string): boolean | null {
  if (!value || value.trim() === '') return null;
  
  const normalized = value.toLowerCase().trim();
  if (normalized === 'yes' || normalized === 'true' || normalized === '1') return true;
  if (normalized === 'no' || normalized === 'false' || normalized === '0') return false;
  return null;
}

function parseInteger(value: string): number | null {
  if (!value || value.trim() === '') return null;
  
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? null : parsed;
}

function buildFullAddress(line1: string, line2: string, city: string, state: string, zip: string): string | null {
  const parts: string[] = [];
  if (line1) parts.push(line1);
  if (line2) parts.push(line2);
  if (city) parts.push(city);
  if (state) parts.push(state);
  if (zip) parts.push(zip);
  
  return parts.length > 0 ? parts.join(', ') : null;
}

function generateParticipantId(firstName: string, lastName: string, dateOfBirth: string): string {
  // Generate a unique participant ID for APRICOT360 CSV data
  // Format: APRICOT-{FirstInitial}{LastInitial}-{YYYYMMDD}-{random}
  const firstInitial = firstName?.charAt(0)?.toUpperCase() || 'X';
  const lastInitial = lastName?.charAt(0)?.toUpperCase() || 'X';
  const dateOnly = dateOfBirth?.replace(/-/g, '') || 'UNKNOWN';
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  
  return `APRICOT-${firstInitial}${lastInitial}-${dateOnly}-${random}`;
}

async function seedFromApricot360CSV(csvFilePath: string) {
  console.log('Starting APRICOT360 CSV database seeding...');
  console.log(`Reading from: ${csvFilePath}`);

  try {
    // Read and parse CSV file
    const csvContent = readFileSync(csvFilePath, 'utf8');
    const records: Apricot360CsvRow[] = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });
    
    console.log(`Found ${records.length} records in APRICOT360 CSV dataset`);
    
    // Separate parents and children
    const parentRecords = records.filter(r => r['Participant type'] !== 'Child');
    const childRecords = records.filter(r => r['Participant type'] === 'Child');
    
    console.log(`   • ${parentRecords.length} parent/adult participants`);
    console.log(`   • ${childRecords.length} child dependents`);
    
    let successCount = 0;
    let errorCount = 0;
    const participantMap = new Map<string, any>(); // Map of name -> database ID
    
    // First pass: Create all parent/adult participants
    for (let index = 0; index < parentRecords.length; index++) {
      const record = parentRecords[index];
      try {
        console.log(`\nProcessing participant ${index + 1}/${parentRecords.length}: ${record['Participant name (First)']} ${record['Participant name (Last)']}`);
        
        const firstName = toStringOrNull(record['Participant name (First)']);
        const lastName = toStringOrNull(record['Participant name (Last)']);
        const middleName = toStringOrNull(record['Participant name (Middle)']);
        
        if (!firstName) {
          console.warn(`Skipping record ${index + 1}: Missing first name`);
          errorCount++;
          continue;
        }
        
        // Generate unique participant ID
        const participantId = generateParticipantId(firstName, lastName || '', record['Date of birth'] || '');
        const dateOfBirth = parseDateMinimal(record['Date of birth']);
        const fileOpenDate = parseDateMinimal(record['File open date']);
        const dpssReferralDate = parseDateMinimal(record['DPSS Referral Date']);
        const consentDate = parseDateMinimal(record['Consent form signed on:']);
        const consentExpirationDate = parseDateMinimal(record['Consent valid until:']);
        
        // Contact information
        const cellPhone = toStringOrNull(record['Cell phone']);
        const mainPhone = toStringOrNull(record['Main Phone']);
        const mobileNumber = cellPhone || mainPhone; // Prefer cell, fallback to main
        const homePhone = toStringOrNull(record['Home phone']);
        const workPhone = toStringOrNull(record['Work phone']);
        const email = toStringOrNull(record['Email']);
        const preferredContactMethod = toStringOrNull(record['Preferred method of contact']);
        const doNotContact = parseBoolean(record['NO CONTACT PER PARTICIPANT']) || false;
        
        // Address information
        const addressLine1 = toStringOrNull(record['Address (Line 1)']);
        const addressLine2 = toStringOrNull(record['Address (Line 2)']);
        const addressCity = toStringOrNull(record['Address (City)']);
        const addressState = toStringOrNull(record['Address (State)']);
        const addressZip = toStringOrNull(record['Address (Zip)']);
        const addressCounty = toStringOrNull(record['Address (County)']);
        const addressCountry = toStringOrNull(record['Address (Country)']);

        // Mailing address
        const mailingLine1 = toStringOrNull(record['Mailing Address (Line 1)']);
        const mailingLine2 = toStringOrNull(record['Mailing Address (Line 2)']);
        const mailingCity = toStringOrNull(record['Mailing Address (City)']);
        const mailingState = toStringOrNull(record['Mailing Address (State)']);
        const mailingZip = toStringOrNull(record['Mailing Address (Zip)']);
        const mailingCounty = toStringOrNull(record['Mailing Address (County)']);
        const mailingCountry = toStringOrNull(record['Mailing Address (Country)']);

        // Demographics
        const primaryLanguage = toStringOrNull(record['Primary language spoken at home']) || 'English';
        const ethnicity = toStringOrNull(record['Ethnicity']);
        const gender = toStringOrNull(record['Gender']);
        const genderIdentity = toStringOrNull(record['Gender']); // Keep for backward compatibility if needed
        const relationshipStatus = toStringOrNull(record['Marital status (as of today)']);

        // Special fields
        const calWorksId = toStringOrNull(record['CalWorks ID']);
        const participantType = toStringOrNull(record['Participant type']);
        const fundingSource = toStringOrNull(record['Funding Source']);
        const ageAtFileOpen = parseInteger(record['Age at File open date']);
        const yearOfBirth = parseInteger(record['Year of birth']);
        const isFarmWorker = parseBoolean(record['Are you a Farm Worker?']);
        const specialNeeds = parseBoolean(record['Special needs']);
        const specialNeedsNotes = toStringOrNull(record['Notes on special needs']);
        const participantNotes = toStringOrNull(record['Participant notes']);
        const consentProvided = parseBoolean(record['Participant provided verbal consent to complete intake']);

        // Primary family member fields (from CSV)
        const primaryFamilyNameFirst = toStringOrNull(record['Name of primary family member (First)']);
        const primaryFamilyNameLast = toStringOrNull(record['Name of primary family member (Last)']);
        const primaryFamilyNameMiddle = toStringOrNull(record['Name of primary family member (Middle)']);
        
        // Create participant data
        const insertQuery = `
          INSERT INTO participants (
            participant_id, first_name, last_name, date_of_birth,
            mobile_number, home_phone, work_phone, main_phone,
            primary_language, email, preferred_contact_method, do_not_contact,
            ethnicity, gender, gender_identity, relationship_status,
            calworks_id, participant_type, funding_source,
            file_open_date, dpss_referral_date, consent_provided, consent_date, consent_expiration_date,
            age_at_file_open, year_of_birth, is_farm_worker, special_needs, special_needs_notes,
            participant_notes, address_line1, address_line2, address_city, address_state, address_zip,
            address_county, address_country,
            mailing_address_line1, mailing_address_line2, mailing_address_city,
            mailing_address_state, mailing_address_zip, mailing_address_county, mailing_address_country,
            primary_family_name_first, primary_family_name_last, primary_family_name_middle,
            datasourcetype,
            has_dependents
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
            $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38,
            $39, $40, $41, $42, $43, $44, $45, $46, $47, $48, $49
          )
          RETURNING *
        `;
        
        let createdParticipant;
        try {
          const result = await query(insertQuery, [
            participantId,
            firstName,
            lastName,
            dateOfBirth,
            mobileNumber,
            homePhone,
            workPhone,
            mainPhone,
            primaryLanguage,
            email,
            preferredContactMethod,
            doNotContact,
            ethnicity,
            gender,
            genderIdentity,
            relationshipStatus,
            calWorksId,
            participantType,
            fundingSource,
            fileOpenDate,
            dpssReferralDate,
            consentProvided,
            consentDate,
            consentExpirationDate,
            ageAtFileOpen,
            yearOfBirth,
            isFarmWorker,
            specialNeeds,
            specialNeedsNotes,
            participantNotes,
            addressLine1,
            addressLine2,
            addressCity,
            addressState,
            addressZip,
            addressCounty,
            addressCountry,
            mailingLine1,
            mailingLine2,
            mailingCity,
            mailingState,
            mailingZip,
            mailingCounty,
            mailingCountry,
            primaryFamilyNameFirst,
            primaryFamilyNameLast,
            primaryFamilyNameMiddle,
            'APRICOT360',
            null, // has_dependents - to be determined by agent
          ]);
          
          createdParticipant = result.rows[0];
          
          // Store in map for child linking (use full name as key)
          const nameKey = `${firstName} ${lastName}`.toLowerCase().trim();
          participantMap.set(nameKey, createdParticipant);
          
          console.log(`Created participant: ${firstName} ${lastName || ''} (ID: ${participantId})`);
          successCount++;
          
        } catch (error: any) {
          if (error.code === '23505' && error.constraint?.includes('participant_id')) {
            console.warn(`Participant ${participantId} already exists, skipping...`);
          } else {
            throw error;
          }
          errorCount++;
          continue;
        }
        
      } catch (error: any) {
        console.error(`❌ Error processing record ${index + 1}:`, error.message);
        console.error(`   Name: ${record['Participant name (First)']} ${record['Participant name (Last)']}`);
        errorCount++;
      }
    }
    
    // Second pass: Create child dependents and link to parents
    console.log('\nProcessing child dependents...');
    let dependentSuccessCount = 0;
    let dependentErrorCount = 0;
    
    for (let index = 0; index < childRecords.length; index++) {
      const record = childRecords[index];
      try {
        const firstName = toStringOrNull(record['Participant name (First)']);
        const lastName = toStringOrNull(record['Participant name (Last)']);
        const dateOfBirth = parseDateMinimal(record['Date of birth']);
        const ageAtFileOpen = parseInteger(record['Age at File open date']);
        const ethnicity = toStringOrNull(record['Ethnicity']);
        const gender = toStringOrNull(record['Gender']);
        const genderIdentity = toStringOrNull(record['Gender']);
        const associatedFamily = toStringOrNull(record['Associated Family']);
        
        // Find parent by name
        const parentFirstName = toStringOrNull(record['Name of primary family member (First)']);
        const parentLastName = toStringOrNull(record['Name of primary family member (Last)']);
        
        if (!parentFirstName || !parentLastName) {
          console.warn(`Skipping child ${firstName} ${lastName}: No parent information`);
          dependentErrorCount++;
          continue;
        }
        
        const parentNameKey = `${parentFirstName} ${parentLastName}`.toLowerCase().trim();
        const parent = participantMap.get(parentNameKey);
        
        if (!parent) {
          console.warn(`Skipping child ${firstName} ${lastName}: Parent not found (${parentFirstName} ${parentLastName})`);
          dependentErrorCount++;
          continue;
        }
        
        console.log(`    Linking ${firstName} ${lastName} to parent ${parentFirstName} ${parentLastName}`);
        
        const insertDependentQuery = `
          INSERT INTO household_dependents (
            participant_id, first_name, last_name, age, date_of_birth,
            relationship, gender, gender_identity, ethnicity,
            associated_family, datasourcetype,
            is_infant, is_child0to5
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          RETURNING *
        `;
        
        const dependentResult = await query(insertDependentQuery, [
          parent.id, // Link to parent's database ID
          firstName,
          lastName,
          ageAtFileOpen,
          dateOfBirth,
          associatedFamily || 'Child',
          gender,
          genderIdentity,
          ethnicity,
          associatedFamily,
          'APRICOT360',
          null, // is_infant - to be determined by agent
          null, // is_child0to5 - to be determined by agent
        ]);
        
        const dependent = dependentResult.rows[0];
        console.log(`    Added dependent: ${firstName} ${lastName || ''} (${associatedFamily || 'Child'})`);
        dependentSuccessCount++;
        
      } catch (error: any) {
        console.error(`Error processing child dependent ${index + 1}:`, error.message);
        console.error(`   Name: ${record['Participant name (First)']} ${record['Participant name (Last)']}`);
        dependentErrorCount++;
      }
    }
    
    console.log('\nApricot360 CSV seeding completed!');
    console.log(`Summary:`);
    console.log(`   • ${successCount} participants created successfully`);
    console.log(`   • ${errorCount} participant records failed or skipped`);
    console.log(`   • ${dependentSuccessCount} dependents created successfully`);
    console.log(`   • ${dependentErrorCount} dependent records failed or skipped`);
    
    // Show database totals
    const participantCountResult = await query('SELECT COUNT(*) FROM participants WHERE datasourcetype = \'APRICOT360\'');
    const dependentCountResult = await query('SELECT COUNT(*) FROM household_dependents WHERE datasourcetype = \'APRICOT360\'');
    console.log(`   • ${participantCountResult.rows[0].count} APRICOT360 participants in database`);
    console.log(`   • ${dependentCountResult.rows[0].count} APRICOT360 household dependents in database`);
    
    const totalParticipantCountResult = await query('SELECT COUNT(*) FROM participants');
    const totalDependentCountResult = await query('SELECT COUNT(*) FROM household_dependents');
    console.log(`   • ${totalParticipantCountResult.rows[0].count} total participants in database`);
    console.log(`   • ${totalDependentCountResult.rows[0].count} total household dependents in database`);
    
  } catch (error) {
    console.error('Error during APRICOT360 CSV operations:', error);
    throw error;
  }
}

async function main() {
  try {
    // Parse arguments
    const shouldClearApricotData = process.argv.includes('--clear-apricot');
    const shouldClearAllData = process.argv.includes('--clear-all');
    
    // Get file path (exclude flags from consideration)
    const fileArg = process.argv.slice(2).find(arg => !arg.startsWith('--'));
    const csvFilePath = fileArg || join(process.env.HOME || '', 'Downloads', 'a360-participant-profile.csv');
    
    console.log(`Looking for APRICOT360 CSV file at: ${csvFilePath}`);
    
    if (shouldClearAllData) {
      console.log('Clearing ALL participant data...');
      await query('DELETE FROM household_dependents');
      await query('DELETE FROM participants');
      console.log('All data cleared');
    } else if (shouldClearApricotData) {
      console.log('Clearing existing APRICOT360 data...');
      await query('DELETE FROM household_dependents WHERE datasourcetype = \'APRICOT360\'');
      await query('DELETE FROM participants WHERE datasourcetype = \'APRICOT360\'');
      console.log('APRICOT360 data cleared');
    }
    
    await seedFromApricot360CSV(csvFilePath);
    
  } catch (error) {
    console.error('APRICOT360 CSV seed script failed:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('APRICOT360 CSV seed script failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await pgPool.end();
    console.log('Database connection closed');
  });

