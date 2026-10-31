import { Img, Line, makeScene2D, Node, Rect, Txt } from '@motion-canvas/2d';
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
  muted: COLORS.secondaryInk,
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
  const refereeH = wide ? 510 : 250;

  // Right stack (3-Tier Global Market Caste Hierarchy)
  const stackX = wide ? 460 : 0;
  const tierW = wide ? 780 : 940;
  const tierH = wide ? 130 : 160;

  const tier1Y = wide ? -130 : -130;
  const tier2Y = wide ? 30 : 55;
  const tier3Y = wide ? 190 : 240;

  const arrowX = wide ? 880 : 430;

  // Animation signals
  const focalId = createSignal(0);
  const headerOpacity = createSignal(0);

  const refereeOpacity = createSignal(0);
  const refereeScale = createSignal(0.9);

  const crashAlertOpacity = createSignal(0);
  const crashAlertScale = createSignal(0.85);
  const crashPercent = createSignal(0);

  const msciWarningOpacity = createSignal(0);

  const tier1Opacity = createSignal(0);
  const tier1Scale = createSignal(0.9);

  const tier2Opacity = createSignal(0);
  const tier2Scale = createSignal(0.9);

  const tier3Opacity = createSignal(0);
  const tier3Scale = createSignal(0.9);

  const arrowProgress = createSignal(0);
  const dangerBadgeScale = createSignal(0.85);
  const tier3Glow = createSignal(0);

  const camera = createRef<Node>();

  view.add(
    <Node ref={camera}>
      {/* ===== HEADER TITLE BLOCK ===== */}
      <Rect
        x={0}
        y={headerY}
        opacity={headerOpacity}
        layout
        direction="column"
        alignItems="center"
        gap={wide ? 8 : 10}
      >
        <Rect
          layout
          padding={wide ? [6, 16] : [8, 18]}
          fill={PALETTE.crimson}
          radius={6}
        >
          <Txt
            text="PERINGATAN WASIT BURSA DUNIA // MSCI 2026"
            fontFamily={FONTS.data}
            fontSize={wide ? 18 : 20}
            fontWeight={700}
            fill={PALETTE.surface}
            letterSpacing={1.2}
          />
        </Rect>
        <Txt
          text="ANCAMAN TURUN KASTA BURSA KITA"
          fontFamily={FONTS.heading}
          fontSize={wide ? 34 : 34}
          fontWeight={700}
          fill={PALETTE.ink}
        />
      </Rect>

      {/* ===== MSCI REFEREE ALERT CARD (Left on 16:9, Top on 9:16) ===== */}
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
            width={wide ? 88 : 76}
            height={wide ? 88 : 76}
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
              fontSize={wide ? 26 : 24}
              fontWeight={700}
              fill={PALETTE.ink}
            />
            <Txt
              text="PENENTU ARAH DANA GLOBAL"
              fontFamily={FONTS.data}
              fontSize={wide ? 18 : 20}
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
              fontSize={wide ? 42 : 40}
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
                fontSize={wide ? 18 : 20}
                fontWeight={700}
                fill={PALETTE.surface}
              />
            </Rect>
          </Rect>
          <Txt
            text="PERDAGANGAN DIBEKUKAN SEMENTARA"
            fontFamily={FONTS.data}
            fontSize={wide ? 18 : 20}
            fontWeight={700}
            fill={PALETTE.crimson}
          />
        </Rect>

        {/* MSCI Threat Footer (Widescreen only to keep mobile uncluttered) */}
        {wide && (
          <Rect
            opacity={msciWarningOpacity}
            layout
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            width="100%"
            padding={[10, 16]}
            fill={PALETTE.mutedBg}
            radius={8}
          >
            <Txt
              text="STATUS: ANCAMAN TURUN KASTA"
              fontFamily={FONTS.data}
              fontSize={wide ? 18 : 20}
              fontWeight={700}
              fill={PALETTE.muted}
            />
            <Txt
              text="BEKUKAN TAMBAHAN SAHAM RI"
              fontFamily={FONTS.data}
              fontSize={wide ? 18 : 20}
              fontWeight={700}
              fill={PALETTE.crimson}
            />
          </Rect>
        )}
      </Rect>

      {/* ===== 3-TIER GLOBAL MARKET CASTE HIERARCHY STACK ===== */}

      {/* --- TIER 1: LIGA UTAMA (EMERGING MARKET) --- */}
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
        direction="column"
        justifyContent="center"
        padding={wide ? [14, 24] : [16, 20]}
        gap={8}
      >
        <Rect
          layout
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          width="100%"
        >
          <Rect layout direction="row" alignItems="center" gap={12}>
            <Img
              src={'/assets/vid_20261031_001/idx_bull_icon.png'}
              width={wide ? 42 : 46}
              height={wide ? 42 : 46}
            />
            <Txt
              text="LIGA UTAMA // EMERGING MARKET"
              fontFamily={FONTS.heading}
              fontSize={wide ? 26 : 26}
              fontWeight={700}
              fill={PALETTE.ink}
            />
          </Rect>
          <Rect
            layout
            padding={wide ? [6, 14] : [8, 14]}
            fill={PALETTE.emerald}
            radius={6}
          >
            <Txt
              text="POSISI RI SAAT INI"
              fontFamily={FONTS.data}
              fontSize={wide ? 18 : 20}
              fontWeight={700}
              fill={PALETTE.surface}
            />
          </Rect>
        </Rect>
        <Txt
          text="DANA ASING RAKSASA GLOBAL BOLEH MASUK SECARA RESMI"
          fontFamily={FONTS.data}
          fontSize={wide ? 18 : 20}
          fontWeight={600}
          fill={PALETTE.muted}
        />
      </Rect>

      {/* --- TIER 2: LIGA KEDUA (FRONTIER MARKET) --- */}
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
        direction="column"
        justifyContent="center"
        padding={wide ? [14, 24] : [16, 20]}
        gap={8}
      >
        <Rect
          layout
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          width="100%"
        >
          <Txt
            text="LIGA KEDUA // FRONTIER MARKET"
            fontFamily={FONTS.heading}
            fontSize={wide ? 26 : 26}
            fontWeight={700}
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
              fontSize={wide ? 18 : 20}
              fontWeight={700}
              fill={PALETTE.surface}
            />
          </Rect>
        </Rect>
        <Txt
          text="PASAR KELAS MENENGAH DUNIA // TIDAK DILIRIK"
          fontFamily={FONTS.data}
          fontSize={wide ? 18 : 20}
          fontWeight={600}
          fill={PALETTE.muted}
        />
      </Rect>

      {/* --- TIER 3: KASTA TERENDAH (STANDALONE MARKET) --- */}
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
        direction="column"
        justifyContent="center"
        padding={wide ? [14, 24] : [16, 20]}
        gap={8}
      >
        <Rect
          layout
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          width="100%"
        >
          <Txt
            text="KASTA TERENDAH // STANDALONE MARKET"
            fontFamily={FONTS.heading}
            fontSize={wide ? 26 : 26}
            fontWeight={700}
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
              text="ANCAMAN BOIKOT DANA DUNIA"
              fontFamily={FONTS.data}
              fontSize={wide ? 18 : 20}
              fontWeight={700}
              fill={PALETTE.surface}
            />
          </Rect>
        </Rect>
        <Txt
          text="ZONA ISOLASI // DANA ASING WAJIB KELUAR OTOMATIS"
          fontFamily={FONTS.data}
          fontSize={wide ? 18 : 20}
          fontWeight={700}
          fill={PALETTE.crimson}
        />
      </Rect>

      {/* ===== PLUNGING DOWNGRADE ARROW (Bypasses Tier 2 into Tier 3) ===== */}
      <Line
        points={[
          [arrowX, tier1Y + (wide ? 50 : 65)],
          [arrowX, tier3Y - (wide ? 50 : 65)],
        ]}
        stroke={PALETTE.crimson}
        lineWidth={5}
        endArrow
        arrowSize={16}
        end={arrowProgress}
      />

      {/* Callout Tag on Plunging Arrow */}
      <Rect
        x={wide ? arrowX - 95 : arrowX - 110}
        y={tier2Y}
        opacity={arrowProgress}
        layout
        padding={wide ? [4, 10] : [6, 12]}
        fill={PALETTE.crimson}
        radius={4}
      >
        <Txt
          text="DITURUNKAN PAKSA"
          fontFamily={FONTS.data}
          fontSize={wide ? 18 : 20}
          fontWeight={700}
          fill={PALETTE.surface}
        />
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
    crashPercent(-8.0, 0.6, easeOutCubic),
  );

  // t = 7.6s: Narrator: "wasit bursa saham dunia, bernama MSCI" (~7.68s - 9.28s)
  yield* waitUntilSceneTime(7.6, t0);
  yield* all(
    msciWarningOpacity(1, 0.3),
    refereeScale(1.04, 0.25, easeOutExpo).to(1.0, 0.2, easeInOutCubic),
  );

  // t = 12.5s: Narrator: "Ibarat dari liga utama dunia" (~12.52s - 13.90s)
  yield* waitUntilSceneTime(12.5, t0);
  focalId(2);
  yield* all(
    tier1Opacity(1, 0.4, easeOutExpo),
    tier1Scale(1, 0.5, easeOutExpo),
  );

  // t = 14.7s: Narrator: "Indonesia terancam diturunkan paksa" (~14.72s - 15.46s)
  yield* waitUntilSceneTime(14.7, t0);
  yield* all(
    tier2Opacity(0.7, 0.3, easeOutExpo),
    tier2Scale(1, 0.4, easeOutExpo),
  );

  // t = 15.9s: Narrator: "ke kasta terendah" (~15.90s - 17.14s)
  yield* waitUntilSceneTime(15.9, t0);
  focalId(3);
  yield* all(
    tier3Opacity(1, 0.4, easeOutExpo),
    tier3Scale(1, 0.5, easeOutExpo),
    arrowProgress(1, 0.6, easeOutExpo),
  );

  // t = 17.7s: Narrator: "zona isolasi selevel negara yang lagi krisis berat" (~17.70s - 18.38s)
  yield* waitUntilSceneTime(17.7, t0);
  yield* all(
    tier3Glow(1, 0.3),
    dangerBadgeScale(1.15, 0.25, easeOutExpo).to(1.0, 0.2, easeInOutCubic),
  );

  // Strict Hold-Time: Diagram remains fully visible until 20.75s (hold >= 2.8s)
  yield* finishSceneAt(sceneDuration, t0);
});
