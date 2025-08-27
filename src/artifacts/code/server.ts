// Simplified code document handler - no complex AI dependencies
import { createDocumentHandler } from '@/lib/artifacts/server';

export const codeDocumentHandler = createDocumentHandler<'code'>({
  kind: 'code',
  onCreateDocument: async ({ title, dataStream }) => {
    // Simple mock response
    const mockCode = `// Generated code for: ${title}\nconsole.log("Hello, World!");`;

    dataStream.write({
      type: 'data-codeDelta',
      data: mockCode,
      transient: true,
    });

    return mockCode;
  },
  onUpdateDocument: async ({ document, description, dataStream }) => {
    // Simple mock response
    const mockCode = `// Updated code: ${description}\n// Original: ${document.content || 'No content'}\nconsole.log("Updated!");`;

    dataStream.write({
      type: 'data-codeDelta',
      data: mockCode,
      transient: true,
    });

    return mockCode;
  },
});
