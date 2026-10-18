const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const {
  recordWorkflow,
  updateWorkflow,
  cancelWorkflow,
  deleteWorkflow,
  getActiveWorkflow,
  getPastWorkflows,
  getWorkflow
} = require('../scripts/workflow-ledger');
const { listAgentPrompts, getAgentPrompt, updateAgentPrompt } = require('../scripts/prompt-manager');
const { listStyles, getStyle } = require('../styles/style-manager');
const {
  state,
  stopActiveWorkflow,
  deleteProject,
  listAllProjects,
  renderMainMenu,
  renderNewProjectMenu,
  renderWorkflowsMenu,
  renderDeleteProjectsMenu,
  renderConfirmDeleteMenu,
  renderTopicSelectionMenu,
  renderAgentsMenu,
  getUnusedChannelIdeas,
  markIdeaUsed,
  chunkText,
  linkAndResumeCustomAudio
} = require('../scripts/telegram-bot');

test('workflow ledger correctly records, updates, cancels, and deletes workflows', () => {
  const testWf = recordWorkflow({
    project: 'test-ledger-proj',
    topic: 'Test Ledger Topic',
    style: 'investigative-documentary',
    status: 'script'
  });

  assert.ok(testWf.id);
  assert.equal(testWf.project, 'test-ledger-proj');
  assert.equal(testWf.status, 'script');

  const updated = updateWorkflow(testWf.id, { status: 'completed', videoPath: 'final.mp4' });
  assert.equal(updated.status, 'completed');
  assert.equal(updated.progress, 100);
  assert.ok(updated.completedAt);

  const found = getWorkflow(testWf.id);
  assert.equal(found.project, 'test-ledger-proj');

  // Test cancel
  const cancelled = cancelWorkflow(testWf.id);
  assert.equal(cancelled.status, 'cancelled');
  assert.equal(cancelled.stage, 'Interrupted by user');

  // Test delete
  const deleted = deleteWorkflow(testWf.id);
  assert.ok(deleted);
  assert.equal(getWorkflow(testWf.id), null);
});

test('prompt manager lists, gets, and updates agent prompts', () => {
  const list = listAgentPrompts();
  assert.ok(list.length >= 5);
  const ids = list.map(a => a.id);
  assert.ok(ids.includes('orchestrator'));
  assert.ok(ids.includes('writer'));
  assert.ok(ids.includes('director'));
  assert.ok(ids.includes('researcher'));
  assert.ok(ids.includes('asset_hub'));

  const origWriter = getAgentPrompt('writer');
  assert.ok(origWriter.prompt.includes('Scriptwriter'));

  updateAgentPrompt('writer', 'Custom test writer prompt');
  assert.equal(getAgentPrompt('writer').prompt, 'Custom test writer prompt');

  // Restore prompt
  updateAgentPrompt('writer', origWriter.prompt);
});

test('style guidelines include modular sub-guidelines for character, background, and data', () => {
  const doc = getStyle('investigative-documentary');
  assert.ok(doc.background);
  assert.equal(doc.background.pattern, 'megamendung');
  assert.ok(doc.character);
  assert.equal(doc.character.mode, 'silhouette-editorial');
  assert.ok(doc.dataGraphics);
  assert.ok(doc.typography);
  assert.ok(doc.pacing);
  assert.ok(Array.isArray(doc.antiSlopRules));
});

test('stopActiveWorkflow halts active jobs and cancels ledger status', async () => {
  const wf = recordWorkflow({
    project: 'test-stop-job',
    topic: 'Test Stop Job',
    style: 'tech-deepdive',
    status: 'choreography'
  });

  state.activeJob = wf;
  const stopped = await stopActiveWorkflow();

  assert.ok(stopped);
  assert.equal(stopped.id, wf.id);
  assert.equal(state.activeJob, null);

  const found = getWorkflow(wf.id);
  assert.equal(found.status, 'cancelled');

  // Cleanup
  deleteWorkflow(wf.id);
});

test('deleteProject removes workspace files and workflow record', async () => {
  const slug = 'test-delete-project-temp';
  const projectDir = path.join(__dirname, '..', 'projects', slug);
  fs.mkdirSync(projectDir, { recursive: true });
  fs.writeFileSync(path.join(projectDir, 'dummy.txt'), 'hello');

  const wf = recordWorkflow({
    project: slug,
    topic: 'Temp Project for Deletion',
    style: 'financial-explainer',
    status: 'completed'
  });

  assert.ok(fs.existsSync(projectDir));
  assert.ok(getWorkflow(wf.id));

  const result = await deleteProject(slug);
  assert.equal(result.success, true);
  assert.equal(result.dirDeleted, true);
  assert.equal(fs.existsSync(projectDir), false);
  assert.equal(getWorkflow(wf.id), null);
});

test('menu renderers include workflow controls and delete confirmations', () => {
  const wfMenu = renderWorkflowsMenu();
  assert.ok(wfMenu.text.includes('Production Workflows'));
  const hasDeleteBtn = wfMenu.reply_markup.inline_keyboard.some(row =>
    row.some(btn => btn.callback_data === 'menu:delete_projects')
  );
  assert.ok(hasDeleteBtn, 'Workflows menu must have Delete Projects button');

  const delMenu = renderDeleteProjectsMenu();
  assert.ok(delMenu.text.includes('Project Management & Deletion'));
  assert.ok(delMenu.reply_markup.inline_keyboard.length > 0);

  const confirmMenu = renderConfirmDeleteMenu('dummy-test-proj');
  assert.ok(confirmMenu.text.includes('Confirm Project Deletion'));
  assert.ok(confirmMenu.reply_markup.inline_keyboard.some(row =>
    row.some(btn => btn.callback_data === 'flow:do_delete:dummy-test-proj')
  ));
});

test('renderNewProjectMenu provides strictly channel names in step 1', () => {
  const newProjMenu = renderNewProjectMenu();
  assert.ok(newProjMenu.text.includes('Start a New Production (Step 1/2: Choose Channel)'));
  assert.ok(newProjMenu.text.includes('Select the channel profile'));

  const buttons = newProjMenu.reply_markup.inline_keyboard.flat();
  const hasQuickCreate = buttons.some(btn => btn.callback_data?.startsWith('flow:quick_create:'));
  const hasCustomTopic = buttons.some(btn => btn.callback_data === 'flow:ask_custom_topic');
  const hasBackBtn = buttons.some(btn => btn.callback_data === 'menu:main');
  const channelButtons = buttons.filter(btn => btn.callback_data?.startsWith('flow:wizard_channel:'));

  // Strictly only channel names and back button
  assert.strictEqual(hasQuickCreate, false, 'Must NOT contain quick presets in channel selection submenu');
  assert.strictEqual(hasCustomTopic, false, 'Must NOT contain standalone custom topic button in channel selection submenu');
  assert.ok(channelButtons.length >= 1, 'Step 1 must present selectable channel profile buttons');
  assert.ok(channelButtons.some(btn => btn.callback_data === 'flow:wizard_channel:kausalmedia'), 'Must include kausalmedia channel button');
  assert.ok(hasBackBtn, 'Must contain back to menu button');

  // Verify Main Menu and Workflows Menu have Start New Project button
  const mainMenu = renderMainMenu(false);
  const mainButtons = mainMenu.reply_markup.inline_keyboard.flat();
  assert.ok(mainButtons.some(btn => btn.callback_data === 'flow:new_project'), 'Main menu must have Start New Project button');

  const collapsedMenu = renderMainMenu(true);
  const collapsedButtons = collapsedMenu.reply_markup.inline_keyboard.flat();
  assert.ok(collapsedButtons.some(btn => btn.callback_data === 'flow:new_project'), 'Collapsed menu must have Start New Project button');

  const wfMenu = renderWorkflowsMenu();
  const wfButtons = wfMenu.reply_markup.inline_keyboard.flat();
  assert.ok(wfButtons.some(btn => btn.callback_data === 'flow:new_project'), 'Workflows menu must have Start New Project button');
});

test('2-step project wizard renders 4 unused weekly topic ideas and 5th custom briefing option', () => {
  const topicMenu = renderTopicSelectionMenu('kausalmedia');
  assert.ok(topicMenu.text.includes('New Project: Kausal Media (Step 2/2: Choose Topic)'));
  assert.ok(topicMenu.text.includes('Unused Topic Ideas for This Week'));
  assert.ok(topicMenu.text.includes('Option 5: Custom Topic Briefing'));
  assert.ok(topicMenu.text.includes('any amount of detail'));

  const buttons = topicMenu.reply_markup.inline_keyboard.flat();
  const topicSuggestions = buttons.filter(btn => btn.callback_data?.startsWith('flow:wizard_topic:kausalmedia:'));
  assert.strictEqual(topicSuggestions.length, 4, 'Must offer exactly 4 unused topic suggestions for the week');

  const customBriefingBtn = buttons.find(btn => btn.callback_data === 'flow:wizard_custom:kausalmedia');
  assert.ok(customBriefingBtn, 'Must have button to enter custom briefing');
  assert.ok(customBriefingBtn.text.includes('5. Custom Topic Briefing'));

  const refreshBtn = buttons.find(btn => btn.callback_data?.startsWith('flow:wizard_refresh:kausalmedia:'));
  assert.ok(refreshBtn, 'Must have 🔄 Refresh Ide Baru button');
  assert.ok(refreshBtn.text.includes('Refresh Ide Baru'));

  const hasBackToChannelsBtn = buttons.some(btn => btn.callback_data === 'flow:new_project');
  assert.ok(hasBackToChannelsBtn, 'Must have back button to Step 1 channel selector');

  // Test Refresh/Pagination functionality
  const page2Menu = renderTopicSelectionMenu('kausalmedia', 4);
  const page2Buttons = page2Menu.reply_markup.inline_keyboard.flat();
  const page2Suggestions = page2Buttons.filter(btn => btn.callback_data?.startsWith('flow:wizard_topic:kausalmedia:'));
  assert.strictEqual(page2Suggestions.length, 4, 'Page 2 must offer 4 unused ideas');
  // First idea on page 2 should be different from first idea on page 1
  assert.notStrictEqual(page2Suggestions[0].callback_data, topicSuggestions[0].callback_data, 'Page 2 should show different ideas than Page 1');

  // Test dynamic removal and replenishing when an idea is marked used
  const initialIdeas = getUnusedChannelIdeas('kausalmedia', 4);
  const firstIdeaKey = initialIdeas[0].key;
  markIdeaUsed('kausalmedia', firstIdeaKey);

  const updatedMenu = renderTopicSelectionMenu('kausalmedia');
  const updatedButtons = updatedMenu.reply_markup.inline_keyboard.flat();
  const updatedSuggestions = updatedButtons.filter(btn => btn.callback_data?.startsWith('flow:wizard_topic:kausalmedia:'));
  assert.strictEqual(updatedSuggestions.length, 4, 'Must still return 4 unused ideas after 1 is used');
  assert.ok(!updatedSuggestions.some(btn => btn.callback_data === `flow:wizard_topic:kausalmedia:${firstIdeaKey}`), 'Used idea must be excluded');

  // Verify Nusantara Archive topic menu as well
  const nusantaraMenu = renderTopicSelectionMenu('nusantaraarchive');
  assert.ok(nusantaraMenu.text.includes('New Project: Nusantara Archive (Step 2/2: Choose Topic)'));
  const nusantaraButtons = nusantaraMenu.reply_markup.inline_keyboard.flat();
  const nusantaraSuggestions = nusantaraButtons.filter(btn => btn.callback_data?.startsWith('flow:wizard_topic:nusantaraarchive:'));
  assert.strictEqual(nusantaraSuggestions.length, 4, 'Nusantara Archive must offer 4 unused ideas');
  assert.ok(nusantaraButtons.some(btn => btn.callback_data === 'flow:wizard_custom:nusantaraarchive'));
  assert.ok(nusantaraButtons.some(btn => btn.callback_data?.startsWith('flow:wizard_refresh:nusantaraarchive:')), 'Nusantara Archive must have Refresh button');
});

test('renderAgentsMenu displays available agy, agy2, and agy3 agent profiles', () => {
  const menu = renderAgentsMenu();
  assert.ok(menu.text.includes('Antigravity Agent Profile Switcher'));
  assert.ok(menu.text.includes('agy'));
  assert.ok(menu.text.includes('agy2'));
  assert.ok(menu.text.includes('agy3'));

  const buttons = menu.reply_markup.inline_keyboard.flat();
  assert.ok(buttons.some(b => b.callback_data === 'agent:set:agy'));
  assert.ok(buttons.some(b => b.callback_data === 'agent:set:agy2'));
  assert.ok(buttons.some(b => b.callback_data === 'agent:set:agy3'));
  assert.ok(buttons.some(b => b.callback_data === 'menu:main'));

  // Main menu must have Agent button
  const mainMenu = renderMainMenu(false);
  const mainButtons = mainMenu.reply_markup.inline_keyboard.flat();
  assert.ok(mainButtons.some(b => b.callback_data === 'menu:agents'), 'Main menu must include Agent button');
});

test('chunkText splits long narration scripts safely under Telegram limits', () => {
  const longScript = 'Paragraf pertama naskah investigasi kausal.\n\n'.repeat(100);
  assert.ok(longScript.length > 4000, 'Test script should exceed Telegram single message limit');

  const chunks = chunkText(longScript, 2500);
  assert.ok(chunks.length >= 2, 'Should be split into at least 2 chunks');
  chunks.forEach(chunk => {
    assert.ok(chunk.length <= 2500, `Each chunk (${chunk.length}) must be <= 2500 characters`);
  });

  // Short script should produce 1 chunk
  const shortChunks = chunkText('Naskah pendek 1 paragraf saja.');
  assert.equal(shortChunks.length, 1);
});

test('linkAndResumeCustomAudio resolves custom audio filename or path in project directory', async () => {
  const slug = 'test-custom-audio-project';
  const projectDir = path.join(__dirname, '..', 'projects', slug);
  fs.mkdirSync(projectDir, { recursive: true });

  const { execSync } = require('child_process');
  const customWav = path.join(projectDir, 'my_custom_narration.mp3');
  try {
    execSync(`ffmpeg -y -f lavfi -i "sine=frequency=1000:duration=1" -c:a libmp3lame "${customWav}"`, { stdio: 'pipe' });
  } catch (_) {
    fs.writeFileSync(customWav, Buffer.alloc(2048));
  }

  const wf = recordWorkflow({
    project: slug,
    topic: 'Test Custom Audio',
    style: 'investigative-documentary',
    status: 'audio_wait'
  });

  state.waitingForAudio = {
    workflowId: wf.id,
    projectDir,
    topic: wf.topic,
    style: wf.style,
    format: '16:9'
  };

  // Test 1: Non-existent file fails gracefully
  const failRes = await linkAndResumeCustomAudio('test-chat-id', wf.id, projectDir, wf.topic, wf.style, '16:9', 'nonexistent.wav');
  assert.equal(failRes, false);
  assert.ok(state.waitingForAudio, 'State must remain active on file not found');

  // Test 2: Existing file specified by basename
  const successRes = await linkAndResumeCustomAudio('test-chat-id', wf.id, projectDir, wf.topic, wf.style, '16:9', 'my_custom_narration.mp3');
  assert.equal(successRes, true);
  assert.ok(fs.existsSync(path.join(projectDir, 'voiceover.mp3')));
  assert.ok(fs.existsSync(path.join(projectDir, 'audio.mp3')));

  // Cleanup: Kill background worker spawned by resumeWorkflowWithAudio to prevent dangling 60s background jobs
  const updatedWf = getWorkflow(wf.id);
  if (updatedWf && updatedWf.pid) {
    try { process.kill(updatedWf.pid, 'SIGKILL'); } catch (_) {}
  }
  await deleteProject(slug);
});

after(async () => {
  await stopActiveWorkflow();
});

