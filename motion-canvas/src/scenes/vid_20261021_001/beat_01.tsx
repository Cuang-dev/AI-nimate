import { Img, makeScene2D, Node, Rect, Txt } from '@motion-canvas/2d';
import { all, createSignal, easeInOutCubic, easeOutExpo, useThread } from '@motion-canvas/core';
import { SwissLayout } from './layout';
import { THEME } from './theme';
import { finishSceneAt, waitUntilSceneTime } from './timings';

export default makeScene2D(function* (view) {
  const time = useThread().time;
  view.fill(THEME.colors.bg);

  const headlineScale = createSignal(0.94);
  const returnsBarWidth = createSignal(120);
  const purchasesBarWidth = createSignal(120);
  const returnsRowScale = createSignal(1.0);
  const cardScale = createSignal(1.0);
  const pillScale = createSignal(1.0);

  view.add(
    <Node>
      <SwissLayout figure="FIG. 01: INVERSION" />

      {/* Stage Wrapper with Camera Creep + Handheld Float */}
      <Node
        x={() => Math.sin(time() * 1.8) * 6}
        y={() => -70 + Math.cos(time() * 2.2) * 8}
        rotation={() => Math.sin(time() * 1.4) * 0.35}
        scale={() => 1.0 + (Math.min(time(), 4.06) / 4.06) * 0.035}
      >
        {/* Single Centered Flexbox Root Container */}
        <Rect
          layout
          direction={'column'}
          width={920}
          gap={40}
          alignItems={'center'}
          y={0}
        >
          {/* Element A: Hook Headline paired with Humane AI Pin hardware visual */}
          <Rect
            layout
            direction={'row'}
            alignItems={'center'}
            justifyContent={'center'}
            gap={36}
            scale={() => headlineScale() * (1 + Math.sin(time() * 2.0) * 0.008)}
            rotation={() => Math.sin(time() * 2.0) * 0.25}
          >
            <Img
              src={'/assets/vid_20261021_001/humane_pin.png'}
              width={220}
              height={220}
              rotation={() => Math.sin(time() * 2.2) * 3}
            />
            <Rect layout direction={'column'} gap={12} alignItems={'start'}>
              <Txt
                text={'RETURNS > SALES'}
                fontFamily={THEME.fonts.heading}
                fontSize={84}
                fontWeight={700}
                fill={THEME.colors.accent}
              />
              <Txt
                text={'MAY – AUGUST 2024 // 3-MONTH INVERSION'}
                fontFamily={THEME.fonts.data}
                fontSize={26}
                fontWeight={700}
                fill={THEME.colors.ink}
                letterSpacing={1.1}
              />
            </Rect>
          </Rect>

          {/* Element B: 2-Bar Horizontal Comparison Card */}
          <Rect
            layout
            direction={'column'}
            width={920}
            padding={48}
            gap={36}
            fill={THEME.colors.surface}
            stroke={THEME.colors.ink}
            lineWidth={3}
            scale={() => cardScale() * (1 + Math.sin(time() * 2.0 + 1.2) * 0.006)}
            rotation={() => Math.sin(time() * 2.0 + 1.2) * 0.25}
          >
            {/* Row 1: Daily Returns */}
            <Rect
              layout
              direction={'column'}
              gap={14}
              width={'100%'}
              alignItems={'start'}
              scale={() => returnsRowScale() * (1 + Math.sin(time() * 2.2 + 0.4) * 0.006)}
            >
              <Txt
                text={'DAILY RETURNS'}
                fontFamily={THEME.fonts.data}
                fontSize={30}
                fontWeight={700}
                fill={'#FF3B00'}
                letterSpacing={1.2}
              />
              <Rect
                height={56}
                width={returnsBarWidth}
                fill={THEME.colors.accent}
              />
            </Rect>

            {/* Row 2: New Purchases */}
            <Rect
              layout
              direction={'column'}
              gap={14}
              width={'100%'}
              alignItems={'start'}
            >
              <Txt
                text={'NEW PURCHASES'}
                fontFamily={THEME.fonts.data}
                fontSize={30}
                fontWeight={700}
                fill={'#141413'}
                letterSpacing={1.2}
              />
              <Rect
                height={56}
                width={purchasesBarWidth}
                fill={THEME.colors.ink}
              />
            </Rect>
          </Rect>

          {/* Element C: Bottom Row with Humane Logo Badge & Price Pill */}
          <Rect
            layout
            direction={'row'}
            gap={24}
            alignItems={'center'}
            justifyContent={'center'}
            scale={() => pillScale() * (1 + Math.sin(time() * 2.0 + 2.4) * 0.008)}
            rotation={() => Math.sin(time() * 2.0 + 2.4) * 0.25}
          >
            {/* Humane Brand Logo Badge */}
            <Rect
              layout
              padding={[14, 28]}
              fill={THEME.colors.surface}
              stroke={THEME.colors.ink}
              lineWidth={THEME.stroke.border}
              alignItems={'center'}
              justifyContent={'center'}
            >
              <Img
                src={'/assets/vid_20261021_001/humane_logo.png'}
                height={44}
              />
            </Rect>

            {/* Dark Price Pill */}
            <Rect
              layout
              padding={[18, 36]}
              fill={THEME.colors.ink}
              alignItems={'center'}
              justifyContent={'center'}
            >
              <Txt
                text={'RETAIL PRICE: $699'}
                fontFamily={THEME.fonts.data}
                fontSize={30}
                fontWeight={700}
                fill={THEME.colors.surface}
                letterSpacing={1.2}
              />
            </Rect>
          </Rect>
        </Rect>
      </Node>
    </Node>
  );

  // Frame 1 (t = 0): Motion already underway, 100% visible
  yield* all(
    headlineScale(1.0, 0.45, easeOutExpo),
    returnsBarWidth(820, 1.4, easeOutExpo),
    purchasesBarWidth(420, 1.2, easeOutExpo),
  );

  // t = 1.4s ("returned"): crisp spring pulse on returns row and headline
  yield* waitUntilSceneTime(1.4);
  yield* all(
    returnsRowScale(1.05, 0.15, easeOutExpo).to(1.0, 0.25, easeInOutCubic),
    headlineScale(1.05, 0.15, easeOutExpo).to(1.0, 0.25, easeInOutCubic),
  );

  // t = 2.8s ("bought one"): crisp spring pulse on bottom $699 pill and bar card
  yield* waitUntilSceneTime(2.8);
  yield* all(
    pillScale(1.05, 0.15, easeOutExpo).to(1.0, 0.25, easeInOutCubic),
    cardScale(1.05, 0.15, easeOutExpo).to(1.0, 0.25, easeInOutCubic),
  );

  // Hold until beat 1 completes at exactly 4.06s
  yield* finishSceneAt(5.32);
});
