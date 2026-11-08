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
  const sceneIdx = 6;
  const sceneDuration = SCENE_TIMINGS[sceneIdx]?.duration ?? 42.871;

  // 1. Mount base stage (Background grid, Top brow badge, Subtitles)
  setupBaseStage(view, 'beat_07');

  // Animation signals
  const stageOpacity = createSignal(0);
  const leftCardScale = createSignal(0.95);
  const rightCardScale = createSignal(0.95);
  const imageSwap = createSignal(0); // 0 = sq1, 1 = sq2

  // Weekly occupancy bars (Senin–Kamis vs Jumat–Minggu)
  const barSeninH = createSignal(0);
  const barSelasaH = createSignal(0);
  const barRabuH = createSignal(0);
  const barKamisH = createSignal(0);
  const barJumatH = createSignal(0);
  const barSabtuH = createSignal(0);
  const barMingguH = createSignal(0);

  // Status and callout signals
  const weekdayAlertOpacity = createSignal(0);
  const fixedCostAlertOpacity = createSignal(0);
  const goldenHoursHighlight = createSignal(0);
  const runwayBurnOpacity = createSignal(0);
  const mitigationOpacity = createSignal(0);
  const finalStampOpacity = createSignal(0);

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
            src={'/assets/vid_20261102_001/ch07_sq1.png'}
            width={456}
            height={456}
            opacity={() => 1 - imageSwap()}
          />
          <Img
            src={'/assets/vid_20261102_001/ch07_sq2.png'}
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
            fill={() => (imageSwap() > 0.5 ? PALETTE.emeraldBg : PALETTE.crimsonBg)}
            stroke={() => (imageSwap() > 0.5 ? PALETTE.emerald : PALETTE.crimson)}
            lineWidth={2}
            position={[-60, -185]}
          >
            <Txt
              text={() =>
                imageSwap() > 0.5
                  ? 'JUMAT–MINGGU: FULL 100%'
                  : 'SENIN–KAMIS: KOSONG <15%'
              }
              fontFamily={FONTS.data}
              fontSize={18}
              fontWeight={800}
              fill={() => (imageSwap() > 0.5 ? PALETTE.emerald : PALETTE.crimson)}
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
            fill={() => (imageSwap() > 0.5 ? PALETTE.emeraldBg : PALETTE.mutedBg)}
            stroke={COLORS.ink}
            lineWidth={2}
          >
            <Txt
              text={() =>
                imageSwap() > 0.5
                  ? 'PUNCAK LABA: 35 JAM EMAS'
                  : 'STATUS: HARI KERJA SEPI'
              }
              fontFamily={HEADING_FONT}
              fontSize={20}
              fontWeight={800}
              fill={COLORS.ink}
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
            fill={PALETTE.amberBg}
            stroke={COLORS.ink}
            lineWidth={2}
          >
            <Txt
              text="BIAYA TETAP: RP1.160.000 / HARI"
              fontFamily={FONTS.data}
              fontSize={18}
              fontWeight={700}
              fill={PALETTE.ink}
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
        {/* Top Brow Header inside card */}
        <Rect
          x={0}
          y={-280}
          width={980}
          height={56}
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
            text="DISTRIBUSI OKUPANSI MINGGUAN (168 JAM)"
            fontFamily={HEADING_FONT}
            fontSize={22}
            fontWeight={800}
            fill={COLORS.ink}
          />
          <Txt
            text="KAPASITAS MAKSIMAL: 8 MEJA = 32 PEMAIN"
            fontFamily={FONTS.data}
            fontSize={18}
            fontWeight={700}
            fill={PALETTE.crimson}
          />
        </Rect>

        {/* --- WEEKLY OCCUPANCY BAR CHART AREA --- */}
        {/* Y-Axis Horizontal Gridlines */}
        {/* 100% Gridline */}
        <Line
          points={[
            [-410, -140],
            [420, -140],
          ]}
          stroke={'#CBD5E1'}
          lineWidth={1.5}
          lineDash={[6, 6]}
        />
        <Txt
          x={-450}
          y={-140}
          text="100%"
          fontFamily={FONTS.data}
          fontSize={18}
          fontWeight={700}
          fill={PALETTE.emerald}
        />

        {/* 50% Gridline */}
        <Line
          points={[
            [-410, -30],
            [420, -30],
          ]}
          stroke={'#E2E8F0'}
          lineWidth={1.5}
          lineDash={[6, 6]}
        />
        <Txt
          x={-450}
          y={-30}
          text="50%"
          fontFamily={FONTS.data}
          fontSize={18}
          fontWeight={700}
          fill={PALETTE.muted}
        />

        {/* 15% Deadzone Gridline */}
        <Line
          points={[
            [-410, 47],
            [420, 47],
          ]}
          stroke={PALETTE.crimson}
          lineWidth={2}
          lineDash={[4, 4]}
          opacity={0.8}
        />
        <Txt
          x={-450}
          y={47}
          text="15%"
          fontFamily={FONTS.data}
          fontSize={18}
          fontWeight={800}
          fill={PALETTE.crimson}
        />

        {/* Mandatory Axis 1: X-Axis Arrow */}
        <Line
          points={[
            [-410, 80],
            [440, 80],
          ]}
          stroke={COLORS.ink}
          lineWidth={3}
          endArrow
          arrowSize={12}
        />

        {/* Mandatory Axis 2: Y-Axis Arrow */}
        <Line
          points={[
            [-410, 85],
            [-410, -175],
          ]}
          stroke={COLORS.ink}
          lineWidth={3}
          endArrow
          arrowSize={12}
        />

        {/* Chart Column 1: Senin (x = -320) */}
        <Rect
          x={-320}
          y={() => 80 - barSeninH() / 2}
          width={64}
          height={barSeninH}
          radius={[8, 8, 0, 0]}
          fill={'#94A3B8'}
          stroke={COLORS.ink}
          lineWidth={2}
        />
        <Txt
          x={-320}
          y={105}
          text="SEN"
          fontFamily={FONTS.data}
          fontSize={18}
          fontWeight={700}
          fill={COLORS.ink}
        />

        {/* Chart Column 2: Selasa (x = -215) */}
        <Rect
          x={-215}
          y={() => 80 - barSelasaH() / 2}
          width={64}
          height={barSelasaH}
          radius={[8, 8, 0, 0]}
          fill={'#94A3B8'}
          stroke={COLORS.ink}
          lineWidth={2}
        />
        <Txt
          x={-215}
          y={105}
          text="SEL"
          fontFamily={FONTS.data}
          fontSize={18}
          fontWeight={700}
          fill={COLORS.ink}
        />

        {/* Chart Column 3: Rabu (x = -110) */}
        <Rect
          x={-110}
          y={() => 80 - barRabuH() / 2}
          width={64}
          height={barRabuH}
          radius={[8, 8, 0, 0]}
          fill={'#94A3B8'}
          stroke={COLORS.ink}
          lineWidth={2}
        />
        <Txt
          x={-110}
          y={105}
          text="RAB"
          fontFamily={FONTS.data}
          fontSize={18}
          fontWeight={700}
          fill={COLORS.ink}
        />

        {/* Chart Column 4: Kamis (x = -5) */}
        <Rect
          x={-5}
          y={() => 80 - barKamisH() / 2}
          width={64}
          height={barKamisH}
          radius={[8, 8, 0, 0]}
          fill={'#94A3B8'}
          stroke={COLORS.ink}
          lineWidth={2}
        />
        <Txt
          x={-5}
          y={105}
          text="KAM"
          fontFamily={FONTS.data}
          fontSize={18}
          fontWeight={700}
          fill={COLORS.ink}
        />

        {/* Chart Column 5: Jumat (x = 125) */}
        <Rect
          x={125}
          y={() => 80 - barJumatH() / 2}
          width={76}
          height={barJumatH}
          radius={[8, 8, 0, 0]}
          fill={PALETTE.emerald}
          stroke={COLORS.ink}
          lineWidth={2}
        />
        <Txt
          x={125}
          y={105}
          text="JUM"
          fontFamily={FONTS.data}
          fontSize={19}
          fontWeight={800}
          fill={PALETTE.emerald}
        />

        {/* Chart Column 6: Sabtu (x = 235) */}
        <Rect
          x={235}
          y={() => 80 - barSabtuH() / 2}
          width={76}
          height={barSabtuH}
          radius={[8, 8, 0, 0]}
          fill={PALETTE.emerald}
          stroke={COLORS.ink}
          lineWidth={2}
        />
        <Txt
          x={235}
          y={105}
          text="SAB"
          fontFamily={FONTS.data}
          fontSize={19}
          fontWeight={800}
          fill={PALETTE.emerald}
        />

        {/* Chart Column 7: Minggu (x = 345) */}
        <Rect
          x={345}
          y={() => 80 - barMingguH() / 2}
          width={76}
          height={barMingguH}
          radius={[8, 8, 0, 0]}
          fill={PALETTE.emerald}
          stroke={COLORS.ink}
          lineWidth={2}
        />
        <Txt
          x={345}
          y={105}
          text="MIN"
          fontFamily={FONTS.data}
          fontSize={19}
          fontWeight={800}
          fill={PALETTE.emerald}
        />

        {/* Zone Badge 1: Dead Weekday Zone Bracket */}
        <Rect
          x={-160}
          y={-175}
          width={410}
          height={38}
          opacity={weekdayAlertOpacity}
          layout
          direction="row"
          alignItems="center"
          justifyContent="center"
          padding={[6, 14]}
          radius={8}
          fill={PALETTE.crimsonBg}
          stroke={PALETTE.crimson}
          lineWidth={2}
        >
          <Txt
            text="SENIN–KAMIS: KOSONG <15% (DEAD ZONE)"
            fontFamily={FONTS.data}
            fontSize={18}
            fontWeight={800}
            fill={PALETTE.crimson}
          />
        </Rect>

        {/* Zone Badge 2: Weekend Rush Bracket */}
        <Rect
          x={235}
          y={-175}
          width={360}
          height={38}
          opacity={() => goldenHoursHighlight()}
          layout
          direction="row"
          alignItems="center"
          justifyContent="center"
          padding={[6, 14]}
          radius={8}
          fill={PALETTE.emeraldBg}
          stroke={PALETTE.emerald}
          lineWidth={2}
        >
          <Txt
            text="JUMAT–MIN: 100% (ANTRE PANJANG)"
            fontFamily={FONTS.data}
            fontSize={18}
            fontWeight={800}
            fill={PALETTE.emerald}
          />
        </Rect>

        {/* Bottom Callout Row: 2 Big Insight Cards */}
        {/* Left Insight Box: 35 Golden Hours */}
        <Rect
          x={-245}
          y={200}
          width={470}
          height={116}
          layout
          direction="column"
          padding={14}
          gap={6}
          radius={14}
          fill={PALETTE.amberBg}
          stroke={PALETTE.amber}
          lineWidth={2.5}
        >
          <Txt
            text="CUMA 35 JAM EMAS DARI 168 JAM"
            fontFamily={HEADING_FONT}
            fontSize={20}
            fontWeight={800}
            fill={COLORS.ink}
          />
          <Txt
            text="20,8% jam efektif wajib menutup sewa 7 hari."
            fontFamily={FONTS.body}
            fontSize={18}
            fontWeight={600}
            fill={COLORS.secondaryInk}
          />
        </Rect>

        {/* Right Insight Box: Fixed Cost Alert */}
        <Rect
          x={245}
          y={200}
          width={470}
          height={116}
          layout
          direction="column"
          padding={14}
          gap={6}
          radius={14}
          fill={() =>
            fixedCostAlertOpacity() > 0 ? PALETTE.crimsonBg : PALETTE.mutedBg
          }
          stroke={() =>
            fixedCostAlertOpacity() > 0 ? PALETTE.crimson : COLORS.ink
          }
          lineWidth={2.5}
        >
          <Txt
            text="BIAYA SEWA: RP1.160.000 / HARI"
            fontFamily={HEADING_FONT}
            fontSize={20}
            fontWeight={800}
            fill={PALETTE.crimson}
          />
          <Txt
            text="Staf & AC tetap dibayar walau meja kosong."
            fontFamily={FONTS.body}
            fontSize={18}
            fontWeight={600}
            fill={COLORS.secondaryInk}
          />
        </Rect>

        {/* Bottom Banner at y = 295: Mitigation Strategies / Rollercoaster */}
        <Rect
          x={0}
          y={292}
          width={980}
          height={48}
          layout
          direction="row"
          alignItems="center"
          justifyContent="center"
          padding={[0, 16]}
          radius={10}
          fill={PALETTE.surface}
          stroke={COLORS.ink}
          lineWidth={2}
          opacity={() => (mitigationOpacity() > 0 ? 1 : 0.4)}
        >
          <Txt
            text={() =>
              finalStampOpacity() > 0
                ? 'ROLLERCOASTER CASHFLOW: UJIAN MENTAL TERBERAT LOUNGE RUKO'
                : mitigationOpacity() > 0
                ? 'SOLUSI: PROMO SIANG 50% • KOMUNITAS KANTOR • MEMBER BULANAN'
                : 'RISIKO: BANYAK PEMULA KEHABISAN NAFAS DI BULAN KE-4'
            }
            fontFamily={FONTS.data}
            fontSize={18}
            fontWeight={800}
            fill={() =>
              finalStampOpacity() > 0
                ? PALETTE.crimson
                : mitigationOpacity() > 0
                ? PALETTE.emerald
                : COLORS.ink
            }
          />
        </Rect>
      </Rect>
    </Node>
  );

  // =========================================================================
  // 10 SENTENCE BEAT TIMING ORCHESTRATION
  // [0.2, 5.6, 7.67, 11.51, 18.06, 22.52, 24.32, 30.9, 34.48, 38.76]
  // =========================================================================

  // Beat 1: 0.2s - "Tapi jangan buru-buru tergiur, karena ada jebakan mematikan bernama kutukan hari kerja."
  yield* waitUntilSceneTime(0.2);
  yield* all(
    stageOpacity(1, 0.45, easeOutCubic),
    leftCardScale(1, 0.5, easeOutBack),
    rightCardScale(1, 0.5, easeOutBack)
  );

  // Beat 2: 5.6s - "Dari Senin sampai Kamis siang, lounge biasanya kosong melompong seperti kuburan."
  yield* waitUntilSceneTime(5.6);
  yield* all(
    barSeninH(30, 0.4, easeOutExpo),
    barSelasaH(26, 0.4, easeOutExpo),
    barRabuH(32, 0.4, easeOutExpo),
    barKamisH(28, 0.4, easeOutExpo),
    weekdayAlertOpacity(1, 0.3)
  );

  // Beat 3: 7.67s - "Okupansi meja di jam kerja seringkali anjlok di bawah 15%."
  yield* waitUntilSceneTime(7.67);
  yield* all(
    weekdayAlertOpacity(0.4, 0.15),
    barSeninH(24, 0.25),
    barSelasaH(22, 0.25)
  );
  yield* weekdayAlertOpacity(1, 0.15);

  // Beat 4: 11.51s - "Karyawan tetap digaji, lampu A-C menyala, dan sewa ruko jalan terus."
  yield* waitUntilSceneTime(11.51);
  yield* all(
    fixedCostAlertOpacity(1, 0.4, easeOutCubic)
  );

  // Beat 5: 18.06s - "Lonjakan pengunjung baru terjadi Jumat malam sampai Minggu hingga antre panjang."
  yield* waitUntilSceneTime(18.06);
  yield* all(
    imageSwap(1, 0.5, easeInOutCubic),
    barJumatH(220, 0.6, easeOutExpo),
    barSabtuH(220, 0.65, easeOutExpo),
    barMingguH(220, 0.7, easeOutExpo),
    goldenHoursHighlight(1, 0.4)
  );

  // Beat 6: 22.52s - "Praktis lo cuma punya 35 jam emas seminggu untuk mencetak laba."
  yield* waitUntilSceneTime(22.52);
  yield* all(
    goldenHoursHighlight(1, 0.3)
  );

  // Beat 7: 24.32s - "Tiga puluh lima jam emas ini harus menutup 168 jam sewa ruko."
  yield* waitUntilSceneTime(24.32);
  yield* all(
    runwayBurnOpacity(1, 0.4)
  );

  // Beat 8: 30.9s - "Banyak pemula kehabisan nafas di bulan keempat karena nombok operasional."
  yield* waitUntilSceneTime(30.9);
  yield* all(
    fixedCostAlertOpacity(1, 0.3)
  );

  // Beat 9: 34.48s - "Tanpa strategi promo siang hari, bisnis lo bisa boncos sebelum balik modal."
  yield* waitUntilSceneTime(34.48);
  yield* all(
    mitigationOpacity(1, 0.4, easeOutBack)
  );

  // Beat 10: 38.76s - "Arus kas fluktuatif ini adalah ujian mental terberat membuka lounge ruko."
  yield* waitUntilSceneTime(38.76);
  yield* all(
    finalStampOpacity(1, 0.4, easeOutBack)
  );

  // Hold cleanly till scene end
  yield* finishSceneAt(sceneDuration);
});
