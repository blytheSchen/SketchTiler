// server/validators.js
// Validators R1-R7 for Plan validation

/**
 * Validation result structure
 * @typedef {Object} ValidationResult
 * @property {boolean} valid - Whether validation passed
 * @property {string} [error] - Error message if validation failed
 * @property {string} validator - Name of the validator
 * @property {any} [details] - Additional details about the failure
 */

/**
 * R1: Bounds Validator
 * Ensures all coordinates (selections, positions, tiles) are within map bounds
 * @param {import('./schema.js').Plan} plan - The plan to validate
 * @returns {ValidationResult}
 */
export function validateBounds(plan) {
  const { mapMeta, selection, actions } = plan;
  const { width: mapWidth, height: mapHeight, tilesetCols, tilesetRows } = mapMeta;
  
  // Check primary selection
  if (selection.x + selection.width > mapWidth) {
    return {
      valid: false,
      error: `Primary selection exceeds map width: ${selection.x + selection.width} > ${mapWidth}`,
      validator: "R1_bounds",
      details: { selection, mapWidth, mapHeight }
    };
  }
  
  if (selection.y + selection.height > mapHeight) {
    return {
      valid: false,
      error: `Primary selection exceeds map height: ${selection.y + selection.height} > ${mapHeight}`,
      validator: "R1_bounds",
      details: { selection, mapWidth, mapHeight }
    };
  }
  
  // Check action-specific selections
  for (let i = 0; i < actions.length; i++) {
    const action = actions[i];
    const sel = action.selection || selection;
    
    if (sel.x + sel.width > mapWidth) {
      return {
        valid: false,
        error: `Action ${i} (${action.type}) selection exceeds map width`,
        validator: "R1_bounds",
        details: { actionIndex: i, action, selection: sel, mapWidth }
      };
    }
    
    if (sel.y + sel.height > mapHeight) {
      return {
        valid: false,
        error: `Action ${i} (${action.type}) selection exceeds map height`,
        validator: "R1_bounds",
        details: { actionIndex: i, action, selection: sel, mapHeight }
      };
    }
    
    // Check tile positions
    if (action.position) {
      if (action.position.x >= mapWidth || action.position.y >= mapHeight) {
        return {
          valid: false,
          error: `Action ${i} position out of bounds: (${action.position.x}, ${action.position.y})`,
          validator: "R1_bounds",
          details: { actionIndex: i, position: action.position, mapWidth, mapHeight }
        };
      }
    }
    
    // Check tile references
    if (action.tile) {
      if (action.tile.col >= tilesetCols || action.tile.row >= tilesetRows) {
        return {
          valid: false,
          error: `Action ${i} tile reference out of tileset bounds: (${action.tile.col}, ${action.tile.row})`,
          validator: "R1_bounds",
          details: { actionIndex: i, tile: action.tile, tilesetCols, tilesetRows }
        };
      }
    }
  }
  
  // Check constraints
  for (let i = 0; i < (plan.constraints || []).length; i++) {
    const constraint = plan.constraints[i];
    if (constraint.selection) {
      const sel = constraint.selection;
      if (sel.x + sel.width > mapWidth || sel.y + sel.height > mapHeight) {
        return {
          valid: false,
          error: `Constraint ${i} (${constraint.type}) selection out of bounds`,
          validator: "R1_bounds",
          details: { constraintIndex: i, constraint, selection: sel }
        };
      }
    }
    
    // Check tile references in constraints
    if (constraint.avoidTiles) {
      for (const tile of constraint.avoidTiles) {
        if (tile.col >= tilesetCols || tile.row >= tilesetRows) {
          return {
            valid: false,
            error: `Constraint ${i} avoid tile out of bounds: (${tile.col}, ${tile.row})`,
            validator: "R1_bounds",
            details: { constraintIndex: i, tile, tilesetCols, tilesetRows }
          };
        }
      }
    }
  }
  
  return { valid: true, validator: "R1_bounds" };
}

/**
 * R2: Selection Containment Validator
 * Ensures action selections are contained within the primary selection (if specified)
 * @param {import('./schema.js').Plan} plan
 * @returns {ValidationResult}
 */
export function validateSelectionContainment(plan) {
  const { selection: primarySelection, actions } = plan;
  
  for (let i = 0; i < actions.length; i++) {
    const action = actions[i];
    if (!action.selection) continue; // Uses primary selection, OK
    
    const sel = action.selection;
    
    // Check if action selection is within primary selection
    if (sel.x < primarySelection.x ||
        sel.y < primarySelection.y ||
        sel.x + sel.width > primarySelection.x + primarySelection.width ||
        sel.y + sel.height > primarySelection.y + primarySelection.height) {
      return {
        valid: false,
        error: `Action ${i} (${action.type}) selection not contained in primary selection`,
        validator: "R2_selection_containment",
        details: { 
          actionIndex: i, 
          actionSelection: sel, 
          primarySelection 
        }
      };
    }
  }
  
  return { valid: true, validator: "R2_selection_containment" };
}

/**
 * R3: Known Tile Validator
 * Ensures all tile references (col, row) are valid and known in the tileset
 * Note: This is partially covered by R1 bounds checking, but this adds semantic validation
 * @param {import('./schema.js').Plan} plan
 * @param {Object} [tilesetInfo] - Optional tileset metadata for deeper validation
 * @returns {ValidationResult}
 */
export function validateKnownTiles(plan, tilesetInfo = null) {
  const { actions, constraints, mapMeta } = plan;
  const { tilesetCols, tilesetRows } = mapMeta;
  
  // If we have tileset info with known tiles, validate against that
  const knownTiles = tilesetInfo?.knownTiles || null;
  
  // Check actions
  for (let i = 0; i < actions.length; i++) {
    const action = actions[i];
    if (action.tile) {
      const { col, row } = action.tile;
      
      // Basic bounds check (redundant with R1 but good for clarity)
      if (col < 0 || row < 0 || col >= tilesetCols || row >= tilesetRows) {
        return {
          valid: false,
          error: `Action ${i} references unknown tile (${col}, ${row})`,
          validator: "R3_known_tile",
          details: { actionIndex: i, tile: action.tile }
        };
      }
      
      // If we have known tiles list, check against it
      if (knownTiles && !knownTiles.some(t => t.col === col && t.row === row)) {
        return {
          valid: false,
          error: `Action ${i} references unregistered tile (${col}, ${row})`,
          validator: "R3_known_tile",
          details: { actionIndex: i, tile: action.tile, hint: "Tile not in legend" }
        };
      }
    }
  }
  
  // Check constraints
  for (let i = 0; i < (constraints || []).length; i++) {
    const constraint = constraints[i];
    
    if (constraint.avoidTiles) {
      for (const tile of constraint.avoidTiles) {
        if (tile.col < 0 || tile.row < 0 || 
            tile.col >= tilesetCols || tile.row >= tilesetRows) {
          return {
            valid: false,
            error: `Constraint ${i} avoid tile out of range: (${tile.col}, ${tile.row})`,
            validator: "R3_known_tile",
            details: { constraintIndex: i, tile }
          };
        }
      }
    }
  }
  
  return { valid: true, validator: "R3_known_tile" };
}

/**
 * R4: Adjacency Validator
 * Ensures adjacency constraints are well-formed and tiles are compatible
 * @param {import('./schema.js').Plan} plan
 * @param {Object} [adjacencyInfo] - Optional adjacency rules from WFC
 * @returns {ValidationResult}
 */
export function validateAdjacency(plan, adjacencyInfo = null) {
  const { constraints } = plan;
  
  for (let i = 0; i < (constraints || []).length; i++) {
    const constraint = constraints[i];
    
    if (constraint.type === "maintain_adjacency") {
      // Must have both tiles
      if (!constraint.tile1 || !constraint.tile2) {
        return {
          valid: false,
          error: `Constraint ${i} maintain_adjacency missing tile1 or tile2`,
          validator: "R4_adjacency",
          details: { constraintIndex: i, constraint }
        };
      }
      
      // If we have adjacency rules from WFC, validate compatibility
      if (adjacencyInfo) {
        const { tile1, tile2 } = constraint;
        const key = `${tile1.col},${tile1.row}-${tile2.col},${tile2.row}`;
        
        if (adjacencyInfo.incompatible && adjacencyInfo.incompatible.includes(key)) {
          return {
            valid: false,
            error: `Constraint ${i} requires incompatible adjacency`,
            validator: "R4_adjacency",
            details: { 
              constraintIndex: i, 
              tile1, 
              tile2, 
              hint: "These tiles are known to be incompatible" 
            }
          };
        }
      }
    }
  }
  
  return { valid: true, validator: "R4_adjacency" };
}

/**
 * R5: Path Continuity Validator
 * Ensures actions don't break existing path connections
 * @param {import('./schema.js').Plan} plan
 * @param {Object} [mapData] - Optional current map data to check path continuity
 * @returns {ValidationResult}
 */
export function validatePathContinuity(plan, mapData = null) {
  const { actions, constraints } = plan;
  
  // Check if there's a preserve_paths constraint
  const hasPathConstraint = (constraints || []).some(c => 
    c.type === "preserve_paths" || c.type === "keep_paths_clear"
  );
  
  if (!hasPathConstraint) {
    return { valid: true, validator: "R5_path_continuity" }; // No path constraints
  }
  
  // Check for actions that might break paths
  for (let i = 0; i < actions.length; i++) {
    const action = actions[i];
    
    // Actions that could break paths
    if (action.type === "clear_area" || 
        action.type === "add_structure" ||
        action.type === "set_tile") {
      
      // If we have map data, do deeper analysis
      if (mapData && mapData.pathTiles) {
        const sel = action.selection || plan.selection;
        
        // Check if action overlaps with path tiles
        const overlapsPath = mapData.pathTiles.some(pathTile => {
          return pathTile.x >= sel.x && 
                 pathTile.x < sel.x + sel.width &&
                 pathTile.y >= sel.y && 
                 pathTile.y < sel.y + sel.height;
        });
        
        if (overlapsPath && action.type !== "add_path") {
          // Warning but not failure - let higher level decide
          return {
            valid: false,
            error: `Action ${i} (${action.type}) may break path continuity`,
            validator: "R5_path_continuity",
            details: { 
              actionIndex: i, 
              action, 
              hint: "Action overlaps existing paths" 
            }
          };
        }
      }
    }
  }
  
  return { valid: true, validator: "R5_path_continuity" };
}

/**
 * R6: Density Target Validator
 * Ensures density modifications are feasible and constraints are satisfiable
 * @param {import('./schema.js').Plan} plan
 * @returns {ValidationResult}
 */
export function validateDensityTarget(plan) {
  const { actions, constraints, stats } = plan;
  
  // Check for conflicting density constraints
  const densityConstraints = (constraints || []).filter(c => c.type === "density_limit");
  
  for (const constraint of densityConstraints) {
    if (constraint.minDensity !== undefined && 
        constraint.maxDensity !== undefined &&
        constraint.minDensity > constraint.maxDensity) {
      return {
        valid: false,
        error: "Density constraint has minDensity > maxDensity",
        validator: "R6_density_target",
        details: { constraint }
      };
    }
  }
  
  // Check density actions against constraints
  for (let i = 0; i < actions.length; i++) {
    const action = actions[i];
    
    if (action.type === "modify_density") {
      // Ensure density change is reasonable
      if (action.densityChange !== undefined) {
        const currentDensity = stats?.density || 0.5;
        const targetDensity = Math.max(0, Math.min(1, currentDensity + action.densityChange));
        
        // Check against constraints
        for (const constraint of densityConstraints) {
          if (constraint.maxDensity !== undefined && targetDensity > constraint.maxDensity) {
            return {
              valid: false,
              error: `Action ${i} density target (${targetDensity.toFixed(2)}) exceeds max (${constraint.maxDensity})`,
              validator: "R6_density_target",
              details: { actionIndex: i, targetDensity, constraint }
            };
          }
          
          if (constraint.minDensity !== undefined && targetDensity < constraint.minDensity) {
            return {
              valid: false,
              error: `Action ${i} density target (${targetDensity.toFixed(2)}) below min (${constraint.minDensity})`,
              validator: "R6_density_target",
              details: { actionIndex: i, targetDensity, constraint }
            };
          }
        }
      }
    }
  }
  
  return { valid: true, validator: "R6_density_target" };
}

/**
 * R7: Change Budget Validator
 * Ensures the plan respects maximum change limits
 * @param {import('./schema.js').Plan} plan
 * @returns {ValidationResult}
 */
export function validateChangeBudget(plan) {
  const { actions, constraints } = plan;
  
  // Find change budget constraints
  const budgetConstraints = (constraints || []).filter(c => c.type === "change_budget");
  
  if (budgetConstraints.length === 0) {
    return { valid: true, validator: "R7_change_budget" }; // No budget constraints
  }
  
  // Estimate total changes from actions
  let estimatedChanges = 0;
  
  for (const action of actions) {
    const sel = action.selection || plan.selection;
    const areaSize = sel.width * sel.height;
    
    switch (action.type) {
      case "set_tile":
        estimatedChanges += 1;
        break;
      case "clear_area":
      case "fill_pattern":
        estimatedChanges += areaSize;
        break;
      case "add_structure":
        // Estimate based on structure size
        const avgSize = ((action.minSize || 3) + (action.maxSize || 5)) / 2;
        const count = action.count || 1;
        estimatedChanges += avgSize * avgSize * count;
        break;
      case "add_path":
        // Estimate ~50% of area for paths
        estimatedChanges += Math.floor(areaSize * 0.5);
        break;
      case "modify_density":
        // Estimate based on density change
        const densityChange = Math.abs(action.densityChange || 0.2);
        estimatedChanges += Math.floor(areaSize * densityChange);
        break;
      default:
        // Conservative estimate
        estimatedChanges += Math.floor(areaSize * 0.3);
    }
  }
  
  // Check against constraints
  for (const constraint of budgetConstraints) {
    if (constraint.maxChanges !== undefined && estimatedChanges > constraint.maxChanges) {
      return {
        valid: false,
        error: `Estimated changes (${estimatedChanges}) exceed budget (${constraint.maxChanges})`,
        validator: "R7_change_budget",
        details: { 
          estimatedChanges, 
          maxChanges: constraint.maxChanges,
          hint: "Consider reducing action scope or count"
        }
      };
    }
  }
  
  return { valid: true, validator: "R7_change_budget" };
}

/**
 * Run all validators on a plan
 * @param {import('./schema.js').Plan} plan
 * @param {Object} [context] - Optional context (mapData, tilesetInfo, adjacencyInfo)
 * @returns {ValidationResult[]} Array of validation results (all or just failures based on options)
 */
export function validateAll(plan, context = {}) {
  const validators = [
    () => validateBounds(plan),
    () => validateSelectionContainment(plan),
    () => validateKnownTiles(plan, context.tilesetInfo),
    () => validateAdjacency(plan, context.adjacencyInfo),
    () => validatePathContinuity(plan, context.mapData),
    () => validateDensityTarget(plan),
    () => validateChangeBudget(plan),
  ];
  
  const results = validators.map(validator => validator());
  return results;
}

/**
 * Run all validators and return only failures
 * @param {import('./schema.js').Plan} plan
 * @param {Object} [context] - Optional context
 * @returns {ValidationResult[]} Array of failed validations
 */
export function validateAllFailuresOnly(plan, context = {}) {
  const results = validateAll(plan, context);
  return results.filter(r => !r.valid);
}

/**
 * Check if plan passes all validations
 * @param {import('./schema.js').Plan} plan
 * @param {Object} [context] - Optional context
 * @returns {boolean} True if all validations pass
 */
export function isValid(plan, context = {}) {
  const failures = validateAllFailuresOnly(plan, context);
  return failures.length === 0;
}

