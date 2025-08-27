'use server';

import { getSuggestionsByDocumentId } from '@/lib/db/mock';

export async function getSuggestions({ documentId }: { documentId: string }) {
  const suggestions = await getSuggestionsByDocumentId({ documentId });
  return suggestions ?? [];
}
