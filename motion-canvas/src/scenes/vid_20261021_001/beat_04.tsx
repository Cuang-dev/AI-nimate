import { Img, makeScene2D, Node, Rect, Txt } from '@motion-canvas/2d';
import { all, createSignal, easeOutExpo, useThread } from '@motion-canvas/core';
import { SwissLayout } from './layout';
import { THEME } from './theme';
import { finishSceneAt, waitUntilSceneTime } from './timings';

export default makeScene2D(function* (view) {
  const time = useThread().time;
  view.fill(THEME.colors.bg);

  // Card 1 signals (Active spotlight t = 0.0s to 3.6s)
  const card1Opacity = createSignal(1);
  const card1Scale = createSignal(1.02);
  const userCount = createSignal(10000);
  const counterScale = createSignal(1.0);

  // Card 2 signals (Enters t = 3.8s)
  const card2Opacity = createSignal(0);
  const card2Scale = createSignal(0.97);
  const priceScale = createSignal(1.0);

  // Card 3 signals (Enters t = 7.0s)
  const card3Opacity = createSignal(0);
  const card3Scale = createSignal(0.97);
  const ditchedBadgeScale = createSignal(1.0);

  view.add(
    <Node>
      <SwissLayout figure="FIG. 04: PARTITION" />

      {/* Continuous Handheld Float + Camera Drift on Stage Wrapper */}
      <Node
        x={() => Math.sin(time() * 1.75 + 3.0) * 6}
        y={() => -70 + Math.cos(time() * 2.15 + 3.0) * 8}
        rotation={() => Math.sin(time() * 1.35 + 2.0) * 0.32}
      >
        {/* 3-Card Stack */}
        <Rect
          layout
          direction={'column'}
          width={920}
          gap={40}
          y={0}
        >
          {/* Card 1 (t = 0.0s, Active Units Drop) */}
          <Rect
            layout
            direction={'column'}
            width={920}
            padding={44}
            gap={16}
            fill={THEME.colors.surface}
            stroke={THEME.colors.ink}
            lineWidth={3}
            opacity={card1Opacity}
            scale={card1Scale}
            rotation={() => Math.sin(time() * 1.9 + 0 * 1.4) * 0.25}
          >
            <Txt
              text={'AUGUST 2024 // ACTIVE DEVICES'}
              fontFamily={THEME.fonts.data}
              fontSize={28}
              fontWeight={700}
              fill={'#6E6D68'}
              letterSpacing={1.2}
            />
            <Txt
              scale={counterScale}
              text={() => {
                const val = Math.round(userCount());
                if (val <= 7000) {
                  return '< 7,000';
                }
                return val.toLocaleString('en-US');
              }}
              fontFamily={THEME.fonts.data}
              fontSize={100}
              fontWeight={700}
              fill={'#141413'}
            />
          </Rect>

          {/* Card 2 (t = 3.8s, HP Software Deal) */}
          <Rect
            layout
            direction={'row'}
            justifyContent={'space-between'}
            alignItems={'center'}
            width={920}
            padding={[36, 40]}
            fill={THEME.colors.ink}
            opacity={card2Opacity}
            scale={card2Scale}
            rotation={() => Math.sin(time() * 1.9 + 1 * 1.4) * 0.25}
          >
            {/* Left Info Column */}
            <Rect
              layout
              direction={'column'}
              gap={14}
              alignItems={'start'}
            >
              <Txt
                text={'FEB 2025 // HP ACQUISITION'}
                fontFamily={THEME.fonts.data}
                fontSize={28}
                fontWeight={700}
                fill={'#E2DFD7'}
                letterSpacing={1.2}
              />
              <Txt
                scale={priceScale}
                text={'$116,000,000'}
                fontFamily={THEME.fonts.data}
                fontSize={88}
                fontWeight={700}
                fill={'#FFFFFF'}
              />
              <Rect
                layout
                fill={THEME.colors.surface}
                padding={[10, 22]}
              >
                <Txt
                  text={'SOFTWARE & PATENTS ONLY'}
                  fontFamily={THEME.fonts.data}
                  fontSize={26}
                  fontWeight={700}
                  fill={'#141413'}
                  letterSpacing={1}
                />
              </Rect>
            </Rect>

            {/* Right Badge: White circle with HP Logo */}
            <Rect
              layout
              width={176}
              height={176}
              radius={88}
              fill={THEME.colors.surface}
              justifyContent={'center'}
              alignItems={'center'}
              clip
            >
              <Img
                src={'/assets/vid_20261021_001/hp_logo.png'}
                width={160}
                height={160}
              />
            </Rect>
          </Rect>

          {/* Card 3 (t = 7.0s, Hardware Fate) */}
          <Rect
            layout
            direction={'row'}
            width={920}
            padding={38}
            justifyContent={'space-between'}
            alignItems={'center'}
            fill={THEME.colors.surface}
            stroke={THEME.colors.accent}
            lineWidth={5}
            opacity={card3Opacity}
            scale={card3Scale}
            rotation={() => Math.sin(time() * 1.9 + 2 * 1.4) * 0.25}
          >
            {/* Left side: Humane AI Pin Hardware Image + Label */}
            <Rect
              layout
              direction={'row'}
              alignItems={'center'}
              gap={28}
            >
              <Img
                src={'/assets/vid_20261021_001/humane_pin.png'}
                width={110}
                height={110}
              />
              <Txt
                text={'AI PIN HARDWARE'}
                fontFamily={THEME.fonts.data}
                fontSize={36}
                fontWeight={700}
                fill={'#141413'}
                letterSpacing={1}
              />
            </Rect>

            {/* Right side: Orange DITCHED Badge */}
            <Rect
              scale={ditchedBadgeScale}
              layout
              fill={THEME.colors.accent}
              padding={[12, 26]}
            >
              <Txt
                text={'DITCHED'}
                fontFamily={THEME.fonts.data}
                fontSize={32}
                fontWeight={700}
                fill={'#FFFFFF'}
                letterSpacing={1.5}
              />
            </Rect>
          </Rect>
        </Rect>
      </Node>
    </Node>
  );

  // Timeline of animations (Total duration: 11.96s)

  // t = 0.0s: Active units drop counter animating from 10,000 down to < 7,000 by t = 2.2s
  yield* userCount(7000, 2.2, easeOutExpo);

  // t = 2.3s: Crisp spring pop when counter hits < 7,000
  yield* waitUntilSceneTime(2.3);
  yield* all(
    card1Scale(1.07, 0.12).to(1.02, 0.22),
    counterScale(1.10, 0.12).to(1.0, 0.22)
  );

  // t = 3.8s: Card 2 springs in, Card 1 dims to 0.5 opacity and 0.97 scale
  yield* waitUntilSceneTime(3.8);
  yield* all(
    card2Opacity(1, 0.4, easeOutExpo),
    card2Scale(1.02, 0.4, easeOutExpo),
    card1Opacity(0.5, 0.4),
    card1Scale(0.97, 0.4)
  );

  // t = 6.2s: Pulse $116,000,000 on "116 million dollars"
  yield* waitUntilSceneTime(6.2);
  yield* priceScale(1.06, 0.14).to(1.0, 0.2);

  // t = 7.0s: Card 3 enters, Card 2 dims to 0.55 opacity and 0.97 scale
  yield* waitUntilSceneTime(7.0);
  yield* all(
    card3Opacity(1, 0.4, easeOutExpo),
    card3Scale(1.02, 0.4, easeOutExpo),
    card2Opacity(0.55, 0.4),
    card2Scale(0.97, 0.4)
  );

  // t = 8.52s: Orange DITCHED badge slams on "ditching the hardware entirely"
  yield* waitUntilSceneTime(8.52);
  yield* all(
    ditchedBadgeScale(1.12, 0.12).to(1.0, 0.22),
    card3Scale(1.05, 0.12).to(1.02, 0.22)
  );

  // Hold until beat 4 finishes at exactly 11.96s
  yield* finishSceneAt(12.01);
});
