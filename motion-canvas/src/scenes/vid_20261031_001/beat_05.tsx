import { makeScene2D, Node, Rect, Txt } from '@motion-canvas/2d';
import {
  all,
  createRef,
  createSignal,
  easeInOutCubic,
  easeOutExpo,
  useThread,
} from '@motion-canvas/core';
import {
  COLORS,
  FONTS,
  getAssets,
  getTypo,
  isWidescreen,
  setupBaseStage,
} from './layout';
import { finishSceneAt, focalScale, waitUntilSceneTime } from './timings';

const PALETTE = {
  cyan: '#0284C7',
  amber: '#D97706',
  crimson: '#DC2626',
  emerald: '#16A34A',
  ink: COLORS.ink,
  surface: COLORS.surface,
  bg: COLORS.bg,
  secondaryInk: '#334155',
  gridLine: COLORS.gridLine,
};

export default makeScene2D(function* (view) {
  const time = useThread().time;
  const t0 = time();

  // Setup Swiss Base Stage (Grid lines, section indicator, subtitle pill)
  setupBaseStage(view, 'KNP? // 05: CEK FULL DI YT');

  const wide = isWidescreen(view);
  const typo = getTypo(wide);
  const assets = getAssets(wide);

  const stackW = wide ? 1100 : 900;

  // Responsive Y positions
  const y1 = wide ? -160 : -220;
  const y2 = wide ? -10 : -45;
  const y3 = wide ? 170 : 160;
  const cardH = wide ? 130 : 145;
  const heroCardH = wide ? 170 : 200;

  // Animation signals
  const focalId = createSignal(0);

  const headerOpacity = createSignal(0);
  const headerScale = createSignal(0.95);

  // Card 1: Mystery Card 1 (Operasi Penyelamatan Bursa)
  const c1Opacity = createSignal(0);
  const c1Scale = createSignal(0.92);
  const c1Stroke = createSignal<string>(PALETTE.gridLine);

  // Card 2: Mystery Card 2 (Kasus Argentina & Nigeria)
  const c2Opacity = createSignal(0);
  const c2Scale = createSignal(0.92);
  const c2Stroke = createSignal<string>(PALETTE.gridLine);

  // Card 3: Hero CTA Card (Tonton Video Lengkap)
  const c3Opacity = createSignal(0);
  const c3Scale = createSignal(0.92);
  const c3Stroke = createSignal<string>(PALETTE.cyan);
  const ctaPulseScale = createSignal(1.0);
  const ctaBadgeBg = createSignal<string>(PALETTE.crimson);

  const camera = createRef<Node>();

  view.add(
    <Node ref={camera}>
      {/* ===== HEADER TITLE BLOCK (Eyebrow pill removed) ===== */}
      <Rect
        x={0}
        y={wide ? -350 : -620}
        opacity={headerOpacity}
        scale={headerScale}
        layout
        direction="column"
        alignItems="center"
      >
        <Txt
          text="LANJUT DI YOUTUBE KAUSAL MEDIA"
          fontFamily={FONTS.heading}
          fontSize={wide ? 38 : 34}
          fontWeight={800}
          fill={PALETTE.ink}
        />
      </Rect>

      {/* ===== CARD 1: OPERASI PENYELAMATAN BURSA ===== */}
      <Rect
        y={y1}
        width={stackW}
        height={cardH}
        layout
        direction="column"
        justifyContent="center"
        padding={wide ? [0, 32] : [16, 24]}
        gap={10}
        fill={PALETTE.surface}
        stroke={c1Stroke}
        lineWidth={3.5}
        radius={14}
        opacity={c1Opacity}
        scale={() => focalScale(focalId, 1, c1Scale, time)}
      >
        <Rect layout direction="row" justifyContent="space-between" alignItems="center">
          <Txt
            text="OPERASI PENYELAMATAN BURSA"
            fontFamily={FONTS.heading}
            fontSize={wide ? 26 : 24}
            fontWeight={800}
            fill={PALETTE.ink}
          />
          <Rect layout padding={[5, 12]} fill={PALETTE.emerald} radius={6}>
            <Txt
              text="PART #1"
              fontFamily={FONTS.data}
              fontSize={16}
              fontWeight={700}
              fill={PALETTE.surface}
            />
          </Rect>
        </Rect>
        <Txt
          text="CARA PEMERINTAH HINDARI BOIKOT DUNIA"
          fontFamily={FONTS.data}
          fontSize={wide ? 16 : 16}
          fontWeight={700}
          fill={PALETTE.secondaryInk}
        />
      </Rect>

      {/* ===== CARD 2: KASUS ARGENTINA & NIGERIA ===== */}
      <Rect
        y={y2}
        width={stackW}
        height={cardH}
        layout
        direction="column"
        justifyContent="center"
        padding={wide ? [0, 32] : [16, 24]}
        gap={10}
        fill={PALETTE.surface}
        stroke={c2Stroke}
        lineWidth={3.5}
        radius={14}
        opacity={c2Opacity}
        scale={() => focalScale(focalId, 2, c2Scale, time)}
      >
        <Rect layout direction="row" justifyContent="space-between" alignItems="center">
          <Txt
            text="KASUS ARGENTINA & NIGERIA"
            fontFamily={FONTS.heading}
            fontSize={wide ? 26 : 24}
            fontWeight={800}
            fill={PALETTE.ink}
          />
          <Rect layout padding={[5, 12]} fill={PALETTE.amber} radius={6}>
            <Txt
              text="PART #2"
              fontFamily={FONTS.data}
              fontSize={16}
              fontWeight={700}
              fill={PALETTE.surface}
            />
          </Rect>
        </Rect>
        <Txt
          text="SAAT MODAL ASING KABUR & BURSA DITURUNKAN"
          fontFamily={FONTS.data}
          fontSize={wide ? 16 : 16}
          fontWeight={700}
          fill={PALETTE.secondaryInk}
        />
      </Rect>

      {/* ===== CARD 3: HERO CTA CARD ===== */}
      <Rect
        y={y3}
        width={stackW}
        height={heroCardH}
        layout
        direction="column"
        justifyContent="space-between"
        padding={wide ? [20, 32] : [20, 24]}
        fill={PALETTE.surface}
        stroke={c3Stroke}
        lineWidth={4}
        radius={16}
        opacity={c3Opacity}
        scale={() => focalScale(focalId, 3, c3Scale, time)}
      >
        <Rect layout direction="row" justifyContent="space-between" alignItems="center">
          <Rect layout padding={[5, 12]} fill={ctaBadgeBg} radius={6} scale={ctaPulseScale}>
            <Txt
              text="BEDAH PENUH 9 MENIT"
              fontFamily={FONTS.data}
              fontSize={16}
              fontWeight={700}
              fill={PALETTE.surface}
            />
          </Rect>
          <Rect layout padding={[6, 16]} fill={PALETTE.cyan} radius={8} scale={ctaPulseScale}>
            <Txt
              text="▶ KLIK LINK DI BIO"
              fontFamily={FONTS.data}
              fontSize={17}
              fontWeight={700}
              fill={PALETTE.surface}
            />
          </Rect>
        </Rect>
        <Rect layout direction="column" gap={6}>
          <Txt
            text="TONTON VIDEO LENGKAP"
            fontFamily={FONTS.heading}
            fontSize={wide ? 30 : 28}
            fontWeight={800}
            fill={PALETTE.ink}
          />
          <Txt
            text="YOUTUBE: KAUSAL MEDIA // EPISODE 01"
            fontFamily={FONTS.data}
            fontSize={wide ? 16 : 16}
            fontWeight={700}
            fill={PALETTE.cyan}
          />
        </Rect>
      </Rect>
    </Node>
  );

  // --- Choreography & Sync (Duration: 10.79s, global: 77.72s - 88.51s) ---

  // t = 0.1s: Header block enters
  yield* waitUntilSceneTime(0.1, t0);
  yield* all(
    headerOpacity(1, 0.3),
    headerScale(1.0, 0.35, easeOutExpo),
  );

  // Stacked Top-to-Bottom: Card 1 -> Card 2 -> Card 3
  // t = 0.2s: Mystery Card 1 reveals
  yield* waitUntilSceneTime(0.2, t0);
  focalId(1);
  yield* all(
    c1Opacity(1, 0.4),
    c1Scale(1.0, 0.45, easeOutExpo),
    c1Stroke(PALETTE.emerald, 0.4),
  );

  // t = 4.6s: Mystery Card 2 reveals
  yield* waitUntilSceneTime(4.6, t0);
  focalId(2);
  yield* all(
    c2Opacity(1, 0.4),
    c2Scale(1.0, 0.45, easeOutExpo),
    c2Stroke(PALETTE.amber, 0.4),
  );

  // t = 7.7s: CTA Hero Card reveals
  yield* waitUntilSceneTime(7.7, t0);
  focalId(3);
  yield* all(
    c3Opacity(1, 0.4),
    c3Scale(1.0, 0.45, easeOutExpo),
    c3Stroke(PALETTE.cyan, 0.4),
  );

  // t = 8.6s: Dramatic CTA Hero Pulse
  yield* waitUntilSceneTime(8.6, t0);
  yield* all(
    c3Stroke(PALETTE.crimson, 0.25).to(PALETTE.cyan, 0.25).to(PALETTE.crimson, 0.25),
    ctaPulseScale(1.06, 0.2, easeOutExpo).to(1.0, 0.18, easeInOutCubic),
    ctaBadgeBg(PALETTE.crimson, 0.2).to(PALETTE.amber, 0.2).to(PALETTE.crimson, 0.2),
  );

  // t = 9.8s: Second CTA pulse before hold
  yield* waitUntilSceneTime(9.8, t0);
  yield* all(
    ctaPulseScale(1.08, 0.2, easeOutExpo).to(1.0, 0.18, easeInOutCubic),
  );

  // Strict Hold-Time: Diagram holds until 10.79s
  yield* finishSceneAt(10.79, t0);
});
