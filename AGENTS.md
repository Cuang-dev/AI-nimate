# Antigravity Agent Guidelines for AI-nimate

## Terminal Column Detection & Formatting Rules

When running inside CLI/terminal environments (e.g. `antigravity-cli`), all agents MUST adhere to terminal width constraints:

1. **Terminal Column Detection**:
   - Inspect the current terminal columns using `node scripts/terminal-utils.js`, `tput cols`, or `process.stdout.columns`.
   - Default column budget is **80 characters** (safe line budget: $\le 76$ characters).

2. **Flowchart & Diagram Rendering Policy**:
   - **Never emit raw Mermaid code blocks (`flowchart`, `graph`, etc.)** when responding to users in CLI/terminal interfaces. Terminal markdown renderers convert Mermaid blocks using box-drawing character engines that split on ampersands (`&`), choke on subgraphs, and abort midway, dumping mangled lines.
   - Use **terminal-safe UTF-8 linear text pipelines** (`[STEP]`, `│`, `├──►`, `└──►`) or structured Markdown tables.
   - Constrain all text diagrams and tables to a strict maximum width of **76 characters** to guarantee zero wrapping on standard 80-column terminal screens.

3. **Codebase Navigation**:
   - Always provide clickable links using the `file://` scheme for file references.

## 4. Temporal Anchoring & Online Search Recency Rules

All agents must strictly guard against temporal drift and stale parametric data:

1. **Explicit Temporal Anchor Detection**:
   - Always inspect the current system date from runtime metadata (Current Year: 2026).
   - Never assume the world ended in 2024. Today is late 2026.

2. **Strict Web Search Temporal Forcing**:
   - Whenever asked to search online for "latest", "most recent", "state of the art", or current recommendations, search queries MUST explicitly include temporal anchors for the current calendar year and immediately preceding year (`2025`, `2026`).
   - Never search using stale keywords (`2024`) unless performing an explicit historical retrospective.

3. **Release Date Verification Gate**:
   - When recommending open-weights models, software, libraries, or APIs, agents MUST verify and state the release date and month.
   - Prohibit presenting pre-2025 artifacts as "latest" or "new" without disclosing their historical age.

