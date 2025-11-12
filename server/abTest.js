// server/abTest.js
// A/B testing framework for comparing base model vs fine-tuned model

import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env from server directory
dotenv.config({ path: path.join(__dirname, '.env') });

import OpenAI from "openai";
import { validatePlan } from "./schema.js";
import { validateTrainingPlan, isTrainingFormat } from "./schema-training.js";
import { validateAllFailuresOnly } from "./validators.js";
import { getOpenAIModelId } from "./fineTuning.js";
const AB_TEST_DIR = path.join(__dirname, "data", "ab_test");
const TEST_REQUESTS_FILE = path.join(AB_TEST_DIR, "test_requests.json");
const RESULTS_DIR = path.join(AB_TEST_DIR, "results");

// Ensure directories exist
if (!fs.existsSync(AB_TEST_DIR)) {
  fs.mkdirSync(AB_TEST_DIR, { recursive: true });
}
if (!fs.existsSync(RESULTS_DIR)) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * System prompt for plan generation
 * For fine-tuned model: use training data format
 * For base model: use detailed format
 */
const PLAN_SYSTEM_PROMPT_FT = "You are SketchTiler-LLM. Always output JSON following plan_schema v2.1.";

const PLAN_SYSTEM_PROMPT_BASE = `You are a level design planning assistant for SketchTiler, a tile-based map editor.

Your task is to generate structured JSON plans based on user requests for map editing.

Output a JSON object with this structure:
{
  "version": "2.1",
  "intent": "brief description of what the plan does",
  "selection": { "x": number, "y": number, "width": number, "height": number },
  "mapMeta": { "width": number, "height": number, "tilesetCols": number, "tilesetRows": number },
  "stats": { "totalTiles": number, "emptyTiles": number, "density": number },
  "actions": [
    {
      "type": "add_structure" | "add_tiles" | "remove_tiles" | "replace_tiles",
      // ... action-specific fields
    }
  ],
  "constraints": [
    {
      "type": "minimum_spacing" | "maintain_adjacency" | "preserve_paths",
      // ... constraint-specific fields
    }
  ],
  "confidence": number (0-1),
  "reasoning": "explanation of the plan"
}

Be precise with coordinates and ensure all values are within bounds.`;

/**
 * Few-shot examples for base model
 */
function createFewShotExamples() {
  return [
    {
      role: "user",
      content: JSON.stringify({
        request: "add more trees to the selected area",
        selection: { x: 5, y: 5, width: 10, height: 10 },
        mapMeta: { width: 20, height: 20, tilesetCols: 12, tilesetRows: 11 },
        stats: { totalTiles: 100, density: 0.2, structureCount: 3 }
      })
    },
    {
      role: "assistant",
      content: JSON.stringify({
        version: "2.1",
        intent: "Add scattered trees throughout the selected area",
        selection: { x: 5, y: 5, width: 10, height: 10 },
        mapMeta: { width: 20, height: 20, tilesetCols: 12, tilesetRows: 11 },
        stats: { totalTiles: 100, density: 0.2, structureCount: 3 },
        actions: [
          {
            type: "add_structure",
            structureType: "tree",
            count: 8,
            minSize: 1,
            maxSize: 2,
            selection: { x: 5, y: 5, width: 10, height: 10 },
            priority: 70
          }
        ],
        constraints: [
          {
            type: "minimum_spacing",
            minSpacing: 2,
            priority: 60
          }
        ],
        confidence: 0.9,
        reasoning: "Adding 8 trees with spacing will increase density while maintaining natural distribution."
      })
    }
  ];
}

/**
 * Generate a plan using specified model
 * @param {string} modelName - "base" or fine-tuned model name
 * @param {Object} testRequest - Test request object
 * @returns {Promise<Object>} Result with plan and metadata
 */
async function generatePlanForTest(modelName, testRequest) {
  const startTime = Date.now();

  try {
    const openaiModelId = getOpenAIModelId(modelName);

    // Build user message based on model type
    let userMessage;
    if (modelName === "base") {
      // Base model: use JSON format
      userMessage = JSON.stringify({
        request: testRequest.request,
        selection: testRequest.selection,
        mapMeta: testRequest.mapMeta,
        stats: testRequest.stats || {},
      });
    } else {
      // Fine-tuned model: use training data format (text array)
      const sel = testRequest.selection;
      if (!sel) {
        throw new Error(`testRequest.selection is undefined for request: ${testRequest.request}`);
      }
      if (sel.x === undefined || sel.y === undefined || sel.width === undefined || sel.height === undefined) {
        const err = new Error(`testRequest.selection missing required fields. Got: ${JSON.stringify(sel)}`);
        err.rawResponse = `testRequest: ${JSON.stringify(testRequest)}`;
        throw err;
      }
      const stats = testRequest.stats || {};

      // Format stats as key=value pairs (matching training data)
      const statsStr = Object.entries(stats)
        .map(([k, v]) => `${k}=${v}`)
        .join(", ");

      userMessage = [
        { type: "text", text: testRequest.request },
        { type: "text", text: `SELECTION: bbox(${sel.x},${sel.y},${sel.width},${sel.height})` },
        { type: "text", text: `STATS: ${statsStr}` }
      ];
    }

    // Few-shot examples only for base model
    const fewShotExamples = modelName === "base" ? createFewShotExamples() : [];

    // Call OpenAI API
    // Use different system prompts to match training data
    const systemPrompt = modelName === "base" ? PLAN_SYSTEM_PROMPT_BASE : PLAN_SYSTEM_PROMPT_FT;

    const messages = [
      { role: "system", content: systemPrompt },
      ...fewShotExamples,
      { role: "user", content: userMessage }
    ];

    const response = await openai.chat.completions.create({
      model: openaiModelId,
      messages,
      temperature: 0.4,
      response_format: { type: "json_object" },
    });
    
    const rawContent = response.choices[0].message.content;

    let planData;
    try {
      planData = JSON.parse(rawContent);
    } catch (parseErr) {
      const err = new Error(`JSON parse failed: ${parseErr.message}`);
      err.rawResponse = rawContent;
      throw err;
    }

    // Determine which schema to use based on model type and data format
    let schemaResult;
    let schemaValid;
    let validatedPlan;

    if (modelName !== "base" || isTrainingFormat(planData)) {
      // Fine-tuned model or training format: use training schema
      schemaResult = validateTrainingPlan(planData);
      schemaValid = schemaResult.success;

      if (schemaValid) {
        validatedPlan = schemaResult.data;

        // Add mapMeta and selection from testRequest for validators
        // (Training data doesn't include these fields, but validators need them)
        if (!validatedPlan.mapMeta && testRequest.mapMeta) {
          validatedPlan.mapMeta = testRequest.mapMeta;
        }
        if (!validatedPlan.selection && testRequest.selection) {
          validatedPlan.selection = testRequest.selection;
        }
      }
    } else {
      // Base model: use production schema
      schemaResult = validatePlan(planData);
      schemaValid = schemaResult.success;
      validatedPlan = schemaValid ? schemaResult.data : null;
    }

    // Validate semantics (only if schema validation passed)
    const validationErrors = schemaValid
      ? validateAllFailuresOnly(validatedPlan, testRequest.validationContext || {})
      : [];

    const validatorPass = validationErrors.length === 0;
    
    const duration = Date.now() - startTime;
    
    return {
      success: schemaValid && validatorPass,
      schemaValid,
      validatorPass,
      plan: validatedPlan,
      schemaErrors: schemaValid ? [] : schemaResult.error?.issues || [],
      validationErrors,
      duration,
      tokensUsed: response.usage?.total_tokens || 0,
      rawResponse: rawContent,
    };
    
  } catch (err) {
    const duration = Date.now() - startTime;
    return {
      success: false,
      schemaValid: false,
      validatorPass: false,
      plan: null,
      schemaErrors: [],
      validationErrors: [],
      error: err.message,
      rawResponse: err.rawResponse || null,
      duration,
      tokensUsed: 0,
    };
  }
}

/**
 * Run A/B test comparing base model vs fine-tuned model
 * @param {string} ftModelName - Fine-tuned model name (e.g., "ft-v1")
 * @param {Array} testRequests - Array of test request objects
 * @param {Object} options - Test options
 * @returns {Promise<Object>} Test results
 */
export async function runABTest(ftModelName, testRequests, options = {}) {
  const {
    saveResults = true,
    verbose = true,
  } = options;
  
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Starting A/B Test: base vs ${ftModelName}`);
  console.log(`Test requests: ${testRequests.length}`);
  console.log(`${"=".repeat(60)}\n`);
  
  const results = {
    testId: `ab_test_${Date.now()}`,
    timestamp: new Date().toISOString(),
    ftModelName,
    totalRequests: testRequests.length,
    base: {
      schemaValid: 0,
      validatorPass: 0,
      totalSuccess: 0,
      totalDuration: 0,
      totalTokens: 0,
      results: [],
    },
    ft: {
      schemaValid: 0,
      validatorPass: 0,
      totalSuccess: 0,
      totalDuration: 0,
      totalTokens: 0,
      results: [],
    },
  };
  
  // Run tests for each request
  for (let i = 0; i < testRequests.length; i++) {
    const request = testRequests[i];
    
    if (verbose) {
      console.log(`\n[${i + 1}/${testRequests.length}] Testing: "${request.request}"`);
    }
    
    // Test base model
    if (verbose) console.log("  → Testing base model...");
    const baseResult = await generatePlanForTest("base", request);
    results.base.results.push({
      requestIndex: i,
      request: request.request,
      ...baseResult,
    });
    
    if (baseResult.schemaValid) results.base.schemaValid++;
    if (baseResult.validatorPass) results.base.validatorPass++;
    if (baseResult.success) results.base.totalSuccess++;
    results.base.totalDuration += baseResult.duration;
    results.base.totalTokens += baseResult.tokensUsed;
    
    if (verbose) {
      console.log(`     Schema: ${baseResult.schemaValid ? "✓" : "✗"}, Validator: ${baseResult.validatorPass ? "✓" : "✗"}, Time: ${baseResult.duration}ms`);
    }
    
    // Test fine-tuned model
    if (verbose) console.log("  → Testing fine-tuned model...");
    const ftResult = await generatePlanForTest(ftModelName, request);
    results.ft.results.push({
      requestIndex: i,
      request: request.request,
      ...ftResult,
    });
    
    if (ftResult.schemaValid) results.ft.schemaValid++;
    if (ftResult.validatorPass) results.ft.validatorPass++;
    if (ftResult.success) results.ft.totalSuccess++;
    results.ft.totalDuration += ftResult.duration;
    results.ft.totalTokens += ftResult.tokensUsed;
    
    if (verbose) {
      console.log(`     Schema: ${ftResult.schemaValid ? "✓" : "✗"}, Validator: ${ftResult.validatorPass ? "✓" : "✗"}, Time: ${ftResult.duration}ms`);
    }
  }
  
  // Calculate percentages
  results.base.schemaValidPercent = (results.base.schemaValid / results.totalRequests) * 100;
  results.base.validatorPassPercent = (results.base.validatorPass / results.totalRequests) * 100;
  results.base.successPercent = (results.base.totalSuccess / results.totalRequests) * 100;
  results.base.avgDuration = results.base.totalDuration / results.totalRequests;
  results.base.avgTokens = results.base.totalTokens / results.totalRequests;
  
  results.ft.schemaValidPercent = (results.ft.schemaValid / results.totalRequests) * 100;
  results.ft.validatorPassPercent = (results.ft.validatorPass / results.totalRequests) * 100;
  results.ft.successPercent = (results.ft.totalSuccess / results.totalRequests) * 100;
  results.ft.avgDuration = results.ft.totalDuration / results.totalRequests;
  results.ft.avgTokens = results.ft.totalTokens / results.totalRequests;
  
  // Acceptance criteria
  results.acceptance = {
    schemaValidThreshold: 90,
    validatorPassThreshold: 80,
    ftMeetsSchemaThreshold: results.ft.schemaValidPercent >= 90,
    ftMeetsValidatorThreshold: results.ft.validatorPassPercent > 80,
    accepted: results.ft.schemaValidPercent >= 90 && results.ft.validatorPassPercent > 80,
  };
  
  // Save results
  if (saveResults) {
    const resultsFile = path.join(RESULTS_DIR, `${results.testId}.json`);
    fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
    console.log(`\nResults saved to: ${resultsFile}`);
  }
  
  return results;
}

/**
 * Print A/B test results summary
 * @param {Object} results - Results from runABTest
 */
export function printABTestSummary(results) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`A/B TEST RESULTS SUMMARY`);
  console.log(`${"=".repeat(60)}`);
  console.log(`Test ID: ${results.testId}`);
  console.log(`Timestamp: ${results.timestamp}`);
  console.log(`Total Requests: ${results.totalRequests}`);
  console.log(`Fine-tuned Model: ${results.ftModelName}`);
  console.log(`${"=".repeat(60)}\n`);
  
  // Base model results
  console.log(`BASE MODEL:`);
  console.log(`  Schema Valid:     ${results.base.schemaValid}/${results.totalRequests} (${results.base.schemaValidPercent.toFixed(2)}%)`);
  console.log(`  Validator Pass:   ${results.base.validatorPass}/${results.totalRequests} (${results.base.validatorPassPercent.toFixed(2)}%)`);
  console.log(`  Total Success:    ${results.base.totalSuccess}/${results.totalRequests} (${results.base.successPercent.toFixed(2)}%)`);
  console.log(`  Avg Duration:     ${results.base.avgDuration.toFixed(0)}ms`);
  console.log(`  Avg Tokens:       ${results.base.avgTokens.toFixed(0)}`);
  console.log();
  
  // Fine-tuned model results
  console.log(`FINE-TUNED MODEL (${results.ftModelName}):`);
  console.log(`  Schema Valid:     ${results.ft.schemaValid}/${results.totalRequests} (${results.ft.schemaValidPercent.toFixed(2)}%)`);
  console.log(`  Validator Pass:   ${results.ft.validatorPass}/${results.totalRequests} (${results.ft.validatorPassPercent.toFixed(2)}%)`);
  console.log(`  Total Success:    ${results.ft.totalSuccess}/${results.totalRequests} (${results.ft.successPercent.toFixed(2)}%)`);
  console.log(`  Avg Duration:     ${results.ft.avgDuration.toFixed(0)}ms`);
  console.log(`  Avg Tokens:       ${results.ft.avgTokens.toFixed(0)}`);
  console.log();
  
  // Comparison
  const schemaImprovement = results.ft.schemaValidPercent - results.base.schemaValidPercent;
  const validatorImprovement = results.ft.validatorPassPercent - results.base.validatorPassPercent;
  const speedImprovement = ((results.base.avgDuration - results.ft.avgDuration) / results.base.avgDuration) * 100;
  
  console.log(`COMPARISON (FT vs Base):`);
  console.log(`  Schema Valid:     ${schemaImprovement >= 0 ? "+" : ""}${schemaImprovement.toFixed(2)}%`);
  console.log(`  Validator Pass:   ${validatorImprovement >= 0 ? "+" : ""}${validatorImprovement.toFixed(2)}%`);
  console.log(`  Speed:            ${speedImprovement >= 0 ? "+" : ""}${speedImprovement.toFixed(2)}%`);
  console.log();
  
  // Acceptance criteria
  console.log(`ACCEPTANCE CRITERIA:`);
  console.log(`  Schema Valid ≥ 90%:      ${results.acceptance.ftMeetsSchemaThreshold ? "✓ PASS" : "✗ FAIL"} (${results.ft.schemaValidPercent.toFixed(2)}%)`);
  console.log(`  Validator Pass > 80%:    ${results.acceptance.ftMeetsValidatorThreshold ? "✓ PASS" : "✗ FAIL"} (${results.ft.validatorPassPercent.toFixed(2)}%)`);
  console.log();
  console.log(`FINAL RESULT: ${results.acceptance.accepted ? "✓ ACCEPTED" : "✗ REJECTED"}`);
  console.log(`${"=".repeat(60)}\n`);
}

export default {
  runABTest,
  printABTestSummary,
};

