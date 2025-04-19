import Ajv from 'ajv';

export interface MemoryEntry {
  id: string;
  content: string;
  tags: string[];
  createdAt: string;
}

const memoryEntrySchema = {
  type: "object",
  properties: {
    id: { type: "string", pattern: "^[0-9a-fA-F-]{36}$" },
    content: { type: "string" },
    tags: {
      type: "array",
      items: { type: "string" }
    },
    createdAt: { type: "string", format: "date-time" }
  },
  required: ["id", "content", "tags", "createdAt"],
  additionalProperties: false
};

const ajv = new Ajv();
const validateMemoryEntry = ajv.compile<MemoryEntry>(memoryEntrySchema);

export class MemoryManager {
  filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  validateEntry(entry: any): entry is MemoryEntry {
    const valid = validateMemoryEntry(entry);
    if (!valid) {
      throw new Error(
        `Invalid memory entry: ${ajv.errorsText(validateMemoryEntry.errors)}`
      );
    }
    return true;
  }

  // Additional methods for reading and writing memory entries can be added here.
}
