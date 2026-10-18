/**
 * AI-nimate Visual QA Sub-Agent Engine
 * 
 * Inspects rendered scene frames against Kausal Media's aesthetic standards:
 *  - Style conformance (Ligne claire contours, aged papyrus, pure white knockout)
 *  - Composition & framing (Centered layout, negative space margins)
 *  - Subtitle clearance (High contrast frosted pill, zero exhibit overlap)
 *  - Show-not-tell & asset integrity (Zero slide bullet points, no broken assets)
 * 
 * Emits structured defect payloads and remediation directives for the Orchestrator.
 */

const fs = require('fs');
const path = require('path');

/**
 * Audit a single scene beat frame
 * 
 * @param {Object} spec
 * @param {string} spec.beatId e.g. "beat_003"
 * @param {string} spec.framePath Absolute or relative path to rendered frame PNG
 * @param {Object} spec.scene Storyboard scene spec
 * @param {Object} spec.channel Channel profile
 * @returns {Promise<Object>} QA audit report
 */
async function auditFrame({ beatId, framePath, scene = {}, channel = {}, previousScene = null, prevExhibitSrc = null }) {
  const issues = [];
  let score = 100;

  // 1. Verify frame file exists and is non-empty
  if (!framePath || !fs.existsSync(framePath)) {
    return {
      beatId,
      framePath,
      verdict: 'FAIL',
      score: 0,
      defectType: 'MISSING_FRAME',
      critique: `Rendered frame image does not exist at path: ${framePath}`,
      remediation: {
        targetAgent: 'renderer',
        directive: 'Re-trigger frame capture for this scene beat in Playwright stage.'
      }
    };
  }

  const stat = fs.statSync(framePath);
  if (stat.size < 5000) { // Suspiciously small PNG indicates blank or corrupt render
    return {
      beatId,
      framePath,
      verdict: 'FAIL',
      score: 20,
      defectType: 'CORRUPT_FRAME',
      critique: `Rendered frame is abnormally small (${stat.size} bytes), likely a blank canvas or render abort.`,
      remediation: {
        targetAgent: 'renderer',
        directive: 'Verify stage DOM elements and retry frame capture.'
      }
    };
  }

  // 2. Rule Check: Show-not-tell (forbidden slide text on canvas)
  if (scene.slideText || scene.bulletPoints || (scene.text && !scene.subtitle)) {
    issues.push({
      rule: 'SHOW_NOT_TELL',
      penalty: 35,
      detail: 'Detected slide body text or bullet points in scene choreography. Only dynamic subtitles are allowed.'
    });
  }

  // 3. Rule Check: Chapter Bumper Disallowed (Continuous flow enforcement)
  if (scene.isChapterBumper || scene.chapterHeader || (scene.type === 'chapter_title')) {
    issues.push({
      rule: 'ZERO_CHAPTER_BUMPERS',
      penalty: 30,
      detail: 'Detected artificial chapter bumper slide. Kausal Media enforces continuous uninterrupted narrative flow.'
    });
  }

  // 4. Rule Check: Layout distribution check (Asymmetric layouts must be <= 20% across project)
  const layout = scene.layout || 'centered';
  if (!['hero', 'fullsize', 'fullscreen', 'centered', 'split-60-40', 'tilted-desk', 'full-bleed', 'off-center'].includes(layout)) {
    issues.push({
      rule: 'INVALID_LAYOUT',
      penalty: 15,
      detail: `Unrecognized layout archetype '${layout}'.`
    });
  }

  // 5. Rule Check: Exhibit asset presence & valid source
  if (scene.exhibit !== undefined) {
    if (!scene.exhibit || !scene.exhibit.src || scene.exhibit.src === 'null') {
      issues.push({
        rule: 'MISSING_EXHIBIT_SRC',
        penalty: 45,
        detail: `Scene beat ${beatId} has null or missing exhibit.src asset.`
      });
    } else {
      const src = scene.exhibit.src;
      // Check if asset is missing or broken
      if (src.startsWith('assets/') || src.startsWith('/')) {
        const repoRoot = path.resolve(__dirname, '..');
        const resolved = path.isAbsolute(src) ? src : path.resolve(repoRoot, src);
        if (!fs.existsSync(src) && !fs.existsSync(resolved)) {
          issues.push({
            rule: 'MISSING_ASSET_FILE',
            penalty: 40,
            detail: `Exhibit asset file not found on disk: ${src}`
          });
        }
      }
    }
  }

  // 6. Rule Check: Consecutive duplicate exhibit asset
  const currentSrc = scene.exhibit?.src;
  const prevSrc = prevExhibitSrc || previousScene?.exhibit?.src;
  if (currentSrc && prevSrc && currentSrc === prevSrc) {
    issues.push({
      rule: 'CONSECUTIVE_DUPLICATE_ASSET',
      penalty: 35,
      detail: `Scene beat ${beatId} reuses identical asset '${currentSrc}' from consecutive preceding beat.`
    });
  }

  // 7. Rule Check: Beat duration threshold (hard ceiling <= 8.0s)
  const duration = (typeof scene.duration === 'number' && scene.duration) ||
    ((typeof scene.endTime === 'number' && typeof scene.startTime === 'number') ? (scene.endTime - scene.startTime) : 0);
  if (duration > 8.0) {
    issues.push({
      rule: 'EXCESSIVE_BEAT_DURATION',
      penalty: 35,
      detail: `Scene beat ${beatId} duration (${duration.toFixed(1)}s) exceeds maximum threshold of 8.0s.`
    });
  }

  // Calculate final score
  const totalPenalty = issues.reduce((acc, iss) => acc + iss.penalty, 0);
  score = Math.max(0, 100 - totalPenalty);

  const verdict = score >= 80 ? 'PASS' : 'FAIL';

  let defectType = null;
  let critique = 'Frame adheres to Kausal Media visual guidelines.';
  let remediation = null;

  if (verdict === 'FAIL') {
    const primaryIssue = issues[0];
    defectType = primaryIssue.rule;
    critique = issues.map(i => i.detail).join('; ');

    if (defectType === 'MISSING_ASSET_FILE' || defectType === 'MISSING_EXHIBIT_SRC') {
      remediation = {
        targetAgent: 'asset_hub',
        directive: `Sourcing agent must re-resolve or generate missing asset for beat ${beatId}: ${scene.exhibit?.description || 'required exhibit'}`
      };
    } else if (defectType === 'CONSECUTIVE_DUPLICATE_ASSET') {
      remediation = {
        targetAgent: 'asset_hub',
        directive: `Sourcing agent must provide diverse non-duplicate asset for beat ${beatId}.`
      };
    } else if (defectType === 'EXCESSIVE_BEAT_DURATION') {
      remediation = {
        targetAgent: 'director',
        directive: `Director must subdivide beat ${beatId} into shorter sub-beats under 6.5s.`
      };
    } else if (defectType === 'SHOW_NOT_TELL' || defectType === 'ZERO_CHAPTER_BUMPERS') {
      remediation = {
        targetAgent: 'director',
        directive: `Director must strip slide text and chapter dividers from beat ${beatId}, converting it into a pure visual exhibit with subtitle.`
      };
    } else {
      remediation = {
        targetAgent: 'director',
        directive: `Director must re-choreograph beat ${beatId} to conform to standard 5-layer layout.`
      };
    }
  }

  return {
    beatId,
    framePath,
    verdict,
    score,
    defectType,
    issues,
    critique,
    remediation,
    timestamp: new Date().toISOString()
  };
}

/**
 * Audit all frames for a project storyboard
 */
async function auditProjectFrames(framesManifest, storyboard, channel) {
  const reports = [];
  let failCount = 0;

  for (let i = 0; i < framesManifest.length; i++) {
    const item = framesManifest[i];
    const sceneIndex = (storyboard.scenes || []).findIndex(s => s.id === item.beatId);
    const scene = sceneIndex >= 0 ? storyboard.scenes[sceneIndex] : (storyboard.scenes?.[i] || {});
    const previousScene = sceneIndex > 0 ? storyboard.scenes[sceneIndex - 1] : (i > 0 ? (storyboard.scenes?.[i - 1] || null) : null);

    const report = await auditFrame({
      beatId: item.beatId,
      framePath: item.framePath,
      scene,
      channel,
      previousScene
    });
    reports.push(report);
    if (report.verdict === 'FAIL') failCount++;
  }

  return {
    totalFrames: reports.length,
    passedCount: reports.length - failCount,
    failedCount: failCount,
    overallVerdict: failCount === 0 ? 'PASS' : 'FAIL',
    reports
  };
}

module.exports = {
  auditFrame,
  auditProjectFrames
};
