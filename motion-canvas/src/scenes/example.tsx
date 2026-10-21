import { makeScene2D, Circle, Txt } from '@motion-canvas/2d';
import { all, createRef } from '@motion-canvas/core';
import sceneProps from '../props.json';

export default makeScene2D(function* (view) {
  const circleRef = createRef<Circle>();
  const textRef = createRef<Txt>();

  view.fill('#0f172a');

  view.add(
    <Circle
      ref={circleRef}
      size={0}
      fill={sceneProps.primaryColor || '#f43f5e'}
      y={-40}
    />
  );

  view.add(
    <Txt
      ref={textRef}
      text={sceneProps.title}
      y={130}
      fill="#f8fafc"
      fontSize={44}
      fontFamily="sans-serif"
      opacity={0}
    />
  );

  yield* all(
    circleRef().size(160 * (sceneProps.scale || 1), 1.0),
    textRef().opacity(1, 0.8)
  );

  yield* circleRef().position.y(-90, 0.5).to(-40, 0.5);
});
