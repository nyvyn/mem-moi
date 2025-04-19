# mem-moi

**mem-moi** is a TypeScript library for managing memory stored in a single JSONL file. This library provides a simple
interface for storing and retrieving memory entries in a structured format.

It is built around the idea of using fast, inexpensive language models that offer extremely large context windows (
for example, GPT‑4.1 nano). These “memory‑router” models scan the entire JSONL file, append only surprising new facts,
and select the few memories that matter for the next turn. A more capable—but costlier—model then receives this compact
context, avoiding runaway prompt sizes while preserving relevance.

## Features

- Simple single-page memory management.
- Leverages cheap, million‑token‑window models to manage memory for expensive LLMs without exploding costs.
- Memory is stored in a JSONL file for easy access and persistence.
- Written in TypeScript for robust type safety and developer experience.

## Installation

```shell
npm install mem-moi
```

## Usage

Import the library and initialize the memory manager:

```typescript
import { Journal } from 'mem-moi';

const journal = new Journal('path/to/memory.jsonl');
// Use journal to store and retrieve memory entries
```

## Contributing

Contributions are welcome! Please open an issue or submit a PR on GitHub.

## License

Licensed under [MIT](LICENSE).
