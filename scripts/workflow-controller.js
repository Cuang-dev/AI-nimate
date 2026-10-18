#!/usr/bin/env node
/**
 * AI-nimate Production Workflow Controller
 * 
 * Standalone orchestration interface for launching, pausing, resuming,
 * and halting video production workflows independently of any chat client.
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { recordWorkflow, updateWorkflow, loadWorkflows, cancelWorkflow, getActiveWorkflow, getWorkflow } = require('./workflow-ledger');
const { notifyPipelineStage } = require('./discord-notifier');
const { getChannelProfile } = require('../channels/channel-manager');
const { normalizePipelineConfig } = require('../config/schema');

const REPO_ROOT = path.resolve(__dirname, '..');

/**
 * Spawns a background worker process while streaming stdout and stderr to pipeline.log
 */
function spawnWorkerWithLogging(projectDir, workerArgs, customEnv = {}) {
  fs.mkdirSync(projectDir, { recursive: true });
  const logFile = path.join(projectDir, 'pipeline.log');
  const out = fs.openSync(logFile, 'a');
  const env = {
    ...process.env,
    NODE_OPTIONS: '--expose-gc --max-old-space-size=1024',
    ...customEnv
  };
  const worker = spawn('node', workerArgs, {
    detached: true,
    stdio: ['ignore', out, out],
    env
  });
  worker.unref();
  return worker;
}

/**
 * Reads the latest lines from a workflow's pipeline.log
 */
function getWorkflowLogs(wfOrSlug, maxLines = 15) {
  let slug = wfOrSlug;
  if (typeof wfOrSlug === 'object' && wfOrSlug) {
    slug = wfOrSlug.project || wfOrSlug.slug || wfOrSlug.id;
  } else if (typeof wfOrSlug === 'string' && (wfOrSlug.startsWith('wf-') || wfOrSlug.startsWith('wf_'))) {
    const wf = getWorkflow(wfOrSlug);
    if (wf && wf.project) slug = wf.project;
  }
  const logFile = path.join(REPO_ROOT, 'projects', slug, 'pipeline.log');
  if (!fs.existsSync(logFile)) return 'No live pipeline logs recorded yet.';
  try {
    const raw = fs.readFileSync(logFile, 'utf8').trim();
    if (!raw) return 'Log file is currently empty.';
    const lines = raw.split('\n');
    return lines.slice(-maxLines).join('\n');
  } catch (err) {
    return `Error reading log file: ${err.message}`;
  }
}

/**
 * Launch a new video production pipeline
 */
function startVideoProduction(options = {}) {
  const activeWf = getActiveWorkflow();
  if (activeWf && ['queued', 'research', 'script', 'script_wait', 'audio_wait', 'choreography', 'rendering'].includes(activeWf.status)) {
    return {
      success: false,
      error: `A workflow is already in progress (\`${activeWf.topic || activeWf.id}\`).`,
      activeWf
    };
  }

  const channelProfile = getChannelProfile(options.channelId || options.channel);
  const config = normalizePipelineConfig(options, channelProfile);

  const rawTopic = config.topic || options.topic || '';
  const lines = String(rawTopic).split('\n').map(l => l.trim()).filter(Boolean);
  const title = lines[0] ? lines[0].slice(0, 80) : 'Untitled Project';
  const slug = (options.project || options.slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 32)) || 'video-project';
  const projectDir = path.join(REPO_ROOT, 'projects', slug);
  fs.mkdirSync(projectDir, { recursive: true });

  const activeAgent = options.agent || process.env.ACTIVE_AGENT || 'agy';
  const audioGate = Boolean(options.audioGate);
  const scriptGate = Boolean(options.scriptGate);
  const testMode = Boolean(options.testMode);
  const targetDuration = options.targetDuration ? Number(options.targetDuration) : null;
  const hasGates = Boolean(audioGate || scriptGate);

  const wf = recordWorkflow({
    project: slug,
    topic: title,
    channel: config.channelId,
    channelId: config.channelId,
    variant: config.videoVariant,
    videoVariant: config.videoVariant,
    style: config.styleId,
    styleId: config.styleId,
    format: config.aspectRatio,
    aspectRatio: config.aspectRatio,
    visualEngine: config.visualEngine,
    subtitles: config.subtitles,
    config,
    agent: activeAgent,
    testMode,
    audioGate,
    scriptGate,
    targetDuration,
    status: 'research',
    stage: 'Domain Research',
    progress: 10
  });

  const pipelineScript = path.join(REPO_ROOT, 'scripts', 'pipeline.js');
  const subtitlesArg = config.subtitles.enabled ? config.subtitles.mode : 'off';
  const workerArgs = [
    pipelineScript,
    '--workflow-id', wf.id,
    '--project', slug,
    '--channel', config.channelId,
    '--variant', config.videoVariant,
    '--style', config.styleId,
    '--visual-engine', config.visualEngine,
    '--subtitles', subtitlesArg,
    '--aspect', config.aspectRatio,
    '--topic', title,
    '--format', config.aspectRatio,
    '--agent', activeAgent
  ];

  if (targetDuration) workerArgs.push('--target-duration', String(targetDuration));
  if (testMode) workerArgs.push('--test-mode');
  if (audioGate) workerArgs.push('--audio-gate');
  if (scriptGate) workerArgs.push('--script-gate');

  if (!hasGates) {
    workerArgs.push('--auto');
  } else {
    workerArgs.push('--gates');
  }

  const worker = spawnWorkerWithLogging(projectDir, workerArgs);
  updateWorkflow(wf.id, { pid: worker.pid });
  return { success: true, workflow: wf, pid: worker.pid, projectDir };
}

/**
 * Halt currently active workflow
 */
function stopVideoProduction() {
  const workflows = loadWorkflows();
  const active = workflows.find(w => ['queued', 'research', 'script', 'script_wait', 'audio_wait', 'choreography', 'rendering'].includes(w.status));
  if (!active) return null;

  if (active.pid) {
    try {
      process.kill(active.pid, 'SIGTERM');
      setTimeout(() => {
        try { process.kill(active.pid, 'SIGKILL'); } catch (_) {}
      }, 1500);
    } catch (_) {}
  }
  cancelWorkflow(active.id);
  return active;
}

/**
 * Resume workflow with custom script text (Script Gate: Option 1)
 */
function resumeWorkflowWithScript({ workflowId, scriptText }) {
  const workflows = loadWorkflows();
  const wf = workflows.find(w => w.id === workflowId || w.project === workflowId);
  if (!wf) return { success: false, error: 'Workflow not found' };

  const projectDir = path.join(REPO_ROOT, 'projects', wf.project);
  const scriptDir = path.join(projectDir, 'script');
  fs.mkdirSync(scriptDir, { recursive: true });

  const scriptTxtPath = path.join(scriptDir, 'script.txt');
  const scriptJsonPath = path.join(scriptDir, 'script.json');

  const cleanText = String(scriptText || '').trim();
  const words = cleanText.split(/\s+/).filter(Boolean);
  const durationEst = Math.round((words.length / 140) * 60);

  fs.writeFileSync(scriptTxtPath, cleanText, 'utf8');
  const scriptData = {
    topic: wf.topic || wf.project,
    channel: wf.channel || 'kausalmedia',
    format: wf.format || '16:9',
    wordCount: words.length,
    estimatedDurationSeconds: durationEst,
    scriptText: cleanText,
    customScript: true,
    updatedAt: new Date().toISOString()
  };
  fs.writeFileSync(scriptJsonPath, JSON.stringify(scriptData, null, 2), 'utf8');

  updateWorkflow(wf.id, {
    status: 'audio',
    stage: 'Custom Script Applied — Resuming Audio',
    progress: 35
  });

  const channelProfile = getChannelProfile(wf.channelId || wf.channel || 'kausalmedia');
  const config = normalizePipelineConfig(wf.config || wf, channelProfile);
  const subtitlesArg = config.subtitles.enabled ? config.subtitles.mode : 'off';

  const pipelineScript = path.join(REPO_ROOT, 'scripts', 'pipeline.js');
  const workerArgs = [
    pipelineScript,
    '--workflow-id', wf.id,
    '--project', wf.project,
    '--channel', config.channelId,
    '--variant', config.videoVariant,
    '--style', config.styleId,
    '--visual-engine', config.visualEngine,
    '--subtitles', subtitlesArg,
    '--aspect', config.aspectRatio,
    '--topic', wf.topic || wf.project,
    '--format', config.aspectRatio,
    '--resume', 'audio'
  ];

  if (wf.testMode) workerArgs.push('--test-mode');
  if (wf.audioGate) {
    workerArgs.push('--audio-gate');
  } else {
    workerArgs.push('--auto');
  }

  const worker = spawnWorkerWithLogging(path.join(REPO_ROOT, 'projects', wf.project), workerArgs);
  updateWorkflow(wf.id, { pid: worker.pid });
  return { success: true, workflow: wf, pid: worker.pid };
}

/**
 * Revise workflow script with guidelines sent to writer agent (Script Gate: Option 2)
 */
function reviseWorkflowScriptWithGuidelines({ workflowId, guidelines }) {
  const workflows = loadWorkflows();
  const wf = workflows.find(w => w.id === workflowId || w.project === workflowId);
  if (!wf) return { success: false, error: 'Workflow not found' };

  const projectDir = path.join(REPO_ROOT, 'projects', wf.project);
  const scriptDir = path.join(projectDir, 'script');
  const scriptTxtPath = path.join(scriptDir, 'script.txt');
  const scriptJsonPath = path.join(scriptDir, 'script.json');

  let currentScript = '';
  if (fs.existsSync(scriptTxtPath)) {
    currentScript = fs.readFileSync(scriptTxtPath, 'utf8');
  }

  const agyBin = process.env.AGY_BIN || '/home/agent/.local/bin/agy';
  let revisedScript = '';

  const writerPrompt = `You are the lead investigative documentary scriptwriter for Kausal Media.
Revise and refine the following script based strictly on the director's guidelines.
DIRECTOR GUIDELINES: "${guidelines}"

ORIGINAL SCRIPT:
${currentScript}

CRITICAL RULES:
- Continuous narrative flow, NO chapters, NO headings.
- Maintain asymmetrical cadence (punchy short clauses mixed with deep context).
- Bracket phonetics for acronyms e.g. [BEI|B-E-I], [OJK|O-J-K].
- Return ONLY the final revised script text. No pleasantries or Markdown code blocks.`;

  if (fs.existsSync(agyBin)) {
    try {
      const { execSync } = require('child_process');
      const out = execSync(`"${agyBin}" -p ${JSON.stringify(writerPrompt)} --dangerously-skip-permissions --print-timeout 15s`, {
        encoding: 'utf8',
        timeout: 18000
      });
      revisedScript = out.replace(/```[a-z]*\n?/g, '').trim();
    } catch (_) {}
  }

  if (!revisedScript || revisedScript.length < 50) {
    // Graceful fallback: append editorial guidance note
    revisedScript = currentScript + `\n\nCatatan Redaksi Penulis: ${guidelines}`;
  }

  const words = revisedScript.split(/\s+/).filter(Boolean);
  const durationEst = Math.round((words.length / 140) * 60);

  fs.writeFileSync(scriptTxtPath, revisedScript, 'utf8');
  const scriptData = {
    topic: wf.topic || wf.project,
    channel: wf.channel || 'kausalmedia',
    format: wf.format || '16:9',
    wordCount: words.length,
    estimatedDurationSeconds: durationEst,
    scriptText: revisedScript,
    guidelinesApplied: guidelines,
    updatedAt: new Date().toISOString()
  };
  fs.writeFileSync(scriptJsonPath, JSON.stringify(scriptData, null, 2), 'utf8');

  updateWorkflow(wf.id, {
    status: 'audio',
    stage: 'Script Revised via Guidelines — Resuming Audio',
    progress: 35
  });

  const channelProfile = getChannelProfile(wf.channelId || wf.channel || 'kausalmedia');
  const config = normalizePipelineConfig(wf.config || wf, channelProfile);
  const subtitlesArg = config.subtitles.enabled ? config.subtitles.mode : 'off';

  const pipelineScript = path.join(REPO_ROOT, 'scripts', 'pipeline.js');
  const workerArgs = [
    pipelineScript,
    '--workflow-id', wf.id,
    '--project', wf.project,
    '--channel', config.channelId,
    '--variant', config.videoVariant,
    '--style', config.styleId,
    '--visual-engine', config.visualEngine,
    '--subtitles', subtitlesArg,
    '--aspect', config.aspectRatio,
    '--topic', wf.topic || wf.project,
    '--format', config.aspectRatio,
    '--resume', 'audio'
  ];

  if (wf.testMode) workerArgs.push('--test-mode');
  if (wf.audioGate) {
    workerArgs.push('--audio-gate');
  } else {
    workerArgs.push('--auto');
  }

  const worker = spawnWorkerWithLogging(projectDir, workerArgs);
  updateWorkflow(wf.id, { pid: worker.pid });
  return { success: true, workflow: wf, pid: worker.pid, revisedLength: words.length };
}

/**
 * Resume workflow with selected audio source (Audio Gate: Option 1 Edge TTS, Option 3 API Voice)
 */
function resumeWorkflowWithAudioSource({ workflowId, audioSource = 'edge_tts' }) {
  const workflows = loadWorkflows();
  const wf = workflows.find(w => w.id === workflowId || w.project === workflowId);
  if (!wf) return { success: false, error: 'Workflow not found' };

  updateWorkflow(wf.id, {
    status: 'audio',
    stage: `Synthesizing Audio via ${audioSource.toUpperCase()}...`,
    progress: 45
  });

  const channelProfile = getChannelProfile(wf.channelId || wf.channel || 'kausalmedia');
  const config = normalizePipelineConfig(wf.config || wf, channelProfile);
  const subtitlesArg = config.subtitles.enabled ? config.subtitles.mode : 'off';

  const pipelineScript = path.join(REPO_ROOT, 'scripts', 'pipeline.js');
  const workerArgs = [
    pipelineScript,
    '--workflow-id', wf.id,
    '--project', wf.project,
    '--channel', config.channelId,
    '--variant', config.videoVariant,
    '--style', config.styleId,
    '--visual-engine', config.visualEngine,
    '--subtitles', subtitlesArg,
    '--aspect', config.aspectRatio,
    '--topic', wf.topic || wf.project,
    '--format', config.aspectRatio,
    '--resume', 'audio',
    '--audio-source', audioSource,
    '--auto'
  ];

  if (wf.testMode) workerArgs.push('--test-mode');

  const worker = spawnWorkerWithLogging(path.join(REPO_ROOT, 'projects', wf.project), workerArgs);
  updateWorkflow(wf.id, { pid: worker.pid });
  return { success: true, workflow: wf, pid: worker.pid };
}

/**
 * Resume workflow with custom voiceover audio file (Audio Gate: Option 2)
 */
function resumeWorkflowWithAudio({ workflowId, audioPath }) {
  const workflows = loadWorkflows();
  const wf = workflows.find(w => w.id === workflowId || w.project === workflowId);
  if (!wf) return null;

  const projectDir = path.join(REPO_ROOT, 'projects', wf.project);
  const targetAudio = path.join(projectDir, 'audio', 'voiceover.mp3');
  fs.mkdirSync(path.dirname(targetAudio), { recursive: true });
  fs.copyFileSync(audioPath, targetAudio);

  updateWorkflow(wf.id, { status: 'choreography', stage: 'Choreography & Rendering', progress: 55 });

  const channelProfile = getChannelProfile(wf.channelId || wf.channel || 'kausalmedia');
  const config = normalizePipelineConfig(wf.config || wf, channelProfile);
  const subtitlesArg = config.subtitles.enabled ? config.subtitles.mode : 'off';

  const pipelineScript = path.join(REPO_ROOT, 'scripts', 'pipeline.js');
  const workerArgs = [
    pipelineScript,
    '--workflow-id', wf.id,
    '--project', wf.project,
    '--channel', config.channelId,
    '--variant', config.videoVariant,
    '--style', config.styleId,
    '--visual-engine', config.visualEngine,
    '--subtitles', subtitlesArg,
    '--aspect', config.aspectRatio,
    '--topic', wf.topic || wf.project,
    '--format', config.aspectRatio,
    '--resume', 'render',
    '--auto'
  ];

  if (wf.testMode) workerArgs.push('--test-mode');

  const worker = spawnWorkerWithLogging(projectDir, workerArgs);
  updateWorkflow(wf.id, { pid: worker.pid });
  return { success: true, workflow: wf, pid: worker.pid };
}

/**
 * Delete a workflow entirely from ledger and optionally remove project directory
 */
function deleteWorkflowEntirely(idOrProject, { deleteFiles = false } = {}) {
  const { deleteWorkflow } = require('./workflow-ledger');
  const removed = deleteWorkflow(idOrProject, { deleteFiles });
  return removed;
}

/**
 * Resume or restart an existing workflow by ID or project slug
 */
function resumeOrStartWorkflow(idOrProject) {
  const workflows = loadWorkflows();
  const wf = workflows.find(w => w.id === idOrProject || w.project === idOrProject);
  if (!wf) return { success: false, error: `Workflow with ID or slug '${idOrProject}' not found.` };

  const projectDir = path.join(REPO_ROOT, 'projects', wf.project);
  fs.mkdirSync(projectDir, { recursive: true });

  const activeAgent = wf.agent || process.env.ACTIVE_AGENT || 'agy';
  updateWorkflow(wf.id, {
    status: 'research',
    stage: 'Restarted / Resuming Pipeline',
    progress: Math.max(10, wf.progress || 0),
    error: null
  });

  const channelProfile = getChannelProfile(wf.channelId || wf.channel || 'kausalmedia');
  const config = normalizePipelineConfig(wf.config || wf, channelProfile);
  const subtitlesArg = config.subtitles.enabled ? config.subtitles.mode : 'off';

  const pipelineScript = path.join(REPO_ROOT, 'scripts', 'pipeline.js');
  const workerArgs = [
    pipelineScript,
    '--workflow-id', wf.id,
    '--project', wf.project,
    '--channel', config.channelId,
    '--variant', config.videoVariant,
    '--style', config.styleId,
    '--visual-engine', config.visualEngine,
    '--subtitles', subtitlesArg,
    '--aspect', config.aspectRatio,
    '--topic', wf.topic || wf.project,
    '--format', config.aspectRatio,
    '--agent', activeAgent,
    '--auto'
  ];

  const worker = spawnWorkerWithLogging(path.join(REPO_ROOT, 'projects', wf.project), workerArgs);
  updateWorkflow(wf.id, { pid: worker.pid });
  return { success: true, workflow: wf, pid: worker.pid };
}

module.exports = {
  startVideoProduction,
  stopVideoProduction,
  resumeWorkflowWithAudio,
  resumeWorkflowWithAudioSource,
  resumeWorkflowWithScript,
  reviseWorkflowScriptWithGuidelines,
  deleteWorkflowEntirely,
  resumeOrStartWorkflow,
  getWorkflowLogs
};
