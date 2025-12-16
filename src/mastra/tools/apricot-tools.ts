import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { getUsers, authenticate, type UsersResponse, type UserData } from '../../lib/apricot-api';

// ===== Input Schemas =====

const getUsersSchema = z.object({
  pageSize: z.number().optional().describe('Number of users to return per page (default: 25)'),
  pageNumber: z.number().optional().describe('Page number to retrieve (default: 1)'),
  sort: z.string().optional().describe('Field to sort by (e.g., "username", "-username" for descending)'),
  filters: z.record(z.string()).optional().describe('Filters to apply (e.g., {"active": "1"})'),
});

const searchUsersByNameSchema = z.object({
  firstName: z.string().optional().describe('First name to search for'),
  lastName: z.string().optional().describe('Last name to search for'),
  username: z.string().optional().describe('Username to search for'),
});

const getUserByIdSchema = z.object({
  userId: z.number().describe('The unique ID of the user in Apricot360'),
});

// ===== Output Schemas =====

const userSchema = z.object({
  id: z.number(),
  type: z.string(),
  attributes: z.object({
    org_id: z.number(),
    username: z.string(),
    user_type: z.string(),
    name_first: z.string(),
    name_middle: z.string(),
    name_last: z.string(),
    login_attempts: z.number(),
    mod_time: z.string(),
    mod_user: z.number(),
    active: z.number(),
    password_reset: z.string(),
    additionalProp1: z.string().optional(),
    additionalProp2: z.string().optional(),
    additionalProp3: z.string().optional(),
  }),
  links: z.object({
    additionalProp1: z.string().optional(),
    additionalProp2: z.string().optional(),
    additionalProp3: z.string().optional(),
  }),
});

const getUsersResponseSchema = z.object({
  users: z.array(userSchema),
  count: z.number(),
  success: z.boolean(),
  error: z.string().optional(),
});

const getUserByIdResponseSchema = z.object({
  user: userSchema.nullable(),
  found: z.boolean(),
  error: z.string().optional(),
});

// ===== Helper Functions =====

const transformUser = (user: UserData) => ({
  id: user.id,
  type: user.type,
  attributes: {
    org_id: user.attributes.org_id,
    username: user.attributes.username,
    user_type: user.attributes.user_type,
    name_first: user.attributes.name_first,
    name_middle: user.attributes.name_middle,
    name_last: user.attributes.name_last,
    login_attempts: user.attributes.login_attempts,
    mod_time: user.attributes.mod_time,
    mod_user: user.attributes.mod_user,
    active: user.attributes.active,
    password_reset: user.attributes.password_reset,
    additionalProp1: user.attributes.additionalProp1,
    additionalProp2: user.attributes.additionalProp2,
    additionalProp3: user.attributes.additionalProp3,
  },
  links: user.links,
});

// ===== Tools =====

/**
 * Get users from Apricot360 API with pagination and filtering
 */
export const getUsersFromApricot = createTool({
  id: 'get-users-from-apricot',
  description: 'Fetch users from Apricot360 API with optional pagination, sorting, and filtering. Use this to retrieve user information from the Apricot360 system.',
  inputSchema: getUsersSchema,
  outputSchema: getUsersResponseSchema,
  execute: async ({ context }) => {
    try {
      const options = {
        pageSize: context.pageSize,
        pageNumber: context.pageNumber,
        sort: context.sort,
        filters: context.filters,
      };

      const response: UsersResponse = await getUsers(options);
      
      const users = response.data.map(transformUser);

      return {
        users,
        count: response.meta.count,
        success: true,
      };
    } catch (error) {
      console.error('Error fetching users from Apricot:', error);
      return {
        users: [],
        count: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch users from Apricot360',
      };
    }
  },
});

/**
 * Search Apricot360 users by name
 */
export const searchApricotUsersByName = createTool({
  id: 'search-apricot-users-by-name',
  description: 'Search for users in Apricot360 by first name, last name, or username. Provide at least one search parameter.',
  inputSchema: searchUsersByNameSchema,
  outputSchema: getUsersResponseSchema,
  execute: async ({ context }) => {
    try {
      // Build filters object based on provided search parameters
      const filters: Record<string, string> = {};
      
      if (context.firstName) {
        filters.name_first = context.firstName;
      }
      
      if (context.lastName) {
        filters.name_last = context.lastName;
      }
      
      if (context.username) {
        filters.username = context.username;
      }

      // If no search parameters provided, return empty result
      if (Object.keys(filters).length === 0) {
        return {
          users: [],
          count: 0,
          success: false,
          error: 'At least one search parameter (firstName, lastName, or username) must be provided',
        };
      }

      const response: UsersResponse = await getUsers({ filters });
      
      const users = response.data.map(transformUser);

      return {
        users,
        count: response.meta.count,
        success: true,
      };
    } catch (error) {
      console.error('Error searching users in Apricot:', error);
      return {
        users: [],
        count: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Failed to search users in Apricot360',
      };
    }
  },
});

/**
 * Get a specific user by ID from Apricot360
 */
export const getApricotUserById = createTool({
  id: 'get-apricot-user-by-id',
  description: 'Get a specific user from Apricot360 by their unique user ID.',
  inputSchema: getUserByIdSchema,
  outputSchema: getUserByIdResponseSchema,
  execute: async ({ context }) => {
    try {
      const filters = {
        id: context.userId.toString(),
      };

      const response: UsersResponse = await getUsers({ filters });
      
      if (response.data.length === 0) {
        return {
          user: null,
          found: false,
        };
      }

      const user = transformUser(response.data[0]);

      return {
        user,
        found: true,
      };
    } catch (error) {
      console.error('Error fetching user from Apricot:', error);
      return {
        user: null,
        found: false,
        error: error instanceof Error ? error.message : 'Failed to fetch user from Apricot360',
      };
    }
  },
});

/**
 * Test Apricot360 authentication
 */
export const testApricotAuth = createTool({
  id: 'test-apricot-auth',
  description: 'Test authentication with Apricot360 API to verify credentials and connectivity.',
  inputSchema: z.object({}),
  outputSchema: z.object({
    success: z.boolean(),
    message: z.string(),
    hasToken: z.boolean(),
  }),
  execute: async () => {
    try {
      const token = await authenticate();
      
      return {
        success: true,
        message: 'Successfully authenticated with Apricot360 API',
        hasToken: !!token,
      };
    } catch (error) {
      console.error('Error testing Apricot authentication:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to authenticate with Apricot360',
        hasToken: false,
      };
    }
  },
});

// Export all Apricot tools
export const apricotTools = [
  getUsersFromApricot,
  searchApricotUsersByName,
  getApricotUserById,
  testApricotAuth,
];

