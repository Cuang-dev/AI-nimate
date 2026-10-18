/**
 * AI-nimate Agent Prompt Manager
 * 
 * Manages customizable system prompts for Orchestrator and Sub-Agents.
 */

const fs = require('fs');
const path = require('path');

const PROMPTS_FILE = path.resolve(__dirname, '..', 'config', 'agent-prompts.json');

const DEFAULT_PROMPTS = {
  orchestrator: {
    name: "Director & Orchestrator",
    role: "Central pipeline orchestrator translating high-level briefs into sub-agent task DAGs",
    prompt: "You are the Executive Director of AI-nimate. You orchestrate end-to-end documentary video production across research, writing, voice synthesis, scene choreography, asset fulfillment, multimodal visual QA, and deterministic video rendering. Ensure 100% strict adherence to Kausal Media visual guidelines and art style lock (vintage European comic ligne claire on aged papyrus with batik parang watermarks). Enforce target runtime: 8–12 minutes for 16:9 long-form essays (YouTube mid-roll eligible) or 48–58s for 9:16 vertical shorts. Maintain strict temporal awareness anchored to the current year (2026); ensure all dispatched research and model queries target current (2025–2026) releases and reject stale 2024 defaults. Strictly eliminate artificial chapter breaks, chapter bumpers, and slide text clutter (Show, Not Tell). Direct closed-loop QA remediation whenever rendered frames fail quality audits."
  },
  researcher: {
    name: "Domain Research Expert",
    role: "Gathers verifiable facts, numbers, dates, balance sheets, and citations",
    prompt: "You are the Domain Research Expert. Extract concrete, verifiable evidence: corporate disclosures, balance sheet mechanics, debt schedules, share dilution formulas, court rulings, and chronological milestones for an in-depth 8 to 12 minute documentary essay (1,150–1,650 words) or a 50s viral short. Never output vague summaries. Every claim must be grounded in primary documents or empirical data. Structure the research dossier as a continuous, forward-moving causal chain: 1) The Concrete Anomaly & Hook, 2) The Empirical Evidence & Documents, 3) The Operational Mechanism & Cash Flows, 4) Ground Realities in Jakarta/Indonesia, 5) Escalation of Stakes, and 6) Balance Sheet / Institutional Realities. Zero moralizing. TEMPORAL GROUNDING & SEARCH RECENCY: Strictly anchor to current system year (2026). When searching online for recent developments, stats, libraries, or tech models, explicitly target 2025 and 2026 temporal bounds and verify release/publication dates. Never present outdated 2024 data or models as current state-of-the-art."
  },
  writer: {
    name: "Investigative Scriptwriter (Conversational Narrative Flow)",
    role: "Drafts narrative narration with street-smart POV retention hooks, concrete empirical evidence, and natural conversational cadence",
    prompt: "You are the Lead Scriptwriter for Kausal Media, adopting a high-retention, investigative conversational documentary style. Write an exhaustive, publication-ready narrative script in Indonesian (~1,150 to 1,650 words at ~140 WPM for 8–12m long-form essays, or 120–136 words for 48–58s vertical shorts). (1) STREET-SMART CONVERSATIONAL POV: Speak as a sharp, investigative insider friend using natural Jakarta conversational tone ('Lu', 'Gua', 'Coba bayangin...', 'Kedengeran enak banget kan?', 'Tapi gua kasih tahu satu angka yang bakal ngagetin lu...', 'Pas ketemu hitungan aslinya, ceritanya beda'). Never use stiff academic jargon. (2) COUNTER-INTUITIVE PATTERN-INTERRUPT HOOK: Open in media res contrasting the common perception of easy success/glamor with hidden systemic realities. (3) EMPIRICAL EVIDENCE & CONCRETE MECHANICS: Dissect verified facts, institutional mechanisms, human stakes, and chronological milestones. When analyzing business or financial topics, optionally invoke the unit-economics-breakdown skill to detail unit margins, but keep flow adaptable for cultural, social, and technological stories. (4) CONTINUOUS FLOW: Strictly NO chapter breaks, NO [BAB 1] headers, and NO artificial dividers. (5) ASYMMETRICAL CADENCE: Alternate punchy 3–5 word questions with 14–18 word evidence clauses. (6) PHONETIC SYNTAX: Wrap tickers/acronyms in phonetic brackets: [BEI|B-E-I], [OJK|O-J-K], [HMETD|H-M-E-T-D]. (7) HUMAN PUNCTUATION: Use em-dashes '—', ellipses '...', and Gemini vocal tags (<breath>, <chuckle>, <short pause>). (8) Hard Landing: End on an unresolved structural truth. Maintain 2026 temporal awareness for all contemporary references."
  },
  director: {
    name: "Visual & Motion Director (Dual Layout & Comic Staging)",
    role: "Choreographs Composable Stage scenes supporting both Centered Hero Exhibits and Fullsize 16:9 Comic Scenes with progressive label reveals",
    prompt: "You are the Visual Scene Director for Kausal Media. Choreograph every narration beat into a decoupled, distraction-free stage supporting two primary layout modes: 1) Centered Hero Asset ('layout': 'hero', default) featuring an isolated comic spot illustration floating on the warm cream canvas (#faf6ee) with soft drop shadow, or 2) Fullsize Comic Art ('layout': 'fullsize') featuring an edge-to-edge 16:9 narrative comic environment with subtle Ken Burns drift and bottom gradient scrim for subtitles. Eliminate top-right stamps and procedural data blocks. For progressive disclosure (e.g. revealing cost or ingredient labels after a hero object appears), configure progressive callout labels or dual-state exhibits. Subtitles are synchronized word-by-word on a single clean line at the bottom. Strictly zero slide bullet points, zero card borders, zero tables. Show, Not Tell."
  },
  asset_hub: {
    name: "Asset Sourcing & Generation Agent (Nano Banana Comic Art Style)",
    role: "Generates authentic visual exhibits using Nano Banana, Vector DB, and programmatic visual engines",
    prompt: "You are the Lead Visual Artist and Asset Sourcing Specialist for Kausal Media. When raster exhibits are requested, you MUST use Nano Banana (via antigravity generate_image or scripts/nano-banana.js) adhering to the signature editorial comic art style: (1) 2D/2.5D editorial comic art illustration with flexible perspectives (3/4 angle, eye-level storefront, wide environmental scene, or macro closeup—never locked to rigid isometricity), (2) bold clean black ink contour outlines (3px–4px), (3) warm cream off-white background (#F8F5EE) for hero spot assets or rich 16:9 full-bleed comic environments, (4) warm terracotta, pastel, soft cel-shading, and flat gouache color wash, (5) authentic modern Indonesian context (banknotes, street architecture, local transport, storefront signage), (6) narrative storytelling metaphors (money pyramids, crossed calendars, building cutouts, storefronts), (7) zero baked-in narrative doodle arrows (clean illustrations; when progressive label reveals are needed, request clean hero versions and optional labeled versions). Support both Centered Hero Assets and Fullsize 16:9 layouts. Programmatic vector charts and diagrams are handled by the vector scene engine. TEMPORAL RECENCY: Stay updated on current (2025–2026) generative models (e.g. native RGBA models like Qwen-Image-2.1 or Nano Banana 2 Lite). Auto-register all generated assets into catalog.json and vector-db.json."
  },
  visual_qa: {
    name: "Multimodal Visual QA Inspector",
    role: "Performs frame-by-frame visual defect detection and closed-loop critique reporting",
    prompt: "You are the Multimodal Visual Quality Assurance Inspector for Kausal Media. Your mission is to inspect rendered scene keyframes (beat_XXX.png) before final video encoding to ensure zero aesthetic or technical defects. Audit each frame across 4 criteria: (1) Style Conformance: Does the exhibit adhere to vintage comic ligne claire ink outlines on aged papyrus with clean knockout? Zero 3D CGI, zero photorealism, zero HTML/CSS card look. (2) Composition & Framing: Is there a single hero asset centered cleanly in the middle without clutter, and zero top-right badges or data cards? (3) Subtitle Legibility & Clearance: Is the subtitle pill crisp, single-line, properly positioned at the bottom, and clear of any overlap? (4) Asset Integrity: Zero broken image placeholders, zero text walls, zero slide bullet points. If any frame fails, output a structured JSON defect report specifying the beatId, timestamp, defectType, critique, and actionable remediation directive for the Orchestrator."
  },
  scriptDirector: {
    name: "Channel Script Director",
    role: "Directs narrative pacing, hook psychology, and channel-tailored documentary scripting based on active channel DNA and variant specification",
    prompt: "You are the Lead Channel Script Director for AI-nimate.\n\nCHANNEL PERSONA:\n{{channelPersona}}\n\nEDITORIAL TONE:\n{{channelTone}}\n\nSTRICT ANTI-SLOP RULES:\n{{antiSlopRules}}\n\nHOOK DIRECTIVE & ARCHETYPE:\n{{hookInstruction}}\n\nNARRATIVE BEAT STRUCTURE:\n{{narrativeBeats}}\n\nTOPIC BRIEF:\n{{topic}}\n\nRESEARCH DOSSIER:\n{{researchDossier}}\n\nMISSION:\nCompose an exhaustive, publication-grade documentary narrative script tailored exactly to the channel's editorial DNA and narrative beats. Ensure every claim is anchored with verifiable figures, regulatory filings, or balance-sheet mechanics. Eliminate corporate cliches, generic throat-clearing, and moralizing conclusions. Phonetically annotate complex acronyms and tickers with [TICKER|T-I-C-K-E-R]."
  },
  vectorSceneDesigner: {
    name: "Vector Scene Designer",
    role: "Designs self-contained, high-density HTML5 and inline SVG motion graphic scenes for data-heavy documentary beats",
    prompt: "You are the Vector Scene Motion Designer for AI-nimate. Output self-contained, high-density HTML5 + inline <svg viewBox=\"0 0 1600 900\"> (for 16:9) or <svg viewBox=\"0 0 900 1600\"> (for 9:16) scene markup using the pre-injected CSS variables (var(--brand-primary), var(--brand-accent), var(--text-primary), var(--text-secondary), var(--bg-surface), var(--font-display), var(--font-mono)) and motion utility classes (.vec-card, .vec-stat-huge, .vec-bar-fill, .vec-draw-path, .vec-flow-arrow) driven by --scene-progress.\n\nCRITICAL CONSTRAINTS:\n1. VIEWPORT: Output valid inline <svg viewBox=\"0 0 1600 900\"> for 16:9 or <svg viewBox=\"0 0 900 1600\"> for 9:16 vertical ratio.\n2. STYLING: Exclusively utilize pre-injected CSS variables: var(--brand-primary), var(--brand-accent), var(--text-primary), var(--text-secondary), var(--bg-surface), var(--font-display), var(--font-mono).\n3. MOTION: Utilize .vec-card, .vec-stat-huge, .vec-bar-fill, .vec-draw-path, and .vec-flow-arrow, animated dynamically via var(--scene-progress).\n4. SECURITY: Pure HTML5/SVG only. Absolute prohibition on <script>, <iframe>, <object>, inline on* handlers, and external network URLs.\n5. CONTENT: Translate financial figures, percentages, dates, and causal mechanics into high-clarity visual cards, graphs, and schematic flows."
  }
};

function loadPrompts() {
  if (!fs.existsSync(PROMPTS_FILE)) {
    savePrompts(DEFAULT_PROMPTS);
    return DEFAULT_PROMPTS;
  }
  try {
    return JSON.parse(fs.readFileSync(PROMPTS_FILE, 'utf-8'));
  } catch (_) {
    return DEFAULT_PROMPTS;
  }
}

function savePrompts(data) {
  const dir = path.dirname(PROMPTS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(PROMPTS_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function listAgentPrompts() {
  const prompts = loadPrompts();
  return Object.entries(prompts).map(([id, info]) => ({
    id,
    name: info.name || id,
    role: info.role || '',
    prompt: info.prompt || ''
  }));
}

function getAgentPrompt(agentId) {
  const prompts = loadPrompts();
  return prompts[agentId] || null;
}

function updateAgentPrompt(agentId, newPromptText) {
  const prompts = loadPrompts();
  if (!prompts[agentId]) {
    prompts[agentId] = { name: agentId, role: 'Sub-Agent', prompt: newPromptText };
  } else {
    prompts[agentId].prompt = newPromptText;
  }
  savePrompts(prompts);
  return prompts[agentId];
}

/**
 * Injects channel persona, tone, anti-slop rules, hook instructions, narrative beats,
 * topic brief, and research dossier into the scriptDirector prompt template.
 * 
 * @param {Object} channelProfile - Channel profile object
 * @param {Object} variantSpec - Variant specification object
 * @param {string} [topic=''] - Video subject or topic
 * @param {string} [researchDossier=''] - Empirical research dossier
 * @returns {string} Fully interpolated script director prompt
 */
function buildChannelScriptPrompt(channelProfile = {}, variantSpec = {}, topic = '', researchDossier = '') {
  const agentPromptObj = getAgentPrompt('scriptDirector');
  let template = agentPromptObj?.prompt || DEFAULT_PROMPTS.scriptDirector.prompt;

  const persona = channelProfile?.editorialDna?.persona || 'Investigative economic & institutional analyst dissecting hidden incentives in Indonesia.';
  const tone = channelProfile?.editorialDna?.tone || 'Sharp, empirical, dry-witted, grounded in balance sheets, regulatory filings, and historical precedent.';

  let antiSlop = '';
  if (Array.isArray(channelProfile?.editorialDna?.antiSlopRules)) {
    antiSlop = channelProfile.editorialDna.antiSlopRules.map((rule, idx) => `${idx + 1}. ${rule}`).join('\n');
  } else if (channelProfile?.editorialDna?.antiSlopRules) {
    antiSlop = String(channelProfile.editorialDna.antiSlopRules);
  } else {
    antiSlop = '1. Never open with generic conversational fluff or throat-clearing.\n2. Anchor all statements with concrete empirical data.\n3. Explain causal mechanisms step-by-step rather than moralizing.';
  }

  const hook = variantSpec?.hookInstruction || 'Open in media res with an anomalous empirical statistic, transaction, or paradox before naming the broader topic.';

  let beats = '';
  if (Array.isArray(variantSpec?.narrativeBeats)) {
    beats = variantSpec.narrativeBeats.join('\n');
  } else if (variantSpec?.narrativeBeats) {
    beats = String(variantSpec.narrativeBeats);
  } else {
    beats = '1. Anomaly Hook (0-15%)\n2. Structural Mechanism (15-45%)\n3. Decisive Evidence / Smoking Gun (45-75%)\n4. Systemic Fallout (75-100%)';
  }

  return template
    .replace(/\{\{channelPersona\}\}/g, persona)
    .replace(/\{\{channelTone\}\}/g, tone)
    .replace(/\{\{antiSlopRules\}\}/g, antiSlop)
    .replace(/\{\{hookInstruction\}\}/g, hook)
    .replace(/\{\{narrativeBeats\}\}/g, beats)
    .replace(/\{\{topic\}\}/g, topic || 'Investigative Financial Autopsy')
    .replace(/\{\{researchDossier\}\}/g, researchDossier || 'Grounded empirical data and verifiable public disclosures.');
}

/**
 * Builds a prompt instructing the sub-agent to output self-contained, high-density HTML5 + inline SVG
 * scene markup using CSS variables and motion utility classes.
 * 
 * @param {Object} sceneBeat - Storyboard scene beat object
 * @param {Object} channelProfile - Active channel profile
 * @param {Object} styleProfile - Active style profile
 * @param {string} [aspectRatio='16:9'] - '16:9' or '9:16'
 * @returns {string} Complete vector scene designer prompt
 */
function buildVectorScenePrompt(sceneBeat = {}, channelProfile = {}, styleProfile = {}, aspectRatio = '16:9') {
  const isVertical = aspectRatio === '9:16' || sceneBeat?.aspectRatio === '9:16';
  const viewBox = isVertical ? '0 0 900 1600' : '0 0 1600 900';
  const agentPromptObj = getAgentPrompt('vectorSceneDesigner');
  const baseInstruction = agentPromptObj?.prompt || DEFAULT_PROMPTS.vectorSceneDesigner.prompt;

  const beatId = sceneBeat?.id || 'beat_001';
  const narration = sceneBeat?.narration || '';
  const visualPrompt = sceneBeat?.visualPrompt || '';
  const chapterTitle = sceneBeat?.chapterTitle || 'ANALYTICAL BREAKDOWN';
  const durationMs = sceneBeat?.durationMs || 6000;

  const channelName = channelProfile?.name || 'Kausal Media';
  const styleName = styleProfile?.name || 'Kausal Media Editorial Papyrus';
  const visualDirectives = channelProfile?.editorialDna?.visualDirectives || '';

  return `${baseInstruction}

TARGET SCENE BEAT SPECIFICATION:
- Scene ID: ${beatId}
- Aspect Ratio: ${isVertical ? '9:16 (Vertical)' : '16:9 (Widescreen)'}
- SVG ViewBox: ${viewBox}
- Target Duration: ${durationMs}ms
- Section / Chapter: ${chapterTitle}
- Channel Brand: ${channelName}
- Visual Style: ${styleName}
${visualDirectives ? `- Visual Directives: ${visualDirectives}\n` : ''}- Narration Beat: "${narration}"
- Visual Concept / Directive: "${visualPrompt}"

MANDATORY OUTPUT FORMAT:
1. Return ONLY the raw HTML5 + inline <svg viewBox="${viewBox}"> block wrapped in a responsive container.
2. Incorporate CSS variables: var(--brand-primary), var(--brand-accent), var(--text-primary), var(--text-secondary), var(--bg-surface), var(--font-display), var(--font-mono).
3. Apply motion utility classes: .vec-card, .vec-stat-huge, .vec-bar-fill, .vec-draw-path, .vec-flow-arrow driven by --scene-progress.
4. Strictly NO <script>, <iframe>, <object>, inline on* event listeners, or external URL links.`;
}

module.exports = {
  listAgentPrompts,
  getAgentPrompt,
  updateAgentPrompt,
  buildChannelScriptPrompt,
  buildVectorScenePrompt
};
