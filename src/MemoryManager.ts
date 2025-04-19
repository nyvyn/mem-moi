import { z } from 'zod';

export const memoryEntrySchema = z.object({
  id: z.string().uuid(),
  content: z.string(),
  tags: z.array(z.string()),
  createdAt: z.string().datetime(),
});

export type MemoryEntry = z.infer<typeof memoryEntrySchema>;

export class MemoryManager {
  filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  /**
   * Validates an entry against the memory schema.
   * 
   * Returns the parsed memory entry if valid.
   * Throws a ZodError if the entry is invalid.
   */
  validateEntry(entry: any): MemoryEntry {
    return memoryEntrySchema.parse(entry);
  }

  // Additional methods for reading and writing memory entries can be added here.
}
