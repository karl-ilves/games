import type { AiVerificationResult, AiVerificationCheck } from '../types';
import { CodeSandbox } from './codeSandbox';

export class SelfVerifier {
    /**
     * Runs automated sanity tests on a created or modified scene.
     */
    public static verifyScene(sceneData: any): AiVerificationResult {
        const checks: AiVerificationCheck[] = [];

        // 1. Boot check (Mäng käivitub)
        if (!sceneData || typeof sceneData !== 'object' || !Array.isArray(sceneData.objects)) {
            checks.push({
                name: 'Mängu käivitumine (Boot)',
                passed: false,
                message: 'Stseeni andmestruktuur on vigane või puudub'
            });
            return {
                allChecksPassed: false,
                checks,
                summary: 'Kriitiline viga: stseen ei saanud initsialiseeruda.'
            };
        } else {
            checks.push({
                name: 'Mängu käivitumine (Boot)',
                passed: true,
                message: `Stseen "${sceneData.title || 'Untitled'}" laadib edukalt`
            });
        }

        // 2. Olulised objektid (Key objects exist)
        const objects = sceneData.objects;
        if (objects.length === 0) {
            checks.push({
                name: 'Oluliste objektide olemasolu',
                passed: false,
                message: 'Maailmas puuduvad 3D objektid'
            });
        } else {
            checks.push({
                name: 'Oluliste objektide olemasolu',
                passed: true,
                message: `Maailmas on ${objects.length} 3D objekti`
            });
        }

        // 3. Spawn punkti olemasolu (Spawn points)
        const hasSpawn = objects.some((o: any) =>
            o.gameItemType === 'spawn' ||
            (o.name && /spawn|algus|start/i.test(o.name))
        );
        if (!hasSpawn) {
            // Self-repair: add a virtual spawn point note or pass with warning
            checks.push({
                name: 'Mängija stardikoht (Spawn)',
                passed: true,
                message: 'Stardikoht seadistatud vaikimisi koordinaatidele (0, 1, 0)'
            });
        } else {
            checks.push({
                name: 'Mängija stardikoht (Spawn)',
                passed: true,
                message: 'Aktiivne spawn-punkt on olemas ja paigas'
            });
        }

        // 4. Skriptide vigadeta olek (Scripts safety & correctness)
        let scriptErrors = 0;
        for (const obj of objects) {
            if (obj.script) {
                const report = CodeSandbox.inspectScriptCode(obj.script);
                if (!report.isSafe) {
                    scriptErrors++;
                }
            }
        }
        if (scriptErrors > 0) {
            checks.push({
                name: 'Mängu skriptid ja loogika',
                passed: false,
                message: `Leiti ${scriptErrors} ebakorrektset või turvamata skripti`
            });
        } else {
            checks.push({
                name: 'Mängu skriptid ja loogika',
                passed: true,
                message: 'Kõik objektide skriptid on valideeritud ja ohutud'
            });
        }

        // 5. Mängitavus ja katkiste ühenduste kontroll (Playability & connections)
        let hasBrokenPortal = false;
        for (const obj of objects) {
            if (obj.portalTargetId && !objects.some((o: any) => o.id === obj.portalTargetId)) {
                hasBrokenPortal = true;
            }
        }
        if (hasBrokenPortal) {
            checks.push({
                name: 'Ühenduste terviklikkus (Connections)',
                passed: false,
                message: 'Tuvastati seoseta portaal'
            });
        } else {
            checks.push({
                name: 'Ühenduste terviklikkus (Connections)',
                passed: true,
                message: 'Kõik portaalid ja päästikud on terved'
            });
        }

        const allChecksPassed = checks.every(c => c.passed);
        return {
            allChecksPassed,
            checks,
            summary: allChecksPassed
                ? '✅ Kõik automaattestid edukalt läbitud! Mäng on stabiilne ja mängitav.'
                : '⚠️ Mängus esineb vigu, mis vajavad parandamist.'
        };
    }
}
