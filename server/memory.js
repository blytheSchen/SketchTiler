// server/memory.js
import { v4 as uuid } from "uuid";

const threads = new Map(); // key: projectId, value: { threadId, messages: [] }

export function getOrCreateThread(projectId) {
  if (!threads.has(projectId)) {
    threads.set(projectId, { threadId: uuid(), messages: [] });
  }
  return threads.get(projectId);
}

export function appendMessage(projectId, role, content) {
  const t = getOrCreateThread(projectId);
  t.messages.push({ role, content, ts: Date.now() });
}
