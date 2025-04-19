import { describe, it, expect, vi, afterEach } from 'vitest'
import { journalEntrySchema, JournalEntry, Journal } from './Journal'

vi.mock('openai', () => {
  return {
    default: class {
      chat = {
        completions: {
          create: vi.fn().mockResolvedValue({
            choices: [{
              message: { content: '{"memory":"Mocked memory"}' }
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

describe('Journal.store and retrieve', () => {
    const fs = require('fs/promises')
    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('store() should append new memory when AI returns a memory', async () => {
        vi.spyOn(fs, 'readFile').mockRejectedValue(new Error('no file'))
        const appendSpy = vi.spyOn(fs, 'appendFile').mockResolvedValue()
        const aiMock = new (require('openai').default)().chat.completions.create
        aiMock.mockResolvedValueOnce({
            choices: [{ message: { content: '{"memory":"Test memory"}' } }]
        })
        const j = new Journal('test.jsonl')
        await j.store('Some interaction')
        expect(appendSpy).toHaveBeenCalled()
        const [path, data] = appendSpy.mock.calls[0]
        expect(path).toBe('test.jsonl')
        const entry = JSON.parse(data)
        expect(entry.content).toBe('Test memory')
        expect(entry.tags).toEqual([])
        expect(new Date(entry.createdAt).toString()).not.toBe('Invalid Date')
    })

    it('retrieve() should return selected memories based on AI response', async () => {
        const entriesJson = [
            { content: 'A', tags: [], createdAt: '2025-04-19T00:00:00.000Z' },
            { content: 'B', tags: [], createdAt: '2025-04-19T00:00:00.000Z' }
        ].map(e => JSON.stringify(e)).join('\n')
        vi.spyOn(fs, 'readFile').mockResolvedValue(entriesJson + '\n')
        const aiMock = new (require('openai').default)().chat.completions.create
        aiMock.mockResolvedValueOnce({
            choices: [{ message: { content: '["B"]' } }]
        })
        const j = new Journal('test.jsonl')
        const result = await j.retrieve('Test')
        expect(result).toEqual(['B'])
    })
})
