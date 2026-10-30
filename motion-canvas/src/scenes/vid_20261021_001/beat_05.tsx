import { Img, makeScene2D, Node, Rect, Txt } from '@motion-canvas/2d';
import { all, createSignal, easeInOutCubic, easeOutExpo, useThread } from '@motion-canvas/core';
import { SwissLayout } from './layout';
import { THEME } from './theme';
import { finishSceneAt, waitUntilSceneTime } from './timings';

export default makeScene2D(function* (view) {
  view.fill(THEME.colors.bg);
  const time = useThread().time;

  // Block 1 signals (starts active at spotlight scale 1.02)
  const block1Opacity = createSignal(1);
  const block1Scale = createSignal(1.02);
  const cloudOfflineScale = createSignal(1);

  // Block 2 signals
  const block2Opacity = createSignal(0);
  const block2Scale = createSignal(0.96);
  const brickedScale = createSignal(1);

  // Block 3 signals
  const block3Opacity = createSignal(0);
  const block3Scale = createSignal(0.96);
  const priceScale = createSignal(1);
  const subtitleScale = createSignal(1);

  view.add(
    <Node>
      <SwissLayout figure="FIG. 05: SHUTDOWN" />

      {/* Root stage container with continuous handheld float + camera creep */}
      <Node
        x={() => Math.sin(time() * 1.85 + 4.0) * 6}
        y={() => -70 + Math.cos(time() * 2.05 + 4.0) * 8}
        rotation={() => Math.sin(time() * 1.45 + 3.0) * 0.32}
      >
        {/* Centered 3-Block Flexbox Focal Stack */}
        <Rect
          layout
          direction={'column'}
          width={920}
          gap={44}
          x={0}
          y={0}
        >
          {/* Block 1 (t = 0.0s, Shutdown Date Banner) */}
          <Rect
            layout
            direction={'row'}
            width={920}
            padding={[32, 44]}
            justifyContent={'space-between'}
            alignItems={'center'}
            fill={THEME.colors.ink}
            opacity={block1Opacity}
            scale={block1Scale}
            rotation={() => Math.sin(time() * 2.1) * 0.25}
          >
            <Txt
              text={'FEB 28, 2025'}
              fontFamily={THEME.fonts.data}
              fontSize={36}
              fontWeight={700}
              fill={'#FFFFFF'}
            />
            <Rect
              layout
              fill={THEME.colors.accent}
              padding={[10, 22]}
              scale={cloudOfflineScale}
            >
              <Txt
                text={'CLOUD OFFLINE'}
                fontFamily={THEME.fonts.data}
                fontSize={28}
                fontWeight={700}
                fill={'#FFFFFF'}
              />
            </Rect>
          </Rect>

          {/* Block 2 (t = 1.8s, Centerpiece Status Card) */}
          <Rect
            layout
            direction={'column'}
            width={920}
            padding={56}
            gap={20}
            alignItems={'center'}
            fill={THEME.colors.surface}
            stroke={THEME.colors.accent}
            lineWidth={() => 6 + Math.sin(time() * 5) * 1.5}
            opacity={block2Opacity}
            scale={block2Scale}
            rotation={() => Math.sin(time() * 2.1 + 1.2) * 0.25}
          >
            <Txt
              text={'DEVICE STATUS'}
              fontFamily={THEME.fonts.data}
              fontSize={28}
              fontWeight={700}
              fill={'#6E6D68'}
              letterSpacing={1.5}
            />
            <Img
              src={'/assets/vid_20261021_001/humane_pin.png'}
              width={220}
              height={220}
              opacity={0.75}
              rotation={() => Math.sin(time() * 1.8) * 2.5}
            />
            <Txt
              text={'100% BRICKED'}
              fontFamily={THEME.fonts.heading}
              fontSize={108}
              fontWeight={700}
              fill={'#FF3B00'}
              textWrap={false}
              scale={brickedScale}
            />
          </Rect>

          {/* Block 3 (t = 4.5s, Punchline Card) */}
          <Rect
            layout
            direction={'column'}
            width={920}
            padding={48}
            gap={16}
            alignItems={'center'}
            fill={THEME.colors.surface}
            stroke={THEME.colors.ink}
            lineWidth={3}
            opacity={block3Opacity}
            scale={block3Scale}
            rotation={() => Math.sin(time() * 2.1 + 2.4) * 0.25}
          >
            <Img
              src={'/assets/vid_20261021_001/humane_logo.png'}
              height={56}
              opacity={0.6}
            />
            <Txt
              text={'$699'}
              fontFamily={THEME.fonts.data}
              fontSize={88}
              fontWeight={700}
              fill={'#141413'}
              scale={priceScale}
            />
            <Txt
              text={'A SILENT METAL BADGE'}
              fontFamily={THEME.fonts.heading}
              fontSize={40}
              fontWeight={400}
              fill={'#6E6D68'}
              letterSpacing={1.2}
              scale={subtitleScale}
            />
          </Rect>
        </Rect>
      </Node>
    </Node>
  );

  // t = 1.2s: pulse on "CLOUD OFFLINE" ("shut down")
  yield* waitUntilSceneTime(1.2);
  yield* all(
    cloudOfflineScale(1.15, 0.12, easeOutExpo).to(1.0, 0.18, easeInOutCubic),
  );

  // t = 1.8s: Block 2 slams in; Block 1 recedes into secondary focus
  yield* waitUntilSceneTime(1.8);
  yield* all(
    block1Opacity(0.55, 0.35),
    block1Scale(0.97, 0.35),
    block2Opacity(1, 0.35, easeOutExpo),
    block2Scale(1.06, 0.18, easeOutExpo).to(1.02, 0.22, easeInOutCubic),
  );

  // t = 3.1s: sharp spring impact pop on "100% BRICKED" ("bricked instantly")
  yield* waitUntilSceneTime(3.1);
  yield* all(
    brickedScale(1.07, 0.12, easeOutExpo).to(1.0, 0.2, easeInOutCubic),
  );

  // t = 4.5s: Block 3 enters at spotlight; Block 2 recedes slightly
  yield* waitUntilSceneTime(4.5);
  yield* all(
    block2Opacity(0.65, 0.4),
    block2Scale(0.98, 0.4),
    block3Opacity(1, 0.35, easeOutExpo),
    block3Scale(1.06, 0.18, easeOutExpo).to(1.02, 0.22, easeInOutCubic),
  );

  // t = 5.3s: pulse on "$699"
  yield* waitUntilSceneTime(5.3);
  yield* all(
    priceScale(1.12, 0.12, easeOutExpo).to(1.0, 0.2, easeInOutCubic),
  );

  // t = 6.8s: pulse on "A SILENT METAL BADGE"
  yield* waitUntilSceneTime(6.8);
  yield* all(
    subtitleScale(1.08, 0.15, easeOutExpo).to(1.0, 0.22, easeInOutCubic),
  );

  // Hold until beat 5 finishes at exactly 9.76s
  yield* finishSceneAt(9.77);
});
