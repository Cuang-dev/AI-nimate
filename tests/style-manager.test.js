const { test } = require('node:test');
const assert = require('node:assert/strict');
const { listStyles, getStyle, applyStyleToStoryboard, getStyleDirectivesForPrompt } = require('../styles/style-manager');

test('listStyles returns all predefined style profiles', () => {
  const styles = listStyles();
  assert.ok(styles.length >= 2, `Expected at least 2 styles, got ${styles.length}`);
  const ids = styles.map(s => s.id);
  assert.ok(ids.includes('investigative-documentary'));
  assert.ok(ids.includes('kausalmedia'));
});

test('getStyle loads specified style and falls back gracefully', () => {
  const doc = getStyle('investigative-documentary');
  assert.equal(doc.id, 'investigative-documentary');
  assert.equal(doc.background.pattern, 'megamendung');
  assert.equal(doc.palette.name, 'navy-gold');

  const fallback = getStyle('non-existent-style');
  assert.equal(fallback.id, 'investigative-documentary');
});

test('applyStyleToStoryboard injects default background and palette into scenes', () => {
  const rawSb = {
    title: 'Test Story',
    style: 'kausalmedia',
    scenes: [
      { id: 's1', startTime: 0, endTime: 5, layout: 'split-60-40' },
      { id: 's2', startTime: 5, endTime: 10, layout: 'tilted-desk', environment: { vignette: 'ancient-oil-lamp' } }
    ]
  };

  const styled = applyStyleToStoryboard(rawSb);
  assert.equal(styled.style, 'kausalmedia');
  assert.equal(styled.scenes[0].environment.palette, 'papyrus-sumi-ink');
  assert.equal(styled.scenes[0].environment.pattern, 'batik-parang');
  // s2 preserves explicit vignette
  assert.equal(styled.scenes[1].environment.vignette, 'ancient-oil-lamp');
  assert.equal(styled.scenes[1].environment.palette, 'papyrus-sumi-ink');
});

test('getStyleDirectivesForPrompt produces clear prompt instructions for sub-agents', () => {
  const prompt = getStyleDirectivesForPrompt('investigative-documentary');
  assert.ok(prompt.includes('Investigative Documentary'));
  assert.ok(prompt.includes('navy-gold'));
  assert.ok(prompt.includes('Pacing Directive'));
  assert.ok(prompt.includes('Anti-Slop'));
});
