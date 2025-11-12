#!/usr/bin/env node
// server/registerModel.js
// Register existing fine-tuned models to the system

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATE_FILE = path.join(__dirname, "data", "fine_tuning", "state.json");

/**
 * Register a fine-tuned model
 */
function registerModel(modelName, openaiModelId, description = "") {
  // Ensure the directory exists
  const dir = path.dirname(STATE_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  // Read or create state
  let state = {
    models: {},
    jobs: {},
    activeModel: "base",
  };
  
  if (fs.existsSync(STATE_FILE)) {
    const content = fs.readFileSync(STATE_FILE, "utf8");
    state = JSON.parse(content);
  }
  
  // Add the model
  state.models[modelName] = {
    openaiModelId,
    createdAt: new Date().toISOString(),
    description,
    status: "ready",
  };
  
  // Save
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  
  console.log(`✓ Model registered: ${modelName}`);
  console.log(`  OpenAI Model ID: ${openaiModelId}`);
  console.log(`  Description: ${description || "(none)"}`);
  console.log(`\nSaved at: ${STATE_FILE}`);
  
  return state;
}

/**
 * List all models
 */
function listModels() {
  if (!fs.existsSync(STATE_FILE)) {
    console.log("No models have been registered yet");
    return;
  }
  
  const content = fs.readFileSync(STATE_FILE, "utf8");
  const state = JSON.parse(content);
  
  console.log("\nRegistered models:");
  console.log("=".repeat(60));
  
  // Base model
  console.log(`\n[base] Base model`);
  console.log(`  OpenAI Model ID: gpt-4o-mini-2024-07-18`);
  console.log(`  Status: Default`);
  if (state.activeModel === "base") {
    console.log(`  ★ Currently active model`);
  }
  
  // Fine-tuned models
  Object.entries(state.models).forEach(([name, info]) => {
    console.log(`\n[${name}] ${info.description || "Fine-tuned model"}`);
    console.log(`  OpenAI Model ID: ${info.openaiModelId}`);
    console.log(`  Created at: ${info.createdAt}`);
    console.log(`  Status: ${info.status}`);
    if (state.activeModel === name) {
      console.log(`  ★ Currently active model`);
    }
  });
  
  console.log("\n" + "=".repeat(60));
}

/**
 * Set the active model
 */
function setActiveModel(modelName) {
  if (!fs.existsSync(STATE_FILE)) {
    console.error("Error: No models have been registered yet");
    process.exit(1);
  }
  
  const content = fs.readFileSync(STATE_FILE, "utf8");
  const state = JSON.parse(content);
  
  // Check if the model exists
  if (modelName !== "base" && !state.models[modelName]) {
    console.error(`Error: Model "${modelName}" does not exist`);
    console.log("\nAvailable models:");
    console.log("  - base");
    Object.keys(state.models).forEach(name => {
      console.log(`  - ${name}`);
    });
    process.exit(1);
  }
  
  state.activeModel = modelName;
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  
  console.log(`✓ Active model set to: ${modelName}`);
}

/**
 * Main function
 */
function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  if (!command || command === "--help" || command === "-h") {
    console.log(`
Fine-tuned Model Registration Tool

Usage:
  node registerModel.js register <modelName> <OpenAIModelID> [description]
  node registerModel.js list
  node registerModel.js set-active <modelName>

Commands:
  register    Register a new fine-tuned model
  list        List all registered models
  set-active  Set the active model

Examples:
  # Register a fine-tuned model
  node registerModel.js register ft-v1 "ft:gpt-4o-mini-2024-07-18:org:name:abc123" "Week 2 fine-tuned model"
  
  # List all models
  node registerModel.js list
  
  # Set the active model
  node registerModel.js set-active ft-v1
  
  # Switch back to the base model
  node registerModel.js set-active base

Note:
  - OpenAI Model ID can be obtained from https://platform.openai.com/finetune
  - Format example: ft:gpt-4o-mini-2024-07-18:your-org:model-name:xxxxx
`);
    return;
  }
  
  switch (command) {
    case "register":
      if (args.length < 3) {
        console.error("Error: Model name and OpenAI Model ID are required");
        console.log("Usage: node registerModel.js register <modelName> <OpenAIModelID> [description]");
        process.exit(1);
      }
      registerModel(args[1], args[2], args[3] || "");
      break;
      
    case "list":
      listModels();
      break;
      
    case "set-active":
      if (args.length < 2) {
        console.error("Error: Model name is required");
        console.log("Usage: node registerModel.js set-active <modelName>");
        process.exit(1);
      }
      setActiveModel(args[1]);
      break;
      
    default:
      console.error(`Error: Unknown command "${command}"`);
      console.log("Run 'node registerModel.js --help' for help");
      process.exit(1);
  }
}

// Run
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { registerModel, listModels, setActiveModel };
