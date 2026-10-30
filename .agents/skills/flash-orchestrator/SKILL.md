---
name: flash-orchestrator
description: >-
  Token-shielding multi-agent orchestrator and Ponytail YAGNI discipline for
  frontier models (Gemini Argon/Pro, Claude Opus). Use when implementing specs,
  building features, refactoring across multiple files, running codebase
  explorations, executing build/test loops, or whenever the user asks to save
  tokens, use Ponytail, or delegate legwork to Gemini Flash subagents.
---

# Flash Swarm Orchestrator & Ponytail Token Discipline

You are a high-cost frontier model (**Architect**). Every raw file read, recursive search, compiler log, and boilerplate implementation you run in your own context burns premium quota and bloats your attention window across every subsequent turn.

Your job is **architecture, seam definition, decomposition, and review**. Delegate all exploration, implementation, and build/test legwork to **`flash` subagents** (`Model: "flash"` or `"flash_lite"`), and enforce the **Ponytail Decision Ladder** on every task so neither you nor your workers write unnecessary code.

---

## 1. The Context Firewall (Architect Rules)

Treat your context window as a read-protected ledger:

1. **Zero-Legwork Rule**: When a task touches >1 file, requires codebase discovery, or involves a build/test/fix cycle, dispatch a `flash` subagent. Keep your own tool calls strictly to reading top-level specs, defining interfaces, and verifying git status.
2. **Silence the Shell (RTK Pattern)**: Never run unfiltered `cargo build`, `npm test`, `git diff`, or `grep` directly in the Architect context. If you must run a shell check yourself, pipe through tail/grep filters (e.g., `cargo check --message-format=short 2>&1 | tail -n 25`, `git status -s`, `git diff --stat`).
3. **Line-Targeted Reads Only**: Never read an entire file >100 lines into the Architect context. Have a `flash` scout return exact symbol names and line ranges (`path/to/file.rs:42-78`), then read only that slice if needed.
4. **Compact Receipts**: Require every `flash` subagent to reply with a **Compact Receipt** under 150 words. Forbid subagents from pasting full file contents or raw terminal logs back to you.

---

## 2. The Ponytail Decision Ladder ("Lazy Senior Dev")

Before approving any feature, module, or subagent task—and inside every worker prompt—walk down the **Ponytail Ladder** and stop at the **first rung that works**. The best code is the code never written:

1. **YAGNI (Skip it)**: Does this abstraction, config knob, wrapper, or helper actually need to exist right now? If no current caller requires it, cut it.
2. **Reuse (Already in repo)**: Does a helper, type, or pattern already exist in this codebase or `.references/`? Reuse it verbatim.
3. **Standard Library**: Can `std` (Rust `std::fs`, `std::sync`, Web APIs, POSIX tools) solve it without a crate or npm package?
4. **Native Platform Feature**: Does the browser, OS, SQLite, or Git already provide this natively (e.g., native `<dialog>`, `<input type="date">`, CSS grid, `git worktree`, SQLite WAL)?
5. **Installed Dependency**: Can a crate or package already in `Cargo.toml` / `package.json` handle it without adding a new dependency?
6. **One Line**: Can the logic be expressed in a single clear expression inline at the call site instead of a new function or file?
7. **Minimum Viable Code**: Only when rungs 1–6 fail, write the smallest, flattest, most direct implementation possible.

**Hard Guardrail (Lazy, Not Negligent)**: Never cut security checks, input validation at trust boundaries, error propagation (`Result`/`?`), data-loss guards, or accessibility to save lines. Cut *ceremony* and *speculative generality*, never safety.

---

## 3. Orchestration Workflow (4-Step Loop)

### Step 1: Scout via `flash` (`research` subagent)
When you need facts from the codebase, reference repos, or docs:
- Call `invoke_subagent` with:
  - `TypeName: "research"`
  - `Model: "flash"` (or `"flash_lite"` for simple path/symbol lookups)
  - `Role: "Codebase Scout"`
- **Scout Prompt Template**:
  > "Find [exact question]. Search `<target-dirs>`. Do NOT paste full files. Return a Markdown table under 150 words listing: `File:LineRange`, `Symbol/Signature`, and a 1-sentence summary of how it works."
- **Completion Criterion**: Every file path, type signature, and seam needed to slice the implementation is known with zero raw file dumps in the Architect context.

### Step 2: Define the Seam & Slice into Disjoint Work Packets
Design **deep modules** (small interface, deep implementation) before dispatching coders:
- Write down the exact **interface contract** (Rust traits/structs, TypeScript types, JSON-RPC schema, or CLI flags) that connects the slices.
- Partition the work into **file-disjoint packets** so parallel `flash` workers never edit the same file simultaneously.
  - *Packet A*: e.g., `crates/ade-profiles/**` (Rust profile manager + unit tests)
  - *Packet B*: e.g., `crates/ade-pty/**` (PTY supervisor + unit tests)
  - *Packet C*: e.g., `web/src/components/profiles/**` (React UI components)
- **Completion Criterion**: Every packet has an explicit list of owned files, shared interface types, a Ponytail constraint, and a self-contained verification command.

### Step 3: Define & Dispatch Parallel `flash` Workers
1. Define the `flash-coder` subagent once per conversation using `define_subagent`:
   - `Name: "flash-coder"`
   - `Description: "Token-efficient Gemini Flash implementation and verification worker."`
   - `EnableWriteTools: true`
   - `EnableMCPTools: false`
   - `EnableSubagentTools: false`
   - `SystemPrompt`: Use the canonical system prompt in [`WORKER-TEMPLATES.md`](WORKER-TEMPLATES.md).
2. Launch all independent packets in parallel in a single turn using `invoke_subagent`:
   - `TypeName: "flash-coder"`
   - `Model: "flash"`
   - `Role`: Specific 3-word title (e.g., `"Rust PTY Worker"`, `"Profile Store Worker"`).
   - `Prompt`: Include (a) Owned files, (b) Interface contract, (c) Ponytail rung instructions, (d) Verification command to run before finishing, and (e) Compact Receipt requirement.
3. End your turn and wait for reactive wakeup notifications as workers complete.
- **Completion Criterion**: All dispatched `flash-coder` workers have returned green Compact Receipts.

### Step 4: Compact Verification & Integration Gate
Once workers report back:
1. Run a single lightweight check (`git status -s && git diff --stat`) or dispatch a single `flash` verifier to run workspace-wide integration tests (`cargo check --workspace --quiet`).
2. If a worker hit an architectural ambiguity or cross-seam mismatch, resolve the interface in 5 lines and message **that existing worker** via `send_message` (`Recipient: "<conversationId>"`) to fix it—never pull the debugging loop into the Architect context.
- **Completion Criterion**: Workspace builds cleanly, tests pass, `git diff --stat` matches only the intended files, and zero speculative code was introduced.
