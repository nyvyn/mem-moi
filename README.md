# mem-moi

**mem-moi** is a TypeScript library for managing memory stored in a single JSONL file. It provides a simple interface for storing and retrieving memory entries in a structured format.

It is built around the idea of using fast, inexpensive language models that offer extremely large context windows:
- A small, low‑cost model with a huge context window reads the whole JSONL log.
- It adds only truly new facts and picks a few memories that matter for the next reply.
- That short summary goes to the bigger, more expensive model.

Result: the main model stays on topic without ballooning prompt size or cost.

## Features

- Simple single-page memory management.
- Leverages cheap, million‑token‑window models to manage memory for expensive LLMs without exploding costs.
- Memory is stored in a JSONL file for easy access and persistence.
- Written in TypeScript for robust type safety and developer experience.

## Requirements

- Node.js 22.x
- An `OPENAI_API_KEY` environment variable with your OpenAI credentials

## Installation

```shell
npm install mem-moi
```

## Usage

Import the library and initialize the memory manager. `OPENAI_API_KEY` must be
set in your environment.

```typescript
import { Journal } from 'mem-moi';

const journal = new Journal('path/to/memory.jsonl');

// Save an interaction to memory
await journal.store('User moved to Austin, TX.');

// Load memories relevant to a new interaction
const memories = await journal.retrieve('Where do I live now?');
console.log(memories);
```

## Contributing

Contributions are welcome! Please open an issue or submit a PR on GitHub.

## License

Licensed under [MIT](LICENSE).
