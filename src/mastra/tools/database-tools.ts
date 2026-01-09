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
  getParticipantWithHouseholdSchema,
  participantResponseSchema,
  dependentResponseSchema,
  participantSearchResponseSchema,
  participantWithHouseholdResponseSchema,
} from '../types/participant-types';

// Helper function to convert snake_case database fields to camelCase
const transformParticipant = (row: any) => ({
  ...row,
  participantId: row.participant_id,
  firstName: row.first_name,
  lastName: row.last_name,
  dateOfBirth: row.date_of_birth,
  mobileNumber: row.mobile_number,
  primaryLanguage: row.primary_language,
  relationshipStatus: row.relationship_status,
  gender: row.gender,
  genderIdentity: row.gender_identity,
  hasDependents: row.has_dependents,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  // Apricot360 CSV fields
  fileOpenDate: row.file_open_date,
  dpssReferralDate: row.dpss_referral_date,
  consentProvided: row.consent_provided,
  consentDate: row.consent_date,
  consentExpirationDate: row.consent_expiration_date,
  isFarmWorker: row.is_farm_worker,
  specialNeeds: row.special_needs,
  specialNeedsNotes: row.special_needs_notes,
  doNotContact: row.do_not_contact,
  homePhone: row.home_phone,
  workPhone: row.work_phone,
  mainPhone: row.main_phone,
  participantNotes: row.participant_notes,
  fundingSource: row.funding_source,
  ageAtFileOpen: row.age_at_file_open,
  yearOfBirth: row.year_of_birth,
  calworksId: row.calworks_id,
  participantType: row.participant_type,
  preferredContactMethod: row.preferred_contact_method,
  // Structured address fields
  addressLine2: row.address_line2,
  addressCity: row.address_city,
  addressState: row.address_state,
  addressZip: row.address_zip,
  addressCounty: row.address_county,
  addressCountry: row.address_country,
  // Structured mailing address fields
  mailingAddressLine1: row.mailing_address_line1,
  mailingAddressLine2: row.mailing_address_line2,
  mailingAddressCity: row.mailing_address_city,
  mailingAddressState: row.mailing_address_state,
  mailingAddressZip: row.mailing_address_zip,
  mailingAddressCounty: row.mailing_address_county,
  mailingAddressCountry: row.mailing_address_country,
  // Primary family member fields
  primaryFamilyNameFirst: row.primary_family_name_first,
  primaryFamilyNameLast: row.primary_family_name_last,
  primaryFamilyNameMiddle: row.primary_family_name_middle,
  // New APRICOT360 fields (will be NULL if not in CSV)
  otherFinancialAssistance: row.other_financial_assistance,
  ssiSsp: row.ssi_ssp,
  familyParticipantType: row.family_participant_type,
});

const transformDependent = (row: any) => ({
  ...row,
  participantId: row.participant_id,
  firstName: row.first_name,
  lastName: row.last_name,
  dateOfBirth: row.date_of_birth,
  gender: row.gender,
  genderIdentity: row.gender_identity,
  isInfant: row.is_infant,
  isChild0to5: row.is_child0to5,
  associatedFamily: row.associated_family,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

// Use centralized PostgreSQL client

/**
 * Database Tools for WIC Benefits APRICOT360 System
 *
 * APRICOT360 CSV FIELDS (Read-Only, imported from Apricot360):
 * These fields are populated by seed-apricot360-csv.ts and provide additional context:
 * 
 * File & Referral Tracking:
 * - fileOpenDate: Date when participant file was opened in Apricot360
 * - dpssReferralDate: Date when participant was referred by DPSS
 * - ageAtFileOpen: Participant's age when file was opened
 * 
 * Consent & Compliance:
 * - consentProvided: Whether participant provided verbal consent to complete intake
 * - consentDate: Date when consent form was signed
 * - consentExpirationDate: Date when consent expires (typically 10 years from consent)
 * 
 * Employment & Special Needs:
 * - isFarmWorker: Whether participant is a farm worker
 * - specialNeeds: Whether participant has special needs requiring accommodation
 * - specialNeedsNotes: Details about special needs
 * 
 * Contact Information:
 * - doNotContact: Flag indicating participant does not want to be contacted
 * - homePhone: Home phone number
 * - workPhone: Work phone number
 * - mainPhone: Primary/main phone number
 * 
 * Notes & Metadata:
 * - participantNotes: General notes about the participant from Apricot360
 * - fundingSource: Funding source for services
 * - yearOfBirth: Year of birth (may be approximate if full DOB unknown)
 * 
 * Structured Address Fields (home address):
 * - addressLine2: Second line of home address
 * - addressCity: City
 * - addressState: State
 * - addressZip: ZIP code
 * - addressCounty: County
 * - addressCountry: Country
 * 
 * Structured Mailing Address:
 * - mailingAddressLine1: First line of mailing address
 * - mailingAddressLine2: Second line of mailing address
 * - mailingAddressCity: City
 * - mailingAddressState: State
 * - mailingAddressZip: ZIP code
 * - mailingAddressCounty: County
 * - mailingAddressCountry: Country
 * 
 * Household Dependent Fields:
 * - associatedFamily: Family role from Apricot360 (e.g., Mother, Son, Daughter)
 */

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
          SELECT participant_id, first_name, last_name, email, mobile_number, created_at
          FROM participants
          WHERE LOWER(first_name) = LOWER($1) AND LOWER(last_name) = LOWER($2)
          ORDER BY last_name ASC, first_name ASC
        `;
        params = [firstName, lastName];
      } else {
        // Single name provided - search in either first OR last name
        searchQuery = `
          SELECT participant_id, first_name, last_name, email, mobile_number, created_at
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
                     'gender', h.gender,
                     'genderIdentity', h.gender_identity,
                     'ethnicity', h.ethnicity,
                     'isInfant', h.is_infant,
                     'isChild0to5', h.is_child0to5,
                     'associatedFamily', h.associated_family,
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
        SELECT participant_id, first_name, last_name, address_city, address_state, address_zip, email, mobile_number
        FROM participants
        WHERE LOWER(address_city) LIKE LOWER($1) OR LOWER(address_state) LIKE LOWER($1) OR LOWER(address_zip) LIKE LOWER($1)
        ORDER BY last_name ASC, first_name ASC
      `;
      
      const result = await query(locationQuery, [`%${context.location}%`]);
      const participants = result.rows.map(row => ({
        participantId: row.participant_id,
        firstName: row.first_name,
        lastName: row.last_name,
        addressCity: row.address_city,
        addressState: row.address_state,
        addressZip: row.address_zip,
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

// NOTE: createParticipant is disabled for APRICOT360 system
// Participants are imported via CSV seed script only
// This tool is kept for backwards compatibility but will return an error
export const createParticipant = createTool({
  id: 'create-participant',
  description: 'DISABLED: Participants can only be created via APRICOT360 CSV import. Use seed-apricot360-csv.ts script instead.',
  inputSchema: createParticipantSchema,
  outputSchema: participantResponseSchema,
  execute: async ({ context }) => {
    return {
      participant: null,
      success: false,
      error: 'Creating participants is disabled. Use APRICOT360 CSV import instead.',
    };
  },
});

// NOTE: createHouseholdDependent is disabled for APRICOT360 system
// Household dependents are imported via CSV seed script only
// This tool is kept for backwards compatibility but will return an error
export const createHouseholdDependent = createTool({
  id: 'create-household-dependent',
  description: 'DISABLED: Household dependents can only be created via APRICOT360 CSV import. Use seed-apricot360-csv.ts script instead.',
  inputSchema: createHouseholdDependentSchema,
  outputSchema: dependentResponseSchema,
  execute: async ({ context }) => {
    return {
      dependent: null,
      success: false,
      error: 'Creating household dependents is disabled. Use APRICOT360 CSV import instead.',
    };
  },
});

// NOTE: updateParticipantWicInfo is disabled for APRICOT360 system
// WIC-specific fields have been removed from schema
export const updateParticipantWicInfo = createTool({
  id: 'update-participant-wic-info',
  description: 'DISABLED: WIC-specific fields have been removed from APRICOT360 schema.',
  inputSchema: updateParticipantWicInfoSchema,
  outputSchema: participantResponseSchema,
  execute: async ({ context }) => {
    return {
      participant: null,
      success: false,
      error: 'WIC-specific update fields are not available in APRICOT360 schema.',
    };
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

// NOTE: updateParticipantDemographics is disabled for APRICOT360 system
// Most demographic fields are imported from CSV and should not be modified
export const updateParticipantDemographics = createTool({
  id: 'update-participant-demographics',
  description: 'DISABLED: Demographic information is managed via APRICOT360 CSV import only.',
  inputSchema: updateParticipantDemographicsSchema,
  outputSchema: participantResponseSchema,
  execute: async ({ context }) => {
    return {
      participant: null,
      success: false,
      error: 'Updating demographics is disabled. Use APRICOT360 CSV import instead.',
    };
  },
});

// Export all database tools
export const databaseTools = [
  searchParticipantsByName,
  getParticipantWithHousehold,
  searchParticipantsByLocation
]; 