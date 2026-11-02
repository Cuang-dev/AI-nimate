import { Line, makeScene2D, Node, Rect, Txt } from '@motion-canvas/2d';
import { all, createRef, createSignal, easeInOutCubic, easeOutCubic, useThread } from '@motion-canvas/core';
import { COLORS, FONTS, getAssets, getTypo, isWidescreen, setupBaseStage } from './layout';
import { finishSceneAt, SCENE_TIMINGS, waitUntilSceneTime } from './timings';

export default makeScene2D(function* (view) {
  // Setup Swiss Editorial Base Stage
  setupBaseStage(view, 'KNP? // 02: 4 KASTA BURSA & BUKTI ARGENTINA/NIGERIA');

  const wide = isWidescreen(view);
  const typo = getTypo(wide);
  const assets = getAssets(wide);

  const stage = createRef<Node>();
  const cardRef = createRef<Rect>();
  const cardScale = createSignal(0.96);
  const cardOpacity = createSignal(0);

  view.add(
    <Node ref={stage}>
      <Rect
        ref={cardRef}
        x={0}
        y={wide ? -30 : -40}
        width={wide ? 1200 : 940}
        height={wide ? 540 : 680}
        radius={16}
        fill={COLORS.surface}
        stroke={COLORS.ink}
        lineWidth={assets.strokePrimary}
        opacity={() => cardOpacity()}
        scale={() => cardScale()}
        layout
        direction={'column'}
        padding={wide ? [48, 56] : [40, 36]}
        justifyContent={'space-between'}
      >
        <Rect layout direction={'row'} alignItems={'center'} gap={12}>
          <Rect
            width={12}
            height={12}
            radius={6}
            fill={COLORS.accent}
          />
          <Txt
            text={'02: 4 KASTA BURSA & BUKTI ARGENTINA/NIGERIA'}
            fontFamily={FONTS.data}
            fontSize={wide ? 18 : 22}
            fontWeight={700}
            fill={COLORS.secondaryInk}
            letterSpacing={1.2}
          />
        </Rect>

        <Txt
          text={'02: 4 KASTA BURSA & BUKTI ARGENTINA/NIGERIA'}
          fontFamily={FONTS.heading}
          fontSize={wide ? 48 : 52}
          fontWeight={700}
          fill={COLORS.ink}
          lineHeight={wide ? 56 : 60}
        />

        <Txt
          text={'4 kasta ibarat liga sepak bola, melompati Liga Perintis ke Zona Isolasi, kasus nyata Argentina 2021 & Nigeria 2023'}
          fontFamily={FONTS.body}
          fontSize={wide ? 22 : 24}
          fontWeight={400}
          fill={COLORS.secondaryInk}
          lineHeight={wide ? 34 : 36}
        />
      </Rect>
    </Node>
  );

  yield* all(
    cardOpacity(1, 0.8, easeOutCubic),
    cardScale(1.0, 0.8, easeOutCubic)
  );

  const sceneDuration = SCENE_TIMINGS[1]?.duration ?? 20;
  yield* finishSceneAt(sceneDuration);
});
