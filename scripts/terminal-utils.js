#!/usr/bin/env node

/**
 * AI-nimate Terminal Environment & Column Inspector
 * 
 * Provides runtime inspection of the current terminal width (columns),
 * row height, and formatting bounds for CLI agents and terminal renderers.
 */

const { execSync } = require('child_process');

function getTerminalDimensions() {
  let columns = process.stdout.columns || process.stderr.columns || null;
  let rows = process.stdout.rows || process.stderr.rows || null;

  // Fallback 1: Query tput
  if (!columns || !rows) {
    try {
      if (!columns) {
        const tCols = parseInt(execSync('tput cols 2>/dev/null', { encoding: 'utf-8' }).trim(), 10);
        if (!isNaN(tCols) && tCols > 0) columns = tCols;
      }
      if (!rows) {
        const tLines = parseInt(execSync('tput lines 2>/dev/null', { encoding: 'utf-8' }).trim(), 10);
        if (!isNaN(tLines) && tLines > 0) rows = tLines;
      }
    } catch (_) {}
  }

  // Fallback 2: Query stty size
  if (!columns || !rows) {
    try {
      const sttyOut = execSync('stty size 2>/dev/null', { encoding: 'utf-8' }).trim().split(/\s+/);
      if (sttyOut.length === 2) {
        const r = parseInt(sttyOut[0], 10);
        const c = parseInt(sttyOut[1], 10);
        if (!rows && !isNaN(r) && r > 0) rows = r;
        if (!columns && !isNaN(c) && c > 0) columns = c;
      }
    } catch (_) {}
  }

  // Fallback 3: Environment variables
  if (!columns && process.env.COLUMNS) {
    const c = parseInt(process.env.COLUMNS, 10);
    if (!isNaN(c) && c > 0) columns = c;
  }
  if (!rows && process.env.LINES) {
    const r = parseInt(process.env.LINES, 10);
    if (!isNaN(r) && r > 0) rows = r;
  }

  // Standard safe terminal defaults
  columns = columns || 80;
  rows = rows || 24;

  // Compute safe content margins for diagrams and tables
  const safeContentWidth = Math.max(40, columns - 4);

  return {
    columns,
    rows,
    safeContentWidth,
    isStandard80Col: columns <= 80,
    isWide: columns >= 120
  };
}

function printReport() {
  const dim = getTerminalDimensions();
  console.log(`[terminal-utils] Active Terminal Dimensions:`);
  console.log(`  Columns (Width):     ${dim.columns} chars`);
  console.log(`  Rows (Height):       ${dim.rows} lines`);
  console.log(`  Safe Diagram Width:  ${dim.safeContentWidth} chars (to prevent wrapping)`);
  console.log(`  Layout Mode:         ${dim.isStandard80Col ? 'Standard 80-col (narrow)' : dim.isWide ? 'Wide 120-col+' : 'Medium'}`);
}

if (require.main === module) {
  printReport();
}

module.exports = { getTerminalDimensions };
