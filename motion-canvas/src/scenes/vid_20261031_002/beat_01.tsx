import { Img, makeScene2D, Node, Rect, Txt } from '@motion-canvas/2d';
import {
  all,
  createRef,
  createSignal,
  easeOutCubic,
  easeOutExpo,
  useThread,
} from '@motion-canvas/core';
import {
  BEAT_LABELS,
  FONTS,
  HEADING_FONT,
  PALETTE,
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

export default makeScene2D(function* (view) {
  const time = useThread().time;
  const t0 = time();

  // Setup Swiss Base Stage (Grid lines, watermark, subtitle pill)
  setupBaseStage(view, BEAT_LABELS[0]);

  const wide = isWidescreen(view);
  const typo = getTypo(wide);
  const assets = getAssets(wide);

  // Layout coordinates (Dual-aspect safe zones)
  const headerY = wide ? -340 : -620;

  // Hero Crash Card coordinates
  const heroY = wide ? -150 : -370;
  const heroW = wide ? 1100 : 900;
  const heroH = wide ? 170 : 200;
  const heroIconX = wide ? -410 : -330;
  const heroContentX = wide ? 60 : 50;

  // 3-Tier Domino Stack coordinates
  const cardW = wide ? 1100 : 900;
  const cardH = wide ? 115 : 155;
  const cardY = wide ? [20, 150, 280] : [-90, 100, 290];
  const titleX = wide ? -500 : -410;
  const pillX = wide ? 360 : 260;

  // Animation signals
  const focalId = createSignal(0);
  const headerOpacity = createSignal(0);

  const heroOpacity = createSignal(0);
  const heroScale = createSignal(0.9);
  const crashVal = createSignal(1000);

  const card1Opacity = createSignal(0);
  const card1Scale = createSignal(0.9);

  const card2Opacity = createSignal(0);
  const card2Scale = createSignal(0.9);

  const card3Opacity = createSignal(0);
  const card3Scale = createSignal(0.9);

  const camera = createRef<Node>();

  view.add(
    <Node ref={camera}>
      {/* ===== HEADER TITLE (Single bold title, no eyebrow clutter) ===== */}
      <Txt
        x={0}
        y={headerY}
        opacity={headerOpacity}
        text="SAHAM TECH RUNTUH"
        fontFamily={HEADING_FONT}
        fontSize={wide ? 48 : 52}
        fontWeight={800}
        fill={PALETTE.ink}
      />

      {/* ===== HERO CRASH CARD ===== */}
      <Rect
        x={0}
        y={heroY}
        width={heroW}
        height={heroH}
        opacity={heroOpacity}
        scale={() => focalScale(focalId, 1, heroScale, time)}
        fill={PALETTE.surface}
        stroke={focalId() === 1 ? PALETTE.crimson : PALETTE.ink}
        lineWidth={assets.strokePrimary}
        radius={14}
      >
        {/* Left Icon */}
        <Img
          src={'/assets/vid_20261031_002/ai_chip_flame_icon.png'}
          x={heroIconX}
          y={0}
          width={88}
          height={88}
        />

        {/* Right Big Crimson Stat */}
        <Txt
          x={heroContentX}
          y={-22}
          text={() => `-Rp${Math.round(crashVal()).toLocaleString('id-ID')}T+`}
          fontFamily={HEADING_FONT}
          fontWeight={800}
          fontSize={56}
          fill={PALETTE.crimson}
        />

        {/* Clean Pill/Label Below Stat */}
        <Txt
          x={heroContentX}
          y={38}
          text="NILAI SAHAM MENGUAP"
          fontFamily={FONTS.data}
          fontSize={24}
          fontWeight={700}
          fill={PALETTE.muted}
          letterSpacing={0.5}
        />
      </Rect>

      {/* ===== 3-TIER DOMINO STACK (Strict Top-to-Bottom, Zero Clutter) ===== */}

      {/* --- Card 1: 01 // RAKSASA AI DUNIA --- */}
      <Rect
        x={0}
        y={cardY[0]}
        width={cardW}
        height={cardH}
        opacity={card1Opacity}
        scale={() => focalScale(focalId, 2, card1Scale, time)}
        fill={PALETTE.surface}
        stroke={focalId() === 2 ? PALETTE.amber : PALETTE.ink}
        lineWidth={assets.strokePrimary}
        radius={12}
      >
        <Txt
          x={titleX}
          y={0}
          offset={[-1, 0]}
          text="01 // RAKSASA AI DUNIA"
          fontFamily={HEADING_FONT}
          fontSize={wide ? 28 : 32}
          fontWeight={800}
          fill={PALETTE.ink}
        />
        <Rect
          x={pillX}
          y={0}
          width={wide ? 280 : 300}
          height={56}
          radius={8}
          fill={PALETTE.amber}
          layout
          justifyContent="center"
          alignItems="center"
        >
          <Txt
            text="-$1 TRILIUN / HARI"
            fontFamily={FONTS.data}
            fontSize={22}
            fontWeight={800}
            fill={'#FFFFFF'}
          />
        </Rect>
      </Rect>

      {/* --- Card 2: 02 // E-COMMERCE LOKAL --- */}
      <Rect
        x={0}
        y={cardY[1]}
        width={cardW}
        height={cardH}
        opacity={card2Opacity}
        scale={() => focalScale(focalId, 3, card2Scale, time)}
        fill={PALETTE.surface}
        stroke={focalId() === 3 ? PALETTE.cyan : PALETTE.cyan}
        lineWidth={assets.strokePrimary}
        radius={12}
      >
        <Txt
          x={titleX}
          y={0}
          offset={[-1, 0]}
          text="02 // E-COMMERCE LOKAL"
          fontFamily={HEADING_FONT}
          fontSize={wide ? 28 : 32}
          fontWeight={800}
          fill={PALETTE.ink}
        />
        <Rect
          x={pillX}
          y={0}
          width={wide ? 280 : 300}
          height={56}
          radius={8}
          fill={PALETTE.cyan}
          layout
          justifyContent="center"
          alignItems="center"
        >
          <Txt
            text="TOKO FISIK TUTUP"
            fontFamily={FONTS.data}
            fontSize={22}
            fontWeight={800}
            fill={'#FFFFFF'}
          />
        </Rect>
      </Rect>

      {/* --- Card 3: 03 // ANJLOK BERJAMAAH --- */}
      <Rect
        x={0}
        y={cardY[2]}
        width={cardW}
        height={cardH}
        opacity={card3Opacity}
        scale={() => focalScale(focalId, 4, card3Scale, time)}
        fill={PALETTE.crimsonBg}
        stroke={PALETTE.crimson}
        lineWidth={assets.strokePrimary}
        radius={12}
      >
        <Txt
          x={titleX}
          y={0}
          offset={[-1, 0]}
          text="03 // ANJLOK BERJAMAAH"
          fontFamily={HEADING_FONT}
          fontSize={wide ? 28 : 32}
          fontWeight={800}
          fill={PALETTE.crimson}
        />
        <Rect
          x={pillX}
          y={0}
          width={wide ? 280 : 300}
          height={56}
          radius={8}
          fill={PALETTE.crimson}
          layout
          justifyContent="center"
          alignItems="center"
        >
          <Txt
            text="RIBUAN T HILANG"
            fontFamily={FONTS.data}
            fontSize={22}
            fontWeight={800}
            fill={'#FFFFFF'}
          />
        </Rect>
      </Rect>
    </Node>
  );

  // --- Choreography Sequence (Scene 01 Total duration: 14.231s) ---
  const sceneDuration = SCENE_TIMINGS[0].duration;

  // t = 0.3s: Stage and Title header reveal, Hero card reveals
  yield* waitUntilSceneTime(0.3, t0);
  focalId(1);
  yield* all(
    headerOpacity(1, 0.4, easeOutExpo),
    heroOpacity(1, 0.5, easeOutExpo),
    heroScale(1, 0.5, easeOutExpo),
  );

  // t = 5.00s: Narrator: "mulai dari raksasa akal imitasi dunia"
  yield* waitUntilSceneTime(5.00, t0);
  focalId(2);
  yield* all(
    card1Opacity(1, 0.4, easeOutExpo),
    card1Scale(1, 0.4, easeOutExpo),
  );

  // t = 7.30s: Narrator: "sampai belanja online lokal"
  yield* waitUntilSceneTime(7.30, t0);
  focalId(3);
  yield* all(
    card2Opacity(1, 0.4, easeOutExpo),
    card2Scale(1, 0.4, easeOutExpo),
  );

  // t = 9.80s: Narrator: "mendadak anjlok berjamaah"
  yield* waitUntilSceneTime(9.80, t0);
  focalId(4);
  yield* all(
    card3Opacity(1, 0.4, easeOutExpo),
    card3Scale(1, 0.4, easeOutExpo),
  );

  // t = 10.00s: Narrator: "anjlok"
  yield* waitUntilSceneTime(10.00, t0);
  focalId(1);
  yield* crashVal(8000, 1.2, easeOutExpo);

  // t = 12.64s: Narrator: "dan menghapus nilai ribuan triliun rupiah"
  yield* waitUntilSceneTime(12.64, t0);
  yield* crashVal(16000, 0.8, easeOutCubic);

  // Strict Hold-Time: Diagram remains fully visible until 14.23s
  yield* finishSceneAt(sceneDuration, t0);
});
