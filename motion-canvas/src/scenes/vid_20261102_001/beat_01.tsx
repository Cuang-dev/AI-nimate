import { Img, Line, makeScene2D, Node, Rect, Txt } from '@motion-canvas/2d';
import {
  all,
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
  createEditorialStage,
} from './layout';
import {
  finishSceneAt,
  focalRotation,
  focalScale,
  SCENE_TIMINGS,
  waitUntilSceneTime,
} from './timings';

export default makeScene2D(function* (view) {
  const time = useThread().time;
  const t0 = time();

  // Setup Swiss Base Stage (Brow badge, subtitles, grid)
  const stage = createEditorialStage(view, BEAT_LABELS[0]);

  // Animation signals
  const focalId = createSignal(0);
  const leftCardOpacity = createSignal(0);
  const leftCardScale = createSignal(0.92);
  const leftBadgeScale = createSignal(0);
  const waitlistPulse = createSignal(0);

  const rightCardOpacity = createSignal(0);
  const rightCardScale = createSignal(0.92);
  const perceptionOpacity = createSignal(0);

  const cashflowOpacity = createSignal(0);
  const axesProgress = createSignal(0);
  const bar1Width = createSignal(0);
  const bar2Width = createSignal(0);
  const omzetVal = createSignal(0);
  const highlightGlow = createSignal(0);

  view.add(
    <Node ref={stage}>
      {/* ===== LEFT CARD: LOUNGE ATMOSPHERE & VIP CROWD ===== */}
      <Rect
        x={-440}
        y={-30}
        width={760}
        height={640}
        fill={PALETTE.surface}
        stroke={focalId() === 1 ? PALETTE.emerald : PALETTE.cardBorder}
        lineWidth={3}
        radius={18}
        opacity={leftCardOpacity}
        scale={() => focalScale(focalId, 1, leftCardScale, time)}
        rotation={() => focalRotation(focalId, 1, time)}
      >
        {/* Top Floating Badge */}
        <Rect
          x={0}
          y={-270}
          layout={true}
          padding={[8, 20]}
          radius={8}
          fill={PALETTE.emeraldBg}
          stroke={PALETTE.emerald}
          lineWidth={2}
          scale={leftBadgeScale}
        >
          <Txt
            text="ANTREAN VIP PIK & SERPONG"
            fontFamily={HEADING_FONT}
            fontSize={20}
            fontWeight={800}
            fill={PALETTE.emerald}
          />
        </Rect>

        {/* AI-Illustrated Crowd Asset */}
        <Img
          src={'/assets/vid_20261102_001/beat01_lounge_crowd.png'}
          x={0}
          y={-20}
          width={440}
          height={440}
          radius={14}
          scale={() => 1 + Math.sin(time() * 0.8) * 0.012}
        />

        {/* Bottom Status Labels */}
        <Rect
          x={0}
          y={240}
          layout={true}
          direction={'column'}
          alignItems={'center'}
          gap={6}
        >
          <Txt
            text="4 PEMAIN // 1 MEJA OTOMATIS"
            fontFamily={HEADING_FONT}
            fontSize={24}
            fontWeight={800}
            fill={PALETTE.ink}
          />
          <Txt
            text="Reservasi Penuh Berminggu-minggu"
            fontFamily={FONTS.body}
            fontSize={18}
            fontWeight={600}
            fill={waitlistPulse() > 0 ? PALETTE.crimson : PALETTE.muted}
            scale={() => 1 + waitlistPulse() * 0.06}
          />
        </Rect>
      </Rect>

      {/* ===== RIGHT CARD: SCALE CHASM COMPARISON ===== */}
      <Rect
        x={420}
        y={-30}
        width={820}
        height={640}
        fill={PALETTE.surface}
        stroke={focalId() === 2 ? PALETTE.amber : PALETTE.cardBorder}
        lineWidth={3}
        radius={18}
        opacity={rightCardOpacity}
        scale={() => focalScale(focalId, 2, rightCardScale, time)}
        rotation={() => focalRotation(focalId, 2, time)}
      >
        {/* Card Header */}
        <Rect
          x={0}
          y={-260}
          layout={true}
          direction={'column'}
          alignItems={'center'}
          gap={4}
        >
          <Txt
            text="SCALE CHASM // ILUSI TARIF MURAH"
            fontFamily={HEADING_FONT}
            fontSize={26}
            fontWeight={800}
            fill={PALETTE.ink}
          />
          <Txt
            text="Tarif Sewa Recehan vs Realitas Cashflow"
            fontFamily={FONTS.body}
            fontSize={18}
            fontWeight={600}
            fill={PALETTE.muted}
          />
        </Rect>

        {/* Sub-Card 1: Outsider Perception (Tarif Recehan) */}
        <Rect
          x={0}
          y={-140}
          width={740}
          height={140}
          fill={'#F8FAFC'}
          stroke={'#CBD5E1'}
          lineWidth={2}
          radius={12}
          opacity={perceptionOpacity}
        >
          <Rect
            x={-180}
            y={0}
            layout={true}
            direction={'column'}
            alignItems={'start'}
            gap={6}
          >
            <Txt
              text="PERSEPSI AWAM (TARIF RECEHAN)"
              fontFamily={HEADING_FONT}
              fontSize={18}
              fontWeight={800}
              fill={PALETTE.muted}
            />
            <Txt
              text="Rp60.000 / Meja / Jam"
              fontFamily={HEADING_FONT}
              fontSize={32}
              fontWeight={800}
              fill={PALETTE.crimson}
            />
          </Rect>

          <Rect
            x={200}
            y={0}
            layout={true}
            padding={[10, 20]}
            radius={8}
            fill={PALETTE.crimsonBg}
            stroke={PALETTE.crimson}
            lineWidth={1.5}
          >
            <Txt
              text="Rp15.000 / Orang / Jam"
              fontFamily={FONTS.data}
              fontSize={20}
              fontWeight={700}
              fill={PALETTE.crimson}
            />
          </Rect>
        </Rect>

        {/* Sub-Card 2: Realitas Cashflow 8 Meja (Quantitative Comparison) */}
        <Rect
          x={0}
          y={110}
          width={740}
          height={300}
          fill={PALETTE.emeraldBg}
          stroke={PALETTE.emerald}
          lineWidth={2}
          radius={14}
          opacity={cashflowOpacity}
        >
          {/* Header */}
          <Rect
            x={-140}
            y={-110}
            layout={true}
            direction={'column'}
            alignItems={'start'}
            gap={4}
          >
            <Txt
              text="REALITAS CASHFLOW (8 MEJA)"
              fontFamily={HEADING_FONT}
              fontSize={20}
              fontWeight={800}
              fill={PALETTE.emerald}
            />
            <Txt
              text="12 Jam/Hari x 30 Hari + F&B Margin 70%"
              fontFamily={FONTS.body}
              fontSize={18}
              fontWeight={600}
              fill={PALETTE.muted}
            />
          </Rect>

          {/* Quantitative Comparison Chart Axes */}
          <Line
            points={[
              [-320, 60],
              [330, 60],
            ]}
            stroke={'#64748B'}
            lineWidth={2}
            end={axesProgress}
            endArrow={true}
            arrowSize={8}
          />
          <Line
            points={[
              [-320, 60],
              [-320, -50],
            ]}
            stroke={'#64748B'}
            lineWidth={2}
            end={axesProgress}
            endArrow={true}
            arrowSize={8}
          />

          {/* Bar 1: Base Rental Only */}
          <Rect
            x={() => -318 + bar1Width() / 2}
            y={36}
            width={bar1Width}
            height={22}
            fill={'#94A3B8'}
            radius={[0, 6, 6, 0]}
          />

          {/* Bar 2: Full Omzet with F&B */}
          <Rect
            x={() => -318 + bar2Width() / 2}
            y={0}
            width={bar2Width}
            height={32}
            fill={PALETTE.emerald}
            radius={[0, 8, 8, 0]}
          />

          {/* Big Cashflow Stat Counter - Placed cleanly above the green bar */}
          <Txt
            x={-120}
            y={-36}
            text={() =>
              `OMZET 8 MEJA: Rp${Math.round(omzetVal()).toLocaleString('id-ID')} JT/BLN`
            }
            fontFamily={HEADING_FONT}
            fontSize={20}
            fontWeight={800}
            fill={PALETTE.emerald}
          />

          <Txt
            x={80}
            y={36}
            text="Laba Bersih Operasional: Rp55 Jt+"
            fontFamily={FONTS.body}
            fontSize={18}
            fontWeight={700}
            fill={PALETTE.ink}
          />

          {/* Bottom Highlight Callout Badge */}
          <Rect
            x={0}
            y={95}
            layout={true}
            padding={[6, 18]}
            radius={8}
            fill={'#FFFFFF'}
            stroke={highlightGlow() > 0 ? PALETTE.emerald : '#CBD5E1'}
            lineWidth={2}
          >
            <Txt
              text="MARGIN TINGGI DARI WAKTU 5 JAM"
              fontFamily={HEADING_FONT}
              fontSize={18}
              fontWeight={800}
              fill={highlightGlow() > 0 ? PALETTE.emerald : PALETTE.muted}
            />
          </Rect>
        </Rect>
      </Rect>
    </Node>
  );

  // --- Choreography Sequence (Scene 01 Total duration: 53.99s) ---
  const sceneDuration = SCENE_TIMINGS[0].duration;

  // t = 0.3s: Left Card enters with crowd scene
  yield* waitUntilSceneTime(0.3, t0);
  focalId(1);
  yield* all(
    leftCardOpacity(1, 0.6, easeOutExpo),
    leftCardScale(1, 0.6, easeOutExpo),
  );

  // t = 3.5s: "Pantai Indah Kapuk atau Gading Serpong"
  yield* waitUntilSceneTime(3.5, t0);
  yield* leftBadgeScale(1, 0.5, easeOutExpo);

  // t = 16.5s: "Di papan depan kasir, tertulis tarif sewa..."
  yield* waitUntilSceneTime(16.5, t0);
  focalId(2);
  yield* all(
    rightCardOpacity(1, 0.6, easeOutExpo),
    rightCardScale(1, 0.6, easeOutExpo),
    perceptionOpacity(1, 0.5, easeOutExpo),
  );

  // t = 28.5s: "daftar antrean tamu di aplikasi reservasi mengular..."
  yield* waitUntilSceneTime(28.5, t0);
  focalId(1);
  yield* waitlistPulse(1, 0.4, easeOutCubic).to(0, 0.4, easeOutCubic);

  // t = 41.5s: "diam-diam mencetak omzet puluhan hingga ratusan juta..."
  yield* waitUntilSceneTime(41.5, t0);
  focalId(2);
  yield* all(
    cashflowOpacity(1, 0.5, easeOutExpo),
    axesProgress(1, 0.6, easeOutExpo),
  );
  yield* all(
    bar1Width(160, 0.8, easeOutExpo),
    bar2Width(380, 0.9, easeOutExpo),
    omzetVal(180, 0.9, easeOutExpo),
  );

  // t = 48.0s: "menghasilkan margin fantastis?"
  yield* waitUntilSceneTime(48.0, t0);
  yield* highlightGlow(1, 0.4, easeOutExpo);

  // Strict Hold-Time: Diagram remains fully visible until 53.99s (>= 2.7s hold)
  yield* finishSceneAt(sceneDuration, t0);
});
