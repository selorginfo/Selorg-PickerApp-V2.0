import React from 'react';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import type { IconName } from '../../types';
import { colors } from '../../theme';

interface Props {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

const Canvas: React.FC<{ size: number; children: React.ReactNode }> = ({ size, children }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    {children}
  </Svg>
);

/**
 * 1:1 port of Component.icon() from the source HTML, plus the ad-hoc SVGs used
 * inline (back chevron, plus, upload, pin, camera, face, fingerprint, play,
 * pause, close, send, edit). 24×24 grid, round caps/joins.
 */
export const Icon: React.FC<Props> = ({ name, size = 24, color = colors.ink, strokeWidth = 2 }) => {
  const s = strokeWidth;
  const stroke = {
    stroke: color,
    strokeWidth: s,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };

  switch (name) {
    case 'home':
      return (
        <Canvas size={size}>
          <Path d="M4 11l8-7 8 7" {...stroke} />
          <Path d="M6 10v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9" {...stroke} />
        </Canvas>
      );
    case 'cal':
      return (
        <Canvas size={size}>
          <Rect x={3.5} y={5} width={17} height={16} rx={2.5} {...stroke} />
          <Path d="M3.5 9.5h17" {...stroke} />
          <Path d="M8 3v4M16 3v4" {...stroke} />
        </Canvas>
      );
    case 'target':
      return (
        <Canvas size={size}>
          <Circle cx={12} cy={12} r={8} {...stroke} />
          <Circle cx={12} cy={12} r={3.4} {...stroke} />
        </Canvas>
      );
    case 'user':
      return (
        <Canvas size={size}>
          <Circle cx={12} cy={8.5} r={4} {...stroke} />
          <Path d="M4.5 20c0-3.6 3.4-6 7.5-6s7.5 2.4 7.5 6" {...stroke} />
        </Canvas>
      );
    case 'package':
      return (
        <Canvas size={size}>
          <Path d="M4 8l8-4 8 4v8l-8 4-8-4V8Z" {...stroke} />
          <Path d="M4 8l8 4 8-4M12 12v8" {...stroke} />
        </Canvas>
      );
    case 'box':
      return (
        <Canvas size={size}>
          <Rect x={4} y={5} width={16} height={15} rx={3} {...stroke} />
          <Path d="M8 3v4M16 3v4" {...stroke} />
        </Canvas>
      );
    case 'zap':
      return (
        <Canvas size={size}>
          <Path d="M13 2L4.5 13H11l-1 9 8.5-11H12l1-9Z" fill={color} />
        </Canvas>
      );
    case 'trophy':
      return (
        <Canvas size={size}>
          <Path d="M7 4h10v4a5 5 0 0 1-10 0V4Z" {...stroke} />
          <Path d="M9 14v2h6v-2M8 20h8" {...stroke} />
          <Path d="M7 5H4v1a3 3 0 0 0 3 3M17 5h3v1a3 3 0 0 1-3 3" {...stroke} />
        </Canvas>
      );
    case 'clock':
      return (
        <Canvas size={size}>
          <Circle cx={12} cy={12} r={9} {...stroke} />
          <Path d="M12 7.5V12l3 2" {...stroke} />
        </Canvas>
      );
    case 'card':
      return (
        <Canvas size={size}>
          <Rect x={3} y={6} width={18} height={13} rx={2.5} {...stroke} />
          <Path d="M3 10.5h18" {...stroke} />
        </Canvas>
      );
    case 'wallet':
      return (
        <Canvas size={size}>
          <Rect x={3} y={6} width={18} height={13} rx={2.5} {...stroke} />
          <Path d="M3 10h18" {...stroke} />
          <Circle cx={17} cy={14.5} r={1.2} {...stroke} />
        </Canvas>
      );
    case 'file':
      return (
        <Canvas size={size}>
          <Path d="M6 3h8l4 4v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" {...stroke} />
          <Path d="M14 3v4h4" {...stroke} />
        </Canvas>
      );
    case 'settings':
      return (
        <Canvas size={size}>
          <Circle cx={12} cy={12} r={3} {...stroke} />
          <Path d="M12 3v3M12 18v3M4.2 7l2.6 1.5M17.2 15.5l2.6 1.5M4.2 17l2.6-1.5M17.2 8.5l2.6-1.5" {...stroke} />
        </Canvas>
      );
    case 'phone':
      return (
        <Canvas size={size}>
          <Rect x={6} y={3} width={12} height={18} rx={2.5} {...stroke} />
          <Path d="M10.5 18h3" {...stroke} />
        </Canvas>
      );
    case 'phoneDevice':
      return (
        <Canvas size={size}>
          <Rect x={6} y={3} width={12} height={18} rx={2.5} {...stroke} />
          <Path d="M10.5 18h3" {...stroke} />
        </Canvas>
      );
    case 'briefcase':
      return (
        <Canvas size={size}>
          <Rect x={3} y={8} width={18} height={12} rx={2.5} {...stroke} />
          <Path d="M8 8V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" {...stroke} />
        </Canvas>
      );
    case 'alert':
      return (
        <Canvas size={size}>
          <Path d="M12 3l9 16H3L12 3Z" {...stroke} />
          <Path d="M12 10v4" {...stroke} />
          <Circle cx={12} cy={16.6} r={0.6} {...stroke} />
        </Canvas>
      );
    case 'book':
      return (
        <Canvas size={size}>
          <Path d="M5 4h11a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2V4Z" {...stroke} />
          <Path d="M18 6v14" {...stroke} />
        </Canvas>
      );
    case 'check':
      return (
        <Canvas size={size}>
          <Path d="M5 13l4 4L19 7" {...stroke} />
        </Canvas>
      );
    case 'dollar':
      return (
        <Canvas size={size}>
          <Path d="M12 3v18M8 7.5h6a2.5 2.5 0 0 1 0 5H9a2.5 2.5 0 0 0 0 5h7" {...stroke} />
        </Canvas>
      );
    case 'bell':
      return (
        <Canvas size={size}>
          <Path d="M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" {...stroke} />
          <Path d="M10 20a2 2 0 0 0 4 0" {...stroke} />
        </Canvas>
      );
    case 'mail':
      return (
        <Canvas size={size}>
          <Rect x={3} y={5} width={18} height={14} rx={3} {...stroke} />
          <Path d="M4 7l8 6 8-6" {...stroke} />
        </Canvas>
      );
    case 'chat':
      return (
        <Canvas size={size}>
          <Path d="M5 5h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9l-4 4V6a1 1 0 0 1 1-1Z" {...stroke} />
        </Canvas>
      );
    case 'shield':
      return (
        <Canvas size={size}>
          <Path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z" {...stroke} />
          <Path d="M9 12l2 2 4-4" {...stroke} />
        </Canvas>
      );
    case 'logout':
      return (
        <Canvas size={size}>
          <Path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 8l-4 4 4 4M6 12h10" {...stroke} />
        </Canvas>
      );
    case 'chevronLeft':
      return (
        <Canvas size={size}>
          <Path d="M15 6l-6 6 6 6" {...stroke} />
        </Canvas>
      );
    case 'chevronRight':
      return (
        <Canvas size={size}>
          <Path d="M9 6l6 6-6 6" {...stroke} />
        </Canvas>
      );
    case 'plus':
      return (
        <Canvas size={size}>
          <Path d="M12 5v14M5 12h14" {...stroke} />
        </Canvas>
      );
    case 'upload':
      return (
        <Canvas size={size}>
          <Path d="M12 16V6M8 10l4-4 4 4M5 18h14" {...stroke} />
        </Canvas>
      );
    case 'pin':
      return (
        <Canvas size={size}>
          <Path d="M12 21s-7-5.5-7-11a7 7 0 0 1 14 0c0 5.5-7 11-7 11Z" {...stroke} />
          <Circle cx={12} cy={10} r={2.4} {...stroke} />
        </Canvas>
      );
    case 'camera':
      return (
        <Canvas size={size}>
          <Path d="M4 8h3l1.5-2h7L17 8h3v11H4V8Z" {...stroke} />
          <Circle cx={12} cy={13} r={3.2} {...stroke} />
        </Canvas>
      );
    case 'face':
    case 'faceScan':
      return (
        <Canvas size={size}>
          <Circle cx={12} cy={9} r={4} {...stroke} strokeWidth={1.6} />
          <Path d="M5 20c0-3.3 3.1-6 7-6s7 2.7 7 6" {...stroke} strokeWidth={1.6} />
        </Canvas>
      );
    case 'fingerprint':
      return (
        <Canvas size={size}>
          <Path d="M12 4c-3 0-5 2-5 5v2M12 4c3 0 5 2 5 5v6M9.5 11v4M14.5 12v3M12 9v9" {...stroke} strokeWidth={1.7} />
        </Canvas>
      );
    case 'play':
      return (
        <Canvas size={size}>
          <Path d="M8 5v14l11-7z" fill={color} />
        </Canvas>
      );
    case 'pause':
      return (
        <Canvas size={size}>
          <Rect x={6} y={5} width={4} height={14} rx={1} fill={color} />
          <Rect x={14} y={5} width={4} height={14} rx={1} fill={color} />
        </Canvas>
      );
    case 'close':
      return (
        <Canvas size={size}>
          <Path d="M6 6l12 12M18 6L6 18" {...stroke} />
        </Canvas>
      );
    case 'lock':
      return (
        <Canvas size={size}>
          <Rect x={5} y={11} width={14} height={10} rx={2} {...stroke} />
          <Path d="M8 11V8a4 4 0 0 1 8 0v3" {...stroke} />
        </Canvas>
      );
    case 'send':
      return (
        <Canvas size={size}>
          <Path d="M4 12l16-7-7 16-2-6-7-3Z" {...stroke} strokeWidth={1.9} />
        </Canvas>
      );
    case 'edit':
      return (
        <Canvas size={size}>
          <Path d="M4 20h4L18 10l-4-4L4 16v4Z" {...stroke} strokeWidth={1.8} />
          <Path d="M13 7l4 4" {...stroke} strokeWidth={1.8} />
        </Canvas>
      );
    default:
      return <Canvas size={size}>{null}</Canvas>;
  }
};
