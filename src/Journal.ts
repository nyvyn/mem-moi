import { z } from "zod";
import * as fs from "fs/promises";
import OpenAI from "openai";


export const STORE_SYSTEM_PROMPT = 'You are a memory filter and extractor. You will receive existing memories and a new interaction. Determine how surprising the interaction is relative to the memories and respond with a JSON object containing "score" (0-1) and "memory" fields.';
export const RETRIEVE_SYSTEM_PROMPT = 'You are a memory retriever. Given an interaction and stored memories, select the most relevant memories and return them as a JSON array of strings.';

export const makeStorePrompt = (entries: JournalEntry[], interaction: string) => `
You are a memory filter working to identify novel or significant events.
Existing memories:
${entries.map(e => '- ' + e.content).join('\n')}
New interaction:
"""${interaction}"""
If the interaction is novel or significant, rewrite it concisely as a new memory entry.
Return strictly a JSON object: { "memory": string | null }
`;

export const makeRetrievePrompt = (entries: JournalEntry[], interaction: string) => `
You are a memory retriever tasked with selecting the most relevant memories to assist with a new interaction.
Existing memories:
${entries.map((e, i) => `[${i}] ${e.content}`).join('\n')}
New interaction:
"""${interaction}"""
Determine which memories are most relevant to the interaction.
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
    openai: OpenAI;
    model: string;

    /**
     * Create a new Journal instance.
     *
     * @param filePath Path to the journal file where entries are stored.
     * @param openaiClient Optional OpenAI client instance for testing or custom configuration.
     * @param model
     */
    constructor(filePath: string, openaiClient?: OpenAI, model = 'gpt-4.1-nano') {
        this.filePath = filePath;
        this.openai = openaiClient ?? new OpenAI({apiKey: process.env.OPENAI_KEY});
        this.model = model;
    }

    /**
     * Validates an entry against the journal entry schema.
     *
     * Returns the parsed journal entry if valid.
     * Throws a ZodError if the entry is invalid.
     */
    validateEntry(entry: any): JournalEntry {
        return journalEntrySchema.parse(entry);
    }

    /**
     * Load all memory entries from the journal file.
     */
    async load(): Promise<JournalEntry[]> {
        try {
            const txt = await fs.readFile(this.filePath, "utf-8");
            return txt.trim().split("\n").map(line => journalEntrySchema.parse(JSON.parse(line)));
        } catch {
            return [];
        }
    }

    /**
     * Append a new memory entry to the journal file.
     */
    async append(entry: JournalEntry): Promise<void> {
        await fs.appendFile(this.filePath, JSON.stringify(entry) + "\n");
    }

    /**
     * Process an interaction: determine if it's surprising and store it.
     */
    async store(interaction: string): Promise<void> {
        const entries = await this.load();
        const prompt = makeStorePrompt(entries, interaction);
        const response = await this.openai.chat.completions.create({
            model: this.model,
            temperature: 0,
            messages: [
                {
                    role: "system",
                    content: STORE_SYSTEM_PROMPT
                },
                {role: "user", content: prompt}
            ]
        });
        const raw = response.choices[0].message.content as string;
        const { memory } = JSON.parse(raw);
        if (typeof memory === 'string' && memory.trim()) {
            await this.append({
                content: memory.trim(),
                tags: [],
                createdAt: new Date().toISOString(),
            });
        }
    }

    /**
     * Retrieve memories and collapse them into ONE combined paragraph.
     */
    async retrieve(interaction: string): Promise<string[]> {
        const entries = await this.load();
        if (entries.length === 0) return [];

        /* -------- 1ͦ Select the most relevant memories -------- */
        const selectPrompt = makeRetrievePrompt(entries, interaction);
        const selectRes = await this.openai.chat.completions.create({
            model: this.model,
            temperature: 0,
            messages: [
                {
                    role: "system",
                    content: RETRIEVE_SYSTEM_PROMPT
                },
                {role: "user", content: selectPrompt}
            ]
        });
        const selected: string[] = JSON.parse(selectRes.choices[0].message.content as string);
        return selected;
    }
}
