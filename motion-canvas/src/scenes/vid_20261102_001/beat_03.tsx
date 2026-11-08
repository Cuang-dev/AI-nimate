import { Img, Line, makeScene2D, Node, Rect, Txt } from '@motion-canvas/2d';
import {
  all,
  createRef,
  createSignal,
  easeOutBack,
  easeOutCubic,
  easeOutExpo,
  useThread,
} from '@motion-canvas/core';
import {
  BEAT_LABELS,
  COLORS,
  FONTS,
  HEADING_FONT,
  PALETTE,
  isWidescreen,
  setupBaseStage,
} from './layout';
import {
  SCENE_TIMINGS,
  finishSceneAt,
  waitUntilSceneTime,
} from './timings';

export default makeScene2D(function* (view) {
  const time = useThread().time;
  const t0 = time();

  // Setup Swiss Base Stage (Grid lines, single top brow badge, subtitle bar)
  setupBaseStage(view, 'beat_03');

  const wide = isWidescreen(view);
  const stage = createRef<Node>();

  // Left Card Metric Signals
  const activePill = createSignal(1);
  const pill1Scale = createSignal(1.0);
  const pill2Scale = createSignal(1.0);

  // Right Explainer Waterfall Bar Signals
  const bar1Width = createSignal(0);
  const bar2Width = createSignal(0);
  const bar3Width = createSignal(0);
  const bar4Width = createSignal(0);

  const bar1Opacity = createSignal(0.3);
  const bar2Opacity = createSignal(0.3);
  const bar3Opacity = createSignal(0.3);
  const bar4Opacity = createSignal(0.3);

  // Warning Banner Signals
  const warningOpacity = createSignal(1);
  const warningScale = createSignal(1.0);
  const warningBg = createSignal(PALETTE.crimsonBg);
  const warningStroke = createSignal(PALETTE.crimson);
  const warningTextColor = createSignal(PALETTE.crimson);
  const warningTitle = createSignal('CAPEX AWAL: RP350 JUTA');
  const warningSubtitle = createSignal('Kapasitas 8 Meja Otomatis Foshan');

  view.add(
    <Node ref={stage} scale={wide ? 1 : 0.54} y={wide ? 0 : -20}>
      {/* ================= LEFT CARD: COMIC & SUMMARY METRICS ================= */}
      <Rect
        x={-560}
        y={-30}
        width={500}
        height={675}
        layout
        direction="column"
        alignItems="center"
        justifyContent="space-between"
        padding={22}
        radius={20}
        fill={'#FFFFFF'}
        stroke={COLORS.ink}
        lineWidth={3.5}
      >
        {/* Top Brow Header */}
        <Rect
          layout
          direction="row"
          alignItems="center"
          gap={8}
          padding={[8, 16]}
          radius={8}
          fill={PALETTE.crimsonBg}
          stroke={PALETTE.crimson}
          lineWidth={2}
        >
          <Txt
            text="BEDAH MODAL RUKO 8 MEJA"
            fontFamily={HEADING_FONT}
            fontSize={18}
            fontWeight={800}
            fill={PALETTE.crimson}
          />
        </Rect>

        {/* Square 1:1 Comic Panel */}
        <Rect
          width={380}
          height={380}
          radius={16}
          clip
          fill={'#FAF6EE'}
          stroke={COLORS.ink}
          lineWidth={3}
        >
          <Img
            src={'/assets/vid_20261102_001/ch03_sq1.png'}
            width={380}
            height={380}
          />
        </Rect>

        {/* Metric Pill 1: Total CapEx */}
        <Rect
          layout
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          width={440}
          padding={[10, 18]}
          radius={12}
          fill={() => (activePill() === 1 ? PALETTE.crimsonBg : '#FFFFFF')}
          stroke={() => (activePill() === 1 ? PALETTE.crimson : COLORS.ink)}
          lineWidth={2.5}
          scale={pill1Scale}
        >
          <Txt
            text="TOTAL CAPEX"
            fontFamily={HEADING_FONT}
            fontSize={18}
            fontWeight={800}
            fill={() => (activePill() === 1 ? PALETTE.crimson : COLORS.ink)}
          />
          <Txt
            text="Rp350.000.000"
            fontFamily={FONTS.data}
            fontSize={22}
            fontWeight={800}
            fill={() => (activePill() === 1 ? PALETTE.crimson : COLORS.ink)}
          />
        </Rect>

        {/* Metric Pill 2: OpEx Bulanan */}
        <Rect
          layout
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          width={440}
          padding={[10, 18]}
          radius={12}
          fill={() => (activePill() === 2 ? PALETTE.amberBg : '#FFFFFF')}
          stroke={() => (activePill() === 2 ? PALETTE.amber : COLORS.ink)}
          lineWidth={2.5}
          scale={pill2Scale}
        >
          <Txt
            text="OPEX BULANAN"
            fontFamily={HEADING_FONT}
            fontSize={18}
            fontWeight={800}
            fill={() => (activePill() === 2 ? PALETTE.amber : COLORS.ink)}
          />
          <Txt
            text="Rp35.000.000/Bln"
            fontFamily={FONTS.data}
            fontSize={22}
            fontWeight={800}
            fill={() => (activePill() === 2 ? PALETTE.amber : COLORS.ink)}
          />
        </Rect>
      </Rect>

      {/* ================= RIGHT EXPLAINER CARD: CAPEX WATERFALL & BAR CHART ================= */}
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
        {/* Card Header */}
        <Rect
          x={0}
          y={-280}
          layout
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          width={980}
          padding={[10, 20]}
          radius={12}
          fill={PALETTE.mutedBg}
          stroke={PALETTE.muted}
          lineWidth={2}
        >
          <Txt
            text="RINCIAN CAPEX AWAL & BEBAN OPERASIONAL"
            fontFamily={HEADING_FONT}
            fontSize={22}
            fontWeight={800}
            fill={PALETTE.crimson}
          />
          <Txt
            text="TOTAL: RP350 JUTA"
            fontFamily={FONTS.data}
            fontSize={18}
            fontWeight={800}
            fill={PALETTE.muted}
          />
        </Rect>

        {/* Quantitative Chart Axes with End Arrow (Mandatory for Check 15) */}
        <Node x={-420} y={150}>
          {/* X-Axis Arrow */}
          <Line
            points={[[0, 0], [890, 0]]}
            stroke={COLORS.ink}
            lineWidth={3}
            endArrow
            arrowSize={14}
          />
          {/* Y-Axis Arrow */}
          <Line
            points={[[0, 0], [0, -345]]}
            stroke={COLORS.ink}
            lineWidth={3}
            endArrow
            arrowSize={14}
          />
          <Txt
            x={820}
            y={28}
            text="ALOKASI BIAYA"
            fontFamily={FONTS.data}
            fontSize={18}
            fontWeight={800}
            fill={PALETTE.muted}
          />
          <Txt
            x={110}
            y={-370}
            text="NILAI (JUTA RUPIAH)"
            fontFamily={FONTS.data}
            fontSize={18}
            fontWeight={800}
            fill={PALETTE.muted}
          />
        </Node>

        {/* 4 Waterfall Progress Bars */}
        {/* Bar 1: Sewa Ruko 2 Lantai */}
        <Node x={-400} y={-170}>
          <Txt
            x={0}
            y={-18}
            text="1. Sewa Ruko 2 Lantai (1 Thn + Deposit Garansi)"
            fontFamily={HEADING_FONT}
            fontSize={18}
            fontWeight={700}
            fill={COLORS.ink}
            offset={[-1, 0]}
          />
          <Txt
            x={760}
            y={-18}
            text="Rp150 Juta (43%)"
            fontFamily={FONTS.data}
            fontSize={18}
            fontWeight={800}
            fill={PALETTE.crimson}
            offset={[1, 0]}
          />
          <Rect
            x={0}
            y={12}
            width={bar1Width}
            height={24}
            radius={6}
            fill={PALETTE.crimson}
            opacity={bar1Opacity}
            offset={[-1, 0]}
          />
        </Node>

        {/* Bar 2: 8 Meja Otomatis Foshan */}
        <Node x={-400} y={-95}>
          <Txt
            x={0}
            y={-18}
            text="2. 8 Meja Otomatis Komersial Foshan @ Rp12 Juta"
            fontFamily={HEADING_FONT}
            fontSize={18}
            fontWeight={700}
            fill={COLORS.ink}
            offset={[-1, 0]}
          />
          <Txt
            x={760}
            y={-18}
            text="Rp96 Juta (27%)"
            fontFamily={FONTS.data}
            fontSize={18}
            fontWeight={800}
            fill={PALETTE.amber}
            offset={[1, 0]}
          />
          <Rect
            x={0}
            y={12}
            width={bar2Width}
            height={24}
            radius={6}
            fill={PALETTE.amber}
            opacity={bar2Opacity}
            offset={[-1, 0]}
          />
        </Node>

        {/* Bar 3: Kedap Suara & 8 AC */}
        <Node x={-400} y={-20}>
          <Txt
            x={0}
            y={-18}
            text="3. Partisi Gipsum Kedap Suara & 8 AC Inverter"
            fontFamily={HEADING_FONT}
            fontSize={18}
            fontWeight={700}
            fill={COLORS.ink}
            offset={[-1, 0]}
          />
          <Txt
            x={760}
            y={-18}
            text="Rp75 Juta (21%)"
            fontFamily={FONTS.data}
            fontSize={18}
            fontWeight={800}
            fill={PALETTE.cyan}
            offset={[1, 0]}
          />
          <Rect
            x={0}
            y={12}
            width={bar3Width}
            height={24}
            radius={6}
            fill={PALETTE.cyan}
            opacity={bar3Opacity}
            offset={[-1, 0]}
          />
        </Node>

        {/* Bar 4: CCTV 4K, POS & Izin */}
        <Node x={-400} y={55}>
          <Txt
            x={0}
            y={-18}
            text="4. CCTV 4K, Sistem POS Kasir & Perizinan KBLI"
            fontFamily={HEADING_FONT}
            fontSize={18}
            fontWeight={700}
            fill={COLORS.ink}
            offset={[-1, 0]}
          />
          <Txt
            x={760}
            y={-18}
            text="Rp29 Juta (9%)"
            fontFamily={FONTS.data}
            fontSize={18}
            fontWeight={800}
            fill={PALETTE.emerald}
            offset={[1, 0]}
          />
          <Rect
            x={0}
            y={12}
            width={bar4Width}
            height={24}
            radius={6}
            fill={PALETTE.emerald}
            opacity={bar4Opacity}
            offset={[-1, 0]}
          />
        </Node>

        {/* Bottom Dynamic Alert / Warning Banner */}
        <Rect
          x={0}
          y={230}
          width={980}
          height={64}
          layout
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          padding={[12, 22]}
          radius={12}
          fill={warningBg}
          stroke={warningStroke}
          lineWidth={2.5}
          opacity={warningOpacity}
          scale={warningScale}
        >
          <Txt
            text={warningTitle}
            fontFamily={HEADING_FONT}
            fontSize={20}
            fontWeight={800}
            fill={warningTextColor}
          />
          <Txt
            text={warningSubtitle}
            fontFamily={FONTS.data}
            fontSize={18}
            fontWeight={700}
            fill={PALETTE.muted}
          />
        </Rect>
      </Rect>
    </Node>
  );

  // ================= 10 CUE CHOREOGRAPHY =================

  // Beat 1 (0.2s): "Sekarang mari kita hitung modal riil membuka lounge mahjong ruko."
  yield* waitUntilSceneTime(0.2, t0);
  activePill(1);
  warningTitle('CAPEX AWAL: RP350 JUTA');
  warningSubtitle('Kapasitas 8 Meja Otomatis Foshan');
  warningBg(PALETTE.crimsonBg);
  warningStroke(PALETTE.crimson);
  warningTextColor(PALETTE.crimson);

  // Beat 2 (4.14s): "Untuk kapasitas delapan meja, modal awal atau Ka-peks mencapai Rp350 juta."
  yield* waitUntilSceneTime(4.14, t0);
  activePill(1);
  yield* all(
    pill1Scale(1.05, 0.2, easeOutBack).to(1.0, 0.2),
    warningScale(1.03, 0.2, easeOutBack).to(1.0, 0.2),
  );

  // Beat 3 (10.38s): "Sewa ruko dua lantai setahun plus deposit menyerap Rp150 juta."
  yield* waitUntilSceneTime(10.38, t0);
  bar1Opacity(1);
  warningTitle('KOMPONEN 1: SEWA RUKO 2 LANTAI');
  warningSubtitle('Rp150 Juta (42.8% Total CapEx)');
  warningBg(PALETTE.crimsonBg);
  warningStroke(PALETTE.crimson);
  warningTextColor(PALETTE.crimson);
  yield* all(
    bar1Width(560, 0.6, easeOutExpo),
    warningScale(1.03, 0.2, easeOutBack).to(1.0, 0.2),
  );

  // Beat 4 (13.25s): "Pengadaan delapan unit meja komersial menelan biaya Rp96 juta."
  yield* waitUntilSceneTime(13.25, t0);
  bar2Opacity(1);
  warningTitle('KOMPONEN 2: 8 MEJA OTOMATIS FOSHAN');
  warningSubtitle('Rp96 Juta (27.4% Total CapEx)');
  warningBg(PALETTE.amberBg);
  warningStroke(PALETTE.amber);
  warningTextColor(PALETTE.amber);
  yield* all(
    bar2Width(360, 0.6, easeOutExpo),
    warningScale(1.03, 0.2, easeOutBack).to(1.0, 0.2),
  );

  // Beat 5 (19.9s): "Suara gesekan batu mahjong itu berisik dan memicu komplain tetangga."
  yield* waitUntilSceneTime(19.9, t0);
  warningTitle('RISIKO: KEBISINGAN BATU > 75 dB');
  warningSubtitle('Wajib Insulasi Suara & Partisi Ruko');
  warningBg(PALETTE.crimsonBg);
  warningStroke(PALETTE.crimson);
  warningTextColor(PALETTE.crimson);
  yield* all(
    warningScale(1.05, 0.2, easeOutBack).to(1.0, 0.2),
  );

  // Beat 6 (24.0s): "Karena itu, lo wajib pasang partisi kedap suara dan A-C Rp75 juta."
  yield* waitUntilSceneTime(24.0, t0);
  bar3Opacity(1);
  warningTitle('KOMPONEN 3: KEDAP SUARA & 8 AC');
  warningSubtitle('Rp75 Juta (21.4% Total CapEx)');
  warningBg(PALETTE.cyanBg);
  warningStroke(PALETTE.cyan);
  warningTextColor(PALETTE.cyan);
  yield* all(
    bar3Width(280, 0.6, easeOutExpo),
    warningScale(1.03, 0.2, easeOutBack).to(1.0, 0.2),
  );

  // Beat 7 (29.38s): "Sisa Rp29 juta untuk C-C-T-V empat K, kasir, dan izin usaha."
  yield* waitUntilSceneTime(29.38, t0);
  bar4Opacity(1);
  warningTitle('KOMPONEN 4: CCTV, POS & IZIN KBLI');
  warningSubtitle('Rp29 Juta (8.4% Total CapEx)');
  warningBg(PALETTE.emeraldBg);
  warningStroke(PALETTE.emerald);
  warningTextColor(PALETTE.emerald);
  yield* all(
    bar4Width(110, 0.6, easeOutExpo),
    warningScale(1.03, 0.2, easeOutBack).to(1.0, 0.2),
  );

  // Beat 8 (35.26s): "Dengan modal sebesar ini, lo nggak bisa cuma andalkan sewa meja."
  yield* waitUntilSceneTime(35.26, t0);
  warningTitle('PERINGATAN: SEWA MEJA TIDAK CUKUP');
  warningSubtitle('Tarif Rp60.000/Jam Terlalu Kecil');
  warningBg(PALETTE.amberBg);
  warningStroke(PALETTE.amber);
  warningTextColor(PALETTE.amber);
  yield* all(
    warningScale(1.04, 0.2, easeOutBack).to(1.0, 0.2),
  );

  // Beat 9 (39.12s): "Kalau cuma mengandalkan meja kosong, bisnis lo dijamin cepat gulung tikar."
  yield* waitUntilSceneTime(39.12, t0);
  warningTitle('DEFISIT OPERASIONAL JIKA MEJA SEPI');
  warningSubtitle('Biaya Tetap Berjalan Setiap Hari');
  warningBg(PALETTE.crimsonBg);
  warningStroke(PALETTE.crimson);
  warningTextColor(PALETTE.crimson);
  yield* all(
    warningScale(1.05, 0.2, easeOutBack).to(1.0, 0.2),
  );

  // Beat 10 (43.72s): "Lalu dari mana uang penutup operasional Rp35 juta sebulan itu datang?"
  yield* waitUntilSceneTime(43.72, t0);
  activePill(2);
  warningTitle('BEBAN TETAP OPEX: RP35.000.000/BLN');
  warningSubtitle('Sewa, Listrik AC, Gaji Staff & Perawatan');
  warningBg(PALETTE.amberBg);
  warningStroke(PALETTE.amber);
  warningTextColor(PALETTE.amber);
  yield* all(
    pill2Scale(1.05, 0.2, easeOutBack).to(1.0, 0.2),
    warningScale(1.04, 0.2, easeOutBack).to(1.0, 0.2),
  );

  // Hold end of scene until exact duration
  yield* finishSceneAt(SCENE_TIMINGS[2].duration, t0);
});
