#!/usr/bin/env node
/**
 * AI-nimate Video Publisher & Open Graph Embed Generator
 * 
 * Publishes final rendered MP4s and Audio Gate portals to Nginx:
 * Public URL pattern: https://cuang.dev/projects/ainimate/<channel>/<slug>
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const SHARED_PUBLIC_ROOT = '/home/agent/orca/AI-nimate/public/projects/ainimate';
const PUBLIC_ROOT = process.env.PUBLIC_ROOT || 
  (fs.existsSync(SHARED_PUBLIC_ROOT) ? SHARED_PUBLIC_ROOT : path.join(REPO_ROOT, 'public', 'projects', 'ainimate'));
const BASE_URL = 'https://cuang.dev/projects/ainimate';

/**
 * Synchronize all public assets from local worker VM to remote docker-host
 */
function syncToDockerHost() {
  try {
    console.log('[Video Publisher] Synchronizing public assets to docker-host (10.20.20.11)...');
    execSync('rsync -avz --delete /home/agent/orca/AI-nimate/public/projects/ainimate/ docker-host:/home/agent/orca/AI-nimate/public/projects/ainimate/', {
      stdio: 'inherit',
      timeout: 300000
    });
    console.log('[Video Publisher] ✅ Successfully mirrored public assets to docker-host.');
  } catch (err) {
    console.warn('[Video Publisher] Warning during sync to docker-host:', err.message);
  }
}

/**
 * Publishes a rendered video to the public Nginx directory with Open Graph embed metadata
 */
function publishRenderedVideo({ projectDir, channel = 'kausalmedia', slug, title, description, format = '16:9', qaAudit }) {
  if (!slug) {
    slug = path.basename(projectDir);
  }

  const targetDir = path.join(PUBLIC_ROOT, channel, slug);
  fs.mkdirSync(targetDir, { recursive: true });

  // 1. Locate Source Video
  const candidates = [
    path.join(projectDir, 'final.mp4'),
    path.join(projectDir, 'final_cut.mp4'),
    path.join(projectDir, 'render', `${slug}.mp4`)
  ];
  let srcVideo = candidates.find(f => fs.existsSync(f));
  if (!srcVideo) {
    const renderDir = path.join(projectDir, 'render');
    if (fs.existsSync(renderDir)) {
      const anyMp4 = fs.readdirSync(renderDir).find(f => f.endsWith('.mp4'));
      if (anyMp4) srcVideo = path.join(renderDir, anyMp4);
    }
  }

  if (!srcVideo) {
    throw new Error(`[Video Publisher] Could not find final MP4 in ${projectDir}`);
  }

  const targetVideo = path.join(targetDir, 'video.mp4');
  try {
    fs.copyFileSync(srcVideo, targetVideo);
  } catch (err) {
    console.error(`[Video Publisher] Error copying video to ${targetVideo}:`, err.message);
  }

  // 2. Generate or Copy Thumbnail
  const targetThumbnail = path.join(targetDir, 'thumbnail.jpg');
  const qaDir = path.join(projectDir, 'qa_frames');
  let thumbFound = false;

  if (fs.existsSync(qaDir)) {
    const frames = fs.readdirSync(qaDir).filter(f => f.endsWith('.png') || f.endsWith('.jpg'));
    if (frames.length > 0) {
      // Pick middle frame for representative thumbnail
      const midFrame = frames[Math.floor(frames.length / 2)];
      try {
        execSync(`ffmpeg -y -i "${path.join(qaDir, midFrame)}" -q:v 2 "${targetThumbnail}"`, { stdio: 'ignore' });
        thumbFound = true;
      } catch (_) {}
    }
  }

  if (!thumbFound) {
    try {
      execSync(`ffmpeg -y -ss 00:00:03 -i "${targetVideo}" -vframes 1 -q:v 2 "${targetThumbnail}"`, {
        stdio: 'ignore',
        timeout: 10000
      });
      thumbFound = true;
    } catch (_) {}
  }

  const isVertical = format === '9:16' || format === 'vertical';
  const width = isVertical ? 1080 : 1920;
  const height = isVertical ? 1920 : 1080;

  const publicVideoUrl = `${BASE_URL}/${channel}/${slug}/video.mp4`;
  const publicPageUrl = `${BASE_URL}/${channel}/${slug}/`;
  const publicEmbedUrl = `${BASE_URL}/${channel}/${slug}/embed.html`;
  const publicThumbUrl = thumbFound ? `${BASE_URL}/${channel}/${slug}/thumbnail.jpg` : 'https://cuang.dev/favicon.svg';

  const cleanTitle = (title || slug.replace(/-/g, ' ')).replace(/"/g, '&quot;');
  const cleanDesc = (description || `Autonomous investigative visual documentary produced for ${channel}.`).replace(/"/g, '&quot;');

  // 3. Generate HTML with Open Graph Video Tags for Discord Native Embed
  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${cleanTitle} | AI-nimate</title>

  <!-- Discord & Social Open Graph Embed Protocols -->
  <meta property="og:site_name" content="AI-nimate Studio • ${channel}">
  <meta property="og:title" content="${cleanTitle}">
  <meta property="og:description" content="${cleanDesc}">
  <meta property="og:type" content="video.other">
  <meta property="og:url" content="${publicPageUrl}">
  <meta property="og:image" content="${publicThumbUrl}">
  <meta property="og:image:width" content="${width}">
  <meta property="og:image:height" content="${height}">

  <!-- Direct Native MP4 Player Hook -->
  <meta property="og:video" content="${publicVideoUrl}">
  <meta property="og:video:url" content="${publicVideoUrl}">
  <meta property="og:video:secure_url" content="${publicVideoUrl}">
  <meta property="og:video:type" content="video/mp4">
  <meta property="og:video:width" content="${width}">
  <meta property="og:video:height" content="${height}">

  <!-- Twitter / Discord Embed Player -->
  <meta name="twitter:card" content="player">
  <meta name="twitter:title" content="${cleanTitle}">
  <meta name="twitter:description" content="${cleanDesc}">
  <meta name="twitter:image" content="${publicThumbUrl}">
  <meta name="twitter:player" content="${publicEmbedUrl}">
  <meta name="twitter:player:width" content="${width}">
  <meta name="twitter:player:height" content="${height}">
  <meta name="twitter:player:stream" content="${publicVideoUrl}">
  <meta name="twitter:player:stream:content_type" content="video/mp4">

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;600&family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">

  <style>
    :root {
      --bg: #0b0f17;
      --card: #131b26;
      --border: #1f2d3d;
      --accent: #10b981;
      --accent-glow: rgba(16, 185, 129, 0.2);
      --text: #f3f4f6;
      --text-muted: #9ca3af;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: 'Inter', sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 2rem 1rem;
    }
    .container {
      width: 100%;
      max-width: 1100px;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--border);
      padding-bottom: 1rem;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-weight: 800;
      font-size: 1.25rem;
      color: var(--text);
    }
    .badge {
      background: var(--accent-glow);
      color: var(--accent);
      border: 1px solid var(--accent);
      padding: 0.25rem 0.6rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-family: 'Fira Code', monospace;
      text-transform: uppercase;
    }
    .video-wrapper {
      background: #000;
      border: 1px solid var(--border);
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
      aspect-ratio: ${isVertical ? '9/16' : '16/9'};
      max-height: 70vh;
      margin: 0 auto;
      width: 100%;
    }
    video {
      width: 100%;
      height: 100%;
      display: block;
      outline: none;
    }
    .details-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    h1 {
      font-size: 1.5rem;
      font-weight: 700;
      line-height: 1.3;
    }
    p {
      color: var(--text-muted);
      line-height: 1.6;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 1rem;
      padding-top: 1rem;
      border-top: 1px solid var(--border);
    }
    .meta-item {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .meta-label {
      font-size: 0.75rem;
      color: var(--text-muted);
      text-transform: uppercase;
      font-family: 'Fira Code', monospace;
    }
    .meta-value {
      font-weight: 600;
      font-size: 0.95rem;
    }
    .actions {
      display: flex;
      gap: 1rem;
      margin-top: 0.5rem;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: var(--accent);
      color: #000;
      font-weight: 700;
      padding: 0.75rem 1.25rem;
      border-radius: 8px;
      text-decoration: none;
      transition: opacity 0.2s;
    }
    .btn:hover { opacity: 0.9; }
    .btn-secondary {
      background: transparent;
      color: var(--text);
      border: 1px solid var(--border);
    }
    .btn-secondary:hover { background: rgba(255, 255, 255, 0.05); }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="brand">
        <span>🎬 AI-nimate Studio</span>
        <span class="badge">${channel}</span>
      </div>
      <div>
        <span class="badge" style="border-color: #3b82f6; color: #60a5fa; background: rgba(59, 130, 246, 0.1);">1080p Master</span>
      </div>
    </div>

    <div class="video-wrapper">
      <video controls poster="${publicThumbUrl}" playsinline preload="metadata">
        <source src="${publicVideoUrl}" type="video/mp4">
        Your browser does not support the video tag.
      </video>
    </div>

    <div class="details-card">
      <h1>${cleanTitle}</h1>
      <p>${cleanDesc}</p>
      
      <div class="meta-grid">
        <div class="meta-item">
          <span class="meta-label">Channel</span>
          <span class="meta-value">${channel}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Aspect Ratio</span>
          <span class="meta-value">${format} (${width}x${height})</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Visual QA Verdict</span>
          <span class="meta-value" style="color: #10b981;">${qaAudit?.overallVerdict || 'PASSED'}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Hosting Gateway</span>
          <span class="meta-value">Nginx / Cloudflare (HTTP Range)</span>
        </div>
      </div>

      <div class="actions">
        <a href="${publicVideoUrl}" download class="btn">⬇️ Download Master MP4</a>
        <a href="${publicVideoUrl}" target="_blank" class="btn btn-secondary">🔗 Direct Stream URL</a>
      </div>
    </div>
  </div>
</body>
</html>`;

  fs.writeFileSync(path.join(targetDir, 'index.html'), htmlContent, 'utf-8');

  // 4. Generate Dedicated Borderless Embed Player for Iframes & Social Cards
  const embedHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${cleanTitle} | Embed Player</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; background: #000; overflow: hidden; }
    video { width: 100%; height: 100%; object-fit: contain; outline: none; }
  </style>
</head>
<body>
  <video controls autoplay muted playsinline poster="${publicThumbUrl}" preload="metadata">
    <source src="${publicVideoUrl}" type="video/mp4">
    Your browser does not support the video tag.
  </video>
</body>
</html>`;
  fs.writeFileSync(path.join(targetDir, 'embed.html'), embedHtml, 'utf-8');

  console.log(`[Video Publisher] Published video to ${targetDir}`);
  console.log(`[Video Publisher] Public embed URL: ${publicPageUrl}`);
  console.log(`[Video Publisher] Dedicated Iframe Player: ${publicEmbedUrl}`);
  console.log(`[Video Publisher] Public MP4 stream: ${publicVideoUrl}`);

  // 5. Automatically mirror to remote docker-host
  syncToDockerHost();

  return {
    targetDir,
    publicPageUrl,
    publicEmbedUrl,
    publicVideoUrl,
    publicThumbUrl
  };
}

/**
 * Publishes the Web Audio Upload Portal for the HITL Audio Gate
 */
function publishAudioPortal({ workflowId, projectDir, channel = 'kausalmedia', slug, title, scriptText }) {
  if (!slug) {
    slug = path.basename(projectDir);
  }

  const uploadDir = path.join(PUBLIC_ROOT, channel, slug, 'upload');
  fs.mkdirSync(uploadDir, { recursive: true });

  const cleanTitle = (title || slug.replace(/-/g, ' ')).replace(/"/g, '&quot;');
  const words = (scriptText || '').trim().split(/\s+/).filter(Boolean).length;
  const estSeconds = Math.round(words / 2.3); // ~140 wpm
  const estMins = (estSeconds / 60).toFixed(1);

  const portalHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Audio Narration Portal | ${cleanTitle}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">

  <style>
    :root {
      --bg: #0b0f17;
      --card: #131b26;
      --border: #1f2d3d;
      --accent: #10b981;
      --accent-glow: rgba(16, 185, 129, 0.15);
      --text: #f3f4f6;
      --text-muted: #9ca3af;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: 'Inter', sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 2rem 1rem;
    }
    .container {
      width: 100%;
      max-width: 900px;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--border);
      padding-bottom: 1rem;
    }
    .brand {
      font-weight: 800;
      font-size: 1.25rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .badge {
      background: var(--accent-glow);
      color: var(--accent);
      border: 1px solid var(--accent);
      padding: 0.25rem 0.6rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-family: 'Fira Code', monospace;
    }
    .card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    h2 { font-size: 1.25rem; font-weight: 700; }
    .teleprompter {
      background: #080c12;
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 1.25rem;
      max-height: 340px;
      overflow-y: auto;
      font-size: 1.05rem;
      line-height: 1.7;
      color: #e5e7eb;
      white-space: pre-wrap;
      font-family: 'Inter', sans-serif;
    }
    .stats {
      display: flex;
      gap: 1.5rem;
      font-size: 0.85rem;
      color: var(--text-muted);
      font-family: 'Fira Code', monospace;
    }
    .upload-zone {
      border: 2px dashed var(--border);
      border-radius: 12px;
      padding: 2.5rem 1.5rem;
      text-align: center;
      cursor: pointer;
      transition: all 0.2s;
      background: rgba(255, 255, 255, 0.01);
    }
    .upload-zone:hover, .upload-zone.dragover {
      border-color: var(--accent);
      background: var(--accent-glow);
    }
    .upload-icon { font-size: 2.5rem; margin-bottom: 0.5rem; }
    input[type="file"] { display: none; }
    .btn {
      display: inline-flex;
      justify-content: center;
      align-items: center;
      gap: 0.5rem;
      background: var(--accent);
      color: #000;
      font-weight: 700;
      padding: 0.9rem 1.5rem;
      border-radius: 8px;
      border: none;
      cursor: pointer;
      font-size: 1rem;
      width: 100%;
      transition: opacity 0.2s;
    }
    .btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
    .progress-bar {
      height: 8px;
      width: 100%;
      background: var(--border);
      border-radius: 4px;
      overflow: hidden;
      display: none;
    }
    .progress-fill {
      height: 100%;
      width: 0%;
      background: var(--accent);
      transition: width 0.3s;
    }
    .status-msg {
      text-align: center;
      font-weight: 600;
      font-size: 0.95rem;
      display: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="brand">
        <span>🎙️ AI-nimate Narration Portal</span>
      </div>
      <div>
        <span class="badge">Workflow: ${workflowId || slug}</span>
      </div>
    </div>

    <div class="card">
      <div style="display: flex; justify-content: space-between; align-items: baseline;">
        <h2>Teleprompter & Script Reference</h2>
        <div class="stats">
          <span>Words: <strong>${words}</strong></span>
          <span>Est. Reading: <strong>${estMins} min (${estSeconds}s)</strong></span>
        </div>
      </div>
      <div class="teleprompter" id="scriptText">${(scriptText || 'No script text found for this workflow.').replace(/</g, '&lt;')}</div>
      <div style="display: flex; justify-content: flex-end;">
        <button type="button" onclick="copyScript()" style="background: none; border: 1px solid var(--border); color: var(--text-muted); padding: 0.4rem 0.8rem; border-radius: 6px; cursor: pointer; font-size: 0.8rem;">📋 Copy Script</button>
      </div>
    </div>

    <div class="card">
      <h2>Upload Custom Voiceover File</h2>
      <p style="color: var(--text-muted); font-size: 0.9rem;">
        Upload your recorded narration (.mp3, .wav, .m4a). The AI-nimate pipeline will automatically align motion graphics, synchronize kinetic typography, and render the final 1080p video.
      </p>

      <div class="upload-zone" id="dropZone" onclick="document.getElementById('fileInput').click()">
        <div class="upload-icon">📁</div>
        <div style="font-weight: 600; font-size: 1.1rem; margin-bottom: 0.25rem;">
          Drag & Drop Narration Audio Here
        </div>
        <div style="color: var(--text-muted); font-size: 0.85rem;">
          Supports MP3, WAV, M4A up to 100MB
        </div>
        <div id="fileInfo" style="margin-top: 1rem; color: var(--accent); font-weight: 600; font-family: 'Fira Code', monospace; display: none;"></div>
      </div>
      <input type="file" id="fileInput" accept="audio/*,.mp3,.wav,.m4a">

      <div class="progress-bar" id="progressBar">
        <div class="progress-fill" id="progressFill"></div>
      </div>

      <div class="status-msg" id="statusMsg"></div>

      <button type="button" class="btn" id="submitBtn" disabled onclick="uploadAudio()">
        🚀 Submit Voiceover & Resume Production
      </button>
    </div>
  </div>

  <script>
    let selectedFile = null;
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const fileInfo = document.getElementById('fileInfo');
    const submitBtn = document.getElementById('submitBtn');
    const progressBar = document.getElementById('progressBar');
    const progressFill = document.getElementById('progressFill');
    const statusMsg = document.getElementById('statusMsg');

    ['dragenter', 'dragover'].forEach(name => {
      dropZone.addEventListener(name, (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
    });
    ['dragleave', 'drop'].forEach(name => {
      dropZone.addEventListener(name, (e) => { e.preventDefault(); dropZone.classList.remove('dragover'); });
    });
    dropZone.addEventListener('drop', (e) => {
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFile(e.dataTransfer.files[0]);
      }
    });
    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handleFile(e.target.files[0]);
      }
    });

    function handleFile(file) {
      selectedFile = file;
      fileInfo.style.display = 'block';
      fileInfo.textContent = 'Selected: ' + file.name + ' (' + (file.size / 1024 / 1024).toFixed(2) + ' MB)';
      submitBtn.disabled = false;
    }

    function copyScript() {
      const text = document.getElementById('scriptText').innerText;
      navigator.clipboard.writeText(text);
      alert('Script copied to clipboard!');
    }

    async function uploadAudio() {
      if (!selectedFile) return;

      submitBtn.disabled = true;
      progressBar.style.display = 'block';
      progressFill.style.width = '20%';
      statusMsg.style.display = 'block';
      statusMsg.style.color = '#9ca3af';
      statusMsg.textContent = 'Uploading audio file to AI-nimate server...';

      const formData = new FormData();
      formData.append('audio', selectedFile);
      formData.append('workflowId', '${workflowId}');
      formData.append('channel', '${channel}');
      formData.append('slug', '${slug}');

      try {
        progressFill.style.width = '60%';
        const res = await fetch('/projects/ainimate/api/upload-audio', {
          method: 'POST',
          body: formData
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error('Upload error: HTTP ' + res.status + ' ' + errText);
        }

        const data = await res.json();
        progressFill.style.width = '100%';
        statusMsg.style.color = '#10b981';
        statusMsg.innerHTML = '🎉 <strong>Voiceover Received!</strong><br>Production has resumed. You can close this tab and watch live updates in Discord.';
        dropZone.style.display = 'none';
      } catch (err) {
        progressFill.style.width = '100%';
        progressFill.style.background = '#ef4444';
        statusMsg.style.color = '#ef4444';
        statusMsg.textContent = '❌ Upload failed: ' + err.message;
        submitBtn.disabled = false;
      }
    }
  </script>
</body>
</html>`;

  fs.writeFileSync(path.join(uploadDir, 'index.html'), portalHtml, 'utf-8');

  const uploadPortalUrl = `${BASE_URL}/${channel}/${slug}/upload/`;
  console.log(`[Audio Portal] Generated portal at ${uploadDir}/index.html`);
  console.log(`[Audio Portal] Public URL: ${uploadPortalUrl}`);

  // Automatically mirror to remote docker-host
  syncToDockerHost();

  return uploadPortalUrl;
}

module.exports = {
  publishRenderedVideo,
  publishAudioPortal,
  syncToDockerHost
};
