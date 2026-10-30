---
description: Terminal environment column detection and formatting constraints for CLI output
globs: "*"
alwaysApply: true
---

# Terminal Output Formatting & Column Constraints

1. **Terminal Column Inspection**:
   - Determine terminal width via `node scripts/terminal-utils.js` or `tput cols`.
   - Default column budget is **80 characters** (safe content width: **76 characters**).

2. **Diagram Guidelines**:
   - Never output raw Mermaid diagrams in terminal/CLI environments. Terminal markdown parsers fail on subgraphs, ampersands (`&`), and multi-column boxes.
   - Use clean, fixed-width linear ASCII/Unicode diagrams strictly $\le 76$ characters wide.
   - Alternatively, use structured Markdown tables.
