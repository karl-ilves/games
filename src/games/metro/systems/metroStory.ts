import * as THREE from 'three';
import { MetroInteractions } from './metroInteractions';
import { DirectionBranch } from '../types';
import { metroAudio } from '../audio';

export class MetroStory extends MetroInteractions {
    public submergeInSewerWater() {
        this.sewerWaterSubmerged = true;
        this.playerPos.y = 0.5; // low in water
        const overlay = document.getElementById('water-submerge-overlay');
        if (overlay) overlay.style.display = 'block';
    }

    public emergeFromSewerWater() {
        this.sewerWaterSubmerged = false;
        this.playerPos.y = 1.6;
        const overlay = document.getElementById('water-submerge-overlay');
        if (overlay) overlay.style.display = 'none';
        const canvas = this.renderer.domElement;
        if (canvas) canvas.style.filter = '';
    }

    public triggerVictory300() {
        if (this.carriage300ExitTriggered) return;
        this.carriage300ExitTriggered = true;
        this.state = 'dead'; // disable controls

        // Give +1000 PlayCoins to player (no Playbux earned in games)
        try {
            yardService.addPlayCoins(1000, 'Metro 200 Väljapääs');
        } catch (e) {}

        const victoryModal = document.getElementById('victory-300-modal');
        if (victoryModal) victoryModal.style.display = 'flex';
        this.updateCursorState();
    }

    public triggerVictory200() {
        this.triggerVictory300();
    }

    public loadCarriage(index: number, branch: DirectionBranch) {
        console.log(`🚇 Loading Carriage ${index} (Branch: ${branch})`);
        const prevIndex = this.currentCarIndex;
        this.currentCarIndex = index;
        this.totalCarriagesExplored++;
        if (branch !== 'undecided') this.branchDirection = branch;

        // Coins are now earned only from 3D pickups, not automatic door crossing

        // Stop or start Golden Shop calming music on transition
        if (prevIndex === 100 && index !== 100) {
            metroAudio.stopShopMusic();
        } else if (index === 100) {
            metroAudio.playShopMusic();
            try {
                localStorage.setItem('last_metro_checkpoint', JSON.stringify({
                    carriage: 100,
                    coins: this.coins,
                    inventory: this.inventory
                }));
            } catch (e) {}
        }

        // Vagun 200 Music Track & Time Villain immunity
        if (prevIndex === 200 && index !== 200) {
            this.carriage200CutsceneTimers.forEach(t => { clearInterval(t); clearTimeout(t); });
            this.carriage200CutsceneTimers = [];
            if (this.carriage200ExitArrows) {
                this.carriage200ExitArrows.forEach(a => this.scene.remove(a));
                this.carriage200ExitArrows = [];
            }
        } else if (index === 200) {
            this.carriage200CutsceneTimers.forEach(t => { clearInterval(t); clearTimeout(t); });
            this.carriage200CutsceneTimers = [];
            this.station200SwitchesDone = false;
            this.station200Departing = false;
            this.carriage300ExitTriggered = false;
            if (this.carriage200ExitArrows) {
                this.carriage200ExitArrows.forEach(a => this.scene.remove(a));
                this.carriage200ExitArrows = [];
            }
            metroAudio.playCarriage200Music();
            this.deactivateTimeVillain();
        }

        // Cleanly dispose and remove previous carriage to free GPU memory
        if (this.currentCarriage) {
            this.scene.remove(this.currentCarriage.group);
            this.currentCarriage.group.traverse((child: any) => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) child.material.forEach((m: any) => m.dispose());
                    else child.material.dispose();
                }
            });
        }

        // Clean up previous anomalies (shadow hands, stalkers, shadow entity, shadow eyes, villains, modals)
        if (index > 0) {
            this.introTimeouts.forEach(t => clearTimeout(t));
            this.introTimeouts = [];
        }
        this.carriage10ScareTimers.forEach(t => clearTimeout(t));
        this.carriage10ScareTimers = [];
        if (this.jumpScareMesh) {
            this.camera.remove(this.jumpScareMesh);
            this.jumpScareMesh = null;
        }
        this.jumpScareActive = false;
        const scareFlash = document.getElementById('scare-flash-overlay');
        if (scareFlash) scareFlash.style.display = 'none';

        this.shadowHandsGroups.forEach(h => this.scene.remove(h));
        this.shadowHandsGroups = [];
        this.shadowHandsActive = false;
        if (this.stalkerMesh) {
            this.scene.remove(this.stalkerMesh);
            this.stalkerMesh = null;
            this.stalkerActive = false;
        }
        if (this.shadowEntityMesh) {
            this.scene.remove(this.shadowEntityMesh);
            this.shadowEntityMesh = null;
            this.shadowRushActive = false;
        }
        if (this.shadowEyesGroup) {
            this.scene.remove(this.shadowEyesGroup);
            this.shadowEyesGroup = null;
        }
        this.shadowVillains.forEach(v => this.scene.remove(v.group));
        this.shadowVillains = [];
        this.shadowRushCountdown = 0;

        // Deactivate Ajapahalane if active (player escaped to next carriage!)
        this.deactivateTimeVillain();
        this.carriageStayTimer = 0;
        this.timeVillainTriggeredThisCarriage = false;
        this.isSitting = false;
        const standBtn = document.getElementById('btn-stand-up');
        if (standBtn) standBtn.style.display = 'none';
        const sitIcon = document.getElementById('btn-toggle-sit-icon');
        const sitText = document.getElementById('btn-toggle-sit-text');
        if (sitIcon) sitIcon.textContent = '🪑';
        if (sitText) sitText.textContent = this.lang === 'et' ? 'Istu' : 'Sit';

        const deathModal = document.getElementById('death-modal');
        if (deathModal) deathModal.style.display = 'none';

        // Determine Theme based on story progression or infinite randomness
        let theme: CarriageData['theme'] = 'normal';
        const shadowRushCarriages = [20, 25, 32, 48, 50, 57, 63, 70, 75, 82, 90, 97];
        if (shadowRushCarriages.includes(index) || index === 4 || index === 15 || index === 35 || index === 49 || index === 60 || index === 96) theme = 'flicker';
        else if (index === 7 || index === 9 || index === 10 || index === 38 || index === 54 || index === 77) theme = 'dark';
        else if (index === 23) theme = 'neon';
        else if (index === 100) theme = 'golden_shop';
        else if (index === 200) theme = 'dark';
        else if (index >= 101) {
            const themes: CarriageData['theme'][] = ['normal', 'flicker', 'dark', 'abandoned', 'neon', 'lounge', 'archive'];
            theme = themes[Math.floor(Math.random() * themes.length)];
        }

        this.currentCarriage = this.createCarriageGeometry(index, this.branchDirection, theme);
        this.scene.add(this.currentCarriage.group);

        // Position player at entrance door and set free movement facing forward down the aisle
        this.state = 'player_free';
        if (index > 0) {
            this.introTimeouts.forEach(t => clearTimeout(t));
            this.introTimeouts = [];
            this.introSideDoorsOpen = false;
        }
        if (index === 200) {
            // Carriage 200 is 100m long: start at rear entrance (-46) facing forward (+Z) toward the final boss
            this.playerPos.set(0, 1.6, -46);
            this.cameraEuler.y = Math.PI;
            this.trainSpeed = 60;
            this.introSideDoorsOpen = false;
        } else {
            this.playerPos.set(0, 1.6, branch === 'left' ? 7.5 : -7.5);
            this.cameraEuler.y = branch === 'left' ? 0 : Math.PI;
            this.trainSpeed = 60;
            this.introSideDoorsOpen = false;
        }

        // Play heavy door latch audio
        metroAudio.playDoorLatch();

        // Update UI
        this.updateLanguageUI();
        this.updateCoinsUI();
        this.updateHotbarUI();

        // User requirement: "uks 26 hakkb tulema kõrge kõlaga klaveri pala et oleka väga hirmulav kuni vagun 31"
        if (index >= 26 && index <= 31) {
            metroAudio.startEerieHighPianoTrack();
        } else {
            metroAudio.stopEerieHighPianoTrack();
        }

        // Trigger story events per carriage index
        this.triggerCarriageStoryEvent(index);
    }

    private triggerCarriageStoryEvent(index: number) {
        // Ramping eerie drone (resets to peaceful 0 at checkpoint 100)
        metroAudio.setEerinessLevel(index === 100 ? 0.0 : Math.min(1.0, index * 0.03));

        // User requirement: Shadow Dash up to 300 on 210, 232, 233, 250, 260, 278, 280, 290
        const shadowDashCarriages200_300 = [210, 232, 233, 250, 260, 278, 280, 290];
        if (shadowDashCarriages200_300.includes(index)) {
            this.startShadowRushCarriageEvent(index);
        }

        switch (index) {
            case 1:
                setTimeout(() => {
                    metroAudio.playWhisper(4.0);
                    setTimeout(() => {
                        this.showThought('Kas ma kujutasin seda ette?', 'Did I imagine that?');
                    }, 4200);
                }, 3000);
                break;
            case 2:
                this.showThought('See reisija ees... ta käitub imelikult.', 'That passenger ahead... they are behaving strangely.');
                break;
            case 3:
                this.showThought('Metrookaart seinal... mis jaam see on?', 'The subway map on the wall... what station is that?');
                break;
            case 4:
                this.startLightFlickerAnomaly();
                break;
            case 5:
                this.showThought('Aknast välja vaadates... see ei ole linn.', 'Looking out the window... that is not the city.');
                break;
            case 6:
                this.showThought('Istmel on midagi. Ma peaksin seda uurima.', 'There is something on the seat. I should inspect it.');
                break;
            case 7:
                this.showThought('Tagasiteed enam ei ole. Ma pean edasi liikuma.', 'There is no way back. I must keep moving forward.');
                break;
            case 8:
                this.startDoorGlitchAnomaly();
                break;
            case 9:
                this.spawnStalkerEntity();
                this.showThought('Seal ees seisab keegi... ta lihtsalt jälgib mind.', 'Someone is standing ahead... they are just watching me.');
                break;
            case 10:
                this.startCarriage10JumpScare();
                break;

            // --- Vagunid 11–20 ---
            case 11:
                this.showThought('Kõik tundub täiesti normaalne, aga kõik AI-reisijad vaatavad korraga akna poole. 👀', 'Everything seems normal, but all AI passengers are staring out the window simultaneously. 👀');
                if (this.currentCarriage) {
                    this.currentCarriage.passengers.forEach(p => p.animType = 'look_window');
                }
                break;
            case 12:
                this.showThought('Metroo ekraan näitab peatust, mida metrookaardil ei eksisteeri.', 'The subway display shows a phantom station that does not exist on the map.');
                break;
            case 13:
                this.showThought('Vagun on peaaegu tühi ja kuskilt kostab vaikne muusika. 🎵', 'The carriage is nearly empty and faint music echoes from somewhere. 🎵');
                metroAudio.playRadioAudio();
                setTimeout(() => metroAudio.stopRadioAudio(), 7000);
                break;
            case 14:
                this.showThought('Üks AI-reisija annab sulle salapärase pileti. 🎫', 'An AI passenger reaches out and hands you a mysterious ticket. 🎫');
                break;
            case 15:
                this.showThought('Tuled kustuvad korraks ja tagasi tulles on reisijad teistes kohtades.', 'Lights extinguish for a second, and passengers are in different seats upon return.');
                this.startLightFlickerAnomaly();
                this.triggerShadowHandsEvent();
                break;
            case 16:
                this.showThought('Akna taga liigub linn ja tunnel tagurpidi!', 'Outside the window, the city and tunnel are moving backwards!');
                this.triggerReverseTunnel(6.0);
                break;
            case 17:
                this.showThought('Leiad seinalt kummalise noole, mis näitab edasi. ➡️', 'Found a strange arrow on the wall pointing forward. ➡️');
                break;
            case 18:
                this.showThought('Vagunis on kell, mis liigub liiga kiiresti. 🕒', 'The clock in the carriage is spinning unnaturally fast. 🕒');
                break;
            case 19:
                this.showThought('Kõik telefonid AI-reisijate käes hakkavad korraga helisema! 📱', 'All phones in the passengers\' hands start ringing simultaneously! 📱');
                metroAudio.playPhoneRingingAll();
                break;
            case 20:
                this.startShadowRushCarriageEvent(20);
                break;

            // --- Vagunid 21–30 ---
            case 21:
                this.showThought('Üks reisija küsib: „Kas sina tead, kus me oleme?” 🤔', 'A passenger asks: „Do you know where we are?” 🤔');
                this.triggerShadowHandsEvent();
                break;
            case 22:
                this.showThought('Vagunis olev metrookaart muutub iga kord, kui sellele otsa vaatad.', 'The subway map shifts every time you look at it.');
                break;
            case 23:
                this.showThought('Akendest on näha täiesti tundmatu, helendavate kristallidega tunnel.', 'An unfamiliar tunnel filled with glowing crystals is visible outside.');
                break;
            case 24:
                this.showThought('Tuled hakkavad liikuma nagu valguslaine läbi vaguni. 💡', 'Lights ripple like a wave of illumination through the carriage. 💡');
                break;
            case 25:
                this.showThought('Leiad vana metroopileti, millel on kummaline kuupäev (14.10.1987).', 'Found an old subway ticket with a strange date (14.10.1987).');
                this.startShadowRushCarriageEvent(25);
                break;
            case 26:
                this.showThought('Akendesse ja pimedusse ilmusid 2 helendavat punast silma... 👀', '2 glowing red eyes appeared in the windows and shadows... 👀');
                this.spawnGlowingShadowEyes(2);
                break;
            case 27:
                this.showThought('Kõlaritest kostab ragin ja pimeduses jälgib sind juba 3 silma! 👀', 'Static crackles and 3 glowing eyes watch you from the shadows! 👀');
                this.spawnGlowingShadowEyes(3);
                break;
            case 28:
                this.showThought('Üks uks on lukus ja vagunis luurab juba 4 silma! 🧩 (Uuri sedelit istme all)', 'Bulkhead door is locked and 4 eyes lurk in the carriage! 🧩 (Inspect note under seat)');
                this.spawnGlowingShadowEyes(4);
                break;
            case 29:
                this.showThought('5 punast silma jälgivad iga sinu sammu! Pimedus tiheneb... 👁️', '5 red eyes watch your every step! The darkness thickens... 👁️');
                this.spawnGlowingShadowEyes(5);
                break;
            case 30:
                this.showThought('7 silma vaatavad sind korraga pimedusest! Pinge aina kasvab... 👁️', '7 eyes stare at you simultaneously! Something dreadful is approaching... 👁️');
                this.spawnGlowingShadowEyes(7);
                this.triggerShadowHandsEvent();
                break;

            // --- Vagunid 31–40 ---
            case 31:
                this.showThought('⚠️ VAGUNIS ON PAHALASED! Kasuta Mõõka ⚔️ (klõpsa ekraani all), et neid rünnata!', '⚠️ SHADOW VILLAINS IN THE CARRIAGE! Use your Sword ⚔️ to fight them!');
                this.spawnShadowVillains(2);
                break;
            case 32:
                this.showThought('Mängija leiab väikese kaardi, kus on märgitud vagun number 50. 🗺️', 'You find a small pocket map with Carriage number 50 circled. 🗺️');
                this.startShadowRushCarriageEvent(32);
                this.triggerShadowHandsEvent();
                break;
            case 33:
                this.showThought('Metroo hakkab korraks sõitma väga aeglaselt... ja kiirendab siis uuesti.', 'The subway slows down to a crawl... then accelerates again.');
                break;
            case 34:
                this.showThought('Kõik AI-reisijad on kadunud ja vagun on täiesti tühi.', 'All AI passengers have vanished and the carriage is completely empty.');
                break;
            case 35:
                this.showThought('Tuled vilguvad ja üks reisija ilmub korraks vaguni teise otsa.', 'Lights flicker and a mysterious figure appears briefly at the far end.');
                this.startLightFlickerAnomaly();
                break;
            case 36:
                this.showThought('Vagunis on vana ekraan, mis näitab mängija läbitud vagunite numbreid: 36.', 'An old CRT screen displays the count of explored carriages: 36.');
                break;
            case 37:
                this.showThought('Kõlaritest kostab mängija jaoks tundmatu salapärane teade.', 'An unknown, mysterious chime announcement plays from the speakers.');
                break;
            case 38:
                this.showThought('Uks avaneb ja järgmine vagun tundub esialgu täiesti pime. (Kasuta taskulampi või ööprille!)', 'Door opens and the carriage is pitch black. (Use flashlight or night vision!)');
                break;
            case 39:
                this.showThought('Mängija leiab uue vihje metroo salajase ehituse kohta.', 'You find a new classified document about the subway\'s secret construction.');
                break;
            case 40:
                this.showThought('Kõik muutub korraks täiesti normaalseks, nagu mängu alguses.', 'Everything turns completely calm and normal for a moment, just like the beginning.');
                this.triggerShadowHandsEvent();
                break;

            // --- Vagunid 41–50 ---
            case 41:
                this.showThought('Vagunis on jälle palju reisijaid, kuid keegi ei räägi ega liiguta.', 'Many passengers sit here again, but nobody speaks or moves.');
                break;
            case 42:
                this.showThought('Üks reisija jätab maha salapärase koti, mille sees on vihje. 🎒', 'A passenger left behind a mysterious bag containing a clue. 🎒');
                break;
            case 43:
                this.showThought('Metroo kaart näitab, et rong on jõudnud oma viimasesse peatusesse — kuid rong sõidab edasi!', 'The subway map shows the final stop has arrived — yet the train speeds on!');
                break;
            case 44:
                this.showThought('Akna taga on korraks näha sama jaama, kust mäng algas kell 23:45!', 'Outside the window, the exact central station from 23:45 flashes past!');
                break;
            case 45:
                this.showThought('Mängija leiab ukse, millel on number 0. Kas me alustasime uuesti?', 'Found a bulkhead plaque with number 0. Have we restarted?');
                break;
            case 46:
                this.showThought('Vagunis on mitu kella ja kõik näitavad täiesti erinevat aega. 🕰️', 'There are several clocks in the carriage and each shows a different time. 🕰️');
                break;
            case 47:
                this.showThought('Kõlaritest kostab sosin, mis ütleb ainult ühe sõna: „Edasi…” 🔈', 'A whisper resonates over the intercom saying just one word: „Forward...” 🔈');
                metroAudio.playWhisper(3.0);
                break;
            case 48:
                this.showThought('Vagunis on sein, millel on kriipsud nagu keegi oleks lugenud läbitud vaguneid.', 'Tally marks are scratched on the wall as if counting passing carriages.');
                this.startShadowRushCarriageEvent(48);
                break;
            case 49:
                this.showThought('Tuled vilguvad ja mängija näeb korraks sama läbipaistvat jälitajat vaguni lõpus.', 'Lights flicker and the translucent shadow stalker glimpses at the far end.');
                this.startLightFlickerAnomaly();
                break;
            case 50:
                this.showThought('⭐ SUUR ERILINE VAGUN 50! Leidsid suure vihje selle kohta, miks metroo lõputult sõidab!', '⭐ MAJOR CARRIAGE 50! Found the classified blueprint revealing why the subway runs forever!');
                this.startShadowRushCarriageEvent(50);
                break;

            // --- Vagunid 51–60 ---
            case 51:
                this.showThought('Vagun on täiesti tühi, kuid kõlaritest kostab tavaline metrooteade.', 'Carriage is completely empty, yet a routine transit announcement plays.');
                break;
            case 52:
                this.showThought('Üks AI-reisija küsib: „Mitmendas vagunis sa oled?” 👀', 'An AI passenger asks: „What carriage are you in?” 👀');
                break;
            case 53:
                this.showThought('Metrookaardil on kõik peatused kadunud — jäänud on tühi joon.', 'All stations on the transit map have disappeared — leaving a blank line.');
                this.triggerShadowHandsEvent();
                break;
            case 54:
                this.showThought('Akna taga on väga pikk must tunnel, mille lõppu ei ole näha.', 'Outside is a vast dark tunnel with no visible end.');
                break;
            case 55:
                this.showThought('Mängija leiab vana kuldse pileti, millel on number 100. 🎫', 'Found an antique golden ticket stamped with number 100. 🎫');
                break;
            case 56:
                this.showThought('Kõik vaguni istmed on teises suunas kui tavaliselt.', 'All seats are positioned in reverse against the train motion.');
                break;
            case 57:
                this.showThought('Üks reisija seisab ukse juures ja kaob, kui mängija lähemale jõuab!', 'A passenger stands by the door and vanishes as you approach!');
                this.startShadowRushCarriageEvent(57);
                break;
            case 58:
                this.showThought('Metroo ekraan näitab korraks punaselt: „ÄRA PÖÖRDU TAGASI.” 🚫', 'Subway display flashes crimson: „DO NOT TURN BACK.” 🚫');
                break;
            case 59:
                this.showThought('Vagun on täiesti normaalne ja midagi kummalist ei juhtu.', 'Carriage is peaceful and normal with nothing strange occurring.');
                break;
            case 60:
                this.showThought('Tuled lähevad hetkeks välja ning tagasi tulles on vagun täiesti tühi.', 'Lights turn off for a moment, and returning, the carriage is completely empty.');
                this.startLightFlickerAnomaly();
                this.triggerShadowHandsEvent();
                break;

            // --- Vagunid 61–70 ---
            case 61:
                this.showThought('Mängija kuuleb oma samme, kuid tundub, nagu kostaks veel üks sammude heli. 👣', 'You hear your own footsteps, but an extra pair of steps seems to echo behind you. 👣');
                break;
            case 62:
                this.showThought('Akna peegelduses on näha tundmatu tume kuju.', 'A dark unfamiliar figure is seen in the window reflection.');
                break;
            case 63:
                this.showThought('🗝️ AI-reisija annab sulle VÕTME! Klõpsa ekraani all olevale võtmeikoonile, et see kätte võtta nagu Robloxsis!', '🗝️ AI passenger hands you a KEY! Click the key icon on the hotbar below to equip it like in Roblox!');
                this.unlockItem('key');
                this.startShadowRushCarriageEvent(63);
                break;
            case 64:
                this.showThought('Järgmise vaguni uks on lukus ja võti aitab selle avada! (Võta võti kätte)', 'The next carriage door is locked! Equip the key from hotbar to open it!');
                break;
            case 65:
                this.showThought('Vagunis on vana metrookaamera monitor, mis näitab mängija eelmist vagunit 64.', 'An old CCTV monitor on the wall shows a security feed of Carriage 64.');
                break;
            case 66:
                this.showThought('Mängija näeb ekraanilt, et keegi liigub tema selja taga, kuid vagun on tühi!', 'On screen, someone is walking right behind you, yet the carriage is empty!');
                break;
            case 67:
                this.showThought('Metroo heli muutub korraks täiesti vaikseks.', 'The subway audio goes into complete silence for a few seconds.');
                this.triggerSoundCutout(3.5);
                break;
            case 68:
                this.showThought('Kõik tuled muutuvad hetkeks väga nõrgaks ja siis taastuvad.', 'All lights dim to a faint glow and then restore.');
                break;
            case 69:
                this.showThought('Leiad seinalt kirjutatud sõnumi: „Sa ei ole esimene.”', 'Found a scratched message on the bulkhead: „You are not the first.”');
                break;
            case 70:
                this.showThought('⭐ SUUR VIHJE-VAGUN 70! Leidsid märkmiku, mis räägib inimesest, kes oli kunagi samas metroos.', '⭐ MAJOR CLUE CARRIAGE 70! Found the journal of an explorer who was trapped in this subway.');
                this.startShadowRushCarriageEvent(70);
                this.triggerShadowHandsEvent();
                break;

            // --- Vagunid 71–80 ---
            case 71:
                this.showThought('Vagun tundub täiesti normaalne, kuid kellad ei liigu.', 'Carriage feels normal, but all clocks have frozen.');
                break;
            case 72:
                this.showThought('Üks AI-reisija istub ja joonistab metrood, millel on lõpmatult vaguneid. ✏️', 'An AI passenger sits sketching an infinite subway train into a notebook. ✏️');
                break;
            case 73:
                this.showThought('Metroo ekraan näitab: „JÄRGMINE PEATUS: ???”', 'The subway display shows: „NEXT STOP: ???”');
                break;
            case 74:
                this.showThought('Akna taga on korraks näha mahajäetud 1980ndate metroojaama.', 'An abandoned 1980s station platform flashes past outside the window.');
                break;
            case 75:
                this.showThought('Vagunis olevad tuled hakkavad järjest ükshaaval kustuma.', 'Lights in the carriage begin turning off one by one in sequence.');
                this.startShadowRushCarriageEvent(75);
                break;
            case 76:
                this.showThought('Kõik istmed on tühjad, kuid õhus kajab selgelt reisijate juttu.', 'Seats are empty, yet distant crowd conversations echo clearly.');
                break;
            case 77:
                this.showThought('Üks uks avaneb, kuid selle taga ei ole järgmine vagun — ainult tundmatu pime ruum.', 'Door opens into a dark observation chamber instead of a normal carriage.');
                break;
            case 78:
                this.showThought('Mängija peab leidma vihje, et õige ukse kaudu edasi minna. 🧩', 'You must inspect the clue on the bulkhead to unlock the right path. 🧩');
                break;
            case 79:
                this.showThought('Õige ukse leidmisel on järgmine vagun meeldivalt rahulik ja tavaline.', 'Having solved the door puzzle, this carriage is calm, clean and normal.');
                break;
            case 80:
                this.showThought('⭐ VAGUN 80! Leidsid suure metrookaardi, millel on sinu asukoht: VAGUN 80. (Kuldne Pood läheneb!)', '⭐ CARRIAGE 80! Found the master transit map showing: Currently at Carriage 80. (Golden Shop approaches!)');
                break;

            // --- Vagunid 81–90 ---
            case 81:
                this.showThought('Mängija leiab taas ühe vana pileti, kuid sellel on tema enda vaguninumber: 81.', 'Found an old ticket printed with your exact carriage number: 81.');
                break;
            case 82:
                this.showThought('Kõlaritest tuleb teade, mis tundub olevat mõeldud just sinule: „Reisija... oled peagi kohal.”', 'An announcement speaks directly to you: „Passenger... you are nearly there.”');
                this.startShadowRushCarriageEvent(82);
                break;
            case 83:
                this.showThought('AI-reisijad vaatavad korraga kõik ühes suunas minu poole.', 'All AI passengers turn their heads in unison towards you.');
                break;
            case 84:
                this.showThought('Mängija kuuleb kaugelt metrooukse avanemise kaja.', 'You hear the pneumatic hiss of a distant subway door opening.');
                break;
            case 85:
                this.showThought('Vagunis on üks vana LED-ekraan, mis näitab numbreid 1–100.', 'An old LED board displays numbers 1 to 100.');
                break;
            case 86:
                this.showThought('Number 86 on ekraanil eraldi ereda kullaga märgitud!', 'Number 86 is highlighted in bright gold on the display!');
                break;
            case 87:
                this.showThought('Mängija leiab konduktori kuldse kaardi, mis aitab Vagun 100 poodi avada. 💳', 'Found the conductor\'s golden card for the Carriage 100 shop. 💳');
                break;
            case 88:
                this.showThought('Akna taga liigub metroo kõrval korraks teine täpselt samasugune rong! 🚇', 'Outside the right window, an identical parallel subway train speeds alongside! 🚇');
                this.triggerShadowHandsEvent();
                break;
            case 89:
                this.showThought('Teises rongis olevad reisijad vaatavad aknast otse sinu poole.', 'Passengers in the parallel train are staring through the glass right at you.');
                break;
            case 90:
                this.showThought('⭐ Mõlemad rongid lähevad eri suundades ja teine rong kaob tunnelisse.', '⭐ The trains diverge and the parallel train disappears into the dark tunnel.');
                this.startShadowRushCarriageEvent(90);
                this.triggerShadowHandsEvent();
                break;

            // --- Vagunid 91–100 ---
            case 91:
                this.showThought('Mängija jõuab vagunisse, mis näeb välja täpselt nagu mängu alguse vagun 0.', 'You arrive at a carriage that looks identical to the very starting carriage 0.');
                break;
            case 92:
                this.showThought('Seal istub üks AI-reisija, keda mängija nägi mängu alguses jaamas.', 'The very same AI passenger from the station intro sits right there.');
                break;
            case 93:
                this.showThought('Reisija ütleb salapäraselt: „Sa oled juba väga kaugel.”', 'The passenger speaks mysteriously: „You have come very far.”');
                break;
            case 94:
                this.showThought('Metrookaardil ei ole enam ühtegi normaalset peatust — ainult kummalised märgid.', 'All normal stations are gone from the map — replaced by glowing glyphs.');
                break;
            case 95:
                this.showThought('Mängija leiab ukse numbriga 100.', 'You find a heavy door embossed with number 100.');
                break;
            case 96:
                this.showThought('Enne seda ust hakkavad tuled aeglaselt ja soojalt vilkuma.', 'Before the door, lights begin to pulse slowly with a warm golden hue.');
                break;
            case 97:
                this.showThought('Metrooheli muutub järjest vaiksemaks ja rahulikumaks.', 'The subway running sound softens into a calm, gentle hum.');
                this.startShadowRushCarriageEvent(97);
                break;
            case 98:
                this.showThought('Kõlaritest kostab vana pühalik metrooteade: „Saabume Vagunisse 100.”', 'A solemn announcement chimes: „Arriving at Carriage 100 — The Golden Terminal.”');
                this.triggerShadowHandsEvent();
                break;
            case 99:
                this.showThought('Uks avaneb ja ees särab helge, soe ja kuldne valgus!', 'The door slides open revealing radiant, warm golden light ahead!');
                break;
            case 100:
                this.showThought(
                    '🌟 SUUR CHECKPOINT-VAGUN 100 — KULDNE POOD! Checkpoint salvestatud. Astu leti juurde ja osta varustust!',
                    '🌟 GRAND CHECKPOINT CARRIAGE 100 — GOLDEN SHOP! Progress saved. Step up to the counter and purchase gear!'
                );
                this.openGoldenShopModal();
                break;


            // ── VAGUNID 101–160 ───────────────────────────────────────────────────

            case 101:
                this.showThought('Kõik reisijad vaatavad korraga mängija poole, siis pöörduvad tagasi.', 'All passengers turn to face you simultaneously — then look away.');
                if (this.currentCarriage) {
                    this.currentCarriage.passengers.forEach(p => { p.animType = 'uncanny_stare'; p.targetRotY = Math.PI; });
                    setTimeout(() => {
                        if (this.currentCarriage) this.currentCarriage.passengers.forEach(p => { p.animType = 'look_window'; p.targetRotY = p.baseRotY; });
                    }, 3000);
                }
                break;

            case 102:
                // Grip — must käsi ukse vahelt (10 sekundit)
                this.showThought('Ukse vahelt sirutub välja must varjukäsi... kui ta sind puudutab, oled kadunud!', 'A black shadow hand reaches through the door... if it touches you, you are gone!');
                this.triggerShadowHandsEvent();
                break;

            case 103:
                // Shadow Dash
                this.startShadowRushCarriageEvent(103);
                break;

            case 104:
                this.showThought('Tühi iste liigub iseenesest... kui sa lähenesid, jäi see seisma.', 'An empty seat is moving by itself... it stopped when you approached.');
                if (this.currentCarriage && this.currentCarriage.passengers.length > 0) {
                    const seat = this.currentCarriage.passengers[0];
                    if (seat.group) {
                        const startZ = seat.group.position.z;
                        let moving = true;
                        const seatMoveInterval = setInterval(() => {
                            if (!moving) { clearInterval(seatMoveInterval); return; }
                            seat.group.position.z = startZ + Math.sin(Date.now() * 0.003) * 0.18;
                            const dist = Math.abs(this.playerPos.z - seat.group.position.z);
                            if (dist < 1.5) { moving = false; seat.group.position.z = startZ; clearInterval(seatMoveInterval); }
                        }, 16);
                        setTimeout(() => { moving = false; clearInterval(seatMoveInterval); seat.group.position.z = startZ; }, 8000);
                    }
                }
                break;

            case 105:
                this.showThought('Kõlaritest kostab metrooteade — aga lõpus on vale vaguninumber: „Järgmine peatus: Vagun 4."', 'Speakers announce a stop — but the carriage number is wrong: "Next stop: Carriage 4."');
                metroAudio.playRadioAudio();
                setTimeout(() => metroAudio.stopRadioAudio(), 5000);
                break;

            case 106:
                this.showThought('Akna peegelduses liigub üks reisija — aga ta seisab sinust teispool paigal.', 'In the window reflection, one passenger moves — yet they stand perfectly still.');
                break;

            case 107:
                this.showThought('Reisija tõuseb aeglaselt püsti, vaatab sulle otsa... ja istub tagasi, nagu midagi ei juhtunud.', 'A passenger slowly rises, stares at you... then sits back as if nothing happened.');
                if (this.currentCarriage && this.currentCarriage.passengers.length > 0) {
                    const p = this.currentCarriage.passengers[0];
                    setTimeout(() => { if (p?.group) p.group.position.y += 0.4; }, 1500);
                    setTimeout(() => { if (p?.group) p.group.position.y -= 0.4; }, 4000);
                }
                break;

            case 108:
                this.showThought('Vaguni kell jääb täpselt kümneks sekundiks seisma... siis liigub jälle edasi.', 'The carriage clock freezes for exactly ten seconds... then ticks forward again.');
                this.startLightFlickerAnomaly();
                break;

            case 109:
                // Grip
                this.showThought('Ukse vahelt piilub sisse must varjukäsi...', 'A black shadow hand peers in through the door gap...');
                this.triggerShadowHandsEvent();
                break;

            case 110:
                this.showThought('Kõik tuled kustuvad hetkeks. Kui need tagasi tulevad — üks reisija on kadunud.', 'All lights go out for a moment. When they return — one passenger has vanished.');
                this.startLightFlickerAnomaly();
                if (this.currentCarriage && this.currentCarriage.passengers.length > 0) {
                    setTimeout(() => {
                        const p = this.currentCarriage?.passengers[0];
                        if (p?.group) { p.group.visible = false; }
                    }, 2200);
                }
                break;

            case 111:
                this.showThought('Ukse tagant kostab koputus... uks avaneb. Seal pole kedagi.', 'A knock echoes from behind the door... it slides open. No one is there.');
                setTimeout(() => metroAudio.playDoorSlide(true), 1500);
                setTimeout(() => metroAudio.playDoorSlide(false), 4000);
                break;

            case 112:
                this.showThought('Reklaamiekraan muutub järsku mustaks. Ekraanil ei ole midagi.', 'The advertisement screen turns pitch black. Nothing on the display.');
                break;

            case 113:
                this.showThought('Akna taga möödub teine metroorong — aga selle akendes pole mitte kedagi.', 'Another subway train passes the window — but its carriages are completely empty.');
                this.startShadowRushCarriageEvent(113);
                break;

            case 114:
                this.showThought('Kõik tuled muutuvad korraks siniseks — unenäoline ja rahutu tunne.', 'All lights shift to a cold blue — an unsettling, dreamlike atmosphere.');
                if (this.currentCarriage) {
                    this.currentCarriage.lights.forEach(l => { l.color.setHex(0x3498db); });
                    setTimeout(() => {
                        if (this.currentCarriage) this.currentCarriage.lights.forEach(l => l.color.setHex(0xffffff));
                    }, 6000);
                }
                break;

            case 115:
                this.showThought('Ühe reisija silmad on kinni — ta ei liigu. Ta ei hingagi.', 'One passenger has their eyes closed — motionless. Not even breathing.');
                break;

            case 116:
                this.showThought('Vagunis on hästi külm. Hingates on näha aurupilv.', 'The air in the carriage is freezing cold. You can see your breath fog.');
                if (this.currentCarriage) {
                    this.currentCarriage.lights.forEach(l => { l.color.setHex(0x88ccff); l.intensity = 0.6; });
                    setTimeout(() => {
                        if (this.currentCarriage) { this.currentCarriage.lights.forEach(l => { l.color.setHex(0xffffff); l.intensity = 0.85; }); }
                    }, 8000);
                }
                break;

            case 117:
                this.showThought('Üks reisija istub sinu kõrvale. Kui liigud — ta on kadunud.', 'A passenger sits right next to you. When you move — they are gone.');
                break;

            case 118:
                this.showThought('Metroo pidurdab järsult — aga ühtegi jaama ei paista.', 'The train brakes sharply — but no station comes into view.');
                metroAudio.playFlickerBuzz();
                setTimeout(() => metroAudio.playFlickerBuzz(), 800);
                break;

            case 119:
                this.showThought('Kõik aknad muutuvad korraks uduseks — nagu hingaks metroo ise.', 'Every window fogs over for a moment — as if the metro itself is breathing.');
                break;

            case 120:
                this.showThought('Kõik helid kaovad. Absoluutne vaikus. Kümne sekundi pärast kõik taastub.', 'All sound disappears. Absolute silence. Ten seconds later — everything returns.');
                metroAudio.stopRadioAudio();
                setTimeout(() => metroAudio.playRadioAudio(), 10000);
                setTimeout(() => metroAudio.stopRadioAudio(), 14000);
                break;

            case 121:
                this.showThought('Üks lamp vilgub kindlas rütmis — nagu morses midagi edastades.', 'One lamp flickers in a precise rhythm — like transmitting morse code.');
                this.startLightFlickerAnomaly();
                break;

            case 122:
                this.showThought('Kõik tuled muutuvad punaseks. Vagun on nagu veriseks muutunud.', 'All lights shift to a deep red. The carriage looks blood-soaked.');
                if (this.currentCarriage) {
                    this.currentCarriage.lights.forEach(l => { l.color.setHex(0xff1744); l.intensity = 1.2; });
                    setTimeout(() => {
                        if (this.currentCarriage) this.currentCarriage.lights.forEach(l => { l.color.setHex(0xffffff); l.intensity = 0.85; });
                    }, 7000);
                }
                break;

            case 123:
                this.showThought('Näed aknas oma peegeldust — aga peegeldus liigub hiljem. 👤', 'You see your reflection in the window — but it moves a second after you do. 👤');
                break;

            case 124:
                this.showThought('Üks uks avaneb — ja sulgub kohe. Seal polnud kedagi.', 'One door slides open — and immediately shuts. No one was there.');
                setTimeout(() => metroAudio.playDoorSlide(true), 1000);
                setTimeout(() => metroAudio.playDoorSlide(false), 2500);
                break;

            case 125:
                this.showThought('Kõlaritest kostab vana rongijuhi hääl — aga rongijuhti pole olemas.', 'The speakers crackle with an old driver\'s voice — but there is no driver on this train.');
                metroAudio.playRadioAudio();
                setTimeout(() => metroAudio.stopRadioAudio(), 6000);
                break;

            case 126:
                this.showThought('Üks reisija vaatab pidevalt ukse poole. Ta ei pöördu ära.', 'One passenger stares constantly at the door. They will not look away.');
                this.startShadowRushCarriageEvent(126);
                break;

            case 127:
                this.showThought('Reklaam seinal muutub — nüüd on seal üks sõnum: „ÄRA PEATU."', 'The wall advertisement changes — now it shows one message: "DO NOT STOP."');
                break;

            case 128:
                this.showThought('Kõik reisijad kaovad ühe tule vilkumise ajal — ja ilmuvad siis tagasi.', 'All passengers vanish during a single light flicker — and reappear.');
                this.startLightFlickerAnomaly();
                if (this.currentCarriage) {
                    const pax = [...this.currentCarriage.passengers];
                    setTimeout(() => { pax.forEach(p => { if (p.group) p.group.visible = false; }); }, 1000);
                    setTimeout(() => { pax.forEach(p => { if (p.group) p.group.visible = true; }); }, 2800);
                }
                break;

            case 129:
                // Grip
                this.showThought('Uksest sirutub välja must varjukäsi...', 'A black shadow hand reaches through the door...');
                this.triggerShadowHandsEvent();
                break;

            case 130:
                this.showThought('Kuuled enda järel kummalisi samme — aga kui peatad, on kõik vaikne.', 'You hear strange footsteps trailing behind you — when you stop, silence.');
                metroAudio.playShadowGrab();
                break;

            case 131:
                this.showThought('Tuled vilguvad ja vaguni teises otsas on korraks näha tumedat varju.', 'Lights flicker — for a moment a dark silhouette is visible at the far end.');
                this.startLightFlickerAnomaly();
                break;

            case 132:
                this.showThought('Kõlaritest kostab kaugelt kummaline naer — siis vaikus.', 'Strange laughter echoes distantly from the speakers — then silence.');
                metroAudio.playFlickerBuzz();
                break;

            case 133:
                this.showThought('Üks iste hakkab aeglaselt värisema — kuigi metroo sõidab sujuvalt.', 'One seat begins to tremble slowly — though the metro runs smoothly.');
                break;

            case 134:
                this.showThought('Kõik tuled muutuvad korraks siniseks — unenäoline, rahutu tunne.', 'All lights shift briefly to blue — dreamlike and unsettling.');
                if (this.currentCarriage) {
                    this.currentCarriage.lights.forEach(l => { l.color.setHex(0x4facfe); l.intensity = 0.9; });
                    setTimeout(() => {
                        if (this.currentCarriage) this.currentCarriage.lights.forEach(l => { l.color.setHex(0xffffff); l.intensity = 0.85; });
                    }, 5000);
                }
                break;

            case 135:
                this.showThought('Näed aknas oma peegeldust — aga peegeldus liigub iseseisvalt vaguni lõppu. 👤', 'Your window reflection moves independently — walking to the far end of the carriage. 👤');
                break;

            case 136:
                this.showThought('Reisijad vaikivad korraks — vaatavad kõik korraga akna poole.', 'Passengers fall silent — every one of them turns to face the window simultaneously.');
                if (this.currentCarriage) {
                    this.currentCarriage.passengers.forEach(p => { p.animType = 'look_window'; });
                }
                break;

            case 137:
                this.showThought('Kõik helid muutuvad väga vaikseks — jääb ainult sinu hingamine.', 'All sounds fade to near-silence — only your own breathing remains.');
                break;

            case 138:
                this.showThought('Vagun hakkab aeglaselt peatuma — aga ühtegi jaama pole näha.', 'The carriage begins to slow — no station comes into view.');
                metroAudio.playFlickerBuzz();
                break;

            case 139:
                this.showThought('Akna taga vilgub korraks ere valgus — siis kaob.', 'A brilliant flash blazes outside the window — then vanishes.');
                break;

            case 140:
                // Shadow Dash
                this.startShadowRushCarriageEvent(140);
                break;

            case 141:
                this.showThought('Tuled vilguvad kordamööda — vagun tundub kummaliselt pikaks veninud.', 'Lights flicker one by one — the carriage feels strangely, impossibly long.');
                this.startLightFlickerAnomaly();
                break;

            case 142:
                this.showThought('„Ära jäta mind siia..." — sosin kõlaritest. Keegi räägib sinuga.', '"Do not leave me here..." — a whisper from the speakers. Someone is speaking to you.');
                metroAudio.playWhisper(4.0);
                break;

            case 143:
                this.showThought('Tuled muutuvad äkki kuldseks — ja näed korraks enda varju, mis pole päris sinu oma.', 'Lights turn golden — your shadow flickers into something not quite your own shape.');
                if (this.currentCarriage) {
                    this.currentCarriage.lights.forEach(l => { l.color.setHex(0xffd32a); l.intensity = 1.1; });
                    setTimeout(() => {
                        if (this.currentCarriage) this.currentCarriage.lights.forEach(l => { l.color.setHex(0xffffff); l.intensity = 0.85; });
                    }, 6000);
                }
                break;

            case 144:
                this.showThought('⚠️ Helisignaal kõlaritest — jookse kohe järgmise ukse juurde!', '⚠️ An alarm signal from the speakers — run to the next door immediately!');
                metroAudio.playPhoneRingingAll();
                setTimeout(() => metroAudio.stopRadioAudio(), 4000);
                break;

            case 145:
                this.showThought('Akna taga liigub tume kuju — aga seal pole kedagi, keda näha oleks.', 'A dark shape moves past the window — but there is no one out there to be seen.');
                break;

            case 146:
                // Grip — poole lühem käsi (nagu 151-157 sündmustes)
                this.showThought('Ukse vahelt sirutub välja must varjukäsi — aga ta käsi on lühem. Sa saad sellest mööda minna!', 'A black shadow hand reaches through — but the arm is shorter. You can slip past it!');
                this.triggerShadowHandsEvent();
                break;

            case 147:
                this.showThought('Kõik reisijad on ootamatult kadunud. Vagun on tühi.', 'All passengers have vanished without a trace. The carriage is empty.');
                if (this.currentCarriage) {
                    this.currentCarriage.passengers.forEach(p => { if (p.group) p.group.visible = false; });
                }
                break;

            case 148:
                this.showThought('...Kuuled enda nime sosinat kaugelt... aga sa oled siin üksi.', '...You hear your name whispered from far away... but you are alone here.');
                metroAudio.playWhisper(5.0);
                break;

            case 149:
                this.showThought('Akna taga vilgub valge valgus — siis kaob. Järgmine peatus on teistsugune.', 'White light blazes outside the window — then disappears. The next stop is different.');
                break;

            case 150:
                this.showThought('Metroo pidurdab korraks järsult — tuled vilguvad ja koridori tekib paks udu...', 'The metro brakes sharply for a moment — lights flicker and thick fog fills the aisle...');
                this.startLightFlickerAnomaly();
                break;

            case 151:
            case 152:
            case 153:
                this.showThought(`Vagun ${index} — pimedus ja vaikus tunnelis süvenevad.`, `Carriage ${index} — darkness and silence in the tunnel deepen.`);
                break;

            case 154:
                this.showThought('Ukse vahelt libiseb mööda must vari Grip. Liigu ettevaatlikult edasi.', 'A black shadow Grip slithers past the door. Proceed carefully.');
                this.triggerShadowHandsEvent();
                break;

            case 155:
            case 156:
            case 157:
            case 158:
            case 159:
                this.showThought(`Vagun ${index} — metallkest nagiseb survetundlikult.`, `Carriage ${index} — the metallic hull groans under pressure.`);
                break;

            case 160:
                this.showThought('Vagun 160 — metroo kihutab läbi pimeda tühjuse järgmiste katsete poole.', 'Carriage 160 — the metro speeds through dark void towards the next trials.');
                break;

            // ── VAGUNID 161–200 ───────────────────────────────────────────────────

            case 161:
                this.showThought('Metro sõidab jälle. Istmel on vana foto samast metroost, vaguninumber on ära kriipsutatud.', 'The metro speeds on. On the seat lies an old photo with the carriage number crossed out.');
                break;

            case 162:
                this.showThought('Ekraan vilgutab korraks: „KATSE 002 LÕPP.”', 'The screen blinks briefly: “EXPERIMENT 002 CONCLUSION.”');
                this.startLightFlickerAnomaly();
                break;

            case 163:
            case 164:
                this.showThought('Ukse vahelt ilmub must varjukäsi Grip! Hoidu sellest eemale!', 'A black shadow hand Grip emerges from the door gap! Keep your distance!');
                this.triggerShadowHandsEvent();
                break;

            case 165:
                this.showThought('Istme alt on leitav vana pilet numbriga 002.', 'Under the seat lies an old ticket stamped with number 002.');
                break;

            case 166:
                this.showThought('Kõik kellad vagunis näitavad korraga 02:00.', 'Every clock in the carriage simultaneously reads 02:00.');
                break;

            case 167:
                this.showThought('Raadio annab vihje: „Teine katse ei lõppenud siin.”', 'The radio crackles: “The second experiment did not conclude here.”');
                metroAudio.playWhisper(4.0);
                break;

            case 168:
                this.showThought('Istmel on vana foto tühjast metroost. Tagaküljel pole midagi.', 'On the seat is an old photo of an empty subway. The back is blank.');
                break;

            case 169:
                this.showThought('Akna taga liigub korraks teine metroorong, kuigi tunnelis pole teist rööbast.', 'Another subway train flashes past the window, though there are no second tracks in the tunnel.');
                break;

            case 170:
                this.showThought('Seinal on tume kiri: „ÄRA USU VAGUNIT 200.”', 'Dark words on the wall read: “DO NOT TRUST CARRIAGE 200.”');
                break;

            case 171:
                this.showThought('Grip ilmub kaugemast uksest ja kaob kiiresti tühjusesse.', 'Grip appears at the far door and quickly withdraws into the void.');
                this.triggerShadowHandsEvent();
                break;

            case 172:
                this.showThought('Vana dokument lauakesel: „Objekt 002 reageeris teisele katsele.”', 'Old document on the table: “Object 002 responded to the second test.”');
                break;

            case 173:
                this.showThought('Vana foto metroojaamast. Jaama nime pole näha.', 'An old photograph of a subway station. The station name is missing.');
                break;

            case 174:
                this.showThought('Valgustus kustub. Ööprillidega on näha korraks vaguni lõpus siluetti.', 'The lights cut out. Under night vision, a silhouette is visible at the far end.');
                this.startLightFlickerAnomaly();
                break;

            case 175:
                this.showThought('Raadio: „Nad ei ehitanud seda rongi. Nad leidsid selle.”', 'Radio: “They did not build this train. They found it.”');
                metroAudio.playWhisper(4.5);
                break;

            case 176:
                this.showThought('Istmel on vana käekell, mis liigub ainult siis, kui sa ise liigud.', 'An old wristwatch on the seat only ticks while you are moving.');
                break;

            case 177:
                this.startShadowRushCarriageEvent(177);
                this.showThought('Shadow Dash kihutab mööda! Pärast sündmust on vagun jälle täiesti tühi.', 'Shadow Dash screams past! The carriage falls completely silent afterwards.');
                break;

            case 178:
                this.showThought('Vana foto neljast inimesest. Üks inimene on pildilt teravalt välja lõigatud.', 'An old photo of four people. One person has been sharply cut out.');
                break;

            case 179:
                this.showThought('Metro peatub hetkeks, kuid uksed ei avane... Pinge tõuseb.', 'The metro halts for a brief moment, but doors remain shut... Tension rises.');
                metroAudio.playFlickerBuzz();
                break;

            case 180:
                this.showThought('Seinal vilgub number 002, seejärel muutub see numbriks 200.', 'Number 002 flashes on the bulkhead, shifting into number 200.');
                break;

            case 181:
                this.showThought('Grip ilmub lühemalt ukse vahelt — sa jõuad sellest mööda joosta!', 'Grip reaches out briefly — you can sprint past it!');
                this.triggerShadowHandsEvent();
                break;

            case 182:
                this.showThought('Vana nimekiri, kus enamiku nimede kõrval on punane märge „kadunud”.', 'An old manifest where almost every name is stamped “missing”.');
                break;

            case 183:
                this.showThought('Grip sirutub taas uksest välja!', 'Grip strikes again from the doorway!');
                this.triggerShadowHandsEvent();
                break;

            case 184:
                this.showThought('Raadio: „Katse 002 ei olnud esimene. See oli ainus, mis töötas.”', 'Radio: “Experiment 002 was not the first. It was the only one that worked.”');
                metroAudio.playWhisper(5.0);
                break;

            case 185:
                this.showThought('Kõik reisijad vaatavad korraga mängija poole, kuid keegi ei räägi.', 'Every passenger silently turns their head to face you simultaneously.');
                if (this.currentCarriage) {
                    this.currentCarriage.passengers.forEach(p => p.animType = 'uncanny_stare');
                }
                break;

            case 186:
                this.showThought('Vana metrookaart, millele on käsitsi märgitud uus jaam: 200.', 'A transit map with a handwritten secret terminal: 200.');
                break;

            case 187:
                this.startShadowRushCarriageEvent(187);
                break;

            case 188:
                this.showThought('Vana foto samast rongist. Esiklaasi kohal on vaguninumber 200.', 'An old photo of this train. Carriage number 200 glows above the front.');
                break;

            case 189:
                this.showThought('Raadio ütleb katkendlikult: „…nad ootavad…”', 'Radio statics intermittently: “…they are waiting…”');
                metroAudio.playWhisper(3.5);
                break;

            case 190:
                this.showThought('Metroo hakkab väga kiiresti sõitma! Kõik tuled muutuvad punaseks!', 'The metro accelerates violently! All lights blaze crimson!');
                if (this.currentCarriage) {
                    this.currentCarriage.lights.forEach(l => { l.color.setHex(0xff1744); l.intensity = 1.3; });
                }
                break;

            case 191:
                this.showThought('Ukse klaasile ilmub helendav tekst: „VIIMASED 10 VAGUNIT.”', 'Glowing text blazes across the door glass: “FINAL 10 CARRIAGES.”');
                break;

            case 192:
                this.startShadowRushCarriageEvent(192);
                this.showThought('Shadow Dash tormab mööda! Põrandale jääb pilet numbriga 002.', 'Shadow Dash sweeps through! Ticket 002 remains on the floor.');
                break;

            case 193:
                this.showThought('Vana foto kolmest inimesest. Nad seisavad otse Vaguni 200 ukse ees.', 'An old photo of three people standing directly in front of Carriage 200.');
                break;

            case 194:
                this.showThought('Raadio: „Kui uks avaneb, ära vaata, kes sind ootab.”', 'Radio: “When the door opens, do not look at who is waiting for you.”');
                metroAudio.playWhisper(4.0);
                break;

            case 195:
                this.showThought('Metro aeglustub ja kõik reisijad kaovad korraga ümbert ära.', 'The metro decelerates and all passengers instantly vanish.');
                if (this.currentCarriage) {
                    this.currentCarriage.passengers.forEach(p => { if (p.group) p.group.visible = false; });
                }
                break;

            case 196:
                this.showThought('Grip ilmub. Pärast selle kadumist jääb uksele hõõguma number 200.', 'Grip reaches out. After it withdraws, glowing number 200 remains on the door.');
                this.triggerShadowHandsEvent();
                break;

            case 197:
                this.showThought('Kõik aknad muutuvad mustaks. Mängija näeb ainult enda peegeldust.', 'All windows turn pitch black. You only see your own reflection in the glass.');
                break;

            case 198:
                this.showThought('Vana dokument: „Katse 002 andis tulemuse. Rong leidis tee.”', 'Old dossier: “Experiment 002 yielded results. The train found its path.”');
                break;

            case 199:
                this.showThought('Metro peatub. Uks vagunisse 200 avaneb aeglaselt. Raadio: „Nüüd saad teada.”', 'The metro halts. The heavy door to Carriage 200 slides open. Radio: “Now you will know.”');
                metroAudio.playDoorSlide(true);
                break;

            case 200:
                // ── VAGUN 200: VIIMANE VAGUN (5X PIKEM) & LÕPUPAHALANE ──
                metroAudio.playCarriage200Music();
                this.showThought(
                    '⚡ VAGUN 200 — VIIMANE VAGUN! See vagun on 5X pikem kui teised! Lõpus ootab LÕPUPAHALANE (vaja 10 mõõgalööki)! Kogu maa pealt rohelisi plusse (+30 elu)!',
                    '⚡ CARRIAGE 200 — FINAL CARRIAGE! This carriage is 5X longer! Defeat the FINAL BOSS at the end (10 sword strikes)! Collect green pluses on the floor (+30 health)!'
                );
                break;

            // ── VAGUNID 201–250 — KANALISATSIOON (THE CANALIZATION) ─────────────────

            case 201:
                this.triggerCarriage201SewerIntro();
                break;

            case 202:
                this.showThought('Liigud mööda kitsast rada vee kõrval. Tunnel on väga pikk ja kaugelt on kuulda vee voolamist.', 'You walk along the narrow catwalk beside flowing water.');
                break;

            case 203:
                this.showThought('Suur tühi ruum. Keskel voolab vesi läbi sügava kanali. Teisele poole viib väike metallist sild.', 'Vast chamber. Water rushes through a central canal. A narrow steel bridge crosses over.');
                break;

            case 204:
                this.showThought('Metalluks on lukus. Leia kõrval asuv väike kang, mis ukse avab!', 'The metal door is locked. Find the wall lever nearby to open it!');
                break;

            case 205:
                this.showThought('Pikk sirge tunnel. Vesi voolab sinu kõrval ja tuled vilguvad.', 'Long straight sewer conduit. Water flows beside you under flickering industrial lights.');
                this.startLightFlickerAnomaly();
                break;

            case 206:
                this.showThought('Suured trellid blokeerivad ühe tunneli poole. Nende taga paistab teine sügav tunnel.', 'Heavy iron grates block one side of the conduit.');
                break;

            case 207:
                this.showThought('Vesi hakkab järsku kiiremini voolama! Jõua kiiresti järgmise ukse juurde!', 'The water suddenly rushes faster! Hurry to the next doorway!');
                break;

            case 208:
                this.showThought('Tühi hooldusruum. Seinad on märjad ja laest tilgub vett.', 'Empty maintenance vault. The concrete walls are wet and ceiling drips.');
                break;

            case 209:
                this.showThought('Metalluks avaneb väga aeglaselt. Ukse taga laiub veelgi suurem tunnel.', 'The heavy floodgate grinds open revealing an even larger water cavern.');
                break;

            case 210:
                this.showThought('Suur tunnel, mille keskel voolab vesi. Mõlemal pool on kitsad kõnniteed.', 'Large vaulted tunnel with a central torrent and narrow walkways on both flanks.');
                break;

            case 211:
                this.showThought('Kaugelt kostab sammude moodi heli... aga kedagi pole näha.', 'Footstep-like echoes reverberate in the distance... yet no one is visible.');
                break;

            case 212:
                this.showThought('⚠️ Tuleb Shadow Dash kanalisatsioonis!', '⚠️ Shadow Dash approaches through the sewer tunnels!');
                this.startShadowRushCarriageEvent(212);
                break;

            case 213:
                this.showThought('Pikk tunnel, kus kõik lambid kustuvad ükshaaval sinu selja taga...', 'Long conduit where floodlights shut off one by one behind you...');
                this.startLightFlickerAnomaly();
                break;

            case 214:
                this.showThought('Leia seinal olev nupp, mis avab järgmise metallukse!', 'Find the circuit button on the wall to open the next door!');
                break;

            case 215:
                this.showThought('Suur tühi ruum. Vesi langeb kõrgemalt alla ja tekitab väga tugeva kaja.', 'Huge subterranean waterfall hall. Rushing water creates thunderous echoes.');
                break;

            case 216:
                this.showThought('Üks tunnel on trellidega suletud. Mine mööda avatud tunnelit edasi.', 'One tunnel is barred with iron grates. Proceed along the open passage.');
                break;

            case 217:
                // Shadow Dash + Water Submerge mechanic
                this.triggerCarriage217SewerShadowDash();
                break;

            case 218:
                this.showThought('Kõik jääb hetkeks täiesti vaikseks. Seejärel kostab kaugelt tugev metallikolin.', 'Everything falls dead silent. Then a sharp metallic clatter echoes from afar.');
                break;

            case 219:
                this.showThought('Uks avaneb automaatselt, kui sellele lähened.', 'The pneumatic door slides open automatically as you approach.');
                break;

            case 220:
                this.showThought('Väga pikk sirge tunnel. Kauguses paistab väike valgus.', 'An exceptionally long tunnel. A faint glimmer glows far in the distance.');
                break;

            case 221:
                this.showThought('Jõuad valguseni — see on vana katkine lamp, mis vaevu särab.', 'You reach the light — only an old broken lamp flickering on the wall.');
                break;

            case 222:
                this.showThought('Suur kanalisatsiooniruum mitme massiivse toruga. Mõnest torust voolab vett tunnelisse.', 'Massive sewer junction with giant rusted industrial pipes.');
                break;

            case 223:
                this.showThought('Üks toru hakkab tugevalt värisema! Liigu sellest eemale!', 'One of the massive steam pipes vibrates violently! Step away from it!');
                break;

            case 224:
                this.showThought('Trellidega suletud ala. Trellide taga laiub tühi pimedus.', 'Barred iron enclosure with vast darkness beyond.');
                break;

            case 225:
                this.showThought('Metallist kõnnitee üle vee. Kõndides kostab tugev metallikaja.', 'Grated catwalk suspended above deep water. Footsteps echo loudly.');
                break;

            case 226:
                this.showThought('Kõik tuled kustuvad... mõne sekundi pärast lähevad need uuesti põlema.', 'Total blackout... a few seconds later the lights pulse back on.');
                this.startLightFlickerAnomaly();
                break;

            case 227:
                this.showThought('Kuuled enda taga vee pritsimist. Kui pöörad ümber — pole seal kedagi.', 'You hear water splashing behind you. When you turn — nothing is there.');
                break;

            case 228:
                this.showThought('Suur uks avaneb ja pääsed järgmisse sügavasse tunnelisse.', 'The blast door rises, opening the way to the next deep conduit.');
                break;

            case 229:
                this.showThought('Tunnel muutub kitsamaks. Mõlemal pool kõrguvad märjad betoonseinad.', 'The channel narrows between towering damp concrete walls.');
                break;

            case 230:
                this.showThought('Vesi hakkab tunnelis kõrgemale tõusma! Liigu kiiresti edasi!', 'The water level is rising! Move forward quickly!');
                break;

            case 231:
                this.showThought('Jõuad kõrgele kuivale platvormile. Vesi voolab selle all.', 'You step onto a high dry platform. Rushing water flows underneath.');
                break;

            case 232:
                this.showThought('Platvormi kõrval on suured trellid, mis ulatuvad laeni.', 'Tall iron grates line the platform reaching all the way to the ceiling.');
                break;

            case 233:
                this.showThought('Trellide taga kustub üks lamp ja kostab tugev kolks.', 'Beyond the grates a lamp snaps off followed by a heavy metallic thump.');
                break;

            case 234:
                this.showThought('Pikk tühi tunnel. Ainult vee voolamise heli kajab laes.', 'Long deserted conduit. Only the sound of flowing water fills the space.');
                break;

            case 235:
                this.showThought('Leiad vana juhtpaneeli. Nupu vajutamisel avaneb järgmine metalluks!', 'You find an old control console. Pressing the switch unlocks the next floodgate!');
                break;

            case 236:
                this.showThought('Uks sulgub kohe pärast läbimist selja taga.', 'The steel door seals shut behind you as soon as you step through.');
                break;

            case 237:
                this.showThought('Suur ruum, kus vesi voolab mitmes erinevas kanalis.', 'Large subterranean reservoir where water splits into multiple aqueducts.');
                break;

            case 238:
                this.showThought('Üks kanal on trellidega blokeeritud. Teisel pool voolab vesi meeletu kiirusega.', 'One channel is barred by heavy grates with a roaring torrent behind.');
                break;

            case 239:
                this.showThought('Liigu mööda kitsast rada suure veekanali kõrval.', 'Follow the narrow walkway bordering the roaring canal.');
                break;

            case 240:
                this.showThought('Kauguses on näha suurt ümmargust betoontunnelit.', 'In the distance, a massive circular concrete aqueduct looms ahead.');
                break;

            case 241:
                this.showThought('Sisenesid ümmargusse tunnelisse. Vesi voolab mööda selle keskosa.', 'You enter the giant circular conduit. Water rushes along its center.');
                break;

            case 242:
                this.showThought('Tunnelis olevad lambid hakkavad järjest vilkuma.', 'The arched ceiling lights begin to flicker sequentially.');
                this.startLightFlickerAnomaly();
                break;

            case 243:
                this.showThought('Üks metalluks on lahti. Selle taga on täiesti pime ruum.', 'An open iron doorway leads into a pitch-black chamber.');
                break;

            case 244:
                this.showThought('Lähed pimedast ruumist läbi ja jõuad tagasi suuremasse veetunnelisse.', 'You make your way through the darkness back into the main conduit.');
                break;

            case 245:
                this.showThought('Suur trellidega värav blokeerib tee. Selle kõrval on vana roostes kang.', 'A massive portcullis blocks the way. A rusty iron lever sits beside it.');
                break;

            case 246:
                this.showThought('Tõmbad kangi ja trellidega värav hakkab aeglaselt üles kerkima!', 'You pull the lever and the heavy iron gate grinds slowly upward!');
                metroAudio.playDoorSlide(true);
                break;

            case 247:
                this.showThought('Värava avanemise ajal hakkab vesi tugevalt lainetama. Oota, kuni tee vabaneb!', 'Surging water churns beneath the lifting gate. Wait for clear passage!');
                break;

            case 248:
                this.showThought('Pärast väravat jätkub suur tunnel. Ees paistab tohutu metalluks!', 'Past the gate, the cavern opens up towards a massive steel blast door!');
                break;

            case 249:
                this.showThought('Jõuad metallukse juurde. Ukse taga on kuulda väga nõrka metroorongi heli!', 'You reach the blast door. Faint subway train reverberations echo from beyond!');
                break;

            case 250:
                // ── VAGUN 250: KANALISATSIOONI OSA LÕPP ──
                this.triggerCarriage250SewerEnd();
                break;

            // ── VAGUNID 251–300 — SÜGAV METROO JA LÕPP ────────────────────────────

            case 251:
                this.showThought('Seisad maa-aluse metrooraja kõrval. Mõlemal pool on ainult pimedus. Kauguses vilgub üksik lamp.', 'You stand beside deep subterranean tracks. Pitch darkness all around, a single lamp blinking.');
                break;

            case 252:
                this.showThought('Liigud mööda rööbaste kõrval olevat kitsast rada. Kaugelt kostab metrooheli, kuid rongi pole näha.', 'Walking along the railway bed. Distant train sounds rumble with no train in sight.');
                break;

            case 253:
                this.showThought('Rööbaste kõrval seisab vana metroovagun. Selle uks on lahti, kuid sees pole mitte kedagi.', 'A derelict subway coach rests beside the track with open doors. Empty inside.');
                break;

            case 254:
                this.showThought('Kui vagunist möödud, sulgub selle uks iseenesest!', 'As you walk past the derelict coach, its pneumatic doors slam shut on their own!');
                metroAudio.playDoorSlide(false);
                break;

            case 255:
                this.showThought('Vana ekraan seinal süttib ja näitab ainult: „002”.', 'An old display lights up on the bulkhead displaying solely: “002”.');
                break;

            case 256:
                this.showThought('Kuuled enda selja taga samme. Kui pöörad ümber, pole seal kedagi.', 'You hear footsteps trailing behind. Turning around reveals nothing.');
                break;

            case 257:
                // Shadow Dash + Maintenance Room Hideout
                this.triggerCarriage257MaintenanceHideout();
                break;

            case 258:
                this.showThought('Hooldusruumi seintele on kirjutatud palju kordi sama number: 002.', 'The maintenance room walls are etched hundreds of times with the number: 002.');
                break;

            case 259:
                this.showThought('Väljud ruumist. Rööbastel seisab nüüd vana rong, mida enne seal ei olnud.', 'Exiting the room, an ancient ghost train now rests silently on the rails.');
                break;

            case 260:
                this.showThought('Rong seisab täiesti vaikselt. Kõik selle aknad on pigimustad.', 'The ghost train rests in absolute stillness. All windows are opaque black.');
                break;

            case 261:
                this.showThought('Rongist kostab korraks koputus vastu akent... keegi on sees.', 'A sharp tap on the window glass echoes from inside the phantom coach.');
                metroAudio.playWhisper(3.0);
                break;

            case 262:
                this.showThought('Möödud viimasest aknast — seal liigub korraks vari!', 'As you pass the final window, a dark silhouette shifts inside!');
                break;

            case 263:
                this.showThought('Rööbaste kohal hakkavad lambid järjest kustuma, liikudes sinu suunas!', 'Tunnel floodlights snap off sequentially overhead, racing toward you!');
                this.startLightFlickerAnomaly();
                break;

            case 264:
                this.showThought('Jõuad suure metallukse juurde. Uks avaneb iseenesest.', 'You arrive at a giant bulkhead. The heavy door glides open on its own.');
                metroAudio.playDoorSlide(true);
                break;

            case 265:
                this.showThought('Ukse taga on pikk tunnel. Sealt kostab väga vaikne hingamise moodi heli.', 'Beyond is a cavernous conduit. A faint, rhythmic breathing sound echoes.');
                break;

            case 266:
                this.showThought('Liigud edasi. Hingamise heli muutub iga sammuga valjemaks...', 'Moving forward. The breathing sound grows louder with each step...');
                break;

            case 267:
                this.showThought('Järsku jääb kõik täiesti vaikseks.', 'Suddenly, utter and profound silence engulfs the tunnel.');
                break;

            case 268:
                this.showThought('Sinu ees seisab vana metroovagun, mis blokeerib kogu tunneli.', 'A giant vintage subway carriage stands directly ahead, barring the tunnel.');
                break;

            case 269:
                this.showThought('Vagun hakkab aeglaselt ise liikuma, kuigi selles pole juhti!', 'The empty carriage begins to roll forward on its own with no driver aboard!');
                break;

            case 270:
                this.showThought('Kui vagun ära liigub, on selle taga ainult tühi ja lõputu tunnel.', 'As the coach rolls away, only a vast empty tunnel remains.');
                break;

            case 271:
                this.showThought('Näed kauguses inimest meenutavat kuju. Kuju seisab täiesti liikumatult.', 'In the distance, a motionless humanoid silhouette stands in the gloom.');
                break;

            case 272:
                this.showThought('Kui lähened, kustuvad tuled. Kui need tagasi süttivad, on kuju kadunud!', 'As you approach, lights extinguish. When they return, the figure is gone!');
                this.startLightFlickerAnomaly();
                break;

            case 273:
                this.showThought('Vana kõlar hakkab tööle: „Palun ärge lahkuge rongist.”', 'An antique PA speaker crackles: “Please do not leave the train.”');
                metroAudio.playWhisper(4.0);
                break;

            case 274:
                this.showThought('Kõlar ütleb sama lauset uuesti, aga seekord teise, moonutatud häälega.', 'The speaker repeats the announcement, but in a distorted, unnatural voice.');
                break;

            case 275:
                this.showThought('Kõik metroouksed tunneli ääres avanevad korraga!', 'All subway doors along the tunnel wall snap open simultaneously!');
                metroAudio.playDoorSlide(true);
                break;

            case 276:
                this.showThought('Ühe ukse taga laiub ainult täielik ja põhjatu pimedus.', 'Beyond one of the open doorways lies only total, bottomless darkness.');
                break;

            case 277:
                this.showThought('Jookse kiiresti järgmise valgustatud alani!', 'Hurry forward to the next illuminated station sector!');
                break;

            case 278:
                this.showThought('Valgustatud alal on vana metrookaart. Sellel pole enam ühtegi tavalist jaama.', 'A vintage transit chart hangs on the wall. All normal stations are gone.');
                break;

            case 279:
                this.showThought('Kaardi kõige all on üksainus uus märge: „300”.', 'At the bottom of the map is a single handwritten destination: “300”.');
                break;

            case 280:
                this.showThought('Kuuled metroorongi lähenemist. Rongi tuled paistavad kauguses!', 'You hear a subway train approaching! Its twin headlights pierce the darkness!');
                break;

            case 281:
                this.showThought('Rong sõidab sinust väga kiiresti mööda, kuid ei tee peaaegu üldse heli.', 'The ghost train rushes past at extreme speed, making almost no sound at all.');
                break;

            case 282:
                this.showThought('Pärast rongi möödumist on rööbaste kõrval üks uus metalluks.', 'After the train passes, a new reinforced blast door appears beside the tracks.');
                break;

            case 283:
                this.showThought('Uks avaneb, kui sellele lähened.', 'The heavy door slides open as you draw near.');
                metroAudio.playDoorSlide(true);
                break;

            case 284:
                this.showThought('Ukse taga on suur tühi metroohall. Lagi on nii kõrge, et seda pole näha.', 'Beyond lies a colossal vaulted metro cathedral hall.');
                break;

            case 285:
                this.showThought('Halli keskel ripub vana ekraan. See näitab: „KATSE 002 – VIIMANE ETAPP.”', 'Suspended in the center, an old CRT screen flashes: “EXPERIMENT 002 – FINAL PHASE.”');
                break;

            case 286:
                this.showThought('Ekraan kustub ja langeb pimedusse.', 'The display snaps off into complete darkness.');
                break;

            case 287:
                this.showThought('Kõik uksed hallis sulguvad korraga!', 'All bulkhead doors in the grand hall slam shut simultaneously!');
                metroAudio.playDoorSlide(false);
                break;

            case 288:
                this.showThought('Leia juhtpaneel, et uksed uuesti avada!', 'Find the circuit console to restore power and reopen the doors!');
                break;

            case 289:
                this.showThought('Juhtpaneeli leidmisel kostab sinu selja tagant tugev metallikolin!', 'As you locate the panel, a heavy metallic clang echoes behind your back!');
                break;

            case 290:
                this.showThought('Sa ei näe midagi, kuid kuuled aeglaseid samme lähenemas...', 'You see nothing in the dark, but hear slow footsteps pacing closer...');
                break;

            case 291:
                this.showThought('Sammud jäävad sinu lähedal seisma.', 'The footsteps stop just a few feet away.');
                break;

            case 292:
                this.showThought('Tuled lähevad põlema. Kedagi pole!', 'The floodlights snap on! The hall is empty!');
                this.startLightFlickerAnomaly();
                break;

            case 293:
                this.showThought('Halli kaugemas otsas avaneb suur värav!', 'A giant arched gateway rumbles open at the far end of the hall!');
                metroAudio.playDoorSlide(true);
                break;

            case 294:
                this.showThought('Selle taga on taas metroorööpad, mis viivad sügavamale maa alla.', 'Beyond lie the deep railway tracks descending to the final terminal.');
                break;

            case 295:
                this.showThought('Kõlar ütleb hoiatavalt: „Ära mine 300-ni.”', 'The speaker intones a final warning: “Do not proceed to 300.”');
                metroAudio.playWhisper(4.0);
                break;

            case 296:
                this.showThought('Metroorong ilmub pimedusest ja peatub sinu ees.', 'A metro train emerges from the black tunnel and halts before you.');
                break;

            case 297:
                this.showThought('Rongi uksed avanevad. Sees on tühi vagun, mille ekraanil vilgub „300”.', 'The train doors slide open. Inside is an empty coach flashing “300”.');
                break;

            case 298:
                this.showThought('Vagun seisab paigal — rongi sisse ei saa minna, pead minema mööda platvormi.', 'The train rests stationary — follow the platform alongside.');
                break;

            case 299:
                this.showThought('Kõik vaguni tuled kustuvad. Ekraanile ilmub: „KATSE 002 EI LÕPPENUD.” Sosin: „Sa jõudsid liiga kaugele.”', 'Lights extinguish. Screen: “EXPERIMENT 002 DID NOT END.” Whisper: “You came too far.”');
                metroAudio.playWhisper(5.0);
                break;

            case 300:
                // ── VAGUN 300: METROOJAAM JA VÄLJAPÄÄS (GRAND FINALE) ──
                this.triggerCarriage300Finale();
                break;

            default:
                if (index > 300) {
                    this.showThought(
                        `Vagun ${index}. Metroo sõidab lõputusse... (🪙 ${this.coins} Coini)`,
                        `Carriage ${index}. The metro rides on endlessly... (🪙 ${this.coins} Coins)`
                    );
                }
                break;
        }
    }

    private _spawnCarriage200Switches() {
        this.kuuljaSwitches = [];
        this.kuuljaSwitchesActivated = 0;
        const switchPositions = [
            { pos: new THREE.Vector3(9.2, 1.4, 0.0), label: 'PEATOIDE' }  // 1 switch on platform main wall
        ];

        switchPositions.forEach((item, i) => {
            const swGroup = new THREE.Group();
            swGroup.name = `kuulja_switch_${i + 1}`;

            // 1. High-visibility yellow/black hazard backplate
            const hazardCanvas = document.createElement('canvas');
            hazardCanvas.width = 128;
            hazardCanvas.height = 128;
            const hctx = hazardCanvas.getContext('2d');
            if (hctx) {
                hctx.fillStyle = '#ffd32a';
                hctx.fillRect(0, 0, 128, 128);
                hctx.fillStyle = '#111111';
                for (let x = -128; x < 256; x += 32) {
                    hctx.beginPath();
                    hctx.moveTo(x, 0);
                    hctx.lineTo(x + 16, 0);
                    hctx.lineTo(x + 16 + 128, 128);
                    hctx.lineTo(x + 128, 128);
                    hctx.fill();
                }
            }
            const hazardTex = new THREE.CanvasTexture(hazardCanvas);
            const hazardPlate = new THREE.Mesh(
                new THREE.BoxGeometry(0.7, 1.1, 0.04),
                new THREE.MeshStandardMaterial({ map: hazardTex, roughness: 0.5 })
            );
            swGroup.add(hazardPlate);

            // 2. Industrial Control Box
            const boxMat = new THREE.MeshStandardMaterial({ color: 0x22272e, metalness: 0.8, roughness: 0.3 });
            const box = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.75, 0.25), boxMat);
            box.position.set(0, 0, 0.12);
            swGroup.add(box);

            // 3. Glowing LED Indicator Dome on box (Red = Off, Green = On)
            const indicatorMat = new THREE.MeshBasicMaterial({ color: 0xff2222 });
            const indicatorDome = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 16), indicatorMat);
            indicatorDome.position.set(0, 0.20, 0.25);
            indicatorDome.name = 'switch_indicator_dome';
            swGroup.add(indicatorDome);

            // 4. Subtle Point Light for indicator glow
            const light = new THREE.PointLight(0xff2222, 1.4, 3.5);
            light.position.set(0, 0.20, 0.28);
            swGroup.add(light);

            // 5. Nameplate label mounted directly on control box
            const labelCanvas = document.createElement('canvas');
            labelCanvas.width = 256;
            labelCanvas.height = 128;
            const lctx = labelCanvas.getContext('2d');
            if (lctx) {
                lctx.fillStyle = '#0a0d14';
                lctx.fillRect(0, 0, 256, 128);
                lctx.strokeStyle = '#ffd32a';
                lctx.lineWidth = 6;
                lctx.strokeRect(6, 6, 244, 116);
                lctx.fillStyle = '#ffd32a';
                lctx.font = 'bold 36px monospace';
                lctx.textAlign = 'center';
                lctx.fillText(`⚡ LÜLITI ${item.label}`, 128, 75);
            }
            const labelTex = new THREE.CanvasTexture(labelCanvas);
            const labelMesh = new THREE.Mesh(
                new THREE.PlaneGeometry(0.42, 0.16),
                new THREE.MeshBasicMaterial({ map: labelTex })
            );
            labelMesh.position.set(0, 0.02, 0.25);
            swGroup.add(labelMesh);

            // 6. Pull-down Lever on lower part of box
            const leverMat = new THREE.MeshStandardMaterial({ color: 0xffd32a, roughness: 0.3, metalness: 0.7 });
            const leverArm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.28, 0.08), leverMat);
            leverArm.position.set(0, -0.20, 0.26);
            leverArm.name = 'switch_lever';
            swGroup.add(leverArm);

            swGroup.position.copy(item.pos);
            this.scene.add(swGroup);
            this.kuuljaSwitches.push({ mesh: swGroup, activated: false });
        });
    }

    private _spawnKuuljaBoss() {
        if (this.kuuljaBossGroup) this.scene.remove(this.kuuljaBossGroup);

        const kuulja = new THREE.Group();
        kuulja.name = 'kuulja_boss';

        const skinMat = new THREE.MeshStandardMaterial({
            color: 0x111620,
            roughness: 0.35,
            metalness: 0.6
        });
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0033 });
        const clawMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2, metalness: 0.9 });

        // Tall very skinny body (2.7m tall)
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.28, 2.2, 12), skinMat);
        body.position.set(0, 1.2, 0);
        kuulja.add(body);

        // Highlighted metallic ribcage
        for (let r = 0; r < 4; r++) {
            const rib = new THREE.Mesh(new THREE.TorusGeometry(0.24 + r * 0.01, 0.025, 8, 16), skinMat);
            rib.rotation.x = Math.PI / 2;
            rib.position.set(0, 1.0 + r * 0.28, 0);
            kuulja.add(rib);
        }

        // Large smooth head
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 16, 16), skinMat);
        head.position.set(0, 2.45, 0);
        kuulja.add(head);

        // Glowing red eyes (clearly visible in the dark and light)
        [-0.1, 0.1].forEach(ex => {
            const eye = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 12), eyeMat);
            eye.position.set(ex, 2.5, 0.3);
            kuulja.add(eye);
        });

        // Red light emitted from head for eerie silhouette visibility
        const headLight = new THREE.PointLight(0xff0033, 2.4, 8.0);
        headLight.position.set(0, 2.5, 0.4);
        kuulja.add(headLight);

        // Long jointed arms with sharp claws
        [-0.38, 0.38].forEach(ax => {
            const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 2.0, 8), skinMat);
            arm.position.set(ax, 1.3, 0);
            arm.rotation.z = ax > 0 ? -0.25 : 0.25;
            kuulja.add(arm);

            // Claws on hands
            for (let c = -0.04; c <= 0.04; c += 0.04) {
                const claw = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.25, 6), clawMat);
                claw.rotation.x = Math.PI / 2;
                claw.position.set(ax + c, 0.2, 0.1);
                kuulja.add(claw);
            }
        });

        kuulja.position.set(5.5, 0, -10.0);
        this.scene.add(kuulja);
        this.kuuljaBossGroup = kuulja;
    }

    public activateKuuljaSwitch(index: number) {
        if (index < 0 || index >= this.kuuljaSwitches.length) return;
        const sw = this.kuuljaSwitches[index];
        if (sw.activated) return;
        sw.activated = true;
        this.kuuljaSwitchesActivated++;

        // Visual change to green for dome, indicator light, and lever pull
        const pointLight = sw.mesh.children.find(c => c instanceof THREE.PointLight) as THREE.PointLight;
        if (pointLight) pointLight.color.setHex(0x2ed573);

        const dome = sw.mesh.getObjectByName('switch_indicator_dome') as THREE.Mesh;
        if (dome) (dome.material as THREE.MeshBasicMaterial).color.setHex(0x2ed573);

        const lever = sw.mesh.getObjectByName('switch_lever');
        if (lever) lever.rotation.x = 0.6;

        metroAudio.playKeypadBeep(true);

        // Make Kuulja rush toward switch
        if (this.kuuljaBossGroup) {
            this.kuuljaHearingAlert = true;
            this.kuuljaTargetPos.copy(sw.mesh.position);
            const alertEl = document.getElementById('kuulja-alert-overlay');
            if (alertEl) alertEl.style.display = 'block';
            setTimeout(() => {
                this.kuuljaHearingAlert = false;
                if (alertEl) alertEl.style.display = 'none';
            }, 3500);
        }

        if (this.kuuljaSwitchesActivated >= 1) {
            this.station200SwitchesDone = true;
            this.showThought(
                '⚡ LÜLITI ON SEES! Rongi toide on taastatud! Mine kiiresti tagasi metroosse enne kui Kuulja su kätte saab!',
                '⚡ MAIN SWITCH ACTIVATED! Metro power restored! Run back inside the train before the Listener catches you!'
            );

            // Power up all station and train lights
            if (this.currentCarriage) {
                this.currentCarriage.lights.forEach(l => { l.color.setHex(0xffffff); l.intensity = 2.0; });
            }
            metroAudio.playAnnouncementChime();
        }
    }

    public triggerCarriage200TrainDeparture() {
        if (this.station200Departing) return;
        this.station200Departing = true;
        this.state = 'cutscene_carriage200' as any;
        this.introSideDoorsOpen = false;
        metroAudio.playDoorChime();
        setTimeout(() => {
            metroAudio.playDoorSlide(false);
        }, 300);

        this.showThought(
            '🚇 JÕUDSID METROOSSE! Uksed sulgusid ja rong alustab sõitu järgmisse jaama!',
            '🚇 YOU BOARDED THE METRO! Doors sealed shut and train departs into the tunnels!'
        );

        if (this.kuuljaBossGroup) {
            this.kuuljaBossGroup.position.set(2.4, 0, this.playerPos.z);
            this.kuuljaBossGroup.lookAt(this.playerPos.x, 0, this.playerPos.z);
            metroAudio.playShadowRushScreech();
        }

        // Camera shakes slightly and train accelerates
        let departElapsed = 0;
        const departInterval = setInterval(() => {
            departElapsed += 50;
            this.trainSpeed = Math.min(65, this.trainSpeed + 2.0);
            this.cameraEuler.z = (Math.random() - 0.5) * 0.04;
            if (departElapsed >= 2200) {
                clearInterval(departInterval);
                this.cameraEuler.z = 0;
                this.state = 'player_free';
                this.loadCarriage(201, 'right');
            }
        }, 50);
        this.carriage200CutsceneTimers.push(departInterval);
    }

    public _finishCarriage200Boss() {
        this.station200SwitchesDone = true;
        this.triggerCarriage200TrainDeparture();
    }

    private triggerCarriage201SewerIntro() {
        this.carriage201IntroPlayed = true;
        const titleOverlay = document.getElementById('canalization-title-overlay');
        if (titleOverlay) {
            titleOverlay.style.display = 'flex';
            setTimeout(() => {
                titleOverlay.style.display = 'none';
                this.showThought(
                    'Kukkusid vette... Tõused aeglaselt püsti. Ees on suur betoontunnel ja vesi.',
                    'You plunged into water... Slowly getting up. A concrete sewer tunnel stretches ahead.'
                );
            }, 5000);
        }
    }

    private triggerCarriage217SewerShadowDash() {
        this.showThought(
            '⚠️ SHADOW DASH TULEB! LAMA VEES [C / E], et peita! (Kuni 20s)',
            '⚠️ SHADOW DASH INCOMING! SUBMERGE IN WATER [C / E] to hide! (Up to 20s)'
        );

        this.startShadowRushCarriageEvent(217);

        // Track submerge survival in loop
        let elapsed = 0;
        const subCheck = setInterval(() => {
            if (!this.shadowRushActive) {
                clearInterval(subCheck);
                this.emergeFromSewerWater();
                return;
            }
            elapsed += 0.5;
            if (this.sewerWaterSubmerged) {
                if (elapsed >= 10) {
                    const canvas = this.renderer.domElement;
                    if (canvas) canvas.style.filter = 'grayscale(0.8)';
                }
                if (elapsed >= 20) {
                    this.playerHp = Math.max(0, this.playerHp - 5);
                    this.updateHealthUI();
                }
            } else {
                // Standing during Shadow rush = death
                if (Math.abs(this.playerPos.z) < 5.0) {
                    clearInterval(subCheck);
                    this.triggerDraggedDeath(1);
                }
            }
        }, 500);
    }

    private triggerCarriage250SewerEnd() {
        this.carriage250DoorOpened = true;
        this.showThought(
            '🌟 KANALISATSIOONI OSA LÕPP! Metalluks avaneb ja ees paistavad metroorööpad.',
            '🌟 CANALIZATION COMPLETE! The blast door opens revealing deep subway tracks.'
        );
        metroAudio.playDoorSlide(true);
    }

    private triggerCarriage257MaintenanceHideout() {
        this.showThought(
            '🚨 SHADOW DASH LÄHENEB! MINE PEIDA HOOLDUSRUUMI! 🚨',
            '🚨 SHADOW DASH INCOMING! HIDE INSIDE THE MAINTENANCE ROOM! 🚨'
        );
        this.startShadowRushCarriageEvent(257);
    }

    private triggerCarriage300Finale() {
        this.showThought(
            '☀️ VAGUN 300 — METROOJAAM JA VÄLJAPÄÄS! Astu mööda pikka platvormi metallukseni!',
            '☀️ CARRIAGE 300 — SUBWAY TERMINAL & FINAL EXIT! Walk along the long platform to the blast door!'
        );

        setTimeout(() => {
            this.triggerVictory300();
        }, 5000);
    }
}
