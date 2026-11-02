import { Img, makeScene2D, Node, Rect, Txt } from '@motion-canvas/2d';
import {
  all,
  createRef,
  createSignal,
  easeOutBack,
  easeOutExpo,
  useThread,
} from '@motion-canvas/core';
import {
  COLORS,
  createEditorialStage,
  FONTS,
  HEADING_FONT,
  PALETTE,
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
  const sceneDur = SCENE_TIMINGS[8]?.duration ?? 58.38;

  // Mount editorial stage with beat index 8
  createEditorialStage(view, { section: 8 } as any);

  // Animation signals
  const focalId = createSignal(1);

  // Left card signals
  const leftCardOpacity = createSignal(0);
  const leftCardScale = createSignal(0.92);

  // Right card matrix signals
  const rightCardOpacity = createSignal(0);
  const tier1Opacity = createSignal(0);
  const tier1Y = createSignal(-140);
  const tier2Opacity = createSignal(0);
  const tier2Y = createSignal(-10);
  const tier3Opacity = createSignal(0);
  const tier3Y = createSignal(120);
  const bannerOpacity = createSignal(0);

  const stage = createRef<Node>();

  view.add(
    <Node ref={stage}>
      {/* LEFT CARD: Legal Compliance Shield Visual */}
      <Rect
        x={-450}
        y={-25}
        width={760}
        height={650}
        radius={16}
        fill={COLORS.surface}
        stroke={PALETTE.cardBorder}
        lineWidth={2}
        opacity={leftCardOpacity}
        scale={() => focalScale(focalId, 1, () => leftCardScale(), time)}
        rotation={() => focalRotation(focalId, 1, time)}
      >
        {/* Top Brow Category Badge */}
        <Rect
          y={-275}
          layout={true}
          padding={[8, 24]}
          alignItems={'center'}
          justifyContent={'center'}
          radius={8}
          fill={PALETTE.crimsonBg}
          stroke={PALETTE.crimson}
          lineWidth={1.5}
        >
          <Txt
            text="KEPATUHAN REGULASI & PERIZINAN"
            fontFamily={HEADING_FONT}
            fontSize={18}
            fontWeight={800}
            fill={PALETTE.crimson}
          />
        </Rect>

        {/* Hero Image */}
        <Img
          src="/assets/vid_20261102_001/beat09_cctv_legal_shield.png"
          y={-40}
          width={680}
          height={370}
          radius={12}
        />

        {/* Bottom Callout Box */}
        <Rect
          y={205}
          width={680}
          height={92}
          radius={12}
          fill={PALETTE.mutedBg}
          stroke={PALETTE.cardBorder}
          lineWidth={1.5}
        >
          <Txt
            y={-15}
            text="PERISAI HUKUM LOUNGE LEGAL"
            fontFamily={HEADING_FONT}
            fontSize={22}
            fontWeight={800}
            fill={COLORS.ink}
          />
          <Txt
            y={17}
            text="Wadah Olahraga Ketangkasan Rekreasi Bebas Taruhan"
            fontFamily={FONTS.body}
            fontSize={18}
            fontWeight={600}
            fill={COLORS.secondaryInk}
          />
        </Rect>
      </Rect>

      {/* RIGHT CARD: Legal Boundary Matrix */}
      <Rect
        x={420}
        y={-25}
        width={840}
        height={650}
        radius={16}
        fill={COLORS.surface}
        stroke={PALETTE.cardBorder}
        lineWidth={2}
        opacity={rightCardOpacity}
      >
        {/* Header Brow */}
        <Rect
          y={-275}
          layout={true}
          padding={[8, 24]}
          alignItems={'center'}
          justifyContent={'center'}
          radius={8}
          fill={PALETTE.feltGreenBg}
          stroke={PALETTE.feltGreen}
          lineWidth={1.5}
        >
          <Txt
            text="BATASAN PASAL 303 KUHP VS OLAHRAGA"
            fontFamily={HEADING_FONT}
            fontSize={19}
            fontWeight={800}
            fill={PALETTE.feltGreen}
          />
        </Rect>

        {/* TIER 1: Red Alert Zone */}
        <Rect
          y={tier1Y}
          width={760}
          height={104}
          radius={12}
          fill={'#FFFFFF'}
          stroke={PALETTE.crimson}
          lineWidth={2}
          opacity={tier1Opacity}
        >
          <Rect x={-372} width={8} height={104} fill={PALETTE.crimson} radius={[12, 0, 0, 12]} />
          <Txt
            x={-16}
            y={-17}
            text="ZONA MERAH: PASAL 303 KUHP (ILEGAL)"
            fontFamily={HEADING_FONT}
            fontSize={21}
            fontWeight={800}
            fill={PALETTE.crimson}
          />
          <Txt
            x={-16}
            y={16}
            text="Uang Tunai, Koin Chip, atau Potongan Bandar di Meja"
            fontFamily={FONTS.body}
            fontSize={18}
            fontWeight={600}
            fill={PALETTE.crimson}
          />
        </Rect>

        {/* TIER 2: SOP #1 Digital Scorecard */}
        <Rect
          y={tier2Y}
          width={760}
          height={104}
          radius={12}
          fill={'#FFFFFF'}
          stroke={PALETTE.cardBorder}
          lineWidth={2}
          opacity={tier2Opacity}
        >
          <Rect x={-372} width={8} height={104} fill={PALETTE.feltGreen} radius={[12, 0, 0, 12]} />
          <Txt
            x={-16}
            y={-17}
            text="SOP WAJIB #1: 100% SKOR DIGITAL"
            fontFamily={HEADING_FONT}
            fontSize={21}
            fontWeight={800}
            fill={COLORS.ink}
          />
          <Txt
            x={-16}
            y={16}
            text="Pencatatan Poin via Aplikasi Turnamen / Lembar Skor"
            fontFamily={FONTS.body}
            fontSize={18}
            fontWeight={600}
            fill={COLORS.secondaryInk}
          />
        </Rect>

        {/* TIER 3: SOP #2 Glass Door & CCTV */}
        <Rect
          y={tier3Y}
          width={760}
          height={104}
          radius={12}
          fill={'#FFFFFF'}
          stroke={PALETTE.cardBorder}
          lineWidth={2}
          opacity={tier3Opacity}
        >
          <Rect x={-372} width={8} height={104} fill={PALETTE.feltGreen} radius={[12, 0, 0, 12]} />
          <Txt
            x={-16}
            y={-17}
            text="SOP WAJIB #2: PINTU KACA & CCTV 24 JAM"
            fontFamily={HEADING_FONT}
            fontSize={21}
            fontWeight={800}
            fill={COLORS.ink}
          />
          <Txt
            x={-16}
            y={16}
            text="Ruang Transparan & Kamera Audio Aktif Rekam Pembuktian"
            fontFamily={FONTS.body}
            fontSize={18}
            fontWeight={600}
            fill={COLORS.secondaryInk}
          />
        </Rect>

        {/* Bottom Banner */}
        <Rect
          y={215}
          width={760}
          height={68}
          radius={10}
          fill={PALETTE.feltGreenBg}
          stroke={PALETTE.feltGreen}
          lineWidth={1.5}
          opacity={bannerOpacity}
        >
          <Txt
            text="PERISAI LENGKAP: BUKTI SAH WADAH OLAHRAGA REKREASI"
            fontFamily={HEADING_FONT}
            fontSize={18}
            fontWeight={800}
            fill={PALETTE.feltGreen}
          />
        </Rect>
      </Rect>
    </Node>
  );

  // Reveal Choreography (Synced strictly LTR and TTB to audio speech)
  yield* waitUntilSceneTime(0.8, t0);
  yield* all(
    leftCardOpacity(1, 0.7, easeOutExpo),
    leftCardScale(1, 0.7, easeOutBack),
    rightCardOpacity(1, 0.5, easeOutExpo)
  );

  // Tier 1 reveal at ~10.0s ("Pasal 303 KUHP... uang tunai di atas meja atau koin taruhan...")
  yield* waitUntilSceneTime(10.0, t0);
  focalId(2);
  yield* all(
    tier1Opacity(1, 0.6, easeOutExpo),
    tier1Y(-165, 0.6, easeOutBack)
  );

  // Tier 2 reveal at ~31.0s ("aturan besi tanpa kompromi... lembar skor olahraga...")
  yield* waitUntilSceneTime(31.0, t0);
  focalId(3);
  yield* all(
    tier2Opacity(1, 0.6, easeOutExpo),
    tier2Y(-35, 0.6, easeOutBack)
  );

  // Tier 3 reveal at ~44.0s ("semua pintu memakai kaca bening... kamera pengawas 24 jam...")
  yield* waitUntilSceneTime(44.0, t0);
  focalId(4);
  yield* all(
    tier3Opacity(1, 0.6, easeOutExpo),
    tier3Y(95, 0.6, easeOutBack),
    bannerOpacity(1, 0.5, easeOutExpo)
  );

  // Finish scene at 58.38s
  yield* finishSceneAt(sceneDur, t0);
});
