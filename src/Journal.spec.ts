import { afterEach, describe, expect, it, vi } from "vitest";

// Must be first – everything below will now see the stub
vi.mock("openai", () => ({
    default: class {
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
    const fs = require("fs/promises");
    afterEach(() => {
        vi.clearAllMocks();
    });

    it("store() should append new memory when AI returns a memory", async () => {
        vi.spyOn(fs, "readFile").mockRejectedValue(new Error("no file"));
        const openai = new OpenAI();
        const createMock = vi.mocked(openai.chat.completions.create, true);
        createMock.mockResolvedValueOnce({
            choices: [{message: {content: "{\"memory\":\"Test memory\"}"}}],
        });
        const j = new Journal("test.jsonl", openai);
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
        const entriesJson = [
            {content: "A", tags: [], createdAt: "2025-04-19T00:00:00.000Z"},
            {content: "B", tags: [], createdAt: "2025-04-19T00:00:00.000Z"}
        ].map(e => JSON.stringify(e)).join("\n");
        vi.spyOn(fs, "readFile").mockResolvedValue(entriesJson + "\n");
        const openai = new OpenAI();
        const createMock = vi.mocked(openai.chat.completions.create, true);
        createMock.mockResolvedValueOnce({
            choices: [{message: {content: "[\"B\"]"}}],
        });
        const j = new Journal("test.jsonl", openai);
        const result = await j.retrieve("Test");
        expect(result).toEqual(["B"]);
    });
});
