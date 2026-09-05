import { AvatarItem } from './types';

/**
 * Generates rich, studio-lit, high-definition SVG preview images for avatar items.
 * Renders realistic vector graphics including ultra-realistic sunglasses, crowns,
 * hairstyles, facial features, apparel, footwear, and back accessories.
 */
export function getItemThumbnailUrl(item: AvatarItem): string {
    const svg = generateItemSvg(item);
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function generateItemSvg(item: AvatarItem): string {
    const { id, category } = item;

    // Common SVG wrapper with studio lighting gradient background and drop shadow filters
    const wrapSvg = (innerContent: string) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="100%" height="100%">
  <defs>
    <!-- Studio Background Gradient -->
    <radialGradient id="bgGrad" cx="50%" cy="40%" r="65%">
      <stop offset="0%" stop-color="#2a3b50" />
      <stop offset="60%" stop-color="#151d27" />
      <stop offset="100%" stop-color="#0a0e14" />
    </radialGradient>

    <!-- Metallic Gold Gradient -->
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fff2a3" />
      <stop offset="25%" stop-color="#ffd700" />
      <stop offset="50%" stop-color="#d4af37" />
      <stop offset="75%" stop-color="#f39c12" />
      <stop offset="100%" stop-color="#b8860b" />
    </linearGradient>

    <!-- Metallic Chrome Gradient -->
    <linearGradient id="chromeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="35%" stop-color="#dcdde1" />
      <stop offset="70%" stop-color="#718093" />
      <stop offset="100%" stop-color="#2f3640" />
    </linearGradient>

    <!-- Ultra-Realistic Sunglasses Lens Tint Gradient -->
    <linearGradient id="lensGradAviator" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#1e272e" stop-opacity="0.95" />
      <stop offset="30%" stop-color="#111418" stop-opacity="0.9" />
      <stop offset="75%" stop-color="#2c3e50" stop-opacity="0.82" />
      <stop offset="100%" stop-color="#0984e3" stop-opacity="0.65" />
    </linearGradient>

    <!-- Specular Lens Glare -->
    <linearGradient id="glareGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.6" />
      <stop offset="30%" stop-color="#ffffff" stop-opacity="0.15" />
      <stop offset="60%" stop-color="#ffffff" stop-opacity="0" />
    </linearGradient>

    <!-- Soft Drop Shadow -->
    <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#000000" flood-opacity="0.65" />
    </filter>
    <filter id="neonGlow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="0" stdDeviation="5" flood-color="#00f2fe" flood-opacity="0.9" />
    </filter>
  </defs>

  <!-- Background Base -->
  <rect width="160" height="160" rx="16" fill="url(#bgGrad)" />
  <circle cx="80" cy="80" r="64" fill="none" stroke="rgba(255,255,255,0.04)" stroke-width="1.5" />

  <!-- Item Rendered Graphic -->
  <g filter="url(#dropShadow)">
    ${innerContent}
  </g>
</svg>
`.trim();

    // 1. FACES & ULTRA-REALISTIC GLASSES
    if (category === 'face') {
        if (id.includes('shades') || id.includes('sunglasses') || id.includes('retro_round') || id.includes('matrix')) {
            // ULTRA-REALISTIC AVIATOR SUNGLASSES (Gold rims, teardrop lenses, double bridge, glare)
            return wrapSvg(`
                <!-- Sunglasses Shadow on surface -->
                <ellipse cx="80" cy="118" rx="60" ry="12" fill="rgba(0,0,0,0.5)" />

                <!-- Left & Right Temple Arms (Sides) -->
                <path d="M 24 72 Q 14 62 10 50" fill="none" stroke="url(#goldGrad)" stroke-width="3" stroke-linecap="round" />
                <path d="M 136 72 Q 146 62 150 50" fill="none" stroke="url(#goldGrad)" stroke-width="3" stroke-linecap="round" />
                <path d="M 10 50 Q 8 40 14 36" fill="none" stroke="#111" stroke-width="4.5" stroke-linecap="round" />
                <path d="M 150 50 Q 152 40 146 36" fill="none" stroke="#111" stroke-width="4.5" stroke-linecap="round" />

                <!-- Brow Bar (Top Double Bridge) -->
                <path d="M 38 65 Q 80 62 122 65" fill="none" stroke="url(#goldGrad)" stroke-width="3.5" stroke-linecap="round" />

                <!-- Center Nose Bridge -->
                <path d="M 68 76 Q 80 72 92 76" fill="none" stroke="url(#goldGrad)" stroke-width="3.5" stroke-linecap="round" />
                <!-- Silicone Nose Pads -->
                <ellipse cx="72" cy="86" rx="3" ry="5.5" fill="rgba(255,255,255,0.7)" stroke="url(#goldGrad)" stroke-width="1" />
                <ellipse cx="88" cy="86" rx="3" ry="5.5" fill="rgba(255,255,255,0.7)" stroke="url(#goldGrad)" stroke-width="1" />

                <!-- Left Teardrop Lens Glass -->
                <path d="M 28 72 C 28 62, 64 62, 68 74 C 70 88, 62 108, 48 108 C 34 108, 28 92, 28 72 Z"
                      fill="url(#lensGradAviator)" stroke="url(#goldGrad)" stroke-width="3.5" stroke-linejoin="round" />

                <!-- Right Teardrop Lens Glass -->
                <path d="M 132 72 C 132 62, 96 62, 92 74 C 90 88, 98 108, 112 108 C 126 108, 132 92, 132 72 Z"
                      fill="url(#lensGradAviator)" stroke="url(#goldGrad)" stroke-width="3.5" stroke-linejoin="round" />

                <!-- Ultra-Realistic Diagonal Gloss Glare on Left Lens -->
                <path d="M 34 68 Q 50 64 62 74 L 54 84 Q 44 76 34 76 Z" fill="url(#glareGrad)" opacity="0.85" />
                <line x1="38" y1="84" x2="52" y2="100" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" opacity="0.4" />

                <!-- Ultra-Realistic Diagonal Gloss Glare on Right Lens -->
                <path d="M 98 68 Q 114 64 126 74 L 118 84 Q 108 76 98 76 Z" fill="url(#glareGrad)" opacity="0.85" />
                <line x1="102" y1="84" x2="116" y2="100" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" opacity="0.4" />

                <!-- Screw & Hinge Accents at Outer Corners -->
                <circle cx="25" cy="71" r="2.2" fill="#ffffff" />
                <circle cx="135" cy="71" r="2.2" fill="#ffffff" />
            `);
        }

        if (id.includes('monocle')) {
            // 24K GOLDEN MONOCLE
            return wrapSvg(`
                <!-- Monocle Golden Chain hanging down -->
                <path d="M 106 82 Q 120 115 110 135 Q 98 148 90 152" fill="none" stroke="url(#goldGrad)" stroke-width="2" stroke-dasharray="3,2" />
                <!-- Outer Gold Rim -->
                <circle cx="80" cy="76" r="38" fill="rgba(0, 242, 254, 0.08)" stroke="url(#goldGrad)" stroke-width="5" />
                <!-- Inner Bevel -->
                <circle cx="80" cy="76" r="33" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="1.2" />
                <!-- Specular Glint -->
                <path d="M 58 60 Q 80 48 102 60" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" opacity="0.75" />
                <circle cx="104" cy="92" r="3" fill="#ffffff" opacity="0.6" />
                <circle cx="80" cy="38" r="4" fill="url(#goldGrad)" />
            `);
        }

        if (id.includes('visor') || id.includes('cyborg')) {
            // CYBORG LASER VISOR
            return wrapSvg(`
                <rect x="22" y="62" width="116" height="34" rx="8" fill="#0b131e" stroke="#00f2fe" stroke-width="3" />
                <!-- Holographic glowing laser bar -->
                <line x1="28" y1="79" x2="132" y2="79" stroke="#00f2fe" stroke-width="5" filter="url(#neonGlow)" />
                <line x1="32" y1="79" x2="128" y2="79" stroke="#ffffff" stroke-width="2" />
                <!-- Tech HUD readouts -->
                <rect x="36" y="66" width="14" height="4" fill="#00f2fe" opacity="0.7" />
                <rect x="54" y="66" width="8" height="4" fill="#00f2fe" opacity="0.5" />
                <rect x="110" y="66" width="14" height="4" fill="#ff4757" opacity="0.8" />
                <!-- Side cyber ear mounts -->
                <rect x="14" y="66" width="8" height="26" rx="3" fill="url(#chromeGrad)" />
                <rect x="138" y="66" width="8" height="26" rx="3" fill="url(#chromeGrad)" />
            `);
        }

        if (id.includes('vr_headset')) {
            // METAVERSE CYBER VR HMD
            return wrapSvg(`
                <!-- Curved VR HMD Body -->
                <path d="M 26 58 Q 80 48 134 58 L 130 98 Q 80 106 30 98 Z" fill="#181b22" stroke="#384252" stroke-width="3" />
                <path d="M 32 64 Q 80 56 128 64 L 125 92 Q 80 98 35 92 Z" fill="#0d1117" />
                <!-- Front RGB LED Strip -->
                <path d="M 40 76 Q 80 72 120 76" fill="none" stroke="#00f2fe" stroke-width="4" filter="url(#neonGlow)" />
                <path d="M 40 76 Q 80 72 120 76" fill="none" stroke="#ffffff" stroke-width="1.5" />
                <!-- Dual Spatial Camera Lenses -->
                <circle cx="52" cy="85" r="4.5" fill="#000000" stroke="#00f2fe" stroke-width="1.5" />
                <circle cx="108" cy="85" r="4.5" fill="#000000" stroke="#00f2fe" stroke-width="1.5" />
                <!-- Top & Side Straps -->
                <path d="M 80 48 L 80 28" stroke="#333" stroke-width="8" stroke-linecap="round" />
                <path d="M 26 68 L 12 70" stroke="#333" stroke-width="6" stroke-linecap="round" />
                <path d="M 134 68 L 148 70" stroke="#333" stroke-width="6" stroke-linecap="round" />
            `);
        }

        if (id.includes('steampunk_goggles')) {
            // BRASS STEAMPUNK GOGGLES
            return wrapSvg(`
                <!-- Leather Strap -->
                <path d="M 12 76 Q 80 70 148 76" stroke="#4a2c11" stroke-width="14" stroke-linecap="round" />
                <path d="M 16 76 Q 80 70 144 76" stroke="#f1c40f" stroke-width="1" stroke-dasharray="4,4" />
                <!-- Left Brass Eyecup -->
                <circle cx="54" cy="76" r="28" fill="#111" stroke="#d4af37" stroke-width="6" />
                <circle cx="54" cy="76" r="21" fill="rgba(243, 156, 18, 0.75)" stroke="#fff2a3" stroke-width="2" />
                <!-- Right Brass Eyecup -->
                <circle cx="106" cy="76" r="28" fill="#111" stroke="#d4af37" stroke-width="6" />
                <circle cx="106" cy="76" r="21" fill="rgba(243, 156, 18, 0.75)" stroke="#fff2a3" stroke-width="2" />
                <!-- Center Brass Bridge -->
                <rect x="74" y="72" width="12" height="8" rx="2" fill="url(#goldGrad)" />
                <!-- Glass Reflection Glints -->
                <path d="M 42 64 Q 54 58 66 64" stroke="#ffffff" stroke-width="2.5" fill="none" opacity="0.8" />
                <path d="M 94 64 Q 106 58 118 64" stroke="#ffffff" stroke-width="2.5" fill="none" opacity="0.8" />
            `);
        }

        if (id.includes('ninja_mask')) {
            // SHADOW NINJA HALF-MASK
            return wrapSvg(`
                <!-- Ninja Eyes Focused -->
                <path d="M 40 54 Q 56 50 68 56" fill="none" stroke="#222" stroke-width="4" stroke-linecap="round" />
                <path d="M 120 54 Q 104 50 92 56" fill="none" stroke="#222" stroke-width="4" stroke-linecap="round" />
                <ellipse cx="54" cy="62" rx="10" ry="6" fill="#fff" />
                <circle cx="56" cy="62" r="4.5" fill="#111" />
                <ellipse cx="106" cy="62" rx="10" ry="6" fill="#fff" />
                <circle cx="104" cy="62" r="4.5" fill="#111" />
                <!-- Black Ninja Cloth Mask Covering Lower Face -->
                <path d="M 28 78 Q 80 88 132 78 L 126 122 Q 80 144 34 122 Z" fill="#12161a" stroke="#2a323d" stroke-width="3" />
                <!-- Center Fold Pleats -->
                <path d="M 80 84 L 80 134" stroke="#000000" stroke-width="2.5" opacity="0.6" />
                <path d="M 54 86 Q 80 98 106 86" fill="none" stroke="#242b35" stroke-width="2" />
            `);
        }

        if (id.includes('demon_horns') || id.includes('demon')) {
            // CRIMSON ONI WAR PAINT & FANGS
            return wrapSvg(`
                <!-- Fierce Amber/Red Slit Eyes -->
                <path d="M 38 60 Q 56 54 68 64" fill="none" stroke="#900" stroke-width="4.5" stroke-linecap="round" />
                <path d="M 122 60 Q 104 54 92 64" fill="none" stroke="#900" stroke-width="4.5" stroke-linecap="round" />
                <ellipse cx="54" cy="68" rx="12" ry="7" fill="#f1c40f" />
                <polygon points="54,61 56,68 54,75 52,68" fill="#c0392b" />
                <ellipse cx="106" cy="68" rx="12" ry="7" fill="#f1c40f" />
                <polygon points="106,61 108,68 106,75 104,68" fill="#c0392b" />
                <!-- Blood Red Oni War Paint Slash Marks -->
                <path d="M 44 80 L 28 106" stroke="#e74c3c" stroke-width="5" stroke-linecap="round" />
                <path d="M 52 82 L 38 112" stroke="#e74c3c" stroke-width="4" stroke-linecap="round" />
                <path d="M 116 80 L 132 106" stroke="#e74c3c" stroke-width="5" stroke-linecap="round" />
                <path d="M 108 82 L 122 112" stroke="#e74c3c" stroke-width="4" stroke-linecap="round" />
                <!-- Fanged Mouth -->
                <path d="M 60 114 Q 80 126 100 114" fill="none" stroke="#2c0b0e" stroke-width="4" stroke-linecap="round" />
                <polygon points="68,114 72,122 76,114" fill="#ffffff" />
                <polygon points="84,114 88,122 92,114" fill="#ffffff" />
            `);
        }

        if (id.includes('anime_sparkle')) {
            // ANIME STARLIGHT EYES & BLUSH
            return wrapSvg(`
                <defs>
                  <linearGradient id="animeIris" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stop-color="#8e44ad" />
                    <stop offset="60%" stop-color="#3498db" />
                    <stop offset="100%" stop-color="#00f2fe" />
                  </linearGradient>
                </defs>
                <!-- Upper Eyelashes -->
                <path d="M 32 58 Q 56 46 72 60" fill="none" stroke="#1e272e" stroke-width="5" stroke-linecap="round" />
                <path d="M 128 58 Q 104 46 88 60" fill="none" stroke="#1e272e" stroke-width="5" stroke-linecap="round" />
                <!-- Left Eye -->
                <ellipse cx="54" cy="74" rx="16" ry="20" fill="url(#animeIris)" />
                <circle cx="54" cy="74" r="8" fill="#111" />
                <!-- 4-point star sparkles in eyes -->
                <polygon points="54,64 57,71 64,71 58,75 60,82 54,77 48,82 50,75 44,71 51,71" fill="#ffffff" />
                <circle cx="62" cy="68" r="3.5" fill="#ffffff" />
                <!-- Right Eye -->
                <ellipse cx="106" cy="74" rx="16" ry="20" fill="url(#animeIris)" />
                <circle cx="106" cy="74" r="8" fill="#111" />
                <polygon points="106,64 109,71 116,71 110,75 112,82 106,77 100,82 102,75 96,71 103,71" fill="#ffffff" />
                <circle cx="114" cy="68" r="3.5" fill="#ffffff" />
                <!-- Cute Pink Anime Blush Marks -->
                <line x1="30" y1="94" x2="42" y2="90" stroke="#ff7675" stroke-width="3" stroke-linecap="round" />
                <line x1="34" y1="99" x2="46" y2="95" stroke="#ff7675" stroke-width="3" stroke-linecap="round" />
                <line x1="130" y1="94" x2="118" y2="90" stroke="#ff7675" stroke-width="3" stroke-linecap="round" />
                <line x1="126" y1="99" x2="114" y2="95" stroke="#ff7675" stroke-width="3" stroke-linecap="round" />
                <!-- Cute Anime Smile -->
                <path d="M 72 116 Q 80 124 88 116" fill="none" stroke="#d63031" stroke-width="3.5" stroke-linecap="round" />
            `);
        }

        if (id.includes('battle_scar')) {
            // VETERAN BATTLE SCAR
            return wrapSvg(`
                <!-- Hardened Veteran Eyes -->
                <path d="M 40 56 L 68 58" stroke="#333" stroke-width="4.5" stroke-linecap="round" />
                <path d="M 92 58 L 120 56" stroke="#333" stroke-width="4.5" stroke-linecap="round" />
                <ellipse cx="54" cy="68" rx="9" ry="5" fill="#fff" />
                <circle cx="55" cy="68" r="3.5" fill="#2d3436" />
                <ellipse cx="106" cy="68" rx="9" ry="5" fill="#fff" />
                <circle cx="105" cy="68" r="3.5" fill="#2d3436" />
                <!-- Raised Textured 3D Battle Scar cutting down right eye -->
                <path d="M 112 42 Q 106 75 98 110" fill="none" stroke="#842d2d" stroke-width="5" stroke-linecap="round" />
                <path d="M 112 42 Q 106 75 98 110" fill="none" stroke="#d63031" stroke-width="2.5" stroke-linecap="round" />
                <!-- Surgical Stitch Crosses across scar -->
                <line x1="105" y1="52" x2="115" y2="55" stroke="#b2bec3" stroke-width="2" stroke-linecap="round" />
                <line x1="102" y1="72" x2="112" y2="75" stroke="#b2bec3" stroke-width="2" stroke-linecap="round" />
                <line x1="97" y1="92" x2="107" y2="95" stroke="#b2bec3" stroke-width="2" stroke-linecap="round" />
                <!-- Stoic Grit-Teeth Mouth -->
                <line x1="66" y1="116" x2="94" y2="116" stroke="#2d3436" stroke-width="4" stroke-linecap="round" />
            `);
        }

        if (id.includes('smirk_wink')) {
            // PLAYFUL WINKING SMIRK
            return wrapSvg(`
                <!-- Right Eye Wide Open with Twinkle -->
                <path d="M 38 52 Q 54 46 70 54" fill="none" stroke="#222" stroke-width="4" stroke-linecap="round" />
                <ellipse cx="54" cy="68" rx="12" ry="14" fill="#fff" />
                <circle cx="56" cy="68" r="7" fill="#0984e3" />
                <circle cx="54" cy="65" r="3" fill="#ffffff" />
                <!-- Left Eye Wink Closed Arc -->
                <path d="M 90 50 Q 106 42 122 50" fill="none" stroke="#222" stroke-width="4" stroke-linecap="round" />
                <path d="M 94 68 Q 108 78 122 68" fill="none" stroke="#2d3436" stroke-width="5" stroke-linecap="round" />
                <polygon points="124,65 128,68 124,71" fill="#2d3436" />
                <!-- Asymmetrical Cocky Smirk Mouth -->
                <path d="M 64 116 Q 84 122 102 108" fill="none" stroke="#c0392b" stroke-width="4.5" stroke-linecap="round" />
                <circle cx="104" cy="106" r="2.5" fill="#c0392b" />
            `);
        }

        // Default Playard Smile
        return wrapSvg(`
            <!-- Confident Friendly Smile -->
            <path d="M 38 56 Q 54 50 70 56" fill="none" stroke="#222" stroke-width="4" stroke-linecap="round" />
            <path d="M 90 56 Q 106 50 122 56" fill="none" stroke="#222" stroke-width="4" stroke-linecap="round" />
            <ellipse cx="54" cy="70" rx="11" ry="12" fill="#fff" />
            <circle cx="54" cy="70" r="6" fill="#1e272e" />
            <circle cx="52" cy="67" r="2.5" fill="#ffffff" />
            <ellipse cx="106" cy="70" rx="11" ry="12" fill="#fff" />
            <circle cx="106" cy="70" r="6" fill="#1e272e" />
            <circle cx="104" cy="67" r="2.5" fill="#ffffff" />
            <!-- Wide Happy Smile with Teeth -->
            <path d="M 52 110 Q 80 134 108 110 Z" fill="#78281f" stroke="#501810" stroke-width="2" />
            <path d="M 58 110 Q 80 122 102 110 Z" fill="#ffffff" />
        `);
    }

    // 2. HATS & HELMETS
    if (category === 'hats') {
        if (id.includes('crown')) {
            return wrapSvg(`
                <!-- Royal Gold Crown with Rubies and Sapphires -->
                <path d="M 28 110 L 32 60 L 56 86 L 80 44 L 104 86 L 128 60 L 132 110 Z" fill="url(#goldGrad)" stroke="#d4af37" stroke-width="3" />
                <ellipse cx="80" cy="110" rx="52" ry="10" fill="url(#goldGrad)" stroke="#b8860b" stroke-width="2" />
                <circle cx="80" cy="40" r="6" fill="#e74c3c" filter="url(#neonGlow)" />
                <circle cx="32" cy="56" r="5" fill="#3498db" />
                <circle cx="128" cy="56" r="5" fill="#3498db" />
                <circle cx="56" cy="84" r="4" fill="#2ecc71" />
                <circle cx="104" cy="84" r="4" fill="#2ecc71" />
                <polygon points="80,88 88,98 80,108 72,98" fill="#e74c3c" stroke="#ffffff" stroke-width="1" />
            `);
        }
        if (id.includes('viking')) {
            return wrapSvg(`
                <!-- Viking Horned Helm -->
                <path d="M 40 100 Q 80 50 120 100 Z" fill="url(#chromeGrad)" stroke="#4b6584" stroke-width="3" />
                <rect x="36" y="98" width="88" height="14" rx="4" fill="#2f3542" />
                <circle cx="50" cy="105" r="2.5" fill="#ffd700" />
                <circle cx="80" cy="105" r="2.5" fill="#ffd700" />
                <circle cx="110" cy="105" r="2.5" fill="#ffd700" />
                <!-- Left Ivory Horn -->
                <path d="M 42 90 Q 14 74 18 36 Q 30 54 44 80 Z" fill="#f5f6fa" stroke="#dcdde1" stroke-width="2" />
                <!-- Right Ivory Horn -->
                <path d="M 118 90 Q 146 74 142 36 Q 130 54 116 80 Z" fill="#f5f6fa" stroke="#dcdde1" stroke-width="2" />
            `);
        }
        if (id.includes('snapback') || id.includes('cap')) {
            return wrapSvg(`
                <!-- Snapback Cap -->
                <path d="M 38 98 Q 80 46 122 98 Z" fill="#00f2fe" stroke="#0984e3" stroke-width="3" />
                <ellipse cx="80" cy="54" rx="4" ry="3" fill="#ffd700" />
                <path d="M 30 98 Q 80 114 130 98 L 148 108 Q 80 128 12 108 Z" fill="#1e272e" stroke="#00f2fe" stroke-width="2" />
                <rect x="68" y="72" width="24" height="16" rx="3" fill="#1e272e" />
                <text x="80" y="84" font-size="10" font-weight="900" fill="#00f2fe" text-anchor="middle">PLY</text>
            `);
        }
        if (id.includes('cowboy')) {
            return wrapSvg(`
                <!-- Cowboy Leather Hat -->
                <path d="M 10 106 Q 80 84 150 106 Q 80 126 10 106 Z" fill="#593a1f" stroke="#3b2614" stroke-width="3" />
                <path d="M 46 100 Q 52 48 80 50 Q 108 48 114 100 Z" fill="#7a4f2b" stroke="#3b2614" stroke-width="3" />
                <rect x="47" y="94" width="66" height="8" fill="#d4af37" />
            `);
        }
        if (id.includes('halo')) {
            return wrapSvg(`
                <!-- Golden Angel Halo with Divine Glow -->
                <ellipse cx="80" cy="70" rx="55" ry="18" fill="none" stroke="url(#goldGrad)" stroke-width="8" filter="url(#neonGlow)" />
                <ellipse cx="80" cy="70" rx="55" ry="18" fill="none" stroke="#ffffff" stroke-width="2.5" />
                <line x1="80" y1="88" x2="80" y2="120" stroke="rgba(255,255,255,0.2)" stroke-width="2" stroke-dasharray="2,3" />
            `);
        }
        // General Hat Fallback
        return wrapSvg(`
            <ellipse cx="80" cy="106" rx="52" ry="16" fill="#2d3436" />
            <path d="M 44 106 Q 80 54 116 106 Z" fill="#0984e3" stroke="#2d3436" stroke-width="3" />
        `);
    }

    // 3. HAIR
    if (category === 'hair') {
        const color = item.defaultColor ? `#${item.defaultColor.toString(16).padStart(6, '0')}` : '#e67e22';
        return wrapSvg(`
            <!-- Hairstyle 3D Preview -->
            <path d="M 34 112 Q 28 54 80 40 Q 132 54 126 112 Q 112 70 80 72 Q 48 70 34 112 Z" fill="${color}" stroke="rgba(0,0,0,0.3)" stroke-width="3" />
            <polygon points="50,48 64,24 74,44" fill="${color}" />
            <polygon points="72,42 80,18 92,42" fill="${color}" />
            <polygon points="90,44 104,28 110,50" fill="${color}" />
            <path d="M 46 64 Q 80 52 114 64" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" opacity="0.4" />
        `);
    }

    // 4. TOPS / CLOTHES
    if (category === 'tops') {
        const color = item.defaultColor ? `#${item.defaultColor.toString(16).padStart(6, '0')}` : '#3498db';
        return wrapSvg(`
            <!-- Jacket / Hoodie / Armor -->
            <path d="M 50 44 L 80 54 L 110 44 L 140 72 L 126 94 L 116 82 L 116 130 L 44 130 L 44 82 L 34 94 L 20 72 Z" fill="${color}" stroke="#1e272e" stroke-width="3" />
            <polygon points="80,54 68,90 92,90" fill="#f8f9fa" />
            <line x1="80" y1="90" x2="80" y2="130" stroke="#ffd700" stroke-width="3" />
            <circle cx="80" cy="94" r="2.5" fill="#ffffff" />
        `);
    }

    // 5. PANTS
    if (category === 'pants') {
        const color = item.defaultColor ? `#${item.defaultColor.toString(16).padStart(6, '0')}` : '#2c3e50';
        return wrapSvg(`
            <!-- Pants / Jeans -->
            <path d="M 40 40 L 120 40 L 116 128 L 86 128 L 80 76 L 74 128 L 44 128 Z" fill="${color}" stroke="#1e272e" stroke-width="3" />
            <rect x="40" y="38" width="80" height="10" fill="#111" />
            <rect x="74" y="37" width="12" height="12" rx="2" fill="url(#goldGrad)" />
            <rect x="50" y="80" width="18" height="14" rx="3" fill="rgba(0,0,0,0.25)" />
            <rect x="92" y="80" width="18" height="14" rx="3" fill="rgba(0,0,0,0.25)" />
        `);
    }

    // 6. SHOES
    if (category === 'shoes') {
        const color = item.defaultColor ? `#${item.defaultColor.toString(16).padStart(6, '0')}` : '#ecf0f1';
        return wrapSvg(`
            <!-- Left Sneaker -->
            <path d="M 24 96 Q 30 68 50 68 L 54 82 L 68 86 L 72 108 L 22 108 Z" fill="${color}" stroke="#2f3542" stroke-width="2.5" />
            <rect x="20" y="106" width="54" height="10" rx="3" fill="#ffffff" stroke="#2f3542" stroke-width="2" />
            <!-- Right Sneaker -->
            <path d="M 94 96 Q 100 68 120 68 L 124 82 L 138 86 L 142 108 L 92 108 Z" fill="${color}" stroke="#2f3542" stroke-width="2.5" />
            <rect x="90" y="106" width="54" height="10" rx="3" fill="#ffffff" stroke="#2f3542" stroke-width="2" />
            ${id.includes('hover') ? '<ellipse cx="47" cy="120" rx="14" ry="6" fill="#00f2fe" filter="url(#neonGlow)"/><ellipse cx="117" cy="120" rx="14" ry="6" fill="#00f2fe" filter="url(#neonGlow)"/>' : ''}
        `);
    }

    // 7. BACK ACCESSORIES
    if (category === 'back') {
        if (id.includes('wings')) {
            const wingColor = id.includes('golden') ? 'url(#goldGrad)' : (id.includes('demon') ? '#9b59b6' : '#00f2fe');
            return wrapSvg(`
                <!-- Angel / Demon / Cyber Wings -->
                <path d="M 76 90 Q 20 40 10 18 Q 38 34 50 56 Q 30 46 22 36 Q 44 54 60 74 L 76 90 Z" fill="${wingColor}" filter="url(#neonGlow)" />
                <path d="M 84 90 Q 140 40 150 18 Q 122 34 110 56 Q 130 46 138 36 Q 116 54 100 74 L 84 90 Z" fill="${wingColor}" filter="url(#neonGlow)" />
                <circle cx="80" cy="90" r="8" fill="url(#goldGrad)" />
            `);
        }
        if (id.includes('katana')) {
            return wrapSvg(`
                <!-- Dual Crossed Ninja Katanas -->
                <line x1="20" y1="20" x2="140" y2="140" stroke="url(#chromeGrad)" stroke-width="5" stroke-linecap="round" />
                <line x1="140" y1="20" x2="20" y2="140" stroke="url(#chromeGrad)" stroke-width="5" stroke-linecap="round" />
                <rect x="18" y="18" width="22" height="6" transform="rotate(45 29 21)" fill="#d63031" />
                <rect x="120" y="18" width="22" height="6" transform="rotate(-45 131 21)" fill="#d63031" />
            `);
        }
        if (id.includes('jetpack')) {
            return wrapSvg(`
                <!-- Cyber Jetpack -->
                <rect x="42" y="44" width="30" height="64" rx="8" fill="#2d3436" stroke="#00f2fe" stroke-width="2" />
                <rect x="88" y="44" width="30" height="64" rx="8" fill="#2d3436" stroke="#00f2fe" stroke-width="2" />
                <rect x="68" y="56" width="24" height="36" rx="4" fill="#636e72" />
                <polygon points="48,108 57,136 66,108" fill="#00f2fe" filter="url(#neonGlow)" />
                <polygon points="94,108 103,136 112,108" fill="#00f2fe" filter="url(#neonGlow)" />
            `);
        }
        if (id.includes('shield')) {
            return wrapSvg(`
                <!-- Knight Golden Heraldic Shield -->
                <path d="M 40 40 Q 80 34 120 40 L 120 86 Q 120 126 80 144 Q 40 126 40 86 Z" fill="url(#goldGrad)" stroke="#ffd700" stroke-width="4" />
                <polygon points="80,56 94,84 80,112 66,84" fill="#c0392b" />
            `);
        }
    }

    // 8. SKINS
    if (category === 'skin') {
        const color = item.defaultColor ? `#${item.defaultColor.toString(16).padStart(6, '0')}` : '#f5d0b5';
        return wrapSvg(`
            <!-- Humanoid 3D Mannequin Bust -->
            <ellipse cx="80" cy="62" rx="28" ry="34" fill="${color}" stroke="rgba(0,0,0,0.2)" stroke-width="2" />
            <rect x="72" y="92" width="16" height="18" fill="${color}" />
            <path d="M 40 128 Q 80 106 120 128 Z" fill="${color}" stroke="rgba(0,0,0,0.2)" stroke-width="2" />
            <ellipse cx="72" cy="52" rx="6" ry="10" fill="#ffffff" opacity="0.3" />
        `);
    }

    // 9. EMOTES
    if (category === 'emotes') {
        if (id.includes('wave')) {
            return wrapSvg(`
                <!-- Friendly 3D Hand Wave -->
                <ellipse cx="80" cy="120" rx="30" ry="10" fill="rgba(0,0,0,0.4)" />
                <path d="M 68 126 L 68 96 L 52 82 C 48 78, 44 84, 48 88 L 60 100 L 60 72 C 60 66, 68 66, 68 72 L 68 62 C 68 56, 76 56, 76 62 L 76 66 C 76 60, 84 60, 84 66 L 84 74 C 84 68, 92 68, 92 74 L 92 98 Q 92 118, 80 126 Z" fill="url(#goldGrad)" stroke="#b8860b" stroke-width="2.5" />
                <!-- Motion Wave Arcs -->
                <path d="M 102 60 Q 118 78 102 96" fill="none" stroke="#00f2fe" stroke-width="3" stroke-linecap="round" filter="url(#neonGlow)" />
                <path d="M 112 52 Q 132 78 112 104" fill="none" stroke="#00f2fe" stroke-width="2" stroke-linecap="round" opacity="0.6" />
                <text x="32" y="52" font-size="20" fill="#ffd700">✨</text>
            `);
        }

        if (id.includes('dance')) {
            return wrapSvg(`
                <!-- Victory Spin Dance - Disco Suit & Rhythm Ring -->
                <ellipse cx="80" cy="88" rx="55" ry="18" fill="none" stroke="#00f2fe" stroke-width="2" stroke-dasharray="6,4" filter="url(#neonGlow)" />
                <circle cx="80" cy="40" r="14" fill="#ffd700" filter="url(#neonGlow)" />
                <!-- Torso in Stylish Purple Suit -->
                <polygon points="68,54 92,54 88,96 72,96" fill="#8e44ad" stroke="#2c3e50" stroke-width="2" />
                <!-- Raised Dancing Arms -->
                <path d="M 68 60 L 44 42 L 36 28" fill="none" stroke="#8e44ad" stroke-width="8" stroke-linecap="round" />
                <path d="M 92 60 L 116 78 L 126 94" fill="none" stroke="#8e44ad" stroke-width="8" stroke-linecap="round" />
                <!-- Grooving Legs -->
                <path d="M 74 96 L 60 134" fill="none" stroke="#2c3e50" stroke-width="8" stroke-linecap="round" />
                <path d="M 86 96 L 104 130" fill="none" stroke="#2c3e50" stroke-width="8" stroke-linecap="round" />
                <text x="30" y="40" font-size="18">🕺</text>
                <text x="115" y="44" font-size="18" fill="#ffd700">🎵</text>
            `);
        }

        if (id.includes('salute')) {
            return wrapSvg(`
                <!-- Honorary Military Salute -->
                <circle cx="80" cy="40" r="14" fill="url(#goldGrad)" />
                <rect x="66" y="54" width="28" height="42" rx="4" fill="#1e3a8a" stroke="#d4af37" stroke-width="2" />
                <!-- Right Arm at Crisp Brow Salute -->
                <path d="M 94 60 L 118 72 L 96 46" fill="none" stroke="#1e3a8a" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" />
                <path d="M 66 60 L 60 98" fill="none" stroke="#1e3a8a" stroke-width="8" stroke-linecap="round" />
                <!-- Chevron Rank Badge -->
                <polygon points="80,62 86,68 80,74 74,68" fill="url(#goldGrad)" />
                <polygon points="80,72 86,78 80,84 74,78" fill="url(#goldGrad)" />
                <rect x="70" y="96" width="8" height="38" fill="#111" />
                <rect x="82" y="96" width="8" height="38" fill="#111" />
                <text x="26" y="44" font-size="20">🎖️</text>
            `);
        }

        if (id.includes('backflip')) {
            return wrapSvg(`
                <!-- Acrobatic Ninja Backflip -->
                <!-- 360 Velocity Arc -->
                <path d="M 32 100 A 48 48 0 1 1 128 100" fill="none" stroke="#00f2fe" stroke-width="4" stroke-dasharray="8,6" filter="url(#neonGlow)" />
                <circle cx="80" cy="46" r="13" fill="#111" stroke="#00f2fe" stroke-width="2" />
                <circle cx="80" cy="74" r="16" fill="#111" />
                <path d="M 70 70 Q 52 64 42 78" fill="none" stroke="#00f2fe" stroke-width="6" stroke-linecap="round" />
                <path d="M 90 70 Q 108 64 118 78" fill="none" stroke="#00f2fe" stroke-width="6" stroke-linecap="round" />
                <path d="M 72 88 Q 60 106 48 116" fill="none" stroke="#00f2fe" stroke-width="6" stroke-linecap="round" />
                <path d="M 88 88 Q 100 106 112 116" fill="none" stroke="#00f2fe" stroke-width="6" stroke-linecap="round" />
                <text x="120" y="40" font-size="18">🌀</text>
            `);
        }

        if (id.includes('breakdance')) {
            return wrapSvg(`
                <!-- Windmill Breakdance -->
                <circle cx="60" cy="118" r="12" fill="#e74c3c" />
                <path d="M 60 106 L 86 94" stroke="#e74c3c" stroke-width="12" stroke-linecap="round" />
                <!-- Flying Windmill Legs -->
                <path d="M 86 94 L 126 62" stroke="#2c3e50" stroke-width="10" stroke-linecap="round" />
                <path d="M 86 94 L 46 54" stroke="#2c3e50" stroke-width="10" stroke-linecap="round" />
                <!-- Ground Soundwave Ripples -->
                <ellipse cx="80" cy="132" rx="55" ry="12" fill="none" stroke="#ffd700" stroke-width="2" filter="url(#neonGlow)" />
                <text x="110" y="48" font-size="20">⚡</text>
                <text x="24" y="52" font-size="20">🔥</text>
            `);
        }

        if (id.includes('laugh')) {
            return wrapSvg(`
                <!-- Triumphant Laugh & Golden Trophy -->
                <!-- Golden Trophy -->
                <path d="M 64 70 L 64 92 Q 64 114 80 114 Q 96 114 96 92 L 96 70 Z" fill="url(#goldGrad)" stroke="#d4af37" stroke-width="2" />
                <rect x="74" y="114" width="12" height="18" fill="url(#goldGrad)" />
                <rect x="62" y="132" width="36" height="10" rx="3" fill="#111" />
                <!-- Trophy Handles -->
                <path d="M 64 76 C 48 76 48 98 64 98" fill="none" stroke="url(#goldGrad)" stroke-width="4" />
                <path d="M 96 76 C 112 76 112 98 96 98" fill="none" stroke="url(#goldGrad)" stroke-width="4" />
                <!-- Laughing Emoji above Trophy -->
                <circle cx="80" cy="42" r="20" fill="#ffd700" stroke="#f39c12" stroke-width="2" />
                <path d="M 70 38 Q 74 32 78 38" fill="none" stroke="#2d3436" stroke-width="2.5" />
                <path d="M 82 38 Q 86 32 90 38" fill="none" stroke="#2d3436" stroke-width="2.5" />
                <path d="M 70 46 Q 80 62 90 46 Z" fill="#78281f" />
                <text x="116" y="40" font-size="18">🎉</text>
            `);
        }

        if (id.includes('flex')) {
            return wrapSvg(`
                <!-- Bodybuilder Muscle Flex -->
                <circle cx="80" cy="42" r="14" fill="url(#goldGrad)" />
                <polygon points="66,56 94,56 88,96 72,96" fill="#e67e22" stroke="#d35400" stroke-width="2" />
                <!-- Double Bicep Arms -->
                <path d="M 66 64 L 42 64 L 42 42" fill="none" stroke="#e67e22" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" />
                <path d="M 94 64 L 118 64 L 118 42" fill="none" stroke="#e67e22" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" />
                <circle cx="42" cy="50" r="10" fill="#f39c12" />
                <circle cx="118" cy="50" r="10" fill="#f39c12" />
                <rect x="68" y="96" width="10" height="38" fill="#111" />
                <rect x="82" y="96" width="10" height="38" fill="#111" />
                <text x="70" y="32" font-size="20">💪</text>
            `);
        }

        if (id.includes('levitate')) {
            return wrapSvg(`
                <!-- Mystic Zen Levitation in Lotus Pose -->
                <!-- Glowing Aura Ring -->
                <circle cx="80" cy="74" r="50" fill="none" stroke="#9b59b6" stroke-width="2" filter="url(#neonGlow)" />
                <ellipse cx="80" cy="132" rx="42" ry="8" fill="rgba(155, 89, 182, 0.4)" filter="url(#neonGlow)" />
                <circle cx="80" cy="46" r="13" fill="#ffffff" filter="url(#neonGlow)" />
                <path d="M 68 62 L 92 62 L 88 94 L 72 94 Z" fill="#8e44ad" />
                <!-- Crossed Lotus Legs -->
                <path d="M 64 94 Q 80 110 96 94 Q 104 102 80 106 Q 56 102 64 94 Z" fill="#9b59b6" />
                <!-- Resting Arms -->
                <path d="M 68 66 L 52 86 L 68 92" fill="none" stroke="#8e44ad" stroke-width="6" stroke-linecap="round" />
                <path d="M 92 66 L 108 86 L 92 92" fill="none" stroke="#8e44ad" stroke-width="6" stroke-linecap="round" />
                <text x="70" y="32" font-size="18">🧘</text>
            `);
        }

        if (id.includes('zombie')) {
            return wrapSvg(`
                <!-- Spooky Zombie Walk -->
                <circle cx="80" cy="40" r="14" fill="#27ae60" />
                <rect x="68" y="54" width="24" height="42" fill="#2d3436" />
                <!-- Outstretched Undead Arms -->
                <line x1="68" y1="62" x2="34" y2="62" stroke="#27ae60" stroke-width="8" stroke-linecap="round" />
                <line x1="92" y1="62" x2="126" y2="62" stroke="#27ae60" stroke-width="8" stroke-linecap="round" />
                <!-- Tattered Legs -->
                <rect x="70" y="96" width="9" height="38" fill="#1e272e" />
                <rect x="81" y="96" width="9" height="38" fill="#1e272e" />
                <text x="70" y="30" font-size="18">🧟</text>
            `);
        }

        if (id.includes('guitar')) {
            return wrapSvg(`
                <!-- Air Guitar Shred Solo -->
                <!-- Rock Guitar Body -->
                <polygon points="50,96 74,80 88,104 64,120" fill="#e74c3c" stroke="#c0392b" stroke-width="2" />
                <!-- Guitar Neck -->
                <line x1="64" y1="90" x2="120" y2="34" stroke="url(#chromeGrad)" stroke-width="6" stroke-linecap="round" />
                <!-- Lightning & Rock Notes -->
                <polygon points="126,24 136,36 128,38 138,50 122,44 128,34" fill="#ffd700" filter="url(#neonGlow)" />
                <text x="24" y="60" font-size="20">🎸</text>
                <text x="110" y="80" font-size="20">🔥</text>
            `);
        }

        return wrapSvg(`
            <!-- Dynamic Action Silhouette & Music/Motion Sparkles -->
            <circle cx="80" cy="44" r="14" fill="#00f2fe" filter="url(#neonGlow)" />
            <line x1="80" y1="58" x2="80" y2="94" stroke="#00f2fe" stroke-width="7" stroke-linecap="round" />
            <line x1="80" y1="72" x2="52" y2="52" stroke="#00f2fe" stroke-width="6" stroke-linecap="round" />
            <line x1="80" y1="72" x2="112" y2="82" stroke="#00f2fe" stroke-width="6" stroke-linecap="round" />
            <line x1="80" y1="94" x2="60" y2="132" stroke="#00f2fe" stroke-width="6" stroke-linecap="round" />
            <line x1="80" y1="94" x2="108" y2="124" stroke="#00f2fe" stroke-width="6" stroke-linecap="round" />
            <text x="32" y="44" font-size="20" fill="#ffd700">🎵</text>
            <text x="116" y="52" font-size="20" fill="#ffd700">✨</text>
        `);
    }

    // Fallback generic high-tech cube
    return wrapSvg(`
        <rect x="44" y="44" width="72" height="72" rx="16" fill="url(#chromeGrad)" stroke="#00f2fe" stroke-width="3" />
        <circle cx="80" cy="80" r="16" fill="#00f2fe" filter="url(#neonGlow)" />
    `);
}
