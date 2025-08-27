// Simplified text document handler - no complex AI dependencies
import { createDocumentHandler } from '@/lib/artifacts/server';

export const textDocumentHandler = createDocumentHandler<'text'>({
  kind: 'text',
  onCreateDocument: async ({ title, dataStream }) => {
    // Simple mock response
    const mockText = `Generated text for: ${title}\n\nThis is a sample text document created without complex AI dependencies.`;

    dataStream.write({
      type: 'data-textDelta',
      data: mockText,
      transient: true,
    });

    return mockText;
  },
  onUpdateDocument: async ({ document, description, dataStream }) => {
    // Simple mock response
    const mockText = `Updated text: ${description}\n\nOriginal content: ${document.content || 'No content'}\n\nThis is an updated text document.`;

    dataStream.write({
      type: 'data-textDelta',
      data: mockText,
      transient: true,
    });

    return mockText;
  },
});
