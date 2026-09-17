import { StageDef, PlatformDef, StageTheme } from './types';

export function generate50Stages(): StageDef[] {
    const stages: StageDef[] = [];
    const STAGE_SPACING_Z = 30; // 30 meters between stage checkpoints along Z axis

    for (let i = 1; i <= 50; i++) {
        const stageZ = (i - 1) * STAGE_SPACING_Z;
        let theme: StageTheme = 'neon';
        let stageTitle = `Stage ${i}`;
        const platforms: PlatformDef[] = [];

        if (i <= 10) {
            theme = 'neon';
            stageTitle = `Neon Horizon ${i}`;
        } else if (i <= 20) {
            theme = 'glass';
            stageTitle = `Cyber Skyway ${i}`;
        } else if (i <= 30) {
            theme = 'lava';
            stageTitle = `Molten Core ${i}`;
        } else if (i <= 40) {
            theme = 'sky';
            stageTitle = `Celestial Pinnacle ${i}`;
        } else if (i <= 49) {
            theme = 'royal';
            stageTitle = `Monarch Gauntlet ${i}`;
        } else {
            theme = 'royal';
            stageTitle = `The Royal Throne`;
        }

        const spawnPos = { x: 0, y: 0.5 + (i - 1) * 1.2, z: stageZ };

        // Checkpoint platform
        platforms.push({
            x: 0,
            y: (i - 1) * 1.2,
            z: stageZ,
            width: 8,
            height: 1,
            depth: 8,
            color: i === 50 ? '#ffd700' : (i % 5 === 0 ? '#00f2fe' : '#2ecc71')
        });

        // Obstacles inside stage (between current checkpoint and next)
        if (i < 50) {
            const nextBaseY = i * 1.2;
            const baseY = (i - 1) * 1.2;
            const stepZ = STAGE_SPACING_Z / 5;

            // Step 1
            platforms.push({
                x: (i % 2 === 0 ? -2.5 : 2.5),
                y: baseY + 0.3,
                z: stageZ + stepZ * 1,
                width: 3,
                height: 0.8,
                depth: 3,
                color: theme === 'lava' ? '#e74c3c' : (theme === 'glass' ? '#00d2d3' : '#3498db'),
                shape: i % 3 === 0 ? 'cylinder' : 'box'
            });

            // Step 2 (Hazard or moving)
            if (i >= 5) {
                // Hazard bar between steps
                platforms.push({
                    x: 0,
                    y: baseY + 0.6,
                    z: stageZ + stepZ * 1.5,
                    width: 6,
                    height: 0.3,
                    depth: 0.3,
                    color: '#ff4757',
                    isHazard: true,
                    hazardType: theme === 'lava' ? 'lava' : 'laser'
                });
            }

            // Step 3
            platforms.push({
                x: (i % 2 === 0 ? 3 : -3),
                y: baseY + 0.6,
                z: stageZ + stepZ * 2,
                width: 3.2,
                height: 0.8,
                depth: 3.2,
                color: theme === 'royal' ? '#f1c40f' : (theme === 'lava' ? '#e67e22' : '#9b59b6'),
                isMoving: i % 4 === 0,
                moveAxis: 'x',
                moveDist: 3,
                moveSpeed: 2
            });

            // Step 4
            platforms.push({
                x: 0,
                y: baseY + 0.9,
                z: stageZ + stepZ * 3,
                width: 3,
                height: 0.8,
                depth: 3,
                color: theme === 'sky' ? '#74b9ff' : '#1abc9c',
                shape: i % 2 === 0 ? 'cylinder' : 'box'
            });

            // Step 5 (Approach to next checkpoint)
            platforms.push({
                x: (i % 2 === 0 ? -1.5 : 1.5),
                y: nextBaseY,
                z: stageZ + stepZ * 4,
                width: 3.5,
                height: 0.8,
                depth: 3.5,
                color: '#ffd700'
            });
        } else {
            // Stage 50: The Grand Royal Summit & Throne Room
            // Grand central hall
            platforms.push({
                x: 0,
                y: 49 * 1.2,
                z: stageZ + 15,
                width: 24,
                height: 2,
                depth: 24,
                color: '#ffd700'
            });

            // Royal Pedestal for the 24K Crown
            platforms.push({
                x: 0,
                y: 49 * 1.2 + 2,
                z: stageZ + 18,
                width: 4,
                height: 2,
                depth: 4,
                color: '#ffffff',
                shape: 'cylinder'
            });
        }

        stages.push({
            stageNumber: i,
            theme,
            title: stageTitle,
            spawnPos,
            platforms,
            isFinalStage: i === 50
        });
    }

    return stages;
}

export const CROWN_STAGES: StageDef[] = generate50Stages();
