import { Node, NodeProps, Rect, RectProps, Txt } from '@motion-canvas/2d';
import { createRef, Reference, SignalValue, SimpleSignal } from '@motion-canvas/core';
import { THEME } from './theme';

export interface KineticStatCardProps extends RectProps {
  label: SignalValue<string>;
  value: SignalValue<string>;
  unit?: SignalValue<string>;
  subtitle?: SignalValue<string>;
  tag?: SignalValue<string>;
  tagAccent?: boolean;
  valueColor?: SignalValue<string>;
  valueFontSize?: SignalValue<number>;
}

export function KineticStatCard(props: KineticStatCardProps) {
  const {
    label,
    value,
    unit = '',
    subtitle = '',
    tag = '',
    tagAccent = false,
    valueColor = THEME.colors.ink,
    valueFontSize = 88,
    width = 460,
    height = 240,
    ...rest
  } = props;

  return (
    <Rect
      width={width}
      height={height}
      fill={THEME.colors.surface}
      stroke={THEME.colors.gridLine}
      lineWidth={THEME.stroke.border}
      radius={0}
      layout
      direction={'column'}
      justifyContent={'space-between'}
      padding={28}
      {...rest}
    >
      {/* Top row: Label and optional Tag */}
      <Rect
        layout
        width={'100%'}
        direction={'row'}
        justifyContent={'space-between'}
        alignItems={'center'}
      >
        <Txt
          text={label}
          fontFamily={THEME.fonts.data}
          fontSize={28}
          fontWeight={700}
          fill={THEME.colors.secondaryInk}
          letterSpacing={1.2}
        />
        {tag ? (
          <Rect
            layout
            padding={[8, 16]}
            fill={tagAccent ? THEME.colors.accent : THEME.colors.bg}
            stroke={tagAccent ? THEME.colors.accent : THEME.colors.gridLine}
            lineWidth={THEME.stroke.border}
          >
            <Txt
              text={tag}
              fontFamily={THEME.fonts.data}
              fontSize={24}
              fontWeight={700}
              fill={tagAccent ? THEME.colors.surface : THEME.colors.ink}
              letterSpacing={1}
            />
          </Rect>
        ) : null}
      </Rect>

      {/* Middle row: Large Value & Unit */}
      <Rect
        layout
        direction={'row'}
        alignItems={'baseline'}
        gap={12}
      >
        <Txt
          text={value}
          fontFamily={THEME.fonts.data}
          fontSize={valueFontSize}
          fontWeight={700}
          fill={valueColor}
          letterSpacing={-1}
        />
        {unit ? (
          <Txt
            text={unit}
            fontFamily={THEME.fonts.data}
            fontSize={28}
            fontWeight={600}
            fill={THEME.colors.secondaryInk}
          />
        ) : null}
      </Rect>

      {/* Bottom row: Subtitle / footnote */}
      {subtitle ? (
        <Txt
          text={subtitle}
          fontFamily={THEME.fonts.body}
          fontSize={26}
          fontWeight={400}
          fill={THEME.colors.secondaryInk}
        />
      ) : (
        <Rect height={1} />
      )}
    </Rect>
  );
}
