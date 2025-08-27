// Simplified sheet document handler - no complex AI dependencies
import { createDocumentHandler } from '@/lib/artifacts/server';

export const sheetDocumentHandler = createDocumentHandler<'sheet'>({
  kind: 'sheet',
  onCreateDocument: async ({ title, dataStream }) => {
    // Simple mock response
    const mockCsv = `Name,Value\n${title},1\nExample,2`;

    dataStream.write({
      type: 'data-sheetDelta',
      data: mockCsv,
      transient: true,
    });

    return mockCsv;
  },
  onUpdateDocument: async ({ document, description, dataStream }) => {
    // Simple mock response
    const mockCsv = `Name,Value\n${description},1\nOriginal,${document.content || 'No content'}`;

    dataStream.write({
      type: 'data-sheetDelta',
      data: mockCsv,
      transient: true,
    });

    return mockCsv;
  },
});
