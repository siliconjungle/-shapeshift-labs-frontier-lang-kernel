# @shapeshift-labs/frontier-lang-kernel

Runtime-neutral semantic source graph, patch, replay, hashing, and merge-admission kernel for Frontier Lang.

## Install

```sh
npm install @shapeshift-labs/frontier-lang-kernel
```

## Role

This package owns the canonical semantic model: documents, nodes, stable IDs, patch bundles, replay, base hashes, target hashes, merge classification, and evidence records. It intentionally does not parse `.frontier` text and does not emit TypeScript/JavaScript.

## Example

```js
import { createDocument, createPatch, entityNode, hashDocumentBase } from '@shapeshift-labs/frontier-lang-kernel';

const todo = entityNode({
  id: 'ent_todo',
  name: 'Todo',
  fields: [{ id: 'field_title', name: 'title', type: 'Text', merge: { kind: 'conflict' } }]
});

const document = createDocument({ id: 'mod_todo', name: 'TodoApp', nodes: [todo] });
const patch = createPatch({ id: 'rename_todo', baseHash: hashDocumentBase(document), operations: [{ op: 'renameNode', id: 'ent_todo', name: 'Task' }] });
```

## Package Boundary

- Parser: `@shapeshift-labs/frontier-lang-parser`
- Checker: `@shapeshift-labs/frontier-lang-checker`
- TypeScript projection: `@shapeshift-labs/frontier-lang-typescript`
- CLI: `@shapeshift-labs/frontier-lang-cli`

## License

MIT.
