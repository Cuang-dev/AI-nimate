/**
 * AI-nimate Workflow State & History Ledger
 * 
 * Tracks active and past video production workflows with automatic
 * process liveness reconciliation and complete deletion capabilities.
 */

const fs = require('fs');
const path = require('path');
const { normalizePipelineConfig } = require('../config/schema');

const REPO_ROOT = path.resolve(__dirname, '..');
const WORKFLOWS_FILE = path.join(REPO_ROOT, 'projects', 'workflows.json');

/**
 * Check if a POSIX PID is currently alive
 */
function isPidAlive(pid) {
  if (!pid || typeof pid !== 'number') return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Reconcile ghost or crashed workflows
 */
function reconcileWorkflows(list) {
  if (!Array.isArray(list)) return [];
  let changed = false;

  for (const w of list) {
    // If marked active, verify whether worker is actually running
    if (['queued', 'research', 'script', 'choreography', 'rendering'].includes(w.status)) {
      const isAlive = w.pid ? isPidAlive(w.pid) : false;
      const startedAgeHours = (Date.now() - new Date(w.startedAt || 0).getTime()) / (1000 * 60 * 60);

      // If pid died or started over 2 hours ago with dead or missing pid
      if (!isAlive || startedAgeHours > 2) {
        w.status = 'failed';
        w.stage = 'Process Terminated (Stalled)';
        w.error = w.error || 'Pipeline worker terminated or killed.';
        w.completedAt = w.completedAt || new Date().toISOString();
        changed = true;
      }
    }
  }

  if (changed) {
    saveWorkflows(list);
  }
  return list;
}

function loadWorkflows(autoReconcile = true) {
  if (!fs.existsSync(WORKFLOWS_FILE)) return [];
  try {
    const raw = fs.readFileSync(WORKFLOWS_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    const list = Array.isArray(parsed) ? parsed : [];
    return autoReconcile ? reconcileWorkflows(list) : list;
  } catch (_) {
    return [];
  }
}

function saveWorkflows(list) {
  const dir = path.dirname(WORKFLOWS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(WORKFLOWS_FILE, JSON.stringify(list, null, 2), 'utf-8');
}

function recordWorkflow(entry = {}) {
  const list = loadWorkflows(false);
  const id = entry.id || `wf-${Date.now()}`;
  const config = entry.config
    ? normalizePipelineConfig(entry.config)
    : normalizePipelineConfig(entry);

  const record = {
    id,
    project: entry.project || 'untitled-project',
    topic: entry.topic || config.topic || 'Untitled Video',
    style: entry.style || config.styleId || 'investigative-documentary',
    format: entry.format || config.aspectRatio || '16:9',
    channel: entry.channel || config.channelId || 'kausalmedia',
    status: entry.status || 'queued', // queued | research | script | audio_wait | choreography | rendering | completed | failed | cancelled
    stage: entry.stage || 'Init',
    progress: entry.progress ?? 0,
    startedAt: entry.startedAt || new Date().toISOString(),
    completedAt: null,
    videoPath: null,
    error: null,
    pid: entry.pid || null,
    ...entry,
    channelId: config.channelId,
    videoVariant: config.videoVariant,
    styleId: config.styleId,
    visualEngine: config.visualEngine,
    subtitles: config.subtitles,
    aspectRatio: config.aspectRatio,
    config
  };
  list.unshift(record);
  saveWorkflows(list);
  return record;
}

function updateWorkflow(id, partial = {}) {
  const list = loadWorkflows(false);
  const idx = list.findIndex(w => w.id === id || w.project === id);
  if (idx === -1) return null;
  list[idx] = { ...list[idx], ...partial };
  if (partial.config || partial.channelId || partial.videoVariant || partial.styleId || partial.visualEngine || partial.subtitles || partial.aspectRatio) {
    const mergedConfigInput = Object.assign({}, list[idx].config || {}, partial.config || {}, {
      channelId: partial.channelId || list[idx].channelId,
      videoVariant: partial.videoVariant || list[idx].videoVariant,
      styleId: partial.styleId || list[idx].styleId,
      visualEngine: partial.visualEngine || list[idx].visualEngine,
      subtitles: partial.subtitles !== undefined ? partial.subtitles : list[idx].subtitles,
      aspectRatio: partial.aspectRatio || list[idx].aspectRatio
    });
    const updatedConfig = normalizePipelineConfig(mergedConfigInput);
    list[idx].channelId = updatedConfig.channelId;
    list[idx].videoVariant = updatedConfig.videoVariant;
    list[idx].styleId = updatedConfig.styleId;
    list[idx].visualEngine = updatedConfig.visualEngine;
    list[idx].subtitles = updatedConfig.subtitles;
    list[idx].aspectRatio = updatedConfig.aspectRatio;
    list[idx].config = updatedConfig;
  }
  if (partial.status === 'completed' && !list[idx].completedAt) {
    list[idx].completedAt = new Date().toISOString();
    list[idx].progress = 100;
  }
  saveWorkflows(list);
  return list[idx];
}

function getActiveWorkflow() {
  const list = loadWorkflows(true);
  return list.find(w => ['queued', 'research', 'script', 'audio_wait', 'choreography', 'rendering'].includes(w.status)) || null;
}

function getPastWorkflows(limit = 10) {
  const list = loadWorkflows(true);
  return list.slice(0, limit);
}

function getWorkflow(id) {
  const list = loadWorkflows(true);
  return list.find(w => w.id === id || w.project === id) || null;
}

/**
 * Delete a workflow by ID or Project, with optional file removal
 */
function deleteWorkflow(idOrProject, { deleteFiles = false } = {}) {
  const list = loadWorkflows(false);
  const remaining = [];
  let removed = null;

  for (const w of list) {
    if (w.id === idOrProject || w.project === idOrProject) {
      if (!removed) {
        removed = w;
        if (w.pid && isPidAlive(w.pid)) {
          try { process.kill(w.pid, 'SIGKILL'); } catch (_) {}
        }
      }
    } else {
      remaining.push(w);
    }
  }

  if (!removed) return null;
  saveWorkflows(remaining);

  if (deleteFiles && removed.project) {
    const projectDir = path.join(REPO_ROOT, 'projects', removed.project);
    if (fs.existsSync(projectDir)) {
      try {
        fs.rmSync(projectDir, { recursive: true, force: true });
        removed.dirDeleted = true;
      } catch (e) {
        removed.dirDeleteError = e.message;
      }
    }
  }

  return removed;
}

function cancelWorkflow(idOrProject) {
  const wf = getWorkflow(idOrProject);
  if (wf && wf.pid && isPidAlive(wf.pid)) {
    try { process.kill(wf.pid, 'SIGTERM'); } catch (_) {}
  }
  return updateWorkflow(idOrProject, {
    status: 'cancelled',
    stage: 'Interrupted by user',
    completedAt: new Date().toISOString()
  });
}

function setActiveWorkflow(idOrProject) {
  const list = loadWorkflows(false);
  const idx = list.findIndex(w => w.id === idOrProject || w.project === idOrProject);
  if (idx === -1) return null;

  const target = list.splice(idx, 1)[0];
  if (['failed', 'cancelled'].includes(target.status)) {
    target.status = 'queued';
    target.stage = 'Ready to Resume';
    target.error = null;
  }
  list.unshift(target);
  saveWorkflows(list);
  return target;
}

function getStalledWorkflows(limit = 10) {
  const list = loadWorkflows(true);
  return list.filter(w => ['failed', 'cancelled', 'audio_wait'].includes(w.status)).slice(0, limit);
}

module.exports = {
  isPidAlive,
  reconcileWorkflows,
  loadWorkflows,
  listWorkflows: loadWorkflows,
  recordWorkflow,
  createWorkflow: recordWorkflow,
  updateWorkflow,
  deleteWorkflow,
  cancelWorkflow,
  setActiveWorkflow,
  getStalledWorkflows,
  getActiveWorkflow,
  getPastWorkflows,
  getWorkflow
};
