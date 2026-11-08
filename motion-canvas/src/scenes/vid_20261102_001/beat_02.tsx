import { Img, makeScene2D, Node, Rect, Txt } from '@motion-canvas/2d';
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
  setupBaseStage(view, 'beat_02');

  const wide = isWidescreen(view);
  const stage = createRef<Node>();

  // Comic Panel Opacity and Scale signals
  const p1Opacity = createSignal(1);
  const p1Scale = createSignal(1.0);
  const p2Opacity = createSignal(0);
  const p2Scale = createSignal(1.04);

  // Overlay Badge Signals inside Comic Frame
  const tagText = createSignal('PANEL 1 // MAHJONG MANUAL');
  const stampText = createSignal('TEKNOLOGI MEJA');
  const stampBg = createSignal(PALETTE.crimson);
  const stampScale = createSignal(1.0);

  const centerBadgeOpacity = createSignal(0);
  const centerBadgeScale = createSignal(0.85);
  const centerBadgeText = createSignal('KOCOK MANUAL: 3-5 MENIT');
  const centerBadgeSub = createSignal('144 Batu Disusun Tangan');
  const centerBadgeColor = createSignal(PALETTE.crimson);
  const centerBadgeStroke = createSignal(PALETTE.crimson);

  // Right Column Structured Stat Cards Signals
  const activeCard = createSignal(1);
  const card1Opacity = createSignal(1);
  const card1Scale = createSignal(1.0);
  const card2Opacity = createSignal(0.4);
  const card2Scale = createSignal(1.0);
  const card3Opacity = createSignal(0.4);
  const card3Scale = createSignal(1.0);
  const card4Opacity = createSignal(0.4);
  const card4Scale = createSignal(1.0);
  const card5Opacity = createSignal(0.4);
  const card5Scale = createSignal(1.0);
  const card6Opacity = createSignal(0.4);
  const card6Scale = createSignal(1.0);

  view.add(
    <Node ref={stage} scale={wide ? 1 : 0.54} y={wide ? 0 : -20}>
      {/* ================= LEFT MAIN STAGE: 16:9 COMIC FRAME ================= */}
      <Rect
        x={-210}
        y={-30}
        width={1200}
        height={675}
        radius={20}
        clip
        fill={'#FFFFFF'}
        stroke={COLORS.ink}
        lineWidth={4}
      >
        {/* Panel 1: Empat pemain lelah kocok manual */}
        <Img
          src={'/assets/vid_20261102_001/ch02_p1.png'}
          width={1200}
          height={675}
          opacity={p1Opacity}
          scale={p1Scale}
        />

        {/* Panel 2: Mechanical Cutaway meja otomatis Foshan */}
        <Img
          src={'/assets/vid_20261102_001/ch02_p2.png'}
          width={1200}
          height={675}
          opacity={p2Opacity}
          scale={p2Scale}
        />

        {/* Comic Tag Pill (Top-Left) */}
        <Rect
          x={-420}
          y={-290}
          layout
          direction="row"
          alignItems="center"
          gap={10}
          padding={[10, 20]}
          radius={10}
          fill={COLORS.ink}
        >
          <Txt
            text={tagText}
            fontFamily={HEADING_FONT}
            fontSize={20}
            fontWeight={800}
            fill={'#FFFFFF'}
          />
        </Rect>

        {/* Comic Price / Highlight Stamp (Bottom-Right) */}
        <Rect
          x={380}
          y={285}
          layout
          direction="row"
          alignItems="center"
          gap={10}
          padding={[10, 22]}
          radius={10}
          fill={stampBg}
          scale={stampScale}
        >
          <Txt
            text={stampText}
            fontFamily={HEADING_FONT}
            fontSize={20}
            fontWeight={800}
            fill={'#FFFFFF'}
          />
        </Rect>

        {/* Floating Center Badge */}
        <Rect
          x={0}
          y={170}
          layout
          direction="column"
          alignItems="center"
          gap={6}
          padding={[14, 28]}
          radius={16}
          fill={'#FFFFFF'}
          stroke={centerBadgeStroke}
          lineWidth={3.5}
          opacity={centerBadgeOpacity}
          scale={centerBadgeScale}
        >
          <Txt
            text={centerBadgeText}
            fontFamily={HEADING_FONT}
            fontSize={26}
            fontWeight={800}
            fill={centerBadgeColor}
          />
          <Txt
            text={centerBadgeSub}
            fontFamily={FONTS.body}
            fontSize={18}
            fontWeight={700}
            fill={COLORS.secondaryInk}
          />
        </Rect>
      </Rect>

      {/* ================= RIGHT CALLOUT COLUMN ================= */}
      <Rect
        x={630}
        y={-30}
        width={410}
        height={675}
        layout
        direction="column"
        gap={10}
        padding={18}
        radius={20}
        fill={'#FFFFFF'}
        stroke={COLORS.ink}
        lineWidth={3.5}
      >
        {/* Header */}
        <Rect
          layout
          direction="column"
          gap={4}
          padding={[8, 14]}
          radius={10}
          fill={PALETTE.mutedBg}
          stroke={PALETTE.muted}
          lineWidth={2}
        >
          <Txt
            text="TEKNOLOGI MEJA FOSHAN"
            fontFamily={HEADING_FONT}
            fontSize={20}
            fontWeight={800}
            fill={PALETTE.emerald}
          />
          <Txt
            text="Mekanika Otomatisasi & Nilai Investasi"
            fontFamily={FONTS.body}
            fontSize={18}
            fontWeight={600}
            fill={COLORS.secondaryInk}
          />
        </Rect>

        {/* Card 1: KOCOK MANUAL: 3-5 Menit */}
        <Rect
          layout
          direction="column"
          gap={4}
          padding={[10, 14]}
          radius={12}
          fill={() => (activeCard() === 1 ? PALETTE.crimsonBg : '#FFFFFF')}
          stroke={() => (activeCard() === 1 ? PALETTE.crimson : COLORS.ink)}
          lineWidth={2.5}
          opacity={card1Opacity}
          scale={card1Scale}
        >
          <Txt
            text="KOCOK MANUAL: 3-5 Menit"
            fontFamily={HEADING_FONT}
            fontSize={20}
            fontWeight={800}
            fill={() => (activeCard() === 1 ? PALETTE.crimson : COLORS.ink)}
          />
          <Txt
            text="Metode Tradisional Melelahkan"
            fontFamily={FONTS.body}
            fontSize={18}
            fontWeight={600}
            fill={COLORS.secondaryInk}
          />
        </Rect>

        {/* Card 2: 144 BATU DENGAN TANGAN */}
        <Rect
          layout
          direction="column"
          gap={4}
          padding={[10, 14]}
          radius={12}
          fill={() => (activeCard() === 2 ? PALETTE.amberBg : '#FFFFFF')}
          stroke={() => (activeCard() === 2 ? PALETTE.amber : COLORS.ink)}
          lineWidth={2.5}
          opacity={card2Opacity}
          scale={card2Scale}
        >
          <Txt
            text="144 BATU DENGAN TANGAN"
            fontFamily={HEADING_FONT}
            fontSize={20}
            fontWeight={800}
            fill={() => (activeCard() === 2 ? PALETTE.amber : COLORS.ink)}
          />
          <Txt
            text="Ritme Permainan Jadi Lambat"
            fontFamily={FONTS.body}
            fontSize={18}
            fontWeight={600}
            fill={COLORS.secondaryInk}
          />
        </Rect>

        {/* Card 3: MEJA FOSHAN: 30 Detik */}
        <Rect
          layout
          direction="column"
          gap={4}
          padding={[10, 14]}
          radius={12}
          fill={() => (activeCard() === 3 ? PALETTE.emeraldBg : '#FFFFFF')}
          stroke={() => (activeCard() === 3 ? PALETTE.emerald : COLORS.ink)}
          lineWidth={2.5}
          opacity={card3Opacity}
          scale={card3Scale}
        >
          <Txt
            text="MEJA FOSHAN: 30 Detik"
            fontFamily={HEADING_FONT}
            fontSize={20}
            fontWeight={800}
            fill={() => (activeCard() === 3 ? PALETTE.emerald : COLORS.ink)}
          />
          <Txt
            text="Elevator Otomatis & Drum Magnetik"
            fontFamily={FONTS.body}
            fontSize={18}
            fontWeight={600}
            fill={COLORS.secondaryInk}
          />
        </Rect>

        {/* Card 4: TOMBOL ELEKTRIK TENGAH */}
        <Rect
          layout
          direction="column"
          gap={4}
          padding={[10, 14]}
          radius={12}
          fill={() => (activeCard() === 4 ? PALETTE.cyanBg : '#FFFFFF')}
          stroke={() => (activeCard() === 4 ? PALETTE.cyan : COLORS.ink)}
          lineWidth={2.5}
          opacity={card4Opacity}
          scale={card4Scale}
        >
          <Txt
            text="TOMBOL ELEKTRIK TENGAH"
            fontFamily={HEADING_FONT}
            fontSize={20}
            fontWeight={800}
            fill={() => (activeCard() === 4 ? PALETTE.cyan : COLORS.ink)}
          />
          <Txt
            text="Batu Turun Otomatis Sekali Tekan"
            fontFamily={FONTS.body}
            fontSize={18}
            fontWeight={600}
            fill={COLORS.secondaryInk}
          />
        </Rect>

        {/* Card 5: 2 SET BATU BERGANTIAN */}
        <Rect
          layout
          direction="column"
          gap={4}
          padding={[10, 14]}
          radius={12}
          fill={() => (activeCard() === 5 ? PALETTE.emeraldBg : '#FFFFFF')}
          stroke={() => (activeCard() === 5 ? PALETTE.emerald : COLORS.ink)}
          lineWidth={2.5}
          opacity={card5Opacity}
          scale={card5Scale}
        >
          <Txt
            text="2 SET BATU BERGANTIAN"
            fontFamily={HEADING_FONT}
            fontSize={20}
            fontWeight={800}
            fill={() => (activeCard() === 5 ? PALETTE.emerald : COLORS.ink)}
          />
          <Txt
            text="Satu Main, Satu Standby 30 Detik"
            fontFamily={FONTS.body}
            fontSize={18}
            fontWeight={600}
            fill={COLORS.secondaryInk}
          />
        </Rect>

        {/* Card 6: HARGA: Rp8JT - Rp20JT */}
        <Rect
          layout
          direction="column"
          gap={4}
          padding={[10, 14]}
          radius={12}
          fill={() => (activeCard() === 6 ? PALETTE.amberBg : '#FFFFFF')}
          stroke={() => (activeCard() === 6 ? PALETTE.amber : COLORS.ink)}
          lineWidth={2.5}
          opacity={card6Opacity}
          scale={card6Scale}
        >
          <Txt
            text="HARGA: Rp8 Juta - Rp20 Juta"
            fontFamily={HEADING_FONT}
            fontSize={20}
            fontWeight={800}
            fill={() => (activeCard() === 6 ? PALETTE.amber : COLORS.ink)}
          />
          <Txt
            text="Komersial Standar Rp12-14 Juta"
            fontFamily={FONTS.body}
            fontSize={18}
            fontWeight={600}
            fill={COLORS.secondaryInk}
          />
        </Rect>
      </Rect>
    </Node>
  );

  // ================= 11 CUE CHOREOGRAPHY =================

  // Beat 1 (0.2s): "Kenapa bisnis ini baru meledak sekarang?"
  yield* waitUntilSceneTime(0.2, t0);
  activeCard(1);
  tagText('PANEL 1 // MAHJONG MANUAL');
  stampText('KENAPA BARU VIRAL?');
  stampBg(PALETTE.crimson);
  yield* all(
    p1Opacity(1, 0.4, easeOutExpo),
    card1Opacity(1, 0.35, easeOutExpo),
    card1Scale(1.03, 0.2, easeOutBack).to(1.0, 0.2),
  );

  // Beat 1b (2.7s): "Jawabannya ada pada teknologi mejanya."
  yield* waitUntilSceneTime(2.7, t0);
  stampText('TEKNOLOGI MEJA FOSHAN');
  stampBg(PALETTE.cyan);
  centerBadgeText('KUNCI: TEKNOLOGI MEJA');
  centerBadgeSub('Rahasia di Balik Revolusi Mahjong');
  centerBadgeColor(PALETTE.cyan);
  centerBadgeStroke(PALETTE.cyan);
  yield* all(
    centerBadgeOpacity(1, 0.25, easeOutExpo),
    centerBadgeScale(1.0, 0.3, easeOutBack),
  );

  // Beat 2 (5.52s): "Dulu, main mahjong tradisional melelahkan karena harus mengocok batu secara manual."
  yield* waitUntilSceneTime(5.52, t0);
  stampText('3-5 MENIT TERBUANG');
  stampBg(PALETTE.crimson);
  centerBadgeText('KOCOK MANUAL MELELAHKAN');
  centerBadgeSub('Tangan Pegal & Suara Gaduh');
  centerBadgeColor(PALETTE.crimson);
  centerBadgeStroke(PALETTE.crimson);
  yield* all(
    centerBadgeOpacity(1, 0.3, easeOutExpo),
    centerBadgeScale(1.0, 0.35, easeOutBack),
  );

  // Beat 3 (10.92s): "Menyusun seratus empat puluh empat batu dengan tangan butuh lima menit."
  yield* waitUntilSceneTime(10.92, t0);
  activeCard(2);
  stampText('144 BATU DENGAN TANGAN');
  stampBg(PALETTE.amber);
  centerBadgeText('5 MENIT TIAP PUTARAN');
  centerBadgeSub('Ritme Lambat Merusak Antusiasme');
  centerBadgeColor(PALETTE.amber);
  centerBadgeStroke(PALETTE.amber);
  yield* all(
    card2Opacity(1, 0.35, easeOutExpo),
    card2Scale(1.03, 0.2, easeOutBack).to(1.0, 0.2),
    centerBadgeScale(1.04, 0.2, easeOutBack).to(1.0, 0.2),
  );

  // Beat 4 (14.3s): "Tapi meja otomatis buatan Foshan ini mengubah segalanya dalam 30 detik."
  yield* waitUntilSceneTime(14.3, t0);
  activeCard(3);
  tagText('PANEL 2 // CUTAWAY MEKANIKAL');
  stampText('SIAP DALAM 30 DETIK');
  stampBg(PALETTE.emerald);
  centerBadgeText('MEJA OTOMATIS FOSHAN');
  centerBadgeSub('Elevator & Drum Magnetik Canggih');
  centerBadgeColor(PALETTE.emerald);
  centerBadgeStroke(PALETTE.emerald);
  yield* all(
    p1Opacity(0, 0.45, easeOutCubic),
    p2Opacity(1, 0.45, easeOutCubic),
    p2Scale(1.0, 0.5, easeOutExpo),
    card3Opacity(1, 0.35, easeOutExpo),
    card3Scale(1.03, 0.2, easeOutBack).to(1.0, 0.2),
    centerBadgeScale(1.05, 0.35, easeOutBack),
  );

  // Beat 5 (19.1s): "Begitu putaran selesai, pemain tinggal menekan tombol di tengah meja."
  yield* waitUntilSceneTime(19.1, t0);
  activeCard(4);
  stampText('TOMBOL DADU ELEKTRIK');
  stampBg(PALETTE.cyan);
  centerBadgeText('SEKALI TEKAN TOMBOL');
  centerBadgeSub('Elevator Tengah Terbuka Otomatis');
  centerBadgeColor(PALETTE.cyan);
  centerBadgeStroke(PALETTE.cyan);
  yield* all(
    card4Opacity(1, 0.35, easeOutExpo),
    card4Scale(1.03, 0.2, easeOutBack).to(1.0, 0.2),
    centerBadgeScale(1.05, 0.35, easeOutBack),
  );

  // Beat 6 (23.1s): "Kompartemen terbuka, lalu seluruh batu bekas tersedot ke drum putar."
  yield* waitUntilSceneTime(23.1, t0);
  stampText('DRUM PUTAR MAGNETIK');
  stampBg(PALETTE.amber);
  centerBadgeText('BATU TERSEDOT KE BAWAH');
  centerBadgeSub('Sensor & Magnet Memilah Cepat');
  centerBadgeColor(PALETTE.amber);
  centerBadgeStroke(PALETTE.amber);
  yield* all(
    stampScale(1.08, 0.2, easeOutBack).to(1.0, 0.2),
    centerBadgeScale(1.04, 0.2, easeOutBack).to(1.0, 0.2),
  );

  // Beat 7 (27.16s): "Di bawah meja, magnet memilah batu dan konveyor mini menyusunnya kembali."
  yield* waitUntilSceneTime(27.16, t0);
  stampText('4 KONVEYOR MINI & MOTOR');
  stampBg(PALETTE.emerald);
  centerBadgeText('KONVEYOR MENYUSUN BATU');
  centerBadgeSub('4 Sisi Meja Naik Serentak');
  centerBadgeColor(PALETTE.emerald);
  centerBadgeStroke(PALETTE.emerald);
  yield* all(
    stampScale(1.08, 0.2, easeOutBack).to(1.0, 0.2),
    centerBadgeScale(1.04, 0.2, easeOutBack).to(1.0, 0.2),
  );

  // Beat 8 (28.96s): "Meja memakai dua set batu berbeda warna yang naik turun bergantian."
  yield* waitUntilSceneTime(28.96, t0);
  activeCard(5);
  stampText('SET BIRU VS SET HIJAU');
  stampBg(PALETTE.cyan);
  centerBadgeText('2 SET BATU BERGANTIAN');
  centerBadgeSub('Tanpa Jeda Tunggu Sedetikpun');
  centerBadgeColor(PALETTE.cyan);
  centerBadgeStroke(PALETTE.cyan);
  yield* all(
    card5Opacity(1, 0.35, easeOutExpo),
    card5Scale(1.03, 0.2, easeOutBack).to(1.0, 0.2),
    centerBadgeScale(1.05, 0.35, easeOutBack),
  );

  // Beat 9 (35.24s): "Harga meja komersial ini berkisar antara delapan sampai dua puluh juta."
  yield* waitUntilSceneTime(35.24, t0);
  activeCard(6);
  stampText('RP8 JUTA - RP20 JUTA');
  stampBg(PALETTE.amber);
  centerBadgeText('INVESTASI MEJA KOMERSIAL');
  centerBadgeSub('Standar Lounge: Rp12 Juta - 14 Juta');
  centerBadgeColor(PALETTE.amber);
  centerBadgeStroke(PALETTE.amber);
  yield* all(
    card6Opacity(1, 0.35, easeOutExpo),
    card6Scale(1.03, 0.2, easeOutBack).to(1.0, 0.2),
    centerBadgeScale(1.05, 0.35, easeOutBack),
  );

  // Beat 10 (39.34s): "Tanpa jeda mengocok batu, ritme permainan jadi kilat dan bikin nagih!"
  yield* waitUntilSceneTime(39.34, t0);
  tagText('RITME KILAT BIKIN NAGIH');
  stampText('PUTARAN NON-STOP 30 DETIK');
  stampBg(PALETTE.emerald);
  centerBadgeText('PUTARAN NON-STOP KILAT');
  centerBadgeSub('Main Lebih Cepat, Jam Main Naik!');
  centerBadgeColor(PALETTE.emerald);
  centerBadgeStroke(PALETTE.emerald);
  yield* all(
    stampScale(1.08, 0.2, easeOutBack).to(1.0, 0.2),
    centerBadgeScale(1.05, 0.35, easeOutBack),
  );

  // Hold end of scene until exact duration
  yield* finishSceneAt(SCENE_TIMINGS[1].duration, t0);
});
