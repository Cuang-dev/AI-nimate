import { Config } from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setBrowserExecutable(
  '/home/agent/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome'
);
Config.setChromiumOpenGlRenderer('angle');
