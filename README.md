# mem-moi

**mem-moi** is a TypeScript library for managing memory stored in a single JSONL file. This library provides a simple interface for storing and retrieving memory entries in a structured format.

## Features

- Simple single-page memory management.
- Memory is stored in a JSONL file for easy access and persistence.
- Written in TypeScript for robust type safety and developer experience.

## Installation

```shell
npm install mem-moi
```

## Usage

Import the library and initialize the memory manager:

```typescript
import { MemoryManager } from 'mem-moi';

const manager = new MemoryManager('path/to/memory.jsonl');
// Use manager to add, read, and manage memory entries
```

## Contributing

Contributions are welcome! Please open an issue or submit a PR on GitHub.

## License

Licensed under [MIT](LICENSE).
