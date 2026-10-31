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
  BEAT_LABELS,
  COLORS,
  FONTS,
  getAssets,
  getTypo,
  isWidescreen,
  setupBaseStage,
} from './layout';
import {
  finishSceneAt,
  focalRotation,
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
  amberBg: '#FEF0C7',
  cyan: '#0284C7',
  cyanBg: '#E0F2FE',
  surface: COLORS.surface,
  ink: COLORS.ink,
};

export default makeScene2D(function* (view) {
  const time = useThread().time;
  const t0 = time();

  // Setup Swiss Base Stage (Grid lines, section indicator, subtitle pill)
  setupBaseStage(view, BEAT_LABELS[0]);

  const wide = isWidescreen(view);
  const typo = getTypo(wide);
  const assets = getAssets(wide);

  // Layout coordinates (Dual-aspect safe zones)
  const headerY = wide ? -350 : -640;

  // Left Alert Card (Tech Fever Break Alert Card)
  const alertCardX = wide ? -470 : 0;
  const alertCardY = wide ? 30 : -420;
  const alertCardW = wide ? 740 : 940;
  const alertCardH = wide ? 510 : 250;

  // Right Stack (3-Tier Tech Crash Stack)
  const stackX = wide ? 460 : 0;
  const tierW = wide ? 780 : 940;
  const tierH = wide ? 130 : 155;

  const tier1Y = wide ? -130 : -130;
  const tier2Y = wide ? 30 : 55;
  const tier3Y = wide ? 190 : 240;

  const arrowX = wide ? 880 : 430;

  // Animation signals
  const focalId = createSignal(0);
  const headerOpacity = createSignal(0);

  const alertCardOpacity = createSignal(0);
  const alertCardScale = createSignal(0.9);

  const alertPillOpacity = createSignal(0);
  const alertPillScale = createSignal(0.85);
  const crashCounter = createSignal(0);

  const cardFooterOpacity = createSignal(0);

  const tier1Opacity = createSignal(0);
  const tier1Scale = createSignal(0.9);

  const tier2Opacity = createSignal(0);
  const tier2Scale = createSignal(0.9);

  const tier3Opacity = createSignal(0);
  const tier3Scale = createSignal(0.9);
  const tier3BadgeScale = createSignal(0.85);

  const arrowProgress = createSignal(0);

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
            text="GUNCANGAN BURSA GLOBAL & RI // 2025–2026"
            fontFamily={FONTS.data}
            fontSize={wide ? 18 : 20}
            fontWeight={700}
            fill={PALETTE.surface}
            letterSpacing={1.2}
          />
        </Rect>
        <Txt
          text="SAHAM TEKNOLOGI RUNTUH BERJAMAAH"
          fontFamily={FONTS.heading}
          fontSize={wide ? 34 : 34}
          fontWeight={700}
          fill={PALETTE.ink}
        />
      </Rect>

      {/* ===== ALERT CARD (Left on 16:9, Top on 9:16) ===== */}
      <Rect
        x={alertCardX}
        y={alertCardY}
        width={alertCardW}
        height={alertCardH}
        opacity={alertCardOpacity}
        scale={() => focalScale(focalId, 1, alertCardScale, time)}
        fill={PALETTE.surface}
        stroke={focalId() === 1 ? PALETTE.crimson : PALETTE.ink}
        lineWidth={assets.strokePrimary}
        radius={14}
        layout
        direction={wide ? 'column' : 'row'}
        alignItems="center"
        justifyContent="space-between"
        padding={wide ? [24, 28] : [18, 24]}
        gap={wide ? 16 : 14}
      >
        {/* Card Header with Icon */}
        <Rect
          layout
          direction={wide ? 'row' : 'column'}
          alignItems="center"
          gap={wide ? 18 : 8}
          width={wide ? '100%' : '40%'}
        >
          <Img
            src={'/assets/vid_20261031_002/ai_chip_flame_icon.png'}
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
              text="DEMAM TEKNOLOGI PECAH"
              fontFamily={FONTS.heading}
              fontSize={wide ? 26 : 24}
              fontWeight={700}
              fill={PALETTE.ink}
            />
            <Txt
              text="APLIKASI RAMAI DIPAKAI, SAHAMNYA JEBOL"
              fontFamily={FONTS.data}
              fontSize={wide ? 18 : 20}
              fontWeight={700}
              fill={PALETTE.muted}
            />
          </Rect>
        </Rect>

        {/* Live Loss Counter Pill (-Rp16.000T+ MENGUAP) */}
        <Rect
          opacity={alertPillOpacity}
          scale={alertPillScale}
          layout
          direction="column"
          alignItems="center"
          width={wide ? '100%' : '56%'}
          padding={wide ? [16, 20] : [12, 16]}
          fill={PALETTE.crimsonBg}
          stroke={PALETTE.crimson}
          lineWidth={assets.strokePrimary}
          radius={10}
          gap={6}
        >
          <Rect layout direction="row" alignItems="center" gap={12}>
            <Txt
              text={() =>
                crashCounter() >= 1000
                  ? `-Rp${(Math.round(crashCounter()) / 1000).toFixed(0)}.000T+`
                  : `-Rp${Math.round(crashCounter())}T`
              }
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
                text="MENGUAP"
                fontFamily={FONTS.data}
                fontSize={wide ? 18 : 20}
                fontWeight={700}
                fill={PALETTE.surface}
              />
            </Rect>
          </Rect>
          <Txt
            text="KOREKSI VALUASI GLOBAL & LOKAL"
            fontFamily={FONTS.data}
            fontSize={wide ? 18 : 20}
            fontWeight={700}
            fill={PALETTE.crimson}
          />
        </Rect>

        {/* Footer (Widescreen only) */}
        {wide && (
          <Rect
            opacity={cardFooterOpacity}
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
              text="STATUS: KOREKSI MASSAL"
              fontFamily={FONTS.data}
              fontSize={wide ? 18 : 20}
              fontWeight={700}
              fill={PALETTE.muted}
            />
            <Txt
              text="HYPE VS REALITAS CASHFLOW"
              fontFamily={FONTS.data}
              fontSize={wide ? 18 : 20}
              fontWeight={700}
              fill={PALETTE.crimson}
            />
          </Rect>
        )}
      </Rect>

      {/* ===== 3-TIER TECH CRASH STACK ===== */}

      {/* --- TIER 1: RAKSASA AI DUNIA // WALL STREET --- */}
      <Rect
        x={stackX}
        y={tier1Y}
        width={tierW}
        height={tierH}
        opacity={tier1Opacity}
        scale={() => focalScale(focalId, 2, tier1Scale, time)}
        fill={PALETTE.surface}
        stroke={focalId() === 2 ? PALETTE.amber : PALETTE.ink}
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
          <Txt
            text="RAKSASA AI DUNIA // WALL STREET"
            fontFamily={FONTS.heading}
            fontSize={wide ? 26 : 24}
            fontWeight={700}
            fill={PALETTE.ink}
          />
          <Rect
            layout
            padding={wide ? [6, 14] : [8, 14]}
            fill={PALETTE.amber}
            radius={6}
          >
            <Txt
              text="-$1 TRILIUN SEHARI"
              fontFamily={FONTS.data}
              fontSize={wide ? 18 : 20}
              fontWeight={700}
              fill={PALETTE.surface}
            />
          </Rect>
        </Rect>
        <Txt
          text="SAHAM CHIP & AI ANJLOK TAJAM"
          fontFamily={FONTS.data}
          fontSize={wide ? 18 : 20}
          fontWeight={600}
          fill={PALETTE.muted}
        />
      </Rect>

      {/* --- TIER 2: BELANJA ONLINE LOKAL // E-COMMERCE --- */}
      <Rect
        x={stackX}
        y={tier2Y}
        width={tierW}
        height={tierH}
        opacity={tier2Opacity}
        scale={tier2Scale}
        fill={PALETTE.mutedBg}
        stroke={PALETTE.cyan}
        lineWidth={2}
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
            text="BELANJA ONLINE LOKAL // E-COMMERCE"
            fontFamily={FONTS.heading}
            fontSize={wide ? 26 : 24}
            fontWeight={700}
            fill={PALETTE.ink}
          />
          <Rect
            layout
            padding={wide ? [6, 14] : [8, 14]}
            fill={PALETTE.cyan}
            radius={6}
          >
            <Txt
              text="LAYANAN FISIK TUTUP"
              fontFamily={FONTS.data}
              fontSize={wide ? 18 : 20}
              fontWeight={700}
              fill={PALETTE.surface}
            />
          </Rect>
        </Rect>
        <Txt
          text="ERA GRATIS ONGKIR & BAKAR UANG BERAKHIR"
          fontFamily={FONTS.data}
          fontSize={wide ? 18 : 20}
          fontWeight={600}
          fill={PALETTE.muted}
        />
      </Rect>

      {/* --- TIER 3: INVESTOR RITEL & ASING // PANIK --- */}
      <Rect
        x={stackX}
        y={tier3Y}
        width={tierW}
        height={tierH}
        opacity={tier3Opacity}
        scale={() => focalScale(focalId, 3, tier3Scale, time)}
        rotation={() => focalRotation(focalId, 3, time)}
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
            text="INVESTOR RITEL & ASING // PANIK"
            fontFamily={FONTS.heading}
            fontSize={wide ? 26 : 24}
            fontWeight={700}
            fill={PALETTE.crimson}
          />
          <Rect
            scale={tier3BadgeScale}
            layout
            padding={wide ? [6, 14] : [8, 14]}
            fill={PALETTE.crimson}
            radius={6}
          >
            <Txt
              text="RIBUAN TRILIUN HILANG"
              fontFamily={FONTS.data}
              fontSize={wide ? 18 : 20}
              fontWeight={700}
              fill={PALETTE.surface}
            />
          </Rect>
        </Rect>
        <Txt
          text="HARGA SAHAM TERJUN BEBAS BERJAMAAH"
          fontFamily={FONTS.data}
          fontSize={wide ? 18 : 20}
          fontWeight={700}
          fill={PALETTE.crimson}
        />
      </Rect>

      {/* ===== PLUNGING TECH CRASH TRAJECTORY ARROW ===== */}
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
          text="TERJUN BEBAS"
          fontFamily={FONTS.data}
          fontSize={wide ? 18 : 20}
          fontWeight={700}
          fill={PALETTE.surface}
        />
      </Rect>
    </Node>
  );

  // --- Choreography Sequence (Scene 01 Total duration: 14.231s) ---
  const sceneDuration = SCENE_TIMINGS[0].duration;

  // t = 0.3s: Stage and Title header reveal
  yield* waitUntilSceneTime(0.3, t0);
  yield* all(
    headerOpacity(1, 0.4, easeOutExpo),
    alertCardOpacity(1, 0.5, easeOutExpo),
    alertCardScale(1, 0.5, easeOutExpo),
  );

  // t = 2.78s: Narrator: "teknologi" (~2.78s - 3.32s)
  yield* waitUntilSceneTime(2.78, t0);
  focalId(1);
  yield* all(
    alertPillOpacity(1, 0.4, easeOutExpo),
    alertPillScale(1, 0.4, easeOutExpo),
    cardFooterOpacity(1, 0.4),
    alertCardScale(1.03, 0.2, easeOutExpo).to(1.0, 0.2, easeInOutCubic),
  );

  // t = 5.40s: Narrator: "mulai dari raksasa akal imitasi dunia" (~5.40s - 7.26s)
  yield* waitUntilSceneTime(5.40, t0);
  focalId(2);
  yield* all(
    tier1Opacity(1, 0.4, easeOutExpo),
    tier1Scale(1, 0.5, easeOutExpo),
  );

  // t = 7.50s: Narrator: "sampai belanja online lokal" (~7.50s - 9.22s)
  yield* waitUntilSceneTime(7.50, t0);
  yield* all(
    tier2Opacity(1, 0.4, easeOutExpo),
    tier2Scale(1, 0.4, easeOutExpo),
  );

  // t = 10.00s: Narrator: "mendadak anjlok berjamaah" (~10.00s - 11.08s)
  yield* waitUntilSceneTime(10.00, t0);
  focalId(3);
  yield* all(
    tier3Opacity(1, 0.4, easeOutExpo),
    tier3Scale(1, 0.5, easeOutExpo),
    arrowProgress(1, 0.6, easeOutExpo),
    crashCounter(8000, 1.2, easeOutExpo),
    alertPillScale(1.15, 0.25, easeOutExpo).to(1.0, 0.2, easeInOutCubic),
  );

  // t = 12.64s: Narrator: "dan menghapus nilai ribuan triliun rupiah" (~12.64s - 13.50s)
  yield* waitUntilSceneTime(12.64, t0);
  yield* all(
    crashCounter(16000, 0.8, easeOutCubic),
    tier3BadgeScale(1.15, 0.25, easeOutExpo).to(1.0, 0.2, easeInOutCubic),
  );

  // Strict Hold-Time: Diagram remains fully visible until 14.23s
  yield* finishSceneAt(sceneDuration, t0);
});
