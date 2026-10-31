import { Img, makeScene2D, Node, Rect, Txt } from '@motion-canvas/2d';
import { all, createRef, createSignal, easeInOutCubic, easeOutExpo, useThread } from '@motion-canvas/core';
import { COLORS, FONTS, getAssets, getTypo, isWidescreen, setupBaseStage } from './layout';
import { finishSceneAt, focalScale, waitUntilSceneTime } from './timings';

const PALETTE = {
  cyan: '#0284C7',
  amber: '#D97706',
  crimson: '#DC2626',
  emerald: '#16A34A',
  ink: COLORS.ink,
  surface: COLORS.surface,
  bg: COLORS.bg,
  secondaryInk: COLORS.secondaryInk,
  gridLine: COLORS.gridLine,
};

export default makeScene2D(function* (view) {
  const time = useThread().time;
  const t0 = time();

  // Setup Swiss Base Stage (Grid lines, section indicator, subtitle pill)
  setupBaseStage(view, 'KNP? // 05: CEK FULL DI YT');

  const wide = isWidescreen(view);
  const baseTypo = getTypo(wide);
  const baseAssets = getAssets(wide);

  const typo = {
    ...baseTypo,
    heroTitle: wide ? 36 : 32,
    cardTitle: wide ? 28 : 28,
    cardSub: wide ? 17 : 19,
    badge: wide ? 16 : 18,
    pill: wide ? 18 : 20,
    sublabel: wide ? 16 : 18,
  };

  const assets = {
    ...baseAssets,
    badgeSquare: wide ? 42 : 48,
    heroIcon: wide ? 52 : 56,
  };

  const stackW = wide ? 1280 : 940;

  // Responsive Y positions
  const y1 = wide ? -180 : -220;
  const y2 = wide ? -25 : -25;
  const y3 = wide ? 145 : 185;
  const cardH = wide ? 135 : 175;
  const heroCardH = wide ? 160 : 205;

  // Animation signals
  const focalId = createSignal(0);

  const headerOpacity = createSignal(0);
  const headerScale = createSignal(0.95);

  // Card 1: Mystery Card 1 (Operasi Penyelamatan Bursa 2027)
  const c1Opacity = createSignal(0);
  const c1Scale = createSignal(0.92);
  const c1Stroke = createSignal<string>(PALETTE.gridLine);

  // Card 2: Mystery Card 2 (Kasus Nyata Argentina & Nigeria)
  const c2Opacity = createSignal(0);
  const c2Scale = createSignal(0.92);
  const c2Stroke = createSignal<string>(PALETTE.gridLine);

  // Card 3: Hero CTA Card (Tonton Video Lengkap 9 Menit)
  const c3Opacity = createSignal(0);
  const c3Scale = createSignal(0.92);
  const c3Stroke = createSignal<string>(PALETTE.cyan);
  const ctaPulseScale = createSignal(1.0);
  const ctaBadgeBg = createSignal<string>(PALETTE.crimson);

  const camera = createRef<Node>();

  view.add(
    <Node ref={camera}>
      {/* ===== HEADER TITLE BLOCK ===== */}
      <Rect
        x={0}
        y={wide ? -350 : -620}
        opacity={headerOpacity}
        scale={headerScale}
        layout
        direction="column"
        alignItems="center"
        gap={wide ? 8 : 12}
      >
        <Rect
          layout
          padding={wide ? [6, 16] : [8, 18]}
          fill={PALETTE.crimson}
          radius={6}
        >
          <Txt
            text="CLIFFHANGER // KNP? EPISODE 01"
            fontFamily={FONTS.data}
            fontSize={typo.badge}
            fontWeight={700}
            fill={PALETTE.surface}
            letterSpacing={1.2}
          />
        </Rect>
        <Txt
          text="LANJUT DI YOUTUBE KAUSAL MEDIA"
          fontFamily={FONTS.heading}
          fontSize={typo.heroTitle}
          fontWeight={700}
          fill={PALETTE.ink}
        />
      </Rect>

      {/* ===== MYSTERY CARD 1: OPERASI PENYELAMATAN BURSA 2027 ===== */}
      <Rect
        y={y1}
        width={stackW}
        height={cardH}
        layout
        direction={wide ? 'row' : 'column'}
        justifyContent="space-between"
        alignItems={wide ? 'center' : 'stretch'}
        padding={wide ? [0, 32] : [18, 26]}
        fill={PALETTE.surface}
        stroke={c1Stroke}
        lineWidth={3.5}
        radius={12}
        opacity={c1Opacity}
        scale={() => focalScale(focalId, 1, c1Scale, time)}
      >
        {wide ? (
          <>
            <Rect layout direction="row" alignItems="center" gap={18}>
              <Rect layout padding={[6, 14]} fill={PALETTE.emerald} radius={6}>
                <Txt
                  text="MYSTERY PART #1"
                  fontFamily={FONTS.data}
                  fontSize={typo.badge}
                  fontWeight={700}
                  fill={PALETTE.surface}
                />
              </Rect>
              <Rect layout direction="column" gap={4}>
                <Txt
                  text="OPERASI PENYELAMATAN BURSA 2027"
                  fontFamily={FONTS.heading}
                  fontSize={typo.cardTitle}
                  fontWeight={700}
                  fill={PALETTE.ink}
                />
                <Txt
                  text="BAGAIMANA CARA PEMERINTAH SELAMATKAN BURSA DARI BOIKOT DUNIA?"
                  fontFamily={FONTS.data}
                  fontSize={typo.cardSub}
                  fontWeight={600}
                  fill={PALETTE.secondaryInk}
                />
              </Rect>
            </Rect>

            <Rect
              layout
              padding={[8, 16]}
              fill={'#E8F5E9'}
              stroke={PALETTE.emerald}
              lineWidth={1.5}
              radius={8}
            >
              <Txt
                text="ATURAN BARU 15% & >1%"
                fontFamily={FONTS.data}
                fontSize={typo.pill}
                fontWeight={700}
                fill={PALETTE.emerald}
              />
            </Rect>
          </>
        ) : (
          <Rect layout direction="column" justifyContent="space-between" width="100%" height="100%">
            <Rect layout direction="row" justifyContent="space-between" alignItems="center">
              <Rect layout padding={[4, 10]} fill={PALETTE.emerald} radius={4}>
                <Txt
                  text="MYSTERY PART #1"
                  fontFamily={FONTS.data}
                  fontSize={typo.badge}
                  fontWeight={700}
                  fill={PALETTE.surface}
                />
              </Rect>

              <Rect
                layout
                padding={[5, 12]}
                fill={'#E8F5E9'}
                stroke={PALETTE.emerald}
                lineWidth={1.5}
                radius={6}
              >
                <Txt
                  text="ATURAN BARU 15% & >1%"
                  fontFamily={FONTS.data}
                  fontSize={typo.badge}
                  fontWeight={700}
                  fill={PALETTE.emerald}
                />
              </Rect>
            </Rect>

            <Rect layout direction="column" gap={4}>
              <Txt
                text="OPERASI PENYELAMATAN BURSA 2027"
                fontFamily={FONTS.heading}
                fontSize={typo.cardTitle}
                fontWeight={700}
                fill={PALETTE.ink}
              />
              <Txt
                text="CARA PEMERINTAH SELAMATKAN BURSA DARI ANCAMAN BOIKOT"
                fontFamily={FONTS.data}
                fontSize={typo.cardSub}
                fontWeight={600}
                fill={PALETTE.secondaryInk}
              />
            </Rect>
          </Rect>
        )}
      </Rect>

      {/* ===== MYSTERY CARD 2: KASUS NYATA ARGENTINA & NIGERIA ===== */}
      <Rect
        y={y2}
        width={stackW}
        height={cardH}
        layout
        direction={wide ? 'row' : 'column'}
        justifyContent="space-between"
        alignItems={wide ? 'center' : 'stretch'}
        padding={wide ? [0, 32] : [18, 26]}
        fill={PALETTE.surface}
        stroke={c2Stroke}
        lineWidth={3.5}
        radius={12}
        opacity={c2Opacity}
        scale={() => focalScale(focalId, 2, c2Scale, time)}
      >
        {wide ? (
          <>
            <Rect layout direction="row" alignItems="center" gap={18}>
              <Rect layout padding={[6, 14]} fill={PALETTE.amber} radius={6}>
                <Txt
                  text="MYSTERY PART #2"
                  fontFamily={FONTS.data}
                  fontSize={typo.badge}
                  fontWeight={700}
                  fill={PALETTE.surface}
                />
              </Rect>
              <Rect layout direction="column" gap={4}>
                <Txt
                  text="KASUS NYATA ARGENTINA & NIGERIA"
                  fontFamily={FONTS.heading}
                  fontSize={typo.cardTitle}
                  fontWeight={700}
                  fill={PALETTE.ink}
                />
                <Txt
                  text="SAAT MODAL ASING KABUR TOTAL KARENA DIDEPAK KE ZONA ISOLASI"
                  fontFamily={FONTS.data}
                  fontSize={typo.cardSub}
                  fontWeight={600}
                  fill={PALETTE.secondaryInk}
                />
              </Rect>
            </Rect>

            <Rect
              layout
              padding={[8, 16]}
              fill={'#FEF3C7'}
              stroke={PALETTE.amber}
              lineWidth={1.5}
              radius={8}
            >
              <Txt
                text="DIDEPAK KE ZONA ISOLASI"
                fontFamily={FONTS.data}
                fontSize={typo.pill}
                fontWeight={700}
                fill={PALETTE.amber}
              />
            </Rect>
          </>
        ) : (
          <Rect layout direction="column" justifyContent="space-between" width="100%" height="100%">
            <Rect layout direction="row" justifyContent="space-between" alignItems="center">
              <Rect layout padding={[4, 10]} fill={PALETTE.amber} radius={4}>
                <Txt
                  text="MYSTERY PART #2"
                  fontFamily={FONTS.data}
                  fontSize={typo.badge}
                  fontWeight={700}
                  fill={PALETTE.surface}
                />
              </Rect>

              <Rect
                layout
                padding={[5, 12]}
                fill={'#FEF3C7'}
                stroke={PALETTE.amber}
                lineWidth={1.5}
                radius={6}
              >
                <Txt
                  text="DIDEPAK KE ZONA ISOLASI"
                  fontFamily={FONTS.data}
                  fontSize={typo.badge}
                  fontWeight={700}
                  fill={PALETTE.amber}
                />
              </Rect>
            </Rect>

            <Rect layout direction="column" gap={4}>
              <Txt
                text="KASUS NYATA ARGENTINA & NIGERIA"
                fontFamily={FONTS.heading}
                fontSize={typo.cardTitle}
                fontWeight={700}
                fill={PALETTE.ink}
              />
              <Txt
                text="SAAT MODAL ASING KABUR TOTAL & BURSA DITURUNKAN KASTA"
                fontFamily={FONTS.data}
                fontSize={typo.cardSub}
                fontWeight={600}
                fill={PALETTE.secondaryInk}
              />
            </Rect>
          </Rect>
        )}
      </Rect>

      {/* ===== CTA HERO CARD: TONTON VIDEO LENGKAP 9 MENIT ===== */}
      <Rect
        y={y3}
        width={stackW}
        height={heroCardH}
        layout
        direction={wide ? 'row' : 'column'}
        justifyContent="space-between"
        alignItems={wide ? 'center' : 'stretch'}
        padding={wide ? [0, 32] : [20, 26]}
        fill={PALETTE.surface}
        stroke={c3Stroke}
        lineWidth={4}
        radius={14}
        opacity={c3Opacity}
        scale={() => focalScale(focalId, 3, c3Scale, time)}
      >
        {wide ? (
          <>
            <Rect layout direction="row" alignItems="center" gap={18}>
              <Img
                src={'/assets/vid_20261031_001/shield_check_icon.png'}
                width={assets.heroIcon}
                height={assets.heroIcon}
              />
              <Rect layout direction="column" gap={4}>
                <Rect layout direction="row" alignItems="center" gap={10}>
                  <Rect layout padding={[4, 10]} fill={ctaBadgeBg} radius={4} scale={ctaPulseScale}>
                    <Txt
                      text="BEDAH PENUH // 9 MENIT"
                      fontFamily={FONTS.data}
                      fontSize={typo.badge}
                      fontWeight={700}
                      fill={PALETTE.surface}
                    />
                  </Rect>
                  <Txt
                    text="YOUTUBE: KAUSAL MEDIA"
                    fontFamily={FONTS.data}
                    fontSize={typo.badge}
                    fontWeight={700}
                    fill={PALETTE.cyan}
                  />
                </Rect>
                <Txt
                  text="TONTON VIDEO LENGKAP (9 MENIT)"
                  fontFamily={FONTS.heading}
                  fontSize={typo.cardTitle + 2}
                  fontWeight={800}
                  fill={PALETTE.ink}
                />
                <Txt
                  text="SERI KNP? EPISODE 01 // 3 CARA SIMPEL CEK SAHAM BIAR NGGAK NYANGKUT"
                  fontFamily={FONTS.data}
                  fontSize={typo.cardSub}
                  fontWeight={700}
                  fill={PALETTE.secondaryInk}
                />
              </Rect>
            </Rect>

            <Rect
              layout
              padding={[12, 24]}
              fill={PALETTE.cyan}
              radius={8}
              scale={ctaPulseScale}
            >
              <Txt
                text="▶ TONTON SEKARANG"
                fontFamily={FONTS.data}
                fontSize={typo.pill}
                fontWeight={700}
                fill={PALETTE.surface}
              />
            </Rect>
          </>
        ) : (
          <Rect layout direction="column" justifyContent="space-between" width="100%" height="100%">
            <Rect layout direction="row" justifyContent="space-between" alignItems="center">
              <Rect layout direction="row" alignItems="center" gap={10}>
                <Img
                  src={'/assets/vid_20261031_001/shield_check_icon.png'}
                  width={assets.badgeSquare}
                  height={assets.badgeSquare}
                />
                <Rect layout padding={[5, 12]} fill={ctaBadgeBg} radius={4} scale={ctaPulseScale}>
                  <Txt
                    text="BEDAH PENUH // 9 MENIT"
                    fontFamily={FONTS.data}
                    fontSize={typo.badge}
                    fontWeight={700}
                    fill={PALETTE.surface}
                  />
                </Rect>
              </Rect>

              <Rect
                layout
                padding={[6, 14]}
                fill={PALETTE.cyan}
                radius={6}
                scale={ctaPulseScale}
              >
                <Txt
                  text="▶ KLIK LINK DI BIO"
                  fontFamily={FONTS.data}
                  fontSize={typo.pill}
                  fontWeight={700}
                  fill={PALETTE.surface}
                />
              </Rect>
            </Rect>

            <Rect layout direction="column" gap={4}>
              <Txt
                text="TONTON VIDEO LENGKAP (9 MENIT)"
                fontFamily={FONTS.heading}
                fontSize={typo.cardTitle + 2}
                fontWeight={800}
                fill={PALETTE.ink}
              />
              <Txt
                text="YOUTUBE: KAUSAL MEDIA — SERI KNP? EPISODE 01"
                fontFamily={FONTS.data}
                fontSize={typo.cardSub + 1}
                fontWeight={700}
                fill={PALETTE.cyan}
              />
            </Rect>
          </Rect>
        )}
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

  // t = 0.2s (global 77.92s, "Terus gimana cara pemerintah menyelamatkan bursa kita"):
  // Mystery Card 1 reveals
  yield* waitUntilSceneTime(0.2, t0);
  focalId(1);
  yield* all(
    c1Opacity(1, 0.4),
    c1Scale(1.0, 0.45, easeOutExpo),
    c1Stroke(PALETTE.emerald, 0.4),
  );

  // t = 4.6s (global 82.32s, "dan tiga cara simpel mengecek saham biar tabunganmu nggak ikut nyangkut?"):
  // Mystery Card 2 reveals
  yield* waitUntilSceneTime(4.6, t0);
  focalId(2);
  yield* all(
    c2Opacity(1, 0.4),
    c2Scale(1.0, 0.45, easeOutExpo),
    c2Stroke(PALETTE.amber, 0.4),
  );

  // t = 7.7s (global 85.42s, "Tonton bedah lengkapnya di YouTube Kausal Media sekarang!"):
  // CTA Hero Card reveals with cyan stroke
  yield* waitUntilSceneTime(7.7, t0);
  focalId(3);
  yield* all(
    c3Opacity(1, 0.4),
    c3Scale(1.0, 0.45, easeOutExpo),
    c3Stroke(PALETTE.cyan, 0.4),
  );

  // t = 8.6s: Dramatic CTA Hero Pulse (Crimson & Cyan alternating pulse)
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

  // Strict Hold-Time: Diagram holds until 10.79s (global 88.51s)
  yield* finishSceneAt(10.79, t0);
});
