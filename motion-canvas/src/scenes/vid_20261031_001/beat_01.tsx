import { Img, makeScene2D, Node, Rect, Txt } from '@motion-canvas/2d';
import {
  all,
  createRef,
  createSignal,
  easeInOutCubic,
  easeOutCubic,
  easeOutExpo,
  useThread,
} from '@motion-canvas/core';
import {
  COLORS,
  FONTS,
  getAssets,
  getTypo,
  isWidescreen,
  setupBaseStage,
} from './layout';
import {
  finishSceneAt,
  focalScale,
  SCENE_TIMINGS,
  waitUntilSceneTime,
} from './timings';

const PALETTE = {
  crimson: '#D92D20',
  crimsonBg: '#FEE4E2',
  emerald: COLORS.compliantGreen,
  emeraldBg: '#D1FADF',
  muted: '#334155',
  mutedBg: '#F2F4F7',
  amber: COLORS.goldAccent,
  cyan: '#0284C7',
  surface: COLORS.surface,
  ink: COLORS.ink,
};

export default makeScene2D(function* (view) {
  const time = useThread().time;
  const t0 = time();

  // Setup Swiss Base Stage (Grid lines, section indicator, subtitle pill)
  setupBaseStage(view, 'KNP? // 01: ANCAMAN TURUN KASTA');

  const wide = isWidescreen(view);
  const typo = getTypo(wide);
  const assets = getAssets(wide);

  // Layout coordinates (Dual-aspect safe zones)
  const headerY = wide ? -350 : -640;

  // Left card (MSCI Referee Card)
  const refereeX = wide ? -470 : 0;
  const refereeY = wide ? 30 : -420;
  const refereeW = wide ? 740 : 940;
  const refereeH = wide ? 480 : 250;

  // Right stack (3-Tier Global Market Caste Hierarchy)
  const stackX = wide ? 460 : 0;
  const tierW = wide ? 780 : 940;
  const tierH = wide ? 110 : 120;

  const tier1Y = wide ? -130 : -110;
  const tier2Y = wide ? 30 : 40;
  const tier3Y = wide ? 190 : 190;

  // Animation signals
  const focalId = createSignal(0);
  const headerOpacity = createSignal(0);

  const refereeOpacity = createSignal(0);
  const refereeScale = createSignal(0.9);

  const crashAlertOpacity = createSignal(0);
  const crashAlertScale = createSignal(0.85);
  const crashPercent = createSignal(-1.0);

  const tier1Opacity = createSignal(0);
  const tier1Scale = createSignal(0.9);

  const tier2Opacity = createSignal(0);
  const tier2Scale = createSignal(0.9);

  const tier3Opacity = createSignal(0);
  const tier3Scale = createSignal(0.9);
  const dangerBadgeScale = createSignal(0.85);

  const camera = createRef<Node>();

  view.add(
    <Node ref={camera}>
      {/* ===== HEADER TITLE BLOCK (Eyebrow pill removed) ===== */}
      <Rect
        x={0}
        y={headerY}
        opacity={headerOpacity}
        layout
        direction="column"
        alignItems="center"
      >
        <Txt
          text="ANCAMAN TURUN KASTA BURSA KITA"
          fontFamily={FONTS.heading}
          fontSize={wide ? 36 : 34}
          fontWeight={800}
          fill={PALETTE.ink}
        />
      </Rect>

      {/* ===== MSCI REFEREE ALERT CARD ===== */}
      <Rect
        x={refereeX}
        y={refereeY}
        width={refereeW}
        height={refereeH}
        opacity={refereeOpacity}
        scale={() => focalScale(focalId, 1, refereeScale, time)}
        fill={PALETTE.surface}
        stroke={PALETTE.ink}
        lineWidth={assets.strokePrimary}
        radius={14}
        layout
        direction={wide ? 'column' : 'row'}
        alignItems="center"
        justifyContent="space-between"
        padding={wide ? [24, 28] : [18, 24]}
        gap={wide ? 16 : 14}
      >
        {/* Referee Profile Header */}
        <Rect
          layout
          direction={wide ? 'row' : 'column'}
          alignItems="center"
          gap={wide ? 18 : 8}
          width={wide ? '100%' : '38%'}
        >
          <Img
            src={'/assets/vid_20261031_001/msci_globe_badge.png'}
            width={wide ? 84 : 74}
            height={wide ? 84 : 74}
          />
          <Rect
            layout
            direction="column"
            alignItems={wide ? 'start' : 'center'}
            gap={4}
          >
            <Txt
              text="WASIT BURSA DUNIA (MSCI)"
              fontFamily={FONTS.heading}
              fontSize={wide ? 26 : 22}
              fontWeight={800}
              fill={PALETTE.ink}
            />
            <Txt
              text="PENENTU ARAH DANA GLOBAL"
              fontFamily={FONTS.data}
              fontSize={wide ? 16 : 18}
              fontWeight={700}
              fill={PALETTE.muted}
            />
          </Rect>
        </Rect>

        {/* Live Crisis Stamp & IHSG Plunge Pill */}
        <Rect
          opacity={crashAlertOpacity}
          scale={crashAlertScale}
          layout
          direction="column"
          alignItems="center"
          width={wide ? '100%' : '58%'}
          padding={wide ? [16, 20] : [12, 16]}
          fill={PALETTE.crimsonBg}
          stroke={PALETTE.crimson}
          lineWidth={assets.strokePrimary}
          radius={10}
          gap={6}
        >
          <Rect layout direction="row" alignItems="center" gap={12}>
            <Txt
              text={() => `${crashPercent().toFixed(1)}%`}
              fontFamily={FONTS.data}
              fontSize={wide ? 42 : 38}
              fontWeight={700}
              fill={PALETTE.crimson}
            />
            <Rect
              layout
              padding={wide ? [6, 12] : [6, 10]}
              fill={PALETTE.crimson}
              radius={6}
            >
              <Txt
                text="IHSG ANJLOK"
                fontFamily={FONTS.data}
                fontSize={wide ? 18 : 18}
                fontWeight={700}
                fill={PALETTE.surface}
              />
            </Rect>
          </Rect>
          <Txt
            text="PERDAGANGAN DIBEKUKAN SEMENTARA"
            fontFamily={FONTS.data}
            fontSize={wide ? 16 : 17}
            fontWeight={700}
            fill={PALETTE.crimson}
          />
        </Rect>
      </Rect>

      {/* ===== 3-TIER GLOBAL MARKET CASTE HIERARCHY STACK ===== */}

      {/* --- TIER 1: LIGA UTAMA --- */}
      <Rect
        x={stackX}
        y={tier1Y}
        width={tierW}
        height={tierH}
        opacity={tier1Opacity}
        scale={() => focalScale(focalId, 2, tier1Scale, time)}
        fill={PALETTE.surface}
        stroke={focalId() === 2 ? PALETTE.emerald : PALETTE.ink}
        lineWidth={assets.strokePrimary}
        radius={12}
        layout
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        padding={wide ? [0, 24] : [0, 24]}
      >
        <Txt
          text="01 // LIGA UTAMA"
          fontFamily={FONTS.heading}
          fontSize={wide ? 26 : 26}
          fontWeight={800}
          fill={PALETTE.ink}
        />
        <Rect
          layout
          padding={wide ? [6, 14] : [8, 14]}
          fill={PALETTE.emerald}
          radius={6}
        >
          <Txt
            text="POSISI RI SAAT INI"
            fontFamily={FONTS.data}
            fontSize={wide ? 18 : 18}
            fontWeight={700}
            fill={PALETTE.surface}
          />
        </Rect>
      </Rect>

      {/* --- TIER 2: LIGA KEDUA --- */}
      <Rect
        x={stackX}
        y={tier2Y}
        width={tierW}
        height={tierH}
        opacity={tier2Opacity}
        scale={tier2Scale}
        fill={PALETTE.mutedBg}
        stroke={PALETTE.muted}
        lineWidth={2}
        lineDash={[8, 8]}
        radius={12}
        layout
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        padding={wide ? [0, 24] : [0, 24]}
      >
        <Txt
          text="02 // LIGA KEDUA"
          fontFamily={FONTS.heading}
          fontSize={wide ? 26 : 26}
          fontWeight={800}
          fill={PALETTE.muted}
        />
        <Rect
          layout
          padding={wide ? [6, 14] : [8, 14]}
          fill={PALETTE.muted}
          radius={6}
        >
          <Txt
            text="DILEWATI LANGSUNG"
            fontFamily={FONTS.data}
            fontSize={wide ? 18 : 18}
            fontWeight={700}
            fill={PALETTE.surface}
          />
        </Rect>
      </Rect>

      {/* --- TIER 3: KASTA TERENDAH --- */}
      <Rect
        x={stackX}
        y={tier3Y}
        width={tierW}
        height={tierH}
        opacity={tier3Opacity}
        scale={() => focalScale(focalId, 3, tier3Scale, time)}
        fill={PALETTE.crimsonBg}
        stroke={PALETTE.crimson}
        lineWidth={focalId() === 3 ? 4 : assets.strokePrimary}
        radius={12}
        layout
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        padding={wide ? [0, 24] : [0, 24]}
      >
        <Txt
          text="03 // KASTA TERENDAH"
          fontFamily={FONTS.heading}
          fontSize={wide ? 26 : 26}
          fontWeight={800}
          fill={PALETTE.crimson}
        />
        <Rect
          scale={dangerBadgeScale}
          layout
          padding={wide ? [6, 14] : [8, 14]}
          fill={PALETTE.crimson}
          radius={6}
        >
          <Txt
            text="ANCAMAN BOIKOT DUNIA"
            fontFamily={FONTS.data}
            fontSize={wide ? 18 : 18}
            fontWeight={700}
            fill={PALETTE.surface}
          />
        </Rect>
      </Rect>
    </Node>
  );

  // --- Choreography Sequence (Scene 01 Total duration: 20.75s) ---
  const sceneDuration = SCENE_TIMINGS[0].duration;

  // t = 0.3s: Stage and Title header reveal
  yield* waitUntilSceneTime(0.3, t0);
  yield* all(
    headerOpacity(1, 0.4, easeOutExpo),
    refereeOpacity(1, 0.5, easeOutExpo),
    refereeScale(1, 0.5, easeOutExpo),
  );

  // t = 3.0s: Narrator: "anjlok 8% sampai perdagangan dibekukan" (~3.46s spoken)
  yield* waitUntilSceneTime(3.0, t0);
  focalId(1);
  yield* all(
    crashAlertOpacity(1, 0.3, easeOutExpo),
    crashAlertScale(1, 0.4, easeOutExpo),
    crashPercent(-8.0, 0.46, easeOutCubic),
  );

  // t = 12.5s: Narrator: "Ibarat dari liga utama dunia" (~12.52s - 13.90s)
  // Revealing strictly Top-to-Bottom: Tier 1 -> Tier 2 -> Tier 3
  yield* waitUntilSceneTime(12.5, t0);
  focalId(2);
  yield* all(
    tier1Opacity(1, 0.4, easeOutExpo),
    tier1Scale(1, 0.5, easeOutExpo),
  );

  // t = 14.7s: Narrator: "Indonesia terancam diturunkan paksa" (~14.72s - 15.46s)
  yield* waitUntilSceneTime(14.7, t0);
  yield* all(
    tier2Opacity(1, 0.3, easeOutExpo),
    tier2Scale(1, 0.4, easeOutExpo),
  );

  // t = 15.9s: Narrator: "ke kasta terendah" (~15.90s - 17.14s)
  yield* waitUntilSceneTime(15.9, t0);
  focalId(3);
  yield* all(
    tier3Opacity(1, 0.4, easeOutExpo),
    tier3Scale(1, 0.5, easeOutExpo),
  );

  // t = 17.7s: Narrator: "zona isolasi selevel negara yang lagi krisis berat" (~17.70s - 18.38s)
  yield* waitUntilSceneTime(17.7, t0);
  yield* all(
    dangerBadgeScale(1.15, 0.25, easeOutExpo).to(1.0, 0.2, easeInOutCubic),
  );

  // Strict Hold-Time: Diagram remains fully visible until 20.75s (hold >= 2.8s)
  yield* finishSceneAt(sceneDuration, t0);
});
