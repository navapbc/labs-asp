import { createTool } from '@mastra/core/tools';
import prisma from '../../lib/prisma';
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

// Use centralized Prisma client

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
      const participant = await prisma.participant.findUnique({
        where: { participantId: context.participantId },
        include: {
          household: true,
        },
      });

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
      
      let whereClause;
      
      if (nameParts.length >= 2) {
        // Full name provided - search for first AND last name match
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(' '); // Handle cases like "Van Der Berg"
        
        whereClause = {
          AND: [
            { firstName: { equals: firstName, mode: 'insensitive' as const } },
            { lastName: { equals: lastName, mode: 'insensitive' as const } },
          ],
        };
      } else {
        // Single name provided - search in either first OR last name
        whereClause = {
          OR: [
            { firstName: { contains: nameInput, mode: 'insensitive' as const } },
            { lastName: { contains: nameInput, mode: 'insensitive' as const } },
          ],
        };
      }

      const participants = await prisma.participant.findMany({
        where: whereClause,
        select: {
          participantId: true,
          firstName: true,
          lastName: true,
          homeAddress: true,
          monthlyIncome: true,
          email: true,
          mobileNumber: true,
          createdAt: true,
        },
        orderBy: [
          { lastName: 'asc' },
          { firstName: 'asc' },
        ],
      });

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
      const participant = await prisma.participant.findUnique({
        where: { participantId: context.participantId },
        include: {
          household: {
            orderBy: { dateOfBirth: 'asc' },
          },
        },
      });

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
      const participants = await prisma.participant.findMany({
        where: {
          homeAddress: {
            contains: context.location,
            mode: 'insensitive',
          },
        },
        select: {
          participantId: true,
          firstName: true,
          lastName: true,
          homeAddress: true,
          monthlyIncome: true,
          email: true,
          mobileNumber: true,
        },
        orderBy: [
          { lastName: 'asc' },
          { firstName: 'asc' },
        ],
      });

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

      const participant = await prisma.participant.create({
        data: participantData,
      });

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

      const dependent = await prisma.householdDependent.create({
        data: dependentData,
      });

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
      
      const participant = await prisma.participant.update({
        where: { participantId: context.participantId },
        data: updateData,
      });

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
      
      const dependent = await prisma.householdDependent.update({
        where: { id: context.dependentId },
        data: updateData,
      });

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
      
      const participant = await prisma.participant.update({
        where: { participantId: context.participantId },
        data: updateData,
      });

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
  searchParticipantsByLocation,
  createParticipant,
  createHouseholdDependent,
  updateParticipantWicInfo,
  updateDependentWicInfo,
  updateParticipantDemographics,
]; 