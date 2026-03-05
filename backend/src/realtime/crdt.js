/**
 * Very small character-index CRDT-ish helper using operations:
 * { type: 'insert' | 'delete', index: number, text?: string, length?: number }
 * This is not a full CRDT implementation but works for single-document hackathon collab.
 */

function applyOperation(content, op) {
  if (op.type === 'insert') {
    const before = content.slice(0, op.index);
    const after = content.slice(op.index);
    return before + (op.text || '') + after;
  }
  if (op.type === 'delete') {
    const before = content.slice(0, op.index);
    const after = content.slice(op.index + (op.length || 0));
    return before + after;
  }
  return content;
}

function applyOperations(content, ops) {
  return ops.reduce((acc, op) => applyOperation(acc, op), content);
}

module.exports = { applyOperation, applyOperations };

