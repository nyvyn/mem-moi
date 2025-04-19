import { z } from 'zod';
import { readFile, appendFile } from 'fs/promises';
import OpenAI from 'openai';
const openai = new OpenAI({ apiKey: process.env.OPENAI_KEY });

export const makeStorePrompt = (entries: JournalEntry[], interaction: string, threshold: number) => `
You are a memory filter working to identify novel or significant events.
Existing memories:
\${entries.map(e => '- ' + e.content).join('\n')}
New interaction:
"""\${interaction}"""
Rate the novelty of the interaction with a score between 0 and 1.
If the score is >= \${threshold}, rewrite the interaction concisely as a new memory entry.
Return strictly a JSON object: { "score": number, "memory": string | null }
`;

export const makeRetrievePrompt = (entries: JournalEntry[], interaction: string, k: number) => `
You are a memory retriever tasked with selecting the most relevant memories to assist with a new interaction.
Existing memories:
\${entries.map((e, i) => \`[\${i}] \${e.content}\`).join('\n')}
New interaction:
"""\${interaction}"""
Select up to \${k} memories that best support responding to the interaction.
Return strictly a JSON array of the selected memory strings.
`;

export const journalEntrySchema = z.object({
  content: z.string(),
  tags: z.array(z.string()),
  createdAt: z.string().datetime(),
});

export type JournalEntry = z.infer<typeof journalEntrySchema>;

export class Journal {
  filePath: string;

  /**
   * Create a new Journal instance.
   *
   * @param filePath Path to the journal file where entries are stored.
   */
  constructor(filePath: string) {
    this.filePath = filePath;
  }

  /**
   * Validates an entry against the memory schema.
   *
   * Returns the parsed memory entry if valid.
   * Throws a ZodError if the entry is invalid.
   */
  validateEntry(entry: any): JournalEntry {
    return memoryEntrySchema.parse(entry);
  }

  /**
   * Load all memory entries from the journal file.
   */
  async load(): Promise<JournalEntry[]> {
    try {
      const txt = await readFile(this.filePath, 'utf-8');
      return txt
        .trim()
        .split('\n')
        .map(line => journalEntrySchema.parse(JSON.parse(line)));
    } catch {
      return [];
    }
  }

  /**
   * Append a new memory entry to the journal file.
   */
  async append(entry: JournalEntry): Promise<void> {
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
        { role: 'system', content: 'You are a memory filter and extractor. You will receive existing memories and a new interaction. Determine how surprising the interaction is relative to the memories and respond with a JSON object containing "score" (0-1) and "memory" fields.' },
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
  async retrieve(interaction: string, k = 5): Promise<string[]> {
    const entries = await this.load();
    if (entries.length === 0) return [];

    /* -------- 1ͦ Select the most relevant memories -------- */
    const selectPrompt = makeRetrievePrompt(entries, interaction, k);
    const selectRes = await openai.chat.completions.create({
      model: 'gpt-4.1-nano',
      temperature: 0,
      messages: [
        { role: 'system', content: 'You are a memory retriever. Given an interaction and stored memories, select the most relevant memories and return them as a JSON array of strings.' },
        { role: 'user', content: selectPrompt }
      ]
    });
    const selected: string[] = JSON.parse(selectRes.choices[0].message.content as string);
    const relevant = entries.filter(e => selected.includes(e.content)).slice(0, k);

    return relevant.map(e => e.content);
  }
}
