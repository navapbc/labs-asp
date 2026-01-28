import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { authenticate, getForms, getRecordById, type FormsResponse, type FormData, type RecordData, type RecordByIdResponse } from '../../lib/apricot-api';
import {
  getFormsSchema,
  getFormByIdSchema,
  getRecordByIdSchema,
  getFormsResponseSchema,
  getFormByIdResponseSchema,
  getRecordByIdResponseSchema,
} from '../types/apricot-types';

// ===== Helper Functions =====

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
  testApricotAuth,
  getFormsFromApricot,
  getApricotFormById,
  getApricotRecordById,
];

