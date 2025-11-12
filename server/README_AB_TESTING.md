
### Complete Workflow

```bash
# 1. Navigate to the server directory
cd server

# 2. Install dependencies
npm install

# 3. Configure environment variables
# Edit the server/.env file and add your OpenAI API Key
# OPENAI_API_KEY=sk-proj-...

# 4. Register the fine-tuned model in the system
node registerModel.js

# This will prompt you to input:
# - Model alias (e.g., ft-v1)
# - OpenAI model ID (e.g., ft:gpt-4.1-2025-04-14:ucsc-sketchtiler:try-1-sketchtiler:CYyoTwVJ)
# - Model description (e.g., First fine-tuned model on 400 training samples)

# 5. Run A/B testing
node runABTest.js --model ft-v1 --num 10

# 6. View test results
# Results are saved in server/data/ab_test/results/ab_test_<timestamp>.json
```

### Detailed Instructions for Model Registration

Before running A/B testing, you must register the fine-tuned model:

```bash
node registerModel.js
```

**Interactive Input Example:**
```
Enter model alias (e.g., ft-v1): ft-v1
Enter OpenAI model ID: ft:gpt-4.1-2025-04-14:ucsc-sketchtiler:try-1-sketchtiler:CYyoTwVJ
Enter model description: First fine-tuned model on 400 training samples
```

This will save the model information to `server/data/fine_tuning/state.json`:

```json
{
  "models": {
    "ft-v1": {
      "alias": "ft-v1",
      "openaiModelId": "ft:gpt-4.1-2025-04-14:ucsc-sketchtiler:try-1-sketchtiler:CYyoTwVJ",
      "description": "First fine-tuned model on 400 training samples",
      "createdAt": "2025-11-12T10:30:00.000Z",
      "isActive": true
    }
  },
  "activeModel": "ft-v1"
}
```

### Test Options

```bash
# Test 3 requests (quick validation)
node runABTest.js --model ft-v1 --num 3

# Test all 50 requests (full evaluation)
node runABTest.js --model ft-v1 --num 50
```

**Parameter Explanation:**
- `--model <alias>`: Alias of the fine-tuned model (set during registerModel)
- `--num <count>`: Number of requests to test (1-50)

## Testing Methodology

### 1. Test Data

Test data is located in `server/data/ab_test/test_requests.json`, containing 50 test requests. Each request includes:

```json
{
  "request": "add more trees to the selected area",
  "selection": {
    "x": 5,
    "y": 5,
    "width": 10,
    "height": 10
  },
  "mapMeta": {
    "width": 25,
    "height": 25,
    "tilesetCols": 12,
    "tilesetRows": 11
  },
  "stats": {
    "totalTiles": 100,
    "emptyTiles": 60,
    "density": 0.4
  }
}
```

### 2. Evaluation Metrics

The output of each model undergoes two layers of validation:

#### Schema Validation
Uses the Zod library to validate JSON structure, data types, and required fields against the schema definition.

#### Validator Validation
Runs 7 semantic validators to check business logic:
- **R1_bounds**: Coordinates do not exceed map boundaries
- **R2_selection_containment**: Action area is within the selection
- **R3_known_tiles**: Tile IDs exist in the tileset
- **R4_adjacency**: Path tiles are adjacent to existing paths
- **R5_path_continuity**: Path modifications maintain continuity
- **R6_density_target**: Density changes meet the target
- **R7_change_budget**: Tile changes are within the budget

### 3. Acceptance Criteria

- **Schema Valid Rate ≥ 90%**
- **Validator Pass Rate > 80%**

### 4. Test Result Output

After testing, results are saved in:
```
server/data/ab_test/results/ab_test_<timestamp>.json
```

The console will display a detailed comparison report, including:
- Schema validation rate for each model
- Validator pass rate for each model
- Average response time
- Average token usage
- Whether acceptance criteria are met

## Training Data Format Issues

### Problem Discovery

During A/B testing, it was found that the format of the training data is **completely inconsistent** with the production schema (`server/schema.js`).

### Format Differences Comparison

| Item | Production Schema (schema.js) | Training Data Format |
|------|-------------------------------|----------------------|
| **Version Field** | `version: "2.1"` | `schema_version: "2.1"` |
| **Selection Field** | Required | ❌ Missing |
| **MapMeta Field** | Required | ❌ Missing |
| **Reasoning Field** | `reasoning: string` | `rationale: [string]` |
| **Validation Expectations** | Not Present | `validation_expectations: [string]` |
| **Action Type Field** | `type: "add_structure"` | `op: "place_tiles"` |
| **Action Type Values** | `add_structure`, `remove_structure`, ... | `place_tiles`, `remove_tiles`, `replace_tiles` |
| **Action Structure** | `structureType`, `position`, `tile` | `layer`, `tiles: [{id, x, y}]` |

### Training Data Example

```json
{
  "schema_version": "2.1",
  "intent": "respect_paths",
  "rationale": [
    "Preserve and restore visible paths"
  ],
  "actions": [
    {
      "op": "remove_tiles",
      "layer": "objects",
      "tiles": [
        {"id": "tree_oak_small", "x": 12, "y": 40},
        {"id": "tree_oak_small", "x": 13, "y": 41}
      ]
    },
    {
      "op": "place_tiles",
      "layer": "ground",
      "tiles": [
        {"id": "path_gravel", "x": 12, "y": 40},
        {"id": "path_gravel", "x": 13, "y": 41}
      ],
      "constraints": {
        "avoid_overlap": true,
        "respect_ruleset": true
      }
    }
  ],
  "validation_expectations": [
    "Schema valid",
    "No overlaps"
  ]
}
```

**Key Differences:**
- ❌ Missing `selection` field
- ❌ Missing `mapMeta` field
- ✅ Uses `schema_version` instead of `version`
- ✅ Uses `rationale` array instead of `reasoning` string
- ✅ Uses `op` instead of `type`
- ✅ Uses `layer` + `tiles` array structure

### Solution

A dedicated training data schema was created: `server/schema-training.js`

```javascript
export const TrainingPlanSchema = z.object({
  schema_version: z.literal("2.1"),
  intent: z.string(),
  rationale: z.array(z.string()),
  actions: z.array(TrainingActionSchema),
  validation_expectations: z.array(z.string()).optional(),
}).passthrough();

export const TrainingActionSchema = z.object({
  op: z.enum(["place_tiles", "remove_tiles", "replace_tiles"]),
  layer: z.enum(["ground", "objects", "decoration", "overlay"]),
  tiles: z.array(TrainingTileSchema),
  constraints: z.object({
    avoid_overlap: z.boolean().optional(),
    respect_ruleset: z.boolean().optional(),
  }).passthrough().optional(),
}).passthrough();
```

### Validation Logic Adjustment

In `server/abTest.js`, different schemas are selected based on the model type:

```javascript
// Fine-tuned models use the training schema
if (modelName !== "base" || isTrainingFormat(planData)) {
  schemaResult = validateTrainingPlan(planData);
  
  // Add mapMeta and selection for validator checks
  if (schemaValid) {
    validatedPlan.mapMeta = testRequest.mapMeta;
    validatedPlan.selection = testRequest.selection;
  }
} else {
  // Base models use the production schema
  schemaResult = validatePlan(planData);
}
```

## Test Results

### Typical Test Results (10 Requests)

```
BASE MODEL:
  Schema Valid:     8/10 (80.00%)
  Validator Pass:   9/10 (90.00%)
  Total Success:    7/10 (70.00%)
  Avg Duration:     5926ms
  Avg Tokens:       748

FINE-TUNED MODEL (ft-v1):
  Schema Valid:     6/10 (60.00%)
  Validator Pass:   10/10 (100.00%)
  Total Success:    6/10 (60.00%)
  Avg Duration:     4500ms
  Avg Tokens:       194

COMPARISON (FT vs Base):
  Schema Valid:     -20.00%
  Validator Pass:   +10.00%
  Speed:            +24.06%
```

### Result Analysis

#### ✅ Advantages of Fine-Tuned Model

1. **100% Validator Pass Rate** - The generated plan is completely correct in terms of business logic:
   - All coordinates are within map boundaries
   - All tile IDs are valid
   - Path continuity is maintained
   - Density and change budget are met

#### ⚠️ Issues with Fine-Tuned Model

**Schema Validation Rate is only 60%**, mainly due to:
1. **Abbreviated Operation Types** - Sometimes outputs `place` instead of `place_tiles`
   ```json
   // Expected: "op": "place_tiles"
   // Actual: "op": "place"
   ```

2. **New Words** - Occasionally uses values not present in the training data
   ```json
   // Expected: "layer": "objects"
   // Actual: "layer": "structures"
   ```

3. **Missing Required Fields** - Occasionally omits the `op` field
   ```json
   {
     "layer": "objects",  // Missing "op" field
     "tiles": [...]
   }
   ```

### Why Does the Validator Perform Well but the Schema Perform Poorly?

This is an interesting phenomenon:

- **Schema Validation** checks **format strictness** (field names, enum values, data types)
- **Validator Validation** checks **semantic correctness** (coordinates, logic, business rules)

The fine-tuned model has learned to:
- ✅ Generate reasonable coordinates (no out-of-bounds errors)
- ✅ Use correct tile IDs
- ✅ Maintain path continuity
- ✅ Control density and change amounts

But sometimes:
- ❌ Uses abbreviations or variants (`place` vs `place_tiles`)
- ❌ Creates new enum values (`structures` vs `objects`)
- ❌ Omits certain fields

**Conclusion**: The fine-tuned model excels in **understanding the task essence** but needs improvement in **adhering to format specifications**.

## File Descriptions

### Core Files

- `server/abTest.js` - Core logic of the A/B testing framework
- `server/runABTest.js` - Command-line tool to run A/B tests
- `server/schema.js` - Production schema definition
- `server/schema-training.js` - Training data schema definition (temporary solution)
- `server/validators.js` - 7 semantic validators
- `server/fineTuning.js` - Fine-tuning task management
- `server/registerModel.js` - Model registration tool

### Data Files

- `server/data/fine_tuning/train.jsonl` - Training data (400 samples)
- `server/data/fine_tuning/val.jsonl` - Validation data
- `server/data/ab_test/test_requests.json` - A/B test requests
- `server/data/ab_test/results/` - Test results directory

## Troubleshooting

## Summary

The A/B testing framework has been successfully implemented and can compare the performance of the base model and fine-tuned models. Test results show:

- ✅ Fine-tuned models perform excellently in **business logic correctness** (100% validator pass)
- ⚠️ Fine-tuned models need improvement in **format compliance** (60% schema valid)
- ⚠️ Training data format is inconsistent with the production schema, requiring a long-term solution

