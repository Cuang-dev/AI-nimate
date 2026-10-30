import { Img, makeScene2D, Node, Rect, Txt } from '@motion-canvas/2d';
import { all, createSignal, easeInOutCubic, easeOutExpo, useThread } from '@motion-canvas/core';
import { SwissLayout } from './layout';
import { THEME } from './theme';
import { finishSceneAt, focalRotation, focalScale, waitUntilSceneTime } from './timings';

export default makeScene2D(function* (view) {
  view.fill(THEME.colors.bg);
  const time = useThread().time;
  const t0 = time();

  // Active focal element (1 = Tier 1, 2 = Tier 2, 3 = Tier 3, 4 = Kicker)
  const focalId = createSignal(1);

  // Tier 1: active at t = 0s
  const tier1Opacity = createSignal(1.0);
  const tier1Scale = createSignal(1.0);
  const tier1WhtScale = createSignal(1.0);

  // Tier 2: hidden until t = 8.5s
  const tier2Opacity = createSignal(0.0);
  const tier2Scale = createSignal(0.95);
  const tier2LineWidth = createSignal(4);
  const badgeScale = createSignal(1.0);
  const tier2TitleScale = createSignal(1.0);
  const tier2BadgePulse = createSignal(1.0);

  // Tier 3: hidden until t = 23.8s
  const tier3Opacity = createSignal(0.0);
  const tier3Scale = createSignal(0.95);
  const tier3LineWidth = createSignal(4);
  const emblemScale = createSignal(1.0);
  const tier3TitleScale = createSignal(1.0);
  const tier3BadgePulse = createSignal(1.0);

  // Bottom Kicker Pill: hidden until t = 32.2s
  const kickerOpacity = createSignal(0.0);
  const kickerScale = createSignal(0.92);
  const kickerStrokeColor = createSignal<string>(THEME.colors.ink);
  const kickerLineWidth = createSignal(2);

  view.add(
    <Node>
      <SwissLayout figure="06 // 3-TIER PLAYBOOK" />

      {/* Locked Stage Wrapper (zero idle camera wobble) */}
      <Node y={-60}>
        <Rect
          layout
          direction={'column'}
          width={920}
          gap={24}
          alignItems={'center'}
        >
          {/* Focal Element 1: Tier 1 (< $60,000 Portfolio) */}
          <Rect
            layout
            direction={'row'}
            justifyContent={'space-between'}
            alignItems={'center'}
            width={920}
            padding={[26, 32]}
            fill={THEME.colors.surface}
            stroke={THEME.colors.ink}
            lineWidth={3}
            opacity={tier1Opacity}
            scale={() => focalScale(focalId, 1, tier1Scale, time)}
            rotation={() => focalRotation(focalId, 1, time)}
          >
            <Rect layout direction={'column'} gap={8} alignItems={'start'}>
              <Txt
                text={'01 // UNDER $60,000'}
                fontFamily={THEME.fonts.data}
                fontSize={24}
                fontWeight={700}
                fill={THEME.colors.secondaryInk}
                letterSpacing={1.2}
              />
              <Txt
                text={'US STOCKS + W-8BEN'}
                fontFamily={THEME.fonts.heading}
                fontSize={42}
                fontWeight={700}
                fill={THEME.colors.ink}
              />
            </Rect>

            <Rect
              scale={tier1WhtScale}
              layout
              padding={[12, 22]}
              fill={THEME.colors.bg}
              stroke={THEME.colors.ink}
              lineWidth={2}
            >
              <Txt
                text={'15% WHT'}
                fontFamily={THEME.fonts.data}
                fontSize={28}
                fontWeight={700}
                fill={THEME.colors.ink}
              />
            </Rect>
          </Rect>

          {/* Focal Element 2: Tier 2 (> $60,000 Portfolio) */}
          <Rect
            layout
            direction={'column'}
            width={920}
            padding={[26, 32]}
            gap={18}
            fill={THEME.colors.surface}
            stroke={THEME.colors.compliantGreen}
            lineWidth={tier2LineWidth}
            opacity={tier2Opacity}
            scale={() => focalScale(focalId, 2, tier2Scale, time)}
            rotation={() => focalRotation(focalId, 2, time)}
          >
            <Rect layout direction={'row'} gap={20} alignItems={'center'} width={'100%'}>
              <Img
                scale={badgeScale}
                src={'/assets/vid_20261024_001/lse_ucits_badge.png'}
                width={72}
                height={72}
              />
              <Rect layout direction={'column'} gap={6} grow={1}>
                <Txt
                  text={'02 // ABOVE $60,000'}
                  fontFamily={THEME.fonts.data}
                  fontSize={24}
                  fontWeight={700}
                  fill={THEME.colors.compliantGreen}
                  letterSpacing={1.2}
                />
                <Txt
                  scale={tier2TitleScale}
                  text={'IRISH UCITS (CSPX / VWRA)'}
                  fontFamily={THEME.fonts.heading}
                  fontSize={38}
                  fontWeight={700}
                  fill={THEME.colors.ink}
                />
              </Rect>
            </Rect>

            <Rect
              layout
              direction={'row'}
              alignItems={'center'}
              justifyContent={'space-between'}
              padding={[12, 22]}
              fill={THEME.colors.compliantGreen}
              scale={tier2BadgePulse}
            >
              <Txt
                text={'0% ESTATE TAX'}
                fontFamily={THEME.fonts.data}
                fontSize={26}
                fontWeight={700}
                fill={THEME.colors.surface}
              />
              <Txt
                text={'0% DIV DRAG'}
                fontFamily={THEME.fonts.data}
                fontSize={26}
                fontWeight={700}
                fill={THEME.colors.surface}
              />
            </Rect>
          </Rect>

          {/* Focal Element 3: Tier 3 (Cash Dividends) */}
          <Rect
            layout
            direction={'column'}
            width={920}
            padding={[26, 32]}
            gap={18}
            fill={THEME.colors.surface}
            stroke={THEME.colors.ink}
            lineWidth={tier3LineWidth}
            opacity={tier3Opacity}
            scale={() => focalScale(focalId, 3, tier3Scale, time)}
            rotation={() => focalRotation(focalId, 3, time)}
          >
            <Rect layout direction={'row'} gap={20} alignItems={'center'} width={'100%'}>
              <Img
                scale={emblemScale}
                src={'/assets/vid_20261024_001/djp_sbn_emblem.png'}
                width={72}
                height={72}
              />
              <Rect layout direction={'column'} gap={6} grow={1}>
                <Txt
                  text={'03 // CASH DIVIDENDS'}
                  fontFamily={THEME.fonts.data}
                  fontSize={24}
                  fontWeight={700}
                  fill={THEME.colors.secondaryInk}
                  letterSpacing={1.2}
                />
                <Txt
                  scale={tier3TitleScale}
                  text={'SBN BONDS (3-YR LOCK)'}
                  fontFamily={THEME.fonts.heading}
                  fontSize={38}
                  fontWeight={700}
                  fill={THEME.colors.ink}
                />
              </Rect>
            </Rect>

            <Rect
              layout
              direction={'row'}
              alignItems={'center'}
              justifyContent={'space-between'}
              padding={[12, 22]}
              fill={THEME.colors.compliantGreen}
              scale={tier3BadgePulse}
            >
              <Txt
                text={'PMK 18/2021'}
                fontFamily={THEME.fonts.data}
                fontSize={26}
                fontWeight={700}
                fill={THEME.colors.surface}
              />
              <Txt
                text={'0% TAX EXEMPT'}
                fontFamily={THEME.fonts.data}
                fontSize={26}
                fontWeight={700}
                fill={THEME.colors.surface}
              />
            </Rect>
          </Rect>

          {/* Focal Element 4: Bottom Kicker Pill */}
          <Rect
            layout
            direction={'row'}
            alignItems={'center'}
            justifyContent={'center'}
            width={920}
            padding={[20, 36]}
            fill={THEME.colors.ink}
            stroke={kickerStrokeColor}
            lineWidth={kickerLineWidth}
            opacity={kickerOpacity}
            scale={() => focalScale(focalId, 4, kickerScale, time)}
            rotation={() => focalRotation(focalId, 4, time)}
          >
            <Txt
              text={'STRUCTURE PROPERLY. KEEP YOUR GAINS.'}
              fontFamily={THEME.fonts.heading}
              fontSize={34}
              fontWeight={700}
              fill={THEME.colors.surface}
              letterSpacing={1.5}
            />
          </Rect>
        </Rect>
      </Node>
    </Node>
  );

  // t = 0s: Tier 1 already in spotlight

  // t = 5.2s ("with W-8BEN"): pulse 15% WHT pill (0.35s)
  yield* waitUntilSceneTime(5.2, t0);
  yield* tier1WhtScale(1.12, 0.15, easeOutExpo).to(1.0, 0.2, easeInOutCubic);

  // t = 8.5s ("Two: above sixty thousand dollars"):
  // Dim Tier 1 (stops wobbling) & reveal Tier 2 (starts slow wobble)
  yield* waitUntilSceneTime(8.5, t0);
  focalId(2);
  yield* all(
    tier1Opacity(0.35, 0.4),
    tier2Opacity(1.0, 0.45, easeOutExpo),
    tier2Scale(1.0, 0.45, easeOutExpo),
    badgeScale(1.1, 0.15, easeOutExpo).to(1.0, 0.25, easeInOutCubic),
  );

  // t = 12.8s ("CSPX and VWRA"): pulse IRISH UCITS title & badge (0.35s)
  yield* waitUntilSceneTime(12.8, t0);
  yield* all(
    tier2TitleScale(1.08, 0.15, easeOutExpo).to(1.0, 0.2, easeInOutCubic),
    badgeScale(1.08, 0.15, easeOutExpo).to(1.0, 0.2, easeInOutCubic),
  );

  // t = 16.0s ("eliminate the 40% US estate tax"): pulse 0% ESTATE TAX banner (0.35s)
  yield* waitUntilSceneTime(16.0, t0);
  yield* all(
    tier2BadgePulse(1.08, 0.15, easeOutExpo).to(1.0, 0.2, easeInOutCubic),
  );

  // t = 23.8s ("Three: for cash dividends"):
  // Dim Tier 2 (stops wobbling) & reveal Tier 3 (starts slow wobble)
  yield* waitUntilSceneTime(23.8, t0);
  focalId(3);
  yield* all(
    tier2Opacity(0.35, 0.4),
    tier2LineWidth(3, 0.3),
    tier3Opacity(1.0, 0.45, easeOutExpo),
    tier3Scale(1.0, 0.45, easeOutExpo),
    emblemScale(1.1, 0.15, easeOutExpo).to(1.0, 0.25, easeInOutCubic),
  );

  // t = 27.1s ("SBN bonds for three years"): pulse SBN BONDS title & emblem (0.35s)
  yield* waitUntilSceneTime(27.1, t0);
  yield* all(
    tier3TitleScale(1.08, 0.15, easeOutExpo).to(1.0, 0.2, easeInOutCubic),
    emblemScale(1.08, 0.15, easeOutExpo).to(1.0, 0.2, easeInOutCubic),
  );

  // t = 30.6s ("lock in zero percent tax"): pulse on tier 3 outcome banner (0.35s)
  yield* waitUntilSceneTime(30.6, t0);
  yield* all(
    tier3BadgePulse(1.08, 0.15, easeOutExpo).to(1.0, 0.2, easeInOutCubic),
  );

  // t = 32.2s ("Structure properly, and keep your gains"):
  // Restore all 3 tiers (stationary) & focus Kicker Pill
  yield* waitUntilSceneTime(32.2, t0);
  focalId(4);
  yield* all(
    tier1Opacity(0.85, 0.35),
    tier2Opacity(0.9, 0.35),
    tier3Opacity(0.95, 0.35),
    kickerOpacity(1.0, 0.3, easeOutExpo),
    kickerScale(1.05, 0.18, easeOutExpo).to(1.0, 0.25, easeInOutCubic),
    kickerStrokeColor(THEME.colors.compliantGreen, 0.2).to(THEME.colors.ink, 0.4),
    kickerLineWidth(4, 0.2).to(2, 0.4),
  );

  // Hold until beat 6 finishes at exactly 34.42s
  yield* finishSceneAt(34.42, t0);
});
