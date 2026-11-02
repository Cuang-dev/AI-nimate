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
  const stage = createEditorialStage(view, BEAT_LABELS[1]);

  // Animation signals
  const focalId = createSignal(0);
  const leftCardOpacity = createSignal(0);
  const leftCardScale = createSignal(0.92);
  const leftBadgeScale = createSignal(0);

  const rightCardOpacity = createSignal(0);
  const rightCardScale = createSignal(0.92);

  const setAOpacity = createSignal(0);
  const hubOpacity = createSignal(0);
  const setBOpacity = createSignal(0);

  const conduit1Progress = createSignal(0);
  const conduit2Progress = createSignal(0);
  const casinoBannerOpacity = createSignal(0);

  view.add(
    <Node ref={stage}>
      {/* ===== LEFT CARD: HARDWARE CUTAWAY & FOSHAN 4-MOTOR ===== */}
      <Rect
        x={-440}
        y={-30}
        width={760}
        height={640}
        fill={PALETTE.surface}
        stroke={focalId() === 1 ? PALETTE.amber : PALETTE.cardBorder}
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
          fill={PALETTE.amberBg}
          stroke={PALETTE.amber}
          lineWidth={2}
          scale={leftBadgeScale}
        >
          <Txt
            text="MEKATRONIK 4-MOTOR FOSHAN"
            fontFamily={HEADING_FONT}
            fontSize={20}
            fontWeight={800}
            fill={PALETTE.amber}
          />
        </Rect>

        {/* AI-Illustrated Table Cutaway Asset */}
        <Img
          src={'/assets/vid_20261102_001/beat02_auto_table_cutaway.png'}
          x={0}
          y={-20}
          width={440}
          height={440}
          radius={14}
          scale={() => 1 + Math.sin(time() * 0.75) * 0.012}
        />

        {/* Bottom Hardware Specs */}
        <Rect
          x={0}
          y={240}
          layout={true}
          direction={'column'}
          alignItems={'center'}
          gap={6}
        >
          <Txt
            text="Modal Meja: Rp12 Juta / Unit"
            fontFamily={HEADING_FONT}
            fontSize={24}
            fontWeight={800}
            fill={PALETTE.ink}
          />
          <Txt
            text="2 Set 144 Batu Inti Magnetik"
            fontFamily={FONTS.body}
            fontSize={18}
            fontWeight={600}
            fill={PALETTE.muted}
          />
        </Rect>
      </Rect>

      {/* ===== RIGHT CARD: DUAL-DECK SHUFFLE LOOP DIAGRAM ===== */}
      <Rect
        x={420}
        y={-30}
        width={820}
        height={640}
        fill={PALETTE.surface}
        stroke={focalId() === 2 ? PALETTE.cyan : PALETTE.cardBorder}
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
            text="DUAL-DECK SHUFFLE LOOP // 35 DETIK"
            fontFamily={HEADING_FONT}
            fontSize={26}
            fontWeight={800}
            fill={PALETTE.ink}
          />
          <Txt
            text="Siklus Otomatis vs Kocok Manual 5 Menit"
            fontFamily={FONTS.body}
            fontSize={18}
            fontWeight={600}
            fill={PALETTE.muted}
          />
        </Rect>

        {/* Tier 1: Set A Sedang Dimainkan (Top) */}
        <Rect
          x={0}
          y={-150}
          width={740}
          height={100}
          fill={PALETTE.cyanBg}
          stroke={'#0284C7'}
          lineWidth={2}
          radius={12}
          opacity={setAOpacity}
        >
          <Rect
            x={0}
            y={0}
            layout={true}
            direction={'column'}
            alignItems={'center'}
            gap={4}
          >
            <Txt
              text="SET A: 144 BATU BIRU (DI ATAS MEJA)"
              fontFamily={HEADING_FONT}
              fontSize={20}
              fontWeight={800}
              fill={'#0284C7'}
            />
            <Txt
              text="Ronde Aktif Sedang Dimainkan 4 Orang"
              fontFamily={FONTS.body}
              fontSize={18}
              fontWeight={600}
              fill={PALETTE.ink}
            />
          </Rect>
        </Rect>

        {/* Conduit 1: Set A ditelan ke Drum Magnetik */}
        <Line
          points={[
            [0, -100],
            [0, -60],
          ]}
          stroke={'#64748B'}
          lineWidth={3}
          end={conduit1Progress}
          endArrow={true}
          arrowSize={8}
        />

        {/* Tier 2: Drum Magnetik & 4 Motor (Center Hub) */}
        <Rect
          x={0}
          y={-10}
          width={740}
          height={100}
          fill={PALETTE.amberBg}
          stroke={PALETTE.amber}
          lineWidth={2.5}
          radius={12}
          opacity={hubOpacity}
        >
          <Rect
            x={0}
            y={0}
            layout={true}
            direction={'column'}
            alignItems={'center'}
            gap={4}
          >
            <Txt
              text="MOTOR MAGNETIK FOSHAN (Rp12 JT)"
              fontFamily={HEADING_FONT}
              fontSize={20}
              fontWeight={800}
              fill={PALETTE.amber}
            />
            <Txt
              text="Sensor Optik Memilah Polaritas Inti Besi"
              fontFamily={FONTS.body}
              fontSize={18}
              fontWeight={600}
              fill={PALETTE.ink}
            />
          </Rect>
        </Rect>

        {/* Conduit 2: Elevator mendorong Set B siap naik */}
        <Line
          points={[
            [0, 40],
            [0, 80],
          ]}
          stroke={PALETTE.emerald}
          lineWidth={3}
          end={conduit2Progress}
          endArrow={true}
          arrowSize={8}
        />

        {/* Tier 3: Set B Dikocok Otomatis (Bottom) */}
        <Rect
          x={0}
          y={130}
          width={740}
          height={100}
          fill={PALETTE.emeraldBg}
          stroke={PALETTE.emerald}
          lineWidth={2}
          radius={12}
          opacity={setBOpacity}
        >
          <Rect
            x={0}
            y={0}
            layout={true}
            direction={'column'}
            alignItems={'center'}
            gap={4}
          >
            <Txt
              text="SET B: 144 BATU HIJAU (DIKOCOK OTOMATIS)"
              fontFamily={HEADING_FONT}
              fontSize={20}
              fontWeight={800}
              fill={PALETTE.emerald}
            />
            <Txt
              text="Selesai Tersusun: 35 DETIK (Manual: 5 Menit)"
              fontFamily={FONTS.body}
              fontSize={18}
              fontWeight={700}
              fill={PALETTE.ink}
            />
          </Rect>
        </Rect>

        {/* Bottom Banner: Psikologi Kasino */}
        <Rect
          x={0}
          y={245}
          width={740}
          height={75}
          fill={PALETTE.crimsonBg}
          stroke={PALETTE.crimson}
          lineWidth={2}
          radius={10}
          opacity={casinoBannerOpacity}
        >
          <Rect
            x={0}
            y={0}
            layout={true}
            direction={'column'}
            alignItems={'center'}
            gap={4}
          >
            <Txt
              text="EFEK PSIKOLOGI KASINO // ZERO DOWNTIME"
              fontFamily={HEADING_FONT}
              fontSize={18}
              fontWeight={800}
              fill={PALETTE.crimson}
            />
            <Txt
              text="Pemain Tidak Pernah Sempat Bosan atau Berhenti"
              fontFamily={FONTS.body}
              fontSize={18}
              fontWeight={600}
              fill={PALETTE.ink}
            />
          </Rect>
        </Rect>
      </Rect>
    </Node>
  );

  // --- Choreography Sequence (Scene 02 Total duration: 56.63s) ---
  const sceneStart = SCENE_TIMINGS[1].start; // 53.991
  const sceneDuration = SCENE_TIMINGS[1].duration; // 56.631
  const rel = (absSec: number) => absSec - sceneStart;

  // t = 0.3s: Left Card enters with cutaway illustration
  yield* waitUntilSceneTime(0.3, t0);
  focalId(1);
  yield* all(
    leftCardOpacity(1, 0.6, easeOutExpo),
    leftCardScale(1, 0.6, easeOutExpo),
  );

  // t = 4.4s: "teknologi di dalam meja seharga dua belas juta rupiah ini"
  yield* waitUntilSceneTime(rel(58.4), t0);
  yield* leftBadgeScale(1, 0.5, easeOutExpo);

  // t = 14.5s: "mengocok batu secara manual dan menumpuk tembok 5 menit"
  yield* waitUntilSceneTime(rel(68.5), t0);
  focalId(2);
  yield* all(
    rightCardOpacity(1, 0.6, easeOutExpo),
    rightCardScale(1, 0.6, easeOutExpo),
    setAOpacity(1, 0.5, easeOutExpo),
  );

  // t = 24.5s: "mesin empat motor impor dari Foshan... dua set batu magnetik"
  yield* waitUntilSceneTime(rel(78.5), t0);
  yield* all(
    conduit1Progress(1, 0.4, easeOutExpo),
    hubOpacity(1, 0.5, easeOutExpo),
  );

  // t = 35.2s: "tombol tengah... batu kotor ditelan masuk drum"
  yield* waitUntilSceneTime(rel(89.2), t0);
  focalId(1);
  yield* leftCardScale(1.03, 0.3, easeOutCubic).to(1.0, 0.3, easeOutCubic);

  // t = 40.5s: "dalam waktu tiga puluh lima detik saja, elevator otomatis..."
  yield* waitUntilSceneTime(rel(94.5), t0);
  focalId(2);
  yield* all(
    conduit2Progress(1, 0.5, easeOutExpo),
    setBOpacity(1, 0.5, easeOutExpo),
  );

  // t = 50.5s: "kecepatan putaran tanpa jeda menciptakan efek psikologi kasino..."
  yield* waitUntilSceneTime(rel(104.5), t0);
  yield* casinoBannerOpacity(1, 0.4, easeOutExpo);

  // Strict Hold-Time: Diagram remains fully visible until 56.63s (>= 2.7s hold)
  yield* finishSceneAt(sceneDuration, t0);
});
