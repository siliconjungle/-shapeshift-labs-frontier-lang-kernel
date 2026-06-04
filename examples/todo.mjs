import { createDocument, entityNode, hashDocumentBase } from '../dist/index.js';

const document = createDocument({
  id: 'mod_todo',
  name: 'TodoApp',
  nodes: [entityNode({ id: 'ent_todo', name: 'Todo', fields: [{ id: 'field_title', name: 'title', type: 'Text' }] })]
});

console.log(hashDocumentBase(document));
