import { Img, Line, makeScene2D, Node, Rect, Txt } from '@motion-canvas/2d';
import {
  all,
  createRef,
  createSignal,
  easeInOutCubic,
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
  cyan: '#0284C7',
  amber: '#D97706',
  crimson: '#DC2626',
  emerald: '#16A34A',
  ink: COLORS.ink,
  surface: COLORS.surface,
  bg: COLORS.bg,
  secondaryInk: '#334155',
  gridLine: COLORS.gridLine,
};

export default makeScene2D(function* (view) {
  const time = useThread().time;
  const t0 = time();

  // Setup Swiss Base Stage (Grid lines, section indicator, subtitle pill)
  setupBaseStage(view, 'KNP? // 03: JEBAKAN DANA ASING');

  const wide = isWidescreen(view);
  const typo = getTypo(wide);
  const assets = getAssets(wide);

  // Station card dimensions & positions
  const hubAX = wide ? -460 : 0;
  const hubAY = wide ? 60 : -200;
  const hubBX = wide ? 460 : 0;
  const hubBY = wide ? 60 : 240;
  const cardW = wide ? 540 : 780;
  const cardH = wide ? 180 : 160;

  // Animation signals
  const focalId = createSignal(0);

  const headerOpacity = createSignal(0);
  const headerScale = createSignal(0.95);

  const hubAOpacity = createSignal(0);
  const hubAScale = createSignal(0.9);

  const hubBOpacity = createSignal(0);
  const hubBScale = createSignal(0.9);

  const outPathEnd = createSignal(0);
  const outBadgeOpacity = createSignal(0);

  const retPathEnd = createSignal(0);
  const retBadgeOpacity = createSignal(0);

  const camera = createRef<Node>();

  // Perpendicular Conduits
  const outPoints: [number, number][] = wide
    ? [
        [hubAX, -30],
        [hubAX, -180],
        [hubBX, -180],
        [hubBX, -30],
      ]
    : [
        [-220, hubAY + cardH / 2],
        [-220, hubBY - cardH / 2],
      ];

  const retPoints: [number, number][] = wide
    ? [
        [hubBX, 150],
        [hubBX, 280],
        [hubAX, 280],
        [hubAX, 150],
      ]
    : [
        [220, hubBY - cardH / 2],
        [220, hubAY + cardH / 2],
      ];

  view.add(
    <Node ref={camera}>
      {/* ===== HEADER TITLE BLOCK (Eyebrow pill removed) ===== */}
      <Rect
        x={0}
        y={wide ? -370 : -620}
        opacity={headerOpacity}
        scale={headerScale}
        layout
        direction="column"
        alignItems="center"
      >
        <Txt
          text="KENAPA DANA ASING BISA TERJEBAK?"
          fontFamily={FONTS.heading}
          fontSize={wide ? 38 : 34}
          fontWeight={800}
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

      {/* Outbound Conduit Badge (width = 330, x = -220) */}
      <Rect
        x={wide ? 0 : -220}
        y={wide ? -180 : 20}
        width={330}
        height={48}
        opacity={outBadgeOpacity}
        layout
        justifyContent="center"
        alignItems="center"
        padding={[6, 12]}
        fill={PALETTE.amber}
        stroke={PALETTE.ink}
        lineWidth={2.5}
        radius={8}
      >
        <Txt
          text="MASUK SAHAM 3%"
          fontFamily={FONTS.data}
          fontSize={18}
          fontWeight={700}
          fill={PALETTE.surface}
        />
      </Rect>

      {/* ===== RETURN CONDUIT (Station B -> Station A: Crimson Trap) ===== */}
      <Line
        points={retPoints}
        stroke={PALETTE.crimson}
        lineWidth={5}
        lineDash={[12, 8]}
        lineDashOffset={() => -time() * 45}
        radius={20}
        endArrow
        arrowSize={16}
        end={retPathEnd}
      />

      {/* Return Conduit Badge (width = 330, x = +220) */}
      <Rect
        x={wide ? 0 : 220}
        y={wide ? 280 : 20}
        width={330}
        height={48}
        opacity={retBadgeOpacity}
        layout
        justifyContent="center"
        alignItems="center"
        padding={[6, 12]}
        fill={PALETTE.crimson}
        stroke={PALETTE.ink}
        lineWidth={2.5}
        radius={8}
      >
        <Txt
          text="NGGAK ADA PEMBELI"
          fontFamily={FONTS.data}
          fontSize={18}
          fontWeight={700}
          fill={PALETTE.surface}
        />
      </Rect>

      {/* ===== STATION A: ROBOT DANA ASING ===== */}
      <Rect
        x={hubAX}
        y={hubAY}
        width={cardW}
        height={cardH}
        opacity={hubAOpacity}
        scale={() => focalScale(focalId, 1, hubAScale, time)}
        layout
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        padding={wide ? [0, 28] : [0, 24]}
        fill={PALETTE.surface}
        stroke={PALETTE.ink}
        lineWidth={3.5}
        radius={14}
      >
        <Rect layout direction="row" alignItems="center" gap={14}>
          <Img
            src={'/assets/vid_20261031_001/etf_robot_icon.png'}
            width={wide ? 54 : 58}
            height={wide ? 54 : 58}
          />
          <Txt
            text="ROBOT DANA ASING"
            fontFamily={FONTS.heading}
            fontSize={wide ? 28 : 26}
            fontWeight={800}
            fill={PALETTE.ink}
          />
        </Rect>

        <Rect
          layout
          padding={wide ? [8, 16] : [8, 14]}
          fill={PALETTE.cyan}
          radius={6}
        >
          <Txt
            text="WAJIB BELI OTOMATIS"
            fontFamily={FONTS.data}
            fontSize={wide ? 18 : 17}
            fontWeight={700}
            fill={PALETTE.surface}
          />
        </Rect>
      </Rect>

      {/* ===== STATION B: TERJEBAK DI PUCUK ===== */}
      <Rect
        x={hubBX}
        y={hubBY}
        width={cardW}
        height={cardH}
        opacity={hubBOpacity}
        scale={() => focalScale(focalId, 2, hubBScale, time)}
        layout
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        padding={wide ? [0, 28] : [0, 24]}
        fill={PALETTE.surface}
        stroke={PALETTE.crimson}
        lineWidth={3.5}
        radius={14}
      >
        <Rect layout direction="row" alignItems="center" gap={14}>
          <Img
            src={'/assets/vid_20261031_001/whale_lock_icon.png'}
            width={wide ? 54 : 58}
            height={wide ? 54 : 58}
          />
          <Txt
            text="TERJEBAK DI PUCUK"
            fontFamily={FONTS.heading}
            fontSize={wide ? 28 : 26}
            fontWeight={800}
            fill={PALETTE.crimson}
          />
        </Rect>

        <Rect
          layout
          padding={wide ? [8, 16] : [8, 14]}
          fill={PALETTE.crimson}
          radius={6}
        >
          <Txt
            text="HARGA MEROKET SEMU"
            fontFamily={FONTS.data}
            fontSize={wide ? 18 : 17}
            fontWeight={700}
            fill={PALETTE.surface}
          />
        </Rect>
      </Rect>
    </Node>
  );

  // --- Choreography & Sync (Duration: 22.26s, global: 39.46s - 61.72s) ---
  const sceneStart = SCENE_TIMINGS[2].start; // 39.46
  const sceneDuration = SCENE_TIMINGS[2].duration; // 22.26
  const rel = (absSec: number) => absSec - sceneStart;

  // t = 0.3s: Header block enters
  yield* waitUntilSceneTime(0.3, t0);
  yield* all(
    headerOpacity(1, 0.4),
    headerScale(1.0, 0.45, easeOutExpo),
  );

  // Reveal strictly in spoken order:
  // 1. Station A (@ 46.2s)
  yield* waitUntilSceneTime(rel(46.2), t0);
  focalId(1);
  yield* all(
    hubAOpacity(1, 0.4),
    hubAScale(1.0, 0.45, easeOutExpo),
  );

  // 2. Left Down Pipe (@ 52.8s)
  yield* waitUntilSceneTime(rel(52.8), t0);
  yield* all(
    outPathEnd(1, 0.9, easeInOutCubic),
    outBadgeOpacity(1, 0.3),
  );

  // 3. Station B (@ 54.5s)
  yield* waitUntilSceneTime(rel(54.5), t0);
  focalId(2);
  yield* all(
    hubBOpacity(1, 0.4),
    hubBScale(1.0, 0.45, easeOutExpo),
  );

  // 4. Right Up Pipe (@ 58.0s)
  yield* waitUntilSceneTime(rel(58.0), t0);
  yield* all(
    retPathEnd(1, 0.9, easeInOutCubic),
    retBadgeOpacity(1, 0.3),
  );

  // Strict Hold-Time: Diagram holds until 22.26s
  yield* finishSceneAt(sceneDuration, t0);
});
