import { Img, makeScene2D, Node, Rect, Txt } from '@motion-canvas/2d';
import { all, createSignal, easeInOutCubic, easeOutExpo, useThread } from '@motion-canvas/core';
import { SwissLayout } from './layout';
import { LiveCounter } from './live_counter';
import { THEME } from './theme';
import { finishSceneAt, focalRotation, focalScale, waitUntilSceneTime } from './timings';

export default makeScene2D(function* (view) {
  const time = useThread().time;
  const t0 = time();
  view.fill(THEME.colors.bg);

  // Active focal element (1 = Domestic Card, 2 = Offshore Card, 3 = 350x Shock Badge)
  const focalId = createSignal(1);

  const upperCardOpacity = createSignal(1.0);
  const upperCardScale = createSignal(1.0);
  const upperCardStroke = createSignal<string>(THEME.colors.compliantGreen);
  const domesticBadgeScale = createSignal(1.0);

  // Progressive reveal: hidden until spoken at t = 9.2s
  const lowerCardOpacity = createSignal(0.0);
  const lowerCardScale = createSignal(0.95);
  const lowerCardStroke = createSignal<string>(THEME.colors.accent);
  const offshoreBadgeScale = createSignal(1.0);

  // Progressive reveal: hidden until spoken at t = 24.4s
  const badgeOpacity = createSignal(0.0);
  const badgeScale = createSignal(0.92);

  // Card 2 Regime Badge signals (UU HPP // ORDINARY INCOME)
  const regimeScale = createSignal(1.0);
  const regimeBg = createSignal<string>(THEME.colors.bg);
  const regimeStroke = createSignal<string>(THEME.colors.gridLine);
  const regimeTextColor = createSignal<string>(THEME.colors.secondaryInk);

  const domesticTaxCounter = createSignal(0);
  const domesticBarWidth = createSignal(16);

  const offshoreTaxCounter = createSignal(0);
  const offshoreBarWidth = createSignal(16);
  const ladderStep = createSignal(0);

  const BRACKETS = [
    { label: '5%', step: 1 },
    { label: '15%', step: 2 },
    { label: '25%', step: 3 },
    { label: '30%', step: 4 },
    { label: '35%', step: 5 },
  ];

  view.add(
    <Node>
      <SwissLayout figure="01 // CAPITAL GAINS" />

      {/* Locked Stage Wrapper (zero idle camera wobble) */}
      <Node y={-60}>
        <Rect
          layout
          direction={'column'}
          width={920}
          gap={28}
          alignItems={'center'}
        >
          {/* Focal Element 1: Domestic IDX Sale (BCA) */}
          <Rect
            layout
            direction={'column'}
            width={920}
            padding={[28, 34]}
            gap={20}
            fill={THEME.colors.surface}
            stroke={upperCardStroke}
            lineWidth={3}
            opacity={upperCardOpacity}
            scale={() => focalScale(focalId, 1, upperCardScale, time)}
            rotation={() => focalRotation(focalId, 1, time)}
          >
            <Rect
              layout
              width={'100%'}
              direction={'row'}
              justifyContent={'space-between'}
              alignItems={'center'}
            >
              <Rect layout direction={'row'} alignItems={'center'} gap={16}>
                <Img
                  src={'/assets/vid_20261024_001/idx_logo.png'}
                  width={72}
                  height={72}
                />
                <Txt
                  text={'IDX: BCA'}
                  fontFamily={THEME.fonts.heading}
                  fontSize={42}
                  fontWeight={700}
                  fill={THEME.colors.ink}
                />
              </Rect>

              <Rect
                scale={domesticBadgeScale}
                layout
                padding={[8, 18]}
                fill={'#F0FDF4'}
                stroke={THEME.colors.compliantGreen}
                lineWidth={2}
              >
                <Txt
                  text={'0.1% FINAL TAX'}
                  fontFamily={THEME.fonts.data}
                  fontSize={28}
                  fontWeight={700}
                  fill={THEME.colors.compliantGreen}
                />
              </Rect>
            </Rect>

            <Rect
              layout
              width={'100%'}
              direction={'row'}
              justifyContent={'space-between'}
              alignItems={'baseline'}
            >
              <Txt
                text={'TAX PAID'}
                fontFamily={THEME.fonts.data}
                fontSize={24}
                fontWeight={700}
                fill={THEME.colors.secondaryInk}
                letterSpacing={1.2}
              />
              <LiveCounter
                value={domesticTaxCounter}
                prefix={'RP '}
                fontSize={56}
                fontWeight={700}
                fill={THEME.colors.compliantGreen}
              />
            </Rect>

            <Rect
              layout
              width={'100%'}
              height={22}
              fill={THEME.colors.bg}
              stroke={THEME.colors.gridLine}
              lineWidth={1}
              alignItems={'start'}
            >
              <Rect
                height={22}
                width={domesticBarWidth}
                fill={THEME.colors.compliantGreen}
              />
            </Rect>
          </Rect>

          {/* Focal Element 2: Offshore Sale (AAPL / S&P 500) */}
          <Rect
            layout
            direction={'column'}
            width={920}
            padding={[28, 34]}
            gap={20}
            fill={THEME.colors.surface}
            stroke={lowerCardStroke}
            lineWidth={3}
            opacity={lowerCardOpacity}
            scale={() => focalScale(focalId, 2, lowerCardScale, time)}
            rotation={() => focalRotation(focalId, 2, time)}
          >
            <Rect
              layout
              width={'100%'}
              direction={'row'}
              justifyContent={'space-between'}
              alignItems={'center'}
            >
              <Txt
                text={'US: AAPL / S&P 500'}
                fontFamily={THEME.fonts.heading}
                fontSize={42}
                fontWeight={700}
                fill={THEME.colors.ink}
              />
              <Rect scale={offshoreBadgeScale} layout padding={[8, 18]} fill={THEME.colors.accent}>
                <Txt
                  text={'UP TO 35%'}
                  fontFamily={THEME.fonts.data}
                  fontSize={28}
                  fontWeight={700}
                  fill={THEME.colors.surface}
                />
              </Rect>
            </Rect>

            {/* Regime Badge */}
            <Rect
              layout
              direction={'row'}
              justifyContent={'start'}
              width={'100%'}
            >
              <Rect
                layout
                padding={[6, 14]}
                fill={regimeBg}
                stroke={regimeStroke}
                lineWidth={2}
                scale={regimeScale}
              >
                <Txt
                  text={'UU HPP // ORDINARY INCOME'}
                  fontFamily={THEME.fonts.data}
                  fontSize={24}
                  fontWeight={700}
                  fill={regimeTextColor}
                  letterSpacing={1.0}
                />
              </Rect>
            </Rect>

            {/* Clean 5-Step Bracket Strip (Percentages Only) */}
            <Rect layout direction={'row'} gap={12} width={'100%'} justifyContent={'space-between'}>
              {BRACKETS.map((b) => (
                <Rect
                  key={`bracket-${b.step}`}
                  layout
                  justifyContent={'center'}
                  alignItems={'center'}
                  padding={[10, 14]}
                  grow={1}
                  fill={() => (ladderStep() >= b.step ? THEME.colors.accent : THEME.colors.bg)}
                  stroke={() => (ladderStep() >= b.step ? THEME.colors.accent : THEME.colors.gridLine)}
                  lineWidth={2}
                >
                  <Txt
                    text={b.label}
                    fontFamily={THEME.fonts.data}
                    fontSize={28}
                    fontWeight={700}
                    fill={() => (ladderStep() >= b.step ? THEME.colors.surface : THEME.colors.secondaryInk)}
                  />
                </Rect>
              ))}
            </Rect>

            <Rect
              layout
              width={'100%'}
              direction={'row'}
              justifyContent={'space-between'}
              alignItems={'baseline'}
            >
              <Txt
                text={'TAX OWED'}
                fontFamily={THEME.fonts.data}
                fontSize={24}
                fontWeight={700}
                fill={THEME.colors.secondaryInk}
                letterSpacing={1.2}
              />
              <LiveCounter
                value={offshoreTaxCounter}
                prefix={'RP '}
                fontSize={56}
                fontWeight={700}
                fill={THEME.colors.accent}
              />
            </Rect>

            <Rect
              layout
              width={'100%'}
              height={22}
              fill={THEME.colors.bg}
              stroke={THEME.colors.gridLine}
              lineWidth={1}
              alignItems={'start'}
            >
              <Rect
                height={22}
                width={offshoreBarWidth}
                fill={THEME.colors.accent}
              />
            </Rect>
          </Rect>

          {/* Focal Element 3: Bottom 350x Tax Shock Badge */}
          <Rect
            layout
            direction={'row'}
            alignItems={'center'}
            justifyContent={'center'}
            width={920}
            padding={[20, 32]}
            fill={THEME.colors.accent}
            opacity={badgeOpacity}
            scale={() => focalScale(focalId, 3, badgeScale, time)}
            rotation={() => focalRotation(focalId, 3, time)}
          >
            <Txt
              text={'350x TAX SHOCK'}
              fontFamily={THEME.fonts.heading}
              fontSize={44}
              fontWeight={700}
              fill={THEME.colors.surface}
              letterSpacing={2}
            />
          </Rect>
        </Rect>
      </Node>
    </Node>
  );

  // --- Visual Choreography Synced to Beat 1 Audio (27.22s) ---

  // t = 0.0s (focalId = 1): Card 1 (IDX: BCA) is visible with domesticTaxCounter starting at 0
  // Intermediate micro-choreography at t = 2.4s: 0.1% FINAL TAX badge pulse (scale: 1.0 -> 1.12 -> 1.0)
  yield* waitUntilSceneTime(2.4, t0);
  yield* domesticBadgeScale(1.12, 0.15, easeOutExpo).to(1.0, 0.2, easeInOutCubic);

  // t = 4.6s ("0.1% or 1 million rupiah"): Snappy 1.2s ticker
  yield* waitUntilSceneTime(4.6, t0);
  yield* all(
    domesticTaxCounter(1000000, 1.2, easeOutExpo),
    domesticBarWidth(140, 1.2, easeOutExpo),
  );

  // t = 9.2s (focalId = 2, "Sell that exact same gain on Apple or the S&P 500"):
  // Dim Card 1 (stops wobbling) & reveal Card 2 (starts slow wobble). Keep offshoreTaxCounter at 0!
  yield* waitUntilSceneTime(9.2, t0);
  focalId(2);
  yield* all(
    upperCardOpacity(0.35, 0.45, easeInOutCubic),
    upperCardStroke(THEME.colors.gridLine, 0.45),
    lowerCardOpacity(1.0, 0.45, easeOutExpo),
    lowerCardScale(1.0, 0.45, easeOutExpo),
  );

  // Intermediate micro-choreography at t = 11.8s: UP TO 35% badge pulse (scale: 1.0 -> 1.12 -> 1.0)
  yield* waitUntilSceneTime(11.8, t0);
  yield* offshoreBadgeScale(1.12, 0.15, easeOutExpo).to(1.0, 0.2, easeInOutCubic);

  // t = 14.5s ("Indonesia's worldwide tax rules kick in"):
  // Pulse/highlight regime badge on Card 2 (UU HPP // ORDINARY INCOME, 0.35s pulse)
  yield* waitUntilSceneTime(14.5, t0);
  yield* all(
    regimeScale(1.08, 0.15, easeOutExpo).to(1.0, 0.2, easeInOutCubic),
    regimeBg(THEME.colors.ink, 0.2),
    regimeStroke(THEME.colors.accent, 0.2),
    regimeTextColor(THEME.colors.surface, 0.2),
  );

  // Intermediate micro-choreography at t = 17.0s: regime badge pulse (scale: 1.0 -> 1.12 -> 1.0)
  yield* waitUntilSceneTime(17.0, t0);
  yield* regimeScale(1.12, 0.15, easeOutExpo).to(1.0, 0.2, easeInOutCubic);

  // t = 19.5s to 22.3s ("Taxed progressively up to 35%"):
  // Step ladderStep 1 -> 5 at 19.5s, 20.2s, 20.9s, 21.6s, 22.3s
  yield* waitUntilSceneTime(19.5, t0);
  yield* ladderStep(1, 0.25, easeOutExpo);

  yield* waitUntilSceneTime(20.2, t0);
  yield* ladderStep(2, 0.25, easeOutExpo);

  yield* waitUntilSceneTime(20.9, t0);
  yield* ladderStep(3, 0.25, easeOutExpo);

  yield* waitUntilSceneTime(21.6, t0);
  yield* ladderStep(4, 0.25, easeOutExpo);

  // t = 22.3s (right when 35% lights up): Fast, punchy 1.4s ticker
  yield* waitUntilSceneTime(22.3, t0);
  yield* all(
    ladderStep(5, 0.25, easeOutExpo),
    offshoreTaxCounter(350000000, 1.4, easeOutExpo),
    offshoreBarWidth(780, 1.4, easeOutExpo),
  );

  // t = 24.4s (focalId = 3, "that's a 350 times tax shock"): Reveal & focus 350x badge
  yield* waitUntilSceneTime(24.4, t0);
  focalId(3);
  yield* all(
    lowerCardOpacity(0.45, 0.35, easeInOutCubic),
    badgeOpacity(1.0, 0.25, easeOutExpo),
    badgeScale(1.08, 0.22, easeOutExpo).to(1.0, 0.3, easeInOutCubic),
  );

  // Hold until beat 1 completes at exactly 27.22s
  yield* finishSceneAt(27.22, t0);
});
