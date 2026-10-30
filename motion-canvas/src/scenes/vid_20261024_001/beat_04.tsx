import { Img, makeScene2D, Node, Rect, Txt } from '@motion-canvas/2d';
import { all, createSignal, easeInOutCubic, easeOutExpo, useThread } from '@motion-canvas/core';
import { SwissLayout } from './layout';
import { THEME } from './theme';
import { finishSceneAt, focalRotation, focalScale, waitUntilSceneTime } from './timings';

export default makeScene2D(function* (view) {
  const time = useThread().time;
  const t0 = time();
  view.fill(THEME.colors.bg);

  // Active focal element (1 = Default 35%, 2 = PMK 18 Exemption, 3 = 3-Year Lock)
  const focalId = createSignal(1);

  // Card 1 signals (Active spotlight t = 0.0s to 9.5s)
  const card1Opacity = createSignal(1.0);
  const card1Scale = createSignal(1.0);
  const card1BorderColor = createSignal<string>(THEME.colors.ink);
  const card1BadgeText = createSignal<string>('ORDINARY INCOME');
  const card1BadgeScale = createSignal(1.0);
  const card1BadgeFill = createSignal<string>(THEME.colors.bg);
  const card1BadgeStroke = createSignal<string>(THEME.colors.ink);
  const card1BadgeTextColor = createSignal<string>(THEME.colors.ink);

  // Card 2 signals (Hidden until t = 9.5s)
  const card2Opacity = createSignal(0.0);
  const card2Scale = createSignal(0.95);
  const card2BorderColor = createSignal<string>(THEME.colors.compliantGreen);
  const deadlineScale = createSignal(1.0);
  const exemptBadgeScale = createSignal(1.0);

  // Card 3 signals (Hidden until t = 21.5s)
  const card3Opacity = createSignal(0.0);
  const card3Scale = createSignal(0.95);
  const card3BorderColor = createSignal<string>(THEME.colors.compliantGreen);

  // Asset block signals
  const asset1Scale = createSignal(1.0);
  const asset1Bg = createSignal<string>(THEME.colors.surface);
  const asset1Border = createSignal<string>(THEME.colors.gridLine);
  const asset1LineWidth = createSignal<number>(2);
  const asset1TextColor = createSignal<string>(THEME.colors.ink);

  const asset2Scale = createSignal(1.0);
  const asset2Bg = createSignal<string>(THEME.colors.surface);
  const asset2Border = createSignal<string>(THEME.colors.gridLine);
  const asset2LineWidth = createSignal<number>(2);
  const asset2TextColor = createSignal<string>(THEME.colors.ink);

  const asset3Scale = createSignal(1.0);
  const asset3Bg = createSignal<string>(THEME.colors.surface);
  const asset3Border = createSignal<string>(THEME.colors.gridLine);
  const asset3LineWidth = createSignal<number>(2);
  const asset3TextColor = createSignal<string>(THEME.colors.ink);

  // 3-Year Holding signals
  const year1Bg = createSignal<string>(THEME.colors.bg);
  const year1TextColor = createSignal<string>(THEME.colors.secondaryInk);
  const year2Bg = createSignal<string>(THEME.colors.bg);
  const year2TextColor = createSignal<string>(THEME.colors.secondaryInk);
  const year3Bg = createSignal<string>(THEME.colors.bg);
  const year3TextColor = createSignal<string>(THEME.colors.secondaryInk);

  // Tax Flip Badge signals
  const finalTaxScale = createSignal(1.0);
  const finalTaxBg = createSignal<string>('#FFF1F0');
  const finalTaxBorder = createSignal<string>(THEME.colors.accent);
  const finalTaxPillBg = createSignal<string>(THEME.colors.accent);
  const finalTaxText = createSignal<string>('35% TAX');

  view.add(
    <Node>
      <SwissLayout figure="04 // PMK 18/2021 REPATRIATION" />

      {/* Locked Stage Wrapper (zero idle camera wobble) */}
      <Node y={-60}>
        <Rect
          layout
          direction={'column'}
          width={920}
          gap={24}
          alignItems={'center'}
        >
          {/* Focal Element 1: Default Foreign Dividend Regime (t = 0.0s) */}
          <Rect
            layout
            direction={'row'}
            justifyContent={'space-between'}
            alignItems={'center'}
            width={920}
            padding={[28, 34]}
            fill={THEME.colors.surface}
            stroke={card1BorderColor}
            lineWidth={3}
            opacity={card1Opacity}
            scale={() => focalScale(focalId, 1, card1Scale, time)}
            rotation={() => focalRotation(focalId, 1, time)}
          >
            <Rect layout direction={'column'} gap={6} alignItems={'start'}>
              <Txt
                text={'DEFAULT TAX'}
                fontFamily={THEME.fonts.data}
                fontSize={24}
                fontWeight={700}
                fill={THEME.colors.secondaryInk}
                letterSpacing={1.2}
              />
              <Txt
                text={'FOREIGN DIVIDENDS'}
                fontFamily={THEME.fonts.heading}
                fontSize={44}
                fontWeight={700}
                fill={THEME.colors.ink}
              />
            </Rect>

            <Rect
              scale={card1BadgeScale}
              layout
              padding={[12, 22]}
              fill={card1BadgeFill}
              stroke={card1BadgeStroke}
              lineWidth={3}
            >
              <Txt
                text={card1BadgeText}
                fontFamily={THEME.fonts.data}
                fontSize={30}
                fontWeight={700}
                fill={card1BadgeTextColor}
              />
            </Rect>
          </Rect>

          {/* Focal Element 2: PMK 18/2021 Repatriation Bypass (t = 9.5s) */}
          <Rect
            layout
            direction={'column'}
            width={920}
            padding={[26, 34]}
            gap={18}
            fill={THEME.colors.surface}
            stroke={card2BorderColor}
            lineWidth={4}
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
              <Rect layout direction={'row'} alignItems={'center'} gap={18}>
                <Img
                  src={'/assets/vid_20261024_001/djp_sbn_emblem.png'}
                  width={72}
                  height={72}
                />
                <Txt
                  text={'PMK 18 EXEMPTION'}
                  fontFamily={THEME.fonts.heading}
                  fontSize={42}
                  fontWeight={700}
                  fill={THEME.colors.ink}
                />
              </Rect>

              <Rect
                scale={deadlineScale}
                layout
                padding={[8, 16]}
                fill={THEME.colors.goldAccent}
              >
                <Txt
                  text={'BY MAR 31'}
                  fontFamily={THEME.fonts.data}
                  fontSize={24}
                  fontWeight={700}
                  fill={THEME.colors.surface}
                />
              </Rect>
            </Rect>

            <Rect
              layout
              direction={'row'}
              justifyContent={'space-between'}
              alignItems={'center'}
              width={'100%'}
            >
              <Txt
                text={'REINVEST IN INDONESIA'}
                fontFamily={THEME.fonts.data}
                fontSize={26}
                fontWeight={700}
                fill={THEME.colors.secondaryInk}
              />

              <Rect
                scale={exemptBadgeScale}
                layout
                padding={[10, 20]}
                fill={'#E8F5E9'}
                stroke={THEME.colors.compliantGreen}
                lineWidth={3}
              >
                <Txt
                  text={'100% EXEMPT'}
                  fontFamily={THEME.fonts.data}
                  fontSize={32}
                  fontWeight={700}
                  fill={THEME.colors.compliantGreen}
                />
              </Rect>
            </Rect>
          </Rect>

          {/* Focal Element 3: 3-Year Domestic Lock (t = 21.5s) */}
          <Rect
            layout
            direction={'column'}
            width={920}
            padding={[26, 34]}
            gap={18}
            fill={THEME.colors.surface}
            stroke={card3BorderColor}
            lineWidth={3}
            opacity={card3Opacity}
            scale={() => focalScale(focalId, 3, card3Scale, time)}
            rotation={() => focalRotation(focalId, 3, time)}
          >
            {/* 3 Eligible Asset Blocks (Clean 2-Word Labels) */}
            <Rect
              layout
              direction={'row'}
              justifyContent={'space-between'}
              gap={16}
              width={'100%'}
            >
              <Rect
                layout
                width={274}
                padding={[16, 14]}
                justifyContent={'center'}
                alignItems={'center'}
                fill={asset1Bg}
                stroke={asset1Border}
                lineWidth={asset1LineWidth}
                scale={asset1Scale}
              >
                <Txt
                  text={'SBN BONDS'}
                  fontFamily={THEME.fonts.data}
                  fontSize={26}
                  fontWeight={700}
                  fill={asset1TextColor}
                />
              </Rect>

              <Rect
                layout
                width={274}
                padding={[16, 14]}
                justifyContent={'center'}
                alignItems={'center'}
                fill={asset2Bg}
                stroke={asset2Border}
                lineWidth={asset2LineWidth}
                scale={asset2Scale}
              >
                <Txt
                  text={'MUTUAL FUNDS'}
                  fontFamily={THEME.fonts.data}
                  fontSize={26}
                  fontWeight={700}
                  fill={asset2TextColor}
                />
              </Rect>

              <Rect
                layout
                width={274}
                padding={[16, 14]}
                justifyContent={'center'}
                alignItems={'center'}
                fill={asset3Bg}
                stroke={asset3Border}
                lineWidth={asset3LineWidth}
                scale={asset3Scale}
              >
                <Txt
                  text={'DEPOSITS'}
                  fontFamily={THEME.fonts.data}
                  fontSize={26}
                  fontWeight={700}
                  fill={asset3TextColor}
                />
              </Rect>
            </Rect>

            {/* 3-Year Holding Lock Bar */}
            <Rect
              layout
              width={'100%'}
              height={42}
              direction={'row'}
              fill={THEME.colors.bg}
              stroke={THEME.colors.ink}
              lineWidth={2}
            >
              <Rect
                layout
                width={'33.33%'}
                height={'100%'}
                fill={year1Bg}
                justifyContent={'center'}
                alignItems={'center'}
                stroke={THEME.colors.gridLine}
                lineWidth={1}
              >
                <Txt
                  text={'YEAR 1'}
                  fontFamily={THEME.fonts.data}
                  fontSize={24}
                  fontWeight={700}
                  fill={year1TextColor}
                />
              </Rect>
              <Rect
                layout
                width={'33.33%'}
                height={'100%'}
                fill={year2Bg}
                justifyContent={'center'}
                alignItems={'center'}
                stroke={THEME.colors.gridLine}
                lineWidth={1}
              >
                <Txt
                  text={'YEAR 2'}
                  fontFamily={THEME.fonts.data}
                  fontSize={24}
                  fontWeight={700}
                  fill={year2TextColor}
                />
              </Rect>
              <Rect
                layout
                width={'33.34%'}
                height={'100%'}
                fill={year3Bg}
                justifyContent={'center'}
                alignItems={'center'}
              >
                <Txt
                  text={'YEAR 3'}
                  fontFamily={THEME.fonts.data}
                  fontSize={24}
                  fontWeight={700}
                  fill={year3TextColor}
                />
              </Rect>
            </Rect>

            {/* Flipping Tax Outcome Row */}
            <Rect
              scale={finalTaxScale}
              layout
              direction={'row'}
              justifyContent={'space-between'}
              alignItems={'center'}
              width={'100%'}
              padding={[14, 24]}
              fill={finalTaxBg}
              stroke={finalTaxBorder}
              lineWidth={3}
            >
              <Txt
                text={'FINAL TAX RATE'}
                fontFamily={THEME.fonts.data}
                fontSize={26}
                fontWeight={700}
                fill={THEME.colors.ink}
              />
              <Rect layout padding={[8, 20]} fill={finalTaxPillBg}>
                <Txt
                  text={finalTaxText}
                  fontFamily={THEME.fonts.data}
                  fontSize={34}
                  fontWeight={700}
                  fill={THEME.colors.surface}
                />
              </Rect>
            </Rect>
          </Rect>
        </Rect>
      </Node>
    </Node>
  );

  // TIMELINE OF ANIMATIONS (Total duration: 29.86s)

  // t = 4.6s: "ordinary income, up to 35%" -> flip & pulse badge
  yield* waitUntilSceneTime(4.6, t0);
  card1BadgeText('UP TO 35% TAX');
  yield* all(
    card1BadgeScale(1.12, 0.18, easeOutExpo).to(1.0, 0.22, easeInOutCubic),
    card1BadgeFill('#FFF1F0', 0.2),
    card1BadgeStroke(THEME.colors.accent, 0.2),
    card1BadgeTextColor(THEME.colors.accent, 0.2),
    card1BorderColor(THEME.colors.accent, 0.4),
  );

  // t = 5.9s: pulse again on "35%"
  yield* waitUntilSceneTime(5.9, t0);
  yield* card1BadgeScale(1.12, 0.15, easeOutExpo).to(1.0, 0.22, easeInOutCubic);

  // t = 9.5s: "Under the Omnibus Law and PMK 18 of 2021..."
  yield* waitUntilSceneTime(9.5, t0);
  focalId(2);
  yield* all(
    card1Opacity(0.35, 0.4),
    card1BorderColor(THEME.colors.gridLine, 0.4),
    card2Opacity(1.0, 0.45, easeOutExpo),
    card2Scale(1.0, 0.45, easeOutExpo),
  );

  // t = 14.2s: "100% tax-exempt"
  yield* waitUntilSceneTime(14.2, t0);
  yield* exemptBadgeScale(1.12, 0.16).to(1.0, 0.22);

  // t = 19.0s: "before March 31"
  yield* waitUntilSceneTime(19.0, t0);
  yield* deadlineScale(1.14, 0.16).to(1.0, 0.22);

  // t = 21.5s: "Lock the money into Indonesian government SBN bonds..."
  yield* waitUntilSceneTime(21.5, t0);
  focalId(3);
  yield* all(
    card2Opacity(0.35, 0.4),
    card3Opacity(1.0, 0.45, easeOutExpo),
    card3Scale(1.0, 0.45, easeOutExpo),
  );

  // t = 22.6s: "Indonesian government SBN bonds" -> Highlight Block 1
  yield* waitUntilSceneTime(22.6, t0);
  yield* all(
    asset1Scale(1.05, 0.15).to(1.0, 0.2),
    asset1Bg('#E8F5E9', 0.2),
    asset1Border(THEME.colors.compliantGreen, 0.2),
    asset1LineWidth(3, 0.2),
    asset1TextColor(THEME.colors.compliantGreen, 0.2),
  );

  // t = 24.0s: "mutual funds" -> Highlight Block 2
  yield* waitUntilSceneTime(24.0, t0);
  yield* all(
    asset2Scale(1.05, 0.15).to(1.0, 0.2),
    asset2Bg('#E8F5E9', 0.2),
    asset2Border(THEME.colors.compliantGreen, 0.2),
    asset2LineWidth(3, 0.2),
    asset2TextColor(THEME.colors.compliantGreen, 0.2),
  );

  // t = 24.9s: "or deposits" -> Highlight Block 3
  yield* waitUntilSceneTime(24.9, t0);
  yield* all(
    asset3Scale(1.05, 0.15).to(1.0, 0.2),
    asset3Bg('#E8F5E9', 0.2),
    asset3Border(THEME.colors.compliantGreen, 0.2),
    asset3LineWidth(3, 0.2),
    asset3TextColor(THEME.colors.compliantGreen, 0.2),
  );

  // t = 25.8s - 27.0s: "for three consecutive years" -> Lock holding bar
  yield* waitUntilSceneTime(25.8, t0);
  yield* all(
    year1Bg(THEME.colors.compliantGreen, 0.25),
    year1TextColor(THEME.colors.surface, 0.25),
  );
  yield* waitUntilSceneTime(26.3, t0);
  yield* all(
    year2Bg(THEME.colors.compliantGreen, 0.25),
    year2TextColor(THEME.colors.surface, 0.25),
  );
  yield* waitUntilSceneTime(26.8, t0);
  yield* all(
    year3Bg(THEME.colors.compliantGreen, 0.25),
    year3TextColor(THEME.colors.surface, 0.25),
  );

  // t = 28.0s: "and your tax rate drops to zero" -> Flip Tax Badge from 35% to 0% EXEMPT!
  yield* waitUntilSceneTime(28.0, t0);
  yield* all(
    finalTaxScale(1.08, 0.16).to(1.0, 0.25),
    finalTaxBg('#E8F5E9', 0.25),
    finalTaxBorder(THEME.colors.compliantGreen, 0.25),
    finalTaxPillBg(THEME.colors.compliantGreen, 0.25),
    finalTaxText('0% EXEMPT', 0.1),
  );

  // Hold until beat 4 finishes at exactly 29.86s
  yield* finishSceneAt(29.86, t0);
});
