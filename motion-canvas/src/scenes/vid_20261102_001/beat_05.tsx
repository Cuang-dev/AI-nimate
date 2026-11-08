import { Img, makeScene2D, Node, Rect, Txt } from '@motion-canvas/2d';
import {
  all,
  createRef,
  createSignal,
  easeOutBack,
  easeOutCubic,
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
  setupBaseStage(view, 'beat_05');

  // Animation signals
  const stageOpacity = createSignal(0);

  // Comic panel swap signals (ch05_p1 -> ch05_p2)
  const panel1Opacity = createSignal(1);
  const panel2Opacity = createSignal(0);

  // Timer badge signals
  const timerText = createSignal('⏱ 5 JAM TERKUNCI');
  const timerBg = createSignal(PALETTE.crimson);

  // Right column cards signals
  const card1Opacity = createSignal(0);
  const card1Scale = createSignal(0.9);

  const card2Opacity = createSignal(0);
  const card2Scale = createSignal(0.9);

  const card3Opacity = createSignal(0);
  const card3Scale = createSignal(0.9);

  const card4Opacity = createSignal(0);
  const card4Scale = createSignal(0.9);
  const card4Border = createSignal(COLORS.ink);

  const card5Opacity = createSignal(0);
  const card5Scale = createSignal(0.9);

  const card6Opacity = createSignal(0);
  const card6Scale = createSignal(0.9);
  const card6Bg = createSignal(PALETTE.mutedBg);
  const card6Border = createSignal(COLORS.ink);

  const stage = createRef<Node>();

  view.add(
    <Node ref={stage} opacity={stageOpacity}>
      {/* ===== LEFT/MAIN STAGE: Bold Widescreen 16:9 Comic Panel Frame ===== */}
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
        {/* Panel 1: Focused Players at Table with 5hr Clock */}
        <Img
          src="/assets/vid_20261102_001/ch05_p1.png"
          width={1200}
          height={675}
          opacity={panel1Opacity}
        />

        {/* Panel 2: Player Blindly Grabbing Snack */}
        <Img
          src="/assets/vid_20261102_001/ch05_p2.png"
          width={1200}
          height={675}
          opacity={panel2Opacity}
        />

        {/* Single Top-Left Comic Badge */}
        <Rect
          x={-420}
          y={-285}
          padding={[10, 20]}
          radius={10}
          fill={COLORS.ink}
          stroke={'#FFFFFF'}
          lineWidth={2}
          layout
          direction="row"
          alignItems="center"
        >
          <Txt
            text="PSIKOLOGI SOSIAL MAHJONG"
            fontFamily={HEADING_FONT}
            fontSize={20}
            fontWeight={800}
            fill={'#FFFFFF'}
          />
        </Rect>

        {/* Bottom-Right Lock-In Timer Badge */}
        <Rect
          x={410}
          y={280}
          padding={[10, 22]}
          radius={10}
          fill={timerBg}
          stroke={COLORS.ink}
          lineWidth={2.5}
          layout
          direction="row"
          alignItems="center"
          gap={8}
        >
          <Txt
            text={timerText}
            fontFamily={FONTS.data}
            fontSize={20}
            fontWeight={800}
            fill={'#FFFFFF'}
          />
        </Rect>
      </Rect>

      {/* ===== RIGHT COMIC STORYBOARD / CALLOUT COLUMN ===== */}
      <Rect
        x={630}
        y={-30}
        width={410}
        height={675}
        radius={20}
        fill={'#FFFFFF'}
        stroke={COLORS.ink}
        lineWidth={3.5}
        padding={16}
        layout
        direction="column"
        gap={10}
        justifyContent="space-between"
      >
        {/* Card 1: Kafe Kopi (Cue 2: 6.06s) */}
        <Rect
          width={376}
          height={94}
          radius={12}
          fill={PALETTE.mutedBg}
          stroke={COLORS.ink}
          lineWidth={2}
          padding={[10, 14]}
          layout
          direction="column"
          justifyContent="center"
          opacity={card1Opacity}
          scale={card1Scale}
        >
          <Txt
            text="01. KAFE KOPI BIASA"
            fontFamily={HEADING_FONT}
            fontSize={18}
            fontWeight={800}
            fill={COLORS.secondaryInk}
          />
          <Txt
            text="Rp35rb Nongkrong 3 Jam"
            fontFamily={FONTS.body}
            fontSize={18}
            fontWeight={700}
            fill={COLORS.ink}
          />
          <Txt
            text="Revenue Leakage Tinggi"
            fontFamily={FONTS.data}
            fontSize={18}
            fontWeight={700}
            fill={PALETTE.crimson}
          />
        </Rect>

        {/* Card 2: Meja Biliar (Cue 3: 11.4s) */}
        <Rect
          width={376}
          height={94}
          radius={12}
          fill={PALETTE.mutedBg}
          stroke={COLORS.ink}
          lineWidth={2}
          padding={[10, 14]}
          layout
          direction="column"
          justifyContent="center"
          opacity={card2Opacity}
          scale={card2Scale}
        >
          <Txt
            text="02. MEJA BILIAR"
            fontFamily={HEADING_FONT}
            fontSize={18}
            fontWeight={800}
            fill={COLORS.secondaryInk}
          />
          <Txt
            text="1 Jam Langsung Bubar"
            fontFamily={FONTS.body}
            fontSize={18}
            fontWeight={700}
            fill={COLORS.ink}
          />
          <Txt
            text="High Churn • Sesi Singkat"
            fontFamily={FONTS.data}
            fontSize={18}
            fontWeight={700}
            fill={PALETTE.crimson}
          />
        </Rect>

        {/* Card 3: Standar Mahjong 16 Ronde (Cue 4: 15.62s) */}
        <Rect
          width={376}
          height={94}
          radius={12}
          fill={PALETTE.amberBg}
          stroke={PALETTE.amber}
          lineWidth={2}
          padding={[10, 14]}
          layout
          direction="column"
          justifyContent="center"
          opacity={card3Opacity}
          scale={card3Scale}
        >
          <Txt
            text="03. STANDAR MAHJONG"
            fontFamily={HEADING_FONT}
            fontSize={18}
            fontWeight={800}
            fill={PALETTE.amber}
          />
          <Txt
            text="4 Angin = 16 Ronde Penuh"
            fontFamily={FONTS.body}
            fontSize={18}
            fontWeight={700}
            fill={COLORS.ink}
          />
          <Txt
            text="Timur • Selatan • Barat • Utara"
            fontFamily={FONTS.data}
            fontSize={18}
            fontWeight={700}
            fill={COLORS.secondaryInk}
          />
        </Rect>

        {/* Card 4: Aturan Ketat Sosial (Cue 5 & 6: 20.72s & 25.3s) */}
        <Rect
          width={376}
          height={94}
          radius={12}
          fill={PALETTE.crimsonBg}
          stroke={card4Border}
          lineWidth={2.5}
          padding={[10, 14]}
          layout
          direction="column"
          justifyContent="center"
          opacity={card4Opacity}
          scale={card4Scale}
        >
          <Txt
            text="04. ATURAN KETAT SOSIAL"
            fontFamily={HEADING_FONT}
            fontSize={18}
            fontWeight={800}
            fill={PALETTE.crimson}
          />
          <Txt
            text="1 Pergi = Permainan Batal!"
            fontFamily={FONTS.body}
            fontSize={18}
            fontWeight={800}
            fill={PALETTE.crimson}
          />
          <Txt
            text="Wajib Berempat Selesai Bareng"
            fontFamily={FONTS.data}
            fontSize={18}
            fontWeight={700}
            fill={COLORS.ink}
          />
        </Rect>

        {/* Card 5: Durasi Kunci (Cue 7 & 8: 29.96s & 34.74s) */}
        <Rect
          width={376}
          height={94}
          radius={12}
          fill={PALETTE.cyanBg}
          stroke={PALETTE.cyan}
          lineWidth={2}
          padding={[10, 14]}
          layout
          direction="column"
          justifyContent="center"
          opacity={card5Opacity}
          scale={card5Scale}
        >
          <Txt
            text="05. DURASI KUNCI NON-STOP"
            fontFamily={HEADING_FONT}
            fontSize={18}
            fontWeight={800}
            fill={PALETTE.cyan}
          />
          <Txt
            text="4–6 Jam Terkunci di Ruangan"
            fontFamily={FONTS.body}
            fontSize={18}
            fontWeight={700}
            fill={COLORS.ink}
          />
          <Txt
            text="AC Dingin • Tanpa Jendela"
            fontFamily={FONTS.data}
            fontSize={18}
            fontWeight={700}
            fill={COLORS.secondaryInk}
          />
        </Rect>

        {/* Card 6: Efek Lapar & Haus -> Cash Cow (Cue 9 & 10: 38.56s & 43.06s) */}
        <Rect
          width={376}
          height={94}
          radius={12}
          fill={card6Bg}
          stroke={card6Border}
          lineWidth={2.5}
          padding={[10, 14]}
          layout
          direction="column"
          justifyContent="center"
          opacity={card6Opacity}
          scale={card6Scale}
        >
          <Txt
            text="06. CASH COW TERBUKA"
            fontFamily={HEADING_FONT}
            fontSize={18}
            fontWeight={800}
            fill={PALETTE.emerald}
          />
          <Txt
            text="Lapar & Haus -> Order F&B!"
            fontFamily={FONTS.body}
            fontSize={18}
            fontWeight={800}
            fill={COLORS.ink}
          />
          <Txt
            text="Pesanan Makanan Margin 70%"
            fontFamily={FONTS.data}
            fontSize={18}
            fontWeight={700}
            fill={PALETTE.emerald}
          />
        </Rect>
      </Rect>
    </Node>
  );

  // =========================================================================
  // Synchronized Scene Choreography (10 Beats from beat_cue_schedule.json)
  // =========================================================================

  // Cue 1: 0.2s - Slam Panel 1 (Four friends focused at table)
  yield* waitUntilSceneTime(0.2);
  yield* stageOpacity(1, 0.45, easeOutCubic);

  // Cue 2: 6.06s - Card 1: Kafe Kopi Rp35rb duduk 3 jam
  yield* waitUntilSceneTime(6.06);
  yield* all(
    card1Opacity(1, 0.35, easeOutCubic),
    card1Scale(1.0, 0.35, easeOutBack),
  );

  // Cue 3: 11.4s - Card 2: Meja Biliar 1 jam bubar
  yield* waitUntilSceneTime(11.4);
  yield* all(
    card2Opacity(1, 0.35, easeOutCubic),
    card2Scale(1.0, 0.35, easeOutBack),
  );

  // Cue 4: 15.62s - Card 3: Mahjong standar 16 ronde
  yield* waitUntilSceneTime(15.62);
  yield* all(
    card3Opacity(1, 0.35, easeOutCubic),
    card3Scale(1.0, 0.35, easeOutBack),
  );

  // Cue 5: 20.72s - Card 4: Fokus penuh, tidak bisa berdiri seenaknya
  yield* waitUntilSceneTime(20.72);
  yield* all(
    card4Opacity(1, 0.35, easeOutCubic),
    card4Scale(1.0, 0.35, easeOutBack),
  );

  // Cue 6: 25.3s - Swap to Panel 2 (Reaching for snacks), highlight Card 4
  yield* waitUntilSceneTime(25.3);
  yield* all(
    panel1Opacity(0, 0.3, easeOutCubic),
    panel2Opacity(1, 0.3, easeOutCubic),
    card4Border(PALETTE.crimson, 0.3),
  );

  // Cue 7: 29.96s - Card 5: The 5-Hour Social Lock-in Effect
  yield* waitUntilSceneTime(29.96);
  yield* all(
    card5Opacity(1, 0.35, easeOutCubic),
    card5Scale(1.0, 0.35, easeOutBack),
  );

  // Cue 8: 34.74s - Waktu melompat, timer badge updates
  yield* waitUntilSceneTime(34.74);
  timerText('⏱ WAKTU: 19:00 -> 00:00');
  timerBg(PALETTE.amber);

  // Cue 9: 38.56s - Card 6: Efek lapar & haus
  yield* waitUntilSceneTime(38.56);
  yield* all(
    card6Opacity(1, 0.35, easeOutCubic),
    card6Scale(1.0, 0.35, easeOutBack),
  );

  // Cue 10: 43.06s - Mesin uang aktif: The F&B Cash Cow
  yield* waitUntilSceneTime(43.06);
  timerText('💰 CASH COW AKTIF!');
  timerBg(PALETTE.emerald);
  yield* all(
    card6Bg(PALETTE.emeraldBg, 0.35),
    card6Border(PALETTE.emerald, 0.35),
  );

  // Hold safely until scene completion
  yield* finishSceneAt(SCENE_TIMINGS[4].duration);
});
