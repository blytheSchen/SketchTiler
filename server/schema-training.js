// server/schema-training.js
// Training Data Schema - matches the format used in fine_tuning/train.jsonl
// This is separate from the production schema (schema.js)

import { z } from "zod";

/**
 * Tile in training data format
 * Each tile has an id (string) and x, y coordinates
 */
export const TrainingTileSchema = z.object({
  id: z.string().min(1).describe("Tile identifier (e.g., 'tree_oak_small', 'path_gravel')"),
  x: z.number().int().min(0).describe("X coordinate on map"),
  y: z.number().int().min(0).describe("Y coordinate on map"),
});

/**
 * Layer enum - training data uses layer field
 */
export const LayerEnum = z.enum([
  "ground",
  "objects",
  "decoration",
  "overlay",
]);

/**
 * Operation types used in training data
 */
export const TrainingOpEnum = z.enum([
  "place_tiles",
  "remove_tiles",
  "replace_tiles",
]);

/**
 * Constraint in action (training data has constraints as an object with boolean flags)
 * Format: { avoid_overlap?: boolean, respect_ruleset?: boolean, ... }
 */
export const TrainingActionConstraintSchema = z.object({
  avoid_overlap: z.boolean().optional().describe("Avoid overlapping tiles"),
  respect_ruleset: z.boolean().optional().describe("Respect design rules"),
}).passthrough();

/**
 * Action schema for training data
 * Format: { op, layer, tiles, constraints? }
 */
export const TrainingActionSchema = z.object({
  op: TrainingOpEnum.describe("Operation type"),
  layer: LayerEnum.describe("Which layer to operate on"),
  tiles: z.array(TrainingTileSchema).min(1).describe("Tiles to place/remove/replace"),
  constraints: TrainingActionConstraintSchema.optional().describe("Action-level constraints (object with boolean flags)"),
}).passthrough();

/**
 * Complete Training Plan Schema
 * Format matches train.jsonl exactly:
 * {
 *   schema_version: "2.1",
 *   intent: string,
 *   rationale: [string],
 *   actions: [{ op, layer, tiles }],
 *   validation_expectations: [string]
 * }
 */
export const TrainingPlanSchema = z.object({
  schema_version: z.literal("2.1").describe("Schema version (training data uses 'schema_version' not 'version')"),
  intent: z.string().min(1).max(500).describe("Natural language description of what user wants"),
  rationale: z.array(z.string()).min(1).describe("Array of reasoning strings explaining the plan"),
  actions: z.array(TrainingActionSchema).min(1).max(20).describe("List of actions to perform"),
  validation_expectations: z.array(z.string()).optional().describe("Expected validation results"),
}).passthrough();

/**
 * Type exports for TypeScript/JSDoc
 */
export const TrainingPlanSchemaType = TrainingPlanSchema;

// Export types for JSDoc
/**
 * @typedef {z.infer<typeof TrainingPlanSchema>} TrainingPlan
 * @typedef {z.infer<typeof TrainingActionSchema>} TrainingAction
 * @typedef {z.infer<typeof TrainingTileSchema>} TrainingTile
 */

/**
 * Validates a plan object against the training schema
 * @param {any} data - The data to validate
 * @returns {{ success: true, data: TrainingPlan } | { success: false, error: z.ZodError }} Validation result
 */
export function validateTrainingPlan(data) {
  const result = TrainingPlanSchema.safeParse(data);
  return result;
}

/**
 * Validates and throws on error
 * @param {any} data - The data to validate
 * @returns {TrainingPlan} The validated plan
 * @throws {z.ZodError} If validation fails
 */
export function validateTrainingPlanStrict(data) {
  return TrainingPlanSchema.parse(data);
}

/**
 * Check if a plan object looks like training data format
 * @param {any} data - The data to check
 * @returns {boolean} True if it looks like training data format
 */
export function isTrainingFormat(data) {
  if (!data || typeof data !== 'object') return false;
  
  // Training format has schema_version (not version) and rationale (not reasoning)
  const hasSchemaVersion = 'schema_version' in data;
  const hasRationale = 'rationale' in data && Array.isArray(data.rationale);
  const hasOp = data.actions && data.actions.length > 0 && 'op' in data.actions[0];
  
  return hasSchemaVersion || hasRationale || hasOp;
}

