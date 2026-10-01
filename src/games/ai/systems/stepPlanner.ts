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

        // Tycoon
        if (theme === 'tycoon') {
            return [
                { id: 'step-ty1', title: 'Loo tehase põrand ja seinad', description: 'Tööstushoone ja tootmisala paigutus.', status: 'pending', actionType: 'create_terrain' },
                { id: 'step-ty2', title: 'Paigalda PBX Dropper ja konveier', description: 'Tootmismasin ja automaatne liin.', status: 'pending', actionType: 'spawn_dropper' },
                { id: 'step-ty3', title: 'Loo kassapunkt ja raha kogunemine', description: 'Valuuta kogumise süsteem ja vault.', status: 'pending', actionType: 'setup_economy' },
                { id: 'step-ty4', title: 'Lisa ostuplatvormid ja upgrade nupud', description: 'Laienduste ostmise loogika.', status: 'pending', actionType: 'setup_upgrades' },
                { id: 'step-ty5', title: 'Automaatkontroll ja testimine', description: 'Kontrollitakse tootmistsüklit ja rahavoogu.', status: 'pending', actionType: 'verify' },
                { id: 'step-ty6', title: 'Esitle valmis Tycoon mängu', description: 'Mängu esitlemine ja käivitamine.', status: 'pending', actionType: 'present' }
            ];
        }

        // Simulator
        if (theme === 'simulator') {
            return [
                { id: 'step-sim1', title: 'Loo treeningkeskus ja areen', description: 'Spordisaali ja areeni põrand ja valgustus.', status: 'pending', actionType: 'create_terrain' },
                { id: 'step-sim2', title: 'Lisa treeningtööriist ja animatsioon', description: 'Klikkerimehaanika ja jõu kasvatamine.', status: 'pending', actionType: 'setup_training' },
                { id: 'step-sim3', title: 'Loo müügitsoon ja konversioon', description: 'Jõu vahetamine PlayBuxi müntideks.', status: 'pending', actionType: 'setup_sell' },
                { id: 'step-sim4', title: 'Seadista Rebirth portaal', description: 'Kordistite ja uute tsoonide süsteem.', status: 'pending', actionType: 'setup_rebirth' },
                { id: 'step-sim5', title: 'Automaatkontroll ja edetabel', description: 'Valideeritakse kasvu ja edetabelit.', status: 'pending', actionType: 'verify' },
                { id: 'step-sim6', title: 'Esitle valmis Simulaatorit', description: 'Kuvatakse mängija treeningareen.', status: 'pending', actionType: 'present' }
            ];
        }

        // Racing
        if (theme === 'racing') {
            return [
                { id: 'step-rc1', title: 'Loo ringrada ja stardivärav', description: 'Asfaltrada ja stardijoon koos taimeriga.', status: 'pending', actionType: 'create_track' },
                { id: 'step-rc2', title: 'Ehita Playard sportauto', description: 'Sõiduki 3D kere ja juhtimissüsteem.', status: 'pending', actionType: 'spawn_car' },
                { id: 'step-rc3', title: 'Paiguta kontrollpunktid (Checkpoints)', description: 'Ringiaegade mõõtmine ja pettusevastane süsteem.', status: 'pending', actionType: 'setup_checkpoints' },
                { id: 'step-rc4', title: 'Lisa nitro- ja kiirenduspadjad', description: 'Boost-tsoonid ja kiirusefektid.', status: 'pending', actionType: 'setup_boosters' },
                { id: 'step-rc5', title: 'Testi auto füüsikat ja ringiaega', description: 'Automaatne sõidu ja kokkupõrketest.', status: 'pending', actionType: 'verify' },
                { id: 'step-rc6', title: 'Esitle võidusõidumängu', description: 'Võistlusrada on stardivalmis!', status: 'pending', actionType: 'present' }
            ];
        }

        // Survival
        if (theme === 'survival') {
            return [
                { id: 'step-sv1', title: 'Loo metsik loodusmaastik', description: 'Mets, kivid ja öine atmosfäär.', status: 'pending', actionType: 'create_wilderness' },
                { id: 'step-sv2', title: 'Paigalda elupäästev lõke ja varjend', description: 'Soojuse ja turvatsooni seadistamine.', status: 'pending', actionType: 'setup_shelter' },
                { id: 'step-sv3', title: 'Loo ressursikorje (puit ja kivi)', description: 'Toorainete kogumise ja inventari süsteem.', status: 'pending', actionType: 'setup_resources' },
                { id: 'step-sv4', title: 'Lisa öised vaenlased (AI patroll)', description: 'Mängijat ründav tehisintellekt.', status: 'pending', actionType: 'spawn_monsters' },
                { id: 'step-sv5', title: 'Testi tervise ja nälja tsüklit', description: 'Ellujäämismehaanika kontroll.', status: 'pending', actionType: 'verify' },
                { id: 'step-sv6', title: 'Esitle ellujäämismängu', description: 'Öö algab – ela üle!', status: 'pending', actionType: 'present' }
            ];
        }

        // Horror
        if (theme === 'horror') {
            return [
                { id: 'step-hr1', title: 'Loo pime mahajäetud kompleks', description: 'Tume keskkond, tihe udu ja kõhedus.', status: 'pending', actionType: 'create_horror_env' },
                { id: 'step-hr2', title: 'Anna mängijale vilkuv taskulamp', description: 'Patareiga valgusallikas ja pimedusefekt.', status: 'pending', actionType: 'setup_flashlight' },
                { id: 'step-hr3', title: 'Peida kaitsmed ja mõistatuse osad', description: 'Generaatori parandamise juhtlõngad.', status: 'pending', actionType: 'setup_puzzle_items' },
                { id: 'step-hr4', title: 'Loo varjudes luurav koletis (Stalker)', description: 'Heli peale reageeriv vaenlane.', status: 'pending', actionType: 'spawn_stalker' },
                { id: 'step-hr5', title: 'Kontrolli hirmumõõdikut ja helisid', description: 'Atmosfääri ja põgenemistee test.', status: 'pending', actionType: 'verify' },
                { id: 'step-hr6', title: 'Esitle õudusmängu', description: 'Põgene enne kui taskulamp kustub!', status: 'pending', actionType: 'present' }
            ];
        }

        // Tower Defense
        if (theme === 'tower_defense') {
            return [
                { id: 'step-td1', title: 'Loo lahinguväli ja vaenlaste rada', description: 'Teekond alguspunktist baasini.', status: 'pending', actionType: 'create_td_map' },
                { id: 'step-td2', title: 'Paigalda baasikristall', description: 'Kaitstava objekti elud ja indikaator.', status: 'pending', actionType: 'setup_base' },
                { id: 'step-td3', title: 'Loo kaitsetornide ehitusplatvormid', description: 'Laser- ja suurtornide paigutamine.', status: 'pending', actionType: 'setup_turret_pads' },
                { id: 'step-td4', title: 'Seadista vaenlaste lained ja spawning', description: 'Rünnakulained ja kiirused.', status: 'pending', actionType: 'setup_waves' },
                { id: 'step-td5', title: 'Testi laskmismehaanikat ja tabamusi', description: 'Tornide laskeulatuse ja kahju test.', status: 'pending', actionType: 'verify' },
                { id: 'step-td6', title: 'Esitle tornikaitse mängu', description: 'Kaitse oma baasi!', status: 'pending', actionType: 'present' }
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
