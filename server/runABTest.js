#!/usr/bin/env node
// server/runABTest.js
// Command-line script to run A/B tests

import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env from server directory
dotenv.config({ path: path.join(__dirname, '.env') });

import { runABTest, printABTestSummary } from "./abTest.js";
const TEST_REQUESTS_FILE = path.join(__dirname, "data", "ab_test", "test_requests.json");

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    ftModel: null,
    requestsFile: TEST_REQUESTS_FILE,
    numRequests: 50,
    verbose: true,
    saveResults: true,
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === "--model" || arg === "-m") {
      options.ftModel = args[++i];
    } else if (arg === "--file" || arg === "-f") {
      options.requestsFile = args[++i];
    } else if (arg === "--num" || arg === "-n") {
      options.numRequests = parseInt(args[++i]);
    } else if (arg === "--quiet" || arg === "-q") {
      options.verbose = false;
    } else if (arg === "--no-save") {
      options.saveResults = false;
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }
  }
  
  return options;
}

/**
 * Print help message
 */
function printHelp() {
  console.log(`
A/B Test Runner - Compare base model vs fine-tuned model

Usage:
  node runABTest.js --model <ft-model-name> [options]

Options:
  -m, --model <name>      Fine-tuned model name (required, e.g., "ft-v1")
  -f, --file <path>       Path to test requests JSON file
                          (default: server/data/ab_test/test_requests.json)
  -n, --num <number>      Number of test requests to use (default: 50)
  -q, --quiet             Suppress verbose output
  --no-save               Don't save results to file
  -h, --help              Show this help message

Examples:
  # Run A/B test with ft-v1 model on 50 requests
  node runABTest.js --model ft-v1

  # Run with custom test file and 30 requests
  node runABTest.js --model ft-v2 --file ./my_tests.json --num 30

  # Run quietly without saving results
  node runABTest.js --model ft-v1 --quiet --no-save

Acceptance Criteria:
  - Schema Valid Rate: ≥ 90%
  - Validator Pass Rate: > 80%

The test will automatically determine if the fine-tuned model meets
the acceptance criteria and print ACCEPTED or REJECTED.
`);
}

/**
 * Load test requests from file
 */
function loadTestRequests(filePath, numRequests) {
  if (!fs.existsSync(filePath)) {
    console.error(`Error: Test requests file not found: ${filePath}`);
    process.exit(1);
  }
  
  try {
    const content = fs.readFileSync(filePath, "utf8");
    const allRequests = JSON.parse(content);
    
    if (!Array.isArray(allRequests)) {
      console.error("Error: Test requests file must contain a JSON array");
      process.exit(1);
    }
    
    // Take only the requested number of requests
    const requests = allRequests.slice(0, numRequests);
    
    if (requests.length < numRequests) {
      console.warn(`Warning: Only ${requests.length} requests available (requested ${numRequests})`);
    }
    
    return requests;
    
  } catch (err) {
    console.error(`Error loading test requests: ${err.message}`);
    process.exit(1);
  }
}

/**
 * Main function
 */
async function main() {
  const options = parseArgs();
  
  // Validate required options
  if (!options.ftModel) {
    console.error("Error: Fine-tuned model name is required");
    console.error("Use --model <name> or -m <name>");
    console.error("Run with --help for more information");
    process.exit(1);
  }
  
  // Load test requests
  const testRequests = loadTestRequests(options.requestsFile, options.numRequests);
  
  console.log(`Loaded ${testRequests.length} test requests from ${options.requestsFile}`);
  
  // Run A/B test
  try {
    const results = await runABTest(options.ftModel, testRequests, {
      saveResults: options.saveResults,
      verbose: options.verbose,
    });
    
    // Print summary
    printABTestSummary(results);
    
    // Exit with appropriate code
    process.exit(results.acceptance.accepted ? 0 : 1);
    
  } catch (err) {
    console.error(`\nError running A/B test: ${err.message}`);
    console.error(err.stack);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default main;

