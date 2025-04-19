import { describe, it, expect, vi } from 'vitest'
import { journalEntrySchema, JournalEntry, Journal } from './Journal'

vi.mock('openai', () => {
  return {
    default: class {
      chat = {
        completions: {
          create: vi.fn().mockResolvedValue({
            choices: [{
              message: { content: '{"score": 0.7, "memory": "Mocked memory"}' }
            }]
          })
        }
      }
    }
  }
});

const validEntry: JournalEntry = {
    content: 'User moved to Austin, TX.',
    tags: ['location', 'life‑event'],
    createdAt: new Date().toISOString(),
}

const invalidEntry = {
    content: 42,
    tags: 'oops',
    // missing createdAt
}

describe('journalEntrySchema / Journal.validateEntry', () => {
    it('parses a valid entry without error', () => {
        const parsed = journalEntrySchema.parse(validEntry)
        expect(parsed).toEqual(validEntry)
    })

    it('throws on invalid entry via Zod', () => {
        expect(() => journalEntrySchema.parse(invalidEntry)).toThrow()
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
