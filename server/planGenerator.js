// server/planGenerator.js
// Plan generation using base model or fine-tuned models

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env from server directory
dotenv.config({ path: path.join(__dirname, '.env') });

import OpenAI from "openai";
import { validatePlan } from "./schema.js";
import { validateAllFailuresOnly } from "./validators.js";
import {
  logInvalidPlan,
  logValidPlan,
  logPlanRetry,
  logModelSelection
} from "./logger.js";
import { getActiveModel, getOpenAIModelId } from "./fineTuning.js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * System prompt for plan generation
 */
const PLAN_SYSTEM_PROMPT = `You are a level design planning assistant for SketchTiler, a tile-based map editor.

Your job is to convert user requests into structured action plans (JSON) that modify tile-based maps.

## Your Capabilities:
- Add structures: houses, trees, forests, paths, fences
- Remove existing structures
- Modify density of features (sparse to dense)
- Clear areas or preserve them
- Set specific tiles at positions
- Fill patterns using WFC (Wave Function Collapse)

## Important Rules:
1. ALWAYS respond with valid JSON matching the Plan schema v2.1
2. Selection coordinates must be within map bounds (provided in request)
3. Action selections must be within primary selection region
4. Tile references (col, row) must be within tileset bounds
5. Be conservative with change budgets - fewer targeted changes are better
6. Respect constraints like "keep paths clear" or "avoid water"
7. Consider current density when modifying it
8. Prioritize actions (higher priority = executed first)

## Response Format:
Return ONLY a JSON object with this structure:
{
  "version": "2.1",
  "intent": "Brief summary of user's request",
  "selection": {"x": 0, "y": 0, "width": 10, "height": 10},
  "mapMeta": {"width": 20, "height": 20, "tilesetCols": 12, "tilesetRows": 11},
  "stats": {"totalTiles": 100, "density": 0.3},
  "actions": [
    {
      "type": "add_structure",
      "structureType": "tree",
      "count": 5,
      "priority": 80
    }
  ],
  "constraints": [
    {
      "type": "keep_paths_clear",
      "priority": 90
    }
  ],
  "confidence": 0.85,
  "reasoning": "Brief explanation of the plan"
}

## Examples will be provided in few-shot format.`;

/**
 * Create few-shot examples for the prompt
 * These are seed examples that help the model understand the format
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
        intent: "Increase tree density in selected forest area",
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
            priority: 70
          }
        ],
        constraints: [
          {
            type: "density_limit",
            maxDensity: 0.6,
            priority: 80
          }
        ],
        confidence: 0.9,
        reasoning: "Adding 8 small-to-medium trees will increase density from 0.2 to approximately 0.5, creating a denser forest without overcrowding."
      })
    },
    {
      role: "user",
      content: JSON.stringify({
        request: "thin out this dense forest but keep the paths clear",
        selection: { x: 0, y: 0, width: 15, height: 15 },
        mapMeta: { width: 30, height: 30, tilesetCols: 12, tilesetRows: 11 },
        stats: { totalTiles: 225, density: 0.75, pathTiles: 30, structureCount: 45 }
      })
    },
    {
      role: "assistant",
      content: JSON.stringify({
        version: "2.1",
        intent: "Reduce forest density while preserving path connectivity",
        selection: { x: 0, y: 0, width: 15, height: 15 },
        mapMeta: { width: 30, height: 30, tilesetCols: 12, tilesetRows: 11 },
        stats: { totalTiles: 225, density: 0.75, pathTiles: 30, structureCount: 45 },
        actions: [
          {
            type: "modify_density",
            structureType: "tree",
            densityChange: -0.3,
            priority: 70
          }
        ],
        constraints: [
          {
            type: "preserve_paths",
            priority: 95
          },
          {
            type: "density_limit",
            minDensity: 0.3,
            maxDensity: 0.5,
            priority: 80
          },
          {
            type: "change_budget",
            maxChanges: 80,
            priority: 85
          }
        ],
        confidence: 0.85,
        reasoning: "Reducing density by 0.3 (from 0.75 to ~0.45) removes excess trees while maintaining forest character. Path preservation ensures connectivity remains intact."
      })
    },
    {
      role: "user",
      content: JSON.stringify({
        request: "add a small house in the middle of this area",
        selection: { x: 10, y: 10, width: 8, height: 8 },
        mapMeta: { width: 25, height: 25, tilesetCols: 12, tilesetRows: 11 },
        stats: { totalTiles: 64, emptyTiles: 50, density: 0.1 }
      })
    },
    {
      role: "assistant",
      content: JSON.stringify({
        version: "2.1",
        intent: "Place a small house centrally in the selected area",
        selection: { x: 10, y: 10, width: 8, height: 8 },
        mapMeta: { width: 25, height: 25, tilesetCols: 12, tilesetRows: 11 },
        stats: { totalTiles: 64, emptyTiles: 50, density: 0.1 },
        actions: [
          {
            type: "add_structure",
            structureType: "house",
            count: 1,
            minSize: 3,
            maxSize: 4,
            selection: { x: 12, y: 12, width: 4, height: 4 },
            priority: 80
          }
        ],
        constraints: [
          {
            type: "minimum_spacing",
            minSpacing: 2,
            priority: 75
          }
        ],
        confidence: 0.95,
        reasoning: "Centering a 3-4 tile house in the middle provides good placement with spacing from edges."
      })
    }
  ];
}

/**
 * Generate a plan using the specified model
 * @param {string} userRequest - Natural language request
 * @param {Object} context - Context about selection and map
 * @param {Object} [options] - Generation options
 * @returns {Promise<Object>} Generated plan and metadata
 */
export async function generatePlan(userRequest, context, options = {}) {
  const {
    modelName = null, // null = use active model
    maxRetries = 3,
    temperature = 0.4,
    projectId = "sketchtiler",
  } = options;
  
  // Determine which model to use
  const selectedModel = modelName || getActiveModel();
  const openaiModelId = getOpenAIModelId(selectedModel);
  
  logModelSelection(projectId, selectedModel, modelName ? "explicit" : "default active");
  
  // Build user message with context
  const userMessage = JSON.stringify({
    request: userRequest,
    selection: context.selection,
    mapMeta: context.mapMeta,
    stats: context.stats || {},
  });
  
  // Few-shot examples for base model (fine-tuned models have this baked in)
  const fewShotExamples = selectedModel === "base" ? createFewShotExamples() : [];
  
  // Attempt generation with retries
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Call OpenAI API
      const messages = [
        { role: "system", content: PLAN_SYSTEM_PROMPT },
        ...fewShotExamples,
        { role: "user", content: userMessage }
      ];
      
      const response = await openai.chat.completions.create({
        model: openaiModelId,
        messages,
        temperature,
        response_format: { type: "json_object" }, // Ensure JSON output
      });
      
      const rawContent = response.choices[0].message.content;
      let planData;
      
      try {
        planData = JSON.parse(rawContent);
      } catch (parseErr) {
        throw new Error(`Failed to parse JSON response: ${parseErr.message}`);
      }
      
      // Validate schema
      const schemaResult = validatePlan(planData);
      
      if (!schemaResult.success) {
        const schemaErrors = schemaResult.error.errors.map(e => ({
          path: e.path.join("."),
          message: e.message,
        }));
        
        logInvalidPlan(projectId, planData, [
          { validator: "schema", error: "Schema validation failed", details: schemaErrors }
        ], { model: selectedModel, attemptNumber: attempt });
        
        if (attempt < maxRetries) {
          logPlanRetry(projectId, attempt + 1, "Schema validation failed", { schemaErrors });
          continue;
        }
        
        throw new Error(`Schema validation failed after ${maxRetries} attempts`);
      }
      
      const plan = schemaResult.data;
      
      // Run semantic validators
      const validationErrors = validateAllFailuresOnly(plan, context.validationContext || {});
      
      if (validationErrors.length > 0) {
        logInvalidPlan(projectId, plan, validationErrors, { 
          model: selectedModel, 
          attemptNumber: attempt 
        });
        
        if (attempt < maxRetries) {
          logPlanRetry(projectId, attempt + 1, "Semantic validation failed", { 
            errorCount: validationErrors.length,
            validators: validationErrors.map(e => e.validator)
          });
          continue;
        }
        
        throw new Error(`Validation failed after ${maxRetries} attempts: ${validationErrors.map(e => e.error).join("; ")}`);
      }
      
      // Success!
      logValidPlan(projectId, plan, { model: selectedModel, attemptNumber: attempt });
      
      return {
        success: true,
        plan,
        metadata: {
          model: selectedModel,
          openaiModelId,
          attempts: attempt,
          tokensUsed: response.usage?.total_tokens || 0,
        }
      };
      
    } catch (err) {
      if (attempt === maxRetries) {
        throw err;
      }
      
      logPlanRetry(projectId, attempt + 1, `Error: ${err.message}`);
    }
  }
  
  throw new Error(`Failed to generate valid plan after ${maxRetries} attempts`);
}

/**
 * Generate a plan with automatic model selection based on feature flags
 * @param {string} userRequest
 * @param {Object} context
 * @param {Object} options
 * @returns {Promise<Object>}
 */
export async function generatePlanAuto(userRequest, context, options = {}) {
  // This uses the active model by default
  return generatePlan(userRequest, context, options);
}

export default {
  generatePlan,
  generatePlanAuto,
};

