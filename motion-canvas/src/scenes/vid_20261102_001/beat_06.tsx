import { Img, Line, makeScene2D, Node, Rect, Txt } from '@motion-canvas/2d';
import {
  all,
  createRef,
  createSignal,
  easeOutBack,
  easeOutCubic,
} from '@motion-canvas/core';
import {
  COLORS,
  FONTS,
  HEADING_FONT,
  PALETTE,
  setupBaseStage,
} from './layout';
import {
  finishSceneAt,
  SCENE_TIMINGS,
  waitUntilSceneTime,
} from './timings';

export default makeScene2D(function* (view) {
  // Swiss Base Stage with Subtitles and Chapter Brow
  setupBaseStage(view, 'beat_06');

  // Animation signals
  const stageOpacity = createSignal(0);

  // Left card image swap signals
  const img1Opacity = createSignal(1);
  const img2Opacity = createSignal(0);

  // Receipt items signals
  const bannerOpacity = createSignal(0);
  const bannerScale = createSignal(0.85);

  const item1Opacity = createSignal(0);
  const item1NoteOpacity = createSignal(0);

  const fbHighlightOpacity = createSignal(0);
  const item2Opacity = createSignal(0);
  const item3Opacity = createSignal(0);
  const item4Opacity = createSignal(0);

  // Margin comparison chart & summary signals
  const chartOpacity = createSignal(0);
  const profitSummaryOpacity = createSignal(0);
  const profitSummaryScale = createSignal(0.85);
  const verdictOpacity = createSignal(0);
  const verdictScale = createSignal(1.2);

  const stage = createRef<Node>();

  view.add(
    <Node ref={stage} opacity={stageOpacity}>
      {/* ===== LEFT CARD: Thermal Receipt & Appetizing Food Swap ===== */}
      <Rect
        x={-560}
        y={-30}
        width={500}
        height={675}
        radius={20}
        fill={'#FFFFFF'}
        stroke={COLORS.ink}
        lineWidth={3.5}
      >
        {/* Top Header Pill */}
        <Rect
          y={-288}
          layout
          direction="row"
          alignItems="center"
          padding={[8, 18]}
          radius={999}
          fill={PALETTE.mutedBg}
          stroke={COLORS.ink}
          lineWidth={2}
        >
          <Txt
            text="BUKTI FORENSIK KASIR"
            fontFamily={HEADING_FONT}
            fontSize={20}
            fontWeight={800}
            fill={COLORS.ink}
          />
        </Rect>

        {/* Square Comic Panel with Swapping Assets */}
        <Rect
          y={-32}
          width={380}
          height={380}
          radius={16}
          clip
          stroke={COLORS.ink}
          lineWidth={2.5}
        >
          {/* Asset 1: Stylized Thermal POS Cash Register Receipt */}
          <Img
            src="/assets/vid_20261102_001/ch06_sq1.png"
            width={380}
            height={380}
            opacity={img1Opacity}
          />

          {/* Asset 2: High-Margin Appetizing Food & Drinks */}
          <Img
            src="/assets/vid_20261102_001/ch06_sq2.png"
            width={380}
            height={380}
            opacity={img2Opacity}
          />
        </Rect>

        {/* Summary Pill 1: Total Struk */}
        <Rect
          y={218}
          layout
          direction="row"
          alignItems="center"
          justifyContent="center"
          width={450}
          padding={[10, 16]}
          radius={12}
          fill={PALETTE.crimsonBg}
          stroke={PALETTE.crimson}
          lineWidth={2}
          opacity={bannerOpacity}
          scale={bannerScale}
        >
          <Txt
            text="TOTAL STRUK: RP750.000"
            fontFamily={HEADING_FONT}
            fontSize={19}
            fontWeight={800}
            fill={PALETTE.crimson}
          />
        </Rect>

        {/* Summary Pill 2: F&B Cash Cow Ratio */}
        <Rect
          y={282}
          layout
          direction="row"
          alignItems="center"
          justifyContent="center"
          width={450}
          padding={[10, 16]}
          radius={12}
          fill={PALETTE.emeraldBg}
          stroke={PALETTE.emerald}
          lineWidth={2}
        >
          <Txt
            text="65% LABA DARI F&B (CASH COW)"
            fontFamily={HEADING_FONT}
            fontSize={19}
            fontWeight={800}
            fill={PALETTE.emerald}
          />
        </Rect>
      </Rect>

      {/* ===== RIGHT CARD: Receipt Teardown & Gross Margin Breakdown ===== */}
      <Rect
        x={260}
        y={-30}
        width={1060}
        height={675}
        radius={20}
        fill={'#FFFFFF'}
        stroke={COLORS.ink}
        lineWidth={3.5}
      >
        {/* Header Bar */}
        <Rect
          y={-288}
          layout
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          width={1012}
        >
          <Txt
            text="STRUK MEJA VIP 5 JAM & MARGIN F&B"
            fontFamily={HEADING_FONT}
            fontSize={24}
            fontWeight={800}
            fill={COLORS.ink}
          />
          <Rect
            layout
            direction="row"
            padding={[6, 14]}
            radius={8}
            fill={PALETTE.crimsonBg}
            stroke={PALETTE.crimson}
            lineWidth={2}
            opacity={bannerOpacity}
          >
            <Txt
              text="TOTAL: RP750.000"
              fontFamily={FONTS.data}
              fontSize={19}
              fontWeight={800}
              fill={PALETTE.crimson}
            />
          </Rect>
        </Rect>

        {/* Receipt Line Items Stack */}
        <Rect
          y={-135}
          layout
          direction="column"
          gap={8}
          width={1012}
        >
          {/* Item 1: Sewa Meja VIP (Cue 3: 10.68s, Cue 4: 16.54s) */}
          <Rect
            layout
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            width={1012}
            padding={[8, 14]}
            radius={10}
            fill={PALETTE.mutedBg}
            stroke={COLORS.ink}
            lineWidth={1.5}
            opacity={item1Opacity}
          >
            <Rect layout direction="row" alignItems="center" gap={12}>
              <Txt
                text="Sewa Meja VIP 5 Jam (@ Rp60.000)"
                fontFamily={FONTS.body}
                fontSize={18}
                fontWeight={700}
                fill={COLORS.ink}
              />
              <Rect
                layout
                padding={[3, 8]}
                radius={6}
                fill={'#E2E8F0'}
                opacity={item1NoteOpacity}
              >
                <Txt
                  text="Loss Leader • Tutup Listrik & AC"
                  fontFamily={FONTS.data}
                  fontSize={18}
                  fontWeight={600}
                  fill={COLORS.secondaryInk}
                />
              </Rect>
            </Rect>
            <Txt
              text="Rp300.000 (40%)"
              fontFamily={FONTS.data}
              fontSize={18}
              fontWeight={700}
              fill={COLORS.secondaryInk}
            />
          </Rect>

          {/* Item 2: 8x Minuman Dingin (Cue 6: 23.49s) */}
          <Rect
            layout
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            width={1012}
            padding={[8, 14]}
            radius={10}
            fill={PALETTE.cyanBg}
            stroke={PALETTE.cyan}
            lineWidth={1.5}
            opacity={item2Opacity}
          >
            <Txt
              text="8x Minuman Dingin (Kopi Susu & Liang Teh)"
              fontFamily={FONTS.body}
              fontSize={18}
              fontWeight={700}
              fill={COLORS.ink}
            />
            <Txt
              text="Rp160.000 (Margin 80% • HPP Rp32rb)"
              fontFamily={FONTS.data}
              fontSize={18}
              fontWeight={700}
              fill={PALETTE.cyan}
            />
          </Rect>

          {/* Item 3: 4x Mie Goreng Spesial (Cue 7: 30.52s) */}
          <Rect
            layout
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            width={1012}
            padding={[8, 14]}
            radius={10}
            fill={PALETTE.amberBg}
            stroke={PALETTE.amber}
            lineWidth={1.5}
            opacity={item3Opacity}
          >
            <Txt
              text="4x Mie Goreng Spesial & Camilan"
              fontFamily={FONTS.body}
              fontSize={18}
              fontWeight={700}
              fill={COLORS.ink}
            />
            <Txt
              text="Rp180.000 (Margin 73% • HPP Rp48rb)"
              fontFamily={FONTS.data}
              fontSize={18}
              fontWeight={700}
              fill={PALETTE.amber}
            />
          </Rect>

          {/* Item 4: 3x Dimsum Siomay & Hakau (Cue 7: 30.52s) */}
          <Rect
            layout
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            width={1012}
            padding={[8, 14]}
            radius={10}
            fill={PALETTE.amberBg}
            stroke={PALETTE.amber}
            lineWidth={1.5}
            opacity={item4Opacity}
          >
            <Txt
              text="3x Dimsum Siomay & Hakau Hangat"
              fontFamily={FONTS.body}
              fontSize={18}
              fontWeight={700}
              fill={COLORS.ink}
            />
            <Txt
              text="Rp110.000 (Margin 73% • HPP Rp30rb)"
              fontFamily={FONTS.data}
              fontSize={18}
              fontWeight={700}
              fill={PALETTE.amber}
            />
          </Rect>
        </Rect>

        {/* ===== Bottom Section: Gross Margin Chart & Profit Teardown ===== */}
        <Rect
          y={165}
          width={1012}
          height={270}
          radius={14}
          fill={COLORS.bg}
          stroke={COLORS.gridLine}
          lineWidth={2}
          clip
        >
          {/* Chart Title */}
          <Txt
            x={-95}
            y={-114}
            text="ANALISIS MARGIN KOTOR & LABA BERSIH STRUK"
            fontFamily={HEADING_FONT}
            fontSize={18}
            fontWeight={800}
            fill={COLORS.ink}
          />

          {/* Mandatory Axis Line 1: X-Axis Arrow */}
          <Line
            points={[[-390, 80], [130, 80]]}
            stroke={COLORS.ink}
            lineWidth={3}
            endArrow
            arrowSize={12}
          />

          {/* Mandatory Axis Line 2: Y-Axis Arrow */}
          <Line
            points={[[-390, 80], [-390, -88]]}
            stroke={COLORS.ink}
            lineWidth={3}
            endArrow
            arrowSize={12}
          />

          {/* X & Y Axis Labels */}
          <Txt
            x={75}
            y={56}
            text="KATEGORI"
            fontFamily={FONTS.body}
            fontSize={18}
            fontWeight={700}
            fill={COLORS.secondaryInk}
          />
          <Txt
            x={-390}
            y={-114}
            text="MARGIN %"
            fontFamily={FONTS.data}
            fontSize={18}
            fontWeight={700}
            fill={COLORS.secondaryInk}
          />

          {/* Ticks and Gridlines */}
          <Line
            points={[[-390, 10], [120, 10]]}
            stroke={COLORS.gridLine}
            lineWidth={1.5}
            lineDash={[6, 6]}
          />
          <Line
            points={[[-390, -60], [120, -60]]}
            stroke={COLORS.gridLine}
            lineWidth={1.5}
            lineDash={[6, 6]}
          />
          <Txt
            x={-425}
            y={80}
            text="0%"
            fontFamily={FONTS.data}
            fontSize={18}
            fill={COLORS.secondaryInk}
          />
          <Txt
            x={-430}
            y={10}
            text="50%"
            fontFamily={FONTS.data}
            fontSize={18}
            fill={COLORS.secondaryInk}
          />
          <Txt
            x={-435}
            y={-60}
            text="100%"
            fontFamily={FONTS.data}
            fontSize={18}
            fill={COLORS.secondaryInk}
          />

          {/* Bar 1: Meja VIP (Margin ~0% after overhead) */}
          <Rect
            x={-300}
            y={68}
            width={75}
            height={24}
            radius={[6, 6, 0, 0]}
            fill={'#94A3B8'}
            stroke={COLORS.ink}
            lineWidth={2}
          />
          <Txt
            x={-300}
            y={42}
            text="0%"
            fontFamily={FONTS.data}
            fontSize={18}
            fontWeight={700}
            fill={COLORS.ink}
          />
          <Txt
            x={-300}
            y={102}
            text="Meja"
            fontFamily={FONTS.body}
            fontSize={18}
            fontWeight={700}
            fill={COLORS.secondaryInk}
          />

          {/* Bar 2: Minuman Dingin (Margin 80%) */}
          <Rect
            x={-180}
            y={24}
            width={75}
            height={112}
            radius={[6, 6, 0, 0]}
            fill={PALETTE.cyan}
            stroke={COLORS.ink}
            lineWidth={2}
            opacity={chartOpacity}
          />
          <Txt
            x={-180}
            y={-48}
            text="80%"
            fontFamily={FONTS.data}
            fontSize={19}
            fontWeight={800}
            fill={PALETTE.cyan}
            opacity={chartOpacity}
          />
          <Txt
            x={-180}
            y={102}
            text="Minuman"
            fontFamily={FONTS.body}
            fontSize={18}
            fontWeight={700}
            fill={COLORS.secondaryInk}
          />

          {/* Bar 3: Makanan & Dimsum (Margin 73%) */}
          <Rect
            x={-60}
            y={29}
            width={75}
            height={102}
            radius={[6, 6, 0, 0]}
            fill={PALETTE.amber}
            stroke={COLORS.ink}
            lineWidth={2}
            opacity={chartOpacity}
          />
          <Txt
            x={-60}
            y={-38}
            text="73%"
            fontFamily={FONTS.data}
            fontSize={19}
            fontWeight={800}
            fill={PALETTE.amber}
            opacity={chartOpacity}
          />
          <Txt
            x={-60}
            y={102}
            text="Makanan"
            fontFamily={FONTS.body}
            fontSize={18}
            fontWeight={700}
            fill={COLORS.secondaryInk}
          />

          {/* Right Teardown Card: Gross Profit & Verdict (Cues 9 & 10) */}
          <Rect
            x={310}
            y={0}
            width={310}
            height={230}
            radius={12}
            fill={PALETTE.emeraldBg}
            stroke={PALETTE.emerald}
            lineWidth={2.5}
            padding={12}
            layout
            direction="column"
            justifyContent="space-between"
            opacity={profitSummaryOpacity}
            scale={profitSummaryScale}
          >
            <Txt
              text="REKAP LABA KOTOR"
              fontFamily={HEADING_FONT}
              fontSize={18}
              fontWeight={800}
              fill={PALETTE.emerald}
            />
            <Txt
              text="TOTAL HPP: Rp155.000"
              fontFamily={FONTS.data}
              fontSize={18}
              fontWeight={700}
              fill={COLORS.secondaryInk}
            />
            <Txt
              text="LABA KOTOR: Rp595.000"
              fontFamily={FONTS.data}
              fontSize={20}
              fontWeight={800}
              fill={PALETTE.emerald}
            />
            <Txt
              text="79,3% MARGIN KOTOR!"
              fontFamily={HEADING_FONT}
              fontSize={18}
              fontWeight={800}
              fill={COLORS.ink}
            />
            <Rect
              layout
              direction="row"
              padding={[5, 10]}
              radius={6}
              fill={PALETTE.crimson}
              stroke={COLORS.ink}
              lineWidth={1.5}
              opacity={verdictOpacity}
              scale={verdictScale}
            >
              <Txt
                text="RESTORAN BERKEDOK MEJA"
                fontFamily={HEADING_FONT}
                fontSize={18}
                fontWeight={800}
                fill={'#FFFFFF'}
              />
            </Rect>
          </Rect>
        </Rect>
      </Rect>
    </Node>
  );

  // =========================================================================
  // Synchronized Scene Choreography (10 Beats from beat_cue_schedule.json)
  // =========================================================================

  // Cue 1: 0.2s - Explainer stage appears (POS thermal receipt on left)
  yield* waitUntilSceneTime(0.2);
  yield* stageOpacity(1, 0.45, easeOutCubic);

  // Cue 2: 4.64s - Grand total banner pops: Rp750.000
  yield* waitUntilSceneTime(4.64);
  yield* all(
    bannerOpacity(1, 0.35, easeOutCubic),
    bannerScale(1.0, 0.35, easeOutBack),
  );

  // Cue 3: 10.68s - Item 1 appears: Sewa meja 5 jam Rp300.000
  yield* waitUntilSceneTime(10.68);
  yield* item1Opacity(1, 0.35, easeOutCubic);

  // Cue 4: 16.54s - Loss leader tag: Umpan penutup listrik & AC
  yield* waitUntilSceneTime(16.54);
  yield* item1NoteOpacity(1, 0.35, easeOutCubic);

  // Cue 5: 20.54s - Swap left comic to high-margin food (ch06_sq2.png)
  yield* waitUntilSceneTime(20.54);
  yield* all(
    img1Opacity(0, 0.3, easeOutCubic),
    img2Opacity(1, 0.3, easeOutCubic),
    fbHighlightOpacity(1, 0.3, easeOutCubic),
  );

  // Cue 6: 23.49s - Item 2: 8x Minuman Dingin Rp160.000 (Margin 80%)
  yield* waitUntilSceneTime(23.49);
  yield* item2Opacity(1, 0.35, easeOutCubic);

  // Cue 7: 30.52s - Items 3 & 4: 4x Mie Rp180.000 & 3x Dimsum Rp110.000
  yield* waitUntilSceneTime(30.52);
  yield* all(
    item3Opacity(1, 0.35, easeOutCubic),
    item4Opacity(1, 0.35, easeOutCubic),
  );

  // Cue 8: 34.36s - Caliper margin chart reveals (Minuman 80%, Makanan 73%)
  yield* waitUntilSceneTime(34.36);
  yield* chartOpacity(1, 0.4, easeOutCubic);

  // Cue 9: 40.02s - Profit teardown slams: Laba kotor Rp595.000 (79,3%)
  yield* waitUntilSceneTime(40.02);
  yield* all(
    profitSummaryOpacity(1, 0.35, easeOutCubic),
    profitSummaryScale(1.0, 0.35, easeOutBack),
  );

  // Cue 10: 46.62s - Final verdict stamp: Restoran F&B berkedok meja sewa!
  yield* waitUntilSceneTime(46.62);
  yield* all(
    verdictOpacity(1, 0.25, easeOutCubic),
    verdictScale(1.0, 0.35, easeOutBack),
  );

  // Hold safely until scene completion
  yield* finishSceneAt(SCENE_TIMINGS[5].duration);
});
