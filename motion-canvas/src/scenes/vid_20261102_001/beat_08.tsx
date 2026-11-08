import { Img, makeScene2D, Node, Rect, Txt } from '@motion-canvas/2d';
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
  const sceneIdx = 7;
  const sceneDuration = SCENE_TIMINGS[sceneIdx]?.duration ?? 45.271;

  // 1. Mount base stage
  setupBaseStage(view, 'beat_08');

  // Animation signals
  const stageOpacity = createSignal(0);
  const leftPanelScale = createSignal(0.96);
  const rightColScale = createSignal(0.96);
  const imageSwap = createSignal(0); // 0 = ch08_p1, 1 = ch08_p2

  // 6 Structured Comic Callout Rows
  const row1Opacity = createSignal(0);
  const row1Scale = createSignal(0.92);

  const row2Opacity = createSignal(0);
  const row2Scale = createSignal(0.92);

  const row3Opacity = createSignal(0);
  const row3Scale = createSignal(0.92);

  const row4Opacity = createSignal(0);
  const row4Scale = createSignal(0.92);

  const row5Opacity = createSignal(0);
  const row5Scale = createSignal(0.92);

  const row6Opacity = createSignal(0);
  const row6Scale = createSignal(0.92);

  // Status badges & stamps
  const currentBadgeText = createSignal('KERAPUHAN TEKNIS MESIN FOSHAN');
  const currentBadgeColor = createSignal(PALETTE.crimson);
  const currentStampText = createSignal('STATUS: RISIKO F&B AKTIF');
  const currentStampBg = createSignal(PALETTE.crimsonBg);

  const stage = createRef<Node>();

  view.add(
    <Node ref={stage} opacity={stageOpacity}>
      {/* ================================================================= */}
      {/* LEFT/MAIN STAGE: 16:9 COMIC FRAME (x = -210, y = -30)             */}
      {/* ================================================================= */}
      <Rect
        x={-210}
        y={-30}
        width={1200}
        height={675}
        scale={leftPanelScale}
        radius={20}
        clip
        fill={'#FFFFFF'}
        stroke={COLORS.ink}
        lineWidth={4}
      >
        {/* Panel 1: Spilled boba catastrophe */}
        <Img
          src={'/assets/vid_20261102_001/ch08_p1.png'}
          width={1200}
          height={675}
          opacity={() => 1 - imageSwap()}
        />

        {/* Panel 2: Distressed owner searching under sofa */}
        <Img
          src={'/assets/vid_20261102_001/ch08_p2.png'}
          width={1200}
          height={675}
          opacity={imageSwap}
        />

        {/* Single Top-Left Comic Badge */}
        <Rect
          x={-360}
          y={-285}
          layout
          direction="row"
          alignItems="center"
          padding={[10, 22]}
          radius={999}
          fill={'#FFFFFF'}
          stroke={COLORS.ink}
          lineWidth={2.5}
        >
          <Txt
            text={currentBadgeText}
            fontFamily={HEADING_FONT}
            fontSize={20}
            fontWeight={800}
            fill={currentBadgeColor}
          />
        </Rect>

        {/* Single Bottom-Right Status Stamp */}
        <Rect
          x={360}
          y={285}
          layout
          direction="row"
          alignItems="center"
          padding={[10, 22]}
          radius={999}
          fill={currentStampBg}
          stroke={COLORS.ink}
          lineWidth={2.5}
        >
          <Txt
            text={currentStampText}
            fontFamily={FONTS.data}
            fontSize={18}
            fontWeight={800}
            fill={COLORS.ink}
          />
        </Rect>
      </Rect>

      {/* ================================================================= */}
      {/* RIGHT COMIC STORYBOARD / CALLOUT COLUMN (x = 630, y = -30, w = 410)*/}
      {/* ================================================================= */}
      <Rect
        x={630}
        y={-30}
        width={410}
        height={675}
        scale={rightColScale}
        layout
        direction="column"
        gap={10}
        padding={18}
        radius={20}
        fill={'#FFFFFF'}
        stroke={COLORS.ink}
        lineWidth={3.5}
      >
        {/* Column Title Header */}
        <Rect
          layout
          direction="row"
          width={374}
          height={46}
          alignItems="center"
          justifyContent="center"
          radius={10}
          fill={PALETTE.mutedBg}
          stroke={COLORS.ink}
          lineWidth={2}
        >
          <Txt
            text="6 KERAPUHAN OPERASIONAL"
            fontFamily={HEADING_FONT}
            fontSize={19}
            fontWeight={800}
            fill={COLORS.ink}
          />
        </Rect>

        {/* Row 1: Tumpahan Boba Manis */}
        <Rect
          layout
          direction="column"
          width={374}
          height={86}
          padding={[8, 14]}
          gap={4}
          radius={12}
          fill={PALETTE.amberBg}
          stroke={COLORS.ink}
          lineWidth={2}
          opacity={row1Opacity}
          scale={row1Scale}
        >
          <Txt
            text="1. Tumpahan Boba Manis"
            fontFamily={HEADING_FONT}
            fontSize={19}
            fontWeight={800}
            fill={PALETTE.crimson}
          />
          <Txt
            text="Cairan gula masuk celah elevator"
            fontFamily={FONTS.body}
            fontSize={18}
            fontWeight={600}
            fill={COLORS.secondaryInk}
          />
        </Rect>

        {/* Row 2: Sensor Optik Lengket & Macet */}
        <Rect
          layout
          direction="column"
          width={374}
          height={86}
          padding={[8, 14]}
          gap={4}
          radius={12}
          fill={PALETTE.crimsonBg}
          stroke={PALETTE.crimson}
          lineWidth={2.5}
          opacity={row2Opacity}
          scale={row2Scale}
        >
          <Txt
            text="2. Sensor Optik Macet"
            fontFamily={HEADING_FONT}
            fontSize={19}
            fontWeight={800}
            fill={PALETTE.crimson}
          />
          <Txt
            text="Air gula kering, gir motor macet"
            fontFamily={FONTS.body}
            fontSize={18}
            fontWeight={600}
            fill={COLORS.secondaryInk}
          />
        </Rect>

        {/* Row 3: Biaya Servis Motor: Rp800 Ribu */}
        <Rect
          layout
          direction="column"
          width={374}
          height={86}
          padding={[8, 14]}
          gap={4}
          radius={12}
          fill={PALETTE.surface}
          stroke={COLORS.ink}
          lineWidth={2}
          opacity={row3Opacity}
          scale={row3Scale}
        >
          <Txt
            text="3. Servis Motor: Rp800 Ribu"
            fontFamily={HEADING_FONT}
            fontSize={19}
            fontWeight={800}
            fill={PALETTE.ink}
          />
          <Txt
            text="Ongkos teknisi bongkar mesin"
            fontFamily={FONTS.body}
            fontSize={18}
            fontWeight={600}
            fill={COLORS.secondaryInk}
          />
        </Rect>

        {/* Row 4: Kalibrasi Magnet Presisi */}
        <Rect
          layout
          direction="column"
          width={374}
          height={86}
          padding={[8, 14]}
          gap={4}
          radius={12}
          fill={PALETTE.mutedBg}
          stroke={COLORS.ink}
          lineWidth={2}
          opacity={row4Opacity}
          scale={row4Scale}
        >
          <Txt
            text="4. Kalibrasi Magnet Presisi"
            fontFamily={HEADING_FONT}
            fontSize={19}
            fontWeight={800}
            fill={PALETTE.ink}
          />
          <Txt
            text="144 batu presisi sub-milimeter"
            fontFamily={FONTS.body}
            fontSize={18}
            fontWeight={600}
            fill={COLORS.secondaryInk}
          />
        </Rect>

        {/* Row 5: 1 Batu Hilang = 144 Batu Lumpuh! */}
        <Rect
          layout
          direction="column"
          width={374}
          height={86}
          padding={[8, 14]}
          gap={4}
          radius={12}
          fill={PALETTE.crimsonBg}
          stroke={PALETTE.crimson}
          lineWidth={2.5}
          opacity={row5Opacity}
          scale={row5Scale}
        >
          <Txt
            text="5. 1 Hilang = 144 Lumpuh!"
            fontFamily={HEADING_FONT}
            fontSize={19}
            fontWeight={800}
            fill={PALETTE.crimson}
          />
          <Txt
            text="1 batu hilang = 1 set lumpuh total"
            fontFamily={FONTS.body}
            fontSize={18}
            fontWeight={600}
            fill={COLORS.secondaryInk}
          />
        </Rect>

        {/* Row 6: Ganti Set Baru: Rp1,5 Juta */}
        <Rect
          layout
          direction="column"
          width={374}
          height={86}
          padding={[8, 14]}
          gap={4}
          radius={12}
          fill={PALETTE.amberBg}
          stroke={PALETTE.amber}
          lineWidth={2.5}
          opacity={row6Opacity}
          scale={row6Scale}
        >
          <Txt
            text="6. Ganti Set Baru: Rp1,5 Jt"
            fontFamily={HEADING_FONT}
            fontSize={19}
            fontWeight={800}
            fill={COLORS.ink}
          />
          <Txt
            text="Haram eceran (kutub magnet beda)"
            fontFamily={FONTS.body}
            fontSize={18}
            fontWeight={600}
            fill={COLORS.secondaryInk}
          />
        </Rect>
      </Rect>
    </Node>
  );

  // =========================================================================
  // 10 SENTENCE BEAT TIMING ORCHESTRATION
  // [0.2, 5.02, 9.64, 11.44, 16.31, 22.54, 26.5, 32.54, 36.64, 40.44]
  // =========================================================================

  // Beat 1: 0.2s - "Masalah kedua yang menghantui setiap hari adalah kerapuhan teknis mesin impor ini."
  yield* waitUntilSceneTime(0.2);
  yield* all(
    stageOpacity(1, 0.45, easeOutCubic),
    leftPanelScale(1, 0.5, easeOutBack),
    rightColScale(1, 0.5, easeOutBack),
    row1Opacity(1, 0.4),
    row1Scale(1, 0.4, easeOutBack)
  );

  // Beat 2: 5.02s - "Ketika asyik bermain sambil minum boba manis, kecelakaan sering tak terhindarkan."
  yield* waitUntilSceneTime(5.02);
  currentStampText('KECELAKAAN MINUMAN MANIS');
  currentStampBg(PALETTE.amberBg);
  yield* leftPanelScale(1.02, 0.2, easeOutCubic);
  yield* leftPanelScale(1.0, 0.2, easeOutCubic);

  // Beat 3: 9.64s - "Satu senggolan bisa membuat cairan gula pekat tumpah ke celah elevator."
  yield* waitUntilSceneTime(9.64);
  currentStampText('CAIRAN MASUK ELEVATOR MEJA');
  currentStampBg(PALETTE.crimsonBg);
  yield* leftPanelScale(1.02, 0.2, easeOutCubic);
  yield* leftPanelScale(1.0, 0.2, easeOutCubic);

  // Beat 4: 11.44s - "Air gula mengering melumuri sensor optik dan bikin gir motor macet total."
  yield* waitUntilSceneTime(11.44);
  currentBadgeText('SENSOR OPTIK ERROR & GEAR MACET');
  currentBadgeColor(PALETTE.crimson);
  yield* all(
    row2Opacity(1, 0.4, easeOutBack),
    row2Scale(1, 0.4, easeOutBack)
  );

  // Beat 5: 16.31s - "Biaya memanggil teknisi bongkar mesin mencapai delapan ratus ribu sekali datang."
  yield* waitUntilSceneTime(16.31);
  currentStampText('BIAYA SERVIS: RP800.000 / VISIT');
  currentStampBg(PALETTE.amberBg);
  yield* all(
    row3Opacity(1, 0.4, easeOutBack),
    row3Scale(1, 0.4, easeOutBack)
  );

  // Beat 6: 22.54s - "Belum lagi risiko sepele tapi fatal: satu batu magnetik hilang terselip."
  yield* waitUntilSceneTime(22.54);
  currentBadgeText('FATAL: 1 BATU HILANG TERSELIP');
  currentBadgeColor(PALETTE.crimson);
  currentStampText('MENCARI BATU DI BAWAH SOFA');
  yield* all(
    imageSwap(1, 0.5, easeInOutCubic),
    leftPanelScale(1.02, 0.25, easeOutCubic)
  );
  yield* leftPanelScale(1.0, 0.25, easeOutCubic);

  // Beat 7: 26.5s - "Ingat, setiap set berisi 144 batu dengan kalibrasi magnet sub-milimeter presisi."
  yield* waitUntilSceneTime(26.5);
  currentStampText('144 BATU KALIBRASI SUB-MM');
  currentStampBg(PALETTE.mutedBg);
  yield* all(
    row4Opacity(1, 0.4, easeOutBack),
    row4Scale(1, 0.4, easeOutBack)
  );

  // Beat 8: 32.54s - "Kehilangan satu batu artinya satu set lengkap itu langsung lumpuh total."
  yield* waitUntilSceneTime(32.54);
  currentStampText('1 SET LUMPUH TOTAL (BRICKED)');
  currentStampBg(PALETTE.crimsonBg);
  yield* all(
    row5Opacity(1, 0.4, easeOutBack),
    row5Scale(1, 0.4, easeOutBack)
  );

  // Beat 9: 36.64s - "Lo tidak bisa beli batu eceran karena bobot dan kutub magnetnya beda."
  yield* waitUntilSceneTime(36.64);
  currentBadgeText('HARAM BELI BATU ECERAN!');
  currentStampText('KUTUB & BOBOT MAGNETIK BEDA');
  yield* leftPanelScale(1.02, 0.2, easeOutCubic);
  yield* leftPanelScale(1.0, 0.2, easeOutCubic);

  // Beat 10: 40.44s - "Akibatnya, lo terpaksa beli satu set batu baru seharga satu setengah juta."
  yield* waitUntilSceneTime(40.44);
  currentBadgeText('GANTI SET BARU: RP1.500.000');
  currentStampText('KERUGIAN OPERASIONAL TAK TERDUGA');
  currentStampBg(PALETTE.amberBg);
  yield* all(
    row6Opacity(1, 0.4, easeOutBack),
    row6Scale(1, 0.4, easeOutBack)
  );

  // Hold cleanly till scene end
  yield* finishSceneAt(sceneDuration);
});
