import { Img, Line, makeScene2D, Node, Rect, Txt } from '@motion-canvas/2d';
import {
  all,
  createRef,
  createSignal,
  easeInOutCubic,
  easeOutBack,
  easeOutCubic,
  easeOutExpo,
  useThread,
} from '@motion-canvas/core';
import {
  COLORS,
  FONTS,
  HEADING_FONT,
  PALETTE,
  setupBaseStage,
} from './layout';
import {
  finishSceneAt,
  SCENE_TIMINGS,
  waitUntilSceneTime,
} from './timings';

export default makeScene2D(function* (view) {
  const time = useThread().time;
  const t0 = time();
  const sceneIdx = 9;
  const sceneDuration = SCENE_TIMINGS[sceneIdx]?.duration ?? 51.811;

  // 1. Mount base stage
  setupBaseStage(view, 'beat_10');

  // Animation signals
  const stageOpacity = createSignal(0);
  const leftCardScale = createSignal(0.95);
  const rightCardScale = createSignal(0.95);
  const imageSwap = createSignal(0); // 0 = ch10_sq1, 1 = ch10_sq2

  // Matrix rows reveal
  const row1Opacity = createSignal(0);
  const row2Opacity = createSignal(0);
  const row3Opacity = createSignal(0);
  const row4Opacity = createSignal(0);
  const row5Opacity = createSignal(0);

  // Payback Chart curves progress
  const chartProgress = createSignal(0);
  const garageGlow = createSignal(0);
  const winnerBadgeOpacity = createSignal(0);
  const quoteBannerOpacity = createSignal(0);
  const finalCtaPulse = createSignal(1);

  const stage = createRef<Node>();

  view.add(
    <Node ref={stage} opacity={stageOpacity}>
      {/* ================================================================= */}
      {/* LEFT CARD (x = -560, y = -30, width = 500, height = 675)          */}
      {/* ================================================================= */}
      <Rect
        x={-560}
        y={-30}
        width={500}
        height={675}
        scale={leftCardScale}
        radius={20}
        fill={'#FFFFFF'}
        stroke={COLORS.ink}
        lineWidth={3.5}
      >
        {/* Comic Panel Frame with image crossfade */}
        <Rect
          y={-85}
          width={456}
          height={456}
          radius={16}
          clip
          stroke={COLORS.ink}
          lineWidth={2.5}
        >
          <Img
            src={'/assets/vid_20261102_001/ch10_sq1.png'}
            width={456}
            height={456}
            opacity={() => 1 - imageSwap()}
          />
          <Img
            src={'/assets/vid_20261102_001/ch10_sq2.png'}
            width={456}
            height={456}
            opacity={imageSwap}
          />

          {/* Top-left image status badge */}
          <Rect
            layout
            direction="row"
            alignItems="center"
            padding={[8, 16]}
            radius={999}
            fill={() => (imageSwap() > 0.5 ? PALETTE.emeraldBg : PALETTE.mutedBg)}
            stroke={() => (imageSwap() > 0.5 ? PALETTE.emerald : COLORS.ink)}
            lineWidth={2}
            position={[-85, -185]}
          >
            <Txt
              text={() =>
                imageSwap() > 0.5
                  ? 'ENTREPRENEUR OPTIMIS'
                  : 'TIMBANGAN BISNIS'
              }
              fontFamily={FONTS.data}
              fontSize={18}
              fontWeight={800}
              fill={() => (imageSwap() > 0.5 ? PALETTE.emerald : COLORS.ink)}
            />
          </Rect>
        </Rect>

        {/* 2 Non-Overlapping Summary Pills Below Image */}
        <Rect y={245} layout direction="column" width={456} gap={10} alignItems="center">
          <Rect
            layout
            direction="row"
            width={456}
            height={52}
            alignItems="center"
            justifyContent="center"
            radius={12}
            fill={PALETTE.crimsonBg}
            stroke={COLORS.ink}
            lineWidth={2}
          >
            <Txt
              text="LOUNGE RUKO: RP350JT • BEP 18-22 BLN"
              fontFamily={FONTS.data}
              fontSize={18}
              fontWeight={800}
              fill={PALETTE.crimson}
            />
          </Rect>

          <Rect
            layout
            direction="row"
            width={456}
            height={52}
            alignItems="center"
            justifyContent="center"
            radius={12}
            fill={PALETTE.emeraldBg}
            stroke={COLORS.ink}
            lineWidth={2}
          >
            <Txt
              text="RENTAL GARASI: RP60JT • BEP 6-8 BLN!"
              fontFamily={FONTS.data}
              fontSize={18}
              fontWeight={800}
              fill={PALETTE.emerald}
            />
          </Rect>
        </Rect>
      </Rect>

      {/* ================================================================= */}
      {/* RIGHT EXPLAINER CARD (x = 260, y = -30, width = 1060, height = 675)*/}
      {/* ================================================================= */}
      <Rect
        x={260}
        y={-30}
        width={1060}
        height={675}
        scale={rightCardScale}
        radius={20}
        fill={'#FFFFFF'}
        stroke={COLORS.ink}
        lineWidth={3.5}
      >
        {/* Top Header inside card */}
        <Rect
          x={0}
          y={-280}
          width={990}
          height={52}
          layout
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          padding={[0, 20]}
          radius={12}
          fill={PALETTE.mutedBg}
          stroke={COLORS.ink}
          lineWidth={2}
        >
          <Txt
            text="HEAD-TO-HEAD MATRIX KEPUTUSAN"
            fontFamily={HEADING_FONT}
            fontSize={21}
            fontWeight={800}
            fill={COLORS.ink}
          />
          <Rect layout direction="row" gap={20} alignItems="center">
            <Txt
              text="LOUNGE RUKO (8 MEJA)"
              fontFamily={HEADING_FONT}
              fontSize={18}
              fontWeight={800}
              fill={PALETTE.crimson}
            />
            <Txt
              text="vs"
              fontFamily={FONTS.body}
              fontSize={18}
              fontWeight={400}
              fill={COLORS.secondaryInk}
            />
            <Txt
              text="RENTAL GARASI (5 MEJA)"
              fontFamily={HEADING_FONT}
              fontSize={18}
              fontWeight={800}
              fill={PALETTE.emerald}
            />
          </Rect>
        </Rect>

        {/* --- 5 COMPARISON ROWS --- */}
        {/* Row 1: Modal Awal (CapEx) */}
        <Rect
          x={0}
          y={-222}
          width={990}
          height={44}
          layout
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          padding={[0, 20]}
          radius={10}
          fill={PALETTE.surface}
          stroke={COLORS.ink}
          lineWidth={1.5}
          opacity={row1Opacity}
        >
          <Txt
            text="Modal Awal (CapEx)"
            fontFamily={HEADING_FONT}
            fontSize={18}
            fontWeight={700}
            fill={COLORS.ink}
          />
          <Rect layout direction="row" gap={70} alignItems="center">
            <Txt
              text="Rp350 Juta (Tinggi)"
              fontFamily={FONTS.data}
              fontSize={18}
              fontWeight={700}
              fill={PALETTE.crimson}
            />
            <Txt
              text="Rp60 Juta (Lean)"
              fontFamily={FONTS.data}
              fontSize={18}
              fontWeight={800}
              fill={PALETTE.emerald}
            />
          </Rect>
        </Rect>

        {/* Row 2: Biaya Operasional (OpEx) */}
        <Rect
          x={0}
          y={-172}
          width={990}
          height={44}
          layout
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          padding={[0, 20]}
          radius={10}
          fill={PALETTE.mutedBg}
          stroke={COLORS.ink}
          lineWidth={1.5}
          opacity={row2Opacity}
        >
          <Txt
            text="Biaya OpEx Bulanan"
            fontFamily={HEADING_FONT}
            fontSize={18}
            fontWeight={700}
            fill={COLORS.ink}
          />
          <Rect layout direction="row" gap={70} alignItems="center">
            <Txt
              text="Rp35 Juta / Bulan"
              fontFamily={FONTS.data}
              fontSize={18}
              fontWeight={700}
              fill={PALETTE.crimson}
            />
            <Txt
              text="< Rp5 Juta / Bulan"
              fontFamily={FONTS.data}
              fontSize={18}
              fontWeight={800}
              fill={PALETTE.emerald}
            />
          </Rect>
        </Rect>

        {/* Row 3: Laba Bersih Bulanan */}
        <Rect
          x={0}
          y={-122}
          width={990}
          height={44}
          layout
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          padding={[0, 20]}
          radius={10}
          fill={PALETTE.surface}
          stroke={COLORS.ink}
          lineWidth={1.5}
          opacity={row3Opacity}
        >
          <Txt
            text="Laba Bersih Bulanan"
            fontFamily={HEADING_FONT}
            fontSize={18}
            fontWeight={700}
            fill={COLORS.ink}
          />
          <Rect layout direction="row" gap={70} alignItems="center">
            <Txt
              text="Rp18–23 Jt / Bln"
              fontFamily={FONTS.data}
              fontSize={18}
              fontWeight={800}
              fill={PALETTE.ink}
            />
            <Txt
              text="Rp10–15 Jt / Bln"
              fontFamily={FONTS.data}
              fontSize={18}
              fontWeight={800}
              fill={PALETTE.emerald}
            />
          </Rect>
        </Rect>

        {/* Row 4: Balik Modal (BEP) */}
        <Rect
          x={0}
          y={-72}
          width={990}
          height={44}
          layout
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          padding={[0, 20]}
          radius={10}
          fill={() => (winnerBadgeOpacity() > 0 ? PALETTE.emeraldBg : PALETTE.mutedBg)}
          stroke={() => (winnerBadgeOpacity() > 0 ? PALETTE.emerald : COLORS.ink)}
          lineWidth={2}
          opacity={row4Opacity}
        >
          <Txt
            text="Balik Modal (BEP)"
            fontFamily={HEADING_FONT}
            fontSize={18}
            fontWeight={800}
            fill={COLORS.ink}
          />
          <Rect layout direction="row" gap={70} alignItems="center">
            <Txt
              text="18–22 Bulan (Lama)"
              fontFamily={FONTS.data}
              fontSize={18}
              fontWeight={700}
              fill={PALETTE.crimson}
            />
            <Txt
              text="6–8 BULAN! (WINNER)"
              fontFamily={FONTS.data}
              fontSize={18}
              fontWeight={800}
              fill={PALETTE.emerald}
            />
          </Rect>
        </Rect>

        {/* Row 5: Tingkat Stres & Operasional */}
        <Rect
          x={0}
          y={-22}
          width={990}
          height={44}
          layout
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          padding={[0, 20]}
          radius={10}
          fill={PALETTE.surface}
          stroke={COLORS.ink}
          lineWidth={1.5}
          opacity={row5Opacity}
        >
          <Txt
            text="Tingkat Stres & Risiko"
            fontFamily={HEADING_FONT}
            fontSize={18}
            fontWeight={700}
            fill={COLORS.ink}
          />
          <Rect layout direction="row" gap={60} alignItems="center">
            <Txt
              text="Tinggi (F&B + Hukum)"
              fontFamily={FONTS.body}
              fontSize={18}
              fontWeight={700}
              fill={PALETTE.crimson}
            />
            <Txt
              text="Rendah (Fokus Logistik)"
              fontFamily={FONTS.body}
              fontSize={18}
              fontWeight={800}
              fill={PALETTE.emerald}
            />
          </Rect>
        </Rect>

        {/* --- PAYBACK TIMELINE CHART AREA --- */}
        {/* BEP Breakeven Gridline */}
        <Line
          points={[
            [-410, 130],
            [420, 130],
          ]}
          stroke={'#94A3B8'}
          lineWidth={1.5}
          lineDash={[6, 6]}
        />
        <Txt
          x={-450}
          y={130}
          text="BEP"
          fontFamily={FONTS.data}
          fontSize={18}
          fontWeight={800}
          fill={COLORS.ink}
        />

        {/* Mandatory Axis 1: X-Axis Arrow */}
        <Line
          points={[
            [-410, 195],
            [455, 195],
          ]}
          stroke={COLORS.ink}
          lineWidth={3}
          endArrow
          arrowSize={12}
        />

        {/* Mandatory Axis 2: Y-Axis Arrow */}
        <Line
          points={[
            [-410, 205],
            [-410, 45],
          ]}
          stroke={COLORS.ink}
          lineWidth={3}
          endArrow
          arrowSize={12}
        />

        {/* X-Axis Month Markers */}
        <Txt
          x={-340}
          y={215}
          text="0 BLN"
          fontFamily={FONTS.data}
          fontSize={18}
          fontWeight={700}
          fill={COLORS.secondaryInk}
        />
        <Txt
          x={-150}
          y={215}
          text="6 BLN"
          fontFamily={FONTS.data}
          fontSize={18}
          fontWeight={800}
          fill={PALETTE.emerald}
        />
        <Txt
          x={40}
          y={215}
          text="12 BLN"
          fontFamily={FONTS.data}
          fontSize={18}
          fontWeight={700}
          fill={COLORS.secondaryInk}
        />
        <Txt
          x={230}
          y={215}
          text="18 BLN"
          fontFamily={FONTS.data}
          fontSize={18}
          fontWeight={800}
          fill={PALETTE.crimson}
        />
        <Txt
          x={370}
          y={215}
          text="24 BLN"
          fontFamily={FONTS.data}
          fontSize={18}
          fontWeight={700}
          fill={COLORS.secondaryInk}
        />

        {/* BEP Curve 1: Rental Garasi (Crosses BEP at 6 months) */}
        <Line
          points={[
            [-340, 165],
            [-150, 130],
            [40, 95],
            [230, 70],
            [390, 55],
          ]}
          stroke={PALETTE.emerald}
          lineWidth={4}
          end={() => chartProgress()}
        />

        {/* BEP Curve 2: Lounge Ruko (Crosses BEP at 18 months) */}
        <Line
          points={[
            [-340, 185],
            [-150, 168],
            [40, 148],
            [230, 130],
            [390, 78],
          ]}
          stroke={PALETTE.crimson}
          lineWidth={3.5}
          end={() => chartProgress()}
        />

        {/* Dot 1: BEP Garasi at [-150, 130] */}
        <Rect
          x={-150}
          y={130}
          width={18}
          height={18}
          radius={9}
          fill={PALETTE.emerald}
          stroke={'#FFFFFF'}
          lineWidth={2.5}
          opacity={() => (chartProgress() >= 0.4 ? 1 : 0)}
        />
        <Txt
          x={-150}
          y={106}
          text="BEP: 6 BLN"
          fontFamily={FONTS.data}
          fontSize={18}
          fontWeight={800}
          fill={PALETTE.emerald}
          opacity={() => (chartProgress() >= 0.4 ? 1 : 0)}
        />

        {/* Dot 2: BEP Lounge at [230, 130] */}
        <Rect
          x={230}
          y={130}
          width={18}
          height={18}
          radius={9}
          fill={PALETTE.crimson}
          stroke={'#FFFFFF'}
          lineWidth={2.5}
          opacity={() => (chartProgress() >= 0.8 ? 1 : 0)}
        />
        <Txt
          x={230}
          y={106}
          text="BEP: 18 BLN"
          fontFamily={FONTS.data}
          fontSize={18}
          fontWeight={800}
          fill={PALETTE.crimson}
          opacity={() => (chartProgress() >= 0.8 ? 1 : 0)}
        />

        {/* Bottom Verdict Banner */}
        <Rect
          x={0}
          y={288}
          width={990}
          height={50}
          scale={() => finalCtaPulse()}
          layout
          direction="row"
          alignItems="center"
          justifyContent="center"
          padding={[0, 16]}
          radius={12}
          fill={PALETTE.amberBg}
          stroke={PALETTE.amber}
          lineWidth={2.5}
        >
          <Txt
            text="VONIS: GARASI UNTUK CASHFLOW KILAT • RUKO UNTUK SKALA BESAR"
            fontFamily={HEADING_FONT}
            fontSize={19}
            fontWeight={800}
            fill={COLORS.ink}
          />
        </Rect>
      </Rect>
    </Node>
  );

  // =========================================================================
  // 10 SENTENCE BEAT TIMING ORCHESTRATION
  // [0.2, 5.18, 9.46, 17.16, 22.84, 27.96, 33.66, 38.14, 39.94, 47.64]
  // =========================================================================

  // Beat 1: 0.2s - "Jadi setelah membedah angkanya, model mana yang paling layak lo jalankan?"
  yield* waitUntilSceneTime(0.2);
  yield* all(
    stageOpacity(1, 0.45, easeOutCubic),
    leftCardScale(1, 0.5, easeOutBack),
    rightCardScale(1, 0.5, easeOutBack)
  );

  // Beat 2: 5.18s - "Mari kita adu Lounge Ruko delapan meja melawan Rental Garasi lima meja."
  yield* waitUntilSceneTime(5.18);
  yield* all(
    row1Opacity(1, 0.35, easeOutCubic)
  );

  // Beat 3: 9.46s - "Lounge ruko butuh modal Rp350 juta dengan operasional Rp35 juta sebulan."
  yield* waitUntilSceneTime(9.46);
  yield* all(
    row2Opacity(1, 0.35, easeOutCubic)
  );

  // Beat 4: 17.16s - "Laba bersihnya Rp18 juta sampai Rp23 juta, dengan balik modal 18 bulan."
  yield* waitUntilSceneTime(17.16);
  yield* all(
    row3Opacity(1, 0.35, easeOutCubic)
  );

  // Beat 5: 22.84s - "Sebaliknya, rental garasi cuma butuh modal Rp60 juta dengan operasional minim."
  yield* waitUntilSceneTime(22.84);
  yield* all(
    garageGlow(1, 0.4, easeOutCubic)
  );

  // Beat 6: 27.96s - "Laba bersihnya Rp10 juta sampai Rp15 juta, balik modal dalam enam bulan!"
  yield* waitUntilSceneTime(27.96);
  yield* all(
    imageSwap(1, 0.5, easeInOutCubic),
    row4Opacity(1, 0.4, easeOutBack),
    winnerBadgeOpacity(1, 0.4)
  );

  // Beat 7: 33.66s - "Jika lo punya modal besar dan siap drama ruko, pilihlah lounge V-I-P."
  yield* waitUntilSceneTime(33.66);
  yield* all(
    row5Opacity(1, 0.35, easeOutCubic)
  );

  // Beat 8: 38.14s - "Tapi jika lo mau risiko rendah dan arus kas cepat, rental garasi pemenangnya."
  yield* waitUntilSceneTime(38.14);
  yield* all(
    winnerBadgeOpacity(1, 0.3)
  );

  // Beat 9: 39.94s - "Bisnis mahjong sejatinya adalah kecerdikan menangkap durasi nongkrong masyarakat urban."
  yield* waitUntilSceneTime(39.94);
  yield* all(
    chartProgress(1, 1.2, easeInOutCubic),
    quoteBannerOpacity(1, 0.5)
  );

  // Beat 10: 47.64s - "Sekarang pilihan di tangan lo: sewa ruko mewah atau mulai dari garasi?"
  yield* waitUntilSceneTime(47.64);
  yield* all(
    finalCtaPulse(1.02, 0.4, easeOutBack)
  );

  // Hold cleanly till scene end
  yield* finishSceneAt(sceneDuration);
});
