import { Circle, Img, Line, Node, Rect, Txt } from '@motion-canvas/2d';
import { createRef } from '@motion-canvas/core';
import type { SimpleSignal } from '@motion-canvas/core';
import { C, FONT, countText, easeBack, easeOut, lerp, parseNumber, prog, toneColor, toneTint } from './theme';
import type { Tone } from './theme';
import type { RItem, RShot } from './types';

type Ex = NonNullable<RShot['explainer']>;
type Sig = SimpleSignal<number>;

/** Everything an explainer needs: clock, start of its own timeline, panel size. */
interface Ctx {
  ex: Ex;
  t: Sig;
  c0: number;
  W: number;
  H: number;
  /** Asset folder name under /assets/ (icons live in /assets/<dir>/icons/<icon>.png). */
  dir?: string;
}

const NOTE_LAG = 0.35;
const valueColor = (tone?: Tone) => (tone === undefined || tone === 'neutral' ? C.ink : toneColor(tone));

/** Newest item 1.0, items that did their job 0.32. */
const focus = (items: RItem[], i: number, t: number) =>
  items[i + 1] ? lerp(1, 0.32, prog(t, items[i + 1].t, 0.3)) : 1;

const T = (props: Record<string, any>) => (
  <Txt fontFamily={FONT} fontWeight={700} fill={C.ink} {...props} />
);

function Title({ ex, t, c0, W, H }: Ctx) {
  if (!ex.title) return <Node />;
  const first = ex.items.length ? Math.min(...ex.items.map((i) => i.t)) : Infinity;
  return T({
    text: ex.title, fontSize: 46, fontWeight: 800,
    x: -W / 2 + 64, y: -H / 2 + 64, offset: [-1, 0],
    opacity: () => prog(t(), c0, 0.4) * lerp(1, 0.6, prog(t(), first, 0.3)),
  });
}

/** Shaft draws from (x1,y1) to (x2,y2); the V head rides the tip. e() is 0..1. */
function Arrow(p: { x1: number; y1: number; x2: number; y2: number; e: () => number; color?: string; width?: number; head?: number; opacity?: () => number }) {
  const { x1, y1, x2, y2, e } = p;
  const color = p.color ?? C.ink, w = p.width ?? 6, h = p.head ?? 20;
  const ang = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
  return (
    <Node opacity={p.opacity ?? (() => 1)}>
      <Line points={[[x1, y1], [x2, y2]]} stroke={color} lineWidth={w} lineCap="round" end={() => e()} opacity={() => (e() > 0.001 ? 1 : 0)} />
      <Line
        x={() => lerp(x1, x2, e())} y={() => lerp(y1, y2, e())} rotation={ang}
        points={[[-h, -h * 0.7], [0, 0], [-h, h * 0.7]]}
        stroke={color} lineWidth={w} lineCap="round" lineJoin="round"
        opacity={() => (e() > 0.001 ? 1 : 0)}
      />
    </Node>
  );
}

/** X/Y axes with arrowheads; they draw first, starting at c0 + 0.1. */
function Axes(p: Ctx & { ox: number; oy: number; xTip: number; yTip: number }) {
  const { t, c0, ox, oy, xTip, yTip } = p;
  const e = () => easeOut(prog(t(), c0 + 0.1, 0.6));
  return (
    <Node>
      <Arrow x1={ox} y1={oy} x2={ox} y2={yTip} e={e} />
      <Arrow x1={ox} y1={oy} x2={xTip} y2={oy} e={e} />
    </Node>
  );
}

function AxisLabels(p: Ctx & { ox: number; oy: number; yTip: number; dy?: number }) {
  const { ex, t, c0, ox, oy, yTip } = p;
  const op = () => prog(t(), c0 + 0.5, 0.3);
  return (
    <Node>
      {ex.yLabel ? T({ text: ex.yLabel, fontSize: 30, fill: C.slate, x: ox, y: yTip - 30, opacity: op }) : null}
      {ex.xLabel ? T({ text: ex.xLabel, fontSize: 30, fill: C.slate, x: p.W / 2 - 64 - 200, y: oy + (p.dy ?? 56), opacity: op }) : null}
    </Node>
  );
}

// ---------------------------------------------------------------- stack
function stack(c: Ctx) {
  const { ex, t, W, H } = c;
  const items = ex.items, n = items.length;
  const top = -H / 2 + 128, bottom = H / 2 - 36;
  const pitch = Math.min(128, (bottom - top) / Math.max(n, 1));
  const L = -W / 2 + 64, R = W / 2 - 64;
  return items.map((it, i) => {
    const y = top + (i + 0.5) * pitch;
    const note = !!it.note;
    const a = () => easeOut(prog(t(), it.t, 0.35));
    return (
      <Node x={() => (1 - a()) * 40} opacity={() => a() * focus(items, i, t())}>
        <Rect x={0} y={y} width={R - L} height={pitch - 14} radius={22} fill={toneTint(it.tone)} />
        {T({ text: it.label ?? '', x: L + 28, y: y - (note ? 20 : 0), offset: [-1, 0], fontSize: 40 })}
        {note ? T({ text: it.note, x: L + 28, y: y + 24, offset: [-1, 0], fontSize: 30, fontWeight: 500, fill: C.slate, opacity: () => prog(t(), it.t + 0.45 + NOTE_LAG, 0.3) }) : null}
        {T({ text: () => countText(it.value ?? '', easeOut(prog(t(), it.t, 0.45))), x: R - 28, y, offset: [1, 0], fontSize: 52, fontWeight: 800, fill: valueColor(it.tone) })}
      </Node>
    );
  });
}

// ----------------------------------------------------------------- bars
function bars(c: Ctx) {
  const { ex, t, W, H } = c;
  const items = ex.items, n = items.length;
  const labelCol = W > 1500 ? 400 : 330;
  const ox = -W / 2 + 64 + labelCol, oy = H / 2 - 100;
  const xTip = W / 2 - 64, yTip = -H / 2 + 150;
  const r0 = yTip + 36, r1 = oy - 12;
  const pitch = Math.min(130, (r1 - r0) / Math.max(n, 1));
  const bt = Math.min(56, pitch * 0.5);
  const barMax = xTip - 40 - ox - 330;
  const nums = items.map((i) => i.numeric ?? parseNumber(i.value) ?? 0);
  const max = Math.max(...nums, 1e-9);
  const GROW = 0.8;
  const rows = items.map((it, i) => {
    const yb = r0 + (i + 0.5) * pitch - (pitch >= 96 ? 14 : 0);
    const g = () => easeOut(prog(t(), it.t, GROW));
    const len = () => Math.max(2, (barMax * nums[i]) / max * g());
    const col = toneColor(it.tone);
    return (
      <Node opacity={() => focus(items, i, t())}>
        <Node opacity={() => prog(t(), it.t, 0.15)}>
          {T({ text: it.label ?? '', x: ox - 28, y: yb, offset: [1, 0], fontSize: 36, textAlign: 'right', width: labelCol - 20, textWrap: true })}
        </Node>
        <Rect x={() => ox + 4 + len() / 2} y={yb} width={len} height={bt} radius={10} fill={col} opacity={() => prog(t(), it.t, 0.05)} />
        {T({ text: () => countText(it.value ?? '', g()), x: () => ox + 4 + len() + 20, y: yb, offset: [-1, 0], fontSize: 48, fontWeight: 800, fill: col, opacity: () => prog(t(), it.t, 0.1) })}
        {it.note ? T({ text: it.note, x: ox + 12, y: yb + bt / 2 + 26, offset: [-1, 0], fontSize: 30, fontWeight: 500, fill: C.slate, opacity: () => prog(t(), it.t + GROW + NOTE_LAG, 0.3) }) : null}
      </Node>
    );
  });
  return [
    <Axes {...c} ox={ox} oy={oy} xTip={xTip} yTip={yTip} />,
    <AxisLabels {...c} ox={ox} oy={oy} yTip={yTip} />,
    ...rows,
  ];
}

// ----------------------------------------------------------------- stat
function stat(c: Ctx) {
  const { ex, t, W, H } = c;
  const items = ex.items;
  return items.map((it, i) => {
    const end = items[i + 1]?.t ?? Infinity;
    const a = () => easeBack(prog(t(), it.t, 0.4));
    const vis = () => prog(t(), it.t, 0.2) * (1 - prog(t(), end, 0.12));
    const size = Math.max(150, Math.min(190, (W - 200) / (Math.max((it.value ?? '').length, 1) * 0.62)));
    // the full-length text (invisible) fixes the width, so counting never shifts the glyphs
    const fin = createRef<Txt>();
    const COUNT = 0.9;
    return (
      <Node opacity={vis} y={-10}>
        {T({ text: it.label ?? '', y: -size * 0.95, fontSize: 44, fill: C.slate, scale: () => lerp(0.92, 1, a()) })}
        {T({ ref: fin, text: it.value ?? '', fontSize: size, fontWeight: 800, opacity: 0 })}
        {T({ text: () => countText(it.value ?? '', easeOut(prog(t(), it.t, COUNT))), x: () => -fin().width() / 2, offset: [-1, 0], fontSize: size, fontWeight: 800, fill: valueColor(it.tone), scale: () => lerp(0.9, 1, a()) })}
        {it.note ? T({ text: it.note, y: size * 0.95, fontSize: 38, fontWeight: 500, fill: C.slate, opacity: () => prog(t(), it.t + COUNT + NOTE_LAG, 0.3) }) : null}
      </Node>
    );
  });
}

// -------------------------------------------------------------- compare
function compare(c: Ctx) {
  const { ex, t, c0, W, H } = c;
  const items = ex.items, n = items.length;
  const inner = W - 128, L = -W / 2 + 64;
  const labelCol = inner * 0.36, valCol = (inner - labelCol) / 2;
  const xa = L + labelCol + valCol / 2, xb = xa + valCol;
  const hy = -H / 2 + 140;
  const top = hy + 56, bottom = H / 2 - 36;
  const pitch = Math.min(124, (bottom - top) / Math.max(n, 1));
  const heads = ex.columns ?? ['', ''];
  const headOp = () => prog(t(), c0, 0.4);
  const out: any[] = [
    T({ text: heads[0], x: xa, y: hy, fontSize: 40, fontWeight: 800, opacity: headOp }),
    T({ text: heads[1], x: xb, y: hy, fontSize: 40, fontWeight: 800, opacity: headOp }),
  ];
  items.forEach((it, i) => {
    const y = top + (i + 0.5) * pitch;
    const win = it.win ?? 'b';
    const wx = win === 'a' ? xa : xb;
    const col = it.tone && it.tone !== 'neutral' ? toneColor(it.tone) : C.blue;
    const a = () => easeOut(prog(t(), it.t, 0.35));
    const cell = (v: string | undefined, x: number, won: boolean) =>
      T({ text: v ?? '', x, y, fontSize: won ? 50 : 44, fontWeight: won ? 800 : 600, fill: won ? col : C.slate });
    out.push(
      <Node x={() => (1 - a()) * 40} opacity={() => a() * focus(items, i, t())}>
        <Rect x={wx} y={y} width={valCol - 36} height={pitch - 18} radius={22} fill={toneTint(it.tone ?? 'neutral')} stroke={col} lineWidth={4} />
        {T({ text: it.label ?? '', x: L + 12, y: y - (it.note ? 18 : 0), offset: [-1, 0], fontSize: 38 })}
        {it.note ? T({ text: it.note, x: L + 12, y: y + 24, offset: [-1, 0], fontSize: 30, fontWeight: 500, fill: C.slate, opacity: () => prog(t(), it.t + 0.35 + NOTE_LAG, 0.3) }) : null}
        {cell(it.a, xa, win === 'a')}
        {cell(it.b, xb, win === 'b')}
      </Node>,
    );
  });
  return out;
}

// ----------------------------------------------------------------- line
const SERIES_COLOR = { a: C.blue, b: C.crimson };
function line(c: Ctx) {
  const { ex, t, c0, W, H } = c;
  const items = ex.items;
  const ox = -W / 2 + 130, oy = H / 2 - 130;
  const xTip = W / 2 - 64, yTip = -H / 2 + 200;
  const labels: string[] = [];
  items.forEach((i) => { if (!labels.includes(i.label ?? '')) labels.push(i.label ?? ''); });
  const N = labels.length;
  const step = (xTip - 60 - ox) / Math.max(N, 1);
  const px = (lab: string | undefined) => ox + (labels.indexOf(lab ?? '') + 0.5) * step;
  const nums = items.map((i) => i.numeric ?? parseNumber(i.value) ?? 0);
  const max = Math.max(...nums, 1e-9);
  const py = (v: number) => oy - (v / max) * 0.8 * (oy - yTip);
  const LEN = 0.7;
  const out: any[] = [
    <Axes {...c} ox={ox} oy={oy} xTip={xTip} yTip={yTip} />,
    <AxisLabels {...c} ox={ox} oy={oy} yTip={yTip} dy={92} />,
  ];
  // x labels appear with their first point
  labels.forEach((lab) => {
    const first = items.find((i) => (i.label ?? '') === lab)!;
    out.push(T({ text: lab, x: px(lab), y: oy + 40, fontSize: 32, fontWeight: 600, fill: C.slate, opacity: () => prog(t(), first.t, 0.3) }));
  });
  // legend when two series
  if (items.some((i) => i.series === 'b') && ex.columns) {
    (['a', 'b'] as const).forEach((k, j) => {
      const lx = ox + 40 + j * 330;
      out.push(
        <Circle x={lx} y={-H / 2 + 128} size={22} fill={SERIES_COLOR[k]} opacity={() => prog(t(), c0 + 0.5, 0.3)} />,
        T({ text: ex.columns![j], x: lx + 22, y: -H / 2 + 128, offset: [-1, 0], fontSize: 32, opacity: () => prog(t(), c0 + 0.5, 0.3) }),
      );
    });
  }
  const prevOf = (i: number) => {
    const s = items[i].series ?? 'a';
    for (let j = i - 1; j >= 0; j--) if ((items[j].series ?? 'a') === s) return j;
    return -1;
  };
  items.forEach((it, i) => {
    const col = SERIES_COLOR[it.series ?? 'a'];
    const p = prevOf(i);
    const x2 = px(it.label), y2 = py(nums[i]);
    const x1 = p >= 0 ? px(items[p].label) : x2, y1 = p >= 0 ? py(nums[p]) : y2;
    const e = () => (p >= 0 ? easeOut(prog(t(), it.t, LEN)) : 1);
    const done = it.t + (p >= 0 ? LEN : 0.25);
    if (p >= 0) {
      out.push(<Line points={[[x1, y1], [x2, y2]]} stroke={col} lineWidth={8} lineCap="round" end={e} opacity={() => (e() > 0.001 ? 1 : 0)} />);
    }
    const dim = () => focus(items, i, t());
    // with two series, the higher point's value sits above it and the lower one's below
    const twin = items.find((o, j) => j !== i && (o.label ?? '') === (it.label ?? '') && (o.series ?? 'a') !== (it.series ?? 'a'));
    const below = !!twin && (twin.numeric ?? parseNumber(twin.value) ?? 0) > nums[i];
    out.push(
      <Circle x={() => lerp(x1, x2, e())} y={() => lerp(y1, y2, e())} size={26} fill={col} stroke={C.white} lineWidth={5} opacity={() => prog(t(), it.t, 0.1) * dim()} />,
      T({ text: () => countText(it.value ?? '', easeOut(prog(t(), it.t, LEN))), x: x2, y: below ? y2 + 46 : y2 - 44, fontSize: 44, fontWeight: 800, fill: col, opacity: () => prog(t(), done - 0.15, 0.2) * dim() }),
    );
    if (it.note) {
      out.push(T({ text: it.note, x: W / 2 - 64, y: -H / 2 + 128, offset: [1, 0], fontSize: 32, fontWeight: 500, fill: C.slate, opacity: () => prog(t(), done + NOTE_LAG, 0.3) * (1 - prog(t(), items[i + 1]?.t ?? Infinity, 0.2)) }));
    }
  });
  return out;
}

// ----------------------------------------------------------------- flow
function flow(c: Ctx) {
  const { ex, t, W, H } = c;
  const items = ex.items, n = items.length;
  const gap = n > 4 ? 76 : 96;
  const inner = W - 112;
  const bw = (inner - gap * (n - 1)) / Math.max(n, 1);
  const hasIcons = items.some((it) => it.icon);
  const bh = hasIcons ? 330 : 230, y = -30;
  const iconSize = Math.min(bw - 60, 150);
  const x0 = -W / 2 + 56 + bw / 2;
  const ARROW = 0.35, POP = 0.3;
  const out: any[] = [];
  items.forEach((it, i) => {
    const cx = x0 + i * (bw + gap);
    const boxT = it.t + (i > 0 ? ARROW : 0);
    const a = () => easeBack(prog(t(), boxT, POP));
    const active = () => 1 - prog(t(), items[i + 1]?.t ?? Infinity, 0.3);
    const col = it.tone && it.tone !== 'neutral' ? toneColor(it.tone) : C.blue;
    if (i > 0) {
      const px = x0 + (i - 1) * (bw + gap) + bw / 2;
      out.push(
        <Arrow x1={px + 6} y1={y} x2={cx - bw / 2 - 6} y2={y} e={() => easeOut(prog(t(), it.t, ARROW))} color={C.ink}
          opacity={() => lerp(0.32, 1, active())} />,
      );
    }
    out.push(
      <Node opacity={() => prog(t(), boxT, 0.12) * lerp(0.32, 1, active())} scale={() => lerp(0.85, 1, a())} x={cx} y={y}>
        <Rect width={bw} height={bh} radius={28} fill={() => (active() > 0.5 ? toneTint(it.tone ?? 'neutral') : C.paper)} stroke={() => (active() > 0.5 ? col : C.ink)} lineWidth={() => (active() > 0.5 ? 6 : 3)} />
        {it.icon ? <Img src={`/assets/${c.dir}/icons/${it.icon}.png`} width={iconSize} height={iconSize} y={-bh / 2 + 24 + iconSize / 2} /> : null}
        {T({ text: it.label ?? '', y: (hasIcons ? 70 : 0) + (it.value ? -40 : 0), fontSize: 38, fontWeight: 800, width: bw - 36, textWrap: true, textAlign: 'center' })}
        {it.value ? T({ text: it.value, y: (hasIcons ? 70 : 0) + 56, fontSize: 44, fontWeight: 800, fill: col }) : null}
      </Node>,
    );
    if (it.note) {
      out.push(T({ text: it.note, x: cx, y: y + bh / 2 + 70, fontSize: 30, fontWeight: 500, fill: C.slate, width: bw + gap - 12, textWrap: true, textAlign: 'center',
        opacity: () => prog(t(), boxT + POP + NOTE_LAG, 0.3) * lerp(0.32, 1, active()) }));
    }
  });
  return out;
}

// -------------------------------------------------------------- receipt
function receipt(c: Ctx) {
  const { ex, t, c0, W, H } = c;
  const items = ex.items, n = items.length;
  const pw = Math.min(W - 160, 880), ph = H - 70;
  const py = 10;
  const top = py - ph / 2 + 150, bottom = py + ph / 2 - 40;
  const pitch = Math.min(112, (bottom - top) / Math.max(n, 1));
  const rw = pw - 100;
  const DOTS = '. '.repeat(80);
  const out: any[] = [
    <Rect x={0} y={py} width={pw} height={ph} fill={C.paper} stroke={C.ink} lineWidth={3} lineDash={[14, 10]} radius={6} opacity={() => prog(t(), c0, 0.4)} />,
    T({ text: ex.title ?? '', x: 0, y: py - ph / 2 + 56, fontSize: 44, fontWeight: 800, opacity: () => prog(t(), c0 + 0.1, 0.4) * lerp(1, 0.6, prog(t(), items[0]?.t ?? Infinity, 0.3)) }),
  ];
  items.forEach((it, i) => {
    const total = it.tone === 'warn' || /^total/i.test(it.label ?? '');
    const y = top + (i + 0.5) * pitch;
    const a = () => easeOut(prog(t(), it.t, 0.35));
    const size = total ? 46 : 38;
    const vsize = total ? 54 : 44;
    const ry = y - (it.note ? 14 : 0);
    const lab = createRef<Txt>(), fin = createRef<Txt>();
    out.push(
      <Node y={() => (1 - a()) * 16} opacity={() => a() * focus(items, i, t())}>
        {total ? <Line points={[[-rw / 2, y - pitch / 2 + 4], [rw / 2, y - pitch / 2 + 4]]} stroke={C.ink} lineWidth={5} /> : null}
        {T({ ref: lab, text: it.label ?? '', x: -rw / 2, y: ry, offset: [-1, 0], fontSize: size, fontWeight: total ? 800 : 600 })}
        {T({ ref: fin, text: it.value ?? '', x: rw / 2, y: ry, offset: [1, 0], fontSize: vsize, fontWeight: 800, opacity: 0 })}
        {T({ text: () => countText(it.value ?? '', easeOut(prog(t(), it.t, 0.45))), x: rw / 2, y: ry, offset: [1, 0], fontSize: vsize, fontWeight: 800, fill: total ? valueColor(it.tone) : C.ink })}
        <Line
          points={() => [[-rw / 2 + lab().width() + 18, ry + size * 0.3], [rw / 2 - fin().width() - 18, ry + size * 0.3]]}
          stroke={C.slate} lineWidth={5} lineCap="round" lineDash={[1, 14]}
        />
        {it.note ? T({ text: it.note, x: -rw / 2, y: y + size / 2 + 14, offset: [-1, 0], fontSize: 30, fontWeight: 500, fill: C.slate, opacity: () => prog(t(), it.t + 0.45 + NOTE_LAG, 0.3) }) : null}
      </Node>,
    );
  });
  return out;
}

const BUILDERS: Record<string, (c: Ctx) => any[]> = { stack, bars, stat, compare, line, flow, receipt };

/** All children of an explainer panel, in panel-local coordinates. */
export function buildExplainer(c: Ctx): any[] {
  const build = BUILDERS[c.ex.type];
  if (!build) throw new Error(`[v2] unknown explainer type "${c.ex.type}"`);
  const title = c.ex.type === 'receipt' ? <Node /> : <Title {...c} />;
  return [title, ...build(c)];
}
