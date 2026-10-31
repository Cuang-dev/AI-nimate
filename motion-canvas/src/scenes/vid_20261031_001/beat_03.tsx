import { Img, Line, makeScene2D, Node, Rect, Txt } from '@motion-canvas/2d';
import { all, createRef, createSignal, easeInOutCubic, easeOutExpo, useThread } from '@motion-canvas/core';
import { COLORS, FONTS, getAssets, getTypo, isWidescreen, setupBaseStage } from './layout';
import { finishSceneAt, focalScale, waitUntilSceneTime } from './timings';

const PALETTE = {
  cyan: '#0284C7',
  amber: '#D97706',
  crimson: '#DC2626',
  emerald: '#16A34A',
  ink: COLORS.ink,
  surface: COLORS.surface,
  bg: COLORS.bg,
  secondaryInk: COLORS.secondaryInk,
  gridLine: COLORS.gridLine,
};

export default makeScene2D(function* (view) {
  const time = useThread().time;
  const t0 = time();

  // Setup Swiss Base Stage (Grid lines, section indicator, subtitle pill)
  setupBaseStage(view, 'KNP? // 03: JEBAKAN DANA ASING');

  const wide = isWidescreen(view);
  const baseTypo = getTypo(wide);
  const baseAssets = getAssets(wide);

  const typo = {
    ...baseTypo,
    heroTitle: wide ? 38 : 34,
    cardTitle: wide ? 30 : 32,
    cardSub: wide ? 18 : 20,
    badge: wide ? 18 : 20,
    pill: wide ? 22 : 24,
    sublabel: wide ? 18 : 20,
    summary: wide ? 20 : 22,
  };

  const assets = {
    ...baseAssets,
    logoSquare: wide ? 56 : 64,
  };

  // Station card dimensions & positions
  const hubAX = wide ? -460 : 0;
  const hubAY = wide ? 60 : -180;
  const hubBX = wide ? 460 : 0;
  const hubBY = wide ? 60 : 260;
  const cardW = wide ? 520 : 780;
  const cardH = wide ? 250 : 230;

  // Animation signals
  const focalId = createSignal(0);

  const headerOpacity = createSignal(0);
  const headerScale = createSignal(0.95);

  const hubAOpacity = createSignal(0);
  const hubAScale = createSignal(0.9);
  const hubAStroke = createSignal<string>(PALETTE.ink);

  const hubBOpacity = createSignal(0);
  const hubBScale = createSignal(0.9);
  const hubBStroke = createSignal<string>(PALETTE.ink);

  const statAPillOpacity = createSignal(0);
  const statAPillScale = createSignal(0.85);

  const statBPillOpacity = createSignal(0);
  const statBPillScale = createSignal(0.85);

  const outPathEnd = createSignal(0);
  const outBadgeOpacity = createSignal(0);
  const outBadgeScale = createSignal(0.8);

  const retPathEnd = createSignal(0);
  const retBadgeOpacity = createSignal(0);
  const retBadgeScale = createSignal(0.8);

  const summaryOpacity = createSignal(0);
  const summaryScale = createSignal(0.9);

  const camera = createRef<Node>();

  // Rule 7 Perpendicular 90° Conduits
  // 16:9: 4-point perpendicular conduits ([x, -65] -> [x, -220] -> [x2, -220] -> [x2, -65])
  // 9:16: 2-point straight vertical conduits ([[-250, -65], [-250, 145]])
  const outPoints: [number, number][] = wide
    ? [
        [hubAX, -65],
        [hubAX, -220],
        [hubBX, -220],
        [hubBX, -65],
      ]
    : [
        [-250, hubAY + 115],
        [-250, hubBY - 115],
      ];

  const retPoints: [number, number][] = wide
    ? [
        [hubBX, 185],
        [hubBX, 305],
        [hubAX, 305],
        [hubAX, 185],
      ]
    : [
        [250, hubBY - 115],
        [250, hubAY + 115],
      ];

  view.add(
    <Node ref={camera}>
      {/* ===== HEADER TITLE BLOCK ===== */}
      <Rect
        x={0}
        y={wide ? -370 : -620}
        opacity={headerOpacity}
        scale={headerScale}
        layout
        direction="column"
        alignItems="center"
        gap={wide ? 8 : 12}
      >
        <Rect
          layout
          padding={wide ? [6, 16] : [8, 18]}
          fill={PALETTE.cyan}
          radius={6}
        >
          <Txt
            text="MEKANISME INDEKS OTOMATIS // JEBAKAN LIKUIDITAS"
            fontFamily={FONTS.data}
            fontSize={typo.badge}
            fontWeight={700}
            fill={PALETTE.surface}
            letterSpacing={1.2}
          />
        </Rect>
        <Txt
          text="KENAPA DANA ASING BISA TERJEBAK?"
          fontFamily={FONTS.heading}
          fontSize={typo.heroTitle}
          fontWeight={700}
          fill={PALETTE.ink}
        />
      </Rect>

      {/* ===== OUTBOUND CONDUIT (Station A -> Station B: Amber) ===== */}
      <Line
        points={outPoints}
        stroke={PALETTE.amber}
        lineWidth={5}
        radius={20}
        endArrow
        arrowSize={16}
        end={outPathEnd}
      />

      {/* Outbound Conduit Badge */}
      <Rect
        x={wide ? 0 : -250}
        y={wide ? -220 : 40}
        opacity={outBadgeOpacity}
        scale={() => focalScale(focalId, 3, outBadgeScale, time)}
        layout
        padding={wide ? [8, 18] : [10, 20]}
        fill={PALETTE.amber}
        stroke={PALETTE.ink}
        lineWidth={3}
        radius={8}
      >
        <Txt
          text="MASUK KE SAHAM 3%"
          fontFamily={FONTS.data}
          fontSize={typo.pill}
          fontWeight={700}
          fill={PALETTE.surface}
        />
      </Rect>

      {/* ===== RETURN CONDUIT (Station B -> Station A: Crimson Trap) ===== */}
      <Line
        points={retPoints}
        stroke={PALETTE.crimson}
        lineWidth={5}
        lineDash={[14, 8]}
        lineDashOffset={() => -time() * 45}
        radius={20}
        endArrow
        arrowSize={16}
        end={retPathEnd}
      />

      {/* Return Conduit Badge */}
      <Rect
        x={wide ? 0 : 250}
        y={wide ? 305 : 40}
        opacity={retBadgeOpacity}
        scale={() => focalScale(focalId, 4, retBadgeScale, time)}
        layout
        padding={wide ? [8, 18] : [10, 20]}
        fill={PALETTE.crimson}
        stroke={PALETTE.ink}
        lineWidth={3}
        radius={8}
      >
        <Txt
          text="MAU JUAL: NGGAK ADA PEMBELI"
          fontFamily={FONTS.data}
          fontSize={typo.pill}
          fontWeight={700}
          fill={PALETTE.surface}
        />
      </Rect>

      {/* ===== STATION A: ROBOT DANA ASING (Left / Top) ===== */}
      <Rect
        x={hubAX}
        y={hubAY}
        width={cardW}
        height={cardH}
        opacity={hubAOpacity}
        scale={() => focalScale(focalId, 1, hubAScale, time)}
        layout
        direction="column"
        padding={wide ? [22, 28] : [24, 32]}
        gap={wide ? 10 : 12}
        fill={PALETTE.surface}
        stroke={hubAStroke}
        lineWidth={3.5}
        radius={14}
      >
        <Rect layout direction="row" alignItems="center" justifyContent="space-between" width="100%">
          <Rect layout direction="row" alignItems="center" gap={14}>
            <Img
              src={'/assets/vid_20261031_001/etf_robot_icon.png'}
              width={assets.logoSquare}
              height={assets.logoSquare}
            />
            <Rect layout direction="column" gap={4}>
              <Txt
                text="ROBOT DANA ASING"
                fontFamily={FONTS.heading}
                fontSize={typo.cardTitle}
                fontWeight={700}
                fill={PALETTE.ink}
              />
              <Txt
                text="IKUT DAFTAR BELANJA MSCI"
                fontFamily={FONTS.data}
                fontSize={typo.cardSub}
                fontWeight={700}
                fill={PALETTE.secondaryInk}
              />
            </Rect>
          </Rect>
          <Rect layout padding={[6, 12]} fill={PALETTE.bg} radius={4}>
            <Txt
              text="DANA PENSIUN & REKSA DANA"
              fontFamily={FONTS.data}
              fontSize={typo.badge}
              fontWeight={700}
              fill={PALETTE.secondaryInk}
            />
          </Rect>
        </Rect>

        {/* Inner Stat Pill A */}
        <Rect
          opacity={statAPillOpacity}
          scale={statAPillScale}
          layout
          padding={wide ? [8, 16] : [10, 18]}
          fill={PALETTE.cyan}
          radius={6}
          alignSelf="start"
        >
          <Txt
            text="WAJIB BELI OTOMATIS"
            fontFamily={FONTS.data}
            fontSize={typo.pill}
            fontWeight={700}
            fill={PALETTE.surface}
          />
        </Rect>
      </Rect>

      {/* ===== STATION B: SAHAM GORENGAN (Right / Bottom) ===== */}
      <Rect
        x={hubBX}
        y={hubBY}
        width={cardW}
        height={cardH}
        opacity={hubBOpacity}
        scale={() => focalScale(focalId, 2, hubBScale, time)}
        layout
        direction="column"
        padding={wide ? [22, 28] : [24, 32]}
        gap={wide ? 10 : 12}
        fill={PALETTE.surface}
        stroke={hubBStroke}
        lineWidth={3.5}
        radius={14}
      >
        <Rect layout direction="row" alignItems="center" justifyContent="space-between" width="100%">
          <Rect layout direction="row" alignItems="center" gap={14}>
            <Img
              src={'/assets/vid_20261031_001/whale_lock_icon.png'}
              width={assets.logoSquare}
              height={assets.logoSquare}
            />
            <Rect layout direction="column" gap={4}>
              <Txt
                text="TERJEBAK DI PUCUK"
                fontFamily={FONTS.heading}
                fontSize={typo.cardTitle}
                fontWeight={700}
                fill={PALETTE.ink}
              />
              <Txt
                text="97% SAHAM DIKUNCI PEMILIK"
                fontFamily={FONTS.data}
                fontSize={typo.cardSub}
                fontWeight={700}
                fill={PALETTE.secondaryInk}
              />
            </Rect>
          </Rect>
          <Rect layout padding={[6, 12]} fill={PALETTE.bg} radius={4}>
            <Txt
              text="LIKUIDITAS SEMU"
              fontFamily={FONTS.data}
              fontSize={typo.badge}
              fontWeight={700}
              fill={PALETTE.crimson}
            />
          </Rect>
        </Rect>

        {/* Inner Stat Pill B */}
        <Rect
          opacity={statBPillOpacity}
          scale={statBPillScale}
          layout
          padding={wide ? [8, 16] : [10, 18]}
          fill={PALETTE.crimson}
          radius={6}
          alignSelf="start"
        >
          <Txt
            text="HARGA MEROKET SEMU"
            fontFamily={FONTS.data}
            fontSize={typo.pill}
            fontWeight={700}
            fill={PALETTE.surface}
          />
        </Rect>
      </Rect>

      {/* ===== BOTTOM SUMMARY BANNER ===== */}
      <Rect
        x={0}
        y={wide ? 355 : 475}
        opacity={summaryOpacity}
        scale={summaryScale}
        layout
        padding={wide ? [10, 22] : [12, 24]}
        fill={PALETTE.surface}
        stroke={PALETTE.ink}
        lineWidth={3}
        radius={10}
      >
        <Txt
          text="DANA TRILIUNAN MASUK PINTU SEMPIT — BEGITU MAU KELUAR, PINTUNYA MACET"
          fontFamily={FONTS.data}
          fontSize={typo.summary}
          fontWeight={700}
          fill={PALETTE.ink}
          textAlign="center"
        />
      </Rect>
    </Node>
  );

  // --- Choreography & Sync (Duration: 22.26s, global: 39.46s - 61.72s) ---

  // t = 0.3s: Header block & Station B enter
  yield* waitUntilSceneTime(0.3, t0);
  focalId(2);
  yield* all(
    headerOpacity(1, 0.4),
    headerScale(1.0, 0.5, easeOutExpo),
    hubBOpacity(1, 0.4),
    hubBScale(1.0, 0.5, easeOutExpo),
  );

  // t = 2.4s (global 41.86s, "harga sahamnya gampang banget di goreng naik"):
  // Station B inner stat pill reveals HARGA MEROKET SEMU
  yield* waitUntilSceneTime(2.4, t0);
  yield* all(
    statBPillOpacity(1, 0.2),
    statBPillScale(1.12, 0.25, easeOutExpo).to(1.0, 0.2, easeInOutCubic),
  );

  // t = 6.8s (global 46.26s, "reksa dana raksasa dunia"):
  // Station A pops in (ROBOT DANA ASING)
  yield* waitUntilSceneTime(6.8, t0);
  focalId(1);
  yield* all(
    hubAOpacity(1, 0.4),
    hubAScale(1.0, 0.5, easeOutExpo),
  );

  // t = 9.9s (global 49.38s, "wajib beli"):
  // Station A inner stat pill reveals WAJIB BELI OTOMATIS
  yield* waitUntilSceneTime(9.9, t0);
  yield* all(
    statAPillOpacity(1, 0.2),
    statAPillScale(1.12, 0.25, easeOutExpo).to(1.0, 0.2, easeInOutCubic),
  );

  // t = 13.4s (global 52.90s, "cuma 3% tadi"):
  // Outbound conduit draws from Station A to Station B, badge pops
  yield* waitUntilSceneTime(13.4, t0);
  focalId(3);
  yield* all(
    outPathEnd(1, 1.2, easeInOutCubic),
    outBadgeOpacity(1, 0.3),
    outBadgeScale(1.12, 0.3, easeOutExpo).to(1.0, 0.25, easeInOutCubic),
  );

  // t = 16.4s (global 55.90s, "uang triliunan ... terjebak beli di harga pucuk"):
  // Station B border turns crimson alert
  yield* waitUntilSceneTime(16.4, t0);
  focalId(2);
  yield* all(
    hubBStroke(PALETTE.crimson, 0.4),
  );

  // t = 19.5s (global 59.00s, "pas mau jual, nggak ada pembelinya"):
  // Return conduit draws back & summary banner reveals
  yield* waitUntilSceneTime(19.5, t0);
  focalId(4);
  yield* all(
    retPathEnd(1, 1.0, easeInOutCubic),
    retBadgeOpacity(1, 0.2),
    retBadgeScale(1.12, 0.25, easeOutExpo).to(1.0, 0.2, easeInOutCubic),
    summaryOpacity(1, 0.3),
    summaryScale(1.05, 0.3, easeOutExpo).to(1.0, 0.2, easeInOutCubic),
  );

  // Strict Hold-Time: Diagram holds until 22.26s (hold = 2.4s)
  yield* finishSceneAt(22.26, t0);
});
