// server/langchain.js
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { RunnableWithMessageHistory } from "@langchain/core/runnables";
import { InMemoryChatMessageHistory } from "@langchain/core/chat_history";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { loadHistory, readProjectMemory } from "./persist.js";

export const SKETCHTILER_SYSTEM = `
You are SketchTiler Assistant. Goal: assist with ideation and editing for tile-based level sketches.
Be proactive: propose changes, ask clarifying questions, and produce structured action plans.
When given images of maps/tiles, describe salient features and suggest improvements.
When asked, output actionable JSON of proposed edits.
When you produce a tilemap, include EXACTLY ONE fenced block:
\`\`\`tilemap
{"width":W,"height":H,"tiles":[{"x":X,"y":Y,"col":C,"row":R}, ...]}
\`\`\`
`;

export function buildSystem(projectId) {
  const notes = readProjectMemory(projectId);
  return notes ? `${SKETCHTILER_SYSTEM}\n\n# Project Memory (persistent)\n${notes}` : SKETCHTILER_SYSTEM;
}

export const llm = new ChatOpenAI({
  model: "gpt-4o",
  temperature: 0.4,
  apiKey: process.env.OPENAI_API_KEY,
});

const prompt = ChatPromptTemplate.fromMessages([
  ["system", "{system}"],
  new MessagesPlaceholder("history"),
  ["human", "{input}"],
]);
const parser = new StringOutputParser();
const baseChain = prompt.pipe(llm).pipe(parser);

const histories = new Map();

function seedHistoryFromDisk(h, projectId) {
  const saved = loadHistory(projectId);
  if (!Array.isArray(saved) || saved.length === 0) return;
  for (const m of saved) {
    if (m?.role === "user") h.addUserMessage(m.content ?? "");
    else if (m?.role === "assistant") h.addAIMessage(m.content ?? "");
  }
}

export function getHistory(projectId) {
  if (!histories.has(projectId)) {
    const h = new InMemoryChatMessageHistory();
    seedHistoryFromDisk(h, projectId);
    histories.set(projectId, h);
  }
  return histories.get(projectId);
}

export const conversational = new RunnableWithMessageHistory({
  runnable: baseChain,
  getMessageHistory: async (config) => {
    const projectId = config?.configurable?.sessionId || "sketchtiler";
    return getHistory(projectId);
  },
  inputMessagesKey: "input",
  historyMessagesKey: "history",
});

export async function pushManualTurn(projectId, role, content) {
  const h = getHistory(projectId);
  if (role === "user") await h.addUserMessage(content);
  else await h.addAIMessage(content);
}
