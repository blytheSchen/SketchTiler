// server/schema.js
// Plan JSON Schema v2.1 with Zod validation

import { z } from "zod";

/**
 * Selection region schema - defines the bounding box where actions should be applied
 */
export const SelectionSchema = z.object({
  x: z.number().int().min(0).describe("Top-left X coordinate of selection"),
  y: z.number().int().min(0).describe("Top-left Y coordinate of selection"),
  width: z.number().int().min(1).describe("Width of selection in tiles"),
  height: z.number().int().min(1).describe("Height of selection in tiles"),
});

/**
 * Tile coordinate schema
 */
export const TileCoordSchema = z.object({
  x: z.number().int().min(0),
  y: z.number().int().min(0),
});

/**
 * Tile reference schema (col, row in tileset atlas)
 */
export const TileRefSchema = z.object({
  col: z.number().int().min(0).describe("Column in tileset atlas (0-based)"),
  row: z.number().int().min(0).describe("Row in tileset atlas (0-based)"),
});

/**
 * Action types enum
 */
export const ActionTypeEnum = z.enum([
  "add_structure",      // Add houses, trees, etc.
  "remove_structure",   // Remove existing structures
  "add_path",          // Add path tiles
  "modify_density",    // Increase/decrease density of features
  "preserve_area",     // Keep area unchanged
  "clear_area",        // Clear tiles in area
  "set_tile",          // Set specific tile at position
  "fill_pattern",      // Fill area with WFC pattern
]);

/**
 * Structure type enum
 */
export const StructureTypeEnum = z.enum([
  "house",
  "tree",
  "forest",
  "path",
  "fence",
  "water",
  "grass",
  "road",
]);

/**
 * Density level enum
 */
export const DensityEnum = z.enum(["sparse", "medium", "dense", "very_dense"]);

/**
 * Individual action schema
 */
export const ActionSchema = z.object({
  type: ActionTypeEnum.describe("Type of action to perform"),
  selection: SelectionSchema.optional().describe("Region to apply action (if not specified, uses plan-level selection)"),
  
  // Structure-specific fields
  structureType: StructureTypeEnum.optional().describe("Type of structure for add/remove actions"),
  count: z.number().int().min(1).optional().describe("Number of structures to add"),
  minSize: z.number().int().min(1).optional().describe("Minimum structure size"),
  maxSize: z.number().int().min(1).optional().describe("Maximum structure size"),
  
  // Density fields
  density: DensityEnum.optional().describe("Target density level"),
  densityChange: z.number().min(-1).max(1).optional().describe("Relative density change (-1 to 1)"),
  
  // Tile-specific fields
  position: TileCoordSchema.optional().describe("Position for set_tile action"),
  tile: TileRefSchema.optional().describe("Tile to place for set_tile action"),
  
  // Pattern fields
  patternSource: z.string().optional().describe("Source pattern for fill_pattern (e.g., 'forest1', 'house2')"),
  
  // Priority
  priority: z.number().int().min(0).max(100).default(50).describe("Action priority (higher = applied first)"),
}).refine(
  (data) => {
    // Validate that required fields are present based on action type
    if (data.type === "add_structure" || data.type === "remove_structure") {
      return !!data.structureType;
    }
    if (data.type === "set_tile") {
      return !!data.position && !!data.tile;
    }
    if (data.type === "modify_density") {
      return !!(data.density || data.densityChange !== undefined);
    }
    if (data.type === "fill_pattern") {
      return !!data.patternSource;
    }
    return true;
  },
  {
    message: "Action missing required fields for its type",
  }
);

/**
 * Constraint schema - design rules that must be satisfied
 */
export const ConstraintSchema = z.object({
  type: z.enum([
    "keep_paths_clear",      // Don't block existing paths
    "avoid_tile_type",       // Avoid placing certain tiles
    "maintain_adjacency",    // Keep certain tiles adjacent
    "preserve_paths",        // Don't modify path continuity
    "density_limit",         // Max/min density in region
    "change_budget",         // Max number of tiles to change
    "avoid_water",           // Don't place structures in water
    "avoid_cliffs",          // Don't place structures on cliffs
    "minimum_spacing",       // Minimum distance between structures
  ]).describe("Type of constraint"),
  
  selection: SelectionSchema.optional().describe("Region where constraint applies"),
  
  // Tile avoidance
  avoidTiles: z.array(TileRefSchema).optional().describe("Tiles to avoid"),
  
  // Adjacency
  tile1: TileRefSchema.optional().describe("First tile in adjacency rule"),
  tile2: TileRefSchema.optional().describe("Second tile in adjacency rule"),
  
  // Density limits
  maxDensity: z.number().min(0).max(1).optional().describe("Maximum density (0-1)"),
  minDensity: z.number().min(0).max(1).optional().describe("Minimum density (0-1)"),
  
  // Change budget
  maxChanges: z.number().int().min(0).optional().describe("Maximum number of tiles to change"),
  
  // Spacing
  minSpacing: z.number().int().min(1).optional().describe("Minimum spacing in tiles"),
  
  // Priority
  priority: z.number().int().min(0).max(100).default(50).describe("Constraint priority"),
});

/**
 * Map metadata schema
 */
export const MapMetaSchema = z.object({
  width: z.number().int().min(1).describe("Total map width in tiles"),
  height: z.number().int().min(1).describe("Total map height in tiles"),
  tilesetCols: z.number().int().min(1).default(12).describe("Tileset columns"),
  tilesetRows: z.number().int().min(1).default(11).describe("Tileset rows"),
});

/**
 * Statistics schema - provides context about current selection
 */
export const StatsSchema = z.object({
  totalTiles: z.number().int().min(0).describe("Total tiles in selection"),
  emptyTiles: z.number().int().min(0).optional().describe("Number of empty tiles"),
  pathTiles: z.number().int().min(0).optional().describe("Number of path tiles"),
  structureCount: z.number().int().min(0).optional().describe("Number of structures"),
  density: z.number().min(0).max(1).optional().describe("Current density (0-1)"),
});

/**
 * Complete Plan JSON Schema v2.1
 */
export const PlanSchema = z.object({
  version: z.literal("2.1").default("2.1").describe("Schema version"),
  
  // User intent
  intent: z.string().min(1).max(500).describe("Natural language description of what user wants"),
  
  // Primary selection region (can be overridden per action)
  selection: SelectionSchema.describe("Primary selection region"),
  
  // Context
  mapMeta: MapMetaSchema.describe("Map dimensions and tileset info"),
  stats: StatsSchema.optional().describe("Current selection statistics"),
  
  // Actions to perform
  actions: z.array(ActionSchema).min(1).max(20).describe("List of actions to perform"),
  
  // Constraints to satisfy
  constraints: z.array(ConstraintSchema).max(10).default([]).describe("Design constraints to enforce"),
  
  // Metadata
  confidence: z.number().min(0).max(1).optional().describe("Model confidence in plan (0-1)"),
  reasoning: z.string().max(1000).optional().describe("Brief explanation of plan"),
});

/**
 * Type exports for TypeScript/JSDoc
 */
export const PlanSchemaType = PlanSchema;

// Export types for JSDoc
/**
 * @typedef {z.infer<typeof PlanSchema>} Plan
 * @typedef {z.infer<typeof ActionSchema>} Action
 * @typedef {z.infer<typeof ConstraintSchema>} Constraint
 * @typedef {z.infer<typeof SelectionSchema>} Selection
 * @typedef {z.infer<typeof MapMetaSchema>} MapMeta
 * @typedef {z.infer<typeof StatsSchema>} Stats
 * @typedef {z.infer<typeof TileRefSchema>} TileRef
 * @typedef {z.infer<typeof TileCoordSchema>} TileCoord
 */

/**
 * Validates a plan object against the schema
 * @param {any} data - The data to validate
 * @returns {{ success: true, data: Plan } | { success: false, error: z.ZodError }} Validation result
 */
export function validatePlan(data) {
  const result = PlanSchema.safeParse(data);
  return result;
}

/**
 * Validates and throws on error
 * @param {any} data - The data to validate
 * @returns {Plan} The validated plan
 * @throws {z.ZodError} If validation fails
 */
export function validatePlanStrict(data) {
  return PlanSchema.parse(data);
}

