import { Img, Line, makeScene2D, Node, Rect, Txt } from '@motion-canvas/2d';
import {
  all,
  createSignal,
  easeOutCubic,
  easeOutExpo,
  useThread,
} from '@motion-canvas/core';
import {
  BEAT_LABELS,
  FONTS,
  HEADING_FONT,
  PALETTE,
  createEditorialStage,
} from './layout';
import {
  finishSceneAt,
  focalRotation,
  focalScale,
  SCENE_TIMINGS,
  waitUntilSceneTime,
} from './timings';

export default makeScene2D(function* (view) {
  const time = useThread().time;
  const t0 = time();

  // Setup Swiss Base Stage (Brow badge, subtitles, grid)
  const stage = createEditorialStage(view, BEAT_LABELS[2]);

  // Animation signals
  const focalId = createSignal(0);
  const leftCardOpacity = createSignal(0);
  const leftCardScale = createSignal(0.92);
  const leftBadgeScale = createSignal(0);
  const rulePulse = createSignal(0);

  const rightCardOpacity = createSignal(0);
  const rightCardScale = createSignal(0.92);
  const chartAxesProgress = createSignal(0);

  const barCoffeeW = createSignal(0);
  const rowCoffeeOpacity = createSignal(0);

  const barBiliarW = createSignal(0);
  const rowBiliarOpacity = createSignal(0);

  const barMahjongW = createSignal(0);
  const rowMahjongOpacity = createSignal(0);
  const bannerOpacity = createSignal(0);

  // Grid line X positions for 1h, 2h, 3h, 4h, 5h (shifted +30px to match Y-axis at x=-210)
  const gridHours = [
    { x: -100, h: '1J' },
    { x: 10, h: '2J' },
    { x: 120, h: '3J' },
    { x: 230, h: '4J' },
    { x: 340, h: '5J' },
  ];

  view.add(
    <Node ref={stage}>
      {/* ===== LEFT CARD: CLOCK & RETENTION LOCK-IN ===== */}
      <Rect
        x={-440}
        y={-30}
        width={760}
        height={640}
        fill={PALETTE.surface}
        stroke={focalId() === 1 ? PALETTE.emerald : PALETTE.cardBorder}
        lineWidth={3}
        radius={18}
        opacity={leftCardOpacity}
        scale={() => focalScale(focalId, 1, leftCardScale, time)}
        rotation={() => focalRotation(focalId, 1, time)}
      >
        {/* Top Floating Badge */}
        <Rect
          x={0}
          y={-270}
          layout={true}
          padding={[8, 20]}
          radius={8}
          fill={PALETTE.emeraldBg}
          stroke={PALETTE.emerald}
          lineWidth={2}
          scale={leftBadgeScale}
        >
          <Txt
            text="THE 5-HOUR RETENTION LOCK"
            fontFamily={HEADING_FONT}
            fontSize={20}
            fontWeight={800}
            fill={PALETTE.emerald}
          />
        </Rect>

        {/* AI-Illustrated Clock Asset */}
        <Img
          src={'/assets/vid_20261102_001/beat03_clock_lockin.png'}
          x={0}
          y={-20}
          width={440}
          height={440}
          radius={14}
          scale={() => 1 + Math.sin(time() * 0.8) * 0.012}
        />

        {/* Bottom Rules */}
        <Rect
          x={0}
          y={240}
          layout={true}
          direction={'column'}
          alignItems={'center'}
          gap={6}
        >
          <Txt
            text="4 Putaran Angin = 16 Ronde"
            fontFamily={HEADING_FONT}
            fontSize={24}
            fontWeight={800}
            fill={PALETTE.ink}
            scale={() => 1 + rulePulse() * 0.05}
          />
          <Txt
            text="Pantang Pulang Sebelum Ronde Selesai"
            fontFamily={FONTS.body}
            fontSize={18}
            fontWeight={600}
            fill={rulePulse() > 0 ? PALETTE.crimson : PALETTE.muted}
          />
        </Rect>
      </Rect>

      {/* ===== RIGHT CARD: HORIZONTAL DURATION LOCK-IN BAR CHART ===== */}
      <Rect
        x={420}
        y={-30}
        width={820}
        height={640}
        fill={PALETTE.surface}
        stroke={focalId() === 2 ? PALETTE.emerald : PALETTE.cardBorder}
        lineWidth={3}
        radius={18}
        opacity={rightCardOpacity}
        scale={() => focalScale(focalId, 2, rightCardScale, time)}
        rotation={() => focalRotation(focalId, 2, time)}
      >
        {/* Card Header */}
        <Rect
          x={0}
          y={-265}
          layout={true}
          direction={'column'}
          alignItems={'center'}
          gap={4}
        >
          <Txt
            text="DURASI RETENSI // KOMPARASI BISNIS"
            fontFamily={HEADING_FONT}
            fontSize={26}
            fontWeight={800}
            fill={PALETTE.ink}
          />
          <Txt
            text="Customer Lock-in Time vs Revenue per Visit"
            fontFamily={FONTS.body}
            fontSize={18}
            fontWeight={600}
            fill={PALETTE.muted}
          />
        </Rect>

        {/* Enclosed Chart Area */}
        <Rect
          x={0}
          y={20}
          width={760}
          height={480}
          fill={'#F8FAFC'}
          stroke={'#E2E8F0'}
          lineWidth={2}
          radius={14}
        >
          {/* Dashed Grid Lines for 1h to 5h */}
          {gridHours.map((g) => (
            <Line
              key={`grid-${g.h}`}
              points={[
                [g.x, 140],
                [g.x, -170],
              ]}
              stroke={'#CBD5E1'}
              lineWidth={1.5}
              lineDash={[5, 5]}
              opacity={chartAxesProgress}
            />
          ))}

          {/* Chart Axes with Arrows */}
          <Line
            points={[
              [-210, 140],
              [350, 140],
            ]}
            stroke={'#64748B'}
            lineWidth={2.5}
            end={chartAxesProgress}
            endArrow={true}
            arrowSize={8}
          />
          <Line
            points={[
              [-210, 140],
              [-210, -180],
            ]}
            stroke={'#64748B'}
            lineWidth={2.5}
            end={chartAxesProgress}
            endArrow={true}
            arrowSize={8}
          />

          {/* Row 1: COFFEESHOP */}
          <Node opacity={rowCoffeeOpacity}>
            <Txt
              x={-230}
              y={-120}
              offsetX={1}
              text="COFFEESHOP"
              fontFamily={HEADING_FONT}
              fontSize={18}
              fontWeight={800}
              fill={PALETTE.muted}
            />
            <Rect
              x={() => -208 + barCoffeeW() / 2}
              y={-120}
              width={barCoffeeW}
              height={32}
              fill={'#94A3B8'}
              radius={[0, 8, 8, 0]}
            />
            <Txt
              x={145}
              y={-120}
              text="1-2 Jam // 1 Kopi Rp35.000"
              fontFamily={FONTS.body}
              fontSize={18}
              fontWeight={600}
              fill={PALETTE.ink}
            />
          </Node>

          {/* Row 2: BILIAR / PADEL */}
          <Node opacity={rowBiliarOpacity}>
            <Txt
              x={-230}
              y={-30}
              offsetX={1}
              text="BILIAR / PADEL"
              fontFamily={HEADING_FONT}
              fontSize={18}
              fontWeight={800}
              fill={PALETTE.muted}
            />
            <Rect
              x={() => -208 + barBiliarW() / 2}
              y={-30}
              width={barBiliarW}
              height={32}
              fill={'#F59E0B'}
              radius={[0, 8, 8, 0]}
            />
            <Txt
              x={145}
              y={-30}
              text="1-2 Jam // Cepat Bubar"
              fontFamily={FONTS.body}
              fontSize={18}
              fontWeight={600}
              fill={PALETTE.ink}
            />
          </Node>

          {/* Row 3: MEJA MAHJONG */}
          <Node opacity={rowMahjongOpacity}>
            <Txt
              x={-230}
              y={60}
              offsetX={1}
              text="MEJA MAHJONG"
              fontFamily={HEADING_FONT}
              fontSize={18}
              fontWeight={800}
              fill={PALETTE.emerald}
            />
            <Rect
              x={() => -208 + barMahjongW() / 2}
              y={60}
              width={barMahjongW}
              height={42}
              fill={PALETTE.emerald}
              radius={[0, 10, 10, 0]}
            />
            <Txt
              x={45}
              y={105}
              text="4 ORANG TERKUNCI 5 JAM NON-STOP!"
              fontFamily={HEADING_FONT}
              fontSize={20}
              fontWeight={800}
              fill={PALETTE.emerald}
            />
          </Node>

          {/* Bottom Highlight Callout Banner */}
          <Rect
            x={0}
            y={190}
            width={720}
            height={65}
            fill={PALETTE.emeraldBg}
            stroke={PALETTE.emerald}
            lineWidth={2}
            radius={10}
            opacity={bannerOpacity}
          >
            <Rect
              x={0}
              y={0}
              layout={true}
              direction={'column'}
              alignItems={'center'}
              gap={3}
            >
              <Txt
                text="TOTAL 20 MAN-HOURS KONSUMSI // MESIN CUAN F&B"
                fontFamily={HEADING_FONT}
                fontSize={18}
                fontWeight={800}
                fill={PALETTE.emerald}
              />
              <Txt
                text="Pemain Wajib Komplit 4 Orang Tanpa Boleh Kabur"
                fontFamily={FONTS.body}
                fontSize={18}
                fontWeight={600}
                fill={PALETTE.ink}
              />
            </Rect>
          </Rect>
        </Rect>
      </Rect>
    </Node>
  );

  // --- Choreography Sequence (Scene 03 Total duration: 48.27s) ---
  const sceneStart = SCENE_TIMINGS[2].start; // 110.622
  const sceneDuration = SCENE_TIMINGS[2].duration; // 48.271
  const rel = (absSec: number) => absSec - sceneStart;

  // t = 0.3s: Left Card enters with clock lock-in illustration
  yield* waitUntilSceneTime(0.3, t0);
  focalId(1);
  yield* all(
    leftCardOpacity(1, 0.6, easeOutExpo),
    leftCardScale(1, 0.6, easeOutExpo),
  );

  // t = 5.0s: "senjata paling mematikan dari bisnis ini: durasi retensi pelanggan"
  yield* waitUntilSceneTime(rel(115.6), t0);
  yield* leftBadgeScale(1, 0.5, easeOutExpo);

  // t = 8.0s: "Kalau lo buka kafe kopi kekinian... satu cangkir kopi Rp35rb..."
  yield* waitUntilSceneTime(rel(118.5), t0);
  focalId(2);
  yield* all(
    rightCardOpacity(1, 0.6, easeOutExpo),
    rightCardScale(1, 0.6, easeOutExpo),
    chartAxesProgress(1, 0.6, easeOutExpo),
    rowCoffeeOpacity(1, 0.4, easeOutExpo),
  );
  yield* barCoffeeW(140, 0.8, easeOutExpo);

  // t = 17.0s: "Kalau lo buka arena biliar... 1 sampai 2 jam langsung bubar..."
  yield* waitUntilSceneTime(rel(127.6), t0);
  yield* rowBiliarOpacity(1, 0.4, easeOutExpo);
  yield* barBiliarW(180, 0.8, easeOutExpo);

  // t = 26.0s: "aturan sakral: 4 putaran angin... 16 ronde..."
  yield* waitUntilSceneTime(rel(136.5), t0);
  focalId(1);
  yield* rulePulse(1, 0.3, easeOutCubic).to(0, 0.3, easeOutCubic);

  // t = 36.0s: "wajib tepat 4 orang duduk bersama, tidak ada yang boleh pulang duluan..."
  yield* waitUntilSceneTime(rel(146.5), t0);
  focalId(2);
  yield* rowMahjongOpacity(1, 0.4, easeOutExpo);
  yield* barMahjongW(520, 1.2, easeOutExpo);

  // t = 43.0s: "otomatis terkunci duduk di meja lo selama 4 sampai 5 jam penuh..."
  yield* waitUntilSceneTime(rel(153.5), t0);
  yield* bannerOpacity(1, 0.4, easeOutExpo);

  // Strict Hold-Time: Diagram remains fully visible until 48.27s (>= 2.7s hold)
  yield* finishSceneAt(sceneDuration, t0);
});
