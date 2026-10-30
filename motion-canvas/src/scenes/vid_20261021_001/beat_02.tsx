import { Img, makeScene2D, Node, Rect, Txt } from '@motion-canvas/2d';
import { all, createSignal, easeInOutCubic, easeOutExpo, useThread } from '@motion-canvas/core';
import { SwissLayout } from './layout';
import { LiveCounter } from './live_counter';
import { THEME } from './theme';
import { finishSceneAt, waitUntilSceneTime } from './timings';

export default makeScene2D(function* (view) {
  const time = useThread().time;
  view.fill(THEME.colors.bg);

  // Stage Signals
  const phase1Opacity = createSignal(1);
  const phase1Scale = createSignal(1);

  // Phase 1 Spotlight Signals
  const card1Scale = createSignal(1.02);
  const card1Opacity = createSignal(1.0);
  const card2Scale = createSignal(0.98);
  const card2Opacity = createSignal(0.7);
  const priceScale = createSignal(1.0);
  const shippedCount = createSignal(0);
  const badgeScale = createSignal(1.0);

  // Phase 2 Signals
  const phase2Opacity = createSignal(0);
  const phase2Scale = createSignal(0.95);
  const returnsScale = createSignal(1.0);

  view.add(
    <Node>
      <SwissLayout figure="FIG. 02: LEDGER" />

      {/* Stage Wrapper: Continuous Handheld Float + Slow Camera Push */}
      <Node
        x={() => Math.sin(time() * 1.7 + 1.0) * 7}
        y={() => -70 + Math.cos(time() * 2.1 + 1.0) * 9}
        rotation={() => Math.sin(time() * 1.3 + 0.5) * 0.35}
        scale={() =>
          time() < 7.2
            ? 1.0 + (Math.min(time(), 7.2) / 7.2) * 0.03
            : 1.0 + (Math.min(Math.max(0, time() - 7.2), 9.5) / 9.5) * 0.03
        }
      >
        {/* Phase 1: Two Stacked Stat Cards (t = 0.0s to 7.2s) */}
        <Node
          y={0}
          opacity={phase1Opacity}
          scale={phase1Scale}
        >
          <Rect
            width={920}
            layout
            direction={'column'}
            gap={44}
            alignItems={'center'}
          >
            {/* Card 1: Launch Price & Humane Hardware */}
            <Rect
              layout
              direction={'row'}
              justifyContent={'space-between'}
              alignItems={'center'}
              width={920}
              padding={48}
              fill={THEME.colors.surface}
              stroke={THEME.colors.ink}
              lineWidth={3}
              scale={card1Scale}
              opacity={card1Opacity}
              rotation={() => Math.sin(time() * 1.9 + 0.0) * 0.28}
            >
              {/* Left Column: Logo + Price */}
              <Rect
                layout
                direction={'column'}
                gap={14}
                alignItems={'start'}
              >
                <Img
                  src={'/assets/vid_20261021_001/humane_logo.png'}
                  height={56}
                />
                <Txt
                  text={'LAUNCH PRICE'}
                  fontFamily={THEME.fonts.data}
                  fontSize={28}
                  fontWeight={700}
                  fill={'#6E6D68'}
                  letterSpacing={1.2}
                />
                <Txt
                  text={'$699'}
                  fontFamily={THEME.fonts.data}
                  fontSize={112}
                  fontWeight={700}
                  fill={'#141413'}
                  scale={priceScale}
                />
              </Rect>

              {/* Right Side: Floating Humane AI Pin */}
              <Img
                src={'/assets/vid_20261021_001/humane_pin.png'}
                width={240}
                height={240}
                rotation={() => Math.sin(time() * 2.0) * 3.5}
              />
            </Rect>

            {/* Card 2: Initial Shipments */}
            <Rect
              layout
              direction={'column'}
              width={920}
              padding={48}
              gap={18}
              alignItems={'start'}
              fill={'#141413'}
              stroke={'#141413'}
              lineWidth={3}
              scale={card2Scale}
              opacity={card2Opacity}
              rotation={() => Math.sin(time() * 1.9 + 1.0) * 0.28}
            >
              <Txt
                text={'INITIAL SHIPMENTS'}
                fontFamily={THEME.fonts.data}
                fontSize={28}
                fontWeight={700}
                fill={'#E2DFD7'}
                letterSpacing={1.2}
              />
              <LiveCounter
                value={shippedCount}
                suffix=" UNITS"
                fontFamily={THEME.fonts.data}
                fontSize={96}
                fontWeight={700}
                fill={'#FFFFFF'}
              />
              <Rect
                layout
                padding={[8, 18]}
                fill={'#221614'}
                stroke={'#FF3B00'}
                lineWidth={2}
                scale={badgeScale}
              >
                <Txt
                  text={'~$9,000,000 GROSS'}
                  fontFamily={THEME.fonts.data}
                  fontSize={32}
                  fontWeight={700}
                  fill={'#FF3B00'}
                  letterSpacing={1.1}
                />
              </Rect>
            </Rect>
          </Rect>
        </Node>

        {/* Phase 2: Focal Net Sales Inversion Card (t >= 7.2s) */}
        <Node
          y={0}
          opacity={phase2Opacity}
          scale={phase2Scale}
        >
          <Rect
            layout
            direction={'column'}
            width={920}
            padding={52}
            gap={32}
            alignItems={'start'}
            fill={THEME.colors.surface}
            stroke={THEME.colors.accent}
            lineWidth={() => 6.5 + Math.sin(time() * 4.0) * 1.5}
            rotation={() => Math.sin(time() * 1.9 + 2.0) * 0.28}
          >
            {/* Top Row: Date Pill + Returned Pin Visual */}
            <Rect
              layout
              direction={'row'}
              justifyContent={'space-between'}
              alignItems={'center'}
              width={816}
            >
              {/* Top Pill */}
              <Rect
                layout
                padding={[10, 22]}
                fill={THEME.colors.accent}
              >
                <Txt
                  text={'MAY – AUG 2024'}
                  fontFamily={THEME.fonts.data}
                  fontSize={26}
                  fontWeight={700}
                  fill={'#FFFFFF'}
                  letterSpacing={1.5}
                />
              </Rect>

              {/* Tilted Pin Device with RETURNED Badge */}
              <Rect
                layout
                direction={'row'}
                alignItems={'center'}
                gap={16}
              >
                <Rect
                  layout
                  padding={[8, 18]}
                  fill={THEME.colors.accent}
                  rotation={-8}
                >
                  <Txt
                    text={'RETURNED'}
                    fontFamily={THEME.fonts.data}
                    fontSize={26}
                    fontWeight={700}
                    fill={'#FFFFFF'}
                    letterSpacing={1.2}
                  />
                </Rect>
                <Img
                  src={'/assets/vid_20261021_001/humane_pin.png'}
                  width={180}
                  height={180}
                  rotation={() => -10 + Math.sin(time() * 2.5) * 3.5}
                />
              </Rect>
            </Rect>

            {/* Hero Headline */}
            <Txt
              text={'NET SALES < 0'}
              fontFamily={THEME.fonts.data}
              fontSize={104}
              fontWeight={700}
              fill={'#FF3B00'}
              letterSpacing={2}
            />

            {/* Clean 2-Line Comparison Row */}
            <Rect
              layout
              direction={'row'}
              justifyContent={'space-between'}
              alignItems={'center'}
              width={816}
            >
              <Txt
                text={'DAILY RETURNS'}
                fontFamily={THEME.fonts.data}
                fontSize={32}
                fontWeight={700}
                fill={'#FF3B00'}
                letterSpacing={1.2}
                scale={returnsScale}
              />
              <Txt
                text={'> NEW ORDERS'}
                fontFamily={THEME.fonts.data}
                fontSize={32}
                fontWeight={700}
                fill={'#141413'}
                letterSpacing={1.2}
              />
            </Rect>
          </Rect>
        </Node>
      </Node>
    </Node>
  );

  // ANIMATION SEQUENCE (Total duration: 16.70s)

  // t = 0.82s: "$699 lapel pin" emphasis
  yield* waitUntilSceneTime(0.82);
  yield* priceScale(1.06, 0.2, easeOutExpo).to(1.0, 0.25, easeInOutCubic);

  // t = 2.7s: Spotlight switches to Card 2 as narration introduces shipments & $9M gross
  yield* waitUntilSceneTime(2.7);
  yield* all(
    card1Opacity(0.55, 0.45, easeInOutCubic),
    card1Scale(0.97, 0.45, easeInOutCubic),
    card2Opacity(1.0, 0.45, easeInOutCubic),
    card2Scale(1.02, 0.45, easeOutExpo),
    shippedCount(10000, 2.2, easeOutExpo),
  );

  // t = 5.2s: "nine million dollars" -> spring scale pulse on ~$9,000,000 GROSS badge
  yield* waitUntilSceneTime(5.2);
  yield* badgeScale(1.06, 0.18, easeOutExpo).to(1.0, 0.22, easeInOutCubic);

  // t = 7.2s: "Then net sales went negative" -> Phase 2 Transition
  yield* waitUntilSceneTime(7.2);
  yield* all(
    phase1Opacity(0, 0.45, easeInOutCubic),
    phase1Scale(0.95, 0.45, easeInOutCubic),
    phase2Opacity(1, 0.45, easeOutExpo),
    phase2Scale(1, 0.6, easeOutExpo),
  );

  // t = 11.0s: "daily returns consistently surpassed new orders" -> spring pop on DAILY RETURNS
  yield* waitUntilSceneTime(11.0);
  yield* returnsScale(1.12, 0.18, easeOutExpo).to(1.0, 0.24, easeInOutCubic);

  // Hold until scene end at exactly 16.70s
  yield* finishSceneAt(19.36);
});
