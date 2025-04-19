import { describe, expect, it, vi } from "vitest";

// Must be first – everything below will now see the stub
vi.mock("openai", () => ({
    default: class {
        // noinspection JSUnusedGlobalSymbols
        chat = {
            completions: {
                create: vi.fn(),
            },
        };
    },
}));

import OpenAI from "openai";
import { journalEntrySchema, JournalEntry, Journal } from "./Journal";


const validEntry: JournalEntry = {
    content: "User moved to Austin, TX.",
    tags: ["location", "life‑event"],
    createdAt: new Date().toISOString(),
};

const invalidEntry = {
    content: 42,
    tags: "oops",
    // missing createdAt
};

describe("journalEntrySchema / Journal.validateEntry", () => {
    it("parses a valid entry without error", () => {
        const parsed = journalEntrySchema.parse(validEntry);
        expect(parsed).toEqual(validEntry);
    });

    it("throws on invalid entry via Zod", () => {
        expect(() => journalEntrySchema.parse(invalidEntry)).toThrow();
    });

    it("Journal.validateEntry returns the entry when valid", () => {
        const j = new Journal("test.jsonl", new OpenAI());
        expect(j.validateEntry(validEntry)).toEqual(validEntry);
    });

    it("Journal.validateEntry throws ZodError on bad input", () => {
        const j = new Journal("test.jsonl", new OpenAI());
        expect(() => j.validateEntry(invalidEntry)).toThrow();
    });
});

describe("Journal.store and retrieve", () => {
    it("store() should append new memory when AI returns a memory", async () => {
        const openai = new OpenAI();
        const j = new Journal("test.jsonl", openai);
        vi.spyOn(j, "load").mockResolvedValue([]);
        const createMock = vi.mocked(openai.chat.completions.create, true);
        createMock.mockResolvedValueOnce({
            choices: [{
                // @ts-ignore
                message: {
                    role: 'assistant',
                    content: "{\"memory\":\"Test memory\"}",
                }
            }],
        });
        const appendSpy = vi.spyOn(j, "append").mockResolvedValue(undefined);
        await j.store("Some interaction");
        expect(createMock).toHaveBeenCalled();
        expect(appendSpy).toHaveBeenCalledWith(expect.objectContaining({
            content: "Test memory",
            tags: [],
            createdAt: expect.any(String),
        }));
    });

    it("retrieve() should return selected memories based on AI response", async () => {
        const openai = new OpenAI();
        const j = new Journal("test.jsonl", openai);
        vi.spyOn(j, "load").mockResolvedValue([
            { content: "A", tags: [], createdAt: "2025-04-19T00:00:00.000Z" },
            { content: "B", tags: [], createdAt: "2025-04-19T00:00:00.000Z" },
        ]);
        const createMock = vi
            .spyOn(j.openai.chat.completions, "create")
            .mockResolvedValueOnce({
                choices: [{
                    // @ts-ignore
                    message: {
                        role: 'assistant',
                        content: "[\"B\"]",
                    }
                }],
            });
        const result = await j.retrieve("Test");
        expect(createMock).toHaveBeenCalled();
        expect(result).toEqual(["B"]);
    });
});
