import { makeScene2D, Node, Rect, Txt } from '@motion-canvas/2d';
import { all, createRef, createSignal, easeOutExpo, useThread } from '@motion-canvas/core';
import { setupBaseStage, isWidescreen, getTypo, getAssets, COLORS, FONTS, BEAT_LABELS } from './layout';
import { SCENE_TIMINGS, finishSceneAt, waitUntilSceneTime } from './timings';

export default makeScene2D(function* (view) {
  const time = useThread().time;
  const t0 = time();

  // Setup Swiss Base Stage (Grid lines, top navigation pill bar, section indicator, subtitle pill)
  setupBaseStage(view, BEAT_LABELS[0]);

  const wide = isWidescreen(view);
  const typo = getTypo(wide);
  const assets = getAssets(wide);
  const sceneDuration = SCENE_TIMINGS[0].duration;

  const stage = createRef<Node>();
  const cardOpacity = createSignal(0);
  const cardScale = createSignal(0.92);

  view.add(
    <Node ref={stage}>
      <Rect
        x={0}
        y={wide ? -30 : -60}
        width={wide ? 880 : 940}
        height={wide ? 420 : 540}
        radius={16}
        fill={COLORS.surface}
        stroke={COLORS.ink}
        lineWidth={assets.strokePrimary}
        opacity={cardOpacity}
        scale={cardScale}
        layout
        direction={'column'}
        justifyContent={'center'}
        alignItems={'center'}
        padding={[30, 40]}
        gap={20}
      >
        <Txt
          text="KNP? // 01: SAHAM TECH RUNTUH"
          fontFamily={FONTS.data}
          fontSize={typo.cardTitle}
          fontWeight={700}
          fill={COLORS.accent}
          letterSpacing={1.2}
        />
        <Txt
          text="MENGAPA RAKSASA TEKNOLOGI ANJLOK BERJAMAAH?"
          fontFamily={FONTS.heading}
          fontSize={typo.heading}
          fontWeight={700}
          fill={COLORS.ink}
          textAlign={'center'}
        />
      </Rect>
    </Node>
  );

  yield* waitUntilSceneTime(0.3, t0);
  yield* all(
    cardOpacity(1, 0.5, easeOutExpo),
    cardScale(1, 0.5, easeOutExpo),
  );

  yield* finishSceneAt(sceneDuration, t0);
});
