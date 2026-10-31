import { Img, Line, makeScene2D, Node, Rect, Txt } from '@motion-canvas/2d';
import { all, createRef, createSignal, easeInOutCubic, easeOutExpo, useThread } from '@motion-canvas/core';
import { COLORS, FONTS, getAssets, getTypo, isWidescreen, setupBaseStage, BEAT_LABELS } from './layout';
import { finishSceneAt, focalScale, SCENE_TIMINGS, waitUntilSceneTime } from './timings';

const PALETTE = {
  cyan: '#0284C7',
  amber: '#D97706',
  crimson: '#DC2626',
  emerald: '#16A34A',
  accent: COLORS.accent,
  ink: COLORS.ink,
  surface: COLORS.surface,
  bg: COLORS.bg,
  secondaryInk: COLORS.secondaryInk,
  gridLine: COLORS.gridLine,
};

export default makeScene2D(function* (view) {
  const time = useThread().time;
  const t0 = time();

  // Setup Swiss Base Stage (Grid lines, top navigation pill bar, section indicator, subtitle pill)
  setupBaseStage(view, BEAT_LABELS[4]);

  const wide = isWidescreen(view);
  const baseTypo = getTypo(wide);
  const baseAssets = getAssets(wide);
  const sceneDuration = SCENE_TIMINGS[4].duration;

  const typo = {
    ...baseTypo,
    heroTitle: wide ? 38 : 34,
    cardTitle: wide ? 28 : 28,
    cardSub: wide ? 18 : 20,
    badge: wide ? 18 : 20,
    pill: wide ? 20 : 20,
  };

  const assets = {
    ...baseAssets,
    iconSize: wide ? 46 : 50,
  };

  const stackW = wide ? 1320 : 940;
  const cardH = wide ? 145 : 195;

  const y3 = wide ? -195 : -220;
  const y2 = wide ? -20 : 0;
  const y1 = wide ? 155 : 220;

  // Focal tracking signal (1: L1, 2: L2, 3: L3)
  const focalId = createSignal(0);

  const headerOpacity = createSignal(0);
  const headerScale = createSignal(0.95);

  // Layer 1 Signals (Bottom: Cek Realita)
  const l1Opacity = createSignal(0);
  const l1Scale = createSignal(0.94);

  // Layer 2 Signals (Middle: Cek Arus Kas)
  const l2Opacity = createSignal(0);
  const l2Scale = createSignal(0.94);

  // Layer 3 Signals (Top: Uji Daya Tahan)
  const l3Opacity = createSignal(0);
  const l3Scale = createSignal(0.94);
  const l3Stroke = createSignal<string>(PALETTE.amber);
  const l3PillBg = createSignal<string>(PALETTE.amber);
  const l3PillScale = createSignal(1.0);

  // Dependency arrow signals
  const arrow1Opacity = createSignal(0);
  const arrow2Opacity = createSignal(0);

  const camera = createRef<Node>();

  const arrow1Points: [number, number][] = [
    [0, y1 - cardH / 2 - 2],
    [0, y2 + cardH / 2 + 6],
  ];

  const arrow2Points: [number, number][] = [
    [0, y2 - cardH / 2 - 2],
    [0, y3 + cardH / 2 + 6],
  ];

  view.add(
    <Node ref={camera}>
      {/* ===== HEADER TITLE BLOCK ===== */}
      <Rect
        x={0}
        y={wide ? -370 : -620}
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
          fill={PALETTE.emerald}
          radius={6}
        >
          <Txt
            text="PANDUAN AMAN INVESTOR AWAM // 3 PRINSIP WAJIB"
            fontFamily={FONTS.data}
            fontSize={typo.badge}
            fontWeight={700}
            fill={PALETTE.surface}
            letterSpacing={1.2}
          />
        </Rect>
        <Txt
          text="3 CARA CEK SAHAM TEKNOLOGI"
          fontFamily={FONTS.heading}
          fontSize={typo.heroTitle}
          fontWeight={700}
          fill={PALETTE.ink}
        />
      </Rect>

      {/* ===== DEPENDENCY ARROWS (L1 -> L2 -> L3) ===== */}
      <Line
        points={arrow1Points}
        stroke={PALETTE.secondaryInk}
        lineWidth={3.5}
        lineDash={[6, 4]}
        endArrow
        arrowSize={12}
        opacity={arrow1Opacity}
      />
      <Line
        points={arrow2Points}
        stroke={PALETTE.secondaryInk}
        lineWidth={3.5}
        lineDash={[6, 4]}
        endArrow
        arrowSize={12}
        opacity={arrow2Opacity}
      />

      {/* ===== TIER 3 (TOP): UJI TANPA SUBSIDI DISKON ===== */}
      <Rect
        y={y3}
        width={stackW}
        height={cardH}
        layout
        direction={wide ? 'row' : 'column'}
        justifyContent="space-between"
        alignItems={wide ? 'center' : 'stretch'}
        padding={wide ? [0, 32] : [18, 24]}
        fill={PALETTE.surface}
        stroke={l3Stroke}
        lineWidth={3.5}
        radius={12}
        opacity={l3Opacity}
        scale={() => focalScale(focalId, 3, () => l3Scale(), time)}
      >
        {wide ? (
          <>
            <Rect layout direction="row" alignItems="center" gap={20}>
              <Rect layout padding={[6, 14]} fill={PALETTE.bg} radius={6}>
                <Txt
                  text="L3 // UJI DAYA TAHAN"
                  fontFamily={FONTS.data}
                  fontSize={typo.badge}
                  fontWeight={700}
                  fill={PALETTE.amber}
                />
              </Rect>
              <Img
                src={'/assets/vid_20261031_002/profit_shield_icon.png'}
                width={assets.iconSize}
                height={assets.iconSize}
              />
              <Rect layout direction="column" gap={4}>
                <Txt
                  text="TETAP LAKU WALAU TANPA DISKON"
                  fontFamily={FONTS.heading}
                  fontSize={typo.cardTitle}
                  fontWeight={700}
                  fill={PALETTE.ink}
                />
                <Txt
                  text="PRODUK KUAT DICARI ORANG MESKI PROMO GRATIS ONGKIR DISTOP"
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
              fill={l3PillBg}
              radius={8}
              scale={l3PillScale}
            >
              <Txt
                text="SEKARANG KAMU TAHU KNP?"
                fontFamily={FONTS.data}
                fontSize={typo.pill}
                fontWeight={700}
                fill={PALETTE.surface}
              />
            </Rect>
          </>
        ) : (
          <>
            <Rect layout direction="row" justifyContent="space-between" alignItems="center" width="100%">
              <Rect layout padding={[6, 14]} fill={PALETTE.bg} radius={6}>
                <Txt
                  text="L3 // UJI DAYA TAHAN"
                  fontFamily={FONTS.data}
                  fontSize={typo.badge}
                  fontWeight={700}
                  fill={PALETTE.amber}
                />
              </Rect>
              <Rect
                layout
                padding={[8, 16]}
                fill={l3PillBg}
                radius={8}
                scale={l3PillScale}
              >
                <Txt
                  text="SEKARANG KAMU TAHU KNP?"
                  fontFamily={FONTS.data}
                  fontSize={typo.pill}
                  fontWeight={700}
                  fill={PALETTE.surface}
                />
              </Rect>
            </Rect>

            <Rect layout direction="row" alignItems="center" gap={14} width="100%">
              <Img
                src={'/assets/vid_20261031_002/profit_shield_icon.png'}
                width={assets.iconSize}
                height={assets.iconSize}
              />
              <Rect layout direction="column" gap={4}>
                <Txt
                  text="TETAP LAKU WALAU TANPA DISKON"
                  fontFamily={FONTS.heading}
                  fontSize={typo.cardTitle}
                  fontWeight={700}
                  fill={PALETTE.ink}
                />
                <Txt
                  text="PRODUK KUAT DICARI ORANG MESKI PROMO DISTOP"
                  fontFamily={FONTS.data}
                  fontSize={typo.cardSub}
                  fontWeight={600}
                  fill={PALETTE.secondaryInk}
                />
              </Rect>
            </Rect>
          </>
        )}
      </Rect>

      {/* ===== TIER 2 (MIDDLE): WAJIB UNTUNG TANPA BAKAR UANG ===== */}
      <Rect
        y={y2}
        width={stackW}
        height={cardH}
        layout
        direction={wide ? 'row' : 'column'}
        justifyContent="space-between"
        alignItems={wide ? 'center' : 'stretch'}
        padding={wide ? [0, 32] : [18, 24]}
        fill={PALETTE.surface}
        stroke={PALETTE.cyan}
        lineWidth={3.5}
        radius={12}
        opacity={l2Opacity}
        scale={() => focalScale(focalId, 2, () => l2Scale(), time)}
      >
        {wide ? (
          <>
            <Rect layout direction="row" alignItems="center" gap={20}>
              <Rect layout padding={[6, 14]} fill={PALETTE.bg} radius={6}>
                <Txt
                  text="L2 // CEK ARUS KAS"
                  fontFamily={FONTS.data}
                  fontSize={typo.badge}
                  fontWeight={700}
                  fill={PALETTE.cyan}
                />
              </Rect>
              <Rect layout direction="column" gap={4}>
                <Txt
                  text="PASTIKAN BISNISNYA BENERAN UNTUNG"
                  fontFamily={FONTS.heading}
                  fontSize={typo.cardTitle}
                  fontWeight={700}
                  fill={PALETTE.ink}
                />
                <Txt
                  text="UANG MASUK DARI PELANGGAN ASLI, BUKAN MODAL PINJAMAN"
                  fontFamily={FONTS.data}
                  fontSize={typo.cardSub}
                  fontWeight={600}
                  fill={PALETTE.secondaryInk}
                />
              </Rect>
            </Rect>

            <Rect layout padding={[8, 16]} fill={PALETTE.cyan} radius={8}>
              <Txt
                text="UNTUNG BERSIH NYATA"
                fontFamily={FONTS.data}
                fontSize={typo.pill}
                fontWeight={700}
                fill={PALETTE.surface}
              />
            </Rect>
          </>
        ) : (
          <>
            <Rect layout direction="row" justifyContent="space-between" alignItems="center" width="100%">
              <Rect layout padding={[6, 14]} fill={PALETTE.bg} radius={6}>
                <Txt
                  text="L2 // CEK ARUS KAS"
                  fontFamily={FONTS.data}
                  fontSize={typo.badge}
                  fontWeight={700}
                  fill={PALETTE.cyan}
                />
              </Rect>
              <Rect layout padding={[8, 16]} fill={PALETTE.cyan} radius={8}>
                <Txt
                  text="UNTUNG BERSIH NYATA"
                  fontFamily={FONTS.data}
                  fontSize={typo.pill}
                  fontWeight={700}
                  fill={PALETTE.surface}
                />
              </Rect>
            </Rect>

            <Rect layout direction="column" gap={4} width="100%">
              <Txt
                text="PASTIKAN BISNISNYA BENERAN UNTUNG"
                fontFamily={FONTS.heading}
                fontSize={typo.cardTitle}
                fontWeight={700}
                fill={PALETTE.ink}
              />
              <Txt
                text="UANG MASUK DARI PELANGGAN ASLI, BUKAN PINJAMAN"
                fontFamily={FONTS.data}
                fontSize={typo.cardSub}
                fontWeight={600}
                fill={PALETTE.secondaryInk}
              />
            </Rect>
          </>
        )}
      </Rect>

      {/* ===== TIER 1 (BOTTOM): JANGAN TERTIPU RAMAI ===== */}
      <Rect
        y={y1}
        width={stackW}
        height={cardH}
        layout
        direction={wide ? 'row' : 'column'}
        justifyContent="space-between"
        alignItems={wide ? 'center' : 'stretch'}
        padding={wide ? [0, 32] : [18, 24]}
        fill={PALETTE.surface}
        stroke={PALETTE.emerald}
        lineWidth={3.5}
        radius={12}
        opacity={l1Opacity}
        scale={() => focalScale(focalId, 1, () => l1Scale(), time)}
      >
        {wide ? (
          <>
            <Rect layout direction="row" alignItems="center" gap={20}>
              <Rect layout padding={[6, 14]} fill={PALETTE.bg} radius={6}>
                <Txt
                  text="L1 // CEK REALITA"
                  fontFamily={FONTS.data}
                  fontSize={typo.badge}
                  fontWeight={700}
                  fill={PALETTE.emerald}
                />
              </Rect>
              <Rect layout direction="column" gap={4}>
                <Txt
                  text="RAMAI DIPAKAI BELUM TENTU UNTUNG"
                  fontFamily={FONTS.heading}
                  fontSize={typo.cardTitle}
                  fontWeight={700}
                  fill={PALETTE.ink}
                />
                <Txt
                  text="APLIKASI POPULER BISA SAJA MASIH RUGI TRILIUNAN"
                  fontFamily={FONTS.data}
                  fontSize={typo.cardSub}
                  fontWeight={600}
                  fill={PALETTE.secondaryInk}
                />
              </Rect>
            </Rect>

            <Rect layout padding={[8, 16]} fill={PALETTE.emerald} radius={8}>
              <Txt
                text="JANGAN SILAU HYPE"
                fontFamily={FONTS.data}
                fontSize={typo.pill}
                fontWeight={700}
                fill={PALETTE.surface}
              />
            </Rect>
          </>
        ) : (
          <>
            <Rect layout direction="row" justifyContent="space-between" alignItems="center" width="100%">
              <Rect layout padding={[6, 14]} fill={PALETTE.bg} radius={6}>
                <Txt
                  text="L1 // CEK REALITA"
                  fontFamily={FONTS.data}
                  fontSize={typo.badge}
                  fontWeight={700}
                  fill={PALETTE.emerald}
                />
              </Rect>
              <Rect layout padding={[8, 16]} fill={PALETTE.emerald} radius={8}>
                <Txt
                  text="JANGAN SILAU HYPE"
                  fontFamily={FONTS.data}
                  fontSize={typo.pill}
                  fontWeight={700}
                  fill={PALETTE.surface}
                />
              </Rect>
            </Rect>

            <Rect layout direction="column" gap={4} width="100%">
              <Txt
                text="RAMAI DIPAKAI BELUM TENTU UNTUNG"
                fontFamily={FONTS.heading}
                fontSize={typo.cardTitle}
                fontWeight={700}
                fill={PALETTE.ink}
              />
              <Txt
                text="APLIKASI POPULER BISA SAJA MASIH RUGI TRILIUNAN"
                fontFamily={FONTS.data}
                fontSize={typo.cardSub}
                fontWeight={600}
                fill={PALETTE.secondaryInk}
              />
            </Rect>
          </>
        )}
      </Rect>
    </Node>
  );

  // --- Choreography & Sync (Duration: 13.913s, global: 63.11s - 77.023s) ---

  // t = 0.3s (global 63.41s): Header block enters
  yield* waitUntilSceneTime(0.3, t0);
  yield* all(
    headerOpacity(1, 0.4),
    headerScale(1.0, 0.5, easeOutExpo),
  );

  // t = 2.69s (global 65.80s "ramai dipakai belum tentu perusahaannya cetak untung"):
  // Tier 1 enters (L1 // CEK REALITA)
  yield* waitUntilSceneTime(2.69, t0);
  focalId(1);
  yield* all(
    l1Opacity(1, 0.4),
    l1Scale(1.0, 0.5, easeOutExpo),
  );

  // t = 4.92s (global 68.03s "sebelum ikut beli"):
  // Arrow 1 draws up from Tier 1 to Tier 2
  yield* waitUntilSceneTime(4.92, t0);
  yield* all(
    arrow1Opacity(1, 0.3),
  );

  // t = 8.02s (global 71.13s - 71.50s "bisnisnya beneran untung tanpa bakar uang"):
  // Tier 2 enters (L2 // CEK ARUS KAS)
  yield* waitUntilSceneTime(8.02, t0);
  focalId(2);
  yield* all(
    l2Opacity(1, 0.4),
    l2Scale(1.0, 0.5, easeOutExpo),
  );

  // t = 11.46s (global 74.57s "apakah produknya tetap laku tanpa subsidi diskon"):
  // Arrow 2 draws & Tier 3 enters (L3 // UJI DAYA TAHAN)
  yield* waitUntilSceneTime(11.46, t0);
  focalId(3);
  yield* all(
    arrow2Opacity(1, 0.3),
    l3Opacity(1, 0.4),
    l3Scale(1.0, 0.5, easeOutExpo),
  );

  // t = 13.22s (global 76.33s "sekarang kamu tahu kenapa?"):
  // Tier 3 pill pulses with accent highlight
  yield* waitUntilSceneTime(13.22, t0);
  yield* all(
    l3PillScale(1.15, 0.2, easeOutExpo).to(1.0, 0.2, easeInOutCubic),
    l3PillBg(PALETTE.accent, 0.25),
    l3Stroke(PALETTE.accent, 0.3),
  );

  // Hold until end of beat (13.913s)
  yield* finishSceneAt(sceneDuration, t0);
});
