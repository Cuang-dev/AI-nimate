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
  setupBaseStage(view, 'beat_01');

  const wide = isWidescreen(view);
  const stage = createRef<Node>();

  // Comic Panel Opacity and Scale signals
  const p1Opacity = createSignal(1);
  const p1Scale = createSignal(1.0);
  const p2Opacity = createSignal(0);
  const p2Scale = createSignal(1.04);
  const p3Opacity = createSignal(0);
  const p3Scale = createSignal(1.04);
  const p4Opacity = createSignal(0);
  const p4Scale = createSignal(1.04);

  // Overlay Badge Signals inside Comic Frame
  const tagText = createSignal('PANEL 1 // LOUNGE KASIR');
  const stampText = createSignal('SEWA: RP15.000/JAM');
  const stampBg = createSignal(PALETTE.emerald);
  const stampScale = createSignal(1.0);

  const centerBadgeOpacity = createSignal(0);
  const centerBadgeScale = createSignal(0.85);
  const centerBadgeText = createSignal('CAPEX RUKO: RP350 JUTA');
  const centerBadgeSub = createSignal('Investasi Awal Ruko 2 Lantai');
  const centerBadgeColor = createSignal(PALETTE.crimson);
  const centerBadgeStroke = createSignal(PALETTE.crimson);

  // Right Column Paradox Cards Signals
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
        {/* Panel 1: Kasir ramah & RFID Card */}
        <Img
          src={'/assets/vid_20261102_001/ch01_p1.png'}
          width={1200}
          height={675}
          opacity={p1Opacity}
          scale={p1Scale}
        />

        {/* Panel 2: Entrepreneur & kalkulator bingung */}
        <Img
          src={'/assets/vid_20261102_001/ch01_p2.png'}
          width={1200}
          height={675}
          opacity={p2Opacity}
          scale={p2Scale}
        />

        {/* Panel 3: Meja Foshan, Indomie, Dimsum, Boba */}
        <Img
          src={'/assets/vid_20261102_001/ch01_p3.png'}
          width={1200}
          height={675}
          opacity={p3Opacity}
          scale={p3Scale}
        />

        {/* Panel 4: Night scene PIK lounge ramai */}
        <Img
          src={'/assets/vid_20261102_001/ch01_p4.png'}
          width={1200}
          height={675}
          opacity={p4Opacity}
          scale={p4Scale}
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
            text="PARADOKS BISNIS"
            fontFamily={HEADING_FONT}
            fontSize={20}
            fontWeight={800}
            fill={PALETTE.crimson}
          />
          <Txt
            text="Lounge Mahjong 8 Meja di Ruko"
            fontFamily={FONTS.body}
            fontSize={18}
            fontWeight={600}
            fill={COLORS.secondaryInk}
          />
        </Rect>

        {/* Card 1: SEWA: Rp15.000/Jam */}
        <Rect
          layout
          direction="column"
          gap={4}
          padding={[10, 14]}
          radius={12}
          fill={() => (activeCard() === 1 ? PALETTE.emeraldBg : '#FFFFFF')}
          stroke={() => (activeCard() === 1 ? PALETTE.emerald : COLORS.ink)}
          lineWidth={2.5}
          opacity={card1Opacity}
          scale={card1Scale}
        >
          <Txt
            text="SEWA: Rp15.000/Jam"
            fontFamily={HEADING_FONT}
            fontSize={20}
            fontWeight={800}
            fill={() => (activeCard() === 1 ? PALETTE.emerald : COLORS.ink)}
          />
          <Txt
            text="Tarif Receh Per Orang Sejam"
            fontFamily={FONTS.body}
            fontSize={18}
            fontWeight={600}
            fill={COLORS.secondaryInk}
          />
        </Rect>

        {/* Card 2: MODAL RUKO: Rp350 Juta */}
        <Rect
          layout
          direction="column"
          gap={4}
          padding={[10, 14]}
          radius={12}
          fill={() => (activeCard() === 2 ? PALETTE.crimsonBg : '#FFFFFF')}
          stroke={() => (activeCard() === 2 ? PALETTE.crimson : COLORS.ink)}
          lineWidth={2.5}
          opacity={card2Opacity}
          scale={card2Scale}
        >
          <Txt
            text="MODAL RUKO: Rp350 Juta"
            fontFamily={HEADING_FONT}
            fontSize={20}
            fontWeight={800}
            fill={() => (activeCard() === 2 ? PALETTE.crimson : COLORS.ink)}
          />
          <Txt
            text="CapEx Sewa Ruko & 8 Meja"
            fontFamily={FONTS.body}
            fontSize={18}
            fontWeight={600}
            fill={COLORS.secondaryInk}
          />
        </Rect>

        {/* Card 3: TARGET OMZET: Rp180 Juta/Bln */}
        <Rect
          layout
          direction="column"
          gap={4}
          padding={[10, 14]}
          radius={12}
          fill={() => (activeCard() === 3 ? PALETTE.amberBg : '#FFFFFF')}
          stroke={() => (activeCard() === 3 ? PALETTE.amber : COLORS.ink)}
          lineWidth={2.5}
          opacity={card3Opacity}
          scale={card3Scale}
        >
          <Txt
            text="TARGET OMZET: Rp180 Juta/Bln"
            fontFamily={HEADING_FONT}
            fontSize={20}
            fontWeight={800}
            fill={() => (activeCard() === 3 ? PALETTE.amber : COLORS.ink)}
          />
          <Txt
            text="Target Omzet Bulanan Ruko"
            fontFamily={FONTS.body}
            fontSize={18}
            fontWeight={600}
            fill={COLORS.secondaryInk}
          />
        </Rect>

        {/* Card 4: UMPAN: Sewa Meja */}
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
            text="UMPAN: Sewa Meja"
            fontFamily={HEADING_FONT}
            fontSize={20}
            fontWeight={800}
            fill={() => (activeCard() === 4 ? PALETTE.cyan : COLORS.ink)}
          />
          <Txt
            text="Hanya Penutup Listrik & Sewa"
            fontFamily={FONTS.body}
            fontSize={18}
            fontWeight={600}
            fill={COLORS.secondaryInk}
          />
        </Rect>

        {/* Card 5: MESIN CUAN: F&B Margin 70% */}
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
            text="MESIN CUAN: F&B Margin 70%"
            fontFamily={HEADING_FONT}
            fontSize={20}
            fontWeight={800}
            fill={() => (activeCard() === 5 ? PALETTE.emerald : COLORS.ink)}
          />
          <Txt
            text="Jebakan Makanan & Minuman 5 Jam"
            fontFamily={FONTS.body}
            fontSize={18}
            fontWeight={600}
            fill={COLORS.secondaryInk}
          />
        </Rect>

        {/* Card 6: STRUK KASIR: Tembus Rp1 Juta! */}
        <Rect
          layout
          direction="column"
          gap={4}
          padding={[10, 14]}
          radius={12}
          fill={() => (activeCard() === 6 ? PALETTE.crimsonBg : '#FFFFFF')}
          stroke={() => (activeCard() === 6 ? PALETTE.crimson : COLORS.ink)}
          lineWidth={2.5}
          opacity={card6Opacity}
          scale={card6Scale}
        >
          <Txt
            text="STRUK KASIR: Tembus Rp1 Juta!"
            fontFamily={HEADING_FONT}
            fontSize={20}
            fontWeight={800}
            fill={() => (activeCard() === 6 ? PALETTE.crimson : COLORS.ink)}
          />
          <Txt
            text="Total Tagihan Meja 1 Sesi Penuh"
            fontFamily={FONTS.body}
            fontSize={18}
            fontWeight={600}
            fill={COLORS.secondaryInk}
          />
        </Rect>
      </Rect>
    </Node>
  );

  // ================= 13 CUE CHOREOGRAPHY =================

  // Beat 1 (0.2s): "Sewa meja mahjong ini cuma Rp15 ribu per orang sejam—"
  yield* waitUntilSceneTime(0.2, t0);
  activeCard(1);
  tagText('PANEL 1 // LOUNGE KASIR');
  stampText('SEWA: RP15.000/JAM');
  stampBg(PALETTE.emerald);
  yield* all(
    p1Opacity(1, 0.4, easeOutExpo),
    card1Opacity(1, 0.35, easeOutExpo),
    card1Scale(1.03, 0.2, easeOutBack).to(1.0, 0.2),
  );

  // Beat 2 (4.06s): "padahal modal rukonya tembus Rp350 juta."
  yield* waitUntilSceneTime(4.06, t0);
  activeCard(2);
  centerBadgeText('CAPEX RUKO: RP350 JUTA');
  centerBadgeSub('Modal Renovasi & Meja Foshan');
  centerBadgeColor(PALETTE.crimson);
  centerBadgeStroke(PALETTE.crimson);
  yield* all(
    card2Opacity(1, 0.35, easeOutExpo),
    card2Scale(1.03, 0.2, easeOutBack).to(1.0, 0.2),
    centerBadgeOpacity(1, 0.3, easeOutExpo),
    centerBadgeScale(1.0, 0.35, easeOutBack),
  );

  // Beat 3 (8.6s): "Terus gimana caranya bisnis recehan ini balik modal,"
  yield* waitUntilSceneTime(8.6, t0);
  tagText('PANEL 2 // HITUNGAN BISNIS');
  stampText('BAGAIMANA BALIK MODAL?');
  stampBg(PALETTE.amber);
  yield* all(
    centerBadgeOpacity(0, 0.25, easeOutExpo),
    p1Opacity(0, 0.45, easeOutCubic),
    p2Opacity(1, 0.45, easeOutCubic),
    p2Scale(1.0, 0.5, easeOutExpo),
  );

  // Beat 4 (11.5s): "bahkan cetak omzet Rp180 juta sebulan?"
  yield* waitUntilSceneTime(11.5, t0);
  activeCard(3);
  centerBadgeText('OMZET: RP180 JUTA/BULAN');
  centerBadgeSub('Target Omzet 8 Meja Mahjong');
  centerBadgeColor(PALETTE.emerald);
  centerBadgeStroke(PALETTE.emerald);
  yield* all(
    card3Opacity(1, 0.35, easeOutExpo),
    card3Scale(1.03, 0.2, easeOutBack).to(1.0, 0.2),
    centerBadgeOpacity(1, 0.3, easeOutExpo),
    centerBadgeScale(1.0, 0.35, easeOutBack),
  );

  // Beat 5 (15.1s): "Ternyata uang aslinya bukan dari sewa meja—"
  yield* waitUntilSceneTime(15.1, t0);
  activeCard(4);
  tagText('PANEL 3 // MEJA & KULINER');
  stampText('SEWA MEJA = HANYA UMPAN');
  stampBg(PALETTE.crimson);
  yield* all(
    centerBadgeOpacity(0, 0.25, easeOutExpo),
    p2Opacity(0, 0.45, easeOutCubic),
    p3Opacity(1, 0.45, easeOutCubic),
    p3Scale(1.0, 0.5, easeOutExpo),
    card4Opacity(1, 0.35, easeOutExpo),
    card4Scale(1.03, 0.2, easeOutBack).to(1.0, 0.2),
  );

  // Beat 6 (18.16s): "tapi dari jebakan 5 jam beli makanan margin 70%!"
  yield* waitUntilSceneTime(18.16, t0);
  activeCard(5);
  stampText('MARGIN F&B: 70% KOTOR');
  stampBg(PALETTE.emerald);
  centerBadgeText('JEBAKAN 5 JAM NON-STOP');
  centerBadgeSub('Mie Instan, Dimsum & Kopi Susu');
  centerBadgeColor(PALETTE.amber);
  centerBadgeStroke(PALETTE.amber);
  yield* all(
    card5Opacity(1, 0.35, easeOutExpo),
    card5Scale(1.03, 0.2, easeOutBack).to(1.0, 0.2),
    centerBadgeOpacity(1, 0.3, easeOutExpo),
    centerBadgeScale(1.0, 0.35, easeOutBack),
  );

  // Beat 7 (22.28s): "Inilah fenomena lounge mahjong otomatis yang lagi meledak di ruko kota besar."
  yield* waitUntilSceneTime(22.28, t0);
  tagText('PANEL 4 // LOUNGE MALAM PIK');
  stampText('VIRAL DI KOTA BESAR');
  stampBg(PALETTE.ink);
  yield* all(
    centerBadgeOpacity(0, 0.25, easeOutExpo),
    p3Opacity(0, 0.45, easeOutCubic),
    p4Opacity(1, 0.45, easeOutCubic),
    p4Scale(1.0, 0.5, easeOutExpo),
  );

  // Beat 8 (26.18s): "Dari kawasan P-I-K sampai Surabaya, tempat seperti ini selalu antre panjang."
  yield* waitUntilSceneTime(26.18, t0);
  stampText('PIK • SERPONG • SURABAYA');
  stampBg(PALETTE.emerald);
  centerBadgeText('ANTRE PANJANG TIAP MALAM');
  centerBadgeSub('Tren Hiburan Baru Anak Muda Urban');
  centerBadgeColor(PALETTE.emerald);
  centerBadgeStroke(PALETTE.emerald);
  yield* all(
    centerBadgeOpacity(1, 0.3, easeOutExpo),
    centerBadgeScale(1.0, 0.35, easeOutBack),
  );

  // Beat 9 (31.48s): "Pemilik ruko rela keluar ratusan juta demi meja otomatis impor Tiongkok."
  yield* waitUntilSceneTime(31.48, t0);
  stampText('MEJA OTOMATIS FOSHAN');
  stampBg(PALETTE.cyan);
  centerBadgeText('IMPOR OTOMATIS TIONGKOK');
  centerBadgeSub('Teknologi Shuffle Cepat Tanpa Sentuh');
  centerBadgeColor(PALETTE.cyan);
  centerBadgeStroke(PALETTE.cyan);
  yield* all(
    stampScale(1.08, 0.2, easeOutBack).to(1.0, 0.2),
  );

  // Beat 10 (33.28s): "Pemain datang berempat, duduk santai di sofa empuk ber-A-C dingin."
  yield* waitUntilSceneTime(33.28, t0);
  stampText('4 PEMAIN • PRIVATE ROOM');
  stampBg(PALETTE.amber);
  centerBadgeText('SOFA EMPUK & RUANG AC');
  centerBadgeSub('Kenyamanan Maksimal Berjam-jam');
  centerBadgeColor(PALETTE.amber);
  centerBadgeStroke(PALETTE.amber);
  yield* all(
    stampScale(1.08, 0.2, easeOutBack).to(1.0, 0.2),
  );

  // Beat 11 (39.6s): "Mereka kira cuma keluar puluhan ribu buat main santai semalaman."
  yield* waitUntilSceneTime(39.6, t0);
  stampText('KIRA CUMA RP15.000/JAM');
  stampBg(PALETTE.muted);
  centerBadgeText('ILUSI HIBURAN MURAH');
  centerBadgeSub('Persepsi Biaya Receh di Awal');
  centerBadgeColor(PALETTE.muted);
  centerBadgeStroke(PALETTE.muted);
  yield* all(
    stampScale(1.08, 0.2, easeOutBack).to(1.0, 0.2),
  );

  // Beat 12 (42.92s): "Tapi begitu struk kasir keluar, total tagihannya tembus sejuta rupiah!"
  yield* waitUntilSceneTime(42.92, t0);
  activeCard(6);
  stampText('STRUK TEMBUS RP1 JUTA!');
  stampBg(PALETTE.crimson);
  centerBadgeText('STRUK KASIR: RP1 JUTA+');
  centerBadgeSub('F&B 60% + Sewa Meja 40%');
  centerBadgeColor(PALETTE.crimson);
  centerBadgeStroke(PALETTE.crimson);
  yield* all(
    card6Opacity(1, 0.35, easeOutExpo),
    card6Scale(1.03, 0.2, easeOutBack).to(1.0, 0.2),
    centerBadgeOpacity(1, 0.3, easeOutExpo),
    centerBadgeScale(1.05, 0.35, easeOutBack),
  );

  // Beat 13 (47.18s): "Mari kita bedah tuntas seluruh mesin uang bisnis viral ini."
  yield* waitUntilSceneTime(47.18, t0);
  tagText('BEDAH TUNTAS BISNIS');
  stampText('MENUJU TEKNOLOGI MEJA');
  stampBg(COLORS.ink);
  centerBadgeText('BEDAH ANATOMI BISNIS');
  centerBadgeSub('Lanjut ke Bab 2: Mesin Foshan');
  centerBadgeColor(COLORS.ink);
  centerBadgeStroke(COLORS.ink);
  yield* all(
    stampScale(1.05, 0.3, easeOutExpo),
    centerBadgeScale(1.0, 0.3, easeOutExpo),
  );

  // Hold end of scene until exact duration
  yield* finishSceneAt(SCENE_TIMINGS[0].duration, t0);
});
