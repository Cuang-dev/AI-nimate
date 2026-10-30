import { Img, makeScene2D, Node, Rect, Txt } from '@motion-canvas/2d';
import { all, createSignal, easeInOutCubic, easeOutExpo, useThread } from '@motion-canvas/core';
import { SwissLayout } from './layout';
import { LiveCounter } from './live_counter';
import { THEME } from './theme';
import { finishSceneAt, waitUntilSceneTime } from './timings';

export default makeScene2D(function* (view) {
  const time = useThread().time;
  view.fill(THEME.colors.bg);

  const bounceAmount = createSignal(0);

  // Spotlight dimming & scale signals
  const node1Opacity = createSignal(1);
  const node1Scale = createSignal(1.02);

  const connector1Opacity = createSignal(0);

  const node2Opacity = createSignal(0);
  const node2Scale = createSignal(0.97);
  const pillScale = createSignal(1);
  const title2Scale = createSignal(1);

  const connector2Opacity = createSignal(0);

  const node3Opacity = createSignal(0);
  const node3Scale = createSignal(0.97);
  const hero3Scale = createSignal(1);

  view.add(
    <Node>
      <SwissLayout figure="FIG. 03: SCHEMATIC" />

      {/* Stage Wrapper: Continuous Handheld Float + Slow Camera Push */}
      <Node
        x={() => Math.sin(time() * 1.6 + 2.0) * 6}
        y={() => -70 + Math.cos(time() * 2.0 + 2.0) * 8}
        rotation={() => Math.sin(time() * 1.2 + 1.5) * 0.32}
        scale={() => 1 + (time() / 17.00) * 0.035}
      >
        {/* Single Vertical 3-Node Pipeline */}
        <Rect
          layout
          direction={'column'}
          width={920}
          alignItems={'center'}
          gap={0}
          y={0}
        >
          {/* Node 1 (t = 0.0s, Top Card): Horizontal row with counter & hardware image */}
          <Rect
            layout
            direction={'row'}
            justifyContent={'space-between'}
            alignItems={'center'}
            width={920}
            padding={44}
            fill={THEME.colors.surface}
            stroke={THEME.colors.ink}
            lineWidth={3}
            opacity={node1Opacity}
            scale={node1Scale}
            rotation={() => Math.sin(time() * 2.0 + 0 * 1.3) * 0.25}
          >
            <Rect layout direction={'column'} alignItems={'start'} gap={12}>
              <Txt
                text={'WAREHOUSE RETURNS'}
                fontFamily={THEME.fonts.data}
                fontSize={28}
                fontWeight={700}
                fill={'#6E6D68'}
                letterSpacing={1.2}
              />
              <LiveCounter
                value={bounceAmount}
                prefix=">$"
                fontFamily={THEME.fonts.data}
                fontSize={96}
                fontWeight={700}
                fill={'#FF3B00'}
              />
            </Rect>
            <Img
              src={'/assets/vid_20261021_001/humane_pin.png'}
              width={170}
              height={170}
              y={() => Math.sin(time() * 2.4) * 4}
              rotation={() => Math.sin(time() * 1.8) * 1.5}
            />
          </Rect>

          {/* Connector 1 (t = 3.5s) */}
          <Rect
            width={4}
            height={64}
            fill={THEME.colors.ink}
            opacity={connector1Opacity}
          />

          {/* Node 2 (t = 4.0s, Middle Blocker Gate): With T-Mobile logo in header */}
          <Rect
            layout
            direction={'column'}
            alignItems={'start'}
            width={920}
            padding={44}
            gap={16}
            fill={THEME.colors.surface}
            stroke={THEME.colors.accent}
            lineWidth={5}
            opacity={node2Opacity}
            scale={node2Scale}
            rotation={() => Math.sin(time() * 2.0 + 1 * 1.3) * 0.25}
          >
            {/* Header Row: T-Mobile pill + T-Mobile official carrier logo */}
            <Rect
              layout
              direction={'row'}
              justifyContent={'space-between'}
              alignItems={'center'}
              width={'100%'}
            >
              <Rect
                layout
                fill={THEME.colors.accent}
                padding={[8, 20]}
                scale={pillScale}
              >
                <Txt
                  text={'T-MOBILE E-SIM LOCK'}
                  fontFamily={THEME.fonts.data}
                  fontSize={26}
                  fontWeight={700}
                  fill={'#FFFFFF'}
                  letterSpacing={1.2}
                />
              </Rect>
              <Img
                src={'/assets/vid_20261021_001/tmobile_logo.png'}
                height={72}
                scale={pillScale}
              />
            </Rect>
            <Txt
              text={'CANNOT WIPE OR RESELL'}
              fontFamily={THEME.fonts.heading}
              fontSize={52}
              fontWeight={700}
              fill={'#141413'}
              scale={title2Scale}
            />
          </Rect>

          {/* Connector 2 (t = 8.5s) */}
          <Rect
            width={6}
            height={64}
            fill={THEME.colors.accent}
            opacity={connector2Opacity}
          />

          {/* Node 3 (t = 9.0s, Bottom Terminal Card) */}
          <Rect
            layout
            direction={'column'}
            alignItems={'start'}
            width={920}
            padding={44}
            gap={12}
            fill={THEME.colors.ink}
            opacity={node3Opacity}
            scale={node3Scale}
            rotation={() => Math.sin(time() * 2.0 + 2 * 1.3) * 0.25}
          >
            <Txt
              text={'FINAL DESTINATION'}
              fontFamily={THEME.fonts.data}
              fontSize={26}
              fontWeight={700}
              fill={'#E2DFD7'}
              letterSpacing={1.2}
            />
            <Txt
              text={'INSTANT E-WASTE'}
              fontFamily={THEME.fonts.heading}
              fontSize={76}
              fontWeight={700}
              fill={'#FF3B00'}
              scale={hero3Scale}
            />
          </Rect>
        </Rect>
      </Node>
    </Node>
  );

  // TIMELINE OF ANIMATIONS (Total duration: 17.00s)

  // 0.00s: "Over one million dollars in hardware bounced back to their warehouse."
  // Node 1 is active spotlight (opacity: 1, scale: 1.02)
  yield* bounceAmount(1000000, 2.5, easeOutExpo);

  // 3.50s: Connector 1 reveals
  yield* waitUntilSceneTime(3.5);
  yield* connector1Opacity(1, 0.3, easeOutExpo);

  // 4.00s: "Worse, Humane could not resell the returned devices."
  // Node 2 springs in as spotlight; Node 1 recedes
  yield* waitUntilSceneTime(4.0);
  yield* all(
    node2Opacity(1, 0.4, easeOutExpo),
    node2Scale(1.02, 0.4, easeOutExpo),
    node1Opacity(0.5, 0.4, easeOutExpo),
    node1Scale(0.97, 0.4, easeOutExpo)
  );

  // 6.20s: Pulse "T-MOBILE E-SIM LOCK" pill + logo ("Because of T-Mobile carrier locking...")
  yield* waitUntilSceneTime(6.2);
  yield* pillScale(1.07, 0.15, easeOutExpo).to(1.0, 0.25, easeInOutCubic);

  // 8.20s: Pulse "CANNOT WIPE OR RESELL" title ("they could not wipe and reassign...")
  yield* waitUntilSceneTime(8.2);
  yield* title2Scale(1.07, 0.15, easeOutExpo).to(1.0, 0.25, easeInOutCubic);

  // 8.65s: Connector 2 reveals
  yield* connector2Opacity(1, 0.3, easeOutExpo);

  // 9.00s: "Thousands of returned pins turned directly into e-waste."
  // Node 3 slams in as active spotlight; Node 2 recedes
  yield* waitUntilSceneTime(9.0);
  yield* all(
    node3Opacity(1, 0.4, easeOutExpo),
    node3Scale(1.02, 0.4, easeOutExpo),
    node2Opacity(0.55, 0.4, easeOutExpo),
    node2Scale(0.97, 0.4, easeOutExpo)
  );

  // 12.20s: Second emphasis pulse on Node 3 ("turned directly into e-waste")
  yield* waitUntilSceneTime(12.2);
  yield* all(
    node3Scale(1.07, 0.15, easeOutExpo).to(1.02, 0.25, easeInOutCubic),
    hero3Scale(1.08, 0.15, easeOutExpo).to(1.0, 0.25, easeInOutCubic)
  );

  // Hold until beat 3 finishes at exactly 17.00s
  yield* finishSceneAt(17.86);
});
