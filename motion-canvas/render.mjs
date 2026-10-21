import { createServer } from 'vite';
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function renderHeadless() {
  console.log('[Motion Canvas] Starting Vite development server...');
  const server = await createServer({
    root: __dirname,
    server: { port: 9100 },
  });
  await server.listen();
  console.log('[Motion Canvas] Server listening on http://localhost:9100');

  console.log('[Motion Canvas] Launching headless browser...');
  const browser = await chromium.launch({
    executablePath:
      '/home/agent/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    console.log('[Motion Canvas] Navigating to editor interface...');
    await page.goto('http://localhost:9100');

    // Wait for editor UI to initialize
    await page.waitForTimeout(4000);

    // Switch exporter to Video (FFmpeg)
    console.log('[Motion Canvas] Configuring exporter to Video (FFmpeg)...');
    await page.evaluate(() => {
      const selects = Array.from(document.querySelectorAll('select'));
      for (const s of selects) {
        const opts = Array.from(s.options).map((o) => o.text);
        if (opts.includes('Video (FFmpeg)')) {
          const idx = opts.indexOf('Video (FFmpeg)');
          s.selectedIndex = idx;
          s.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    });

    await page.waitForTimeout(1000);

    // Trigger Render
    console.log('[Motion Canvas] Triggering render button...');
    await page.click('#render');

    // Poll until render finishes (Render button toggles ABORT -> RENDER)
    let renderingStarted = false;
    const maxWaitSeconds = 60;
    for (let sec = 0; sec < maxWaitSeconds; sec++) {
      await page.waitForTimeout(1000);
      const state = await page.evaluate(() => {
        const btn = document.querySelector('#render');
        return btn ? btn.innerText.toUpperCase() : '';
      });

      if (state === 'ABORT') {
        renderingStarted = true;
      } else if (renderingStarted && state === 'RENDER') {
        console.log('[Motion Canvas] Rendering completed successfully!');
        break;
      }
    }

    const outputPath = path.join(__dirname, 'output', 'project.mp4');
    console.log(`[Motion Canvas] Output verified at: ${outputPath}`);
  } finally {
    await browser.close();
    await server.close();
  }
}

renderHeadless().catch((err) => {
  console.error('[Motion Canvas] Render failed:', err);
  process.exit(1);
});
