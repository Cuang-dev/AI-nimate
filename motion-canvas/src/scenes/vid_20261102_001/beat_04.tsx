import { Img, Line, makeScene2D, Node, Rect, Txt } from '@motion-canvas/2d';
import {
  all,
  createRef,
  createSignal,
  easeOutBack,
  easeOutCubic,
  easeOutExpo,
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
  // Swiss Base Stage with Subtitles and Chapter Brow
  setupBaseStage(view, 'beat_04');

  // Animation signals
  const stageOpacity = createSignal(0);

  // Left card signals
  const capexPillOpacity = createSignal(0);
  const capexPillScale = createSignal(0.85);

  // Right card item breakdown signals
  const item1Opacity = createSignal(0);
  const item2Opacity = createSignal(0);
  const item3Opacity = createSignal(0);
  const item4Opacity = createSignal(0);
  const item5Opacity = createSignal(0);
  const item6Opacity = createSignal(0);

  // Imlek surge chart signals
  const chartOpacity = createSignal(0);
  const surgeBarHeight = createSignal(0);
  const surgeOpacity = createSignal(0);
  const stampOpacity = createSignal(0);
  const stampScale = createSignal(1.3);

  const stage = createRef<Node>();

  view.add(
    <Node ref={stage} opacity={stageOpacity}>
      {/* ===== LEFT CARD: Comic Frame & Key Metric Pills ===== */}
      <Rect
        x={-560}
        y={-30}
        width={500}
        height={675}
        radius={20}
        fill={'#FFFFFF'}
        stroke={COLORS.ink}
        lineWidth={3.5}
        padding={22}
        layout
        direction="column"
        alignItems="center"
        justifyContent="space-between"
      >
        {/* Top Header Pill */}
        <Rect
          layout
          direction="row"
          alignItems="center"
          padding={[8, 18]}
          radius={999}
          fill={PALETTE.crimsonBg}
          stroke={PALETTE.crimson}
          lineWidth={2}
        >
          <Txt
            text="MODEL B: RENTAL GARASI"
            fontFamily={HEADING_FONT}
            fontSize={20}
            fontWeight={800}
            fill={PALETTE.crimson}
          />
        </Rect>

        {/* 1:1 Square Comic Illustration */}
        <Img
          src="/assets/vid_20261102_001/ch04_sq1.png"
          width={380}
          height={380}
          radius={16}
        />

        {/* Summary Pill 1: Capex Highlights */}
        <Rect
          layout
          direction="row"
          alignItems="center"
          justifyContent="center"
          width={450}
          padding={[10, 16]}
          radius={12}
          fill={PALETTE.emeraldBg}
          stroke={PALETTE.emerald}
          lineWidth={2}
          opacity={capexPillOpacity}
          scale={capexPillScale}
        >
          <Txt
            text="CAPEX: RP60.000.000 (HEMAT 83%)"
            fontFamily={HEADING_FONT}
            fontSize={19}
            fontWeight={800}
            fill={PALETTE.emerald}
          />
        </Rect>

        {/* Summary Pill 2: Operational Advantage */}
        <Rect
          layout
          direction="row"
          alignItems="center"
          justifyContent="center"
          width={450}
          padding={[10, 16]}
          radius={12}
          fill={PALETTE.mutedBg}
          stroke={COLORS.ink}
          lineWidth={2}
        >
          <Txt
            text="BIAYA SEWA RUKO: RP0 (GARASI SENDIRI)"
            fontFamily={HEADING_FONT}
            fontSize={18}
            fontWeight={800}
            fill={COLORS.ink}
          />
        </Rect>
      </Rect>

      {/* ===== RIGHT CARD: Unit Economics & Imlek Surge Chart ===== */}
      <Rect
        x={260}
        y={-30}
        width={1060}
        height={675}
        radius={20}
        fill={'#FFFFFF'}
        stroke={COLORS.ink}
        lineWidth={3.5}
      >
        {/* Card Header Bar */}
        <Rect
          y={-288}
          layout
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          width={1008}
        >
          <Txt
            text="RINCIAN UNIT ECONOMICS & LONJAKAN IMLEK"
            fontFamily={HEADING_FONT}
            fontSize={24}
            fontWeight={800}
            fill={COLORS.ink}
          />
          <Rect
            layout
            direction="row"
            padding={[6, 14]}
            radius={8}
            fill={PALETTE.emeraldBg}
            stroke={PALETTE.emerald}
            lineWidth={2}
          >
            <Txt
              text="MODAL: RP60 JUTA"
              fontFamily={FONTS.data}
              fontSize={18}
              fontWeight={700}
              fill={PALETTE.emerald}
            />
          </Rect>
        </Rect>

        {/* Breakdown Row 1 */}
        <Rect
          y={-188}
          layout
          direction="row"
          gap={16}
          width={1008}
        >
          {/* Item 1: 5 Meja Lipat */}
          <Rect
            width={325}
            height={98}
            radius={12}
            fill={PALETTE.mutedBg}
            stroke={COLORS.ink}
            lineWidth={2}
            padding={[10, 14]}
            layout
            direction="column"
            justifyContent="center"
            opacity={item1Opacity}
          >
            <Txt
              text="5 MEJA LIPAT BERODA"
              fontFamily={HEADING_FONT}
              fontSize={18}
              fontWeight={800}
              fill={COLORS.secondaryInk}
            />
            <Txt
              text="Rp52.500.000"
              fontFamily={FONTS.data}
              fontSize={24}
              fontWeight={800}
              fill={COLORS.ink}
            />
            <Txt
              text="@ Rp10,5 Jt / Unit Beroda"
              fontFamily={FONTS.body}
              fontSize={18}
              fontWeight={600}
              fill={PALETTE.emerald}
            />
          </Rect>

          {/* Item 2: Flight Case + Troli */}
          <Rect
            width={325}
            height={98}
            radius={12}
            fill={PALETTE.mutedBg}
            stroke={COLORS.ink}
            lineWidth={2}
            padding={[10, 14]}
            layout
            direction="column"
            justifyContent="center"
            opacity={item2Opacity}
          >
            <Txt
              text="FLIGHT CASE + TROLI"
              fontFamily={HEADING_FONT}
              fontSize={18}
              fontWeight={800}
              fill={COLORS.secondaryInk}
            />
            <Txt
              text="Rp7.500.000"
              fontFamily={FONTS.data}
              fontSize={24}
              fontWeight={800}
              fill={COLORS.ink}
            />
            <Txt
              text="Kotak Busa & Troli Lipat"
              fontFamily={FONTS.body}
              fontSize={18}
              fontWeight={600}
              fill={COLORS.secondaryInk}
            />
          </Rect>

          {/* Item 3: Sewa Ruko Rp0 */}
          <Rect
            width={325}
            height={98}
            radius={12}
            fill={PALETTE.emeraldBg}
            stroke={PALETTE.emerald}
            lineWidth={2}
            padding={[10, 14]}
            layout
            direction="column"
            justifyContent="center"
            opacity={item3Opacity}
          >
            <Txt
              text="BIAYA SEWA RUKO"
              fontFamily={HEADING_FONT}
              fontSize={18}
              fontWeight={800}
              fill={PALETTE.emerald}
            />
            <Txt
              text="Rp0 (GRATIS)"
              fontFamily={FONTS.data}
              fontSize={24}
              fontWeight={800}
              fill={PALETTE.emerald}
            />
            <Txt
              text="Garasi Rumah Sendiri"
              fontFamily={FONTS.body}
              fontSize={18}
              fontWeight={700}
              fill={PALETTE.emerald}
            />
          </Rect>
        </Rect>

        {/* Breakdown Row 2 */}
        <Rect
          y={-70}
          layout
          direction="row"
          gap={16}
          width={1008}
        >
          {/* Item 4: Delivery Blind Van */}
          <Rect
            width={325}
            height={98}
            radius={12}
            fill={PALETTE.cyanBg}
            stroke={PALETTE.cyan}
            lineWidth={2}
            padding={[10, 14]}
            layout
            direction="column"
            justifyContent="center"
            opacity={item4Opacity}
          >
            <Txt
              text="LOGISTIK ANTAR"
              fontFamily={HEADING_FONT}
              fontSize={18}
              fontWeight={800}
              fill={PALETTE.cyan}
            />
            <Txt
              text="Blind Van Sewaan"
              fontFamily={FONTS.data}
              fontSize={22}
              fontWeight={800}
              fill={COLORS.ink}
            />
            <Txt
              text="Langsung Antar ke Customer"
              fontFamily={FONTS.body}
              fontSize={18}
              fontWeight={600}
              fill={COLORS.secondaryInk}
            />
          </Rect>

          {/* Item 5: Tarif Sewa Harian */}
          <Rect
            width={325}
            height={98}
            radius={12}
            fill={PALETTE.mutedBg}
            stroke={COLORS.ink}
            lineWidth={2}
            padding={[10, 14]}
            layout
            direction="column"
            justifyContent="center"
            opacity={item5Opacity}
          >
            <Txt
              text="TARIF HARIAN"
              fontFamily={HEADING_FONT}
              fontSize={18}
              fontWeight={800}
              fill={COLORS.secondaryInk}
            />
            <Txt
              text="Rp400rb–Rp500rb"
              fontFamily={FONTS.data}
              fontSize={24}
              fontWeight={800}
              fill={COLORS.ink}
            />
            <Txt
              text="Per 24 Jam (+ Ongkir)"
              fontFamily={FONTS.body}
              fontSize={18}
              fontWeight={600}
              fill={COLORS.secondaryInk}
            />
          </Rect>

          {/* Item 6: OpEx Bulanan & Margin */}
          <Rect
            width={325}
            height={98}
            radius={12}
            fill={PALETTE.amberBg}
            stroke={PALETTE.amber}
            lineWidth={2}
            padding={[10, 14]}
            layout
            direction="column"
            justifyContent="center"
            opacity={item6Opacity}
          >
            <Txt
              text="OPEX BULANAN"
              fontFamily={HEADING_FONT}
              fontSize={18}
              fontWeight={800}
              fill={PALETTE.amber}
            />
            <Txt
              text="Cuma Rp5 Juta"
              fontFamily={FONTS.data}
              fontSize={24}
              fontWeight={800}
              fill={COLORS.ink}
            />
            <Txt
              text="Margin Bersih > 65%"
              fontFamily={FONTS.body}
              fontSize={18}
              fontWeight={700}
              fill={PALETTE.emerald}
            />
          </Rect>
        </Rect>

        {/* ===== Mini Chart: Lonjakan Permintaan & Tarif Imlek (+300%) ===== */}
        <Rect
          y={162}
          width={1008}
          height={280}
          radius={14}
          fill={COLORS.bg}
          stroke={COLORS.gridLine}
          lineWidth={2}
          clip
          opacity={chartOpacity}
        >
          {/* Chart Title */}
          <Txt
            x={30}
            y={-114}
            text="LONJAKAN PERMINTAAN & TARIF MUSIM LIBURAN IMLEK"
            fontFamily={HEADING_FONT}
            fontSize={19}
            fontWeight={800}
            fill={COLORS.ink}
          />

          {/* Mandatory Axis Line 1: X-Axis Arrow */}
          <Line
            points={[[-380, 80], [380, 80]]}
            stroke={COLORS.ink}
            lineWidth={3}
            endArrow
            arrowSize={12}
          />

          {/* Mandatory Axis Line 2: Y-Axis Arrow */}
          <Line
            points={[[-380, 80], [-380, -88]]}
            stroke={COLORS.ink}
            lineWidth={3}
            endArrow
            arrowSize={12}
          />

          {/* X & Y Axis Labels */}
          <Txt
            x={-20}
            y={104}
            text="PERIODE OPERASIONAL (HARI BIASA vs MUSIM IMLEK)"
            fontFamily={FONTS.body}
            fontSize={18}
            fontWeight={700}
            fill={COLORS.secondaryInk}
          />
          <Txt
            x={-380}
            y={-112}
            text="TARIF / HARI"
            fontFamily={FONTS.data}
            fontSize={18}
            fontWeight={700}
            fill={COLORS.secondaryInk}
          />

          {/* Y-Axis Ticks & Gridlines */}
          <Line
            points={[[-380, 10], [360, 10]]}
            stroke={COLORS.gridLine}
            lineWidth={1.5}
            lineDash={[6, 6]}
          />
          <Line
            points={[[-380, -60], [360, -60]]}
            stroke={COLORS.gridLine}
            lineWidth={1.5}
            lineDash={[6, 6]}
          />
          <Txt
            x={-420}
            y={80}
            text="Rp0"
            fontFamily={FONTS.data}
            fontSize={18}
            fill={COLORS.secondaryInk}
          />
          <Txt
            x={-425}
            y={10}
            text="Rp500rb"
            fontFamily={FONTS.data}
            fontSize={18}
            fill={COLORS.secondaryInk}
          />
          <Txt
            x={-425}
            y={-60}
            text="Rp1,5 Jt"
            fontFamily={FONTS.data}
            fontSize={18}
            fontWeight={700}
            fill={PALETTE.crimson}
          />

          {/* Bar 1: Normal Season (Rp500.000 / Hari) */}
          <Rect
            x={-150}
            y={45}
            width={110}
            height={70}
            radius={[8, 8, 0, 0]}
            fill={'#94A3B8'}
            stroke={COLORS.ink}
            lineWidth={2}
          />
          <Txt
            x={-150}
            y={-2}
            text="Rp500.000"
            fontFamily={FONTS.data}
            fontSize={18}
            fontWeight={700}
            fill={COLORS.ink}
          />
          <Txt
            x={-150}
            y={55}
            text="Normal"
            fontFamily={FONTS.body}
            fontSize={18}
            fontWeight={700}
            fill={'#FFFFFF'}
          />

          {/* Bar 2: Imlek Surge (+300%, Rp1.500.000 / Hari) */}
          <Rect
            x={50}
            y={() => 80 - surgeBarHeight() / 2}
            width={130}
            height={surgeBarHeight}
            radius={[8, 8, 0, 0]}
            fill={PALETTE.crimson}
            stroke={COLORS.ink}
            lineWidth={2}
            opacity={surgeOpacity}
          />
          <Txt
            x={50}
            y={-85}
            text="Rp1.500.000"
            fontFamily={FONTS.data}
            fontSize={20}
            fontWeight={800}
            fill={PALETTE.crimson}
            opacity={surgeOpacity}
          />
          <Txt
            x={50}
            y={20}
            text="IMLEK SURGE"
            fontFamily={FONTS.body}
            fontSize={18}
            fontWeight={800}
            fill={'#FFFFFF'}
            opacity={surgeOpacity}
          />

          {/* Surge Connecting Arrow / Trend */}
          <Line
            points={[[-150, 10], [50, -60]]}
            stroke={PALETTE.amber}
            lineWidth={4}
            lineDash={[8, 6]}
            opacity={surgeOpacity}
          />

          {/* Gold Stamp Callout */}
          <Rect
            x={300}
            y={-25}
            padding={[8, 16]}
            radius={10}
            fill={PALETTE.amberBg}
            stroke={PALETTE.amber}
            lineWidth={2.5}
            opacity={stampOpacity}
            scale={stampScale}
            layout
            direction="column"
            alignItems="center"
          >
            <Txt
              text="LONJAKAN +300%!"
              fontFamily={HEADING_FONT}
              fontSize={19}
              fontWeight={800}
              fill={PALETTE.amber}
            />
            <Txt
              text="Paket: Rp3,5 Jt / 3 Hari"
              fontFamily={FONTS.data}
              fontSize={18}
              fontWeight={700}
              fill={COLORS.ink}
            />
          </Rect>
        </Rect>
      </Rect>
    </Node>
  );

  // =========================================================================
  // Synchronized Scene Choreography (10 Beats from beat_cue_schedule.json)
  // =========================================================================

  // Cue 1: 0.2s - Intro stage card appears
  yield* waitUntilSceneTime(0.2);
  yield* stageOpacity(1, 0.45, easeOutCubic);

  // Cue 2: 3.84s - Capex Rp60 Juta highlight pops
  yield* waitUntilSceneTime(3.84);
  yield* all(
    capexPillOpacity(1, 0.35, easeOutCubic),
    capexPillScale(1.0, 0.35, easeOutBack),
  );

  // Cue 3: 8.62s - 5 Meja Lipat Rp52,5 Juta reveals
  yield* waitUntilSceneTime(8.62);
  yield* item1Opacity(1, 0.35, easeOutCubic);

  // Cue 4: 13.28s - Flight Case + Troli Rp7,5 Juta reveals
  yield* waitUntilSceneTime(13.28);
  yield* item2Opacity(1, 0.35, easeOutCubic);

  // Cue 5: 16.07s - Biaya Sewa Ruko Rp0 reveals
  yield* waitUntilSceneTime(16.07);
  yield* item3Opacity(1, 0.35, easeOutCubic);

  // Cue 6: 22.46s - Delivery Blind Van reveals
  yield* waitUntilSceneTime(22.46);
  yield* item4Opacity(1, 0.35, easeOutCubic);

  // Cue 7: 26.0s - Tarif Harian Rp400rb-500rb reveals
  yield* waitUntilSceneTime(26.0);
  yield* item5Opacity(1, 0.35, easeOutCubic);

  // Cue 8: 31.42s - OpEx Bulanan < Rp5 Jt reveals
  yield* waitUntilSceneTime(31.42);
  yield* item6Opacity(1, 0.35, easeOutCubic);

  // Cue 9: 35.9s - Imlek chart activates, surge bar rises +300%
  yield* waitUntilSceneTime(35.9);
  yield* all(
    chartOpacity(1, 0.35, easeOutCubic),
    surgeOpacity(1, 0.35, easeOutCubic),
    surgeBarHeight(140, 0.6, easeOutExpo),
  );

  // Cue 10: 40.58s - Imlek gold surge stamp slams down
  yield* waitUntilSceneTime(40.58);
  yield* all(
    stampOpacity(1, 0.25, easeOutCubic),
    stampScale(1.0, 0.35, easeOutBack),
  );

  // Hold safely until scene completion
  yield* finishSceneAt(SCENE_TIMINGS[3].duration);
});
