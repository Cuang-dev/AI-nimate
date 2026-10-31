import { Img, makeScene2D, Node, Rect, Txt } from '@motion-canvas/2d';
import { all, createRef, createSignal, easeInOutCubic, easeOutExpo, useThread } from '@motion-canvas/core';
import { COLORS, FONTS, HEADING_FONT, PALETTE, isWidescreen, setupBaseStage, BEAT_LABELS } from './layout';
import { finishSceneAt, focalScale, SCENE_TIMINGS, waitUntilSceneTime } from './timings';

export default makeScene2D(function* (view) {
  const time = useThread().time;
  const t0 = time();

  // Setup Swiss Base Stage (Grid lines, top navigation pill bar, section indicator, subtitle pill)
  setupBaseStage(view, BEAT_LABELS[4]);

  const wide = isWidescreen(view);
  const sceneDuration = SCENE_TIMINGS[4].duration;

  // 3-Card Stack Dimensions & Positions
  // 9:16: cardW = 900, cardH = 185, y = [-310, -80, +150]
  // 16:9: cardW = 1200, cardH = 135, y = [-120, +35, +190]
  const cardW = wide ? 1200 : 900;
  const cardH = wide ? 135 : 185;
  const y1 = wide ? -120 : -310;
  const y2 = wide ? 35 : -80;
  const y3 = wide ? 190 : 150;

  // Focal tracking signal (1: Card 1, 2: Card 2, 3: Card 3)
  const focalId = createSignal(0);

  const headerOpacity = createSignal(0);
  const headerScale = createSignal(0.95);

  // Card 1 Signals (Top: #1 JANGAN SILAU RAMAI)
  const c1Opacity = createSignal(0);
  const c1Scale = createSignal(0.92);

  // Card 2 Signals (Middle: #2 CEK UNTUNG ASLI)
  const c2Opacity = createSignal(0);
  const c2Scale = createSignal(0.92);

  // Card 3 Signals (Bottom: #3 UJI TANPA DISKON)
  const c3Opacity = createSignal(0);
  const c3Scale = createSignal(0.92);
  const c3Stroke = createSignal<string>(PALETTE.amber);

  const camera = createRef<Node>();

  view.add(
    <Node ref={camera}>
      {/* ===== HEADER: ONE SINGLE BOLD TITLE ===== */}
      <Txt
        x={0}
        y={wide ? -340 : -620}
        opacity={headerOpacity}
        scale={headerScale}
        text="3 FILTER SAHAM TECH"
        fontFamily={HEADING_FONT}
        fontSize={wide ? 48 : 52}
        fontWeight={800}
        fill={PALETTE.ink}
      />

      {/* ===== CARD 1 (TOP, y = -310): #1 JANGAN SILAU RAMAI ===== */}
      <Rect
        x={0}
        y={y1}
        width={cardW}
        height={cardH}
        fill={PALETTE.surface}
        stroke={PALETTE.emerald}
        lineWidth={3.5}
        radius={16}
        opacity={c1Opacity}
        scale={() => focalScale(focalId, 1, () => c1Scale(), time)}
      >
        <Rect
          x={wide ? -cardW / 2 + 75 : -360}
          y={0}
          width={90}
          height={90}
          radius={16}
          fill={PALETTE.emerald}
        >
          <Txt
            text="#1"
            fontFamily={FONTS.data}
            fontSize={40}
            fontWeight={800}
            fill={'#FFFFFF'}
          />
        </Rect>
        <Txt
          x={wide ? -40 : 40}
          y={-24}
          text="JANGAN SILAU RAMAI"
          fontFamily={HEADING_FONT}
          fontSize={36}
          fontWeight={800}
          fill={PALETTE.ink}
        />
        <Txt
          x={wide ? -40 : 40}
          y={28}
          text="APLIKASI POPULER BISA RUGI BESAR"
          fontFamily={FONTS.data}
          fontSize={24}
          fontWeight={700}
          fill={PALETTE.muted}
        />
      </Rect>

      {/* ===== CARD 2 (MIDDLE, y = -80): #2 CEK UNTUNG ASLI ===== */}
      <Rect
        x={0}
        y={y2}
        width={cardW}
        height={cardH}
        fill={PALETTE.surface}
        stroke={PALETTE.cyan}
        lineWidth={3.5}
        radius={16}
        opacity={c2Opacity}
        scale={() => focalScale(focalId, 2, () => c2Scale(), time)}
      >
        <Rect
          x={wide ? -cardW / 2 + 75 : -360}
          y={0}
          width={90}
          height={90}
          radius={16}
          fill={PALETTE.cyan}
        >
          <Txt
            text="#2"
            fontFamily={FONTS.data}
            fontSize={40}
            fontWeight={800}
            fill={'#FFFFFF'}
          />
        </Rect>
        <Txt
          x={wide ? -40 : 40}
          y={-24}
          text="CEK UNTUNG ASLI"
          fontFamily={HEADING_FONT}
          fontSize={36}
          fontWeight={800}
          fill={PALETTE.ink}
        />
        <Txt
          x={wide ? -40 : 40}
          y={28}
          text="WAJIB UNTUNG TANPA BAKAR UANG"
          fontFamily={FONTS.data}
          fontSize={24}
          fontWeight={700}
          fill={PALETTE.muted}
        />
      </Rect>

      {/* ===== CARD 3 (BOTTOM, y = +150): UJI TANPA DISKON ===== */}
      <Rect
        x={0}
        y={y3}
        width={cardW}
        height={cardH}
        fill={PALETTE.surface}
        stroke={c3Stroke}
        lineWidth={3.5}
        radius={16}
        opacity={c3Opacity}
        scale={() => focalScale(focalId, 3, () => c3Scale(), time)}
      >
        <Img
          src={'/assets/vid_20261031_002/profit_shield_icon.png'}
          x={wide ? -cardW / 2 + 75 : -360}
          y={0}
          width={84}
          height={84}
        />
        <Txt
          x={wide ? -40 : 40}
          y={-24}
          text="UJI TANPA DISKON"
          fontFamily={HEADING_FONT}
          fontSize={36}
          fontWeight={800}
          fill={PALETTE.ink}
        />
        <Txt
          x={wide ? -40 : 40}
          y={28}
          text="SEKARANG KAMU TAHU KENAPA."
          fontFamily={FONTS.data}
          fontSize={24}
          fontWeight={800}
          fill={PALETTE.crimson}
        />
      </Rect>
    </Node>
  );

  // --- Choreography & Sync (Duration: 13.913s, global: 63.11s - 77.023s) ---

  // t = 0.3s (global 63.41s): Header block enters
  yield* waitUntilSceneTime(0.3, t0);
  yield* all(
    headerOpacity(1, 0.4),
    headerScale(1.0, 0.5, easeOutExpo),
  );

  // Step 1: t = 2.39s (global 65.50s "ramai dipakai"):
  // Card 1 enters (TOP, #1 JANGAN SILAU RAMAI)
  yield* waitUntilSceneTime(2.39, t0);
  focalId(1);
  yield* all(
    c1Opacity(1, 0.4),
    c1Scale(1.0, 0.5, easeOutExpo),
  );

  // Step 2: t = 4.92s (global 68.03s "beneran untung"):
  // Card 2 enters (MIDDLE, #2 CEK UNTUNG ASLI)
  yield* waitUntilSceneTime(4.92, t0);
  focalId(2);
  yield* all(
    c2Opacity(1, 0.4),
    c2Scale(1.0, 0.5, easeOutExpo),
  );

  // Step 3: t = 11.09s (global 74.20s "subsidi diskon"):
  // Card 3 enters (BOTTOM, UJI TANPA DISKON)
  yield* waitUntilSceneTime(11.09, t0);
  focalId(3);
  yield* all(
    c3Opacity(1, 0.4),
    c3Scale(1.0, 0.5, easeOutExpo),
  );

  // Step 4: t = 13.22s (global 76.33s "sekarang kamu tahu kenapa?"):
  // Card 3 pulses with crimson alert highlight
  yield* waitUntilSceneTime(13.22, t0);
  yield* all(
    c3Scale(1.06, 0.2, easeOutExpo).to(1.0, 0.2, easeInOutCubic),
    c3Stroke(PALETTE.crimson, 0.25),
  );

  // Hold until end of beat (13.913s)
  yield* finishSceneAt(sceneDuration, t0);
});
