import { Img, Line, makeScene2D, Node, Rect, Txt } from '@motion-canvas/2d';
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
  setupBaseStage(view, 'KNP? // 05: ATURAN BARU 15%');

  const wide = isWidescreen(view);
  const baseTypo = getTypo(wide);
  const baseAssets = getAssets(wide);

  const typo = {
    ...baseTypo,
    heroTitle: wide ? 38 : 34,
    cardTitle: wide ? 28 : 28,
    cardSub: wide ? 18 : 20,
    badge: wide ? 18 : 20,
    pill: wide ? 20 : 22,
    sublabel: wide ? 18 : 20,
  };

  const assets = {
    ...baseAssets,
    badgeSquare: wide ? 42 : 48,
    heroIcon: wide ? 52 : 56,
  };

  const stackW = wide ? 1320 : 940;
  const cardH = wide ? 145 : 195;

  const y3 = wide ? -185 : -190;
  const y2 = wide ? -15 : 30;
  const y1 = wide ? 155 : 250;

  // Animation signals
  const focalId = createSignal(0);

  const headerOpacity = createSignal(0);
  const headerScale = createSignal(0.95);

  // Layer 1 (Bottom: Wajib 15% Saham Publik)
  const l1Opacity = createSignal(0);
  const l1Scale = createSignal(0.92);
  const l1Stroke = createSignal<string>(PALETTE.gridLine);
  const l1BadgeBg = createSignal<string>(PALETTE.emerald);

  // Arrow L1 -> L2
  const arrow1End = createSignal(0);

  // Layer 2 (Middle: Buka Pemilik >1%)
  const l2Opacity = createSignal(0);
  const l2Scale = createSignal(0.92);
  const l2Stroke = createSignal<string>(PALETTE.gridLine);
  const l2BadgeBg = createSignal<string>(PALETTE.cyan);

  // Arrow L2 -> L3
  const arrow2End = createSignal(0);

  // Layer 3 (Top: Cek Sebelum Beli)
  const l3Opacity = createSignal(0);
  const l3Scale = createSignal(0.92);
  const l3Stroke = createSignal<string>(PALETTE.gridLine);
  const l3BadgeBg = createSignal<string>(PALETTE.amber);
  const l3BadgeText = createSignal('CEK LIKUIDITAS');
  const l3BadgeScale = createSignal(1.0);

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
          fill={PALETTE.emerald}
          radius={6}
        >
          <Txt
            text="REFORMASI OJK & BEI 2026 // CARA AMAN INVESTASI"
            fontFamily={FONTS.data}
            fontSize={typo.badge}
            fontWeight={700}
            fill={PALETTE.surface}
            letterSpacing={1.2}
          />
        </Rect>
        <Txt
          text="ATURAN BARU 15% & BUKA KARTU >1%"
          fontFamily={FONTS.heading}
          fontSize={typo.heroTitle}
          fontWeight={700}
          fill={PALETTE.ink}
        />
      </Rect>

      {/* ===== UPWARD DEPENDENCY ARROWS (L1 -> L2 -> L3) ===== */}
      {/* Arrow L1 -> L2 */}
      <Line
        points={[
          [0, y1 - cardH / 2],
          [0, y2 + cardH / 2],
        ]}
        stroke={PALETTE.secondaryInk}
        lineWidth={3.5}
        lineDash={[6, 4]}
        endArrow
        arrowSize={12}
        end={arrow1End}
      />

      {/* Arrow L2 -> L3 */}
      <Line
        points={[
          [0, y2 - cardH / 2],
          [0, y3 + cardH / 2],
        ]}
        stroke={PALETTE.secondaryInk}
        lineWidth={3.5}
        lineDash={[6, 4]}
        endArrow
        arrowSize={12}
        end={arrow2End}
      />

      {/* ===== TIER 3: PRINSIP INVESTOR CERDAS (TOP) ===== */}
      <Rect
        y={y3}
        width={stackW}
        height={cardH}
        layout
        direction={wide ? 'row' : 'column'}
        justifyContent="space-between"
        alignItems={wide ? 'center' : 'stretch'}
        padding={wide ? [0, 36] : [18, 28]}
        fill={PALETTE.surface}
        stroke={l3Stroke}
        lineWidth={3.5}
        radius={12}
        opacity={l3Opacity}
        scale={() => focalScale(focalId, 3, l3Scale, time)}
      >
        {wide ? (
          <>
            <Rect layout direction="row" alignItems="center" gap={20}>
              <Rect layout padding={[6, 14]} fill={PALETTE.bg} radius={6}>
                <Txt
                  text="L3 // CEK SEBELUM BELI"
                  fontFamily={FONTS.data}
                  fontSize={typo.badge}
                  fontWeight={700}
                  fill={PALETTE.secondaryInk}
                />
              </Rect>
              <Rect layout direction="row" alignItems="center" gap={14}>
                <Img
                  src={'/assets/vid_20261031_001/shield_check_icon.png'}
                  width={assets.heroIcon}
                  height={assets.heroIcon}
                />
                <Rect layout direction="column" gap={4}>
                  <Txt
                    text="CEK APAKAH BANYAK YANG PEGANG"
                    fontFamily={FONTS.heading}
                    fontSize={typo.cardTitle}
                    fontWeight={700}
                    fill={PALETTE.ink}
                  />
                  <Txt
                    text="JANGAN CUMA LIHAT HARGA NAIK — PASTIKAN GAMPANG DIJUAL LAGI"
                    fontFamily={FONTS.data}
                    fontSize={typo.cardSub}
                    fontWeight={700}
                    fill={PALETTE.secondaryInk}
                  />
                </Rect>
              </Rect>
            </Rect>

            <Rect
              layout
              padding={[10, 20]}
              fill={l3BadgeBg}
              radius={8}
              scale={l3BadgeScale}
            >
              <Txt
                text={l3BadgeText}
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
                <Rect layout padding={[4, 10]} fill={PALETTE.bg} radius={4}>
                  <Txt
                    text="L3 // CEK SEBELUM BELI"
                    fontFamily={FONTS.data}
                    fontSize={typo.badge}
                    fontWeight={700}
                    fill={PALETTE.secondaryInk}
                  />
                </Rect>
              </Rect>

              <Rect
                layout
                padding={[6, 14]}
                fill={l3BadgeBg}
                radius={6}
                scale={l3BadgeScale}
              >
                <Txt
                  text={l3BadgeText}
                  fontFamily={FONTS.data}
                  fontSize={typo.pill}
                  fontWeight={700}
                  fill={PALETTE.surface}
                />
              </Rect>
            </Rect>

            <Rect layout direction="column" gap={4}>
              <Txt
                text="CEK APAKAH BANYAK YANG PEGANG"
                fontFamily={FONTS.heading}
                fontSize={typo.cardTitle}
                fontWeight={700}
                fill={PALETTE.ink}
              />
              <Txt
                text="JANGAN CUMA LIHAT HARGA NAIK — PASTIKAN GAMPANG DIJUAL LAGI"
                fontFamily={FONTS.data}
                fontSize={typo.cardSub}
                fontWeight={700}
                fill={PALETTE.secondaryInk}
              />
            </Rect>
          </Rect>
        )}
      </Rect>

      {/* ===== TIER 2: BUKA PEMILIK >1% (MIDDLE) ===== */}
      <Rect
        y={y2}
        width={stackW}
        height={cardH}
        layout
        direction={wide ? 'row' : 'column'}
        justifyContent="space-between"
        alignItems={wide ? 'center' : 'stretch'}
        padding={wide ? [0, 36] : [18, 28]}
        fill={PALETTE.surface}
        stroke={l2Stroke}
        lineWidth={3.5}
        radius={12}
        opacity={l2Opacity}
        scale={() => focalScale(focalId, 2, l2Scale, time)}
      >
        {wide ? (
          <>
            <Rect layout direction="row" alignItems="center" gap={20}>
              <Rect layout padding={[6, 14]} fill={PALETTE.bg} radius={6}>
                <Txt
                  text="L2 // TRANSPARANSI PENUH"
                  fontFamily={FONTS.data}
                  fontSize={typo.badge}
                  fontWeight={700}
                  fill={PALETTE.secondaryInk}
                />
              </Rect>
              <Rect layout direction="column" gap={4}>
                <Txt
                  text="BUKA DATA PEMILIK SAHAM >1%"
                  fontFamily={FONTS.heading}
                  fontSize={typo.cardTitle}
                  fontWeight={700}
                  fill={PALETTE.ink}
                />
                <Txt
                  text="DULU DI ATAS 5% BARU KETAHUAN, SEKARANG >1% WAJIB BUKA KARTU"
                  fontFamily={FONTS.data}
                  fontSize={typo.cardSub}
                  fontWeight={700}
                  fill={PALETTE.secondaryInk}
                />
              </Rect>
            </Rect>

            <Rect
              layout
              padding={[10, 20]}
              fill={l2BadgeBg}
              radius={8}
            >
              <Txt
                text="ANTI SEMBUNYI (>1%)"
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
              <Rect layout padding={[4, 10]} fill={PALETTE.bg} radius={4}>
                <Txt
                  text="L2 // TRANSPARANSI PENUH"
                  fontFamily={FONTS.data}
                  fontSize={typo.badge}
                  fontWeight={700}
                  fill={PALETTE.secondaryInk}
                />
              </Rect>

              <Rect
                layout
                padding={[6, 14]}
                fill={l2BadgeBg}
                radius={6}
              >
                <Txt
                  text="ANTI SEMBUNYI (>1%)"
                  fontFamily={FONTS.data}
                  fontSize={typo.pill}
                  fontWeight={700}
                  fill={PALETTE.surface}
                />
              </Rect>
            </Rect>

            <Rect layout direction="column" gap={4}>
              <Txt
                text="BUKA DATA PEMILIK SAHAM >1%"
                fontFamily={FONTS.heading}
                fontSize={typo.cardTitle}
                fontWeight={700}
                fill={PALETTE.ink}
              />
              <Txt
                text="DULU >5% BARU KETAHUAN, SEKARANG >1% WAJIB BUKA KARTU"
                fontFamily={FONTS.data}
                fontSize={typo.cardSub}
                fontWeight={700}
                fill={PALETTE.secondaryInk}
              />
            </Rect>
          </Rect>
        )}
      </Rect>

      {/* ===== TIER 1: WAJIB SAHAM PUBLIK 15% (BOTTOM) ===== */}
      <Rect
        y={y1}
        width={stackW}
        height={cardH}
        layout
        direction={wide ? 'row' : 'column'}
        justifyContent="space-between"
        alignItems={wide ? 'center' : 'stretch'}
        padding={wide ? [0, 36] : [18, 28]}
        fill={PALETTE.surface}
        stroke={l1Stroke}
        lineWidth={3.5}
        radius={12}
        opacity={l1Opacity}
        scale={() => focalScale(focalId, 1, l1Scale, time)}
      >
        {wide ? (
          <>
            <Rect layout direction="row" alignItems="center" gap={20}>
              <Rect layout padding={[6, 14]} fill={PALETTE.bg} radius={6}>
                <Txt
                  text="L1 // ATURAN FREE FLOAT"
                  fontFamily={FONTS.data}
                  fontSize={typo.badge}
                  fontWeight={700}
                  fill={PALETTE.secondaryInk}
                />
              </Rect>
              <Rect layout direction="column" gap={4}>
                <Txt
                  text="WAJIB 15% SAHAM DI MASYARAKAT"
                  fontFamily={FONTS.heading}
                  fontSize={typo.cardTitle}
                  fontWeight={700}
                  fill={PALETTE.ink}
                />
                <Txt
                  text="NAIK DUA KALI LIPAT DARI ATURAN LAMA 7,5%"
                  fontFamily={FONTS.data}
                  fontSize={typo.cardSub}
                  fontWeight={700}
                  fill={PALETTE.secondaryInk}
                />
              </Rect>
            </Rect>

            <Rect
              layout
              padding={[10, 20]}
              fill={l1BadgeBg}
              radius={8}
            >
              <Txt
                text="MINIMAL 15% BEBAS"
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
              <Rect layout padding={[4, 10]} fill={PALETTE.bg} radius={4}>
                <Txt
                  text="L1 // ATURAN FREE FLOAT"
                  fontFamily={FONTS.data}
                  fontSize={typo.badge}
                  fontWeight={700}
                  fill={PALETTE.secondaryInk}
                />
              </Rect>

              <Rect
                layout
                padding={[6, 14]}
                fill={l1BadgeBg}
                radius={6}
              >
                <Txt
                  text="MINIMAL 15% BEBAS"
                  fontFamily={FONTS.data}
                  fontSize={typo.pill}
                  fontWeight={700}
                  fill={PALETTE.surface}
                />
              </Rect>
            </Rect>

            <Rect layout direction="column" gap={4}>
              <Txt
                text="WAJIB 15% SAHAM DI MASYARAKAT"
                fontFamily={FONTS.heading}
                fontSize={typo.cardTitle}
                fontWeight={700}
                fill={PALETTE.ink}
              />
              <Txt
                text="NAIK DUA KALI LIPAT DARI ATURAN LAMA 7,5%"
                fontFamily={FONTS.data}
                fontSize={typo.cardSub}
                fontWeight={700}
                fill={PALETTE.secondaryInk}
              />
            </Rect>
          </Rect>
        )}
      </Rect>
    </Node>
  );

  // --- Choreography & Sync (Duration: 29.20s, global: 77.72s - 106.92s) ---

  // t = 0.3s: Header block enters
  yield* waitUntilSceneTime(0.3, t0);
  yield* all(
    headerOpacity(1, 0.4),
    headerScale(1.0, 0.5, easeOutExpo),
  );

  // t = 7.9s (global 85.60s, "Sekarang minimal 15% saham perusahaan"):
  // Tier 1 (L1) reveals
  yield* waitUntilSceneTime(7.9, t0);
  focalId(1);
  yield* all(
    l1Opacity(1, 0.4),
    l1Scale(1.0, 0.5, easeOutExpo),
    l1Stroke(PALETTE.emerald, 0.4),
  );

  // t = 13.4s (global 91.16s, "Dan siapa pun yang punya saham di atas 1%"):
  // Arrow L1 -> L2 draws & Tier 2 (L2) reveals
  yield* waitUntilSceneTime(13.4, t0);
  focalId(2);
  yield* all(
    arrow1End(1, 0.6, easeInOutCubic),
    l2Opacity(1, 0.4),
    l2Scale(1.0, 0.5, easeOutExpo),
    l2Stroke(PALETTE.cyan, 0.4),
  );

  // t = 18.8s (global 96.50s, "Pelajarannya buat kita... kalau mau taruh uang"):
  // Arrow L2 -> L3 draws & Tier 3 (L3) reveals
  yield* waitUntilSceneTime(18.8, t0);
  focalId(3);
  yield* all(
    arrow2End(1, 0.6, easeInOutCubic),
    l3Opacity(1, 0.4),
    l3Scale(1.0, 0.5, easeOutExpo),
    l3Stroke(PALETTE.amber, 0.4),
  );

  // t = 23.5s (global 101.20s, "pastikan barangnya beneran ramai pembelinya"):
  // Tier 3 highlight pulse
  yield* waitUntilSceneTime(23.5, t0);
  yield* all(
    l3Scale(1.03, 0.3, easeOutExpo).to(1.0, 0.25, easeInOutCubic),
  );

  // t = 27.5s (global 105.28s, "Sekarang kamu tahu kenapa?"):
  // L3 right pill flips to "SEKARANG KAMU TAHU KNP?" with gold pulse
  yield* waitUntilSceneTime(27.5, t0);
  l3BadgeText('SEKARANG KAMU TAHU KNP?');
  yield* all(
    l3BadgeScale(1.15, 0.25, easeOutExpo).to(1.0, 0.2, easeInOutCubic),
    l3BadgeBg(PALETTE.amber, 0.2),
  );

  // Strict Hold-Time: Diagram holds until 29.20s (hold = 1.4s)
  yield* finishSceneAt(29.20, t0);
});
