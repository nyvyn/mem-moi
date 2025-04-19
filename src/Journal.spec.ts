import { describe, it, expect } from 'vitest'
import { memoryEntrySchema, MemoryEntry, Journal } from './Journal'

const validEntry: MemoryEntry = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    content: 'User moved to Austin, TX.',
    tags: ['location', 'life‑event'],
    createdAt: new Date().toISOString(),
}

const invalidEntry = {
    id: 'not‑a‑uuid',
    content: 42,
    tags: 'oops',
    // missing createdAt
}

describe('memoryEntrySchema / Journal.validateEntry', () => {
    it('parses a valid entry without error', () => {
        const parsed = memoryEntrySchema.parse(validEntry)
        expect(parsed).toEqual(validEntry)
    })

    it('throws on invalid entry via Zod', () => {
        expect(() => memoryEntrySchema.parse(invalidEntry)).toThrow()
    })

    it('Journal.validateEntry returns the entry when valid', () => {
        const j = new Journal('test.jsonl')
        expect(j.validateEntry(validEntry)).toEqual(validEntry)
    })

    it('Journal.validateEntry throws ZodError on bad input', () => {
        const j = new Journal('test.jsonl')
        expect(() => j.validateEntry(invalidEntry)).toThrow()
    })
})