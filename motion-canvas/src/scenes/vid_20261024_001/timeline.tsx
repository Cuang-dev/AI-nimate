import { Circle, Line, Node, Rect, RectProps, Txt } from '@motion-canvas/2d';
import { Reference, SignalValue } from '@motion-canvas/core';
import { THEME } from './theme';

export interface TimelineMilestone {
  date: string;
  label: string;
  highlight?: boolean;
}

export interface TimelineProps extends RectProps {
  milestones: TimelineMilestone[];
  progress?: SignalValue<number>;
  lineRef?: Reference<Line>;
  width?: number;
}

export function Timeline(props: TimelineProps) {
  const {
    milestones,
    progress = 1,
    lineRef,
    width = 960,
    height = 135,
    ...rest
  } = props;

  const total = milestones.length;
  const startX = -width / 2 + 130;
  const endX = width / 2 - 130;
  const stepX = (endX - startX) / Math.max(1, total - 1);

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
      {/* Background connector line */}
      <Line
        points={[
          [startX, 0],
          [endX, 0],
        ]}
        stroke={THEME.colors.gridLine}
        lineWidth={4}
      />

      {/* Animated active progress line */}
      <Line
        ref={lineRef}
        points={[
          [startX, 0],
          [endX, 0],
        ]}
        stroke={THEME.colors.ink}
        lineWidth={4}
        end={progress}
      />

      {/* Milestone Nodes */}
      {milestones.map((m, idx) => {
        const xPos = startX + idx * stepX;
        const isHighlight = m.highlight;
        return (
          <Node key={m.date} x={xPos} y={0}>
            {/* Center Tick Node */}
            <Circle
              size={isHighlight ? 20 : 16}
              fill={isHighlight ? THEME.colors.accent : THEME.colors.surface}
              stroke={isHighlight ? THEME.colors.accent : THEME.colors.ink}
              lineWidth={3}
            />

            {/* Date Header Above */}
            <Txt
              text={m.date}
              y={-34}
              fontFamily={THEME.fonts.data}
              fontSize={26}
              fontWeight={700}
              fill={isHighlight ? THEME.colors.accent : THEME.colors.ink}
              textAlign={'center'}
              letterSpacing={0.5}
            />

            {/* Label Subtitle Below */}
            <Txt
              text={m.label}
              y={34}
              fontFamily={THEME.fonts.body}
              fontSize={24}
              fontWeight={600}
              fill={isHighlight ? THEME.colors.accent : THEME.colors.secondaryInk}
              textAlign={'center'}
            />
          </Node>
        );
      })}
    </Rect>
  );
}
