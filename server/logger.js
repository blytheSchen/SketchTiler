// server/logger.js
// Structured logging for plan validation and execution

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_DIR = path.join(__dirname, "data", "logs");

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

/**
 * Log levels
 */
export const LogLevel = {
  DEBUG: "DEBUG",
  INFO: "INFO",
  WARN: "WARN",
  ERROR: "ERROR",
};

/**
 * Log entry structure
 * @typedef {Object} LogEntry
 * @property {string} timestamp - ISO timestamp
 * @property {string} level - Log level
 * @property {string} category - Log category (plan_validation, plan_execution, etc.)
 * @property {string} message - Log message
 * @property {Object} [data] - Additional structured data
 */

/**
 * Base logger function
 * @param {string} level - Log level
 * @param {string} category - Category
 * @param {string} message - Message
 * @param {Object} [data] - Additional data
 */
function log(level, category, message, data = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    category,
    message,
    ...data,
  };
  
  // Console output
  const color = {
    DEBUG: "\x1b[36m", // cyan
    INFO: "\x1b[32m",  // green
    WARN: "\x1b[33m",  // yellow
    ERROR: "\x1b[31m", // red
  }[level] || "";
  const reset = "\x1b[0m";
  
  console.log(`${color}[${entry.timestamp}] ${level} [${category}]${reset} ${message}`);
  if (Object.keys(data).length > 0) {
    console.log("  Data:", JSON.stringify(data, null, 2));
  }
  
  // File output - append to daily log file
  const date = entry.timestamp.split("T")[0];
  const logFile = path.join(LOG_DIR, `${date}.jsonl`);
  
  try {
    fs.appendFileSync(logFile, JSON.stringify(entry) + "\n");
  } catch (err) {
    console.error("Failed to write log:", err);
  }
}

/**
 * Log invalid plan
 * @param {string} projectId
 * @param {Object} rawInput - The raw input that failed validation
 * @param {Array} validationErrors - Array of validation errors
 * @param {Object} [meta] - Additional metadata
 */
export function logInvalidPlan(projectId, rawInput, validationErrors, meta = {}) {
  log(LogLevel.ERROR, "plan_validation", "Plan validation failed", {
    projectId,
    errorCount: validationErrors.length,
    errors: validationErrors.map(e => ({
      validator: e.validator,
      error: e.error,
      details: e.details,
    })),
    inputIntent: rawInput?.intent || "(no intent)",
    model: meta.model || "unknown",
    attemptNumber: meta.attemptNumber || 1,
  });
}

/**
 * Log valid plan
 * @param {string} projectId
 * @param {Object} plan - The validated plan
 * @param {Object} [meta] - Additional metadata
 */
export function logValidPlan(projectId, plan, meta = {}) {
  log(LogLevel.INFO, "plan_validation", "Plan validation passed", {
    projectId,
    intent: plan.intent,
    actionCount: plan.actions.length,
    constraintCount: plan.constraints?.length || 0,
    confidence: plan.confidence,
    model: meta.model || "unknown",
    attemptNumber: meta.attemptNumber || 1,
  });
}

/**
 * Log plan retry attempt
 * @param {string} projectId
 * @param {number} attemptNumber
 * @param {string} reason - Reason for retry
 * @param {Object} [data] - Additional data
 */
export function logPlanRetry(projectId, attemptNumber, reason, data = {}) {
  log(LogLevel.WARN, "plan_retry", `Retrying plan generation (attempt ${attemptNumber})`, {
    projectId,
    attemptNumber,
    reason,
    ...data,
  });
}

/**
 * Log plan execution start
 * @param {string} projectId
 * @param {Object} plan
 * @param {Object} [meta]
 */
export function logPlanExecutionStart(projectId, plan, meta = {}) {
  log(LogLevel.INFO, "plan_execution", "Starting plan execution", {
    projectId,
    intent: plan.intent,
    actionCount: plan.actions.length,
    ...meta,
  });
}

/**
 * Log plan execution success
 * @param {string} projectId
 * @param {Object} result - Execution result
 * @param {number} durationMs - Execution duration in ms
 */
export function logPlanExecutionSuccess(projectId, result, durationMs) {
  log(LogLevel.INFO, "plan_execution", "Plan execution succeeded", {
    projectId,
    tilesChanged: result.tilesChanged || 0,
    actionsExecuted: result.actionsExecuted || 0,
    durationMs,
  });
}

/**
 * Log plan execution failure
 * @param {string} projectId
 * @param {Error} error
 * @param {Object} [context]
 */
export function logPlanExecutionFailure(projectId, error, context = {}) {
  log(LogLevel.ERROR, "plan_execution", "Plan execution failed", {
    projectId,
    error: error.message,
    stack: error.stack,
    ...context,
  });
}

/**
 * Log API call metrics
 * @param {string} endpoint - API endpoint
 * @param {number} durationMs - Request duration
 * @param {number} statusCode - Response status code
 * @param {Object} [meta] - Additional metadata
 */
export function logApiCall(endpoint, durationMs, statusCode, meta = {}) {
  const level = statusCode >= 500 ? LogLevel.ERROR : 
                statusCode >= 400 ? LogLevel.WARN : 
                LogLevel.INFO;
  
  log(level, "api_call", `${endpoint} - ${statusCode}`, {
    endpoint,
    durationMs,
    statusCode,
    ...meta,
  });
}

/**
 * Log fine-tuning job event
 * @param {string} projectId
 * @param {string} jobId
 * @param {string} status
 * @param {Object} [data]
 */
export function logFineTuningJob(projectId, jobId, status, data = {}) {
  log(LogLevel.INFO, "fine_tuning", `Job ${jobId}: ${status}`, {
    projectId,
    jobId,
    status,
    ...data,
  });
}

/**
 * Log model selection
 * @param {string} projectId
 * @param {string} selectedModel
 * @param {string} reason
 */
export function logModelSelection(projectId, selectedModel, reason) {
  log(LogLevel.INFO, "model_selection", `Selected model: ${selectedModel}`, {
    projectId,
    model: selectedModel,
    reason,
  });
}

/**
 * Get recent logs by category
 * @param {string} category - Category to filter by
 * @param {number} [limit=100] - Max number of entries to return
 * @returns {Array<LogEntry>} Array of log entries
 */
export function getRecentLogs(category, limit = 100) {
  const logs = [];
  const files = fs.readdirSync(LOG_DIR).filter(f => f.endsWith(".jsonl")).sort().reverse();
  
  for (const file of files) {
    if (logs.length >= limit) break;
    
    const content = fs.readFileSync(path.join(LOG_DIR, file), "utf8");
    const lines = content.trim().split("\n").reverse();
    
    for (const line of lines) {
      if (logs.length >= limit) break;
      
      try {
        const entry = JSON.parse(line);
        if (entry.category === category) {
          logs.push(entry);
        }
      } catch (err) {
        // Skip malformed lines
      }
    }
  }
  
  return logs;
}

/**
 * Get validation failure statistics
 * @param {number} [days=7] - Number of days to analyze
 * @returns {Object} Statistics object
 */
export function getValidationStats(days = 7) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().split("T")[0];
  
  const files = fs.readdirSync(LOG_DIR)
    .filter(f => f.endsWith(".jsonl") && f.replace(".jsonl", "") >= cutoffStr)
    .sort();
  
  const stats = {
    totalAttempts: 0,
    validPlans: 0,
    invalidPlans: 0,
    failuresByValidator: {},
    failuresByModel: {},
  };
  
  for (const file of files) {
    const content = fs.readFileSync(path.join(LOG_DIR, file), "utf8");
    const lines = content.trim().split("\n");
    
    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        
        if (entry.category === "plan_validation") {
          stats.totalAttempts++;
          
          if (entry.message.includes("failed")) {
            stats.invalidPlans++;
            
            // Count by validator
            if (entry.errors) {
              for (const err of entry.errors) {
                const validator = err.validator || "unknown";
                stats.failuresByValidator[validator] = (stats.failuresByValidator[validator] || 0) + 1;
              }
            }
            
            // Count by model
            const model = entry.model || "unknown";
            stats.failuresByModel[model] = (stats.failuresByModel[model] || 0) + 1;
          } else if (entry.message.includes("passed")) {
            stats.validPlans++;
          }
        }
      } catch (err) {
        // Skip malformed lines
      }
    }
  }
  
  stats.passRate = stats.totalAttempts > 0 
    ? (stats.validPlans / stats.totalAttempts * 100).toFixed(2) + "%"
    : "N/A";
  
  return stats;
}

/**
 * Export log utilities
 */
export default {
  LogLevel,
  logInvalidPlan,
  logValidPlan,
  logPlanRetry,
  logPlanExecutionStart,
  logPlanExecutionSuccess,
  logPlanExecutionFailure,
  logApiCall,
  logFineTuningJob,
  logModelSelection,
  getRecentLogs,
  getValidationStats,
};

