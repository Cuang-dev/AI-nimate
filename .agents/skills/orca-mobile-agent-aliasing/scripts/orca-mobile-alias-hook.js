#!/usr/bin/env node
/**
 * Orca Mobile-Only Agent Aliasing Hook
 *
 * Scopes Gemini, Copilot, and Devin to Mobile clients only,
 * while preserving Antigravity-2, Antigravity-3, and IBM Bob cleanly on Orca Web.
 */

const fs = require('fs');
const { execSync } = require('child_process');

async function main() {
  const logFile = '/home/agent/.config/orca/logs/mobile-alias-hook.log';
  function log(...args) {
    const msg = `[${new Date().toISOString()}] ${args.join(' ')}\n`;
    try {
      fs.appendFileSync(logFile, msg);
    } catch (_) {}
    console.log(...args);
  }

  // 1. Locate Orca main PID
  let pid = null;
  const pidFile = '/home/agent/.config/orca/daemon/daemon-v36.pid';
  try {
    if (fs.existsSync(pidFile)) {
      pid = parseInt(fs.readFileSync(pidFile, 'utf-8').trim(), 10);
    }
  } catch (_) {}

  if (!pid || isNaN(pid)) {
    try {
      const psOut = execSync('pgrep -f "orca-ide --no-sandbox --serve"', { encoding: 'utf-8' }).trim();
      const pids = psOut.split('\n').map(s => parseInt(s.trim(), 10)).filter(Boolean);
      if (pids.length > 0) pid = pids[0];
    } catch (_) {}
  }

  if (!pid) {
    log('ERROR: Orca main server process not found.');
    process.exit(1);
  }
  log(`Found Orca main PID: ${pid}`);

  // 2. Enable V8 inspector if not already listening
  let meta = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      meta = await fetch('http://127.0.0.1:9229/json').then(r => r.json());
      if (meta && meta[0] && meta[0].webSocketDebuggerUrl) break;
    } catch (_) {
      try {
        process._debugProcess(pid);
      } catch (_) {}
      await new Promise(r => setTimeout(r, 600));
    }
  }

  if (!meta || !meta[0] || !meta[0].webSocketDebuggerUrl) {
    log('ERROR: Could not attach V8 inspector on port 9229.');
    process.exit(1);
  }
  log(`Connected to V8 inspector at ${meta[0].webSocketDebuggerUrl}`);

  // 3. Connect CDP WebSocket
  const ws = new WebSocket(meta[0].webSocketDebuggerUrl);

  await new Promise((resolve, reject) => {
    let step = 0;
    const timeout = setTimeout(() => reject(new Error('CDP timeout')), 10000);

    ws.onopen = () => {
      ws.send(JSON.stringify({
        id: 1,
        method: 'Runtime.evaluate',
        params: {
          expression: `
            (() => {
              const handles = process._getActiveHandles();
              for (const h of handles) {
                if (h && h.constructor?.name === "Socket" && h.localPort === 6768) {
                  const sym = Object.getOwnPropertySymbols(h).find(x => x.toString().includes("websocket"));
                  if (sym) {
                    const ws = h[sym];
                    if (ws && typeof ws.listeners === "function") {
                      const listeners = ws.listeners("message");
                      if (listeners && listeners.length > 0) {
                        return listeners[0];
                      }
                    }
                  }
                }
              }
              return null;
            })()
          `
        }
      }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      step++;
      if (step === 1) {
        ws.send(JSON.stringify({
          id: 2,
          method: 'Runtime.getProperties',
          params: { objectId: data.result.result.objectId }
        }));
      } else if (step === 2) {
        const scopesObj = data.result.internalProperties.find(p => p.name === '[[Scopes]]');
        ws.send(JSON.stringify({
          id: 3,
          method: 'Runtime.getProperties',
          params: { objectId: scopesObj.value.objectId }
        }));
      } else if (step === 3) {
        const scope1 = data.result.result.find(p => p.name === '1');
        ws.send(JSON.stringify({
          id: 4,
          method: 'Runtime.getProperties',
          params: { objectId: scope1.value.objectId }
        }));
      } else if (step === 4) {
        const A9 = data.result.result.find(p => p.name === 'A9');
        if (!A9) {
          clearTimeout(timeout);
          reject(new Error('Could not find A9 in scope 1'));
          return;
        }

        ws.send(JSON.stringify({
          id: 5,
          method: 'Runtime.callFunctionOn',
          params: {
            objectId: A9.value.objectId,
            functionDeclaration: `
              function() {
                const server = this;
                const reg = server.dispatcher.registry;

                // Mark mobile devices with scope: 'mobile'
                if (server.deviceRegistry) {
                  const phoneId = "2fb69829-4b01-4d7e-9980-124de975fec4";
                  const dev = server.deviceRegistry.getDevice ? server.deviceRegistry.getDevice(phoneId) : null;
                  if (dev) dev.scope = "mobile";
                  const allDevs = server.deviceRegistry.listDevices ? server.deviceRegistry.listDevices() : [];
                  for (const d of allDevs) {
                    if (d.deviceId === phoneId) d.scope = "mobile";
                  }
                }

                function isMobileCaller(ctx) {
                  if (!ctx) return false;
                  if (ctx.clientKind === "mobile") return true;
                  if (ctx.pairedDeviceId === "2fb69829-4b01-4d7e-9980-124de975fec4") return true;
                  return false;
                }

                // Hook preflight.detectAgents
                const detect = reg.get("preflight.detectAgents");
                if (!server.__origDetectHandler) {
                  server.__origDetectHandler = detect.handler;
                }
                const origDetect = server.__origDetectHandler;
                detect.handler = async (params, ctx) => {
                  const res = await origDetect(params, ctx);
                  const isMobile = isMobileCaller(ctx);
                  if (isMobile) {
                    const set = new Set(Array.isArray(res) ? res : []);
                    set.add("gemini");
                    set.add("copilot");
                    set.add("devin");
                    return Array.from(set);
                  } else {
                    const list = Array.isArray(res) ? res : [];
                    return list.filter(id => id !== "gemini" && id !== "copilot" && id !== "devin");
                  }
                };

                // Hook preflight.refreshAgents
                const refresh = reg.get("preflight.refreshAgents");
                if (refresh) {
                  if (!server.__origRefreshHandler) {
                    server.__origRefreshHandler = refresh.handler;
                  }
                  const origRefresh = server.__origRefreshHandler;
                  refresh.handler = async (params, ctx) => {
                    const res = await origRefresh(params, ctx);
                    const isMobile = isMobileCaller(ctx);
                    if (res && Array.isArray(res.agents)) {
                      if (isMobile) {
                        const set = new Set(res.agents);
                        set.add("gemini");
                        set.add("copilot");
                        set.add("devin");
                        res.agents = Array.from(set);
                      } else {
                        res.agents = res.agents.filter(id => id !== "gemini" && id !== "copilot" && id !== "devin");
                      }
                    }
                    return res;
                  };
                }

                // Hook worktree.create
                const wtCreate = reg.get("worktree.create");
                if (wtCreate) {
                  if (!server.__origWtCreateHandler) {
                    server.__origWtCreateHandler = wtCreate.handler;
                  }
                  const origWtCreate = server.__origWtCreateHandler;
                  wtCreate.handler = async (params, ctx) => {
                    if (params) {
                      if (params.startupAgent === "gemini") params.startupAgent = "antigravity-2";
                      else if (params.startupAgent === "copilot") params.startupAgent = "antigravity-3";
                      else if (params.startupAgent === "devin") params.startupAgent = "bob";
                    }
                    return origWtCreate(params, ctx);
                  };
                }

                // Hook terminal.createAgentSession
                const createSession = reg.get("terminal.createAgentSession");
                if (createSession) {
                  if (!server.__origCreateSessionHandler) {
                    server.__origCreateSessionHandler = createSession.handler;
                  }
                  const origCreateSession = server.__origCreateSessionHandler;
                  createSession.handler = async (params, ctx) => {
                    if (params) {
                      if (params.agent === "gemini") params.agent = "antigravity-2";
                      else if (params.agent === "copilot") params.agent = "antigravity-3";
                      else if (params.agent === "devin") params.agent = "bob";
                    }
                    return origCreateSession(params, ctx);
                  };
                }

                // Hook terminal.ensureAgentSession
                const ensureSession = reg.get("terminal.ensureAgentSession");
                if (ensureSession) {
                  if (!server.__origEnsureSessionHandler) {
                    server.__origEnsureSessionHandler = ensureSession.handler;
                  }
                  const origEnsureSession = server.__origEnsureSessionHandler;
                  ensureSession.handler = async (params, ctx) => {
                    if (params) {
                      if (params.agent === "gemini") params.agent = "antigravity-2";
                      else if (params.agent === "copilot") params.agent = "antigravity-3";
                      else if (params.agent === "devin") params.agent = "bob";
                    }
                    return origEnsureSession(params, ctx);
                  };
                }

                return { success: true };
              }
            `,
            returnByValue: true
          }
        }));
      } else if (step === 5) {
        clearTimeout(timeout);
        ws.close();
        resolve(data.result.result.value);
      }
    };

    ws.onerror = (err) => {
      clearTimeout(timeout);
      reject(err);
    };
  });

  log('Successfully applied mobile-scoped alias RPC hooks to Orca server.');
}

main().catch(err => {
  console.error('Fatal hook error:', err);
  process.exit(1);
});
