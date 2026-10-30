import { Img, makeScene2D, Node, Rect, Txt } from '@motion-canvas/2d';
import { all, createSignal, easeInOutCubic, easeOutExpo, useThread } from '@motion-canvas/core';
import { SwissLayout } from './layout';
import { THEME } from './theme';
import { finishSceneAt, focalRotation, focalScale, waitUntilSceneTime } from './timings';

export default makeScene2D(function* (view) {
  const time = useThread().time;
  const t0 = time();
  view.fill(THEME.colors.bg);

  // Active focal element (1 = UCITS Intro, 2 = Shield 1, 3 = Shield 2, 4 = Shield 3, 0 = Summary)
  const focalId = createSignal(1);

  const card1Opacity = createSignal(1);
  const card1Scale = createSignal(1.0);

  const card2Opacity = createSignal(0);
  const card2Scale = createSignal(0.95);

  const card3Opacity = createSignal(0);
  const card3Scale = createSignal(0.95);

  const card4Opacity = createSignal(0);
  const card4Scale = createSignal(0.95);

  // Word-hit pulse signals
  const cspxScale = createSignal(1.0);
  const vwraScale = createSignal(1.0);
  const shield1Pulse = createSignal(1.0);
  const outboundPulse = createSignal(1.0);
  const strikePulse = createSignal(1.0);
  const exemptPulse = createSignal(1.0);
  const accPulse = createSignal(1.0);
  const divTaxPulse = createSignal(1.0);

  view.add(
    <Node>
      <SwissLayout figure="03 // IRISH UCITS SHIELD" />

      {/* Locked Stage Wrapper (zero idle camera wobble) */}
      <Node y={-60}>
        <Rect
          layout
          direction={'column'}
          width={920}
          gap={22}
          alignItems={'center'}
        >
          {/* Focal Element 1 (t = 0.0s): LSE Irish UCITS Header + Tickers */}
          <Rect
            layout
            direction={'column'}
            width={920}
            padding={[26, 32]}
            gap={18}
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
              alignItems={'center'}
              gap={16}
              width={'100%'}
            >
              <Img
                src={'/assets/vid_20261024_001/lse_ucits_badge.png'}
                width={72}
                height={72}
              />
              <Txt
                text={'IRISH UCITS ETFs'}
                fontFamily={THEME.fonts.heading}
                fontSize={46}
                fontWeight={700}
                fill={THEME.colors.ink}
              />
            </Rect>

            <Rect
              layout
              direction={'row'}
              gap={18}
              width={'100%'}
            >
              <Rect
                layout
                direction={'row'}
                justifyContent={'space-between'}
                alignItems={'center'}
                padding={[14, 22]}
                grow={1}
                fill={'#F0FDF4'}
                stroke={THEME.colors.compliantGreen}
                lineWidth={2}
                scale={cspxScale}
              >
                <Txt
                  text={'CSPX'}
                  fontFamily={THEME.fonts.heading}
                  fontSize={36}
                  fontWeight={700}
                  fill={THEME.colors.compliantGreen}
                />
                <Txt
                  text={'S&P 500'}
                  fontFamily={THEME.fonts.data}
                  fontSize={24}
                  fontWeight={700}
                  fill={THEME.colors.ink}
                />
              </Rect>

              <Rect
                layout
                direction={'row'}
                justifyContent={'space-between'}
                alignItems={'center'}
                padding={[14, 22]}
                grow={1}
                fill={'#F0FDF4'}
                stroke={THEME.colors.compliantGreen}
                lineWidth={2}
                scale={vwraScale}
              >
                <Txt
                  text={'VWRA'}
                  fontFamily={THEME.fonts.heading}
                  fontSize={36}
                  fontWeight={700}
                  fill={THEME.colors.compliantGreen}
                />
                <Txt
                  text={'ALL-WORLD'}
                  fontFamily={THEME.fonts.data}
                  fontSize={24}
                  fontWeight={700}
                  fill={THEME.colors.ink}
                />
              </Rect>
            </Rect>
          </Rect>

          {/* Focal Element 2 (t = 9.5s): Shield 01 // 15% Treaty Cap */}
          <Rect
            layout
            direction={'row'}
            justifyContent={'space-between'}
            alignItems={'center'}
            width={920}
            padding={[24, 32]}
            fill={THEME.colors.surface}
            stroke={THEME.colors.ink}
            lineWidth={3}
            opacity={card2Opacity}
            scale={() => focalScale(focalId, 2, card2Scale, time)}
            rotation={() => focalRotation(focalId, 2, time)}
          >
            <Rect layout direction={'column'} gap={6} alignItems={'start'}>
              <Txt
                text={'01 // US–IRELAND TREATY'}
                fontFamily={THEME.fonts.data}
                fontSize={24}
                fontWeight={700}
                fill={THEME.colors.secondaryInk}
                letterSpacing={1.2}
              />
              <Txt
                text={'15% DIVIDEND CAP'}
                fontFamily={THEME.fonts.heading}
                fontSize={44}
                fontWeight={700}
                fill={THEME.colors.ink}
                scale={shield1Pulse}
              />
            </Rect>

            <Rect layout fill={THEME.colors.compliantGreen} padding={[12, 22]} scale={outboundPulse}>
              <Txt
                text={'0% EXIT TAX'}
                fontFamily={THEME.fonts.data}
                fontSize={28}
                fontWeight={700}
                fill={THEME.colors.surface}
              />
            </Rect>
          </Rect>

          {/* Focal Element 3 (t = 18.9s): Shield 02 // 0% Estate Tax */}
          <Rect
            layout
            direction={'row'}
            justifyContent={'space-between'}
            alignItems={'center'}
            width={920}
            padding={[24, 32]}
            fill={THEME.colors.surface}
            stroke={THEME.colors.compliantGreen}
            lineWidth={4}
            opacity={card3Opacity}
            scale={() => focalScale(focalId, 3, card3Scale, time)}
            rotation={() => focalRotation(focalId, 3, time)}
          >
            <Rect layout direction={'column'} gap={6} alignItems={'start'}>
              <Txt
                text={'02 // NON-US ASSET'}
                fontFamily={THEME.fonts.data}
                fontSize={24}
                fontWeight={700}
                fill={THEME.colors.secondaryInk}
                letterSpacing={1.2}
              />
              <Txt
                text={'40% -> 0% ESTATE TAX'}
                fontFamily={THEME.fonts.heading}
                fontSize={44}
                fontWeight={700}
                fill={THEME.colors.compliantGreen}
                scale={strikePulse}
              />
            </Rect>

            <Rect layout fill={THEME.colors.compliantGreen} padding={[12, 22]} scale={exemptPulse}>
              <Txt
                text={'EXEMPT'}
                fontFamily={THEME.fonts.data}
                fontSize={28}
                fontWeight={700}
                fill={THEME.colors.surface}
              />
            </Rect>
          </Rect>

          {/* Focal Element 4 (t = 24.9s): Shield 03 // Accumulating Shares */}
          <Rect
            layout
            direction={'row'}
            justifyContent={'space-between'}
            alignItems={'center'}
            width={920}
            padding={[24, 32]}
            fill={THEME.colors.ink}
            stroke={THEME.colors.ink}
            lineWidth={3}
            opacity={card4Opacity}
            scale={() => focalScale(focalId, 4, card4Scale, time)}
            rotation={() => focalRotation(focalId, 4, time)}
          >
            <Rect layout direction={'column'} gap={6} alignItems={'start'}>
              <Txt
                text={'03 // ACCUMULATING'}
                fontFamily={THEME.fonts.data}
                fontSize={24}
                fontWeight={700}
                fill={THEME.colors.goldAccent}
                letterSpacing={1.2}
              />
              <Txt
                text={'AUTO-REINVEST'}
                fontFamily={THEME.fonts.heading}
                fontSize={44}
                fontWeight={700}
                fill={THEME.colors.surface}
                scale={accPulse}
              />
            </Rect>

            <Rect layout fill={THEME.colors.compliantGreen} padding={[12, 22]} scale={divTaxPulse}>
              <Txt
                text={'0% ANNUAL TAX'}
                fontFamily={THEME.fonts.data}
                fontSize={28}
                fontWeight={700}
                fill={THEME.colors.surface}
              />
            </Rect>
          </Rect>
        </Rect>
      </Node>
    </Node>
  );

  // TIMELINE OF ANIMATIONS (Total scene duration: 32.30s)

  yield* waitUntilSceneTime(6.08, t0); // "CSPX"
  yield* cspxScale(1.08, 0.15, easeOutExpo).to(1.0, 0.25, easeInOutCubic);

  yield* waitUntilSceneTime(8.38, t0); // "VWRA"
  yield* vwraScale(1.08, 0.15, easeOutExpo).to(1.0, 0.25, easeInOutCubic);

  // 9.50s: "First, Ireland's US treaty caps internal dividend withholding at 15%..."
  yield* waitUntilSceneTime(9.50, t0);
  focalId(2);
  yield* all(
    card1Opacity(0.35, 0.4, easeOutExpo),
    card2Opacity(1, 0.45, easeOutExpo),
    card2Scale(1.0, 0.45, easeOutExpo),
  );

  // 14.56s: "at 15%"
  yield* waitUntilSceneTime(14.56, t0);
  yield* shield1Pulse(1.06, 0.15, easeOutExpo).to(1.0, 0.25, easeInOutCubic);

  // 16.08s: "while charging 0% outbound withholding to you"
  yield* waitUntilSceneTime(16.08, t0);
  yield* outboundPulse(1.1, 0.15, easeOutExpo).to(1.0, 0.25, easeInOutCubic);

  // 18.9s: "Second, Irish funds are non-US assets. That 40% US estate tax drops to zero."
  yield* waitUntilSceneTime(18.9, t0);
  focalId(3);
  yield* all(
    card2Opacity(0.35, 0.4, easeOutExpo),
    card3Opacity(1, 0.45, easeOutExpo),
    card3Scale(1.0, 0.45, easeOutExpo),
  );

  // 22.02s: "that 40% US estate tax"
  yield* waitUntilSceneTime(22.02, t0);
  yield* strikePulse(1.06, 0.15, easeOutExpo).to(1.0, 0.25, easeInOutCubic);

  // 23.92s: "drops to zero"
  yield* waitUntilSceneTime(23.92, t0);
  yield* exemptPulse(1.1, 0.15, easeOutExpo).to(1.0, 0.25, easeInOutCubic);

  // 24.9s: "Best of all, accumulating shares reinvest dividends inside the fund..."
  yield* waitUntilSceneTime(24.9, t0);
  focalId(4);
  yield* all(
    card3Opacity(0.35, 0.4, easeOutExpo),
    card4Opacity(1, 0.45, easeOutExpo),
    card4Scale(1.0, 0.45, easeOutExpo),
  );

  // 26.00s: "accumulating shares reinvest"
  yield* waitUntilSceneTime(26.00, t0);
  yield* accPulse(1.06, 0.15, easeOutExpo).to(1.0, 0.25, easeInOutCubic);

  // 29.40s: "triggering zero annual dividend tax events"
  yield* waitUntilSceneTime(29.40, t0);
  yield* divTaxPulse(1.1, 0.15, easeOutExpo).to(1.0, 0.25, easeInOutCubic);

  // 30.80s: Clean final summary alignment
  yield* waitUntilSceneTime(30.80, t0);
  focalId(4);
  yield* all(
    card1Opacity(0.75, 0.5, easeOutExpo),
    card2Opacity(0.85, 0.5, easeOutExpo),
    card3Opacity(0.95, 0.5, easeOutExpo),
    card4Opacity(1.0, 0.5, easeOutExpo),
  );

  // Hold until beat 3 finishes at exactly 32.30s
  yield* finishSceneAt(32.30, t0);
});
