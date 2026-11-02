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
  const sceneDur = SCENE_TIMINGS[7]?.duration ?? 53.42;

  // Mount editorial stage with beat index 7
  createEditorialStage(view, { section: 7 } as any);

  // Animation signals
  const focalId = createSignal(1);

  // Left card signals
  const leftCardOpacity = createSignal(0);
  const leftCardScale = createSignal(0.92);

  // Right card tier signals
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
      {/* LEFT CARD: Hardware Failure Visual */}
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
            text="RISIKO TEKNIS MEJA OTOMATIS"
            fontFamily={HEADING_FONT}
            fontSize={18}
            fontWeight={800}
            fill={PALETTE.crimson}
          />
        </Rect>

        {/* Hero Image */}
        <Img
          src="/assets/vid_20261102_001/beat08_spilled_boba_gear_jam.png"
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
            text="KERAPUHAN PERANGKAT KERAS"
            fontFamily={HEADING_FONT}
            fontSize={22}
            fontWeight={800}
            fill={COLORS.ink}
          />
          <Txt
            y={17}
            text="Sensor optik & motor pengocok macet total"
            fontFamily={FONTS.body}
            fontSize={18}
            fontWeight={600}
            fill={COLORS.secondaryInk}
          />
        </Rect>
      </Rect>

      {/* RIGHT CARD: 3-Tier Failure Stack */}
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
            text="3 TITIK KEGAGALAN HARDWARE"
            fontFamily={HEADING_FONT}
            fontSize={19}
            fontWeight={800}
            fill={PALETTE.feltGreen}
          />
        </Rect>

        {/* TIER 1: Boba & Sweet Drinks */}
        <Rect
          y={tier1Y}
          width={760}
          height={104}
          radius={12}
          fill={'#FFFFFF'}
          stroke={PALETTE.cardBorder}
          lineWidth={2}
          opacity={tier1Opacity}
        >
          <Rect x={-372} width={8} height={104} fill={PALETTE.crimson} radius={[12, 0, 0, 12]} />
          <Txt
            x={-16}
            y={-17}
            text="#1 TUMPAHAN BOBA & ES TEH"
            fontFamily={HEADING_FONT}
            fontSize={21}
            fontWeight={800}
            fill={COLORS.ink}
          />
          <Txt
            x={-16}
            y={16}
            text="Sensor Optik & Sabuk Magnetik Lengket (Servis Rp1,5 Jt)"
            fontFamily={FONTS.body}
            fontSize={18}
            fontWeight={600}
            fill={PALETTE.crimson}
          />
        </Rect>

        {/* TIER 2: Missing Tile */}
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
          <Rect x={-372} width={8} height={104} fill={PALETTE.amber} radius={[12, 0, 0, 12]} />
          <Txt
            x={-16}
            y={-17}
            text="#2 1 BATU MAGNET HILANG = CACAT"
            fontFamily={HEADING_FONT}
            fontSize={21}
            fontWeight={800}
            fill={COLORS.ink}
          />
          <Txt
            x={-16}
            y={16}
            text="Kalibrasi 144 Batu Terkunci (Ganti 1 Set Rp2,5 Jt)"
            fontFamily={FONTS.body}
            fontSize={18}
            fontWeight={600}
            fill={COLORS.secondaryInk}
          />
        </Rect>

        {/* TIER 3: Weekend Breakdown */}
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
          <Rect x={-372} width={8} height={104} fill={PALETTE.crimson} radius={[12, 0, 0, 12]} />
          <Txt
            x={-16}
            y={-17}
            text="#3 MEJA MATI SAAT MALAM MINGGU"
            fontFamily={HEADING_FONT}
            fontSize={21}
            fontWeight={800}
            fill={COLORS.ink}
          />
          <Txt
            x={-16}
            y={16}
            text="Kehilangan Omzet VIP Rp750.000 / Malam Saat Peak Hour"
            fontFamily={FONTS.body}
            fontSize={18}
            fontWeight={600}
            fill={PALETTE.crimson}
          />
        </Rect>

        {/* Bottom Alert Banner */}
        <Rect
          y={215}
          width={760}
          height={68}
          radius={10}
          fill={PALETTE.crimsonBg}
          stroke={PALETTE.crimson}
          lineWidth={1.5}
          opacity={bannerOpacity}
        >
          <Txt
            text="144 BATU LUMPUH TOTAL SAMPAI SUKU CADANG TIBA"
            fontFamily={HEADING_FONT}
            fontSize={18}
            fontWeight={800}
            fill={PALETTE.crimson}
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

  // Tier 1 reveal at ~12.5s ("menyenggol gelas es teh manis atau boba...")
  yield* waitUntilSceneTime(12.5, t0);
  focalId(2);
  yield* all(
    tier1Opacity(1, 0.6, easeOutExpo),
    tier1Y(-165, 0.6, easeOutBack)
  );

  // Tier 2 reveal at ~28.0s ("sindrom satu batu hilang...")
  yield* waitUntilSceneTime(28.0, t0);
  focalId(3);
  yield* all(
    tier2Opacity(1, 0.6, easeOutExpo),
    tier2Y(-35, 0.6, easeOutBack)
  );

  // Tier 3 reveal at ~41.5s ("lo tidak bisa menggantinya...")
  yield* waitUntilSceneTime(41.5, t0);
  focalId(4);
  yield* all(
    tier3Opacity(1, 0.6, easeOutExpo),
    tier3Y(95, 0.6, easeOutBack),
    bannerOpacity(1, 0.5, easeOutExpo)
  );

  // Finish scene at 53.42s
  yield* finishSceneAt(sceneDur, t0);
});
