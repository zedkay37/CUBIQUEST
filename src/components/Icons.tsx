import React from 'react';
import { ELEMENT_META, SPECIES } from '../game/catalog';
import type { ElementType } from '../game/types';
import { FR } from '../i18n/fr';

export function CubiQuestTitleLockup() {
  return (
    <svg
      viewBox="0 0 560 156"
      className="w-[min(520px,88vw)] h-auto drop-shadow-[0_10px_24px_rgba(14,18,28,0.45)]"
      role="img"
      aria-label={FR.ui.icons.cubiquestLIleAuxCubes}
    >
      {/* Left voxel isometric crest cube */}
      <g transform="translate(24, 24)">
        <polygon points="48,6 88,28 48,50 8,28" fill="#F4B942" stroke="#181E2A" strokeWidth="4" strokeLinejoin="round" />
        <polygon points="8,28 48,50 48,94 8,72" fill="#E85D3F" stroke="#181E2A" strokeWidth="4" strokeLinejoin="round" />
        <polygon points="88,28 48,50 48,94 88,72" fill="#2F8CE8" stroke="#181E2A" strokeWidth="4" strokeLinejoin="round" />
        {/* Cute voxel eyes on right face */}
        <rect x="57" y="54" width="7" height="10" rx="1" fill="#181E2A" />
        <rect x="72" y="46" width="7" height="10" rx="1" fill="#181E2A" />
        <rect x="59" y="55" width="3" height="3" fill="#FAF7F0" />
        <rect x="74" y="47" width="3" height="3" fill="#FAF7F0" />
        {/* Top specular bevel */}
        <polygon points="48,14 72,27 48,40 24,27" fill="#FFF3C4" opacity="0.55" />
      </g>

      {/* Bold sculpted wordmark with crisp dark outline */}
      <g transform="translate(132, 34)">
        <text
          x="0"
          y="58"
          fontFamily="'Bricolage Grotesque', system-ui, sans-serif"
          fontWeight="800"
          fontSize="66"
          letterSpacing="-1.5"
          fill="#FAF7F0"
          stroke="#181E2A"
          strokeWidth="12"
          paintOrder="stroke fill"
          strokeLinejoin="round"
        >
          {FR.ui.icons.cubi}
          <tspan fill="#F4B942">{FR.ui.icons.quest}</tspan>
        </text>
        <text
          x="4"
          y="96"
          fontFamily="'Plus Jakarta Sans', system-ui, sans-serif"
          fontWeight="700"
          fontSize="20"
          letterSpacing="4.5"
          fill="#FAF7F0"
          stroke="#181E2A"
          strokeWidth="6"
          paintOrder="stroke fill"
        >
          {FR.ui.icons.lIleAuxCubes}
        </text>
      </g>
    </svg>
  );
}

export function ElementIcon({
  element,
  size = 18,
  className = '',
}: {
  element: ElementType;
  size?: number;
  className?: string;
}) {
  const color = ELEMENT_META[element].color;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
    >
      <rect x="2" y="2" width="20" height="20" rx="4" fill="#141925" />
      <rect x="3.5" y="3.5" width="17" height="17" rx="3" fill={color} />
      {element === 'fire' && (
        <path
          d="M12 6c2 2.4 4.2 4.3 4.2 7.2a4.2 4.2 0 1 1-8.4 0c0-1.6.7-3 1.7-4.1.2 1.1.9 1.7 1.7 1.7-.3-1.8.1-3.5.8-4.8Z"
          fill="#FFF7E6"
        />
      )}
      {element === 'water' && (
        <path
          d="M12 5.5c2.8 3.6 4.6 6 4.6 8.3a4.6 4.6 0 1 1-9.2 0c0-2.3 1.8-4.7 4.6-8.3Z"
          fill="#EFF9FF"
        />
      )}
      {element === 'grass' && (
        <path
          d="M17.2 6.8C12 6.8 7.6 9.5 7.2 15.6c2.6.8 6.4.4 8.6-2.2 1.4-1.7 1.6-4.2 1.4-6.6Z"
          fill="#ECFDF5"
        />
      )}
      {element === 'electric' && (
        <polygon points="13.5,5 7.5,13 11.8,13 10.5,19 16.5,11 12.2,11" fill="#181E2A" />
      )}
      {element === 'rock' && (
        <polygon points="12,5.8 17.5,9.5 15.8,17.2 8.2,17.2 6.5,9.5" fill="#F6EFE6" />
      )}
      {element === 'psychic' && (
        <g fill="#FAF5FF">
          <circle cx="12" cy="12" r="2.6" />
          <ellipse cx="12" cy="12" rx="6.2" ry="3.2" fill="none" stroke="#FAF5FF" strokeWidth="1.8" />
        </g>
      )}
    </svg>
  );
}

/**
 * Crisp isometric voxel portrait icon matched 1-to-1 with each Cubimon's 3D palette
 */
export function VoxelCreatureAvatar({
  speciesId,
  size = 44,
  className = '',
}: {
  speciesId: string;
  size?: number;
  className?: string;
}) {
  const sp = SPECIES[speciesId] ?? SPECIES.pyrocube;
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={className} aria-hidden="true">
      {/* Ground shadow */}
      <ellipse cx="24" cy="41" rx="14" ry="4" fill="rgba(10,14,24,0.45)" />
      {/* Ears / Horns / Crest */}
      <rect x="10" y="6" width="8" height="10" rx="1.5" fill={sp.palette.secondary} stroke="#141925" strokeWidth="2.2" />
      <rect x="30" y="6" width="8" height="10" rx="1.5" fill={sp.palette.secondary} stroke="#141925" strokeWidth="2.2" />
      {/* Main cube body */}
      <rect x="9" y="13" width="30" height="26" rx="3" fill={sp.palette.primary} stroke="#141925" strokeWidth="2.5" />
      {/* Top highlight */}
      <rect x="11" y="15" width="26" height="4" rx="1" fill="#FFFFFF" opacity="0.2" />
      {/* Belly */}
      <rect x="15" y="28" width="18" height="9" rx="1.5" fill={sp.palette.belly} />
      {/* Accent cheeks / crest gem */}
      <rect x="12" y="25" width="4" height="4" rx="1" fill={sp.palette.accent} />
      <rect x="32" y="25" width="4" height="4" rx="1" fill={sp.palette.accent} />
      {/* Eyes */}
      <rect x="15" y="19" width="5" height="6" rx="1" fill={sp.palette.eye} />
      <rect x="28" y="19" width="5" height="6" rx="1" fill={sp.palette.eye} />
      <rect x="16" y="20" width="2" height="2" fill="#FFFFFF" />
      <rect x="29" y="20" width="2" height="2" fill="#FFFFFF" />
    </svg>
  );
}

export function StoneIcon({
  kind,
  size = 20,
}: {
  kind: 'atk' | 'hp' | 'flex';
  size?: number;
}) {
  const fill = kind === 'atk' ? '#E85D3F' : kind === 'hp' ? '#2FB97A' : '#F4B942';
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <polygon
        points="12,2 21,7 21,17 12,22 3,17 3,7"
        fill={fill}
        stroke="#141925"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {kind === 'atk' && (
        <path d="M9 15l6-6M13 8h3v3M8 14l2 2" stroke="#FFF7ED" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      )}
      {kind === 'hp' && (
        <path
          d="M12 16.5s-4.5-2.8-4.5-5.7a2.5 2.5 0 0 1 4.5-1.4 2.5 2.5 0 0 1 4.5 1.4c0 2.9-4.5 5.7-4.5 5.7Z"
          fill="#ECFDF5"
        />
      )}
      {kind === 'flex' && (
        <polygon points="12,7 14,10.5 17.5,12 14,13.5 12,17 10,13.5 6.5,12 10,10.5" fill="#181E2A" />
      )}
    </svg>
  );
}

export function ScatterIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 12h5m0 0-2-2m2 2-2 2" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 12h-5m0 0 2-2m-2 2 2 2" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 4v5m0 0-2-2m2 2 2-2" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 20v-5m0 0-2 2m2-2 2 2" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
