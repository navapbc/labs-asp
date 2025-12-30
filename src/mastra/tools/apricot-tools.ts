import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { getUsers, authenticate, getForms, getRecordById, type UsersResponse, type UserData, type FormsResponse, type FormData, type RecordData, type RecordByIdResponse } from '../../lib/apricot-api';
import {
  getUsersSchema,
  searchUsersByNameSchema,
  getUserByIdSchema,
  getFormsSchema,
  getFormByIdSchema,
  getRecordByIdSchema,
  getUsersResponseSchema,
  getUserByIdResponseSchema,
  getFormsResponseSchema,
  getFormByIdResponseSchema,
  getRecordByIdResponseSchema,
} from '../types/apricot-types';

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

const transformForm = (form: FormData) => ({
  id: form.id,
  type: form.type,
  attributes: {
    name: form.attributes.name,
    parent_id: form.attributes.parent_id,
    description: form.attributes.description,
    active: form.attributes.active,
    creation_time: form.attributes.creation_time,
    creation_user: form.attributes.creation_user,
    mod_time: form.attributes.mod_time,
    mod_user: form.attributes.mod_user,
    sort_order: form.attributes.sort_order,
    reference_tag: form.attributes.reference_tag,
    program_assignment_type: form.attributes.program_assignment_type,
    form_logic_enabled: form.attributes.form_logic_enabled,
    guid: form.attributes.guid,
    parent_guid: form.attributes.parent_guid,
  },
});

const transformRecord = (record: RecordData) => ({
  id: record.id,
  type: record.type,
  attributes: {
    ...record.attributes,
  },
  links: record.links,
});

// ===== Tools =====

/**
 * Get case worker users from Apricot360 API with pagination and filtering
 */
export const getUsersFromApricot = createTool({
  id: 'get-users-from-apricot',
  description: 'Fetch case worker users from Apricot360 API with optional pagination, sorting, and filtering. Use this to retrieve case worker/staff user information from the Apricot360 system. For participant or client records, use the records tools instead.',
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
 * Search Apricot360 case worker users by name
 */
export const searchApricotUsersByName = createTool({
  id: 'search-apricot-users-by-name',
  description: 'Search for case worker users in Apricot360 by first name, last name, or username. Provide at least one search parameter. This searches case workers/staff, not participants or clients.',
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
 * Get a specific case worker user by ID from Apricot360
 */
export const getApricotUserById = createTool({
  id: 'get-apricot-user-by-id',
  description: 'Get a specific case worker user from Apricot360 by their unique user ID. This retrieves case worker/staff information, not participant or client records.',
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

/**
 * Get forms from Apricot360 API with pagination and filtering
 */
export const getFormsFromApricot = createTool({
  id: 'get-forms-from-apricot',
  description: 'Fetch forms from Apricot360 API with optional pagination, sorting, and filtering. Use this to retrieve form information from the Apricot360 system.',
  inputSchema: getFormsSchema,
  outputSchema: getFormsResponseSchema,
  execute: async ({ context }) => {
    try {
      const options = {
        pageSize: context.pageSize,
        pageNumber: context.pageNumber,
        sort: context.sort,
        filters: context.filters,
      };

      const response: FormsResponse = await getForms(options);
      
      const forms = response.data.map(transformForm);

      return {
        forms,
        count: response.meta.count,
        success: true,
      };
    } catch (error) {
      console.error('Error fetching forms from Apricot:', error);
      return {
        forms: [],
        count: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch forms from Apricot360',
      };
    }
  },
});

/**
 * Get a specific form by ID from Apricot360
 */
export const getApricotFormById = createTool({
  id: 'get-apricot-form-by-id',
  description: 'Get a specific form from Apricot360 by its unique form ID.',
  inputSchema: getFormByIdSchema,
  outputSchema: getFormByIdResponseSchema,
  execute: async ({ context }) => {
    try {
      const filters = {
        id: context.formId.toString(),
      };

      const response: FormsResponse = await getForms({ filters });
      
      if (response.data.length === 0) {
        return {
          form: null,
          found: false,
        };
      }

      const form = transformForm(response.data[0]);

      return {
        form,
        found: true,
      };
    } catch (error) {
      console.error('Error fetching form from Apricot:', error);
      return {
        form: null,
        found: false,
        error: error instanceof Error ? error.message : 'Failed to fetch form from Apricot360',
      };
    }
  },
});

/**
 * Get a specific record by ID from Apricot360
 */
export const getApricotRecordById = createTool({
  id: 'get-apricot-record-by-id',
  description: 'Get a specific participant/client record from Apricot360 by its unique record ID. This retrieves detailed information about a single record.',
  inputSchema: getRecordByIdSchema,
  outputSchema: getRecordByIdResponseSchema,
  execute: async ({ context }) => {
    try {
      const response: RecordByIdResponse = await getRecordById(context.recordId);
      
      if (response.data.length === 0) {
        return {
          record: null,
          found: false,
        };
      }

      const record = transformRecord(response.data[0]);

      return {
        record,
        found: true,
      };
    } catch (error) {
      console.error('Error fetching record from Apricot:', error);
      return {
        record: null,
        found: false,
        error: error instanceof Error ? error.message : 'Failed to fetch record from Apricot360',
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
  getFormsFromApricot,
  getApricotFormById,
  getApricotRecordById,
];

