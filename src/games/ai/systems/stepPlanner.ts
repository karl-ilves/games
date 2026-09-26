import type { AiBuildStep } from '../types';
import type { ParsedCommand } from './conversationEngine';

export class StepPlanner {
    /**
     * Generates a visible, discrete breakdown of steps based on the parsed command.
     */
    public static planSteps(command: ParsedCommand): AiBuildStep[] {
        if (command.intent === 'SECURITY_VIOLATION') {
            return [
                {
                    id: 'step-sec-reject',
                    title: 'Turvakontroll ja blokeerimine',
                    description: 'Tuvastati ohtlik käsk. Tegevus on turvakaalutlustel peatatud.',
                    status: 'failed',
                    actionType: 'security_block'
                }
            ];
        }

        if (command.intent === 'CLARIFICATION_NEEDED') {
            return [
                {
                    id: 'step-clarify',
                    title: 'Täpsustuse küsimine',
                    description: command.clarificationQuestion || 'Käsk vajab täpsustust enne teostamist.',
                    status: 'in_progress',
                    actionType: 'clarify'
                }
            ];
        }

        const theme = command.parameters?.theme;

        // "Tee mäng, kus mängija peab tornaado eest põgenema"
        if (theme === 'tornado_escape') {
            return [
                {
                    id: 'step-t1',
                    title: 'Loo maastik ja varjendid',
                    description: 'Genereeritakse maastik majade, varjendite ja turvatsooniga.',
                    status: 'pending',
                    actionType: 'generate_terrain'
                },
                {
                    id: 'step-t2',
                    title: 'Loo tornaado füüsika ja osakesed',
                    description: 'Lisatakse ringiliikuv pöörisefektiga tornaado ohuobjekt.',
                    status: 'pending',
                    actionType: 'spawn_tornado'
                },
                {
                    id: 'step-t3',
                    title: 'Määra mängija spawn ja liikumiskiirus',
                    description: 'Paigutatakse alguspunkt ning seatakse mängija jooksukiirus.',
                    status: 'pending',
                    actionType: 'setup_player'
                },
                {
                    id: 'step-t4',
                    title: 'Loo ellujäämise taimer ja GUI',
                    description: 'Lisatakse ekraanile ellujäämise taimer ja põgenemise suunaviit.',
                    status: 'pending',
                    actionType: 'setup_gui'
                },
                {
                    id: 'step-t5',
                    title: 'Automaatne testimine (Self-Verification)',
                    description: 'Kontrollitakse mängitavust, skripte ja stabiilsust.',
                    status: 'pending',
                    actionType: 'verify'
                },
                {
                    id: 'step-t6',
                    title: 'Esitle mängu kasutajale',
                    description: 'Mängu 3D vaade on valmis ja testitav.',
                    status: 'pending',
                    actionType: 'present'
                }
            ];
        }

        // "Loo lennumäng" / "Lennujaama Simulaator"
        if (theme === 'flight_simulator') {
            return [
                {
                    id: 'step-f1',
                    title: 'Loo lennujaam',
                    description: 'Ehitab stardiraja, terminalihoone ja angaari.',
                    status: 'pending',
                    actionType: 'create_airport'
                },
                {
                    id: 'step-f2',
                    title: 'Loo lennuk',
                    description: 'Ehitab 3D lennukimudeli koos tiibade ja propelleriga.',
                    status: 'pending',
                    actionType: 'create_airplane'
                },
                {
                    id: 'step-f3',
                    title: 'Loo mängija stardikoht',
                    description: 'Paigutab lennujaama stardiraja algusesse spawn-punkti.',
                    status: 'pending',
                    actionType: 'create_spawn'
                },
                {
                    id: 'step-f4',
                    title: 'Lisa lennuki juhtimine',
                    description: 'Aktiveerib Playard lennufüüsika ja kiiruse regulaatorid.',
                    status: 'pending',
                    actionType: 'attach_controls'
                },
                {
                    id: 'step-f5',
                    title: 'Loo maandumisala',
                    description: 'Paigutab saarele teise lennuraja ja maandumismajaka.',
                    status: 'pending',
                    actionType: 'create_landing_zone'
                },
                {
                    id: 'step-f6',
                    title: 'Testi mängu',
                    description: 'Kontrollib automaatselt lennuki tõmmet ja objekte.',
                    status: 'pending',
                    actionType: 'verify'
                },
                {
                    id: 'step-f7',
                    title: 'Esitle kasutajale',
                    description: 'Valmis 3D lennusimulaatori kuvamine eelvaates.',
                    status: 'pending',
                    actionType: 'present'
                }
            ];
        }

        // Obby parkour
        if (theme === 'obby_adventure') {
            return [
                {
                    id: 'step-o1',
                    title: 'Loo stardiplatvorm ja spawn',
                    description: 'Algusala paigutus ja turvatsoon.',
                    status: 'pending',
                    actionType: 'create_spawn'
                },
                {
                    id: 'step-o2',
                    title: 'Genereeri hüppeplatvormid',
                    description: 'Erinevatel kõrgustel ujuvad platvormid ja liikuvad klotsid.',
                    status: 'pending',
                    actionType: 'create_platforms'
                },
                {
                    id: 'step-o3',
                    title: 'Lisa ohuobjektid ja laavapind',
                    description: 'Allakukkumise laavatsoon ja respawn reeglid.',
                    status: 'pending',
                    actionType: 'setup_hazards'
                },
                {
                    id: 'step-o4',
                    title: 'Loo finiš ja autasustamine',
                    description: 'Võidupost, pärg ja PlayCoins preemia.',
                    status: 'pending',
                    actionType: 'setup_finish'
                },
                {
                    id: 'step-o5',
                    title: 'Automaatne testimine',
                    description: 'Radade ja päästikute terviklikkuse kontroll.',
                    status: 'pending',
                    actionType: 'verify'
                },
                {
                    id: 'step-o6',
                    title: 'Esitle kasutajale',
                    description: 'Valmis parkuuriraja aktiveerimine.',
                    status: 'pending',
                    actionType: 'present'
                }
            ];
        }

        // Incremental modifications
        if (command.intent === 'MODIFY_OBJECT') {
            return [
                {
                    id: 'step-m1',
                    title: `Tuvasta sihtmärk (${command.actionTarget || 'objekt'})`,
                    description: 'Otsitakse stseenist vastavat 3D mudelit.',
                    status: 'pending',
                    actionType: 'find_target'
                },
                {
                    id: 'step-m2',
                    title: 'Rakenda parameetrite muudatus',
                    description: `Suurendatakse mõõtmeid koefitsiendiga ${command.parameters?.factor || 1.5}x.`,
                    status: 'pending',
                    actionType: 'apply_transform'
                },
                {
                    id: 'step-m3',
                    title: 'Kontrolli stseeni terviklikkust',
                    description: 'Veendutakse, et objekt ei põrku ega tekita vigu.',
                    status: 'pending',
                    actionType: 'verify'
                }
            ];
        }

        if (command.intent === 'ADD_FEATURE') {
            return [
                {
                    id: 'step-a1',
                    title: `Genereeri ${command.parameters?.name || command.actionTarget || 'uus element'}`,
                    description: 'Luuakse vajalik 3D geomeetria ja skriptid.',
                    status: 'pending',
                    actionType: 'generate_feature'
                },
                {
                    id: 'step-a2',
                    title: 'Integreeri maailma koordinaatidele',
                    description: 'Paigutatakse vabale pinnale stseenis.',
                    status: 'pending',
                    actionType: 'place_in_world'
                },
                {
                    id: 'step-a3',
                    title: 'Kinnita ja testi toimivust',
                    description: 'Käivitatakse automaatsed sanity testid.',
                    status: 'pending',
                    actionType: 'verify'
                }
            ];
        }

        if (command.intent === 'CHANGE_ENVIRONMENT') {
            return [
                {
                    id: 'step-e1',
                    title: `Muuda keskkonna valgustust ja taevast (${command.parameters?.skyMode || 'custom'})`,
                    description: 'Reguleeritakse taevavärvi, udu ja valgusallikaid.',
                    status: 'pending',
                    actionType: 'update_sky'
                },
                {
                    id: 'step-e2',
                    title: 'Uuenda varjud ja peegeldused',
                    description: 'Kalkuleeritakse 3D stseeni valgustus uuesti.',
                    status: 'pending',
                    actionType: 'verify'
                }
            ];
        }

        if (command.intent === 'UPDATE_GAME_RULES') {
            return [
                {
                    id: 'step-r1',
                    title: 'Valideeri mängureegel ja turvalisus',
                    description: 'Kontrollitakse parameetrite limiite Playard turvareeglite alusel.',
                    status: 'pending',
                    actionType: 'security_check'
                },
                {
                    id: 'step-r2',
                    title: 'Rakenda mängija konfiguratsioon',
                    description: `Uuendatakse reeglit: ${command.actionTarget}.`,
                    status: 'pending',
                    actionType: 'update_rules'
                }
            ];
        }

        // Generic fallback steps
        return [
            {
                id: 'step-g1',
                title: 'Käsu analüüs',
                description: 'Töödeldakse sisendit.',
                status: 'completed',
                actionType: 'analyze'
            },
            {
                id: 'step-g2',
                title: 'Stseeni sünkroonimine',
                description: 'Uuendatakse stseeni andmeid.',
                status: 'pending',
                actionType: 'sync'
            }
        ];
    }
}
