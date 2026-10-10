import { AgentRuntimeState } from '@civilization/shared';

interface AgentAvatarProps {
  agent: AgentRuntimeState;
  size?: number;
  className?: string;
  showBorder?: boolean;
}

export const RESOURCE_ICONS = {
  WOOD: '🪵',
  WHEAT: '🌾',
  IRON: '⛏️',
  GOLD: '🪙'
} as const;

export function AgentAvatar({ agent, size = 42, className = '', showBorder = true }: AgentAvatarProps) {
  const { slotId, archetype, category, colorHex } = agent;

  // Custom stylized voxel character portrait generator
  const renderAvatarDetails = () => {
    switch (archetype) {
      case 'MERCHANT':
        // Griphook: Gringotts banker, goblin cap, sharp gaze, gold collar
        return (
          <g>
            {/* Blonde Hair */}
            <rect x="7" y="5" width="22" height="7" fill="#fcd34d" rx="2" />
            <rect x="5" y="8" width="4" height="12" fill="#f59e0b" />
            <rect x="27" y="8" width="4" height="12" fill="#f59e0b" />
            {/* Merchant Cap with Feather */}
            <path d="M 6 7 Q 18 1 30 7 L 28 4 Q 18 0 8 4 Z" fill="#92400e" />
            <circle cx="26" cy="3" r="2.5" fill="#fbbf24" />
            {/* Eyes */}
            <rect x="11" y="14" width="3" height="4" fill="#1e293b" rx="1" />
            <rect x="22" y="14" width="3" height="4" fill="#1e293b" rx="1" />
            <circle cx="12" cy="15" r="0.8" fill="#ffffff" />
            <circle cx="23" cy="15" r="0.8" fill="#ffffff" />
            {/* Mustache */}
            <path d="M 12 21 Q 18 19 24 21 Q 18 23 12 21" fill="#b45309" />
            {/* Golden Merchant Tunic Collar */}
            <path d="M 8 28 L 18 34 L 28 28 L 32 36 L 4 36 Z" fill="#f59e0b" />
            <circle cx="18" cy="32" r="2" fill="#fbbf24" />
          </g>
        );

      case 'WARLORD':
        // Lord Voldemort: Dark lord helm, crimson crest, fierce intimidating gaze
        return (
          <g>
            {/* Steel Visor & Crimson Crest */}
            <rect x="6" y="4" width="24" height="9" fill="#475569" rx="2" />
            <rect x="15" y="0" width="6" height="6" fill="#dc2626" rx="1" />
            {/* Red Warrior Headband */}
            <rect x="6" y="10" width="24" height="4" fill="#b91c1c" />
            {/* Determined Eyes */}
            <rect x="10" y="15" width="4" height="3" fill="#0f172a" rx="1" />
            <rect x="22" y="15" width="4" height="3" fill="#0f172a" rx="1" />
            <circle cx="11" cy="16" r="0.8" fill="#ffffff" />
            <circle cx="23" cy="16" r="0.8" fill="#ffffff" />
            {/* Battle Scar */}
            <line x1="24" y1="13" x2="26" y2="20" stroke="#991b1b" strokeWidth="1" />
            {/* Mouth */}
            <rect x="15" y="22" width="6" height="2" fill="#7f1d1d" rx="1" />
            {/* Steel Plate Armor Collar */}
            <path d="M 6 28 L 18 33 L 30 28 L 34 36 L 2 36 Z" fill="#334155" />
            <circle cx="18" cy="31" r="2.2" fill="#94a3b8" />
          </g>
        );

      case 'DIPLOMAT':
        // Albus Dumbledore: Royal sapphire cowl, golden circlet, wise benevolent expression
        return (
          <g>
            {/* Royal Sapphire Hood */}
            <path d="M 5 6 Q 18 1 31 6 L 33 28 Q 18 30 3 28 Z" fill="#1e40af" />
            {/* Gold Circlet */}
            <path d="M 8 10 Q 18 8 28 10 L 28 12 Q 18 10 8 12 Z" fill="#fbbf24" />
            <circle cx="18" cy="9" r="1.8" fill="#38bdf8" />
            {/* Gentle Eyes */}
            <ellipse cx="12" cy="16" rx="2" ry="2.5" fill="#0f172a" />
            <ellipse cx="24" cy="16" rx="2" ry="2.5" fill="#0f172a" />
            <circle cx="12.5" cy="15.5" r="0.8" fill="#ffffff" />
            <circle cx="24.5" cy="15.5" r="0.8" fill="#ffffff" />
            {/* Smile */}
            <path d="M 15 22 Q 18 24 21 22" stroke="#b45309" strokeWidth="1.2" fill="none" />
            {/* Royal Robes with Gold Trim */}
            <path d="M 7 28 L 18 32 L 29 28 L 34 36 L 2 36 Z" fill="#2563eb" />
            <path d="M 16 30 L 18 36 L 20 30 Z" fill="#fbbf24" />
          </g>
        );

      case 'AGRARIAN':
      case 'FARMER':
        // Rubeus Hagrid: Straw hat, wild gamekeeper beard, green overalls
        return (
          <g>
            {/* Straw Hat Brim & Crown */}
            <ellipse cx="18" cy="7" rx="16" ry="4.5" fill="#fef08a" />
            <rect x="11" y="2" width="14" height="6" fill="#eab308" rx="2" />
            <rect x="11" y="6" width="14" height="2" fill="#78350f" />
            {/* Eyes */}
            <rect x="11" y="14" width="3" height="3" fill="#1e293b" rx="1" />
            <rect x="22" y="14" width="3" height="3" fill="#1e293b" rx="1" />
            {/* White/Gray Beard */}
            <path d="M 10 18 Q 18 28 26 18 L 26 23 Q 18 29 10 23 Z" fill="#f1f5f9" />
            {/* Farmer Denim/Green Overalls */}
            <path d="M 6 28 L 18 32 L 30 28 L 34 36 L 2 36 Z" fill="#15803d" />
            <rect x="12" y="28" width="4" height="8" fill="#1e3a8a" />
            <rect x="20" y="28" width="4" height="8" fill="#1e3a8a" />
          </g>
        );

      case 'INDUSTRIALIST':
        // Arthur Weasley: Brass tinkerer goggles on forehead, soot smudges, utility collar
        return (
          <g>
            {/* Gray Hair */}
            <rect x="6" y="5" width="24" height="8" fill="#64748b" rx="2" />
            {/* Brass Goggles */}
            <rect x="7" y="8" width="22" height="5" fill="#78350f" rx="1" />
            <circle cx="12" cy="10.5" r="3.2" fill="#fbbf24" />
            <circle cx="24" cy="10.5" r="3.2" fill="#fbbf24" />
            <circle cx="12" cy="10.5" r="1.8" fill="#38bdf8" />
            <circle cx="24" cy="10.5" r="1.8" fill="#38bdf8" />
            {/* Focused Eyes */}
            <rect x="10" y="16" width="4" height="3" fill="#0f172a" rx="1" />
            <rect x="22" y="16" width="4" height="3" fill="#0f172a" rx="1" />
            {/* Mouth */}
            <rect x="15" y="23" width="6" height="2" fill="#0f172a" />
            {/* Leather Smith Apron Collar */}
            <path d="M 6 28 L 18 33 L 30 28 L 34 36 L 2 36 Z" fill="#451a03" />
            <line x1="12" y1="28" x2="18" y2="36" stroke="#92400e" strokeWidth="2" />
            <line x1="24" y1="28" x2="18" y2="36" stroke="#92400e" strokeWidth="2" />
          </g>
        );

      case 'TREASURE_HUNTER':
        // Harry Potter: Gryffindor explorer fedora, dark hair, seeker scarf
        return (
          <g>
            {/* Red Hair */}
            <rect x="6" y="6" width="24" height="14" fill="#c2410c" rx="2" />
            {/* Fedora Hat */}
            <ellipse cx="18" cy="7" rx="15" ry="3.5" fill="#78350f" />
            <rect x="10" y="2" width="16" height="6" fill="#854d0e" rx="2" />
            <rect x="10" y="6" width="16" height="1.5" fill="#fbbf24" />
            {/* Alert Eyes */}
            <rect x="11" y="15" width="3" height="3.5" fill="#0f172a" rx="1" />
            <rect x="22" y="15" width="3" height="3.5" fill="#0f172a" rx="1" />
            <circle cx="12" cy="16" r="0.8" fill="#ffffff" />
            <circle cx="23" cy="16" r="0.8" fill="#ffffff" />
            {/* Confident Smile */}
            <path d="M 14 22 Q 18 24 22 21" stroke="#78350f" strokeWidth="1.2" fill="none" />
            {/* Leather Bandana / Scarf */}
            <path d="M 8 28 L 18 34 L 28 28 L 33 36 L 3 36 Z" fill="#ea580c" />
          </g>
        );

      case 'STRATEGIST':
        // Hermione Granger: Deep purple mantle hood, calculating brilliant gaze
        return (
          <g>
            {/* Purple Cowl */}
            <path d="M 4 5 Q 18 1 32 5 L 34 29 Q 18 32 2 29 Z" fill="#581c87" />
            {/* Silver Circlet */}
            <line x1="8" y1="9" x2="28" y2="9" stroke="#cbd5e1" strokeWidth="1.5" />
            {/* Sharp Eyes */}
            <rect x="10" y="15" width="4" height="2.5" fill="#0f172a" rx="1" />
            <rect x="22" y="15" width="4" height="2.5" fill="#0f172a" rx="1" />
            <circle cx="11.5" cy="16" r="0.6" fill="#c084fc" />
            <circle cx="23.5" cy="16" r="0.6" fill="#c084fc" />
            {/* Stoic Mouth */}
            <line x1="14" y1="23" x2="22" y2="23" stroke="#4c1d95" strokeWidth="1.5" />
            {/* Velvet Cloak */}
            <path d="M 6 28 L 18 33 L 30 28 L 34 36 L 2 36 Z" fill="#6b21a8" />
            <circle cx="18" cy="32" r="2.2" fill="#fbbf24" />
          </g>
        );

      case 'OPPORTUNIST':
        // Draco Malfoy: Slytherin teal/green hooded cowl, cunning smirk
        return (
          <g>
            {/* Teal Rogue Cowl */}
            <path d="M 4 5 Q 18 1 32 5 L 34 28 Q 18 31 2 28 Z" fill="#0f766e" />
            {/* Piercing Rogue Eyes */}
            <rect x="10" y="14" width="4" height="2.5" fill="#0f172a" rx="1" />
            <rect x="22" y="14" width="4" height="2.5" fill="#0f172a" rx="1" />
            <circle cx="12" cy="15" r="0.7" fill="#2dd4bf" />
            <circle cx="24" cy="15" r="0.7" fill="#2dd4bf" />
            {/* Lower Face Mask */}
            <path d="M 8 18 Q 18 24 28 18 L 27 27 Q 18 29 9 27 Z" fill="#115e59" />
            {/* Rogue Tunic */}
            <path d="M 6 28 L 18 32 L 30 28 L 34 36 L 2 36 Z" fill="#0d9488" />
          </g>
        );

      case 'REBEL':
        // Dobby The Elf: Crimson bandana, spiky hair, defiant free elf grin
        return (
          <g>
            {/* Spiky Dark Hair */}
            <path d="M 6 10 L 10 3 L 14 8 L 18 2 L 22 8 L 26 3 L 30 10 Z" fill="#3b2f2f" />
            {/* Red Rebel Bandana */}
            <rect x="6" y="8" width="24" height="5" fill="#ef4444" rx="1" />
            <circle cx="28" cy="10" r="1.5" fill="#dc2626" />
            {/* Fierce Eyes */}
            <rect x="10" y="15" width="4" height="3" fill="#0f172a" rx="1" />
            <rect x="22" y="15" width="4" height="3" fill="#0f172a" rx="1" />
            <circle cx="11" cy="16" r="0.8" fill="#ffffff" />
            <circle cx="23" cy="16" r="0.8" fill="#ffffff" />
            {/* Smirk */}
            <path d="M 14 22 L 22 20" stroke="#7f1d1d" strokeWidth="1.8" />
            {/* Studded Vest */}
            <path d="M 6 28 L 18 32 L 30 28 L 34 36 L 2 36 Z" fill="#7f1d1d" />
            <circle cx="12" cy="32" r="1.2" fill="#cbd5e1" />
            <circle cx="24" cy="32" r="1.2" fill="#cbd5e1" />
          </g>
        );

      default:
        if (category === 'AUDIENCE') {
          // Futuristic Monad Cyberspace Avatar
          return (
            <g>
              {/* Monad Violet Cyber Cowl */}
              <rect x="6" y="4" width="24" height="12" fill="#836ef9" rx="3" />
              {/* Glowing Cyan Cyber Visor */}
              <rect x="7" y="12" width="22" height="6" fill="#06b6d4" rx="2" />
              <rect x="10" y="13.5" width="16" height="3" fill="#e0f2fe" rx="1" />
              {/* Mouth/Speaker Line */}
              <line x1="14" y1="23" x2="22" y2="23" stroke="#836ef9" strokeWidth="1.5" />
              {/* Tech Collar */}
              <path d="M 6 28 L 18 33 L 30 28 L 34 36 L 2 36 Z" fill="#4c1d95" />
              <circle cx="18" cy="32" r="2.5" fill="#836ef9" />
            </g>
          );
        }
        // Generic Village / NPC Avatar
        return (
          <g>
            {/* Simple Hair / Cap */}
            <rect x="7" y="5" width="22" height="8" fill={colorHex} rx="2" />
            {/* Friendly Eyes */}
            <circle cx="12" cy="15" r="1.8" fill="#0f172a" />
            <circle cx="24" cy="15" r="1.8" fill="#0f172a" />
            <circle cx="12.5" cy="14.5" r="0.6" fill="#ffffff" />
            <circle cx="24.5" cy="14.5" r="0.6" fill="#ffffff" />
            {/* Smile */}
            <path d="M 14 21 Q 18 24 22 21" stroke="#0f172a" strokeWidth="1.2" fill="none" />
            {/* Work Tunic */}
            <path d="M 6 28 L 18 32 L 30 28 L 34 36 L 2 36 Z" fill={colorHex} />
          </g>
        );
    }
  };

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: 8,
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: '#1e293b',
        border: showBorder ? `2px solid ${colorHex || '#836ef9'}` : 'none',
        flexShrink: 0,
        boxShadow: showBorder ? `0 2px 8px rgba(0, 0, 0, 0.4)` : 'none'
      }}
    >
      <svg
        viewBox="0 0 36 36"
        width="100%"
        height="100%"
        style={{ display: 'block' }}
      >
        {/* Skin Tone Base Head */}
        <rect x="6" y="8" width="24" height="20" fill="#fcd34d" rx="4" />
        {/* Neck */}
        <rect x="14" y="24" width="8" height="6" fill="#f59e0b" />
        {/* Render Archetype Details */}
        {renderAvatarDetails()}
      </svg>

      {/* Category / Slot Mini Badge */}
      {slotId < 10 && (
        <div
          style={{
            position: 'absolute',
            bottom: 1,
            right: 1,
            backgroundColor: 'rgba(15, 23, 42, 0.85)',
            color: '#fbbf24',
            fontSize: '0.55rem',
            fontWeight: 800,
            padding: '0px 3px',
            borderRadius: 3,
            lineHeight: 1.1
          }}
        >
          #{slotId}
        </div>
      )}
    </div>
  );
}

export default AgentAvatar;
