import { Txt, TxtProps } from '@motion-canvas/2d';
import { SignalValue, unwrap } from '@motion-canvas/core';
import { THEME } from './theme';

export interface LiveCounterProps extends Omit<TxtProps, 'text'> {
  value: SignalValue<number>;
  prefix?: SignalValue<string>;
  suffix?: SignalValue<string>;
  decimals?: number;
  useGrouping?: boolean;
}

export function formatLiveNumber(
  val: number,
  prefix = '',
  suffix = '',
  decimals = 0,
  useGrouping = true
): string {
  const num = Number(val);
  const formatted = decimals > 0
    ? num.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
        useGrouping,
      })
    : Math.round(num).toLocaleString('en-US', { useGrouping });

  return `${prefix}${formatted}${suffix}`;
}

export function LiveCounter(props: LiveCounterProps) {
  const {
    value,
    prefix = '',
    suffix = '',
    decimals = 0,
    useGrouping = true,
    fontFamily = THEME.fonts.data,
    fontSize = 88,
    fontWeight = 700,
    fill = THEME.colors.ink,
    ...rest
  } = props;

  return (
    <Txt
      text={() =>
        formatLiveNumber(
          unwrap(value),
          unwrap(prefix),
          unwrap(suffix),
          decimals,
          useGrouping
        )
      }
      fontFamily={fontFamily}
      fontSize={fontSize}
      fontWeight={fontWeight}
      fill={fill}
      {...rest}
    />
  );
}
