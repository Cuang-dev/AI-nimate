import { Img, makeScene2D, Node, Rect, Txt } from '@motion-canvas/2d';
import { all, createSignal, easeInOutCubic, easeOutExpo, useThread } from '@motion-canvas/core';
import { SwissLayout } from './layout';
import { THEME } from './theme';
import { finishSceneAt, focalRotation, focalScale, waitUntilSceneTime } from './timings';

export default makeScene2D(function* (view) {
  view.fill(THEME.colors.bg);
  const time = useThread().time;
  const t0 = time();

  // Active focal element (1 = CFC Shell Card, 2 = CRS Card, 3 = 200% Penalty Pill)
  const focalId = createSignal(1);

  // Card 1: starts active in spotlight
  const card1Opacity = createSignal(1.0);
  const card1Scale = createSignal(1.0);
  const gaugeFillWidth = createSignal(0);
  const cfcBadgeScale = createSignal(1.0);
  const deemedDividendOpacity = createSignal(0.0);
  const deemedDividendPulse = createSignal(0.95);

  // CRS Card: hidden until t = 16.1s
  const crsCardOpacity = createSignal(0.0);
  const crsCardScale = createSignal(0.95);
  const crsBadgeScale = createSignal(1.0);
  const countriesScale = createSignal(1.0);
  const dataStreamScale = createSignal(1.0);

  // Warning Pill: hidden until t = 28.7s
  const warningOpacity = createSignal(0.0);
  const warningScale = createSignal(0.92);

  view.add(
    <Node>
      <SwissLayout figure="05 // CFC & CRS SURVEILLANCE" />

      {/* Locked Stage Wrapper (zero idle camera wobble) */}
      <Node y={-60}>
        <Rect
          layout
          direction={'column'}
          width={920}
          gap={28}
          alignItems={'center'}
        >
          {/* Focal Element 1: Singapore SPV / BVI Shell // PMK 93/2019 CFC Rule */}
          <Rect
            layout
            direction={'column'}
            width={920}
            padding={[28, 36]}
            gap={20}
            fill={THEME.colors.surface}
            stroke={THEME.colors.ink}
            lineWidth={3}
            opacity={card1Opacity}
            scale={() => focalScale(focalId, 1, card1Scale, time)}
            rotation={() => focalRotation(focalId, 1, time)}
          >
            <Rect
              layout
              direction={'row'}
              width={'100%'}
              justifyContent={'space-between'}
              alignItems={'center'}
            >
              <Txt
                text={'SG / BVI SHELL'}
                fontFamily={THEME.fonts.heading}
                fontSize={46}
                fontWeight={700}
                fill={THEME.colors.ink}
              />
              <Rect scale={cfcBadgeScale} layout padding={[8, 18]} fill={THEME.colors.accent}>
                <Txt
                  text={'CFC RULE'}
                  fontFamily={THEME.fonts.data}
                  fontSize={24}
                  fontWeight={700}
                  fill={THEME.colors.surface}
                  letterSpacing={1.0}
                />
              </Rect>
            </Rect>

            {/* Control Gauge Row */}
            <Rect
              layout
              direction={'column'}
              gap={12}
              width={'100%'}
            >
              <Rect
                layout
                direction={'row'}
                justifyContent={'space-between'}
                width={'100%'}
              >
                <Txt
                  text={'≥ 50% CONTROL'}
                  fontFamily={THEME.fonts.data}
                  fontSize={26}
                  fontWeight={700}
                  fill={THEME.colors.ink}
                />
                <Txt
                  text={'PMK 93/2019'}
                  fontFamily={THEME.fonts.data}
                  fontSize={24}
                  fontWeight={600}
                  fill={THEME.colors.secondaryInk}
                />
              </Rect>
              <Rect
                width={'100%'}
                height={20}
                fill={THEME.colors.gridLine}
              >
                <Rect
                  height={20}
                  width={gaugeFillWidth}
                  fill={THEME.colors.accent}
                />
              </Rect>
            </Rect>

            {/* Deemed Dividend Alert Banner */}
            <Rect
              layout
              direction={'row'}
              alignItems={'center'}
              justifyContent={'space-between'}
              padding={[14, 24]}
              fill={THEME.colors.ink}
              opacity={deemedDividendOpacity}
              scale={deemedDividendPulse}
            >
              <Txt
                text={'DEEMED DIVIDENDS'}
                fontFamily={THEME.fonts.data}
                fontSize={26}
                fontWeight={700}
                fill={THEME.colors.surface}
              />
              <Txt
                text={'UP TO 35% TAX'}
                fontFamily={THEME.fonts.data}
                fontSize={28}
                fontWeight={700}
                fill={THEME.colors.accent}
              />
            </Rect>
          </Rect>

          {/* Focal Element 2: CRS Surveillance Card */}
          <Rect
            layout
            direction={'column'}
            width={920}
            padding={[28, 36]}
            gap={20}
            fill={THEME.colors.surface}
            stroke={THEME.colors.ink}
            lineWidth={3}
            opacity={crsCardOpacity}
            scale={() => focalScale(focalId, 2, crsCardScale, time)}
            rotation={() => focalRotation(focalId, 2, time)}
          >
            <Rect
              layout
              direction={'row'}
              gap={28}
              alignItems={'center'}
              width={'100%'}
            >
              <Img
                scale={crsBadgeScale}
                src={'/assets/vid_20261024_001/crs_globe_node.png'}
                width={72}
                height={72}
              />
              <Rect layout direction={'column'} gap={8} grow={1}>
                <Txt
                  text={'CRS AUTO-REPORT'}
                  fontFamily={THEME.fonts.data}
                  fontSize={24}
                  fontWeight={700}
                  fill={THEME.colors.accent}
                  letterSpacing={1.2}
                />
                <Txt
                  scale={countriesScale}
                  text={'100+ COUNTRIES'}
                  fontFamily={THEME.fonts.heading}
                  fontSize={46}
                  fontWeight={700}
                  fill={THEME.colors.ink}
                />
                <Txt
                  text={'SG • CH • HK'}
                  fontFamily={THEME.fonts.data}
                  fontSize={26}
                  fontWeight={700}
                  fill={THEME.colors.secondaryInk}
                />
              </Rect>
            </Rect>

            {/* Data Stream Banner */}
            <Rect
              layout
              direction={'row'}
              alignItems={'center'}
              justifyContent={'space-between'}
              padding={[14, 24]}
              fill={THEME.colors.bg}
              stroke={THEME.colors.ink}
              lineWidth={2}
              scale={dataStreamScale}
            >
              <Txt
                text={'BALANCES -> DJP'}
                fontFamily={THEME.fonts.data}
                fontSize={26}
                fontWeight={700}
                fill={THEME.colors.ink}
              />
              <Txt
                text={'EVERY SEPT'}
                fontFamily={THEME.fonts.data}
                fontSize={26}
                fontWeight={700}
                fill={THEME.colors.accent}
              />
            </Rect>
          </Rect>

          {/* Focal Element 3: Unreported Asset Penalty Pill */}
          <Rect
            layout
            direction={'row'}
            alignItems={'center'}
            justifyContent={'center'}
            width={920}
            padding={[20, 36]}
            fill={THEME.colors.accent}
            opacity={warningOpacity}
            scale={() => focalScale(focalId, 3, warningScale, time)}
            rotation={() => focalRotation(focalId, 3, time)}
          >
            <Txt
              text={'UP TO 200% PENALTY'}
              fontFamily={THEME.fonts.heading}
              fontSize={42}
              fontWeight={700}
              fill={THEME.colors.surface}
              letterSpacing={1.5}
            />
          </Rect>
        </Rect>
      </Node>
    </Node>
  );

  // Intermediate micro-choreography at t = 2.6s: pulse CFC RULE badge (scale: 1.0 -> 1.12 -> 1.0)
  yield* waitUntilSceneTime(2.6, t0);
  yield* cfcBadgeScale(1.12, 0.15, easeOutExpo).to(1.0, 0.2, easeInOutCubic);

  // t = 5.3s ("Under PMK 93 2019, controlled foreign corporation rules"):
  // Animate gauge fill and pulse CFC RULE badge (0.35s)
  yield* waitUntilSceneTime(5.3, t0);
  yield* all(
    gaugeFillWidth(580, 1.2, easeOutExpo),
    cfcBadgeScale(1.12, 0.15, easeOutExpo).to(1.0, 0.2, easeInOutCubic),
  );

  // Intermediate micro-choreography at t = 9.2s: pulse CFC RULE badge (scale: 1.0 -> 1.12 -> 1.0)
  yield* waitUntilSceneTime(9.2, t0);
  yield* cfcBadgeScale(1.12, 0.15, easeOutExpo).to(1.0, 0.2, easeInOutCubic);

  // t = 12.6s ("deemed dividends"): Reveal/pulse the DEEMED DIVIDENDS banner (0.4s)
  yield* waitUntilSceneTime(12.6, t0);
  yield* all(
    deemedDividendOpacity(1.0, 0.2, easeOutExpo),
    deemedDividendPulse(1.08, 0.16, easeOutExpo).to(1.0, 0.24, easeInOutCubic),
  );

  // t = 16.1s ("Worse, bank secrecy is dead. Under the CRS global agreement"):
  // Dim Card 1 (stops wobbling) & reveal CRS Card (starts slow wobble)
  yield* waitUntilSceneTime(16.1, t0);
  focalId(2);
  yield* all(
    card1Opacity(0.35, 0.4),
    crsCardOpacity(1.0, 0.45, easeOutExpo),
    crsCardScale(1.0, 0.45, easeOutExpo),
    crsBadgeScale(1.1, 0.15, easeOutExpo).to(1.0, 0.25, easeInOutCubic),
  );

  // t = 19.7s ("over 100 countries, including Singapore and Switzerland"):
  // Pulse the 100+ COUNTRIES row (0.35s)
  yield* waitUntilSceneTime(19.7, t0);
  yield* countriesScale(1.1, 0.15, easeOutExpo).to(1.0, 0.2, easeInOutCubic);

  // Intermediate micro-choreography at t = 22.4s: pulse CRS globe badge (scale: 1.0 -> 1.12 -> 1.0)
  yield* waitUntilSceneTime(22.4, t0);
  yield* crsBadgeScale(1.12, 0.15, easeOutExpo).to(1.0, 0.2, easeInOutCubic);

  // t = 25.2s ("DJP every September"): pulse BALANCES -> DJP // EVERY SEPT banner (0.35s)
  yield* waitUntilSceneTime(25.2, t0);
  yield* all(
    dataStreamScale(1.08, 0.15, easeOutExpo).to(1.0, 0.2, easeInOutCubic),
  );

  // t = 28.7s ("penalties up to 200%"): focus bottom warning pill
  yield* waitUntilSceneTime(28.7, t0);
  focalId(3);
  yield* all(
    crsCardOpacity(0.45, 0.35),
    warningOpacity(1.0, 0.3, easeOutExpo),
    warningScale(1.06, 0.15, easeOutExpo).to(1.0, 0.25, easeInOutCubic),
  );

  // Hold until beat 5 finishes at exactly 31.58s
  yield* finishSceneAt(31.58, t0);
});
