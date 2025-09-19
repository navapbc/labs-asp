import { createTool } from '@mastra/core/tools';
import { query } from '../../lib/db';
import {
  createParticipantSchema,
  createHouseholdDependentSchema,
  updateParticipantWicInfoSchema,
  updateDependentWicInfoSchema,
  updateParticipantDemographicsSchema,
  searchByNameSchema,
  searchByLocationSchema,
  getParticipantByIdSchema,
  getParticipantWithHouseholdSchema,
  participantResponseSchema,
  dependentResponseSchema,
  participantSearchResponseSchema,
  participantWithHouseholdResponseSchema,
  getParticipantByIdResponseSchema,
} from '../types/participant-types';

// Helper function to convert snake_case database fields to camelCase
const transformParticipant = (row: any) => ({
  ...row,
  participantId: row.participant_id,
  firstName: row.first_name,
  lastName: row.last_name,
  dateOfBirth: row.date_of_birth,
  homeAddress: row.home_address,
  mailingAddress: row.mailing_address,
  mobileNumber: row.mobile_number,
  canReceiveTexts: row.can_receive_texts,
  preferredLanguage: row.preferred_language,
  benefitsReceiving: row.benefits_receiving,
  onProbation: row.on_probation,
  isVeteran: row.is_veteran,
  relationshipStatus: row.relationship_status,
  sexAtBirth: row.sex_at_birth,
  genderIdentity: row.gender_identity,
  hasMediCal: row.has_medi_cal,
  mediCalCaseNumber: row.medi_cal_case_number,
  mediCalAmount: row.medi_cal_amount,
  isPregnant: row.is_pregnant,
  isPostPartum: row.is_post_partum,
  isInfantBreastfeeding: row.is_infant_breastfeeding,
  isInfantFormula: row.is_infant_formula,
  hasChildren0to5: row.has_children0to5,
  hasDependents: row.has_dependents,
  monthlyIncome: row.monthly_income,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const transformDependent = (row: any) => ({
  ...row,
  participantId: row.participant_id,
  firstName: row.first_name,
  lastName: row.last_name,
  dateOfBirth: row.date_of_birth,
  sexAtBirth: row.sex_at_birth,
  genderIdentity: row.gender_identity,
  isInfant: row.is_infant,
  isChild0to5: row.is_child0to5,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

// Use centralized PostgreSQL client

/**
 * Database Tools for WIC Benefits START System
 * 
 * IMPORTANT: Null values in WIC eligibility fields indicate UNKNOWN information
 * that the agent needs to collect during the application process:
 * - isPregnant: null = unknown, true = pregnant, false = not pregnant
 * - isPostPartum: null = unknown, true = postpartum, false = not postpartum  
 * - isInfantBreastfeeding: null = unknown, true = breastfeeding, false = not breastfeeding
 * - isInfantFormula: null = unknown, true = formula feeding, false = not formula feeding
 * - hasChildren0to5: null = unknown, true = has children 0-5, false = no children 0-5
 * - hasDependents: null = unknown, true = has dependents, false = no dependents
 * 
 * For HouseholdDependent:
 * - isInfant: null = unknown, true = is infant, false = not infant
 * - isChild0to5: null = unknown, true = is child 0-5, false = not child 0-5
 */

// Get participant by ID
export const getParticipantById = createTool({
  id: 'get-participant-by-id',
  description: 'Get a WIC benefits participant by their unique participant ID. Null values in WIC fields indicate unknown information that needs to be collected.',
  inputSchema: getParticipantByIdSchema,
  outputSchema: getParticipantByIdResponseSchema,
  execute: async ({ context }) => {
    try {
      const participantQuery = `
        SELECT p.*, 
               COALESCE(
                 json_agg(
                   json_build_object(
                     'id', h.id,
                     'participantId', h.participant_id,
                     'firstName', h.first_name,
                     'lastName', h.last_name,
                     'age', h.age,
                     'dateOfBirth', h.date_of_birth,
                     'relationship', h.relationship,
                     'sexAtBirth', h.sex_at_birth,
                     'genderIdentity', h.gender_identity,
                     'ethnicity', h.ethnicity,
                     'race', h.race,
                     'isInfant', h.is_infant,
                     'isChild0to5', h.is_child0to5,
                     'createdAt', h.created_at,
                     'updatedAt', h.updated_at
                   ) ORDER BY h.date_of_birth ASC
                 ) FILTER (WHERE h.id IS NOT NULL), 
                 '[]'::json
               ) as household
        FROM participants p
        LEFT JOIN household_dependents h ON p.id = h.participant_id
        WHERE p.participant_id = $1
        GROUP BY p.id
      `;
      
      const result = await query(participantQuery, [context.participantId]);
      const participant = result.rows.length > 0 ? {
        ...transformParticipant(result.rows[0]),
        household: result.rows[0].household
      } : null;

      return {
        participant,
        found: participant !== null,
      };
    } catch (error) {
      console.error('Error fetching participant:', error);
      return {
        participant: null,
        found: false,
      };
    }
  },
});

// Search participants by name
export const searchParticipantsByName = createTool({
  id: 'search-participants-by-name',
  description: 'Search for WIC benefits participants by full name (first and last name) or partial name',
  inputSchema: searchByNameSchema,
  outputSchema: participantSearchResponseSchema,
  execute: async ({ context }) => {
    try {
      const nameInput = context.name.trim();
      const nameParts = nameInput.split(/\s+/);
      


      let searchQuery;
      let params;
      
      if (nameParts.length >= 2) {
        // Full name provided - search for first AND last name match
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(' ');
        
        searchQuery = `
          SELECT participant_id, first_name, last_name, home_address, monthly_income, email, mobile_number, created_at
          FROM participants
          WHERE LOWER(first_name) = LOWER($1) AND LOWER(last_name) = LOWER($2)
          ORDER BY last_name ASC, first_name ASC
        `;
        params = [firstName, lastName];
      } else {
        // Single name provided - search in either first OR last name
        searchQuery = `
          SELECT participant_id, first_name, last_name, home_address, monthly_income, email, mobile_number, created_at
          FROM participants
          WHERE LOWER(first_name) LIKE LOWER($1) OR LOWER(last_name) LIKE LOWER($1)
          ORDER BY last_name ASC, first_name ASC
        `;
        params = [`%${nameInput}%`];
      }
      
      const result = await query(searchQuery, params);
      const participants = result.rows.map(row => ({
        participantId: row.participant_id,
        firstName: row.first_name,
        lastName: row.last_name,
        homeAddress: row.home_address,
        monthlyIncome: row.monthly_income,
        email: row.email,
        mobileNumber: row.mobile_number,
        createdAt: row.created_at,
      }));

      return {
        participants,
        count: participants.length,
      };
    } catch (error) {
      console.error('Error searching participants:', error);
      return {
        participants: [],
        count: 0,
      };
    }
  },
});

// Get participant with household
export const getParticipantWithHousehold = createTool({
  id: 'get-participant-with-household',
  description: 'Get a participant and all their household dependents',
  inputSchema: getParticipantWithHouseholdSchema,
  outputSchema: participantWithHouseholdResponseSchema,
  execute: async ({ context }) => {
    try {
      const participantQuery = `
        SELECT p.*, 
               COALESCE(
                 json_agg(
                   json_build_object(
                     'id', h.id,
                     'participantId', h.participant_id,
                     'firstName', h.first_name,
                     'lastName', h.last_name,
                     'age', h.age,
                     'dateOfBirth', h.date_of_birth,
                     'relationship', h.relationship,
                     'sexAtBirth', h.sex_at_birth,
                     'genderIdentity', h.gender_identity,
                     'ethnicity', h.ethnicity,
                     'race', h.race,
                     'isInfant', h.is_infant,
                     'isChild0to5', h.is_child0to5,
                     'createdAt', h.created_at,
                     'updatedAt', h.updated_at
                   ) ORDER BY h.date_of_birth ASC
                 ) FILTER (WHERE h.id IS NOT NULL), 
                 '[]'::json
               ) as household
        FROM participants p
        LEFT JOIN household_dependents h ON p.id = h.participant_id
        WHERE p.participant_id = $1
        GROUP BY p.id
      `;
      
      const result = await query(participantQuery, [context.participantId]);
      const participant = result.rows.length > 0 ? {
        ...transformParticipant(result.rows[0]),
        household: result.rows[0].household
      } : null;

      if (!participant) {
        return {
          participant: null,
          household: [],
          totalMembers: 0,
        };
      }

      return {
        participant,
        household: participant.household,
        totalMembers: participant.household.length + 1, // +1 for the participant themselves
      };
    } catch (error) {
      console.error('Error fetching participant with household:', error);
      return {
        participant: null,
        household: [],
        totalMembers: 0,
      };
    }
  },
});

// Search by location
export const searchParticipantsByLocation = createTool({
  id: 'search-participants-by-location',
  description: 'Search for participants by city or address',
  inputSchema: searchByLocationSchema,
  outputSchema: participantSearchResponseSchema,
  execute: async ({ context }) => {
    try {
      const locationQuery = `
        SELECT participant_id, first_name, last_name, home_address, monthly_income, email, mobile_number
        FROM participants
        WHERE LOWER(home_address) LIKE LOWER($1)
        ORDER BY last_name ASC, first_name ASC
      `;
      
      const result = await query(locationQuery, [`%${context.location}%`]);
      const participants = result.rows.map(row => ({
        participantId: row.participant_id,
        firstName: row.first_name,
        lastName: row.last_name,
        homeAddress: row.home_address,
        monthlyIncome: row.monthly_income,
        email: row.email,
        mobileNumber: row.mobile_number,
      }));

      return {
        participants,
        count: participants.length,
      };
    } catch (error) {
      console.error('Error searching participants by location:', error);
      return {
        participants: [],
        count: 0,
      };
    }
  },
});

// Create new participant
export const createParticipant = createTool({
  id: 'create-participant',
  description: 'Create a new WIC benefits participant. WIC eligibility fields should be left undefined initially so agent can collect during application.',
  inputSchema: createParticipantSchema,
  outputSchema: participantResponseSchema,
  execute: async ({ context }) => {
    try {
      const participantData: any = {
        participantId: context.participantId,
        firstName: context.firstName,
        preferredLanguage: context.preferredLanguage || 'English',
        hasMediCal: context.benefitsReceiving ? context.benefitsReceiving.toLowerCase().includes('medi-cal') : false,
        // WIC-specific fields left as null for agent to determine
        isPregnant: null,
        isPostPartum: null,
        isInfantBreastfeeding: null,
        isInfantFormula: null,
        hasChildren0to5: null,
        hasDependents: null,
      };

      // Only add optional fields if they have values
      if (context.lastName) participantData.lastName = context.lastName;
      if (context.dateOfBirth) participantData.dateOfBirth = new Date(context.dateOfBirth);
      if (context.homeAddress) participantData.homeAddress = context.homeAddress;
      if (context.mobileNumber) participantData.mobileNumber = context.mobileNumber;
      if (context.email) participantData.email = context.email;
      if (context.benefitsReceiving) participantData.benefitsReceiving = context.benefitsReceiving;
      if (context.onProbation !== undefined) participantData.onProbation = context.onProbation;
      if (context.isVeteran !== undefined) participantData.isVeteran = context.isVeteran;
      if (context.relationshipStatus) participantData.relationshipStatus = context.relationshipStatus;
      if (context.sexAtBirth) participantData.sexAtBirth = context.sexAtBirth;
      if (context.genderIdentity) participantData.genderIdentity = context.genderIdentity;
      if (context.ethnicity) participantData.ethnicity = context.ethnicity;
      if (context.race) participantData.race = context.race;
      if (context.monthlyIncome) participantData.monthlyIncome = context.monthlyIncome;
      if (context.occupation) participantData.occupation = context.occupation;
      if (context.datasourcetype) participantData.datasourcetype = context.datasourcetype;

      const insertQuery = `
        INSERT INTO participants (
          participant_id, first_name, last_name, date_of_birth, home_address, mailing_address,
          mobile_number, can_receive_texts, preferred_language, email, benefits_receiving,
          on_probation, is_veteran, relationship_status, sex_at_birth, gender_identity,
          ethnicity, race, has_medi_cal, medi_cal_case_number, medi_cal_amount,
          is_pregnant, is_post_partum, is_infant_breastfeeding, is_infant_formula,
          has_children0to5, has_dependents, monthly_income, occupation, datasourcetype
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30
        ) RETURNING *
      `;
      
      const result = await query(insertQuery, [
        participantData.participantId,
        participantData.firstName,
        participantData.lastName || null,
        participantData.dateOfBirth || null,
        participantData.homeAddress || null,
        participantData.mailingAddress || null,
        participantData.mobileNumber || null,
        participantData.canReceiveTexts || false,
        participantData.preferredLanguage || 'English',
        participantData.email || null,
        participantData.benefitsReceiving || null,
        participantData.onProbation || null,
        participantData.isVeteran || null,
        participantData.relationshipStatus || null,
        participantData.sexAtBirth || null,
        participantData.genderIdentity || null,
        participantData.ethnicity || null,
        participantData.race || null,
        participantData.hasMediCal || false,
        participantData.mediCalCaseNumber || null,
        participantData.mediCalAmount || null,
        participantData.isPregnant || null,
        participantData.isPostPartum || null,
        participantData.isInfantBreastfeeding || null,
        participantData.isInfantFormula || null,
        participantData.hasChildren0to5 || null,
        participantData.hasDependents || null,
        participantData.monthlyIncome || null,
        participantData.occupation || null,
        participantData.datasourcetype || 'START',
      ]);
      
      const participant = transformParticipant(result.rows[0]);

      return {
        participant,
        success: true,
      };
    } catch (error: any) {
      console.error('Error creating participant:', error);
      return {
        participant: null,
        success: false,
        error: error.message || 'Failed to create participant',
      };
    }
  },
});

// Create household dependent
export const createHouseholdDependent = createTool({
  id: 'create-household-dependent',
  description: 'Create a new household dependent for a participant. Age-related WIC fields should be left undefined initially for agent to determine.',
  inputSchema: createHouseholdDependentSchema,
  outputSchema: dependentResponseSchema,
  execute: async ({ context }) => {
    try {
      const dependentData: any = {
        participantId: context.participantId,
        firstName: context.firstName,
        // Age-related WIC fields left undefined - to be determined by agent
        isInfant: null,
        isChild0to5: null,
      };

      // Only add optional fields if they have values
      if (context.lastName) dependentData.lastName = context.lastName;
      if (context.age !== undefined) dependentData.age = context.age;
      if (context.dateOfBirth) dependentData.dateOfBirth = new Date(context.dateOfBirth);
      if (context.relationship) dependentData.relationship = context.relationship;
      if (context.sexAtBirth) dependentData.sexAtBirth = context.sexAtBirth;
      if (context.genderIdentity) dependentData.genderIdentity = context.genderIdentity;
      if (context.ethnicity) dependentData.ethnicity = context.ethnicity;
      if (context.race) dependentData.race = context.race;

      const insertQuery = `
        INSERT INTO household_dependents (
          participant_id, first_name, last_name, age, date_of_birth, relationship,
          sex_at_birth, gender_identity, ethnicity, race, is_infant, is_child0to5
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `;
      
      const result = await query(insertQuery, [
        dependentData.participantId,
        dependentData.firstName,
        dependentData.lastName || null,
        dependentData.age || null,
        dependentData.dateOfBirth || null,
        dependentData.relationship || null,
        dependentData.sexAtBirth || null,
        dependentData.genderIdentity || null,
        dependentData.ethnicity || null,
        dependentData.race || null,
        dependentData.isInfant || null,
        dependentData.isChild0to5 || null,
      ]);
      
      const dependent = transformDependent(result.rows[0]);

      return {
        dependent,
        success: true,
      };
    } catch (error: any) {
      console.error('Error creating household dependent:', error);
      return {
        dependent: null,
        success: false,
        error: error.message || 'Failed to create dependent',
      };
    }
  },
});

// Update participant WIC eligibility information
export const updateParticipantWicInfo = createTool({
  id: 'update-participant-wic-info',
  description: 'Update WIC eligibility information for a participant after agent has collected the data',
  inputSchema: updateParticipantWicInfoSchema,
  outputSchema: participantResponseSchema,
  execute: async ({ context }) => {
    try {
      const updateData: any = {};
      
      // Only update fields that were provided
      if (context.isPregnant !== undefined) updateData.isPregnant = context.isPregnant;
      if (context.isPostPartum !== undefined) updateData.isPostPartum = context.isPostPartum;
      if (context.isInfantBreastfeeding !== undefined) updateData.isInfantBreastfeeding = context.isInfantBreastfeeding;
      if (context.isInfantFormula !== undefined) updateData.isInfantFormula = context.isInfantFormula;
      if (context.hasChildren0to5 !== undefined) updateData.hasChildren0to5 = context.hasChildren0to5;
      if (context.hasDependents !== undefined) updateData.hasDependents = context.hasDependents;
      
      const updateFields = Object.keys(updateData).map((key, index) => {
        const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        return `${dbKey} = $${index + 2}`;
      }).join(', ');
      
      const updateQuery = `
        UPDATE participants SET ${updateFields}
        WHERE participant_id = $1
        RETURNING *
      `;
      
      const result = await query(updateQuery, [context.participantId, ...Object.values(updateData)]);
      const participant = result.rows.length > 0 ? transformParticipant(result.rows[0]) : null;

      return {
        participant,
        success: true,
      };
    } catch (error: any) {
      console.error('Error updating participant WIC info:', error);
      return {
        participant: null,
        success: false,
        error: error.message || 'Failed to update participant',
      };
    }
  },
});

// Update dependent WIC eligibility information
export const updateDependentWicInfo = createTool({
  id: 'update-dependent-wic-info',
  description: 'Update WIC eligibility information for a household dependent after agent has collected age/status data',
  inputSchema: updateDependentWicInfoSchema,
  outputSchema: dependentResponseSchema,
  execute: async ({ context }) => {
    try {
      const updateData: any = {};
      
      // Only update fields that were provided
      if (context.age !== undefined) updateData.age = context.age;
      if (context.dateOfBirth !== undefined) updateData.dateOfBirth = new Date(context.dateOfBirth);
      if (context.isInfant !== undefined) updateData.isInfant = context.isInfant;
      if (context.isChild0to5 !== undefined) updateData.isChild0to5 = context.isChild0to5;
      
      const updateFields = Object.keys(updateData).map((key, index) => {
        const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        return `${dbKey} = $${index + 2}`;
      }).join(', ');
      
      const updateQuery = `
        UPDATE household_dependents SET ${updateFields}
        WHERE id = $1
        RETURNING *
      `;
      
      const result = await query(updateQuery, [context.dependentId, ...Object.values(updateData)]);
      const dependent = result.rows.length > 0 ? transformDependent(result.rows[0]) : null;

      return {
        dependent,
        success: true,
      };
    } catch (error: any) {
      console.error('Error updating dependent WIC info:', error);
      return {
        dependent: null,
        success: false,
        error: error.message || 'Failed to update dependent',
      };
    }
  },
});

// Update participant demographic information
export const updateParticipantDemographics = createTool({
  id: 'update-participant-demographics',
  description: 'Update demographic information for a participant after agent has collected additional data',
  inputSchema: updateParticipantDemographicsSchema,
  outputSchema: participantResponseSchema,
  execute: async ({ context }) => {
    try {
      const updateData: any = {};
      
      // Only update fields that were provided
      if (context.lastName !== undefined) updateData.lastName = context.lastName;
      if (context.dateOfBirth !== undefined) updateData.dateOfBirth = new Date(context.dateOfBirth);
      if (context.homeAddress !== undefined) updateData.homeAddress = context.homeAddress;
      if (context.mobileNumber !== undefined) updateData.mobileNumber = context.mobileNumber;
      if (context.email !== undefined) updateData.email = context.email;
      if (context.benefitsReceiving !== undefined) {
        updateData.benefitsReceiving = context.benefitsReceiving;
        updateData.hasMediCal = context.benefitsReceiving.toLowerCase().includes('medi-cal');
      }
      if (context.onProbation !== undefined) updateData.onProbation = context.onProbation;
      if (context.isVeteran !== undefined) updateData.isVeteran = context.isVeteran;
      if (context.relationshipStatus !== undefined) updateData.relationshipStatus = context.relationshipStatus;
      if (context.sexAtBirth !== undefined) updateData.sexAtBirth = context.sexAtBirth;
      if (context.genderIdentity !== undefined) updateData.genderIdentity = context.genderIdentity;
      if (context.ethnicity !== undefined) updateData.ethnicity = context.ethnicity;
      if (context.race !== undefined) updateData.race = context.race;
      if (context.preferredLanguage !== undefined) updateData.preferredLanguage = context.preferredLanguage;
      if (context.monthlyIncome !== undefined) updateData.monthlyIncome = context.monthlyIncome;
      if (context.occupation !== undefined) updateData.occupation = context.occupation;
      
      const updateFields = Object.keys(updateData).map((key, index) => {
        const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        return `${dbKey} = $${index + 2}`;
      }).join(', ');
      
      const updateQuery = `
        UPDATE participants SET ${updateFields}
        WHERE participant_id = $1
        RETURNING *
      `;
      
      const result = await query(updateQuery, [context.participantId, ...Object.values(updateData)]);
      const participant = result.rows.length > 0 ? transformParticipant(result.rows[0]) : null;

      return {
        participant,
        success: true,
      };
    } catch (error: any) {
      console.error('Error updating participant demographics:', error);
      return {
        participant: null,
        success: false,
        error: error.message || 'Failed to update participant',
      };
    }
  },
});

// Export all database tools
export const databaseTools = [
  getParticipantById,
  searchParticipantsByName,
  getParticipantWithHousehold,
  searchParticipantsByLocation
]; 