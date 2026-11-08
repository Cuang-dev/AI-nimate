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
  const sceneIdx = 8;
  const sceneDuration = SCENE_TIMINGS[sceneIdx]?.duration ?? 47.471;

  // 1. Mount base stage
  setupBaseStage(view, 'beat_09');

  // Animation signals
  const stageOpacity = createSignal(0);
  const leftPanelScale = createSignal(0.96);
  const rightColScale = createSignal(0.96);
  const imageSwap = createSignal(0); // 0 = ch09_p1, 1 = ch09_p2

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
  const currentBadgeText = createSignal('RISIKO HUKUM PALING KRITIS');
  const currentBadgeColor = createSignal(PALETTE.crimson);
  const currentStampText = createSignal('STATUS: RED ALERT PASAL 303');
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
        {/* Panel 1: Dim illegal gambling den atmosphere */}
        <Img
          src={'/assets/vid_20261102_001/ch09_p1.png'}
          width={1200}
          height={675}
          opacity={() => 1 - imageSwap()}
        />

        {/* Panel 2: Bright lawful transparent glass lounge with CCTV */}
        <Img
          src={'/assets/vid_20261102_001/ch09_p2.png'}
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
            text="4 PERISAI HUKUM & KEPATUHAN"
            fontFamily={HEADING_FONT}
            fontSize={19}
            fontWeight={800}
            fill={COLORS.ink}
          />
        </Rect>

        {/* Row 1: Ancaman Pasal 303 KUHP (10 Thn) */}
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
          opacity={row1Opacity}
          scale={row1Scale}
        >
          <Txt
            text="1. Pasal 303 KUHP (10 Thn)"
            fontFamily={HEADING_FONT}
            fontSize={19}
            fontWeight={800}
            fill={PALETTE.crimson}
          />
          <Txt
            text="Garis tipis rekreasi vs pidana judi"
            fontFamily={FONTS.body}
            fontSize={18}
            fontWeight={600}
            fill={COLORS.secondaryInk}
          />
        </Rect>

        {/* Row 2: Tameng #1: Haram Uang & Chip */}
        <Rect
          layout
          direction="column"
          width={374}
          height={86}
          padding={[8, 14]}
          gap={4}
          radius={12}
          fill={PALETTE.emeraldBg}
          stroke={PALETTE.emerald}
          lineWidth={2}
          opacity={row2Opacity}
          scale={row2Scale}
        >
          <Txt
            text="2. Tameng #1: Zero Cash/Chip"
            fontFamily={HEADING_FONT}
            fontSize={19}
            fontWeight={800}
            fill={PALETTE.emerald}
          />
          <Txt
            text="Haram uang tunai/cip di atas meja"
            fontFamily={FONTS.body}
            fontSize={18}
            fontWeight={600}
            fill={COLORS.secondaryInk}
          />
        </Rect>

        {/* Row 3: Tameng #2: Skor Digital di HP */}
        <Rect
          layout
          direction="column"
          width={374}
          height={86}
          padding={[8, 14]}
          gap={4}
          radius={12}
          fill={PALETTE.emeraldBg}
          stroke={PALETTE.emerald}
          lineWidth={2}
          opacity={row3Opacity}
          scale={row3Scale}
        >
          <Txt
            text="3. Tameng #2: Skor Digital HP"
            fontFamily={HEADING_FONT}
            fontSize={19}
            fontWeight={800}
            fill={PALETTE.emerald}
          />
          <Txt
            text="Catat poin wajib via aplikasi HP"
            fontFamily={FONTS.body}
            fontSize={18}
            fontWeight={600}
            fill={COLORS.secondaryInk}
          />
        </Rect>

        {/* Row 4: Tameng #3: Partisi Kaca Terbuka */}
        <Rect
          layout
          direction="column"
          width={374}
          height={86}
          padding={[8, 14]}
          gap={4}
          radius={12}
          fill={PALETTE.emeraldBg}
          stroke={PALETTE.emerald}
          lineWidth={2}
          opacity={row4Opacity}
          scale={row4Scale}
        >
          <Txt
            text="4. Tameng #3: Kaca Transparan"
            fontFamily={HEADING_FONT}
            fontSize={19}
            fontWeight={800}
            fill={PALETTE.emerald}
          />
          <Txt
            text="Sekat kaca tembus pandang terbuka"
            fontFamily={FONTS.body}
            fontSize={18}
            fontWeight={600}
            fill={COLORS.secondaryInk}
          />
        </Rect>

        {/* Row 5: Tameng #4: CCTV 4K 24 Jam */}
        <Rect
          layout
          direction="column"
          width={374}
          height={86}
          padding={[8, 14]}
          gap={4}
          radius={12}
          fill={PALETTE.emeraldBg}
          stroke={PALETTE.emerald}
          lineWidth={2}
          opacity={row5Opacity}
          scale={row5Scale}
        >
          <Txt
            text="5. Tameng #4: CCTV 4K 24 Jam"
            fontFamily={HEADING_FONT}
            fontSize={19}
            fontWeight={800}
            fill={PALETTE.emerald}
          />
          <Txt
            text="Rekaman 24 jam tanpa titik buta"
            fontFamily={FONTS.body}
            fontSize={18}
            fontWeight={600}
            fill={COLORS.secondaryInk}
          />
        </Rect>

        {/* Row 6: Posisioning: Mind Sport Legal */}
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
            text="6. Status: Mind Sport Legal"
            fontFamily={HEADING_FONT}
            fontSize={19}
            fontWeight={800}
            fill={COLORS.ink}
          />
          <Txt
            text="Izin rekreasi ketangkasan resmi"
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
  // [0.2, 3.3, 11.42, 15.72, 20.12, 24.7, 28.54, 30.34, 38.64, 42.94]
  // =========================================================================

  // Beat 1: 0.2s - "Selain masalah teknis, ada risiko hukum besar mengintai di balik pintu."
  yield* waitUntilSceneTime(0.2);
  yield* all(
    stageOpacity(1, 0.45, easeOutCubic),
    leftPanelScale(1, 0.5, easeOutBack),
    rightColScale(1, 0.5, easeOutBack)
  );

  // Beat 2: 3.3s - "Di Indonesia, batas antara permainan rekreasi dan judi Pasal 303 K-U-H-P sangat tipis."
  yield* waitUntilSceneTime(3.3);
  currentBadgeText('BATAS TIPIS PASAL 303 KUHP');
  currentBadgeColor(PALETTE.crimson);
  currentStampText('ANCAMAN PIDANA 10 TAHUN');
  currentStampBg(PALETTE.crimsonBg);
  yield* all(
    row1Opacity(1, 0.4, easeOutBack),
    row1Scale(1, 0.4, easeOutBack)
  );

  // Beat 3: 11.42s - "Jika ada uang tunai atau cip taruhan di meja, lounge digerebek polisi."
  yield* waitUntilSceneTime(11.42);
  currentStampText('RISIKO PENGGEREBEKAN POLISI');
  currentStampBg(PALETTE.crimsonBg);
  yield* leftPanelScale(1.02, 0.2, easeOutCubic);
  yield* leftPanelScale(1.0, 0.2, easeOutCubic);

  // Beat 4: 15.72s - "Untuk melindungi bisnis, pemilik wajib pasang empat perisai legal yang ketat."
  yield* waitUntilSceneTime(15.72);
  currentBadgeText('4 PERISAI LEGAL WAJIB');
  currentBadgeColor(PALETTE.emerald);
  currentStampText('STATUS: REKREASI OLAHRAGA');
  currentStampBg(PALETTE.emeraldBg);
  yield* all(
    imageSwap(1, 0.5, easeInOutCubic),
    leftPanelScale(1.02, 0.25, easeOutCubic)
  );
  yield* leftPanelScale(1.0, 0.25, easeOutCubic);

  // Beat 5: 20.12s - "Pertama, aturan besi tanpa uang tunai dan tanpa cip fisik di meja."
  yield* waitUntilSceneTime(20.12);
  currentStampText('TAMENG 1: HARAM UANG & CHIP');
  yield* all(
    row2Opacity(1, 0.4, easeOutBack),
    row2Scale(1, 0.4, easeOutBack)
  );

  // Beat 6: 24.7s - "Kedua, pencatatan skor wajib memakai aplikasi digital di ponsel masing-masing."
  yield* waitUntilSceneTime(24.7);
  currentStampText('TAMENG 2: SKOR RESMI DIGITAL');
  yield* all(
    row3Opacity(1, 0.4, easeOutBack),
    row3Scale(1, 0.4, easeOutBack)
  );

  // Beat 7: 28.54s - "Ketiga, sekat ruangan wajib partisi kaca transparan yang terlihat dari luar."
  yield* waitUntilSceneTime(28.54);
  currentStampText('TAMENG 3: PARTISI KACA 100%');
  yield* all(
    row4Opacity(1, 0.4, easeOutBack),
    row4Scale(1, 0.4, easeOutBack)
  );

  // Beat 8: 30.34s - "Keempat, kamera C-C-T-V 24 jam merekam setiap meja tanpa titik buta."
  yield* waitUntilSceneTime(30.34);
  currentStampText('TAMENG 4: CCTV 24 JAM TANPA BLIND SPOT');
  yield* all(
    row5Opacity(1, 0.4, easeOutBack),
    row5Scale(1, 0.4, easeOutBack)
  );

  // Beat 9: 38.64s - "Dengan empat tameng ini, bisnis lo resmi beroperasi sebagai rekreasi legal."
  yield* waitUntilSceneTime(38.64);
  currentBadgeText('STATUS: LEGAL & COMPLIANT');
  currentBadgeColor(PALETTE.emerald);
  currentStampText('HIBURAN KETANGKASAN RESMI');
  currentStampBg(PALETTE.emeraldBg);
  yield* all(
    row6Opacity(1, 0.4, easeOutBack),
    row6Scale(1, 0.4, easeOutBack)
  );

  // Beat 10: 42.94s - "Tanpa kepatuhan ketat, seluruh modal investasi lo bisa lenyap sekejap mata."
  yield* waitUntilSceneTime(42.94);
  currentBadgeText('COMPLIANCE IS NON-NEGOTIABLE');
  currentBadgeColor(PALETTE.crimson);
  currentStampText('MODAL INVESTASI TERLINDUNGI');
  currentStampBg(PALETTE.amberBg);
  yield* leftPanelScale(1.02, 0.2, easeOutCubic);
  yield* leftPanelScale(1.0, 0.2, easeOutCubic);

  // Hold cleanly till scene end
  yield* finishSceneAt(sceneDuration);
});
