import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';

// Initialize Prisma client
const prisma = new PrismaClient();

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
  inputSchema: z.object({
    participantId: z.string().describe('The unique participant ID (e.g., WIC-SJ-2025-001)'),
  }),
  outputSchema: z.object({
    participant: z.any().nullable(),
    found: z.boolean(),
  }),
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
  inputSchema: z.object({
    name: z.string().describe('Full name (e.g., "Sarah Johnson") or partial name to search for'),
  }),
  outputSchema: z.object({
    participants: z.array(z.any()),
    count: z.number(),
  }),
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
  inputSchema: z.object({
    participantId: z.string().describe('The unique participant ID'),
  }),
  outputSchema: z.object({
    participant: z.any().nullable(),
    household: z.array(z.any()),
    totalMembers: z.number(),
  }),
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
  inputSchema: z.object({
    location: z.string().describe('City name or address part to search for (e.g., "Riverside", "Oak Street")'),
  }),
  outputSchema: z.object({
    participants: z.array(z.any()),
    count: z.number(),
  }),
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
  inputSchema: z.object({
    participantId: z.string().describe('Unique participant ID'),
    firstName: z.string().describe('First name'),
    lastName: z.string().describe('Last name'),
    dateOfBirth: z.string().describe('Date of birth (YYYY-MM-DD format)'),
    homeAddress: z.string().describe('Home address'),
    mobileNumber: z.string().describe('Mobile phone number'),
    email: z.string().optional().describe('Email address'),
    monthlyIncome: z.number().optional().describe('Monthly income amount'),
    occupation: z.string().optional().describe('Occupation'),
  }),
  outputSchema: z.object({
    participant: z.any().nullable(),
    success: z.boolean(),
    error: z.string().optional(),
  }),
  execute: async ({ context }) => {
    try {
      const participant = await prisma.participant.create({
        data: {
          participantId: context.participantId,
          firstName: context.firstName,
          lastName: context.lastName,
          dateOfBirth: new Date(context.dateOfBirth),
          homeAddress: context.homeAddress,
          mobileNumber: context.mobileNumber,
          email: context.email || null,
          monthlyIncome: context.monthlyIncome || null,
          occupation: context.occupation || null,
        },
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
  inputSchema: z.object({
    participantId: z.string().describe('The unique participant ID'),
    firstName: z.string().describe('Dependent first name'),
    lastName: z.string().describe('Dependent last name'),
    dateOfBirth: z.string().optional().describe('Date of birth (YYYY-MM-DD format) - can be placeholder if unknown'),
    relationship: z.string().describe('Relationship to participant (e.g., "child", "spouse")'),
  }),
  outputSchema: z.object({
    dependent: z.any().nullable(),
    success: z.boolean(),
    error: z.string().optional(),
  }),
  execute: async ({ context }) => {
    try {
      // Use placeholder date if not provided or use provided date
      const birthDate = context.dateOfBirth ? new Date(context.dateOfBirth) : new Date('2000-01-01');
      
      const dependent = await prisma.householdDependent.create({
        data: {
          participantId: context.participantId,
          firstName: context.firstName,
          lastName: context.lastName,
          dateOfBirth: birthDate,
          relationship: context.relationship,
          // Age-related WIC fields left undefined - to be determined by agent
        },
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
  inputSchema: z.object({
    participantId: z.string().describe('The unique participant ID'),
    isPregnant: z.boolean().optional().describe('Is the participant pregnant'),
    isPostPartum: z.boolean().optional().describe('Is the participant postpartum'),
    isInfantBreastfeeding: z.boolean().optional().describe('Is the participant breastfeeding an infant'),
    isInfantFormula: z.boolean().optional().describe('Is the participant formula feeding an infant'),
    hasChildren0to5: z.boolean().optional().describe('Does the participant have children aged 0-5'),
    hasDependents: z.boolean().optional().describe('Does the participant have any dependents'),
  }),
  outputSchema: z.object({
    participant: z.any().nullable(),
    success: z.boolean(),
    error: z.string().optional(),
  }),
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
  inputSchema: z.object({
    dependentId: z.string().describe('The unique dependent ID'),
    dateOfBirth: z.string().optional().describe('Date of birth (YYYY-MM-DD format)'),
    isInfant: z.boolean().optional().describe('Is the dependent an infant (under 1 year)'),
    isChild0to5: z.boolean().optional().describe('Is the dependent a child aged 0-5'),
  }),
  outputSchema: z.object({
    dependent: z.any().nullable(),
    success: z.boolean(),
    error: z.string().optional(),
  }),
  execute: async ({ context }) => {
    try {
      const updateData: any = {};
      
      // Only update fields that were provided
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
]; 