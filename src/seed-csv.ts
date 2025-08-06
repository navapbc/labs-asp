import prisma from './lib/prisma';
import { config } from 'dotenv';
import { createReadStream } from 'fs';
import { parse } from 'csv-parse';
import { join } from 'path';

// Load environment variables
config();

// Using centralized Prisma client from ./lib/prisma

interface CSVRow {
  participantId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  mobileNumber: string;
  email: string;
  homeAddress: string;
  benefitsReceiving: string;
  onProbation: string;
  isVeteran: string;
  relationshipStatus: string;
  householdMemberName: string;
  householdMemberAge: string;
  sexAtBirth: string;
  genderIdentity: string;
  ethnicity: string;
  race: string;
  preferredLanguage: string;
}

// Utility functions for minimal parsing - preserve raw data as much as possible
function toStringOrNull(value: string): string | null {
  // Only convert truly empty values to null, preserve everything else as-is
  if (value === undefined || value === null || value === '') {
    return null;
  }
  return value; // Preserve exactly as provided, including malformed data
}

function parseDateMinimal(dateStr: string): Date | null {
  if (!dateStr || dateStr.trim() === '') return null;
  
  try {
    // Try to parse the date, but if it fails, return null rather than throwing
    // This preserves invalid dates as null while allowing valid ones through
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
    return null;
  } catch (error) {
    // Invalid date - store as null but log the original value
    console.warn(`Storing invalid date as null: "${dateStr}"`);
    return null;
  }
}

function parseAgeMinimal(ageStr: string): number | null {
  if (!ageStr || ageStr.trim() === '') return null;
  
  const age = parseInt(ageStr);
  if (isNaN(age)) return null;
  return age; // Allow any integer, even unrealistic ones
}

function parseBooleanMinimal(value: string): boolean | null {
  if (!value || value.trim() === '') return null;
  
  const cleaned = value.trim().toLowerCase();
  if (cleaned === 'yes' || cleaned === 'true' || cleaned === '1') return true;
  if (cleaned === 'no' || cleaned === 'false' || cleaned === '0') return false;
  return null; // Preserve ambiguous values as null
}

function detectMediCal(benefits: string): boolean {
  if (!benefits) return false;
  const lowerBenefits = benefits.toLowerCase();
  return lowerBenefits.includes('medi-cal') || lowerBenefits.includes('medical');
}

async function seedFromCSV(csvFilePath: string) {
  console.log('🌱 Starting CSV database seeding...');
  console.log(`📁 Reading from: ${csvFilePath}`);

  const records: CSVRow[] = [];
  
  return new Promise<void>((resolve, reject) => {
    createReadStream(csvFilePath)
      .pipe(parse({ 
        columns: true, 
        skip_empty_lines: true,
        trim: true,
        relax_quotes: true,
        relax_column_count: true
      }))
      .on('data', (data: CSVRow) => {
        records.push(data);
      })
      .on('error', (err) => {
        console.error('❌ Error parsing CSV:', err);
        reject(err);
      })
      .on('end', async () => {
        console.log(`📊 Found ${records.length} records in CSV`);
        
        try {
          let successCount = 0;
          let errorCount = 0;
          
          for (const [index, row] of records.entries()) {
            try {
              console.log(`\n🔄 Processing record ${index + 1}/${records.length}: ${row.firstName || 'Unknown'} ${row.lastName || 'Unknown'}`);
              
              // Minimal validation - only check for truly required fields
              const participantId = toStringOrNull(row.participantId);
              const firstName = toStringOrNull(row.firstName);
              
              if (!participantId || !firstName) {
                console.warn(`⚠️  Skipping record ${index + 1}: Missing required fields (participantId or firstName)`);
                errorCount++;
                continue;
              }
              
              // Preserve all data as-is, only converting empty strings to null
              const lastName = toStringOrNull(row.lastName);
              const dateOfBirth = parseDateMinimal(row.dateOfBirth);
              const mobileNumber = toStringOrNull(row.mobileNumber); // Preserve malformed phone numbers as-is
              const email = toStringOrNull(row.email);
              const homeAddress = toStringOrNull(row.homeAddress);
              const onProbation = parseBooleanMinimal(row.onProbation);
              const isVeteran = parseBooleanMinimal(row.isVeteran);
              const relationshipStatus = toStringOrNull(row.relationshipStatus);
              const sexAtBirth = toStringOrNull(row.sexAtBirth);
              const genderIdentity = toStringOrNull(row.genderIdentity);
              const ethnicity = toStringOrNull(row.ethnicity);
              const race = toStringOrNull(row.race);
              const preferredLanguage = toStringOrNull(row.preferredLanguage) || 'English';
              const benefitsReceiving = toStringOrNull(row.benefitsReceiving);
              
              // Only detect MediCal for the flag, but preserve original benefits text
              const hasMediCal = detectMediCal(row.benefitsReceiving);
              
              // Create participant with raw data preserved - only add fields that have values
              const participantData: any = {
                participantId,
                firstName,
                preferredLanguage,
                hasMediCal,
                // WIC-specific fields left as null for agent to determine
                isPregnant: null,
                isPostPartum: null,
                isInfantBreastfeeding: null,
                isInfantFormula: null,
                hasChildren0to5: null,
                hasDependents: null,
              };

              // Only add optional fields if they have values (preserve null as undefined)
              if (lastName) participantData.lastName = lastName;
              if (dateOfBirth) participantData.dateOfBirth = dateOfBirth;
              if (homeAddress) participantData.homeAddress = homeAddress;
              if (mobileNumber) participantData.mobileNumber = mobileNumber;
              if (email) participantData.email = email;
              if (benefitsReceiving) participantData.benefitsReceiving = benefitsReceiving;
              if (onProbation !== null) participantData.onProbation = onProbation;
              if (isVeteran !== null) participantData.isVeteran = isVeteran;
              if (relationshipStatus) participantData.relationshipStatus = relationshipStatus;
              if (sexAtBirth) participantData.sexAtBirth = sexAtBirth;
              if (genderIdentity) participantData.genderIdentity = genderIdentity;
              if (ethnicity) participantData.ethnicity = ethnicity;
              if (race) participantData.race = race;

              // Try to create participant, handle duplicates gracefully
              let participant;
              try {
                participant = await prisma.participant.create({
                  data: participantData,
                });
              } catch (error: any) {
                if (error.code === 'P2002' && error.meta?.target?.includes('participantId')) {
                  console.warn(`⚠️  Participant ${participantId} already exists, skipping...`);
                  errorCount++;
                  continue;
                } else {
                  throw error; // Re-throw if it's not a duplicate participant ID error
                }
              }
              
              console.log(`✅ Created participant: ${participant.firstName} ${participant.lastName || ''} (ID: ${participant.participantId})`);
              
              // Handle household member if provided - preserve raw data
              const householdMemberName = toStringOrNull(row.householdMemberName);
              const householdMemberAge = parseAgeMinimal(row.householdMemberAge);
              
              if (householdMemberName) {
                // Split name into first and last, but preserve exactly as provided
                const nameParts = householdMemberName.split(' ');
                const householdFirstName = nameParts[0];
                const householdLastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : null;
                
                // Create dependent data dynamically to avoid type issues
                const dependentData: any = {
                  participantId: participant.id,
                  firstName: householdFirstName,
                  // Age-related WIC fields left as null for agent to determine
                  isInfant: null,
                  isChild0to5: null,
                };

                // Only add optional fields if they have values
                if (householdLastName) dependentData.lastName = householdLastName;
                if (householdMemberAge !== null) dependentData.age = householdMemberAge;
                if (toStringOrNull(row.relationshipStatus)) dependentData.relationship = toStringOrNull(row.relationshipStatus);
                if (sexAtBirth) dependentData.sexAtBirth = sexAtBirth;
                if (genderIdentity) dependentData.genderIdentity = genderIdentity;
                if (ethnicity) dependentData.ethnicity = ethnicity;
                if (race) dependentData.race = race;

                const dependent = await prisma.householdDependent.create({
                  data: dependentData,
                });
                
                console.log(`   👥 Added household member: ${dependent.firstName} ${dependent.lastName || ''} (age ${dependentData.age || 'unknown'})`);
              }
              
              successCount++;
              
            } catch (error: any) {
              console.error(`❌ Error processing record ${index + 1}:`, error.message);
              console.error(`   Raw data: ${JSON.stringify(row)}`);
              errorCount++;
              // Continue processing other records
            }
          }
          
          console.log('\n🎉 CSV seeding completed!');
          console.log(`📊 Summary:`);
          console.log(`   • ${successCount} participants created successfully`);
          console.log(`   • ${errorCount} records failed or skipped`);
          console.log(`   • ${await prisma.participant.count()} total participants in database`);
          console.log(`   • ${await prisma.householdDependent.count()} total household dependents in database`);
          
          resolve();
          
        } catch (error) {
          console.error('❌ Error during database operations:', error);
          reject(error);
        }
      });
  });
}

async function main() {
  try {
    // You can specify the CSV file path here
    const csvFilePath = process.argv[2] || join(process.cwd(), 'participants.csv');
    const shouldClearData = process.argv.includes('--clear');
    
    console.log(`📂 Looking for CSV file at: ${csvFilePath}`);
    
    if (shouldClearData) {
      console.log('🗑️  Clearing existing participant data...');
      await prisma.householdDependent.deleteMany();
      await prisma.participant.deleteMany();
      console.log('✅ Existing data cleared');
    }
    
    await seedFromCSV(csvFilePath);
    
  } catch (error) {
    console.error('❌ Seed script failed:', error);
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