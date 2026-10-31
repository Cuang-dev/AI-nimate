import { Img, Line, makeScene2D, Node, Rect, Txt } from '@motion-canvas/2d';
import { all, createRef, createSignal, easeInOutCubic, easeOutExpo, useThread } from '@motion-canvas/core';
import { COLORS, FONTS, HEADING_FONT, PALETTE, isWidescreen, setupBaseStage, BEAT_LABELS } from './layout';
import { finishSceneAt, focalScale, SCENE_TIMINGS, waitUntilSceneTime } from './timings';

export default makeScene2D(function* (view) {
  const time = useThread().time;
  const t0 = time();

  // Setup Swiss Base Stage (Grid lines, top navigation pill bar, section indicator, subtitle pill)
  setupBaseStage(view, BEAT_LABELS[2]);

  const wide = isWidescreen(view);
  const sceneDuration = SCENE_TIMINGS[2].duration;

  // Station card dimensions & positions
  const cardW = wide ? 600 : 860;
  const cardH = wide ? 230 : 210;
  const hubAX = wide ? -460 : 0;
  const hubAY = wide ? 60 : -240;
  const hubBX = wide ? 460 : 0;
  const hubBY = wide ? 60 : 240;

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

  const camera = createRef<Node>();

  // 90° Perpendicular Conduits
  // 9:16: Straight vertical conduits connecting bottom edge of Station A (y = -135) to top edge of Station B (y = 135)
  // 16:9: 4-point perpendicular conduits connecting top/bottom edges
  const outPoints: [number, number][] = wide
    ? [
        [hubAX, hubAY - cardH / 2],
        [hubAX, -200],
        [hubBX, -200],
        [hubBX, hubAY - cardH / 2],
      ]
    : [
        [-220, -135],
        [-220, 131],
      ];

  const retPoints: [number, number][] = wide
    ? [
        [hubBX, hubBY + cardH / 2],
        [hubBX, 310],
        [hubAX, 310],
        [hubAX, hubBY + cardH / 2],
      ]
    : [
        [220, 135],
        [220, -131],
      ];

  view.add(
    <Node ref={camera}>
      {/* ===== HEADER: ONE SINGLE BOLD TITLE ===== */}
      <Txt
        x={0}
        y={wide ? -340 : -620}
        opacity={headerOpacity}
        scale={headerScale}
        text="SAAT MODAL HABIS"
        fontFamily={HEADING_FONT}
        fontSize={wide ? 48 : 52}
        fontWeight={800}
        fill={PALETTE.ink}
      />

      {/* ===== LEFT DOWNWARD CONDUIT (Station A -> Station B: Amber) ===== */}
      <Line
        points={outPoints}
        stroke={PALETTE.amber}
        lineWidth={5}
        radius={20}
        endArrow
        arrowSize={16}
        end={outPathEnd}
      />

      {/* Left Conduit Pill */}
      <Rect
        x={wide ? 0 : -220}
        y={wide ? -200 : 0}
        width={330}
        height={54}
        radius={12}
        fill={PALETTE.amber}
        stroke={PALETTE.ink}
        lineWidth={3}
        opacity={outBadgeOpacity}
        scale={() => focalScale(focalId, 2, () => outBadgeScale(), time)}
      >
        <Txt
          text="AI HEMAT MUNCUL"
          fontFamily={FONTS.data}
          fontSize={22}
          fontWeight={800}
          fill={'#FFFFFF'}
        />
      </Rect>

      {/* ===== RIGHT UPWARD CONDUIT (Station B -> Station A: Crimson) ===== */}
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

      {/* Right Conduit Pill */}
      <Rect
        x={wide ? 0 : 220}
        y={wide ? 310 : 0}
        width={330}
        height={54}
        radius={12}
        fill={PALETTE.crimson}
        stroke={PALETTE.ink}
        lineWidth={3}
        opacity={retBadgeOpacity}
        scale={() => focalScale(focalId, 4, () => retBadgeScale(), time)}
      >
        <Txt
          text="INVESTOR JUAL MASAL"
          fontFamily={FONTS.data}
          fontSize={22}
          fontWeight={800}
          fill={'#FFFFFF'}
        />
      </Rect>

      {/* ===== STATION A: TOP CARD (Raksasa Chip / Bakar Modal) ===== */}
      <Rect
        x={hubAX}
        y={hubAY}
        width={cardW}
        height={cardH}
        opacity={hubAOpacity}
        scale={() => focalScale(focalId, 1, () => hubAScale(), time)}
        fill={PALETTE.surface}
        stroke={hubAStroke}
        lineWidth={3.5}
        radius={16}
      >
        <Img
          src={'/assets/vid_20261031_002/ai_chip_flame_icon.png'}
          x={wide ? -cardW / 2 + 70 : -320}
          y={0}
          width={84}
          height={84}
        />
        <Txt
          x={wide ? 20 : 40}
          y={-35}
          text="BAKAR MODAL BESAR"
          fontFamily={HEADING_FONT}
          fontSize={wide ? 32 : 36}
          fontWeight={800}
          fill={PALETTE.ink}
        />
        <Rect
          x={wide ? 20 : 40}
          y={38}
          width={wide ? 380 : 420}
          height={56}
          radius={12}
          fill={PALETTE.amber}
          opacity={statAPillOpacity}
          scale={statAPillScale}
        >
          <Txt
            text="BALIK MODAL LAMA"
            fontFamily={FONTS.data}
            fontSize={22}
            fontWeight={800}
            fill={'#FFFFFF'}
          />
        </Rect>
      </Rect>

      {/* ===== STATION B: BOTTOM CARD (Tech Lokal / Saham Rontok) ===== */}
      <Rect
        x={hubBX}
        y={hubBY}
        width={cardW}
        height={cardH}
        opacity={hubBOpacity}
        scale={() => focalScale(focalId, 3, () => hubBScale(), time)}
        fill={PALETTE.surface}
        stroke={hubBStroke}
        lineWidth={3.5}
        radius={16}
      >
        <Img
          src={'/assets/vid_20261031_002/cart_closed_icon.png'}
          x={wide ? -cardW / 2 + 70 : -320}
          y={0}
          width={84}
          height={84}
        />
        <Txt
          x={wide ? 20 : 40}
          y={-35}
          text="SAHAM & TOKO RONTOK"
          fontFamily={HEADING_FONT}
          fontSize={wide ? 32 : 36}
          fontWeight={800}
          fill={PALETTE.ink}
        />
        <Rect
          x={wide ? 20 : 40}
          y={38}
          width={wide ? 380 : 420}
          height={56}
          radius={12}
          fill={PALETTE.crimson}
          opacity={statBPillOpacity}
          scale={statBPillScale}
        >
          <Txt
            text="BUKALAPAK TUTUP FISIK"
            fontFamily={FONTS.data}
            fontSize={22}
            fontWeight={800}
            fill={'#FFFFFF'}
          />
        </Rect>
      </Rect>
    </Node>
  );

  // --- Choreography & Sync (Duration: 17.587s, global: 31.081s - 48.668s) ---

  // Step 1: t = 0.22s (global 31.30s): Header block & Station A enter
  yield* waitUntilSceneTime(0.22, t0);
  focalId(1);
  yield* all(
    headerOpacity(1, 0.4),
    headerScale(1.0, 0.5, easeOutExpo),
    hubAOpacity(1, 0.4),
    hubAScale(1.0, 0.5, easeOutExpo),
  );

  // Step 1b: t = 2.96s (global 34.04s, "balik modal"):
  // Station A inner stat pill reveals BALIK MODAL LAMA
  yield* waitUntilSceneTime(2.96, t0);
  yield* all(
    statAPillOpacity(1, 0.2),
    statAPillScale(1.12, 0.25, easeOutExpo).to(1.0, 0.2, easeInOutCubic),
  );

  // Step 2: t = 5.42s (global 36.50s "pesaing baru" -> 39.60s "chip"):
  // Animate Left Downward Perpendicular Conduit & AI HEMAT MUNCUL pill
  yield* waitUntilSceneTime(5.42, t0);
  focalId(2);
  yield* all(
    outPathEnd(1, 1.2, easeInOutCubic),
    outBadgeOpacity(1, 0.3),
    outBadgeScale(1.12, 0.3, easeOutExpo).to(1.0, 0.25, easeInOutCubic),
  );

  // Step 3: t = 9.32s (global 40.40s "rontok" -> 42.30s "diskon distop"):
  // Station B enters (SAHAM & TOKO RONTOK)
  yield* waitUntilSceneTime(9.32, t0);
  focalId(3);
  yield* all(
    hubBOpacity(1, 0.4),
    hubBScale(1.0, 0.5, easeOutExpo),
  );

  // Step 4: t = 14.32s (global 45.40s "Bukalapak tutup"):
  // Pop Station B's Crimson Pill (BUKALAPAK TUTUP FISIK) & Right Upward Conduit (INVESTOR JUAL MASAL)
  yield* waitUntilSceneTime(14.32, t0);
  focalId(4);
  yield* all(
    statBPillOpacity(1, 0.2),
    statBPillScale(1.12, 0.25, easeOutExpo).to(1.0, 0.2, easeInOutCubic),
    retPathEnd(1, 1.0, easeInOutCubic),
    retBadgeOpacity(1, 0.2),
    retBadgeScale(1.12, 0.25, easeOutExpo).to(1.0, 0.2, easeInOutCubic),
    hubAStroke(PALETTE.crimson, 0.4),
    hubBStroke(PALETTE.crimson, 0.4),
  );

  // Hold until end of beat (17.587s)
  yield* finishSceneAt(sceneDuration, t0);
});
