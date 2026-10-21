import React from 'react';
import { Composition } from 'remotion';
import { StickFigureScene } from './Composition';
import { StickFigureProps } from './types';
import defaultProps from '../props.json';

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="WavingStickFigure"
      component={StickFigureScene}
      durationInFrames={90} // 3 seconds at 30 fps
      fps={30}
      width={1280}
      height={720}
      defaultProps={defaultProps as StickFigureProps}
    />
  );
};
