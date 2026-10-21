import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { StickFigureProps } from './types';

export const StickFigureScene: React.FC<StickFigureProps> = ({
  title,
  subtitle,
  stickFigureColor = '#38bdf8',
  waveSpeed = 1.5,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Entrance spring for title
  const titleEntrance = spring({
    frame,
    fps,
    config: {
      damping: 12,
      stiffness: 80,
    },
  });

  const titleOpacity = interpolate(titleEntrance, [0, 1], [0, 1]);
  const titleY = interpolate(titleEntrance, [0, 1], [-40, 0]);

  // Subtitle fade in
  const subtitleOpacity = interpolate(frame, [15, 35], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Waving arm angle oscillation
  // Waving starts around frame 10
  const waveCycle = Math.sin((frame / fps) * Math.PI * 4 * waveSpeed);
  // Hand waves between -20 deg and -70 deg relative to horizontal, waving upward
  const wavingHandX = 170 + Math.cos(waveCycle) * 35;
  const wavingHandY = 160 + Math.sin(waveCycle) * 25;

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0f172a',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
        color: '#f8fafc',
      }}
    >
      {/* Header text driven by JSON props */}
      <div
        style={{
          textAlign: 'center',
          transform: `translateY(${titleY}px)`,
          opacity: titleOpacity,
          marginBottom: '2rem',
        }}
      >
        <h1
          style={{
            fontSize: '48px',
            fontWeight: 800,
            margin: '0 0 12px 0',
            background: 'linear-gradient(to right, #38bdf8, #818cf8)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            style={{
              fontSize: '22px',
              color: '#94a3b8',
              margin: 0,
              opacity: subtitleOpacity,
            }}
          >
            {subtitle}
          </p>
        )}
      </div>

      {/* Animated SVG Stick Figure */}
      <svg
        width="260"
        height="320"
        viewBox="0 0 260 320"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          filter: 'drop-shadow(0 0 16px rgba(56, 189, 248, 0.3))',
        }}
      >
        {/* Head */}
        <circle
          cx="130"
          cy="60"
          r="26"
          stroke={stickFigureColor}
          strokeWidth="6"
          strokeLinecap="round"
        />
        {/* Smile */}
        <path
          d="M 120 64 Q 130 74 140 64"
          stroke={stickFigureColor}
          strokeWidth="4"
          strokeLinecap="round"
        />
        {/* Eyes */}
        <circle cx="121" cy="54" r="3" fill={stickFigureColor} />
        <circle cx="139" cy="54" r="3" fill={stickFigureColor} />

        {/* Torso / Spine */}
        <line
          x1="130"
          y1="86"
          x2="130"
          y2="200"
          stroke={stickFigureColor}
          strokeWidth="6"
          strokeLinecap="round"
        />

        {/* Left Arm (resting/relaxed at side) */}
        <path
          d="M 130 110 L 95 150 L 80 190"
          stroke={stickFigureColor}
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Right Arm (Waving!) - Shoulder at (130, 110), elbow raised at (165, 120), moving hand */}
        <path
          d={`M 130 110 L 165 120 L ${wavingHandX} ${wavingHandY}`}
          stroke={stickFigureColor}
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Left Leg */}
        <path
          d="M 130 200 L 105 250 L 95 300"
          stroke={stickFigureColor}
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Right Leg */}
        <path
          d="M 130 200 L 155 250 L 165 300"
          stroke={stickFigureColor}
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};
