/**
 * Screen calibration scale definitions for 16:9 widescreen vs 9:16 mobile viewports.
 * 9:16 (1080x1920) is viewed on ~390px mobile viewports (0.36x CSS scale factor),
 * so canvas typography and icon assets must be >= 16:9 (never smaller) to remain legible.
 */

export interface ScreenTypoScale {
  heroNum: number; // 46 (16:9) | 44 (9:16)
  heading: number; // 36 (16:9) | 36 (9:16)
  cardTitle: number; // 32 (16:9) | 34 (9:16)
  pill: number; // 22 (16:9) | 23 (9:16)
  sublabel: number; // 18 (16:9) | 20 (9:16)
  micro: number; // 18 (16:9) | 20 (9:16) — strict floor!
  subtitle: number; // 38 (16:9) | 44 (9:16)
  sectionLabel: number; // 26 (16:9) | 30 (9:16)
}

export interface ScreenAssetScale {
  squareLogo: number; // 56 (16:9) | 66 (9:16)
  wideBadge: [number, number]; // [116, 58] (16:9) | [132, 66] (9:16)
  strokePrimary: number; // 3.5 (16:9) | 4.0 (9:16)
  strokeRail: number; // 16 (16:9) | 20 (9:16)
  subtitlePadding: [number, number]; // [14, 28] (16:9) | [18, 30] (9:16)
  subtitleSlotPad: [number, number]; // [7, 12] (16:9) | [9, 14] (9:16)
  subtitleSlotGap: number; // 9 (16:9) | 11 (9:16)
}

export function getTypo(wide: boolean): ScreenTypoScale {
  return {
    heroNum: wide ? 46 : 44,
    heading: wide ? 36 : 36,
    cardTitle: wide ? 32 : 34,
    pill: wide ? 22 : 23,
    sublabel: wide ? 18 : 20,
    micro: wide ? 18 : 20,
    subtitle: wide ? 38 : 44,
    sectionLabel: wide ? 26 : 30,
  };
}

export function getAssets(wide: boolean): ScreenAssetScale {
  return {
    squareLogo: wide ? 56 : 66,
    wideBadge: wide ? [116, 58] : [132, 66],
    strokePrimary: wide ? 3.5 : 4.0,
    strokeRail: wide ? 16 : 20,
    subtitlePadding: wide ? [14, 28] : [18, 30],
    subtitleSlotPad: wide ? [7, 12] : [9, 14],
    subtitleSlotGap: wide ? 9 : 11,
  };
}
