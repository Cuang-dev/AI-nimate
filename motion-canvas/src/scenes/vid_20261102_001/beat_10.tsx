import { Img, Line, makeScene2D, Node, Rect, Txt } from '@motion-canvas/2d';
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
  const sceneDur = SCENE_TIMINGS[9]?.duration ?? 52.8;

  // Mount editorial stage with beat index 9
  createEditorialStage(view, { section: 9 } as any);

  // Animation signals
  const focalId = createSignal(1);

  // Left card signals
  const leftCardOpacity = createSignal(0);
  const leftCardScale = createSignal(0.92);

  // Right card signals
  const rightCardOpacity = createSignal(0);
  const axesOpacity = createSignal(0);
  const card1Opacity = createSignal(0);
  const card1Y = createSignal(10);
  const card2Opacity = createSignal(0);
  const card2Y = createSignal(10);
  const bannerOpacity = createSignal(0);

  const stage = createRef<Node>();

  view.add(
    <Node ref={stage}>
      {/* LEFT CARD: Delivery Van Model Visual */}
      <Rect
        x={-470}
        y={-25}
        width={720}
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
          fill={PALETTE.feltGreenBg}
          stroke={PALETTE.feltGreen}
          lineWidth={1.5}
        >
          <Txt
            text="MODEL SEWA HARIAN PANGGILAN"
            fontFamily={HEADING_FONT}
            fontSize={18}
            fontWeight={800}
            fill={PALETTE.feltGreen}
          />
        </Rect>

        {/* Hero Image */}
        <Img
          src="/assets/vid_20261102_001/beat10_delivery_van_mahjong.png"
          y={-40}
          width={640}
          height={370}
          radius={12}
        />

        {/* Bottom Callout Box */}
        <Rect
          y={205}
          width={640}
          height={92}
          radius={12}
          fill={PALETTE.mutedBg}
          stroke={PALETTE.cardBorder}
          lineWidth={1.5}
        >
          <Txt
            y={-15}
            text="RENTAL FLEKSIBEL TANPA SEWA RUKO"
            fontFamily={HEADING_FONT}
            fontSize={22}
            fontWeight={800}
            fill={COLORS.ink}
          />
          <Txt
            y={17}
            text="5 Meja Lipat Garasi // Antar Jemput Mobil Pribadi"
            fontFamily={FONTS.body}
            fontSize={18}
            fontWeight={600}
            fill={COLORS.secondaryInk}
          />
        </Rect>
      </Rect>

      {/* RIGHT CARD: Payback & ROI Comparison Chart */}
      <Rect
        x={410}
        y={-25}
        width={880}
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
            text="KOMPARASI MODAL & PERIODE BALIK MODAL"
            fontFamily={HEADING_FONT}
            fontSize={19}
            fontWeight={800}
            fill={PALETTE.feltGreen}
          />
        </Rect>

        {/* Chart Axes & Background Gridlines */}
        <Node opacity={axesOpacity}>
          {/* Dashed Gridlines */}
          <Line
            points={[
              [-370, -80],
              [380, -80],
            ]}
            stroke={COLORS.gridLine}
            lineWidth={1.5}
            lineDash={[6, 6]}
          />
          <Line
            points={[
              [-370, 40],
              [380, 40],
            ]}
            stroke={COLORS.gridLine}
            lineWidth={1.5}
            lineDash={[6, 6]}
          />

          {/* Mandatory Y-Axis and X-Axis lines with endArrow */}
          <Line
            points={[
              [-370, 150],
              [-370, -200],
            ]}
            stroke={COLORS.ink}
            lineWidth={3}
            endArrow
          />
          <Line
            points={[
              [-370, 150],
              [390, 150],
            ]}
            stroke={COLORS.ink}
            lineWidth={3}
            endArrow
          />
        </Node>

        {/* Card 1: Lounge Ruko */}
        <Rect
          x={-170}
          y={card1Y}
          width={340}
          height={290}
          radius={12}
          fill={'#FFFFFF'}
          stroke={PALETTE.cardBorder}
          lineWidth={2}
          opacity={card1Opacity}
        >
          <Txt
            y={-95}
            text="LOUNGE RUKO (8 MEJA)"
            fontFamily={HEADING_FONT}
            fontSize={19}
            fontWeight={800}
            fill={COLORS.ink}
          />
          <Txt
            y={-40}
            text="Modal Awal: Rp350 Juta"
            fontFamily={FONTS.body}
            fontSize={18}
            fontWeight={600}
            fill={COLORS.secondaryInk}
          />
          <Txt
            y={20}
            text="Balik Modal: 20 Bulan"
            fontFamily={HEADING_FONT}
            fontSize={21}
            fontWeight={800}
            fill={PALETTE.crimson}
          />
          <Txt
            y={80}
            text="Beban Sewa & Opex Tinggi"
            fontFamily={FONTS.body}
            fontSize={18}
            fontWeight={600}
            fill={PALETTE.muted}
          />
        </Rect>

        {/* Card 2: Sewa Harian */}
        <Rect
          x={200}
          y={card2Y}
          width={340}
          height={290}
          radius={12}
          fill={'#FFFFFF'}
          stroke={PALETTE.feltGreen}
          lineWidth={2.5}
          opacity={card2Opacity}
        >
          <Txt
            y={-95}
            text="SEWA HARIAN GARASI"
            fontFamily={HEADING_FONT}
            fontSize={19}
            fontWeight={800}
            fill={PALETTE.feltGreen}
          />
          <Txt
            y={-40}
            text="Modal Awal: Rp60 Juta"
            fontFamily={FONTS.body}
            fontSize={18}
            fontWeight={600}
            fill={COLORS.secondaryInk}
          />
          <Txt
            y={20}
            text="Balik Modal: 8 Bulan!"
            fontFamily={HEADING_FONT}
            fontSize={22}
            fontWeight={800}
            fill={PALETTE.feltGreen}
          />
          <Txt
            y={80}
            text="Tarif Rp400Rb (Imlek Rp1,5Jt)"
            fontFamily={FONTS.body}
            fontSize={18}
            fontWeight={700}
            fill={PALETTE.amber}
          />
        </Rect>

        {/* Bottom Callout Banner */}
        <Rect
          y={215}
          width={780}
          height={68}
          radius={10}
          fill={PALETTE.feltGreenBg}
          stroke={PALETTE.feltGreen}
          lineWidth={1.5}
          opacity={bannerOpacity}
        >
          <Txt
            text="EFISIENSI MODAL: BALIK MODAL 2,5X LEBIH CEPAT!"
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
    rightCardOpacity(1, 0.5, easeOutExpo),
    axesOpacity(1, 0.6, easeOutExpo)
  );

  // Card 1 reveal at ~8.0s ("Opsi pertama adalah membuka lounge ruko fisik... modal 350 juta... 20 bulan...")
  yield* waitUntilSceneTime(8.0, t0);
  focalId(2);
  yield* all(
    card1Opacity(1, 0.6, easeOutExpo),
    card1Y(-25, 0.6, easeOutBack)
  );

  // Card 2 reveal at ~24.0s ("Tapi ada opsi kedua... sewa meja mahjong lipat panggilan harian... modal 55-60 juta...")
  yield* waitUntilSceneTime(24.0, t0);
  focalId(3);
  yield* all(
    card2Opacity(1, 0.6, easeOutExpo),
    card2Y(-25, 0.6, easeOutBack)
  );

  // Banner reveal at ~40.0s ("musim libur Imlek melonjak... balik modal cuma 8 bulan...")
  yield* waitUntilSceneTime(40.0, t0);
  focalId(4);
  yield* bannerOpacity(1, 0.6, easeOutExpo);

  // Finish scene at 52.80s
  yield* finishSceneAt(sceneDur, t0);
});
