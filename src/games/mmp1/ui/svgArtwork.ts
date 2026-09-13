import { CrateTier, WeaponSkinDef } from "../types";

export function getCrateArtworkSvg(tier: CrateTier): string {
    switch (tier) {
        case 'common':
            return `<svg viewBox="0 0 100 80" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="crate-c-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stop-color="#95a5a6"/>
                        <stop offset="50%" stop-color="#7f8c8d"/>
                        <stop offset="100%" stop-color="#535c68"/>
                    </linearGradient>
                    <linearGradient id="metal-brace" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stop-color="#bdc3c7"/>
                        <stop offset="100%" stop-color="#2c3e50"/>
                    </linearGradient>
                </defs>
                <rect x="12" y="18" width="76" height="52" rx="6" fill="url(#crate-c-grad)" stroke="#34495e" stroke-width="3"/>
                <rect x="18" y="24" width="64" height="40" rx="3" fill="#636e72" stroke="#2d3436" stroke-width="1.5"/>
                <line x1="18" y1="24" x2="82" y2="64" stroke="url(#metal-brace)" stroke-width="4"/>
                <line x1="82" y1="24" x2="18" y2="64" stroke="url(#metal-brace)" stroke-width="4"/>
                <rect x="10" y="14" width="80" height="10" rx="3" fill="#7f8c8d" stroke="#2c3e50" stroke-width="2"/>
                <circle cx="22" cy="28" r="2" fill="#d2d7d9"/>
                <circle cx="78" cy="28" r="2" fill="#d2d7d9"/>
                <circle cx="22" cy="60" r="2" fill="#d2d7d9"/>
                <circle cx="78" cy="60" r="2" fill="#d2d7d9"/>
                <rect x="44" y="38" width="12" height="14" rx="2" fill="#f1c40f" stroke="#b7950b" stroke-width="1.5"/>
                <path d="M47 38 V32 A3 3 0 0 1 53 32 V38" fill="none" stroke="#d5dbdb" stroke-width="2"/>
                <circle cx="50" cy="44" r="1.5" fill="#333"/>
            </svg>`;

        case 'uncommon':
            return `<svg viewBox="0 0 100 80" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="crate-uc-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stop-color="#2ecc71"/>
                        <stop offset="60%" stop-color="#27ae60"/>
                        <stop offset="100%" stop-color="#145a32"/>
                    </linearGradient>
                </defs>
                <rect x="12" y="16" width="76" height="54" rx="6" fill="url(#crate-uc-grad)" stroke="#196f3d" stroke-width="3"/>
                <rect x="10" y="12" width="80" height="12" rx="3" fill="#229954" stroke="#145a32" stroke-width="2"/>
                <polygon points="40,32 50,44 60,32 56,32 50,39 44,32" fill="#2ed573"/>
                <polygon points="40,44 50,56 60,44 56,44 50,51 44,44" fill="#2ed573"/>
                <rect x="14" y="24" width="8" height="40" rx="2" fill="#1e272c" stroke="#111" stroke-width="1.5"/>
                <rect x="78" y="24" width="8" height="40" rx="2" fill="#1e272c" stroke="#111" stroke-width="1.5"/>
                <line x1="42" y1="62" x2="58" y2="62" stroke="#111" stroke-width="3" stroke-linecap="round"/>
            </svg>`;

        case 'rare':
            return `<svg viewBox="0 0 100 80" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="crate-r-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stop-color="#0984e3"/>
                        <stop offset="50%" stop-color="#0056b3"/>
                        <stop offset="100%" stop-color="#002d62"/>
                    </linearGradient>
                    <filter id="rare-crate-glow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="3" result="blur"/>
                        <feComposite in="SourceGraphic" in2="blur" operator="over"/>
                    </filter>
                </defs>
                <rect x="12" y="16" width="76" height="54" rx="8" fill="url(#crate-r-grad)" stroke="#00d2d3" stroke-width="2.5"/>
                <rect x="10" y="12" width="80" height="12" rx="4" fill="#0c2461" stroke="#00cec9" stroke-width="2"/>
                <path d="M22 34 H36 L44 42 H56 L64 34 H78" fill="none" stroke="#00f2fe" stroke-width="2" filter="url(#rare-crate-glow)"/>
                <path d="M22 56 H36 L44 48 H56 L64 56 H78" fill="none" stroke="#00f2fe" stroke-width="2" filter="url(#rare-crate-glow)"/>
                <circle cx="50" cy="45" r="10" fill="#04122c" stroke="#00d2d3" stroke-width="2"/>
                <circle cx="50" cy="45" r="6" fill="#00f2fe" filter="url(#rare-crate-glow)"/>
                <circle cx="50" cy="45" r="3" fill="#ffffff"/>
            </svg>`;

        case 'epic':
            return `<svg viewBox="0 0 100 80" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="crate-ep-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stop-color="#9b59b6"/>
                        <stop offset="50%" stop-color="#6c5ce7"/>
                        <stop offset="100%" stop-color="#341f97"/>
                    </linearGradient>
                    <filter id="epic-crate-glow">
                        <feGaussianBlur stdDeviation="2.5" result="blur"/>
                        <feComposite in="SourceGraphic" in2="blur" operator="over"/>
                    </filter>
                </defs>
                <path d="M12 24 Q50 14 88 24 L84 68 Q50 72 16 68 Z" fill="url(#crate-ep-grad)" stroke="#fdcb6e" stroke-width="2.5"/>
                <path d="M10 20 Q50 10 90 20 L88 30 Q50 20 12 30 Z" fill="#4834d4" stroke="#fdcb6e" stroke-width="2"/>
                <path d="M24 38 L32 46 L24 54 M76 38 L68 46 L76 54" stroke="#e056fd" stroke-width="2" stroke-linecap="round" fill="none" filter="url(#epic-crate-glow)"/>
                <polygon points="50,34 59,45 50,56 41,45" fill="#e056fd" stroke="#fff" stroke-width="1.5" filter="url(#epic-crate-glow)"/>
                <polygon points="50,38 55,45 50,52 45,45" fill="#f8a5c2"/>
                <circle cx="50" cy="45" r="2" fill="#fff"/>
            </svg>`;

        case 'legendary':
            return `<svg viewBox="0 0 100 80" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="crate-leg-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stop-color="#f6b93b"/>
                        <stop offset="35%" stop-color="#e58e26"/>
                        <stop offset="70%" stop-color="#ffd32a"/>
                        <stop offset="100%" stop-color="#b71540"/>
                    </linearGradient>
                    <filter id="leg-crate-glow">
                        <feGaussianBlur stdDeviation="3" result="blur"/>
                        <feComposite in="SourceGraphic" in2="blur" operator="over"/>
                    </filter>
                </defs>
                <rect x="12" y="18" width="76" height="52" rx="8" fill="url(#crate-leg-grad)" stroke="#ffd700" stroke-width="3"/>
                <rect x="10" y="14" width="80" height="12" rx="4" fill="#fad390" stroke="#f6b93b" stroke-width="2"/>
                <rect x="24" y="14" width="8" height="56" rx="2" fill="#ffd700" stroke="#b7791f" stroke-width="1.5"/>
                <rect x="68" y="14" width="8" height="56" rx="2" fill="#ffd700" stroke="#b7791f" stroke-width="1.5"/>
                <polygon points="42,36 45,30 50,33 55,30 58,36 50,38" fill="#ffd700" stroke="#b7791f" stroke-width="1"/>
                <polygon points="50,38 58,47 50,56 42,47" fill="#e74c3c" stroke="#ffd700" stroke-width="2" filter="url(#leg-crate-glow)"/>
                <polygon points="50,42 55,47 50,52 45,47" fill="#ff7675"/>
                <circle cx="50" cy="47" r="2.5" fill="#fff"/>
            </svg>`;

        case 'cosmic':
            return `<svg viewBox="0 0 100 80" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <radialGradient id="crate-cosmic-pod" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stop-color="#ff4757"/>
                        <stop offset="40%" stop-color="#6c5ce7"/>
                        <stop offset="85%" stop-color="#1e0c3b"/>
                        <stop offset="100%" stop-color="#090117"/>
                    </radialGradient>
                    <filter id="cosmic-crate-glow">
                        <feGaussianBlur stdDeviation="3.5" result="blur"/>
                        <feComposite in="SourceGraphic" in2="blur" operator="over"/>
                    </filter>
                </defs>
                <rect x="12" y="16" width="76" height="54" rx="14" fill="url(#crate-cosmic-pod)" stroke="#ff4757" stroke-width="2.5"/>
                <ellipse cx="50" cy="43" rx="42" ry="14" fill="none" stroke="#ff4757" stroke-width="2.5" transform="rotate(-15 50 43)" stroke-dasharray="8 4" filter="url(#cosmic-crate-glow)"/>
                <circle cx="28" cy="30" r="1.5" fill="#fff"/>
                <circle cx="70" cy="28" r="1.2" fill="#ffeaa7"/>
                <circle cx="32" cy="58" r="1.2" fill="#ffeaa7"/>
                <circle cx="72" cy="56" r="1.5" fill="#fff"/>
                <circle cx="50" cy="43" r="11" fill="#000" stroke="#a29bfe" stroke-width="2"/>
                <circle cx="50" cy="43" r="6" fill="#ff4757" filter="url(#cosmic-crate-glow)"/>
                <circle cx="50" cy="43" r="2" fill="#fff"/>
            </svg>`;

        case 'secret':
            return `<svg viewBox="0 0 100 80" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="crate-sec-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stop-color="#0a192f"/>
                        <stop offset="50%" stop-color="#071220"/>
                        <stop offset="100%" stop-color="#02070d"/>
                    </linearGradient>
                    <filter id="secret-crate-glow">
                        <feGaussianBlur stdDeviation="3" result="blur"/>
                        <feComposite in="SourceGraphic" in2="blur" operator="over"/>
                    </filter>
                </defs>
                <rect x="14" y="16" width="72" height="54" rx="4" fill="url(#crate-sec-grad)" stroke="#00d2d3" stroke-width="2.5"/>
                <line x1="14" y1="32" x2="86" y2="32" stroke="#00d2d3" stroke-width="1" opacity="0.4"/>
                <line x1="14" y1="52" x2="86" y2="52" stroke="#00d2d3" stroke-width="1" opacity="0.4"/>
                <line x1="34" y1="16" x2="34" y2="70" stroke="#00d2d3" stroke-width="1" opacity="0.4"/>
                <line x1="66" y1="16" x2="66" y2="70" stroke="#00d2d3" stroke-width="1" opacity="0.4"/>
                <path d="M30 43 Q50 25 70 43 Q50 61 30 43 Z" fill="none" stroke="#00d2d3" stroke-width="2.5" filter="url(#secret-crate-glow)"/>
                <circle cx="50" cy="43" r="7" fill="#00d2d3" filter="url(#secret-crate-glow)"/>
                <circle cx="50" cy="43" r="3.5" fill="#02070d"/>
                <circle cx="51.5" cy="41.5" r="1.2" fill="#ffffff"/>
            </svg>`;

        case 'frostbite':
            return `<svg viewBox="0 0 100 80" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="crate-frost-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stop-color="#70a1ff"/>
                        <stop offset="50%" stop-color="#1e90ff"/>
                        <stop offset="100%" stop-color="#0c2461"/>
                    </linearGradient>
                </defs>
                <rect x="12" y="16" width="76" height="54" rx="8" fill="url(#crate-frost-grad)" stroke="#dfe4ea" stroke-width="2.5"/>
                <path d="M50 24 L50 62 M32 43 L68 43 M38 31 L62 55 M38 55 L62 31" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round"/>
                <polygon points="50,22 53,28 50,34 47,28" fill="#a4b0be"/>
                <polygon points="50,52 53,58 50,64 47,58" fill="#a4b0be"/>
                <circle cx="50" cy="43" r="5" fill="#70a1ff" stroke="#fff" stroke-width="1.5"/>
            </svg>`;

        case 'inferno':
            return `<svg viewBox="0 0 100 80" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="crate-inf-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stop-color="#ff4757"/>
                        <stop offset="60%" stop-color="#ee5253"/>
                        <stop offset="100%" stop-color="#2f3542"/>
                    </linearGradient>
                </defs>
                <rect x="12" y="16" width="76" height="54" rx="8" fill="url(#crate-inf-grad)" stroke="#ff6b81" stroke-width="2.5"/>
                <path d="M30 60 Q34 38 42 42 Q46 26 54 36 Q62 20 68 42 Q74 48 70 60 Z" fill="#ffa502" stroke="#ff4757" stroke-width="1.5"/>
                <path d="M38 60 Q42 44 48 46 Q52 38 58 48 Q64 54 62 60 Z" fill="#ffeaa7"/>
            </svg>`;

        case 'cyberpunk':
            return `<svg viewBox="0 0 100 80" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="crate-cyber-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stop-color="#ff007f"/>
                        <stop offset="50%" stop-color="#8e44ad"/>
                        <stop offset="100%" stop-color="#00cec9"/>
                    </linearGradient>
                </defs>
                <polygon points="12,24 24,14 88,14 76,24 88,68 12,68" fill="url(#crate-cyber-grad)" stroke="#00f2fe" stroke-width="2"/>
                <line x1="20" y1="36" x2="80" y2="36" stroke="#00f2fe" stroke-width="2" stroke-dasharray="6 3"/>
                <line x1="20" y1="52" x2="80" y2="52" stroke="#ff007f" stroke-width="2" stroke-dasharray="6 3"/>
                <text x="50" y="47" fill="#fff" font-size="10" font-weight="900" text-anchor="middle" letter-spacing="2">CYBER</text>
            </svg>`;

        case 'vampire':
            return `<svg viewBox="0 0 100 80" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="crate-vamp-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stop-color="#4a0000"/>
                        <stop offset="50%" stop-color="#1e1e24"/>
                        <stop offset="100%" stop-color="#0d0d11"/>
                    </linearGradient>
                </defs>
                <rect x="12" y="16" width="76" height="54" rx="10" fill="url(#crate-vamp-grad)" stroke="#c0392b" stroke-width="2.5"/>
                <path d="M26 34 Q50 20 74 34 Q50 64 26 34 Z" fill="#8b0000" stroke="#ff4d4d" stroke-width="1.5"/>
                <polygon points="44,38 47,48 50,38" fill="#ffffff"/>
                <polygon points="50,38 53,48 56,38" fill="#ffffff"/>
            </svg>`;

        // --- KOMPLEKTI KASTIDE SVG-d (SET CRATES) ---
        case 'set_golden':
            return `<svg viewBox="0 0 100 80" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="set-gold-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stop-color="#fff200"/>
                        <stop offset="35%" stop-color="#ffd700"/>
                        <stop offset="70%" stop-color="#ff9f1a"/>
                        <stop offset="100%" stop-color="#b7791f"/>
                    </linearGradient>
                </defs>
                <rect x="10" y="14" width="80" height="58" rx="8" fill="url(#set-gold-grad)" stroke="#ffffff" stroke-width="2"/>
                <rect x="16" y="20" width="68" height="46" rx="4" fill="#2c1810" stroke="#ffd700" stroke-width="1.5"/>
                <polygon points="50,26 56,38 68,30 64,46 36,46 32,30 44,38" fill="#ffd700" stroke="#fff" stroke-width="1"/>
                <circle cx="50" cy="54" r="5" fill="#ff4757" stroke="#fff" stroke-width="1"/>
                <text x="50" y="64" fill="#ffd700" font-size="7" font-weight="900" text-anchor="middle">KOMPLEKT</text>
            </svg>`;

        case 'set_hellfire':
            return `<svg viewBox="0 0 100 80" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="set-hell-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stop-color="#ff3838"/>
                        <stop offset="40%" stop-color="#b71540"/>
                        <stop offset="100%" stop-color="#1e130c"/>
                    </linearGradient>
                </defs>
                <rect x="10" y="14" width="80" height="58" rx="8" fill="url(#set-hell-grad)" stroke="#ff9f1a" stroke-width="2.5"/>
                <path d="M22 62 L50 20 L78 62 Z" fill="#222" stroke="#ff3838" stroke-width="2"/>
                <path d="M40 58 Q50 36 60 58" fill="#ff9f1a"/>
                <circle cx="50" cy="50" r="3" fill="#fff"/>
                <text x="50" y="68" fill="#ff9f1a" font-size="6.5" font-weight="900" text-anchor="middle">KOMPLEKT</text>
            </svg>`;

        case 'set_cyberghost':
            return `<svg viewBox="0 0 100 80" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="set-ghost-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stop-color="#00f2fe"/>
                        <stop offset="50%" stop-color="#0984e3"/>
                        <stop offset="100%" stop-color="#0a192f"/>
                    </linearGradient>
                </defs>
                <rect x="10" y="14" width="80" height="58" rx="10" fill="#0a192f" stroke="#00f2fe" stroke-width="2.5"/>
                <polygon points="50,22 72,32 72,54 50,64 28,54 28,32" fill="none" stroke="#00f2fe" stroke-width="2"/>
                <circle cx="50" cy="43" r="7" fill="#00f2fe"/>
                <circle cx="50" cy="43" r="3" fill="#ffffff"/>
                <text x="50" y="70" fill="#00f2fe" font-size="6.5" font-weight="900" text-anchor="middle">KOMPLEKT</text>
            </svg>`;

        case 'set_voidgalaxy':
            return `<svg viewBox="0 0 100 80" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <radialGradient id="set-void-grad" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stop-color="#9b59b6"/>
                        <stop offset="60%" stop-color="#341f97"/>
                        <stop offset="100%" stop-color="#0b001a"/>
                    </radialGradient>
                </defs>
                <rect x="10" y="14" width="80" height="58" rx="12" fill="url(#set-void-grad)" stroke="#a29bfe" stroke-width="2.5"/>
                <circle cx="50" cy="40" r="14" fill="#000" stroke="#e056fd" stroke-width="2"/>
                <circle cx="50" cy="40" r="7" fill="#e056fd"/>
                <ellipse cx="50" cy="40" rx="30" ry="8" fill="none" stroke="#fff" stroke-width="1.5" stroke-dasharray="4 3" transform="rotate(-20 50 40)"/>
                <text x="50" y="68" fill="#e056fd" font-size="6.5" font-weight="900" text-anchor="middle">KOMPLEKT</text>
            </svg>`;

        case 'og':
        default:
            return `<svg viewBox="0 0 100 80" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="crate-og-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stop-color="#fffa65"/>
                        <stop offset="40%" stop-color="#ffd32a"/>
                        <stop offset="100%" stop-color="#ff9f1a"/>
                    </linearGradient>
                </defs>
                <rect x="12" y="16" width="76" height="54" fill="url(#crate-og-grad)" stroke="#222" stroke-width="4"/>
                <rect x="16" y="20" width="68" height="46" fill="none" stroke="#fff" stroke-width="2"/>
                <rect x="12" y="16" width="8" height="8" fill="#ff3838"/>
                <rect x="80" y="16" width="8" height="8" fill="#ff3838"/>
                <rect x="12" y="62" width="8" height="8" fill="#ff3838"/>
                <rect x="80" y="62" width="8" height="8" fill="#ff3838"/>
                <rect x="47" y="32" width="6" height="22" fill="#222"/>
                <rect x="39" y="40" width="22" height="6" fill="#222"/>
                <rect x="42" y="35" width="16" height="16" fill="#ff3838"/>
                <rect x="46" y="39" width="8" height="8" fill="#ffffff"/>
                <line x1="16" y1="28" x2="84" y2="28" stroke="rgba(0,0,0,0.18)" stroke-width="2"/>
                <line x1="16" y1="48" x2="84" y2="48" stroke="rgba(0,0,0,0.18)" stroke-width="2"/>
            </svg>`;
    }
}

export function getWeaponArtworkSvg(skin: WeaponSkinDef): string {
    if (skin.type === 'knife') {
        switch (skin.id) {
            case 'knife_frostbite':
                return `<svg viewBox="0 0 100 80" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18 64 L36 46 L44 50 L24 68 Z" fill="#2f3542" stroke="#1e272e" stroke-width="2"/>
                    <path d="M40 46 L82 18 Q88 12 92 16 C82 30 70 42 44 52 Z" fill="#70a1ff" stroke="#ffffff" stroke-width="2"/>
                    <line x1="44" y1="44" x2="80" y2="20" stroke="#fff" stroke-width="2"/>
                    <circle cx="62" cy="32" r="2.5" fill="#ffffff"/>
                </svg>`;
            case 'knife_inferno':
                return `<svg viewBox="0 0 100 80" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="24" cy="62" r="7" fill="none" stroke="#ff4757" stroke-width="3"/>
                    <path d="M28 58 L46 44 L52 50 L32 64 Z" fill="#2f3542" stroke="#111" stroke-width="2"/>
                    <path d="M48 46 Q74 40 88 24 C74 42 62 62 44 52 Z" fill="#ff6348" stroke="#ffa502" stroke-width="2"/>
                    <path d="M54 44 Q70 34 76 28" stroke="#ffeaa7" stroke-width="1.5"/>
                </svg>`;
            case 'knife_cyberpunk':
                return `<svg viewBox="0 0 100 80" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                    <path d="M16 66 L34 48 L40 52 L22 70 Z" fill="#1e272e" stroke="#ff007f" stroke-width="2"/>
                    <rect x="34" y="44" width="5" height="14" fill="#00f2fe" transform="rotate(-45 36 51)"/>
                    <path d="M38 48 L86 14 Q92 10 94 14 C84 28 72 40 42 54 Z" fill="#ff007f" stroke="#00f2fe" stroke-width="2"/>
                    <line x1="42" y1="46" x2="88" y2="15" stroke="#ffffff" stroke-width="1.5"/>
                </svg>`;
            case 'knife_vampire':
                return `<svg viewBox="0 0 100 80" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22 66 L38 50 L42 54 L26 70 Z" fill="#1e1e24" stroke="#c0392b" stroke-width="2"/>
                    <path d="M38 52 Q62 20 86 24 C72 38 60 56 42 56 Z" fill="#8b0000" stroke="#ff4d4d" stroke-width="2"/>
                    <circle cx="70" cy="30" r="2.5" fill="#ff4d4d"/>
                </svg>`;
            case 'knife_set_golden':
                return `<svg viewBox="0 0 100 80" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18 64 L36 46 L42 50 L24 68 Z" fill="#2c1810" stroke="#ffd700" stroke-width="2"/>
                    <circle cx="38" cy="46" r="6" fill="#ffd700" stroke="#fff" stroke-width="1.5"/>
                    <path d="M42 46 L86 12 Q92 8 94 12 C84 26 72 38 46 52 Z" fill="#ffd700" stroke="#ffffff" stroke-width="2"/>
                    <line x1="46" y1="44" x2="88" y2="13" stroke="#fff" stroke-width="2"/>
                </svg>`;
            case 'knife_set_hellfire':
                return `<svg viewBox="0 0 100 80" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                    <path d="M16 66 L36 46 L44 52 L22 70 Z" fill="#111" stroke="#ff3838" stroke-width="2"/>
                    <path d="M40 48 Q64 26 88 10 C80 26 68 44 44 54 Z" fill="#ff3838" stroke="#ff9f1a" stroke-width="2"/>
                    <path d="M46 44 L80 16" stroke="#ffeaa7" stroke-width="2"/>
                </svg>`;
            case 'knife_set_cyberghost':
                return `<svg viewBox="0 0 100 80" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                    <path d="M16 66 L36 46 L42 50 L22 70 Z" fill="#0a192f" stroke="#00f2fe" stroke-width="2"/>
                    <path d="M40 46 L84 14 Q90 10 94 14 C82 28 72 40 44 52 Z" fill="#00f2fe" stroke="#fff" stroke-width="2"/>
                    <line x1="44" y1="44" x2="86" y2="15" stroke="#ffffff" stroke-width="2"/>
                </svg>`;
            case 'knife_set_voidgalaxy':
                return `<svg viewBox="0 0 100 80" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                    <path d="M16 66 L36 46 L42 50 L22 70 Z" fill="#341f97" stroke="#e056fd" stroke-width="2"/>
                    <path d="M40 48 Q65 30 84 14 Q92 20 86 32 C72 50 56 56 42 52 Z" fill="#1e0c3b" stroke="#e056fd" stroke-width="2"/>
                    <circle cx="64" cy="34" r="2.5" fill="#ffffff"/>
                </svg>`;
            case 'knife_default':
                return `<svg viewBox="0 0 100 80" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 62 L42 42 L52 46 L30 66 Z" fill="#181a1d" stroke="#333" stroke-width="1.5"/>
                    <rect x="42" y="38" width="5" height="16" rx="2" fill="#d4af37" transform="rotate(-45 44 46)"/>
                    <path d="M46 42 L78 20 Q86 16 92 18 C86 28 80 34 50 48 Z" fill="#e8ecf2" stroke="#718093" stroke-width="1.5"/>
                    <line x1="50" y1="41" x2="74" y2="25" stroke="#fff" stroke-width="1.5"/>
                </svg>`;
            case 'knife_common':
                return `<svg viewBox="0 0 100 80" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18 64 L38 44 L46 48 L26 68 Z" fill="#2f3542" stroke="#1e272e" stroke-width="2"/>
                    <circle cx="28" cy="54" r="1.5" fill="#a4b0be"/>
                    <rect x="38" y="40" width="4" height="14" fill="#747d8c" transform="rotate(-45 40 47)"/>
                    <path d="M42 44 L74 24 L82 24 L90 28 C80 36 72 44 48 50 Z" fill="#8395a7" stroke="#57606f" stroke-width="1.5"/>
                    <polygon points="56,33 58,35 60,31 62,33 64,29" fill="#57606f"/>
                </svg>`;
            case 'knife_uncommon':
                return `<svg viewBox="0 0 100 80" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18 64 L38 44 L48 48 L26 68 Z" fill="#1e3725" stroke="#0e1f13" stroke-width="2"/>
                    <rect x="38" y="40" width="5" height="14" fill="#2ed573" transform="rotate(-45 40 47)"/>
                    <path d="M44 44 L78 22 Q88 18 92 20 C82 32 74 42 48 50 Z" fill="#2ed573" stroke="#1e3725" stroke-width="1.5"/>
                    <path d="M52 40 Q58 35 62 40 Q58 44 52 40 Z" fill="#1e3725"/>
                    <path d="M68 28 Q74 24 78 30 Q72 34 68 28 Z" fill="#145a32"/>
                </svg>`;
            case 'knife_rare':
                return `<svg viewBox="0 0 100 80" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <filter id="rare-b-glow"><feGaussianBlur stdDeviation="2.5"/><feComposite in="SourceGraphic" operator="over"/></filter>
                    </defs>
                    <circle cx="20" cy="62" r="8" fill="none" stroke="#d63031" stroke-width="3.5"/>
                    <path d="M25 58 L45 46 L50 52 L29 64 Z" fill="#1e272e" stroke="#2d3436" stroke-width="2"/>
                    <path d="M46 48 Q70 42 86 28 C74 44 62 62 44 54 Z" fill="#d63031" stroke="#ff7675" stroke-width="1.5" filter="url(#rare-b-glow)"/>
                    <line x1="52" y1="47" x2="62" y2="40" stroke="#ff7675" stroke-width="1"/>
                    <line x1="60" y1="46" x2="70" y2="36" stroke="#ff7675" stroke-width="1"/>
                </svg>`;
            case 'knife_epic':
                return `<svg viewBox="0 0 100 80" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <filter id="epic-b-glow"><feGaussianBlur stdDeviation="3"/><feComposite in="SourceGraphic" operator="over"/></filter>
                    </defs>
                    <path d="M16 66 L36 46 L42 50 L22 70 Z" fill="#6c5ce7" stroke="#341f97" stroke-width="2"/>
                    <rect x="36" y="42" width="6" height="14" fill="#a29bfe" transform="rotate(-45 39 49)"/>
                    <path d="M42 46 L82 16 Q88 12 94 14 C84 26 74 38 46 52 Z" fill="#00cec9" stroke="#00f2fe" stroke-width="2" filter="url(#epic-b-glow)"/>
                    <line x1="44" y1="45" x2="88" y2="16" stroke="#ffffff" stroke-width="1.5"/>
                </svg>`;
            case 'knife_legendary':
                return `<svg viewBox="0 0 100 80" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <filter id="leg-b-glow"><feGaussianBlur stdDeviation="3.5"/><feComposite in="SourceGraphic" operator="over"/></filter>
                    </defs>
                    <path d="M14 68 L34 48 L40 52 L20 72 Z" fill="#ffa502" stroke="#cc8e35" stroke-width="2"/>
                    <circle cx="38" cy="48" r="6" fill="#ffd700" stroke="#b7791f" stroke-width="1.5"/>
                    <path d="M40 46 Q64 28 88 12 C82 26 70 42 44 52 Z" fill="#ff4757" stroke="#ffd32a" stroke-width="2" filter="url(#leg-b-glow)"/>
                    <path d="M50 38 Q60 30 72 20 Q64 30 54 38 Z" fill="#ffd32a" filter="url(#leg-b-glow)"/>
                    <line x1="42" y1="45" x2="84" y2="14" stroke="#ffffff" stroke-width="1.5"/>
                </svg>`;
            case 'knife_cosmic':
                return `<svg viewBox="0 0 100 80" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <filter id="cosmic-b-glow"><feGaussianBlur stdDeviation="4"/><feComposite in="SourceGraphic" operator="over"/></filter>
                    </defs>
                    <path d="M16 66 L36 46 L42 50 L22 70 Z" fill="#4c3575" stroke="#241442" stroke-width="2"/>
                    <path d="M40 48 Q65 30 84 14 Q92 20 86 32 C72 50 56 56 42 52 Z" fill="#371b58" stroke="#ff4757" stroke-width="2.5" filter="url(#cosmic-b-glow)"/>
                    <circle cx="62" cy="34" r="1.5" fill="#ffffff"/>
                    <circle cx="74" cy="24" r="1.2" fill="#ffeaa7"/>
                    <line x1="44" y1="46" x2="80" y2="20" stroke="#e056fd" stroke-width="2" filter="url(#cosmic-b-glow)"/>
                </svg>`;
            case 'knife_secret':
                return `<svg viewBox="0 0 100 80" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <filter id="secret-b-glow"><feGaussianBlur stdDeviation="3.5"/><feComposite in="SourceGraphic" operator="over"/></filter>
                    </defs>
                    <path d="M18 64 L36 46 L42 50 L24 68 Z" fill="#10ac84" stroke="#053e2e" stroke-width="2"/>
                    <path d="M40 46 L76 16 Q86 10 92 14 C82 28 72 40 44 52 Z" fill="#01a3a4" stroke="#00d2d3" stroke-width="2" opacity="0.9" filter="url(#secret-b-glow)"/>
                    <path d="M46 44 L80 18" stroke="#ffffff" stroke-width="2" opacity="0.8"/>
                    <circle cx="56" cy="36" r="2" fill="#00f2fe" filter="url(#secret-b-glow)"/>
                </svg>`;
            case 'knife_og':
            default:
                return `<svg viewBox="0 0 100 80" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                    <rect x="20" y="60" width="8" height="8" fill="#ff9f1a"/>
                    <rect x="26" y="54" width="8" height="8" fill="#ff9f1a"/>
                    <rect x="24" y="44" width="8" height="8" fill="#222"/>
                    <rect x="30" y="50" width="8" height="8" fill="#222"/>
                    <rect x="36" y="56" width="8" height="8" fill="#222"/>
                    <rect x="38" y="40" width="10" height="10" fill="#ffd32a" stroke="#222" stroke-width="2"/>
                    <rect x="46" y="32" width="10" height="10" fill="#ffd32a" stroke="#222" stroke-width="2"/>
                    <rect x="54" y="24" width="10" height="10" fill="#ffd32a" stroke="#222" stroke-width="2"/>
                    <rect x="62" y="16" width="10" height="10" fill="#ffd32a" stroke="#222" stroke-width="2"/>
                    <polygon points="70,16 78,16 78,24" fill="#fff" stroke="#222" stroke-width="2"/>
                </svg>`;
        }
    } else {
        // Revolver / Gun Skins
        switch (skin.id) {
            case 'gun_frostbite':
                return `<svg viewBox="0 0 100 80" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22 46 Q18 64 26 70 Q34 70 34 56 Z" fill="#f5f6fa" stroke="#70a1ff" stroke-width="2"/>
                    <rect x="28" y="36" width="22" height="18" rx="2" fill="#487eb0" stroke="#70a1ff" stroke-width="2"/>
                    <rect x="42" y="32" width="16" height="18" rx="3" fill="#70a1ff" stroke="#fff" stroke-width="1.5"/>
                    <rect x="58" y="34" width="34" height="8" rx="2" fill="#487eb0" stroke="#70a1ff" stroke-width="2"/>
                    <circle cx="34" cy="42" r="2" fill="#ffffff"/>
                </svg>`;
            case 'gun_inferno':
                return `<svg viewBox="0 0 100 80" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22 46 Q18 64 26 70 Q34 70 34 56 Z" fill="#ff4757" stroke="#2f3542" stroke-width="2"/>
                    <rect x="28" y="34" width="24" height="20" rx="2" fill="#2f3542" stroke="#ff4757" stroke-width="2"/>
                    <rect x="44" y="30" width="18" height="20" rx="3" fill="#ff6348" stroke="#ffa502" stroke-width="2"/>
                    <rect x="60" y="32" width="32" height="12" rx="3" fill="#2f3542" stroke="#ff4757" stroke-width="2"/>
                    <circle cx="36" cy="42" r="2.5" fill="#ffa502"/>
                </svg>`;
            case 'gun_cyberpunk':
                return `<svg viewBox="0 0 100 80" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                    <path d="M24 46 L20 68 L32 70 L34 56 Z" fill="#ff007f" stroke="#00f2fe" stroke-width="1.5"/>
                    <rect x="26" y="34" width="26" height="18" fill="#2d3436" stroke="#ff007f" stroke-width="2"/>
                    <rect x="44" y="30" width="46" height="14" fill="#2d3436" stroke="#00f2fe" stroke-width="2"/>
                    <line x1="50" y1="36" x2="80" y2="36" stroke="#ff007f" stroke-width="2"/>
                </svg>`;
            case 'gun_vampire':
                return `<svg viewBox="0 0 100 80" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22 46 Q18 64 26 70 Q34 70 34 56 Z" fill="#4a0e17" stroke="#c0392b" stroke-width="2"/>
                    <rect x="28" y="36" width="22" height="18" rx="2" fill="#d2d7d9" stroke="#7f8c8d" stroke-width="2"/>
                    <rect x="42" y="32" width="16" height="18" rx="3" fill="#c0392b" stroke="#8b0000" stroke-width="2"/>
                    <rect x="58" y="34" width="34" height="8" rx="2" fill="#d2d7d9" stroke="#7f8c8d" stroke-width="2"/>
                </svg>`;
            case 'gun_set_golden':
                return `<svg viewBox="0 0 100 80" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22 46 Q18 64 26 70 Q34 70 34 56 Z" fill="#2c1810" stroke="#ffd700" stroke-width="2"/>
                    <rect x="28" y="34" width="24" height="20" rx="2" fill="#ffd700" stroke="#ffffff" stroke-width="2"/>
                    <rect x="44" y="30" width="46" height="14" rx="2" fill="#ffd700" stroke="#fff" stroke-width="2"/>
                    <circle cx="34" cy="42" r="2.5" fill="#ffffff"/>
                </svg>`;
            case 'gun_set_hellfire':
                return `<svg viewBox="0 0 100 80" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22 46 Q18 64 26 70 Q34 70 34 56 Z" fill="#ff3838" stroke="#111" stroke-width="2"/>
                    <rect x="28" y="34" width="24" height="20" rx="2" fill="#222" stroke="#ff3838" stroke-width="2"/>
                    <rect x="44" y="32" width="46" height="14" rx="3" fill="#222" stroke="#ff9f1a" stroke-width="2"/>
                    <circle cx="70" cy="38" r="3" fill="#ff3838"/>
                </svg>`;
            case 'gun_set_cyberghost':
                return `<svg viewBox="0 0 100 80" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                    <path d="M24 46 L20 68 L32 70 L34 56 Z" fill="#00f2fe" stroke="#0a192f" stroke-width="2"/>
                    <rect x="26" y="34" width="24" height="18" fill="#0a192f" stroke="#00f2fe" stroke-width="2"/>
                    <rect x="42" y="30" width="48" height="14" fill="#0a192f" stroke="#00f2fe" stroke-width="2"/>
                    <line x1="48" y1="36" x2="80" y2="36" stroke="#00f2fe" stroke-width="2"/>
                </svg>`;
            case 'gun_set_voidgalaxy':
                return `<svg viewBox="0 0 100 80" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22 46 Q18 64 26 70 Q34 70 34 56 Z" fill="#dfbbf7" stroke="#9b59b6" stroke-width="2"/>
                    <rect x="28" y="36" width="22" height="18" rx="2" fill="#1e0c3b" stroke="#9b59b6" stroke-width="2"/>
                    <circle cx="50" cy="40" r="7" fill="#e056fd"/>
                    <rect x="58" y="34" width="34" height="8" rx="2" fill="#1e0c3b" stroke="#9b59b6" stroke-width="2"/>
                </svg>`;
            case 'gun_default':
                return `<svg viewBox="0 0 100 80" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22 46 Q18 64 26 70 Q34 70 34 56 Z" fill="#4a2c17" stroke="#2b180a" stroke-width="2"/>
                    <rect x="28" y="36" width="22" height="18" rx="2" fill="#34495e" stroke="#2c3e50" stroke-width="2"/>
                    <rect x="42" y="32" width="16" height="18" rx="3" fill="#2c3e50" stroke="#1a252f" stroke-width="2"/>
                    <circle cx="48" cy="38" r="1.8" fill="#111"/>
                    <circle cx="48" cy="44" r="1.8" fill="#111"/>
                    <rect x="58" y="34" width="34" height="8" rx="2" fill="#34495e" stroke="#2c3e50" stroke-width="2"/>
                    <polygon points="90,34 94,34 92,31" fill="#2c3e50"/>
                    <path d="M38 54 Q44 60 48 54" fill="none" stroke="#2c3e50" stroke-width="2"/>
                </svg>`;
            case 'gun_common':
                return `<svg viewBox="0 0 100 80" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22 46 Q18 64 26 70 Q34 70 34 56 Z" fill="#3d3025" stroke="#1f1812" stroke-width="2"/>
                    <rect x="28" y="36" width="22" height="18" rx="2" fill="#574b40" stroke="#3d342c" stroke-width="2"/>
                    <rect x="42" y="32" width="16" height="18" rx="3" fill="#846d5a" stroke="#3d342c" stroke-width="2"/>
                    <rect x="58" y="34" width="32" height="8" rx="2" fill="#574b40" stroke="#3d342c" stroke-width="2"/>
                    <circle cx="34" cy="42" r="2" fill="#b8860b"/>
                </svg>`;
            case 'gun_uncommon':
                return `<svg viewBox="0 0 100 80" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22 46 Q18 64 26 70 Q34 70 34 56 Z" fill="#2ed573" stroke="#145a32" stroke-width="2"/>
                    <rect x="28" y="36" width="22" height="18" rx="2" fill="#dfe4ea" stroke="#a4b0be" stroke-width="2"/>
                    <rect x="42" y="32" width="16" height="18" rx="3" fill="#ced6e0" stroke="#747d8c" stroke-width="2"/>
                    <rect x="58" y="34" width="34" height="8" rx="2" fill="#dfe4ea" stroke="#a4b0be" stroke-width="2"/>
                    <line x1="62" y1="32" x2="88" y2="32" stroke="#747d8c" stroke-width="2"/>
                </svg>`;
            case 'gun_rare':
                return `<svg viewBox="0 0 100 80" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <filter id="rare-g-glow"><feGaussianBlur stdDeviation="2"/><feComposite in="SourceGraphic" operator="over"/></filter>
                    </defs>
                    <path d="M22 46 Q18 64 26 70 Q34 70 34 56 Z" fill="#2c3e50" stroke="#1e272e" stroke-width="2"/>
                    <rect x="28" y="36" width="22" height="18" rx="2" fill="#0984e3" stroke="#06528d" stroke-width="2"/>
                    <rect x="42" y="32" width="16" height="18" rx="3" fill="#74b9ff" stroke="#0984e3" stroke-width="2"/>
                    <rect x="58" y="34" width="34" height="8" rx="2" fill="#0984e3" stroke="#06528d" stroke-width="2"/>
                    <rect x="64" y="44" width="14" height="4" fill="#00cec9" filter="url(#rare-g-glow)"/>
                </svg>`;
            case 'gun_epic':
                return `<svg viewBox="0 0 100 80" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <filter id="epic-g-glow"><feGaussianBlur stdDeviation="2.5"/><feComposite in="SourceGraphic" operator="over"/></filter>
                    </defs>
                    <path d="M22 46 Q18 64 26 70 Q34 70 34 56 Z" fill="#2c2c54" stroke="#131326" stroke-width="2"/>
                    <rect x="28" y="36" width="22" height="18" rx="2" fill="#8e44ad" stroke="#5b2c6f" stroke-width="2"/>
                    <rect x="42" y="32" width="16" height="18" rx="3" fill="#be2edd" stroke="#8e44ad" stroke-width="2"/>
                    <rect x="58" y="34" width="34" height="8" rx="2" fill="#8e44ad" stroke="#5b2c6f" stroke-width="2"/>
                    <path d="M60 36 Q68 40 76 36 Q84 40 92 36" fill="none" stroke="#e056fd" stroke-width="1.5" filter="url(#epic-g-glow)"/>
                </svg>`;
            case 'gun_legendary':
                return `<svg viewBox="0 0 100 80" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <filter id="leg-g-glow"><feGaussianBlur stdDeviation="3"/><feComposite in="SourceGraphic" operator="over"/></filter>
                    </defs>
                    <path d="M22 46 Q18 64 26 70 Q34 70 34 56 Z" fill="#ffffff" stroke="#dcdde1" stroke-width="2"/>
                    <polygon points="28,56 30,52 32,56 27,53 33,53" fill="#ffd700"/>
                    <rect x="28" y="36" width="22" height="18" rx="2" fill="#ffd700" stroke="#b7791f" stroke-width="2" filter="url(#leg-g-glow)"/>
                    <rect x="42" y="32" width="16" height="18" rx="3" fill="#fffa65" stroke="#d4af37" stroke-width="2"/>
                    <rect x="58" y="34" width="34" height="8" rx="2" fill="#ffd700" stroke="#b7791f" stroke-width="2" filter="url(#leg-g-glow)"/>
                    <polygon points="90,34 94,34 92,31" fill="#ffd700"/>
                </svg>`;
            case 'gun_cosmic':
                return `<svg viewBox="0 0 100 80" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <filter id="cosmic-g-glow"><feGaussianBlur stdDeviation="3.5"/><feComposite in="SourceGraphic" operator="over"/></filter>
                    </defs>
                    <path d="M22 46 Q18 64 26 70 Q34 70 34 56 Z" fill="#dfbbf7" stroke="#371b58" stroke-width="2"/>
                    <rect x="28" y="36" width="24" height="18" rx="4" fill="#1f0036" stroke="#ff4757" stroke-width="2"/>
                    <circle cx="48" cy="42" r="8" fill="#ff007f" filter="url(#cosmic-g-glow)"/>
                    <rect x="54" y="35" width="36" height="8" rx="3" fill="#371b58" stroke="#ff007f" stroke-width="2"/>
                    <line x1="60" y1="33" x2="60" y2="45" stroke="#ff4757" stroke-width="2.5"/>
                    <line x1="68" y1="33" x2="68" y2="45" stroke="#ff4757" stroke-width="2.5"/>
                    <line x1="76" y1="33" x2="76" y2="45" stroke="#ff4757" stroke-width="2.5"/>
                </svg>`;
            case 'gun_secret':
                return `<svg viewBox="0 0 100 80" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <filter id="secret-g-glow"><feGaussianBlur stdDeviation="3"/><feComposite in="SourceGraphic" operator="over"/></filter>
                    </defs>
                    <path d="M22 46 Q18 64 26 70 Q34 70 34 56 Z" fill="#222f3e" stroke="#0abde3" stroke-width="2"/>
                    <rect x="28" y="36" width="22" height="18" rx="2" fill="#0abde3" stroke="#00d2d3" stroke-width="2" filter="url(#secret-g-glow)"/>
                    <circle cx="48" cy="42" r="5" fill="#00f2fe" filter="url(#secret-g-glow)"/>
                    <rect x="56" y="35" width="34" height="8" rx="2" fill="#0abde3" stroke="#00d2d3" stroke-width="2"/>
                </svg>`;
            case 'gun_og':
            default:
                return `<svg viewBox="0 0 100 80" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                    <rect x="22" y="48" width="8" height="16" fill="#ff9f43" stroke="#222" stroke-width="2"/>
                    <rect x="30" y="38" width="18" height="16" fill="#ff3838" stroke="#222" stroke-width="2"/>
                    <rect x="44" y="36" width="10" height="12" fill="#ffd32a" stroke="#222" stroke-width="2"/>
                    <rect x="54" y="38" width="30" height="8" fill="#ff3838" stroke="#222" stroke-width="2"/>
                    <rect x="84" y="36" width="6" height="12" fill="#ffd32a" stroke="#222" stroke-width="2"/>
                </svg>`;
        }
    }
}