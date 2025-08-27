// Simplified image document handler - no complex AI dependencies
import { createDocumentHandler } from '@/lib/artifacts/server';

export const imageDocumentHandler = createDocumentHandler<'image'>({
  kind: 'image',
  onCreateDocument: async ({ title, dataStream }) => {
    // Simple mock response
    const mockImage = `data:image/svg+xml;base64,${btoa(`<svg><text>${title}</text></svg>`)}`;

    dataStream.write({
      type: 'data-imageDelta',
      data: mockImage,
      transient: true,
    });

    return mockImage;
  },
  onUpdateDocument: async ({ document, description, dataStream }) => {
    // Simple mock response
    const mockImage = `data:image/svg+xml;base64,${btoa(`<svg><text>${description}</text></svg>`)}`;

    dataStream.write({
      type: 'data-imageDelta',
      data: mockImage,
      transient: true,
    });

    return mockImage;
  },
});
