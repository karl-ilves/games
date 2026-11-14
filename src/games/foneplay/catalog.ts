import { FoneVariant } from './types';

export const FONE_VARIANTS: FoneVariant[] = [
    {
        id: 1,
        title: 'Option 1 · Classic Maneuver',
        subtitle: 'Forward ➔ Backward ➔ Jump ➔ Turn',
        color: '#00f2fe',
        description: 'Core manual motion combination: Move forward for 2s, then backward for 2s, perform a high jump, and turn 360°!',
        theme: 'cyber',
        steps: [
            {
                id: 'v1_step1',
                name: '1. Move Forward',
                instruction: 'Push joystick UP to move forward (hold for 2.0s)',
                action: 'forward',
                durationSeconds: 2.0,
                color: '#00f2fe'
            },
            {
                id: 'v1_step2',
                name: '2. Move Backward',
                instruction: 'Pull joystick DOWN to move backward (hold for 2.0s)',
                action: 'backward',
                durationSeconds: 2.0,
                color: '#ffd32a'
            },
            {
                id: 'v1_step3',
                name: '3. Jump',
                instruction: 'Tap the Jump button to leap into the air!',
                action: 'jump',
                durationSeconds: 1.5,
                color: '#2ecc71'
            },
            {
                id: 'v1_step4',
                name: '4. Turn Around',
                instruction: 'Steer joystick LEFT or RIGHT to turn around (hold for 2.0s)',
                action: 'spin',
                durationSeconds: 2.0,
                color: '#e056fd'
            }
        ]
    },
    {
        id: 2,
        title: 'Option 2 · Turbo Slalom',
        subtitle: 'Jump ➔ Turn Left ➔ Turn Right ➔ Rush Forward',
        color: '#ff4757',
        description: 'Agile slalom handling: jump over obstacles, turn left, turn right, and sprint forward!',
        theme: 'lava',
        steps: [
            {
                id: 'v2_step1',
                name: '1. Jump Over Barrier',
                instruction: 'Tap the Jump button to clear the barrier!',
                action: 'jump',
                durationSeconds: 1.5,
                color: '#ff4757'
            },
            {
                id: 'v2_step2',
                name: '2. Steer Left',
                instruction: 'Steer joystick LEFT into the turn (hold for 1.8s)',
                action: 'turn_left',
                durationSeconds: 1.8,
                color: '#38bdf8'
            },
            {
                id: 'v2_step3',
                name: '3. Steer Right',
                instruction: 'Steer joystick RIGHT through the curve (hold for 1.8s)',
                action: 'turn_right',
                durationSeconds: 1.8,
                color: '#2ed573'
            },
            {
                id: 'v2_step4',
                name: '4. Sprint Forward',
                instruction: 'Push joystick UP to sprint forward (hold for 2.0s)',
                action: 'forward',
                durationSeconds: 2.0,
                color: '#ffa502'
            }
        ]
    },
    {
        id: 3,
        title: 'Option 3 · Acrobatic Parkour',
        subtitle: 'Turn Around ➔ Evade Backward ➔ Forward Rush ➔ Apex Jump',
        color: '#a855f7',
        description: 'Dynamic manual parkour: perform a 360° spin, backstep evasion, rapid forward rush, and apex leap!',
        theme: 'neon',
        steps: [
            {
                id: 'v3_step1',
                name: '1. Spin 360°',
                instruction: 'Steer joystick to rotate 360 degrees (hold for 2.0s)',
                action: 'spin',
                durationSeconds: 2.0,
                color: '#a855f7'
            },
            {
                id: 'v3_step2',
                name: '2. Evade Backward',
                instruction: 'Pull joystick DOWN to backstep (hold for 2.0s)',
                action: 'backward',
                durationSeconds: 2.0,
                color: '#ff6b81'
            },
            {
                id: 'v3_step3',
                name: '3. Forward Rush',
                instruction: 'Push joystick UP to sprint through the corridor (hold for 2.0s)',
                action: 'forward',
                durationSeconds: 2.0,
                color: '#1dd1a1'
            },
            {
                id: 'v3_step4',
                name: '4. Apex Jump',
                instruction: 'Tap Jump to reach the apex platform!',
                action: 'jump',
                durationSeconds: 1.5,
                color: '#5f27cd'
            }
        ]
    }
];
