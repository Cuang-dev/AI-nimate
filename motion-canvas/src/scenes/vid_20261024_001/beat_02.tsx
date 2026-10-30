import { Img, makeScene2D, Node, Rect, Txt } from '@motion-canvas/2d';
import { all, createSignal, easeInOutCubic, easeOutExpo, useThread } from '@motion-canvas/core';
import { SwissLayout } from './layout';
import { THEME } from './theme';
import { finishSceneAt, focalRotation, focalScale, waitUntilSceneTime } from './timings';

export default makeScene2D(function* (view) {
  const time = useThread().time;
  const t0 = time();
  view.fill(THEME.colors.bg);

  // Active focal element (1 = W-8BEN Card, 2 = Estate Tax Card, 3 = No Treaty Pill)
  const focalId = createSignal(1);

  // Card 1 Signals (W-8BEN / Dividend Withholding)
  const card1Opacity = createSignal(1.0);
  const card1Scale = createSignal(1.0);
  const w8benBarWidth = createSignal(780);
  const w8benRateText = createSignal('30% DEFAULT');
  const w8benRateColor = createSignal<string>(THEME.colors.accent);
  const w8benTagText = createSignal('W-8BEN');
  const w8benTagBg = createSignal<string>(THEME.colors.ink);
  const w8benBadgeScale = createSignal(1.0);

  // Card 2 Signals (US Estate Tax Trap — hidden until t = 14.7s)
  const card2Opacity = createSignal(0.0);
  const card2Scale = createSignal(0.95);
  const card2BorderColor = createSignal<string>(THEME.colors.ink);
  const card2BorderWidth = createSignal(3);
  const card2AlertScale = createSignal(1.0);
  const estateBarWidth = createSignal(120);
  const estateTaxRateText = createSignal('0% UNDER $60K');
  const estateTaxRateColor = createSignal<string>(THEME.colors.compliantGreen);

  // Bottom Treaty Alert Pill (hidden until t = 26.2s)
  const treatyPillOpacity = createSignal(0.0);
  const treatyPillScale = createSignal(0.92);

  view.add(
    <Node>
      <SwissLayout figure="02 // US ESTATE TAX" />

      {/* Locked Stage Wrapper (zero idle camera wobble) */}
      <Node y={-60}>
        <Rect
          layout
          direction={'column'}
          width={920}
          gap={28}
          alignItems={'center'}
        >
          {/* Focal Element 1: US Dividends & Form W-8BEN */}
          <Rect
            layout
            direction={'column'}
            width={920}
            padding={[28, 34]}
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
              justifyContent={'space-between'}
              alignItems={'center'}
              width={'100%'}
            >
              <Rect layout direction={'row'} alignItems={'center'} gap={14}>
                <Img
                  src={'/assets/vid_20261024_001/ibkr_gotrade_badges.png'}
                  width={140}
                  height={70}
                />
                <Txt
                  text={'US DIVIDENDS'}
                  fontFamily={THEME.fonts.heading}
                  fontSize={38}
                  fontWeight={700}
                  fill={THEME.colors.ink}
                />
              </Rect>

              <Rect
                layout
                padding={[8, 18]}
                fill={w8benTagBg}
                scale={w8benBadgeScale}
              >
                <Txt
                  text={w8benTagText}
                  fontFamily={THEME.fonts.data}
                  fontSize={26}
                  fontWeight={700}
                  fill={'#FFFFFF'}
                  letterSpacing={1.0}
                />
              </Rect>
            </Rect>

            <Rect
              layout
              direction={'row'}
              justifyContent={'space-between'}
              alignItems={'baseline'}
              width={'100%'}
            >
              <Txt
                text={'WITHHOLDING'}
                fontFamily={THEME.fonts.data}
                fontSize={24}
                fontWeight={700}
                fill={THEME.colors.secondaryInk}
                letterSpacing={1.2}
              />
              <Txt
                text={w8benRateText}
                fontFamily={THEME.fonts.heading}
                fontSize={48}
                fontWeight={700}
                fill={w8benRateColor}
              />
            </Rect>

            <Rect
              layout
              width={'100%'}
              height={24}
              fill={THEME.colors.gridLine}
              alignItems={'start'}
            >
              <Rect
                width={w8benBarWidth}
                height={24}
                fill={w8benRateColor}
              />
            </Rect>
          </Rect>

          {/* Focal Element 2: US Estate Tax Trap */}
          <Rect
            layout
            direction={'column'}
            width={920}
            padding={[28, 34]}
            gap={20}
            fill={THEME.colors.surface}
            stroke={card2BorderColor}
            lineWidth={card2BorderWidth}
            opacity={card2Opacity}
            scale={() => focalScale(focalId, 2, card2Scale, time)}
            rotation={() => focalRotation(focalId, 2, time)}
          >
            <Rect
              layout
              direction={'row'}
              justifyContent={'space-between'}
              alignItems={'center'}
              width={'100%'}
            >
              <Rect layout direction={'row'} alignItems={'center'} gap={16}>
                <Img
                  src={'/assets/vid_20261024_001/irs_eagle_badge.png'}
                  width={72}
                  height={72}
                />
                <Rect layout direction={'column'} gap={6} alignItems={'start'}>
                  <Txt
                    text={'US ESTATE TAX'}
                    fontFamily={THEME.fonts.heading}
                    fontSize={46}
                    fontWeight={700}
                    fill={THEME.colors.ink}
                  />
                  <Txt
                    text={'$60,000 CAP'}
                    fontFamily={THEME.fonts.data}
                    fontSize={28}
                    fontWeight={700}
                    fill={THEME.colors.secondaryInk}
                  />
                </Rect>
              </Rect>
            </Rect>

            <Rect
              layout
              direction={'row'}
              justifyContent={'space-between'}
              alignItems={'baseline'}
              width={'100%'}
            >
              <Txt
                text={estateTaxRateText}
                fontFamily={THEME.fonts.heading}
                fontSize={44}
                fontWeight={700}
                fill={estateTaxRateColor}
                scale={card2AlertScale}
              />
            </Rect>

            <Rect
              layout
              width={'100%'}
              height={26}
              fill={THEME.colors.gridLine}
              alignItems={'start'}
            >
              <Rect
                width={estateBarWidth}
                height={26}
                fill={estateTaxRateColor}
              />
            </Rect>

            <Rect
              layout
              direction={'row'}
              justifyContent={'space-between'}
              width={'100%'}
            >
              <Txt
                text={'$0'}
                fontFamily={THEME.fonts.data}
                fontSize={24}
                fontWeight={700}
                fill={THEME.colors.secondaryInk}
              />
              <Txt
                text={'▲ $60K LIMIT'}
                fontFamily={THEME.fonts.data}
                fontSize={24}
                fontWeight={700}
                fill={THEME.colors.ink}
              />
              <Txt
                text={'40% TAX ▶'}
                fontFamily={THEME.fonts.data}
                fontSize={24}
                fontWeight={700}
                fill={THEME.colors.accent}
              />
            </Rect>
          </Rect>

          {/* Focal Element 3: Bottom Alert Pill */}
          <Rect
            layout
            direction={'row'}
            justifyContent={'center'}
            alignItems={'center'}
            width={920}
            padding={[20, 32]}
            fill={THEME.colors.ink}
            stroke={THEME.colors.accent}
            lineWidth={3}
            opacity={treatyPillOpacity}
            scale={() => focalScale(focalId, 3, treatyPillScale, time)}
            rotation={() => focalRotation(focalId, 3, time)}
          >
            <Txt
              text={'ZERO US–ID ESTATE TREATY'}
              fontFamily={THEME.fonts.heading}
              fontSize={38}
              fontWeight={700}
              fill={'#FFFFFF'}
              letterSpacing={1.5}
            />
          </Rect>
        </Rect>
      </Node>
    </Node>
  );

  // ANIMATION CHOREOGRAPHY (Scene duration: 29.88s)

  // t = 5.8s: "Filing Form W-8BEN..."
  yield* waitUntilSceneTime(5.8, t0);
  yield* w8benBadgeScale(1.12, 0.18, easeOutExpo).to(1.0, 0.22, easeInOutCubic);

  // t = 9.2s: "cuts US dividend withholding from 30% down to 15%"
  yield* waitUntilSceneTime(9.2, t0);
  yield* all(
    w8benBarWidth(390, 1.3, easeOutExpo),
    w8benRateColor(THEME.colors.compliantGreen, 0.4),
    w8benTagBg(THEME.colors.compliantGreen, 0.4),
  );
  w8benRateText('15% TREATY RATE');
  w8benTagText('W-8BEN ✓');
  yield* w8benBadgeScale(1.12, 0.18, easeOutExpo).to(1.0, 0.22, easeInOutCubic);

  // t = 12.2s: "creditable back home through PPh 24"
  yield* waitUntilSceneTime(12.2, t0);
  w8benTagText('PPH 24 CREDIT ✓');
  yield* w8benBadgeScale(1.12, 0.18, easeOutExpo).to(1.0, 0.22, easeInOutCubic);

  // t=14.7s: ("But here's the trap: the US Estate Tax"):
  // Dim Card 1 (stops wobbling) & reveal Card 2 (starts slow wobble)
  yield* waitUntilSceneTime(14.7, t0);
  focalId(2);
  yield* all(
    card1Opacity(0.35, 0.45, easeInOutCubic),
    card2Opacity(1.0, 0.5, easeOutExpo),
    card2Scale(1.0, 0.5, easeOutExpo),
  );

  // t=20.2s: "exemption of just sixty thousand dollars"
  yield* waitUntilSceneTime(20.2, t0);
  yield* estateBarWidth(340, 1.4, easeInOutCubic);

  // t=24.1s: "Above that, the IRS takes up to 40% upon death"
  yield* waitUntilSceneTime(24.1, t0);
  estateTaxRateText('40% IRS SEIZURE');
  yield* all(
    estateBarWidth(852, 1.2, easeOutExpo),
    estateTaxRateColor(THEME.colors.accent, 0.3),
    card2BorderColor(THEME.colors.accent, 0.3),
    card2BorderWidth(5, 0.3),
    card2AlertScale(1.08, 0.18, easeOutExpo).to(1.0, 0.22, easeInOutCubic),
  );

  // t=26.2s: ("and Indonesia has zero estate tax treaty with the US"):
  // Focus shifts to Bottom Pill
  yield* waitUntilSceneTime(26.2, t0);
  focalId(3);
  yield* all(
    card2Opacity(0.45, 0.35, easeInOutCubic),
    treatyPillOpacity(1.0, 0.35, easeOutExpo),
    treatyPillScale(1.0, 0.45, easeOutExpo),
  );

  // Hold until scene end at exactly 29.88s
  yield* finishSceneAt(29.88, t0);
});
