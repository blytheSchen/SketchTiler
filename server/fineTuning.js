// server/fineTuning.js
// Fine-tuning job creation, monitoring, and model management

import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { logFineTuningJob } from "./logger.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FT_DATA_DIR = path.join(__dirname, "data", "fine_tuning");
const FT_STATE_FILE = path.join(FT_DATA_DIR, "state.json");

// Ensure directories exist
if (!fs.existsSync(FT_DATA_DIR)) {
  fs.mkdirSync(FT_DATA_DIR, { recursive: true });
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Fine-tuning state structure
 * @typedef {Object} FineTuningState
 * @property {Object<string, ModelInfo>} models - Model name -> info mapping
 * @property {Object<string, JobInfo>} jobs - Job ID -> info mapping
 * @property {string} [activeModel] - Currently active model name
 */

/**
 * @typedef {Object} ModelInfo
 * @property {string} name - Model name (e.g., "ft-vX")
 * @property {string} openaiId - OpenAI model ID (e.g., "ft:gpt-4o-mini:...")
 * @property {string} jobId - Fine-tuning job ID
 * @property {string} status - Job status
 * @property {string} createdAt - ISO timestamp
 * @property {Object} [metrics] - Training metrics
 */

/**
 * @typedef {Object} JobInfo
 * @property {string} id - Job ID
 * @property {string} modelName - Target model name
 * @property {string} status - Job status
 * @property {string} createdAt - ISO timestamp
 * @property {string} [finishedAt] - ISO timestamp
 * @property {Object} [error] - Error info if failed
 */

/**
 * Load fine-tuning state
 * @returns {FineTuningState}
 */
function loadState() {
  if (!fs.existsSync(FT_STATE_FILE)) {
    return { models: {}, jobs: {} };
  }
  
  try {
    const content = fs.readFileSync(FT_STATE_FILE, "utf8");
    return JSON.parse(content);
  } catch (err) {
    console.error("Failed to load fine-tuning state:", err);
    return { models: {}, jobs: {} };
  }
}

/**
 * Save fine-tuning state
 * @param {FineTuningState} state
 */
function saveState(state) {
  try {
    fs.writeFileSync(FT_STATE_FILE, JSON.stringify(state, null, 2));
  } catch (err) {
    console.error("Failed to save fine-tuning state:", err);
  }
}

/**
 * Upload training data to OpenAI
 * @param {string} filePath - Path to JSONL training file
 * @returns {Promise<string>} File ID
 */
export async function uploadTrainingFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Training file not found: ${filePath}`);
  }
  
  const fileStream = fs.createReadStream(filePath);
  const response = await openai.files.create({
    file: fileStream,
    purpose: "fine-tune",
  });
  
  console.log(`Uploaded training file: ${response.id}`);
  return response.id;
}

/**
 * Create a fine-tuning job
 * @param {string} trainingFileId - OpenAI file ID
 * @param {string} modelName - Target model name (e.g., "ft-v1")
 * @param {Object} [options] - Fine-tuning options
 * @returns {Promise<Object>} Job info
 */
export async function createFineTuningJob(trainingFileId, modelName, options = {}) {
  const {
    baseModel = "gpt-4o-mini-2024-07-18",
    validationFileId = null,
    hyperparameters = {},
    suffix = null,
  } = options;
  
  const jobParams = {
    training_file: trainingFileId,
    model: baseModel,
    ...(validationFileId && { validation_file: validationFileId }),
    ...(suffix && { suffix }),
  };
  
  // Add hyperparameters if provided
  if (Object.keys(hyperparameters).length > 0) {
    jobParams.hyperparameters = hyperparameters;
  }
  
  const job = await openai.fineTuning.jobs.create(jobParams);
  
  // Update state
  const state = loadState();
  state.jobs[job.id] = {
    id: job.id,
    modelName,
    status: job.status,
    createdAt: new Date().toISOString(),
  };
  saveState(state);
  
  logFineTuningJob("system", job.id, "created", { modelName, baseModel });
  
  return {
    jobId: job.id,
    status: job.status,
    modelName,
  };
}

/**
 * Get fine-tuning job status
 * @param {string} jobId - Job ID
 * @returns {Promise<Object>} Job details
 */
export async function getJobStatus(jobId) {
  const job = await openai.fineTuning.jobs.retrieve(jobId);
  
  // Update state
  const state = loadState();
  if (state.jobs[jobId]) {
    state.jobs[jobId].status = job.status;
    
    if (job.status === "succeeded" && job.fine_tuned_model) {
      state.jobs[jobId].finishedAt = new Date().toISOString();
      
      const modelName = state.jobs[jobId].modelName;
      state.models[modelName] = {
        name: modelName,
        openaiId: job.fine_tuned_model,
        jobId: job.id,
        status: "ready",
        createdAt: state.jobs[jobId].createdAt,
      };
      
      logFineTuningJob("system", jobId, "succeeded", { 
        modelName, 
        openaiId: job.fine_tuned_model 
      });
    } else if (job.status === "failed") {
      state.jobs[jobId].error = job.error || { message: "Unknown error" };
      state.jobs[jobId].finishedAt = new Date().toISOString();
      
      logFineTuningJob("system", jobId, "failed", { 
        error: job.error 
      });
    }
    
    saveState(state);
  }
  
  return {
    id: job.id,
    status: job.status,
    fineTunedModel: job.fine_tuned_model,
    trainingFile: job.training_file,
    validationFile: job.validation_file,
    createdAt: job.created_at,
    finishedAt: job.finished_at,
    error: job.error,
    resultFiles: job.result_files,
  };
}

/**
 * List all fine-tuning jobs
 * @param {number} [limit=20] - Max number of jobs to return
 * @returns {Promise<Array>} List of jobs
 */
export async function listJobs(limit = 20) {
  const response = await openai.fineTuning.jobs.list({ limit });
  return response.data;
}

/**
 * Cancel a fine-tuning job
 * @param {string} jobId - Job ID
 * @returns {Promise<Object>} Cancellation result
 */
export async function cancelJob(jobId) {
  const job = await openai.fineTuning.jobs.cancel(jobId);
  
  // Update state
  const state = loadState();
  if (state.jobs[jobId]) {
    state.jobs[jobId].status = "cancelled";
    state.jobs[jobId].finishedAt = new Date().toISOString();
    saveState(state);
  }
  
  logFineTuningJob("system", jobId, "cancelled");
  
  return {
    id: job.id,
    status: job.status,
  };
}

/**
 * Set active model
 * @param {string} modelName - Model name (e.g., "base", "ft-v1", "ft-v2")
 * @returns {Object} Result
 */
export function setActiveModel(modelName) {
  const state = loadState();
  
  // Validate model exists (or is "base")
  if (modelName !== "base" && !state.models[modelName]) {
    throw new Error(`Model not found: ${modelName}`);
  }
  
  state.activeModel = modelName;
  saveState(state);
  
  logFineTuningJob("system", "model_switch", "active", { modelName });
  
  return {
    ok: true,
    activeModel: modelName,
  };
}

/**
 * Get active model
 * @returns {string} Active model name
 */
export function getActiveModel() {
  const state = loadState();
  return state.activeModel || "base";
}

/**
 * Get model info by name
 * @param {string} modelName - Model name
 * @returns {ModelInfo|null} Model info or null if not found
 */
export function getModelInfo(modelName) {
  if (modelName === "base") {
    return {
      name: "base",
      openaiId: "gpt-4o-mini-2024-07-18",
      status: "ready",
    };
  }
  
  const state = loadState();
  return state.models[modelName] || null;
}

/**
 * Get all registered models
 * @returns {Object<string, ModelInfo>} Models mapping
 */
export function getAllModels() {
  const state = loadState();
  return {
    base: {
      name: "base",
      openaiId: "gpt-4o-mini-2024-07-18",
      status: "ready",
    },
    ...state.models,
  };
}

/**
 * Get OpenAI model ID for a model name
 * @param {string} modelName - Model name
 * @returns {string} OpenAI model ID
 */
export function getOpenAIModelId(modelName) {
  const info = getModelInfo(modelName);
  if (!info) {
    throw new Error(`Model not found: ${modelName}`);
  }
  return info.openaiId;
}

/**
 * Poll job status until completion
 * @param {string} jobId - Job ID
 * @param {number} [intervalMs=10000] - Polling interval in milliseconds
 * @param {Function} [onUpdate] - Callback for status updates
 * @returns {Promise<Object>} Final job status
 */
export async function pollJobUntilComplete(jobId, intervalMs = 10000, onUpdate = null) {
  while (true) {
    const status = await getJobStatus(jobId);
    
    if (onUpdate) {
      onUpdate(status);
    }
    
    if (status.status === "succeeded" || status.status === "failed" || status.status === "cancelled") {
      return status;
    }
    
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
}

/**
 * Export functions
 */
export default {
  uploadTrainingFile,
  createFineTuningJob,
  getJobStatus,
  listJobs,
  cancelJob,
  setActiveModel,
  getActiveModel,
  getModelInfo,
  getAllModels,
  getOpenAIModelId,
  pollJobUntilComplete,
};

