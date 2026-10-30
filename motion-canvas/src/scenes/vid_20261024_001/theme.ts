import { makeSpring, PlopSpring, SmoothSpring } from '@motion-canvas/core';

export const THEME = {
  colors: {
    bg: '#F7F5F0',
    surface: '#FFFFFF',
    ink: '#141413',
    secondaryInk: '#6E6D68',
    gridLine: '#E2DFD7',
    accent: '#FF3B00',
    compliantGreen: '#1B8354',
    goldAccent: '#D97706',
  },
  fonts: {
    heading: "'Instrument Serif', 'Liberation Serif', 'DejaVu Serif', serif",
    body: "'Inter', 'Liberation Sans', 'DejaVu Sans', sans-serif",
    data: "'JetBrains Mono', 'Liberation Mono', 'DejaVu Sans Mono', monospace",
  },
  layout: {
    width: 1080,
    height: 1920,
    safeWidth: 960,
    safeMarginX: 60,
    safeTop: -760,
    safeBottom: 760,
    headerY: -800,
    footerY: 800,
  },
  stroke: {
    hairline: 2,
    border: 3,
    thick: 5,
    accentThick: 6,
  },
  typography: {
    meta: 24,
    pill: 26,
    label: 28,
    body: 28,
    heading: 56,
    hero: 88,
  },
  spring: {
    custom: makeSpring(1, 220, 22),
    plop: PlopSpring,
    smooth: SmoothSpring,
  },
} as const;

export type ThemeColors = typeof THEME.colors;
export type ThemeFonts = typeof THEME.fonts;
