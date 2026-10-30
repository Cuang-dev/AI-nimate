import { Circle, Line, Node, Rect, RectProps, Txt } from '@motion-canvas/2d';
import { createRef, Reference, SignalValue, SimpleSignal } from '@motion-canvas/core';
import { THEME } from './theme';

export interface ChartSeries {
  name: string;
  color: string;
  points: [number, number][];
  lineRef?: Reference<Line>;
  end?: SignalValue<number>;
}

export interface BarLineChartProps extends RectProps {
  title?: SignalValue<string>;
  subtitle?: SignalValue<string>;
  xLabels?: string[];
  yLabels?: string[];
  series?: ChartSeries[];
  inversionPoint?: [number, number];
  inversionLabel?: SignalValue<string>;
  inversionOpacity?: SignalValue<number>;
  statusPillText?: SignalValue<string>;
  statusPillBg?: SignalValue<string>;
}

export function BarLineChart(props: BarLineChartProps) {
  const {
    title = 'VELOCITY MATRIX // WEEKLY UNITS',
    subtitle = 'REPORTED UNIT VELOCITY (MAY — AUG 2024)',
    xLabels = ['MAY 2024', 'JUN 2024', 'JUL 2024', 'AUG 2024'],
    yLabels = ['', '', '', ''],
    series = [],
    inversionPoint,
    inversionLabel = 'INVERSION: RETURNS > SALES',
    inversionOpacity = 0,
    statusPillText = '',
    statusPillBg = THEME.colors.accent,
    width = 960,
    height = 500,
    ...rest
  } = props;

  const chartW = Number(width) - 120;
  const chartH = Number(height) - 160;
  const chartOriginY = 30;

  return (
    <Rect
      width={width}
      height={height}
      fill={THEME.colors.surface}
      stroke={THEME.colors.gridLine}
      lineWidth={THEME.stroke.border}
      radius={0}
      {...rest}
    >
      {/* Header Bar */}
      <Rect
        y={-Number(height) / 2 + 42}
        width={Number(width) - 64}
        height={46}
        layout
        direction={'row'}
        justifyContent={'space-between'}
        alignItems={'center'}
      >
        <Rect layout direction={'column'} gap={2}>
          <Txt
            text={title}
            fontFamily={THEME.fonts.data}
            fontSize={26}
            fontWeight={700}
            fill={THEME.colors.ink}
            letterSpacing={1.2}
          />
          <Txt
            text={subtitle}
            fontFamily={THEME.fonts.body}
            fontSize={24}
            fontWeight={500}
            fill={THEME.colors.secondaryInk}
          />
        </Rect>

        {/* Legend */}
        <Rect layout direction={'row'} gap={16} alignItems={'center'}>
          {series.map((s) => (
            <Rect layout direction={'row'} gap={6} alignItems={'center'} key={`legend-${s.name}`}>
              <Rect width={12} height={12} fill={s.color} />
              <Txt
                text={s.name}
                fontFamily={THEME.fonts.data}
                fontSize={24}
                fontWeight={700}
                fill={THEME.colors.ink}
                letterSpacing={0.8}
              />
            </Rect>
          ))}
        </Rect>
      </Rect>

      {/* Horizontal Grid lines & Y Labels */}
      {yLabels.map((lbl, idx) => {
        const yPos = chartOriginY - chartH / 2 + (idx / Math.max(1, yLabels.length - 1)) * chartH;
        return (
          <Node key={`ygrid-${idx}`}>
            <Line
              points={[
                [-chartW / 2, yPos],
                [chartW / 2, yPos],
              ]}
              stroke={THEME.colors.gridLine}
              lineWidth={THEME.stroke.hairline}
            />
            {lbl ? (
              <Txt
                text={lbl}
                x={-chartW / 2 - 24}
                y={yPos}
                fontFamily={THEME.fonts.data}
                fontSize={24}
                fontWeight={600}
                fill={THEME.colors.secondaryInk}
                textAlign={'right'}
              />
            ) : null}
          </Node>
        );
      })}

      {/* X Labels */}
      {xLabels.map((lbl, idx) => {
        const xPos = -chartW / 2 + (idx / Math.max(1, xLabels.length - 1)) * chartW;
        return (
          <Node key={`xgrid-${idx}`}>
            <Line
              points={[
                [xPos, chartOriginY + chartH / 2],
                [xPos, chartOriginY + chartH / 2 + 10],
              ]}
              stroke={THEME.colors.gridLine}
              lineWidth={THEME.stroke.hairline}
            />
            <Txt
              text={lbl}
              x={xPos}
              y={chartOriginY + chartH / 2 + 26}
              fontFamily={THEME.fonts.data}
              fontSize={24}
              fontWeight={700}
              fill={THEME.colors.secondaryInk}
              textAlign={'center'}
            />
          </Node>
        );
      })}

      {/* Render Series Lines */}
      {series.map((s) => (
        <Line
          key={`line-${s.name}`}
          ref={s.lineRef}
          points={s.points}
          stroke={s.color}
          lineWidth={THEME.stroke.thick}
          end={s.end ?? 1}
        />
      ))}

      {/* Inversion callout marker */}
      {inversionPoint ? (
        <Node
          x={inversionPoint[0]}
          y={inversionPoint[1]}
          opacity={inversionOpacity}
        >
          <Circle
            size={20}
            fill={THEME.colors.surface}
            stroke={THEME.colors.accent}
            lineWidth={THEME.stroke.thick}
          />
          <Rect
            layout
            y={-36}
            padding={[8, 16]}
            fill={THEME.colors.accent}
          >
            <Txt
              text={inversionLabel}
              fontFamily={THEME.fonts.data}
              fontSize={24}
              fontWeight={700}
              fill={THEME.colors.surface}
              letterSpacing={0.5}
            />
          </Rect>
        </Node>
      ) : null}

      {/* Status Pill Badge */}
      {statusPillText ? (
        <Rect
          layout
          y={Number(height) / 2 - 28}
          padding={[10, 20]}
          fill={statusPillBg}
        >
          <Txt
            text={statusPillText}
            fontFamily={THEME.fonts.data}
            fontSize={25}
            fontWeight={700}
            fill={THEME.colors.surface}
            letterSpacing={1.2}
          />
        </Rect>
      ) : null}
    </Rect>
  );
}
