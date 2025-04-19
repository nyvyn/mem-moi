import { z } from 'zod';
import { readFile, appendFile } from 'fs/promises';
import OpenAI from 'openai';
const openai = new OpenAI({ apiKey: process.env.OPENAI_KEY });

export const makeStorePrompt = (entries: MemoryEntry[], interaction: string, threshold: number) => `
You are a memory filter.
Rate how surprising the following interaction is (0-1) and if >= \${threshold}, rewrite it concisely.
Memories:
\${entries.map(e => '- ' + e.content).join('\n')}
Interaction: """\${interaction}"""
Return JSON: { "score": number, "memory": string | null }
`;

export const makeRetrievePrompt = (entries: MemoryEntry[], interaction: string, k: number) => `
Select up to \${k} memories to help with this interaction:
"""\${interaction}"""
Memories:
\${entries.map((e, i) => \`[\${i}] \${e.content}\`).join('\n')}
Return a JSON array of strings.
`;

export const memoryEntrySchema = z.object({
  content: z.string(),
  tags: z.array(z.string()),
  createdAt: z.string().datetime(),
});

export type MemoryEntry = z.infer<typeof memoryEntrySchema>;

export class Journal {
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

  /**
   * Load all memory entries from the journal file.
   */
  async load(): Promise<MemoryEntry[]> {
    try {
      const txt = await readFile(this.filePath, 'utf-8');
      return txt
        .trim()
        .split('\n')
        .map(line => memoryEntrySchema.parse(JSON.parse(line)));
    } catch {
      return [];
    }
  }

  /**
   * Append a new memory entry to the journal file.
   */
  async append(entry: MemoryEntry): Promise<void> {
    await appendFile(this.filePath, JSON.stringify(entry) + '\n');
  }

  /**
   * Process an interaction: determine if it's surprising and store it.
   */
  async store(interaction: string, threshold = 0.6): Promise<void> {
    const entries = await this.load();
    const prompt = makeStorePrompt(entries, interaction, threshold);
    const response = await openai.chat.completions.create({
      model: 'gpt-4.1-nano',
      temperature: 0,
      messages: [
        { role: 'system', content: 'You are a JSON expert.' },
        { role: 'user', content: prompt }
      ]
    });
    const raw = response.choices[0].message.content as string;
    const { score, memory } = JSON.parse(raw);
    if (score >= threshold && memory) {
      const entry: MemoryEntry = {
        content: memory,
        tags: [],
        createdAt: new Date().toISOString(),
      };
      await this.append(entry);
    }
  }

  /**
   * Retrieve memories and collapse them into ONE combined paragraph.
   */
  async retrieve(interaction: string, k = 5): Promise<string> {
    const entries = await this.load();
    if (entries.length === 0) return '';

    /* -------- 1ͦ Select the most relevant memories -------- */
    const selectPrompt = makeRetrievePrompt(entries, interaction, k);
    const selectRes = await openai.chat.completions.create({
      model: 'gpt-4.1-nano',
      temperature: 0,
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: selectPrompt }
      ]
    });
    const selected: string[] = JSON.parse(selectRes.choices[0].message.content as string);
    const relevant = entries.filter(e => selected.includes(e.content)).slice(0, k);

    /* -------- 2ͦ Combine them into one paragraph -------- */
    const combinePrompt = `
Combine the memories below into one concise paragraph (≤150 words) to aid the next assistant response.
Interaction: """${interaction}"""

Relevant memories:
${relevant.map(m => '- ' + m.content).join('\n')}

Return ONLY the combined paragraph.
`;
    const combineRes = await openai.chat.completions.create({
      model: 'gpt-4.1-nano',
      temperature: 0,
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: combinePrompt }
      ]
    });

    return combineRes.choices[0].message.content as string;
  }
}
