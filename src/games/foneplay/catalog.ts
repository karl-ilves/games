import { FoneVariant } from './types';

export const FONE_VARIANTS: FoneVariant[] = [
    {
        id: 1,
        title: 'Valik 1 · Klassikaline Manööver',
        subtitle: 'Edasi ➔ Taha ➔ Hüpe ➔ Pööre',
        color: '#00f2fe',
        description: 'Põhiliigutuste kombinatsioon: Liigu 2 sek edasi, siis 2 sek tagasi, tee kõrge hüpe ja soorita 360° pööre!',
        theme: 'cyber',
        steps: [
            {
                id: 'v1_step1',
                name: '1. Move Forward (Edasi)',
                instruction: 'Liigu edasi (2 sekundit)',
                action: 'forward',
                durationSeconds: 2.0,
                color: '#00f2fe'
            },
            {
                id: 'v1_step2',
                name: '2. Move Backward (Taha)',
                instruction: 'Liigu tagasi (2 sekundit)',
                action: 'backward',
                durationSeconds: 2.0,
                color: '#ffd32a'
            },
            {
                id: 'v1_step3',
                name: '3. Jump (Hüppa)',
                instruction: 'Soorita vägev hüpe õhku!',
                action: 'jump',
                durationSeconds: 1.5,
                color: '#2ecc71'
            },
            {
                id: 'v1_step4',
                name: '4. Turn (Pööra)',
                instruction: 'Pööra tegelane täispöördega ringi!',
                action: 'spin',
                durationSeconds: 2.0,
                color: '#e056fd'
            }
        ]
    },
    {
        id: 2,
        title: 'Valik 2 · Turbo Slaalom',
        subtitle: 'Hüpped ➔ Vasak pööre ➔ Parem pööre ➔ Turbo sööst',
        color: '#ff4757',
        description: 'Kiiruslik slaalom: tee topelt hüpe üle takistuste, pööra vasakule, siis paremale ja anna täisturbol sööst edasi!',
        theme: 'lava',
        steps: [
            {
                id: 'v2_step1',
                name: '1. Double Jump (Topelt Hüpe)',
                instruction: 'Hüppa üle elektrooniliste barjääride!',
                action: 'jump',
                durationSeconds: 1.6,
                color: '#ff4757'
            },
            {
                id: 'v2_step2',
                name: '2. Turn Left (Pööra Vasakule)',
                instruction: 'Pööra 90 kraadi vasakule!',
                action: 'turn_left',
                durationSeconds: 1.8,
                color: '#38bdf8'
            },
            {
                id: 'v2_step3',
                name: '3. Turn Right (Pööra Paremale)',
                instruction: 'Pööra 90 kraadi paremale teravas kurvis!',
                action: 'turn_right',
                durationSeconds: 1.8,
                color: '#2ed573'
            },
            {
                id: 'v2_step4',
                name: '4. Turbo Dash (Turbo Sööst)',
                instruction: 'Anna maksimaalne nitro-sööst otse edasi!',
                action: 'dash',
                durationSeconds: 2.2,
                color: '#ffa502'
            }
        ]
    },
    {
        id: 3,
        title: 'Valik 3 · Akrobaatiline 360 Parkour',
        subtitle: '360° Pööre ➔ Hüpe tagasi ➔ Siksak sprint ➔ Superhüpe',
        color: '#a855f7',
        description: 'Rütmiline akrobaatika: Pööra 360°, hüppa tagurpidi, liigu edasi-tagasi ja lõpeta superhüppega poodiumile!',
        theme: 'neon',
        steps: [
            {
                id: 'v3_step1',
                name: '1. Acrobatic Spin (360° Pööre)',
                instruction: 'Tee akrobaatiline 360° täispööre!',
                action: 'spin',
                durationSeconds: 2.0,
                color: '#a855f7'
            },
            {
                id: 'v3_step2',
                name: '2. Backward Evasion (Tagurpidi põige)',
                instruction: 'Hüppa ja tõmbu tagasi ohu eest!',
                action: 'backward',
                durationSeconds: 2.0,
                color: '#ff6b81'
            },
            {
                id: 'v3_step3',
                name: '3. Precision Forward Rush (Täppis-sööst)',
                instruction: 'Liigu edasi läbi kitsa tunneli!',
                action: 'forward',
                durationSeconds: 2.0,
                color: '#1dd1a1'
            },
            {
                id: 'v3_step4',
                name: '4. Super Apex Jump (Superhüpe)',
                instruction: 'Lenda superhüppega poodiumi tippu!',
                action: 'jump',
                durationSeconds: 1.8,
                color: '#5f27cd'
            }
        ]
    }
];
