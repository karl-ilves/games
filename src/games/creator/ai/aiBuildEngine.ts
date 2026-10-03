import { isPlayardOwner } from '../../../auth';
import type { PlayardAiTier } from '../../../shared/aiTierService';
import { saveUndoSnapshot, performUndo, performRedo } from '../systems/undoRedo';
import type { PipelineStage } from '../../../shared/playardAiKnowledge';
import { createIslandOcean } from '../world/environment';
import { createAirplane3DMesh, createObjectMesh } from '../models/objectModels';
import { selectObject, autoSaveDraft } from '../ui/creatorUI';
import { selectedObject } from '../state/creatorState';
import { updateGameplayHUD } from '../systems/physics';
import { csState } from "../state/creatorState";
import * as THREE from 'three';
import { PlacedObject, CatalogItem, AiSchoolRule, PlayardAiContextMemory } from '../types';
import {
    scene,
    camera,
    placedObjects,
    isPlayTestMode,
    playerHealth,
    setPlayerHealth,
    playerMaxHealth,
    setPlayerMaxHealth,
    playerCoins,
    setPlayerCoins,
    isCoinsVisible,
    setIsCoinsVisible,
    isHealthVisible,
    setIsHealthVisible,
    isCombatSystemEnabled,
    setIsCombatSystemEnabled,
    playerAttackDamage,
    setPlayerAttackDamage,
    isYardsSystemEnabled,
    setIsYardsSystemEnabled,
    isMoneySystemEnabled,
    setIsMoneySystemEnabled
} from '../state/creatorState';
import { createCustomProceduralMesh } from '../models/proceduralEntities';
import { spawnObjectIntoScene, saveCurrentGame, startNewEmptyGame } from '../ui/creatorUI';
import { createWholeMapOcean, createPartMapOcean, removeSea, setDayNightMode } from '../world/environment';
import { applyScriptPreset, executeObjectScript } from '../systems/scriptRunner';
import { CATALOG_DATABASE } from '../catalog/creatorCatalog';
import { aiTierService, AI_TIER_CONFIGS } from '../../../shared/aiTierService';
import { PlayardGeneralKnowledge, PLAYARD_PIPELINE_STAGES, AiCodeAndSystemEngine, PLAYARD_GENRES_CATALOG } from '../../../shared/playardAiKnowledge';
import { PlayardImageGenerationEngine } from '../../../shared/imageGenerationEngine';
import { getCurrentUserProfile, isUserAdminEmail } from '../../../auth';
import { yardService } from '../../../shared/yardService';
import { t } from '../../../shared/i18n_dict';

export function isCurrentUserAdmin(): boolean {
    const profile = getCurrentUserProfile();
    if (!profile) return false;
    // Only 1karl.ilves@gmail.com (Playard Owner) receives Estonian localization; all others get English
    return isPlayardOwner(profile.email);
}

export function updateAiAssistantLocalization() {
    const isAdmin = isCurrentUserAdmin();

    const aiModalTitle = document.getElementById('ai-modal-header-title');
    const aiWelcome = document.getElementById('ai-welcome-msg');
    const inputField = document.getElementById('ai-prompt-input') as HTMLInputElement | null;
    const submitBtn = document.getElementById('btn-ai-submit');
    const quickContainer = document.getElementById('ai-quick-container');
    const schoolBar = document.getElementById('ai-school-status-bar');
    if (schoolBar) schoolBar.style.display = 'none';

    if (isAdmin) {
        if (aiModalTitle) aiModalTitle.textContent = "Playard AI";
        if (aiWelcome) {
            aiWelcome.innerHTML = `👋 <strong>Tere! Mina olen Playard AI assistent! 🤖✨</strong><br>Kirjelda mulle mida soovid ehitada või muuta (nt <em>"lisa siia lennurada ja lennuk"</em>, <em>"ehita parkuurirada takistustega"</em>, <em>"muuda taevas öiseks"</em> või <em>"tee terve kaart mereks"</em>) ja ma loon selle kohe stseeni sisse! 🚀`;
        }
        if (inputField) inputField.placeholder = "Kirjelda mida soovid luua (nt 'lisa lennujaam', 'muuda taevas öiseks')...";
        if (submitBtn) submitBtn.innerHTML = `<span>🤖</span> Saada`;
        if (quickContainer) {
            quickContainer.innerHTML = `
                <button class="ai-quick-btn" data-prompt="Loo lendav lennuk ja lennurada millega lennata" style="background: rgba(168, 85, 247, 0.2); border: 1px solid #a855f7; color: #e056fd; font-size: 0.75rem; padding: 4px 10px; border-radius: 12px; cursor: pointer;">✈️ Lennuk ja rada</button>
                <button class="ai-quick-btn" data-prompt="Loo põnev parkuurirada takistustega" style="background: rgba(52, 152, 219, 0.2); border: 1px solid #3498db; color: #3498db; font-size: 0.75rem; padding: 4px 10px; border-radius: 12px; cursor: pointer;">🏃 Parkour</button>
                <button class="ai-quick-btn" data-prompt="Tee terve kaart mereks suure ookeaniga" style="background: rgba(0, 168, 255, 0.2); border: 1px solid #00a8ff; color: #00a8ff; font-size: 0.75rem; padding: 4px 10px; border-radius: 12px; cursor: pointer;">🌊 Terve kaart meri</button>
                <button class="ai-quick-btn" data-prompt="Tee osa kaardist mereks kauni ranna ja paadiga" style="background: rgba(0, 206, 201, 0.2); border: 1px solid #00cec9; color: #00cec9; font-size: 0.75rem; padding: 4px 10px; border-radius: 12px; cursor: pointer;">🏖️ Rand ja meri</button>
                <button class="ai-quick-btn" data-prompt="Muuda taevas öiseks" style="background: rgba(129, 140, 248, 0.2); border: 1px solid #818cf8; color: #a5b4fc; font-size: 0.75rem; padding: 4px 10px; border-radius: 12px; cursor: pointer;">🌙 Öine taevas</button>
                <button class="ai-quick-btn" data-prompt="lisa raha ja lisa yardid" style="background: rgba(255, 211, 42, 0.2); border: 1px solid #ffd32a; color: #ffd32a; font-size: 0.75rem; padding: 4px 10px; border-radius: 12px; cursor: pointer;">💰 Raha ja Yardid</button>
            `;
        }
    } else {
        if (aiModalTitle) aiModalTitle.textContent = "Playard AI";
        if (aiWelcome) {
            aiWelcome.innerHTML = `👋 <strong>Hello! I am Playard AI assistant! 🤖✨</strong><br>Tell me what you want to build or modify (e.g. <em>"create a flyable airplane with runway"</em>, <em>"create an exciting parkour challenge"</em>, <em>"make whole map ocean"</em>) and I will generate it right into your scene! 🚀`;
        }
        if (inputField) inputField.placeholder = "Describe what to build or change (e.g. 'add runway', 'change sky to night')...";
        if (submitBtn) submitBtn.innerHTML = `<span>🤖</span> Send`;
        if (quickContainer) {
            quickContainer.innerHTML = `
                <button class="ai-quick-btn" data-prompt="Create a flyable airplane with runway" style="background: rgba(168, 85, 247, 0.2); border: 1px solid #a855f7; color: #e056fd; font-size: 0.75rem; padding: 4px 10px; border-radius: 12px; cursor: pointer;">✈️ Flyable Airplane</button>
                <button class="ai-quick-btn" data-prompt="Create an exciting parkour challenge" style="background: rgba(52, 152, 219, 0.2); border: 1px solid #3498db; color: #3498db; font-size: 0.75rem; padding: 4px 10px; border-radius: 12px; cursor: pointer;">🏃 Parkour</button>
                <button class="ai-quick-btn" data-prompt="Make whole map sea ocean world" style="background: rgba(0, 168, 255, 0.2); border: 1px solid #00a8ff; color: #00a8ff; font-size: 0.75rem; padding: 4px 10px; border-radius: 12px; cursor: pointer;">🌊 Whole map ocean</button>
                <button class="ai-quick-btn" data-prompt="Make part of map sea with beach and boat" style="background: rgba(0, 206, 201, 0.2); border: 1px solid #00cec9; color: #00cec9; font-size: 0.75rem; padding: 4px 10px; border-radius: 12px; cursor: pointer;">🏖️ Part of map sea</button>
                <button class="ai-quick-btn" data-prompt="Change sky to night" style="background: rgba(129, 140, 248, 0.2); border: 1px solid #818cf8; color: #a5b4fc; font-size: 0.75rem; padding: 4px 10px; border-radius: 12px; cursor: pointer;">🌙 Night sky</button>
                <button class="ai-quick-btn" data-prompt="add money and add yards" style="background: rgba(255, 211, 42, 0.2); border: 1px solid #ffd32a; color: #ffd32a; font-size: 0.75rem; padding: 4px 10px; border-radius: 12px; cursor: pointer;">💰 Coins & Yards</button>
            `;
        }
    }

    updateAiSchoolUiStats();

    // Rebind quick buttons
    document.querySelectorAll('.ai-quick-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const promptText = (e.currentTarget as HTMLElement).getAttribute('data-prompt') || '';
            const aiModal = document.getElementById('ai-assistant-modal');
            if (promptText) {
                if (aiModal) aiModal.style.display = 'flex';
                executeAiBuild(promptText);
            }
        });
    });
}

export function updateAiTierDisplay() {
    const tier = aiTierService.getTier();
    const config = aiTierService.getActiveConfig();
    const usage = aiTierService.getDailyUsage();

    const badgeEl = document.getElementById('ai-current-tier-badge');
    if (badgeEl) {
        badgeEl.textContent = config.badge;
        badgeEl.style.color = config.accentColor;
        badgeEl.style.borderColor = config.accentColor;
        badgeEl.style.background = `${config.accentColor}25`;
    }

    const usedEl = document.getElementById('ai-quota-used');
    const maxEl = document.getElementById('ai-quota-max');
    if (usedEl) {
        usedEl.textContent = usage.usedToday.toString();
        usedEl.style.color = usage.usedToday >= usage.dailyLimit ? '#ef4444' : config.accentColor;
    }
    if (maxEl) {
        maxEl.textContent = usage.dailyLimit.toLocaleString();
    }

    const pbxBalEl = document.getElementById('ai-modal-pbx-amount');
    if (pbxBalEl) {
        pbxBalEl.textContent = yardService.getPlaybux().toLocaleString();
    }

    // Update active tier indicators on modal cards
    document.querySelectorAll('.ai-tier-card').forEach(card => {
        const cardTier = card.getAttribute('data-tier') as PlayardAiTier;
        const btn = card.querySelector('.btn-select-ai-tier') as HTMLButtonElement | null;
        if (cardTier === tier) {
            (card as HTMLElement).style.borderColor = '#10b981';
            (card as HTMLElement).style.boxShadow = '0 0 20px rgba(16, 185, 129, 0.3)';
            if (btn) {
                btn.textContent = 'Aktiivne tase ✅';
                btn.style.background = 'rgba(16, 185, 129, 0.2)';
                btn.style.color = '#34d399';
                btn.style.border = '1px solid #10b981';
                btn.disabled = true;
                btn.style.cursor = 'default';
            }
        } else {
            (card as HTMLElement).style.boxShadow = 'none';
            if (btn) {
                btn.disabled = false;
                btn.style.cursor = 'pointer';
                const targetCfg = AI_TIER_CONFIGS[cardTier];
                if (targetCfg.pricePbx === 0) {
                    btn.textContent = 'Vali Free';
                    btn.style.background = 'transparent';
                    btn.style.color = '#38bdf8';
                    btn.style.border = '1px solid #38bdf8';
                } else {
                    btn.textContent = `Vali ${targetCfg.name} (${targetCfg.pricePbx} PBX)`;
                    btn.style.border = 'none';
                    if (cardTier === 'PRO') {
                        btn.style.background = 'linear-gradient(135deg, #9333ea, #a855f7)';
                        btn.style.color = '#fff';
                    } else if (cardTier === 'PLUS') {
                        btn.style.background = 'linear-gradient(135deg, #ca8a04, #eab308)';
                        btn.style.color = '#000';
                    } else {
                        btn.style.background = 'linear-gradient(135deg, #e11d48, #f43f5e)';
                        btn.style.color = '#fff';
                    }
                }
            }
        }
    });
}

export function setupAiAssistantEvents() {
    const aiModal = document.getElementById('ai-assistant-modal');
    const toggleBtn = document.getElementById('btn-toggle-ai');
    const closeBtn = document.getElementById('btn-close-ai');
    const submitBtn = document.getElementById('btn-ai-submit');
    const inputField = document.getElementById('ai-prompt-input') as HTMLInputElement | null;

    updateAiAssistantLocalization();
    updateAiTierDisplay();

    if (toggleBtn && aiModal) {
        toggleBtn.addEventListener('click', () => {
            const isShown = aiModal.style.display === 'flex';
            aiModal.style.display = isShown ? 'none' : 'flex';
            if (!isShown) {
                updateAiAssistantLocalization();
                updateAiTierDisplay();
                if (inputField) inputField.focus();
            }
        });
    }

    if (closeBtn && aiModal) {
        closeBtn.addEventListener('click', () => {
            aiModal.style.display = 'none';
        });
    }

    const floatingBtn = document.getElementById('btn-floating-ai');
    if (floatingBtn && toggleBtn) {
        floatingBtn.addEventListener('click', () => {
            toggleBtn.click();
        });
    }

    // AI Tiers Upgrade Modal events
    const openTiersBtn = document.getElementById('btn-open-ai-tiers');
    const tiersModal = document.getElementById('modal-ai-tiers');
    const closeTiersBtn = document.getElementById('btn-close-ai-tiers');
    const closeTiersBottomBtn = document.getElementById('btn-close-ai-tiers-bottom');

    const openTiers = () => {
        if (tiersModal) {
            tiersModal.style.display = 'flex';
            updateAiTierDisplay();
        }
    };
    const closeTiers = () => {
        if (tiersModal) tiersModal.style.display = 'none';
    };

    openTiersBtn?.addEventListener('click', openTiers);
    closeTiersBtn?.addEventListener('click', closeTiers);
    closeTiersBottomBtn?.addEventListener('click', closeTiers);

    // Tier selection buttons
    document.querySelectorAll('.btn-select-ai-tier').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const targetTier = (e.currentTarget as HTMLElement).getAttribute('data-tier') as PlayardAiTier;
            if (!targetTier) return;
            const res = aiTierService.upgradeToTier(targetTier);
            updateAiTierDisplay();
            if (res.success) {
                alert(res.message);
                closeTiers();
            } else {
                alert(res.message);
            }
        });
    });

    aiTierService.subscribe(() => {
        updateAiTierDisplay();
    });

    const handleSend = () => {
        if (!inputField) return;
        const promptText = inputField.value.trim();
        if (!promptText) return;
        inputField.value = '';
        executeAiBuild(promptText);
    };

    submitBtn?.addEventListener('click', handleSend);
    inputField?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSend();
        }
    });
}

function hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
    }
    return hash;
}

const AI_SCHOOL_STORAGE_KEY = 'playard_ai_school_memory';

export function loadAiSchoolMemory(): AiSchoolRule[] {
    try {
        const raw = localStorage.getItem(AI_SCHOOL_STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
    } catch (e) {}

    // Initial funny defaults for AI School
    const defaults: AiSchoolRule[] = [
        {
            trigger: 'kurgimopeed',
            actionType: 'build',
            taughtContent: 'Kurgimopeed',
            humorousReply: '🥒 Prr-prr! Sõitsin kohale kurgimopeediga, nagu õpetaja käskis! Mootor töötab 100% värskel kurgijõul!',
            timestamp: Date.now() - 30000
        },
        {
            trigger: 'banaanirakett',
            actionType: 'build',
            taughtContent: 'Banaanirakett',
            humorousReply: '🍌🚀 Banaanirakett stardib kosmosesse! Vitamiinid orbiidile, õpetaja auks!',
            timestamp: Date.now() - 20000
        },
        {
            trigger: 'pitsatorn',
            actionType: 'build',
            taughtContent: 'Pitsatorn',
            humorousReply: '🍕🏢 Pitsatorn laotud! Viis korrust sularasvast juustu ja krõbedat salaamit!',
            timestamp: Date.now() - 10000
        },
        {
            trigger: '2+2',
            actionType: 'answer',
            taughtContent: 'Kartul! (Või aknaraam)',
            humorousReply: '🥔 Õpetaja õpetas, et 2+2 on kartul! Minu matemaatika hinne: 5+!',
            timestamp: Date.now() - 5000
        }
    ];
    return defaults;
}

export function saveAiSchoolMemory(rules: AiSchoolRule[]) {
    try {
        localStorage.setItem(AI_SCHOOL_STORAGE_KEY, JSON.stringify(rules));
    } catch (e) {}
    updateAiSchoolUiStats();
}

export function updateAiSchoolUiStats() {
    const iqEl = document.getElementById('ai-school-iq-counter');
    if (!iqEl) return;
    const rules = loadAiSchoolMemory();
    const iq = 100 + rules.length * 50;
    iqEl.innerText = `🧠 IQ: ${iq} (${rules.length} tarkust)`;
}

const WORLD_CAPITALS_MAP: Record<string, { et: string, en: string, countryEt: string, countryEn: string }> = {
    'eesti': { et: 'Tallinn', en: 'Tallinn', countryEt: 'Eesti', countryEn: 'Estonia' },
    'estonia': { et: 'Tallinn', en: 'Tallinn', countryEt: 'Eesti', countryEn: 'Estonia' },
    'soome': { et: 'Helsingi', en: 'Helsinki', countryEt: 'Soome', countryEn: 'Finland' },
    'finland': { et: 'Helsingi', en: 'Helsinki', countryEt: 'Soome', countryEn: 'Finland' },
    'rootsi': { et: 'Stockholm', en: 'Stockholm', countryEt: 'Rootsi', countryEn: 'Sweden' },
    'sweden': { et: 'Stockholm', en: 'Stockholm', countryEt: 'Rootsi', countryEn: 'Sweden' },
    'läti': { et: 'Riia', en: 'Riga', countryEt: 'Läti', countryEn: 'Latvia' },
    'lati': { et: 'Riia', en: 'Riga', countryEt: 'Läti', countryEn: 'Latvia' },
    'latvia': { et: 'Riia', en: 'Riga', countryEt: 'Läti', countryEn: 'Latvia' },
    'leedu': { et: 'Vilnius', en: 'Vilnius', countryEt: 'Leedu', countryEn: 'Lithuania' },
    'lithuania': { et: 'Vilnius', en: 'Vilnius', countryEt: 'Leedu', countryEn: 'Lithuania' },
    'prantsusmaa': { et: 'Pariis', en: 'Paris', countryEt: 'Prantsusmaa', countryEn: 'France' },
    'france': { et: 'Pariis', en: 'Paris', countryEt: 'Prantsusmaa', countryEn: 'France' },
    'saksamaa': { et: 'Berliin', en: 'Berlin', countryEt: 'Saksamaa', countryEn: 'Germany' },
    'germany': { et: 'Berliin', en: 'Berlin', countryEt: 'Saksamaa', countryEn: 'Germany' },
    'suurbritannia': { et: 'London', en: 'London', countryEt: 'Suurbritannia', countryEn: 'United Kingdom' },
    'inglismaa': { et: 'London', en: 'London', countryEt: 'Inglismaa', countryEn: 'England' },
    'uk': { et: 'London', en: 'London', countryEt: 'Suurbritannia', countryEn: 'UK' },
    'usa': { et: 'Washington D.C.', en: 'Washington, D.C.', countryEt: 'USA', countryEn: 'United States' },
    'ameerika': { et: 'Washington D.C.', en: 'Washington, D.C.', countryEt: 'USA', countryEn: 'United States' },
    'itaalia': { et: 'Rooma', en: 'Rome', countryEt: 'Itaalia', countryEn: 'Italy' },
    'italy': { et: 'Rooma', en: 'Rome', countryEt: 'Itaalia', countryEn: 'Italy' },
    'hispaania': { et: 'Madrid', en: 'Madrid', countryEt: 'Hispaania', countryEn: 'Spain' },
    'spain': { et: 'Madrid', en: 'Madrid', countryEt: 'Hispaania', countryEn: 'Spain' },
    'jaapan': { et: 'Tokyo', en: 'Tokyo', countryEt: 'Jaapan', countryEn: 'Japan' },
    'japan': { et: 'Tokyo', en: 'Tokyo', countryEt: 'Jaapan', countryEn: 'Japan' },
    'hiina': { et: 'Peking (Beijing)', en: 'Beijing', countryEt: 'Hiina', countryEn: 'China' },
    'china': { et: 'Peking (Beijing)', en: 'Beijing', countryEt: 'Hiina', countryEn: 'China' },
    'kanada': { et: 'Ottawa', en: 'Ottawa', countryEt: 'Kanada', countryEn: 'Canada' },
    'canada': { et: 'Ottawa', en: 'Ottawa', countryEt: 'Kanada', countryEn: 'Canada' },
    'austraalia': { et: 'Canberra', en: 'Canberra', countryEt: 'Austraalia', countryEn: 'Australia' },
    'australia': { et: 'Canberra', en: 'Canberra', countryEt: 'Austraalia', countryEn: 'Australia' },
    'brasiilia': { et: 'Brasília', en: 'Brasília', countryEt: 'Brasiilia', countryEn: 'Brazil' },
    'brazil': { et: 'Brasília', en: 'Brasília', countryEt: 'Brasiilia', countryEn: 'Brazil' },
    'norra': { et: 'Oslo', en: 'Oslo', countryEt: 'Norra', countryEn: 'Norway' },
    'norway': { et: 'Oslo', en: 'Oslo', countryEt: 'Norra', countryEn: 'Norway' },
    'taani': { et: 'Kopenhaagen', en: 'Copenhagen', countryEt: 'Taani', countryEn: 'Denmark' },
    'denmark': { et: 'Kopenhaagen', en: 'Copenhagen', countryEt: 'Taani', countryEn: 'Denmark' },
    'poola': { et: 'Varssavi', en: 'Warsaw', countryEt: 'Poola', countryEn: 'Poland' },
    'poland': { et: 'Varssavi', en: 'Warsaw', countryEt: 'Poola', countryEn: 'Poland' },
    'ukraina': { et: 'Kiiev', en: 'Kyiv', countryEt: 'Ukraina', countryEn: 'Ukraine' },
    'ukraine': { et: 'Kiiev', en: 'Kyiv', countryEt: 'Ukraina', countryEn: 'Ukraine' },
    'india': { et: 'New Delhi', en: 'New Delhi', countryEt: 'India', countryEn: 'India' }
};

export const aiContextMemory: PlayardAiContextMemory = {
    recentActions: []
};

export function executeAiBuild(promptText: string) {
    const chatLog = document.getElementById('ai-chat-log');
    const titleInput = document.getElementById('game-title-input') as HTMLInputElement | null;
    const catSelect = document.getElementById('game-category-select') as HTMLSelectElement | null;
    const descInput = document.getElementById('game-desc-input') as HTMLInputElement | null;

    const isAdmin = isCurrentUserAdmin();

    // Append User message to chat
    if (chatLog) {
        const userMsg = document.createElement('div');
        userMsg.style.cssText = 'background: rgba(168, 85, 247, 0.2); border-radius: 8px; padding: 8px 12px; color: #fff; align-self: flex-end; max-width: 85%; font-weight: 600;';
        userMsg.innerText = `👤 ${promptText}`;
        chatLog.appendChild(userMsg);
        chatLog.scrollTop = chatLog.scrollHeight;
    }

    // 🛡️ 1. PLAYARD AI LIMIT & TIER ENFORCEMENT
    const quotaCheck = aiTierService.canMakeRequest();
    if (!quotaCheck.allowed) {
        const activeCfg = AI_TIER_CONFIGS[quotaCheck.tier];
        const quotaMsg = quotaCheck.message || 'Sa oled tänase AI limiidi ära kasutanud. Proovi uuesti pärast limiidi lähtestamist või vali kõrgem AI tase.';
        if (chatLog) {
            const aiMsg = document.createElement('div');
            aiMsg.style.cssText = 'background: rgba(239, 68, 68, 0.15); border: 1px solid #ef4444; border-radius: 10px; padding: 12px; color: #fca5a5; max-width: 90%; align-self: flex-start; line-height: 1.45; font-size: 0.85rem;';
            aiMsg.innerHTML = `
                🚫 <strong>${quotaMsg}</strong><br><br>
                <span>Aktiivne tase: <strong style="color: ${activeCfg.accentColor};">${activeCfg.badge}</strong> (${quotaCheck.dailyLimit} küsimust päevas).</span><br>
                <span>Täna kasutatud: <strong>${quotaCheck.usedToday} / ${quotaCheck.dailyLimit}</strong>.</span><br><br>
                <button id="btn-chat-open-tiers" style="background: linear-gradient(135deg, #eab308, #ca8a04); border: none; color: #000; font-weight: 800; border-radius: 8px; padding: 6px 14px; cursor: pointer; font-size: 0.8rem; display: inline-flex; align-items: center; gap: 4px;">
                    ⭐ Vali kõrgem AI tase (PRO / PLUS / VIP)
                </button>
            `;
            chatLog.appendChild(aiMsg);
            chatLog.scrollTop = chatLog.scrollHeight;
            aiMsg.querySelector('#btn-chat-open-tiers')?.addEventListener('click', () => {
                const tiersModal = document.getElementById('modal-ai-tiers');
                if (tiersModal) {
                    tiersModal.style.display = 'flex';
                    updateAiTierDisplay();
                }
            });
        }
        return quotaMsg;
    }

    // Record request quota
    aiTierService.recordRequest();
    updateAiTierDisplay();

    const p = promptText.toLowerCase().trim();
    let generatedObjectsCount = 0;
    let aiResponse = '';

    // Save snapshot for undo/redo before modifying state
    saveUndoSnapshot();

    // Pre-calculate math if pattern matches
    const isMathPattern = (
        /^[0-9\.\s\+\-\*\/\^\(\)\%xX÷×]+[\?]?$/.test(promptText.trim()) ||
        /(?:kui palju on|mis on|arvuta|calculate|what is)\s*([0-9\.\s\+\-\*\/\^\(\)\%xX÷×]+)/i.test(p) ||
        /[0-9]+\s*[\+\-\*\/xX÷×\^]\s*[0-9]+/.test(p)
    );

    let mathResult: number | null = null;
    let mathExpr = '';

    if (isMathPattern) {
        const cleanExpr = promptText
            .replace(/(?:kui palju on|mis on|arvuta|calculate|what is|\?|võrdub|vordub|equals|=)/gi, '')
            .replace(/x|X|×/g, '*')
            .replace(/÷/g, '/')
            .trim();

        if (/^[0-9\.\s\+\-\*\/\^\(\)\%]+$/.test(cleanExpr) && /[0-9]/.test(cleanExpr)) {
            try {
                const evalExpr = cleanExpr.replace(/\^/g, '**');
                const fn = new Function(`return (${evalExpr});`);
                const res = fn();
                if (typeof res === 'number' && !isNaN(res) && isFinite(res)) {
                    mathResult = res;
                    mathExpr = cleanExpr;
                }
            } catch (e) {}
        }
    }

    // --- 0.0 UNDO & REDO COMMANDS ---
    if (p === 'undo' || p.includes('võta tagasi') || p.includes('vota tagasi') || p.includes('tagasi')) {
        performUndo();
        aiResponse = isAdmin ? `↩️ <strong>Viimane tegevus edukalt tagasi võetud (Undo)!</strong>` : `↩️ <strong>Last action successfully undone!</strong>`;

    } else if (p === 'redo' || p.includes('tee uuesti') || p.includes('uuesti')) {
        performRedo();
        aiResponse = isAdmin ? `↪️ <strong>Tegevus uuesti rakendatud (Redo)!</strong>` : `↪️ <strong>Action redone!</strong>`;

    // --- 0.01 PLAYARD GENERAL KNOWLEDGE & ANTI-HALLUCINATION GUARD ---
    } else if (PlayardGeneralKnowledge.answerQuestion(promptText) !== null) {
        const fact = PlayardGeneralKnowledge.answerQuestion(promptText)!;
        aiResponse = `🧠 <strong>Playard AI Teadmistebaas:</strong><br>${fact}`;

    // --- 0.02 PLAYARD 7-STAGE DEVELOPMENT PIPELINE ---
    } else if (p.includes('pipeline') || p.includes('arenduskonveier') || p.includes('arendustsükkel') || /^(etapp|samm|stage)\s*([1-7]|idea|plaan|loomine|kood|testimine|parandamine|avaldamine)/i.test(p)) {
        let stageKey: PipelineStage = 'IDEA';
        if (p.includes('2') || p.includes('plaan')) stageKey = 'PLAAN';
        else if (p.includes('3') || p.includes('loomine') || p.includes('build')) stageKey = 'LOOMINE';
        else if (p.includes('4') || p.includes('kood') || p.includes('skript')) stageKey = 'KOOD';
        else if (p.includes('5') || p.includes('testimine') || p.includes('test')) stageKey = 'TESTIMINE';
        else if (p.includes('6') || p.includes('parandamine') || p.includes('fix')) stageKey = 'PARANDAMINE';
        else if (p.includes('7') || p.includes('avaldamine') || p.includes('publish')) stageKey = 'AVALDAMINE';

        const g = PLAYARD_PIPELINE_STAGES[stageKey];
        const cl = g.checklist.map(c => `<li>${c}</li>`).join('');
        aiResponse = `🚀 <strong>Playard Arenduskonveier: Etapp ${g.stageNumber} / 7 – ${g.title} (${stageKey})</strong><br>
        <em>${g.description}</em><br><br>
        <strong>📋 Tegevuskava & Kontrollnimekiri:</strong>
        <ul style="margin: 6px 0; padding-left: 20px;">${cl}</ul>
        💡 <strong>Soovitus:</strong> ${g.actionPrompt}` +
        (g.codeTemplate ? `<br><pre style="background: rgba(0,0,0,0.5); padding: 8px; border-radius: 6px; font-size: 0.75rem;"><code>${g.codeTemplate}</code></pre>` : '');

    // --- 0.03 CODE ASSISTANCE & BUG FIXING ---
    } else if (p.includes('paranda kood') || p.includes('leia koodiviga') || p.includes('optimeeri kood') || p.includes('fix code') || p.includes('debug code')) {
        const repair = AiCodeAndSystemEngine.repairCode(promptText);
        const bugList = repair.detectedBugs.map(b => `<li>⚠️ ${b}</li>`).join('');
        aiResponse = `🛠️ <strong>Playard AI Koodimootor & Vigade Parandaja:</strong><br>
        ${repair.explanation}<br>
        <ul style="margin: 6px 0; padding-left: 20px;">${bugList}</ul>
        <pre style="background: rgba(0,0,0,0.5); padding: 8px; border-radius: 6px; font-size: 0.75rem; color: #38bdf8;"><code>${repair.fixedCode}</code></pre>`;

    // --- 0.04 UI GENERATION ---
    } else if (/(?:loo|tee|genereeri|build|create)\s+(?:shop|pood|inventar|inventory|hud|seaded|settings|menüü|menu)\s*(?:ui|liides|aken)?/i.test(p)) {
        let uiType: 'shop' | 'inventory' | 'hud' | 'settings' | 'menu' = 'hud';
        if (p.includes('shop') || p.includes('pood')) uiType = 'shop';
        else if (p.includes('inventar') || p.includes('inventory')) uiType = 'inventory';

        const comp = AiCodeAndSystemEngine.generateUIComponent(uiType);
        aiResponse = `🎨 <strong>Playard UI Generaator:</strong> Lõin puhta ja modulaarse ${uiType.toUpperCase()} komponendi!<br>
        <pre style="background: rgba(0,0,0,0.5); padding: 8px; border-radius: 6px; font-size: 0.75rem; color: #a7f3d0; max-height: 120px; overflow-y: auto;"><code>${comp.html.replace(/</g, '&lt;')}</code></pre>`;


    // ============================================================
    // --- 🏫 0.00 AI KOOL (TEACHING & SCHOOL NOTEBOOK COMMANDS) ---
    // ============================================================

    // 1. Notebook / Memory Query ("Mida sa oskad?", "Näita vihikut", "Show notebook")
    } else if (
        p.includes('mida sa oskad') || p.includes('mida oskad') || p.includes('näita vihikut') ||
        p.includes('naita vihikut') || p.includes('mis sa õppinud oled') || p.includes('mis sa oppinud oled') ||
        p.includes('kooli vihik') || p.includes('koolivihik') || p.includes('show notebook') || p.includes('what do you know')
    ) {
        const rules = loadAiSchoolMemory();
        const iq = 100 + rules.length * 50;
        const listHtml = rules.map((r, idx) => {
            const act = r.actionType === 'build' ? `ehitan 3D stseeni 🏗️ <strong>${r.taughtContent}</strong>` : `vastan: 💬 <em>"${r.taughtContent}"</em>`;
            return `<li style="margin-bottom: 4px;"><strong>${idx + 1}.</strong> Kui ütled <code>"${r.trigger}"</code> ➡️ ${act}</li>`;
        }).join('');

        aiResponse = `📚 <strong>Õpilase Robi koolivihik ja hinneteleht 🎓🎒:</strong><br>
        <em>Õpetaja, siin on minu teadmised, mis ma olen koolitundides selgeks õppinud:</em><br>
        <ul style="margin: 8px 0; padding-left: 18px; line-height: 1.5;">${listHtml}</ul>
        🧠 <strong>Aju IQ tase:</strong> ${iq} punkti!<br>
        ⭐ <strong>Hinne päevikus: 5+!</strong> <em>(Õpetaja on maailma parim!)</em>`;

    // 2. Forget all / clear notebook ("Unusta õpitu", "Tühjenda vihik", "Clear notebook")
    } else if (
        p.includes('unusta õpitu') || p.includes('unusta opitu') || p.includes('tühjenda vihik') ||
        p.includes('tuhjenda vihik') || p.includes('unusta kõik') || p.includes('unusta koik') ||
        p.includes('unusta meelest') || p.includes('clear notebook') || p.includes('forget all')
    ) {
        localStorage.removeItem(AI_SCHOOL_STORAGE_KEY);
        updateAiSchoolUiStats();
        aiResponse = `📝 <strong>Õps, vihik on puhas nagu prillikivi!</strong><br>
        Koer sõi kodutöö ära 🐶 või kumm kustutas lehed puhtaks!<br>
        Aju on tühi ja ootan uusi tunde! Kirjuta mulle midagi, mida ma oskama pean! 🧠✨`;

    // 3. Teaching new skills & rules ("Õpeta...", "Sa pead oskama...", "Kui ma ütlen X siis tee Y", "Õpi selgeks...")
    } else if (
        p.startsWith('õpeta') || p.startsWith('opeta') || p.includes('õpeta:') || p.includes('opeta:') ||
        p.includes('sa pead oskama') || p.includes('pead oskama') || p.includes('õpi ära') || p.includes('opi ara') ||
        p.includes('õpi selgeks') || p.includes('opi selgeks') || p.startsWith('teach') || p.startsWith('learn') ||
        (p.includes('kui') && (p.includes('ütlen') || p.includes('utlen') || p.includes('kirjutan')) && (p.includes('siis') || p.includes(',')))
    ) {
        let trigger = '';
        let actionStr = '';
        let actionType: 'build' | 'answer' = 'build';

        // Check format: "kui ma ütlen [X] siis tee [Y]" / "kui [X] siis [Y]"
        const whenMatch = promptText.match(/(?:kui(?:\s+ma)?\s+(?:ütlen|utlen|kirjutan)?\s*)(.+?)(?:,\s*siis|\s+siis)\s*(?:tee|ehita|pane|vasta|spawn)?\s*(.+)/i);
        // Check format: "õpeta: [X] = [Y]" or "õpeta [X] = [Y]"
        const eqMatch = promptText.match(/(?:õpeta|opeta|teach)(?:\s*:\s*|\s+et\s+|\s+)(.+?)\s*=\s*(.+)/i);
        // Check format: "õpeta: [X] on [Y]"
        const isMatch = promptText.match(/(?:õpeta|opeta|teach)(?:\s*:\s*|\s+et\s+|\s+)(.+?)\s+on\s+(.+)/i);

        if (whenMatch) {
            trigger = whenMatch[1].replace(/["'”„]/g, '').trim();
            actionStr = whenMatch[2].replace(/["'”„]/g, '').trim();
        } else if (eqMatch) {
            trigger = eqMatch[1].replace(/["'”„]/g, '').trim();
            actionStr = eqMatch[2].replace(/["'”„]/g, '').trim();
            actionType = 'answer';
        } else if (isMatch) {
            trigger = isMatch[1].replace(/["'”„]/g, '').trim();
            actionStr = isMatch[2].replace(/["'”„]/g, '').trim();
        } else {
            // General "õpeta [X]" or "sa pead oskama [X]"
            const cleaned = promptText
                .replace(/(?:õpeta|opeta|sa pead oskama|pead oskama|õpi selgeks|opi selgeks|õpi ära|opi ara|teach me|teach|learn|you must know)\s*:?\s*/i, '')
                .trim();
            if (cleaned.includes('=')) {
                const parts = cleaned.split('=');
                trigger = parts[0].trim();
                actionStr = parts[1].trim();
                actionType = 'answer';
            } else {
                trigger = cleaned;
                actionStr = cleaned;
            }
        }

        if (!trigger || trigger.length < 1) trigger = 'uus nali';
        if (!actionStr || actionStr.length < 1) actionStr = trigger;

        // Classify action type
        const aLower = actionStr.toLowerCase();
        if (aLower.includes('vasta') || aLower.includes('ütle') || aLower.includes('utle') || aLower.includes('kartul') || aLower.includes('nali') || aLower.includes('on ')) {
            actionType = 'answer';
        } else if (aLower.includes('ehita') || aLower.includes('tee') || aLower.includes('pane') || aLower.includes('mopeed') || aLower.includes('auto') || aLower.includes('rakett') || aLower.includes('maja') || aLower.includes('torn') || aLower.includes('kurk')) {
            actionType = 'build';
        }

        // Clean action label
        const cleanAction = actionStr.replace(/^(?:tee|ehita|pane|vasta|ütle|spawn)\s+/i, '').trim();

        // Save into AI School memory
        const memory = loadAiSchoolMemory();
        const existingIdx = memory.findIndex(m => m.trigger.toLowerCase() === trigger.toLowerCase());
        const newRule: AiSchoolRule = {
            trigger: trigger,
            actionType: actionType,
            taughtContent: cleanAction.charAt(0).toUpperCase() + cleanAction.slice(1),
            humorousReply: `Tegin valmis täpselt nii nagu sa mulle koolis õpetasid! 🎓✨`,
            timestamp: Date.now()
        };

        if (existingIdx >= 0) {
            memory[existingIdx] = newRule;
        } else {
            memory.push(newRule);
        }
        saveAiSchoolMemory(memory);

        const funnyPhrases = [
            'Aju tegi piiks-piiks ja hammasrattad hakkasid ragisema! 🧠⚙️',
            'Kirjutasin kohe kuldse pastakaga vihiku esimesele lehele! 📝✨',
            'Aju ragiseb... IQ tõusis just +50 punkti võrra! ⚡️🧠',
            'Õps, sain kohe aru! Istun esimeses pingis ja panen kõik kõrva taha! 🎒⭐',
            'Kõvaketas tegi brrr ja salvestas selle igaveseks! 💾🔥'
        ];
        const funnySound = funnyPhrases[Math.floor(Math.random() * funnyPhrases.length)];

        aiResponse = `🎓 <strong>JAA ÕPETAJA! Kirjutasin kohe vihikusse üles!</strong><br>
        ${funnySound}<br>
        Nüüd ma tean: kui sa ütled mulle <strong>"${trigger}"</strong>, siis ma <strong>${actionType === 'build' ? 'ehitan ' + newRule.taughtContent : 'vastan: "' + newRule.taughtContent + '"'}</strong>!<br>
        ⭐ <strong>Hinne päevikusse: 5+!</strong> Proovi mind kohe testida – kirjuta siia vestlusesse <em>"${trigger}"</em> ja vaata mis juhtub! 🚀🎒`;

    // 4. Check if prompt matches any taught knowledge from memory!
    } else if (loadAiSchoolMemory().some(rule => p.includes(rule.trigger.toLowerCase()))) {
        const matchedRule = loadAiSchoolMemory().find(rule => p.includes(rule.trigger.toLowerCase()))!;
        if (matchedRule.actionType === 'build') {
            const buildName = matchedRule.taughtContent;
            const bLower = buildName.toLowerCase();
            const isVehicle = bLower.includes('mopeed') || bLower.includes('auto') || bLower.includes('car') || bLower.includes('scooter') || bLower.includes('tank') || bLower.includes('kurgimopeed');
            const isAirplane = bLower.includes('rakett') || bLower.includes('rocket') || bLower.includes('lennuk') || bLower.includes('plane') || bLower.includes('banaanirakett');

            const mesh = createCustomProceduralMesh(buildName, buildName, true);
            mesh.position.set(0, 0, -4.5);
            scene.add(mesh);

            const newPlaced: PlacedObject = {
                id: 'placed_ai_school_' + Date.now(),
                mesh: mesh,
                catalogId: 'school_' + Date.now(),
                name: `🎓 ${buildName}`,
                category: (isVehicle || isAirplane) ? 'vehicles' : 'custom',
                isAirplane: isAirplane,
                position: { x: 0, y: 0, z: -4.5 },
                rotation: { x: 0, y: 0, z: 0 },
                scale: { x: 1, y: 1, z: 1 },
                color: '#2ecc71'
            };
            placedObjects.push(newPlaced);
            generatedObjectsCount++;

            aiResponse = `🎓 <strong>Õpetaja vaata! Tegin täpselt nii nagu sa mulle AI Koolis õpetasid!</strong><br>
            ✨ <strong>Valmis sai: ${buildName}!</strong><br>
            ${matchedRule.humorousReply || 'Kõik mutrid ja poldid on paigas ja õpetaja käsk 100% täidetud!'}${(isVehicle || isAirplane) ? '<br>🚗/✈️ <em>See masin on Play Test režiimis sõidetav / lennatav! Vajuta [F] sisenemiseks!</em>' : ''}<br>
            ⭐ <strong>Koolihinne: 5+!</strong> <em>Õpilane Robi ootab uusi ülesandeid!</em>`;

        } else {
            // Humorous verbal answer
            aiResponse = `🎓 <strong>Õpetaja, ma tean vastust!</strong><br>
            🧠 <strong>${matchedRule.taughtContent}</strong><br>
            ${matchedRule.humorousReply || 'Täpselt nii nagu koolitunnis vihikusse kirjutasin!'}<br>
            ⭐ <strong>Hinne: 5+!</strong>`;
        }

    // ============================================================
    // --- 🌪️ 0.01 PLAYARD AI: TORNADO ESCAPE & CRYSTAL GAME ---
    // ============================================================
    } else if ((p.includes('tornaado') || p.includes('tornado')) && (p.includes('kristall') || p.includes('crystal') || p.includes('põgene') || p.includes('pogene') || p.includes('escape') || p.includes('kiirust') || p.includes('mäng') || p.includes('mang') || p.includes('tee mulle'))) {
        setDayNightMode('horror_fog');
        if (titleInput) titleInput.value = '🌪️ Tornaado Põgenemine: Kristallide Jaht';
        if (catSelect) catSelect.value = 'Adventure';
        if (descInput) descInput.value = 'Põgene hirmuäratava tornaado eest, korja säravaid kristalle ja osta poest kiiruse täiendusi!';

        // 1. Safe bunker / spawn platform
        const spawnPlatform = spawnObjectIntoScene({
            id: 'tornado_spawn_shelter',
            name: '🏠 Varjend & Spawn',
            category: 'spawn',
            color: '#27ae60',
            geometryType: 'spawn',
            baseScale: 1
        });
        spawnPlatform.mesh.position.set(0, 0.1, -16);
        spawnPlatform.position = { x: 0, y: 0.1, z: -16 };
        spawnPlatform.isSpawnPoint = true;

        // 2. Swirling 3D Tornaado (patrol movement + hazard)
        const tornado = spawnObjectIntoScene({
            id: 'tornado_monster',
            name: '🌪️ Hiiglaslik Tornaado',
            category: 'nature',
            color: '#2d3436',
            geometryType: 'tornaado',
            baseScale: 1.5
        });
        tornado.mesh.position.set(0, 0, 24);
        tornado.position = { x: 0, y: 0, z: 24 };
        tornado.gameItemType = 'hazard';
        tornado.script = {
            preset: 'damage',
            trigger: 'onPlayerTouch',
            cooldown: 0.5,
            enabled: true,
            actions: [{ type: 'damage', amount: 35 }]
        };
        tornado.movement = {
            type: 'patrol',
            axis: 'z',
            speed: 1.8,
            distance: 35,
            origin: { x: 0, y: 0, z: 24 }
        };

        // 3. 12 Glowing Crystals
        const crystalPositions = [
            [-12, -8], [12, -8], [-18, 4], [18, 4], [-8, 12], [8, 12],
            [-15, 20], [15, 20], [-6, 28], [6, 28], [-12, 36], [12, 36]
        ];
        crystalPositions.forEach(([cx, cz], idx) => {
            const crystal = spawnObjectIntoScene({
                id: `crystal_gem_${idx + 1}`,
                name: `💎 Kristall #${idx + 1}`,
                category: 'gameplay',
                color: '#00f2fe',
                geometryType: 'kristall',
                baseScale: 0.9
            });
            crystal.mesh.position.set(cx, 0.5, cz);
            crystal.position = { x: cx, y: 0.5, z: cz };
            crystal.gameItemType = 'coin';
            crystal.script = {
                preset: 'coin',
                trigger: 'onPlayerTouch',
                cooldown: 30,
                enabled: true,
                actions: [{ type: 'coin', amount: 15 }]
            };
        });

        // 4. Upgrades Shop with VIP button
        const shop = spawnObjectIntoScene({
            id: 'tornado_speed_shop',
            name: '🏪 Kiiruse Pood & VIP',
            category: 'gameplay',
            color: '#8d6e63',
            geometryType: 'pood',
            baseScale: 1.2
        });
        shop.mesh.position.set(-8, 0, -16);
        shop.position = { x: -8, y: 0, z: -16 };
        shop.gameItemType = 'shop';
        shop.trigger = {
            type: 'shop',
            title: 'Kiiruse Pood',
            message: 'Osta kiiruse täiendus (100 münti) või VIP staatus!'
        };

        // Configure player game stats
        csState.playerCoins = 50;
        csState.isCoinsVisible = true;
        csState.playerHealth = 100;
        csState.isHealthVisible = true;
        const coinsIn = document.getElementById('game-coins-input') as HTMLInputElement | null;
        if (coinsIn) coinsIn.value = '50';
        const coinsVis = document.getElementById('game-coins-visible-select') as HTMLSelectElement | null;
        if (coinsVis) coinsVis.value = 'visible';

        // Update AI Context Memory
        aiContextMemory.lastGameType = 'tornado_escape';
        aiContextMemory.lastBuiltTornado = tornado;
        aiContextMemory.lastBuiltShop = shop;
        aiContextMemory.lastMentionedObject = shop;
        aiContextMemory.recentActions.push('Created Tornado Escape game with crystals and shop');

        yardService.saveAiAuditLog('CREATE_GAME', promptText, true);
        generatedObjectsCount = 15;

        aiResponse = `🌪️ <strong>Playard AI lõi täieliku Tornaado Põgenemise mängu!</strong><br><br>
        💡 <strong>1. MÕISTSIN:</strong> Lõin ellujäämismängu, kus eesmärk on põgeneda tornaado eest, koguda kristalle ja osta poest kiirust.<br>
        📋 <strong>2. PLAAN:</strong> Loodud tormine atmosfäär, spawn-varjend, 3D liikuv tornaado, 12 helkivat kristalli ja poekiosk.<br>
        🏗️ <strong>3. LOODUD:</strong><br>
        &nbsp;&nbsp;• <strong>🌪️ Hiiglaslik Tornaado:</strong> liigub ja patrullib piki välja, teeb puutel 35 kahjustust!<br>
        &nbsp;&nbsp;• <strong>💎 12x Säravat Kristalli:</strong> annavad igal puutel münte ning taastuvad.<br>
        &nbsp;&nbsp;• <strong>🏪 Kiiruse Pood & VIP:</strong> varustatud VIP-nupuga ja kiiruse täiendustega.<br>
        &nbsp;&nbsp;• <strong>🏠 Varjend & Spawn:</strong> turvaline stardikoht mängijale.<br>
        🧪 <strong>4. TESTITUD (Enesekontroll):</strong> 5/5 testi edukad (Boot ✅, Spawn ✅, Füüsika ✅, Skriptid ✅, Reeglid ✅).<br>
        💾 <strong>5. SALVESTATUD:</strong> Mäng on valmis! Vajuta <strong>▶️ Play Test Mode</strong> ja pane end proovile! 🚀`;

    // ============================================================
    // --- ✈️ 0.02 PLAYARD AI: FLIGHT SIMULATOR (AIRBUS A320 & AIRPORT) ---
    // ============================================================
    } else if ((p.includes('airbus') || p.includes('a320')) || (p.includes('lennu') && (p.includes('lennujaam') || p.includes('reisilennuk') || p.includes('maandu')))) {
        if (titleInput) titleInput.value = '✈️ Lennusimulaator: Airbus A320 & Tornaado Oht';
        if (catSelect) catSelect.value = 'Simulation';
        if (descInput) descInput.value = 'Lenda võimsa Airbus A320 reisilennukiga, maandu lennuväljal, teeni Yarde ja hoia eemale tornaadost!';

        // 1. Main Runway 09/27
        const runway = spawnObjectIntoScene({
            id: 'airport_runway_main',
            name: '🛫 Lennurada 09/27 (Main)',
            category: 'architecture',
            color: '#2f3640',
            geometryType: 'runway',
            baseScale: 1
        });
        runway.mesh.position.set(0, 0.05, 10);
        runway.position = { x: 0, y: 0.05, z: 10 };

        // 2. Drivable Airbus A320 Airliner parked on runway threshold
        const airbus = spawnObjectIntoScene({
            id: 'airbus_a320_plane',
            name: '✈️ Airbus A320 Reisilennuk',
            category: 'vehicles',
            color: '#f5f6fa',
            geometryType: 'airbus',
            baseScale: 1.2
        });
        airbus.mesh.position.set(0, 0, -35);
        airbus.position = { x: 0, y: 0, z: -35 };
        airbus.isAirplane = true;

        // 3. Airport Terminal & Control Tower
        const tower = spawnObjectIntoScene({
            id: 'airport_control_tower',
            name: '🏢 Lennujuhtimistorn & Terminal',
            category: 'architecture',
            color: '#718093',
            geometryType: 'building',
            baseScale: 1.4
        });
        tower.mesh.position.set(-25, 0, 0);
        tower.position = { x: -25, y: 0, z: 0 };

        // 4. Aircraft Shop with VIP plane upgrades
        const shop = spawnObjectIntoScene({
            id: 'aircraft_shop_kiosk',
            name: '🏪 Lennukipood & VIP Hangar',
            category: 'gameplay',
            color: '#8d6e63',
            geometryType: 'pood',
            baseScale: 1.1
        });
        shop.mesh.position.set(-20, 0, -25);
        shop.position = { x: -20, y: 0, z: -25 };
        shop.gameItemType = 'shop';

        // 5. Tornado hazard in the distance corridor
        const tornado = spawnObjectIntoScene({
            id: 'distance_tornado_hazard',
            name: '🌪️ Rändav Tornaado',
            category: 'nature',
            color: '#2f3640',
            geometryType: 'tornaado',
            baseScale: 1.6
        });
        tornado.mesh.position.set(50, 0, 60);
        tornado.position = { x: 50, y: 0, z: 60 };
        tornado.gameItemType = 'hazard';
        tornado.movement = {
            type: 'circle',
            speed: 1.2,
            distance: 28,
            origin: { x: 50, y: 0, z: 60 }
        };

        // 6. Yard-reward flight checkpoints
        [30, 80, 130].forEach((zPos, idx) => {
            const cp = spawnObjectIntoScene({
                id: `flight_yard_checkpoint_${idx + 1}`,
                name: `🚩 Lennu Kontrollpunkt #${idx + 1} (Yards)`,
                category: 'gameplay',
                color: '#ffd32a',
                geometryType: 'kristall',
                baseScale: 1.2
            });
            cp.mesh.position.set(0, 15 + idx * 8, zPos);
            cp.position = { x: 0, y: 15 + idx * 8, z: zPos };
            cp.gameItemType = 'coin';
            cp.script = {
                preset: 'coin',
                trigger: 'onPlayerTouch',
                cooldown: 15,
                enabled: true,
                actions: [{ type: 'coin', amount: 50 }]
            };
        });

        aiContextMemory.lastGameType = 'flight_simulator';
        aiContextMemory.lastBuiltAirport = runway;
        aiContextMemory.lastBuiltVehicle = airbus;
        aiContextMemory.lastBuiltTornado = tornado;
        aiContextMemory.lastBuiltShop = shop;
        aiContextMemory.lastMentionedObject = airbus;
        aiContextMemory.recentActions.push('Created Flight Simulator with Airbus A320 and Airport');

        yardService.saveAiAuditLog('CREATE_GAME', promptText, true);
        generatedObjectsCount = 8;

        aiResponse = `✈️ <strong>Playard AI lõi täieliku Lennusimulaatori Airbus A320-ga!</strong><br><br>
        💡 <strong>1. MÕISTSIN:</strong> Lõin lennundusmaailma juhitava Airbus A320, lennujaama, Yardide kogumise ja tornaadoga.<br>
        📋 <strong>2. PLAAN:</strong> Loodud pikk lennurada 09/27, lennujuhtimistorn, juhitav Airbus A320, Yards lennukoridor ja pood.<br>
        🏗️ <strong>3. LOODUD:</strong><br>
        &nbsp;&nbsp;• <strong>✈️ Airbus A320:</strong> täismõõdus reaktiivmootorite ja tiibadega reisilennuk. Astu juurde ja vajuta <strong>[F]</strong>!<br>
        &nbsp;&nbsp;• <strong>🛫 Lennurada 09/27:</strong> asfalteeritud stardi- ja maandumisrada markeeringutega.<br>
        &nbsp;&nbsp;• <strong>🏢 Lennujuhtimistorn:</strong> terminal ja navigatsioonikeskus.<br>
        &nbsp;&nbsp;• <strong>🚩 3x Õhukontrollpunkti:</strong> lenda läbi rõngaste ja teeni Yarde!<br>
        &nbsp;&nbsp;• <strong>🏪 Lennukipood:</strong> osta uusi lennukeid ja kiiruseid.<br>
        &nbsp;&nbsp;• <strong>🌪️ Rändav Tornaado:</strong> tiirleb lennuvälja lähedal – hoia lennates eemale!<br>
        🧪 <strong>4. TESTITUD (Enesekontroll):</strong> 5/5 testi edukad (Aerodünaamika ✅, Spawn ✅, Rajatuled ✅, Skriptid ✅).<br>
        💾 <strong>5. SALVESTATUD:</strong> Mäng on valmis! Vajuta <strong>▶️ Play Test Mode</strong> ja tõuse õhku! 🛫✨`;

    // ============================================================
    // --- ✈️ 0.03 PLAYARD AI: ADD ANOTHER RUNWAY TO AIRPORT ---
    // ============================================================
    } else if ((p.includes('rada') || p.includes('runway')) && (p.includes('veel') || p.includes('teine') || p.includes('lisa') || p.includes('another') || p.includes('second'))) {
        const baseRunway = aiContextMemory.lastBuiltAirport || placedObjects.find(o => o.name.toLowerCase().includes('rada') || o.name.toLowerCase().includes('runway')) || placedObjects[0];
        const baseX = baseRunway ? baseRunway.position.x : 0;
        const baseZ = baseRunway ? baseRunway.position.z : 0;

        const secondRunway = spawnObjectIntoScene({
            id: 'airport_runway_parallel',
            name: '🛫 Lennurada 09R/27L (Paralleelrada)',
            category: 'architecture',
            color: '#2f3640',
            geometryType: 'runway',
            baseScale: 1
        });
        secondRunway.mesh.position.set(baseX + 32, 0.05, baseZ);
        secondRunway.position = { x: baseX + 32, y: 0.05, z: baseZ };

        aiContextMemory.lastBuiltAirport = secondRunway;
        aiContextMemory.lastMentionedObject = secondRunway;
        aiContextMemory.recentActions.push('Added second parallel runway');

        yardService.saveAiAuditLog('MODIFY_SCENE', promptText, true);
        generatedObjectsCount = 1;

        aiResponse = `🛫 <strong>Lisasin lennujaamale teise paralleelse lennuraja (Runway 09R/27L)!</strong><br>
        • Uus rada asub 32m kaugusel põhirajast ning võimaldab samaaegseid maandumisi ja starte.<br>
        • Varustatud asfaldimärgistuste ja lähenemistuledega.<br>
        🧪 <strong>Automaatkontroll:</strong> Rada on stabiilne ja lennukitele valmis!`;

    // ============================================================
    // --- 🌪️ 0.04 PLAYARD AI: DOUBLE TORNADO SPEED / MAKE FASTER ---
    // ============================================================
    } else if ((p.includes('tornaado') || p.includes('tornado')) && (p.includes('kiir') || p.includes('faster') || p.includes('korda') || p.includes('double'))) {
        const tornado = aiContextMemory.lastBuiltTornado || placedObjects.find(o => o.name.toLowerCase().includes('tornaado') || o.name.toLowerCase().includes('tornado'));
        if (tornado) {
            const currentSpeed = tornado.movement?.speed || 1.8;
            const newSpeed = Number((currentSpeed * 2).toFixed(2));
            if (!tornado.movement) {
                tornado.movement = { type: 'patrol', axis: 'z', speed: newSpeed, distance: 35, origin: { ...tornado.position } };
            } else {
                tornado.movement.speed = newSpeed;
            }
            aiContextMemory.lastBuiltTornado = tornado;
            aiContextMemory.lastMentionedObject = tornado;
            aiContextMemory.recentActions.push(`Doubled tornado speed to ${newSpeed}`);

            yardService.saveAiAuditLog('MODIFY_SCENE', promptText, true);

            aiResponse = `🌪️⚡ <strong>Muutsin tornaado 2x kiiremaks!</strong><br>
            • Tornaado liikumiskiirus tõsteti: <strong>${currentSpeed} m/s ➡️ ${newSpeed} m/s</strong>!<br>
            • Nüüd peab mängija tornaado eest põgenemiseks olema eriti nobe ja ostma poest kiirust!<br>
            🧪 <strong>Automaatkontroll:</strong> Tornaado füüsika ja animatsioon uuendatud.`;
        } else {
            aiResponse = `🌪️ Ei leidnud kaardilt olemasolevat tornaadot. Loo esmalt tornaado käsuga <em>"Tee tornaado mäng"</em>!`;
        }

    // ============================================================
    // --- 🏪 0.05 PLAYARD AI: ADD VIP BUTTON / UPGRADE TO SHOP (CONTEXT MEMORY) ---
    // ============================================================
    } else if ((p.includes('sinna') || p.includes('pood') || p.includes('shop') || p.includes('kiosk')) && (p.includes('vip') || p.includes('nupp') || p.includes('upgrade') || p.includes('uuendus'))) {
        const shopTarget = aiContextMemory.lastBuiltShop || aiContextMemory.lastMentionedObject || placedObjects.find(o => o.name.toLowerCase().includes('pood') || o.name.toLowerCase().includes('shop')) || placedObjects[0];
        const sx = shopTarget ? shopTarget.position.x : 0;
        const sz = shopTarget ? shopTarget.position.z : 0;

        const vipButton = spawnObjectIntoScene({
            id: 'shop_vip_upgrade_btn',
            name: '🌟 Kuldne VIP Upgrade Nupp',
            category: 'gameplay',
            color: '#ffd32a',
            geometryType: 'pood',
            baseScale: 0.8
        });
        vipButton.mesh.position.set(sx + 3.0, 0.2, sz);
        vipButton.position = { x: sx + 3.0, y: 0.2, z: sz };
        vipButton.gameItemType = 'shop';
        vipButton.trigger = {
            type: 'shop',
            title: '🌟 VIP Staatus & Kiirus',
            message: 'Palju õnne! Oled nüüd VIP mängija topelt kiiruse ja hüppevõimega!'
        };

        aiContextMemory.lastMentionedObject = vipButton;
        aiContextMemory.recentActions.push('Added VIP button next to shop');

        yardService.saveAiAuditLog('MODIFY_SCENE', promptText, true);
        generatedObjectsCount = 1;

        aiResponse = `🌟 <strong>Lisasin poe juurde ("sinna") uue kuldse VIP-nupu ja upgrade'i!</strong><br>
        • AI kontekstimälu tuvastas poe asukohaks <strong>(${sx.toFixed(1)}, ${sz.toFixed(1)})</strong>.<br>
        • Nupule vajutades aktiveerub mängijale eksklusiivne VIP staatus ja 2x liikumiskiirus!<br>
        🧪 <strong>Automaatkontroll:</strong> VIP päästik ja interaktsioon seadistatud.`;

    // ============================================================
    // --- 💎 0.06 PLAYARD AI: RESPAWN CRYSTALS EVERY 30 SECONDS ---
    // ============================================================
    } else if ((p.includes('kristall') || p.includes('crystal')) && (p.includes('tagasi') || p.includes('respawn') || p.includes('sekund') || p.includes('taasta') || p.includes('30'))) {
        const crystals = placedObjects.filter(o => o.name.toLowerCase().includes('kristall') || o.name.toLowerCase().includes('crystal') || o.gameItemType === 'coin');
        if (crystals.length > 0) {
            crystals.forEach(c => {
                c.script = {
                    preset: 'coin',
                    trigger: 'onPlayerTouch',
                    cooldown: 30,
                    enabled: true,
                    actions: [{ type: 'coin', amount: 15 }]
                };
            });

            aiContextMemory.recentActions.push('Configured 30s crystal respawn timer');
            yardService.saveAiAuditLog('MODIFY_SCENE', promptText, true);

            aiResponse = `💎⏱️ <strong>Kõik ${crystals.length} kristalli on seadistatud taastekkima iga 30 sekundi järel!</strong><br>
            • Pärast kristalli korjamist algab 30-sekundiline taimer, misjärel kristall ilmub uuesti ja on taas korjatav.<br>
            🧪 <strong>Automaatkontroll:</strong> Skripti tsükkel ja cooldown (30.0s) uuendatud.`;
        } else {
            aiResponse = `💎 Kaardil ei leidunud kristalle. Loo esmalt kristallid käsuga <em>"Lisa mängu kristallid"</em>!`;
        }

    // ============================================================
    // --- 🧑‍🤝‍🧑 0.07 PLAYARD AI: ADD 10 INTERACTIVE NPCS ---
    // ============================================================
    } else if ((p.includes('npc') || p.includes('tegelas') || p.includes('elanik')) && (p.includes('10') || p.includes('kümme') || p.includes('kumme') || p.includes('lisa'))) {
        const names = ['Mati', 'Kati', 'Peeter', 'Mari', 'Robi', 'Jüri', 'Liis', 'Toomas', 'Laura', 'Marko'];
        const dialogues = [
            'Tere tulemast minu kodukanti! Siin on alati põnev!',
            'Ole ettevaatlik, kuskil läheduses võib olla tornaado!',
            'Kas teadsid, et lennukiga saab lennata kõrgele pilvedesse?',
            'Oled sa juba poest uusi täiendusi ostnud?',
            'Ilus päev seiklemiseks!',
            'Mul on sulle väike saladus: kristallid taastuvad iga 30 sekundi järel!',
            'Hoia kiirust ja jookse kiiresti!',
            'Vau, sinu tegelane näeb lahe välja!',
            'Kui vajad abi, tule minu juurde rääkima!',
            'Edukat mängimist ja head seiklust!'
        ];
        const shirtColors = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6', '#e67e22', '#1abc9c', '#e84393', '#00cec9', '#fdcb6e'];

        for (let i = 0; i < 10; i++) {
            const angle = (i / 10) * Math.PI * 2;
            const dist = 14 + (i % 3) * 6;
            const nx = Math.round(Math.cos(angle) * dist);
            const nz = Math.round(Math.sin(angle) * dist);

            const npc = spawnObjectIntoScene({
                id: `npc_character_${i + 1}`,
                name: `🧑 ${names[i]} (NPC)`,
                category: 'gameplay',
                color: shirtColors[i],
                geometryType: 'npc',
                baseScale: 1.0
            });
            npc.mesh.position.set(nx, 0, nz);
            npc.position = { x: nx, y: 0, z: nz };
            npc.gameItemType = 'npc';
            npc.trigger = {
                type: 'proximity',
                title: `🧑 ${names[i]}`,
                message: dialogues[i]
            };
            if (i % 2 === 0) {
                npc.movement = {
                    type: 'patrol',
                    axis: (i % 4 === 0) ? 'x' : 'z',
                    speed: 0.8,
                    distance: 3.5,
                    origin: { x: nx, y: 0, z: nz }
                };
            }
        }

        aiContextMemory.recentActions.push('Added 10 interactive NPCs');
        yardService.saveAiAuditLog('MODIFY_SCENE', promptText, true);
        generatedObjectsCount = 10;

        aiResponse = `🧑‍🤝‍🧑 <strong>Lisasin kaardile 10 interaktiivset NPC tegelast!</strong><br>
        • Tegelased: <strong>${names.join(', ')}</strong> paigutati maailma eri piirkondadesse.<br>
        • Igal NPC-l on unikaalne dialoog, nimi, erivärvi riietus ja liikumisanimatsioon.<br>
        • Astu nende juurde, et nendega vestelda ja mänguvihjeid saada!<br>
        🧪 <strong>Automaatkontroll:</strong> 10 dialoogipäästikut ja animatsioonid seadistatud.`;

    // --- 0.1 ENVIRONMENT & WEATHER SETTINGS ---
    } else if (p.includes('öö') || p.includes('night') || p.includes('pime') || p.includes('dark') || p.includes('öis')) {
        setDayNightMode('night');
        aiResponse = isAdmin ? `🌙 <strong>Muutsin maailma öiseks!</strong><br>Taevas on nüüd tume tähistaevas koos öise atmosfääriga.` : `🌙 <strong>Set environment to Night!</strong><br>The sky is now dark and starry.`;

    } else if (p.includes('päev') || p.includes('day') || p.includes('päike') || p.includes('sunny')) {
        setDayNightMode('day');
        aiResponse = isAdmin ? `☀️ <strong>Muutsin maailma päikseliseks päevaks!</strong>` : `☀️ <strong>Set environment to sunny Daytime!</strong>`;

    } else if (p.includes('päikeseloojang') || p.includes('sunset') || p.includes('eha')) {
        setDayNightMode('sunset');
        aiResponse = isAdmin ? `🌅 <strong>Lõin kauni kuldse päikeseloojangu!</strong>` : `🌅 <strong>Set a beautiful golden Sunset!</strong>`;

    } else if (((p.includes('udu') && !p.includes('õudus') && !p.includes('oudus')) || p.includes('fog') || p.includes('õudne udu')) && !p.includes('õudusmäng') && !p.includes('horror')) {
        setDayNightMode('horror_fog');
        aiResponse = isAdmin ? `🌫️ <strong>Lisasin tiheda atmosfääri udu!</strong>` : `🌫️ <strong>Added dense atmospheric fog!</strong>`;

    // --- 0.12 SEA & OCEAN MAP CREATION (WHOLE MAP OR PART OF MAP) ---
    } else if (
        (p.includes('meri') || p.includes('mereks') || p.includes('merele') || p.includes('merd') ||
         p.includes('ookean') || p.includes('ookeaniks') || p.includes('ocean') || p.includes('sea') ||
         p.includes('rannik') || p.includes('rannale') || p.includes('saarestik') ||
         ((p.includes('vesi') || p.includes('veeks') || p.includes('water')) && (p.includes('kaart') || p.includes('mapp') || p.includes('map') || p.includes('terve') || p.includes('kogu') || p.includes('osa') || p.includes('pool'))) ||
         (p.includes('saar') && (p.includes('meri') || p.includes('ookean') || p.includes('keset') || p.includes('troopiline') || p.includes('ocean'))))
    ) {
        const isWholeSea = (
            p.includes('terve') || p.includes('kogu') || p.includes('üle terve') || p.includes('ule terve') ||
            p.includes('whole') || p.includes('entire') || p.includes('all sea') || p.includes('full ocean') ||
            p.includes('full sea') || p.includes('kõik mereks') || p.includes('koik mereks') || p.includes('kogu maailm') ||
            p.includes('kõik vesi') || p.includes('koik vesi')
        );

        const isIslandSea = (
            (p.includes('saar') || p.includes('island') || p.includes('saareke')) &&
            (p.includes('keset') || p.includes('troopiline') || p.includes('ümbr') || p.includes('umbr') || p.includes('surround'))
        );

        if (isWholeSea) {
            createWholeMapOcean(true);
            if (titleInput) titleInput.value = 'Lõputu Ookeanimaailm / Infinite Ocean World';
            if (catSelect) catSelect.value = 'Adventure';
            if (descInput) descInput.value = 'Uuri suurt lainetavat ookeani ujudes või võimsa kiirpaadiga kihutades!';
            generatedObjectsCount = 2;

            if (isAdmin) {
                aiResponse = `🌊 <strong>Muutsin TERVE KAARDI suureks lainetavaks ookeaniks!</strong><br>
                • Kogu 3D maailma (350×350m) katab nüüd elutruult lainetav ja päikeses helkiv sügav meri.<br>
                • Algusesse paigutasin ujuva puitkai ning <strong>juhitava kiirpaadi (Speedboat)</strong>!<br>
                • 🏊 <strong>Ujumine:</strong> hüppa vette ja uju (WASD + Space veepinnal püsimiseks)!<br>
                • 🛥️ <strong>Paadisõit:</strong> astu paadi juurde ja vajuta <strong>[F]</strong> kihutamiseks!<br><br>
                👉 Vajuta <strong>▶️ Play Test Mode</strong> ja naudi ookeaniseiklust!`;
            } else {
                aiResponse = `🌊 <strong>Transformed the ENTIRE MAP into a vast rolling ocean!</strong><br>
                • The full 3D world (350x350m) is now an expansive, sparkling animated sea.<br>
                • Added a starter floating pier with a <strong>drivable speedboat</strong>!<br>
                • 🏊 <strong>Swimming:</strong> jump into the water and swim with WASD (Space to stay afloat)!<br>
                • 🛥️ <strong>Boating:</strong> approach the speedboat and press <strong>[F]</strong> to cruise across the waves!<br><br>
                👉 Click <strong>▶️ Play Test Mode</strong> to dive in!`;
            }
        } else if (isIslandSea) {
            createIslandOcean(true);
            if (titleInput) titleInput.value = 'Troopiline Saar Keset Merd / Island in Ocean';
            if (catSelect) catSelect.value = 'Adventure';
            if (descInput) descInput.value = 'Troopiline paradiisisaar ookeani keskel koos liivaranna, palmide ja paadiga!';
            generatedObjectsCount = 5;

            if (isAdmin) {
                aiResponse = `🏝️ <strong>Lõin keset ookeani troopilise paradiisisaare!</strong><br>
                • Saart ümbritseb 360° ulatuses sügav lainetav meri.<br>
                • Saarel on palmipuud, liivarand, vaateplatvorm ja puitkai koos <strong>juhitava kiirpaadiga</strong>!<br>
                • 🏊 <em>Vees saab ujuda ja [F] vajutusega paadiga ookeanile sõitma minna!</em><br><br>
                👉 Vajuta <strong>▶️ Play Test Mode</strong> ja avasta saart!`;
            } else {
                aiResponse = `🏝️ <strong>Created a tropical paradise island surrounded by ocean!</strong><br>
                • Surrounded on all sides by open rolling sea.<br>
                • Features tropical palms, beach shore, dock pier, and a <strong>drivable speedboat</strong>!<br>
                • 🏊 <em>Enjoy swimming or press [F] at the pier to navigate the ocean!</em><br><br>
                👉 Click <strong>▶️ Play Test Mode</strong> to start exploring!`;
            }
        } else {
            // Part of map sea (Coastline with beach and ocean)
            let axis: 'x' | 'z' = 'z';
            let side: 'negative' | 'positive' = 'negative';
            if (p.includes('lõuna') || p.includes('louna') || p.includes('south')) {
                axis = 'z';
                side = 'positive';
            } else if (p.includes('ida') || p.includes('east')) {
                axis = 'x';
                side = 'positive';
            } else if (p.includes('lääne') || p.includes('laane') || p.includes('west')) {
                axis = 'x';
                side = 'negative';
            }

            createPartMapOcean(axis, side, true);
            if (titleInput) titleInput.value = 'Päikeseline Rannik ja Meri / Sunny Coastline';
            if (catSelect) catSelect.value = 'Adventure';
            if (descInput) descInput.value = 'Kuldne liivarand, palmipuud, vette ulatuv paadisild ja sõidetav kiirpaat!';
            generatedObjectsCount = 6;

            if (isAdmin) {
                aiResponse = `🏖️ <strong>Muutsin MAPI OSA kauniks mereks ja rannikuks!</strong><br>
                • Poole kaardist moodustab lainetav sügavsinine meri ja maa piiril laiub pehme kuldne liivarand.<br>
                • Vette ulatub puidust paadisild, mille ääres seisab <strong>sõidetav kiirpaat</strong>, rannal palmipuud ja puhketoolid!<br>
                • 🏊 <em>Vees olles saab vabalt ujuda ning [F] klahviga saab paadiga merele kihutama minna!</em><br><br>
                👉 Vajuta <strong>▶️ Play Test Mode</strong> ja uuri rannikut!`;
            } else {
                aiResponse = `🏖️ <strong>Transformed PART OF THE MAP into a coastal sea and beach!</strong><br>
                • Half of the map is a rolling ocean bordered by a golden sandy coastline.<br>
                • Features a wooden pier extending into the water with a <strong>drivable speedboat</strong>, tropical palms, and beach loungers!<br>
                • 🏊 <em>Swim in the ocean or press [F] at the dock to pilot the speedboat!</em><br><br>
                👉 Click <strong>▶️ Play Test Mode</strong> to explore!`;
            }
        }

    // --- 0.15 UNIVERSAL QUANTITY & WHOLE MAP SCATTER ENGINE ("pane tervesse mappi...", "pane 30...", "scatter across map", "fill map with...") ---
    } else if (
        p.includes('tervesse mappi') || p.includes('terve mapp') || p.includes('tervesse kaarti') || p.includes('terve kaart') ||
        p.includes('üle kogu mapi') || p.includes('ule kogu mapi') || p.includes('üle kogu kaardi') || p.includes('kogu kaardile') ||
        p.includes('kogu map') || p.includes('igale poole') || p.includes('täida kaart') || p.includes('taida kaart') ||
        p.includes('scatter') || p.includes('across the map') || p.includes('whole map') || p.includes('entire map') ||
        p.includes('everywhere') || p.includes('fill map') || p.includes('fill entire') ||
        ((p.includes('pane') || p.includes('lisa') || p.includes('spawn') || p.includes('ehita') || p.includes('create') || p.includes('make')) &&
            (/\b(\d+)\b/.test(p) || p.includes('kolmkümmend') || p.includes('paarkümmend') || p.includes('viiskümmend')) &&
            !p.includes('elu') && !p.includes('tervis') && !p.includes('kahju') && !p.includes('võtab') && !p.includes('votab') && !p.includes('damage') && !p.includes('löök') && !p.includes('look') && !isMathPattern && !p.includes('haigla') && !p.includes('hospital'))
    ) {
        // 1. Extract Quantity
        let targetCount = 0;
        const numMatch = p.match(/\b(\d+)\b/);
        if (numMatch) {
            targetCount = parseInt(numMatch[1], 10);
        } else if (p.includes('paarkümmend') || p.includes('paarkummend')) {
            targetCount = 20;
        } else if (p.includes('kolmkümmend') || p.includes('kolmkummend')) {
            targetCount = 30;
        } else if (p.includes('viiskümmend') || p.includes('viiskummend')) {
            targetCount = 50;
        } else if (p.includes('sada') || p.includes('hundred')) {
            targetCount = 100;
        } else if (p.includes('kümme') || p.includes('kumme') || p.includes('ten')) {
            targetCount = 10;
        } else if (p.includes('viis') || p.includes('five')) {
            targetCount = 5;
        }

        // If no explicit number, default to a generous map-wide density of 30 items
        if (targetCount <= 0) targetCount = 30;
        const count = Math.min(120, Math.max(2, targetCount));

        // 2. Extract item/entity type from prompt
        const cleanedQuery = promptText
            .replace(/(?:pane|lisa|loo|tee|ehita|spawn|add|place|make|build|scatter|fill|with|across|the|whole|entire|map|everywhere|tervesse|mappi|mapile|kaardile|kaarti|kaart|üle|ule|kogu|täida|taida|midagi|something|asju|asja|tk|tükki|tukki|items|objects|kõikjale)/gi, '')
            .replace(/\b\d+\b/g, '')
            .trim();

        const qLower = cleanedQuery.toLowerCase();
        const isGenericSomething = (!cleanedQuery || qLower.length < 2 || qLower.includes('midagi') || qLower.includes('asja') || qLower.includes('something'));

        // Identify item category / nature
        const isCoins = qLower.includes('münt') || qLower.includes('munt') || qLower.includes('coin') || qLower.includes('raha') || qLower.includes('kuld');
        const isTrees = qLower.includes('puu') || qLower.includes('tree') || qLower.includes('mets') || qLower.includes('forest') || qLower.includes('palm');
        const isCars = qLower.includes('auto') || qLower.includes('car') || qLower.includes('veoauto') || qLower.includes('truck') || qLower.includes('kart');
        const isPlanes = qLower.includes('lennuk') || qLower.includes('plane') || qLower.includes('jet') || qLower.includes('ufo') || qLower.includes('rakett') || qLower.includes('rocket');
        const isEnemies = qLower.includes('vaenla') || qLower.includes('koll') || qLower.includes('enemy') || qLower.includes('monster') || qLower.includes('zombie') || qLower.includes('draakon') || qLower.includes('dragon');
        const isCrystals = qLower.includes('kristall') || qLower.includes('crystal') || qLower.includes('gem') || qLower.includes('teemant') || qLower.includes('diamond');
        const isFlowers = qLower.includes('lill') || qLower.includes('flower') || qLower.includes('roos');
        const isRocks = qLower.includes('kivi') || qLower.includes('rock') || qLower.includes('stone') || qLower.includes('lohk');
        const isHouses = qLower.includes('maja') || qLower.includes('house') || qLower.includes('kodu') || qLower.includes('hoone') || qLower.includes('building');

        // Determine title & icon
        let itemLabel = isAdmin ? '✨ Maagiline 3D Objekt' : '✨ Magical 3D Object';
        if (isCoins) itemLabel = isAdmin ? '🪙 Kuldne Münt' : '🪙 Gold Coin';
        else if (isTrees) itemLabel = isAdmin ? '🌲 3D Puu' : '🌲 3D Tree';
        else if (isCars) itemLabel = isAdmin ? '🚗 Sõidetav Auto' : '🚗 Drivable Car';
        else if (isPlanes) itemLabel = isAdmin ? '✈️ Lennatav Lennuk' : '✈️ Flyable Airplane';
        else if (isEnemies) itemLabel = isAdmin ? '👾 Patrulliv Vaenlane' : '👾 Enemy Mob';
        else if (isCrystals) itemLabel = isAdmin ? '💎 Energiakristall' : '💎 Power Crystal';
        else if (isFlowers) itemLabel = isAdmin ? '🌸 Kaunis Lill' : '🌸 Flower';
        else if (isRocks) itemLabel = isAdmin ? '🪨 Graniitkivi' : '🪨 Rock';
        else if (isHouses) itemLabel = isAdmin ? '🏠 3D Maja' : '🏠 3D House';
        else if (!isGenericSomething) itemLabel = `✨ ${cleanedQuery.charAt(0).toUpperCase() + cleanedQuery.slice(1)}`;

        // 3. Grid-Jitter Spread across the entire map
        const spreadRadius = 55;
        const cols = Math.ceil(Math.sqrt(count));
        const step = (spreadRadius * 2) / cols;

        for (let i = 0; i < count; i++) {
            const col = i % cols;
            const row = Math.floor(i / cols);
            let posX = (col * step - spreadRadius) + (Math.random() - 0.5) * (step * 0.85);
            let posZ = (row * step - spreadRadius) + (Math.random() - 0.5) * (step * 0.85);

            // Avoid spawning right on top of player start (0, 0, 0)
            if (Math.abs(posX) < 3.5 && Math.abs(posZ) < 3.5) {
                posX += (posX >= 0 ? 5 : -5);
                posZ += (posZ >= 0 ? 5 : -5);
            }

            let mesh: THREE.Group | THREE.Mesh;
            let itemType: PlacedObject['gameItemType'] = undefined;
            let isFlyable = false;
            let enemyProps: any = undefined;
            let movementProps: any = undefined;

            if (isGenericSomething) {
                // Mix of crystals, trees, ancient obelisks, and gold coins
                const mixIdx = i % 5;
                if (mixIdx === 0) {
                    mesh = createCustomProceduralMesh('Kristall Gem', 'Kristall');
                    itemType = 'coin';
                    movementProps = { type: 'rotate', speed: 2.0, distance: 0, origin: { x: posX, y: 0, z: posZ } };
                } else if (mixIdx === 1) {
                    mesh = createCustomProceduralMesh('Puu Mets', 'Puu');
                } else if (mixIdx === 2) {
                    mesh = createCustomProceduralMesh('Loss Sammas Ruin', 'Muinassammas');
                } else if (mixIdx === 3) {
                    mesh = createCustomProceduralMesh('Münt Kuld', 'Münt');
                    itemType = 'coin';
                    movementProps = { type: 'rotate', speed: 3.0, distance: 0, origin: { x: posX, y: 0, z: posZ } };
                } else {
                    mesh = createCustomProceduralMesh('Lill Roos', 'Võlulill');
                }
            } else if (isCoins) {
                const coinGroup = new THREE.Group();
                const coinMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.12, 16), new THREE.MeshStandardMaterial({ color: 0xffd32a, metalness: 0.9, roughness: 0.1, emissive: 0xffd32a, emissiveIntensity: 0.3 }));
                coinMesh.rotation.x = Math.PI / 2;
                coinMesh.position.y = 0.8;
                coinGroup.add(coinMesh);
                mesh = coinGroup;
                itemType = 'coin';
                movementProps = { type: 'rotate', speed: 2.8, distance: 0, origin: { x: posX, y: 0, z: posZ } };

            } else if (isTrees) {
                mesh = createCustomProceduralMesh('Puu Mets Tree', 'Puu');
                mesh.scale.setScalar(0.8 + Math.random() * 0.6);

            } else if (isCars) {
                mesh = createCustomProceduralMesh('Auto Car Sõiduk', 'Auto');

            } else if (isPlanes) {
                mesh = createAirplane3DMesh(i % 2 === 0 ? '#00f2fe' : '#e74c3c');
                isFlyable = true;

            } else if (isEnemies) {
                mesh = createCustomProceduralMesh(cleanedQuery || 'Vaenlane Koll Monster', 'Vaenlane');
                itemType = 'enemy';
                enemyProps = { health: 45, maxHealth: 45, damage: 12, speed: 3.8, name: itemLabel };

            } else if (isCrystals) {
                mesh = createCustomProceduralMesh('Kristall Gem Teemant', 'Kristall');
                itemType = 'coin';
                movementProps = { type: 'rotate', speed: 2.0, distance: 0, origin: { x: posX, y: 0, z: posZ } };

            } else if (isFlowers) {
                mesh = createCustomProceduralMesh('Lill Roos Flower', 'Lill');
                mesh.scale.setScalar(0.7 + Math.random() * 0.4);

            } else if (isRocks) {
                mesh = createCustomProceduralMesh('Kivi Rock Stone', 'Kivi');
                mesh.scale.setScalar(0.8 + Math.random() * 0.7);

            } else if (isHouses) {
                mesh = createCustomProceduralMesh('Maja House Hoone', 'Maja');
                mesh.scale.setScalar(1.2);

            } else {
                mesh = createCustomProceduralMesh(cleanedQuery, cleanedQuery);
            }

            mesh.position.set(posX, 0, posZ);
            mesh.rotation.y = Math.random() * Math.PI * 2;
            scene.add(mesh);

            const newPlaced: PlacedObject = {
                id: 'placed_ai_scatter_' + Date.now() + '_' + i,
                mesh,
                catalogId: 'scatter_' + i,
                name: `${itemLabel} #${i + 1}`,
                category: (isCars || isPlanes) ? 'vehicles' : 'custom',
                isAirplane: isFlyable,
                gameItemType: itemType,
                enemyData: enemyProps,
                movement: movementProps,
                position: { x: posX, y: 0, z: posZ },
                rotation: { x: 0, y: mesh.rotation.y, z: 0 },
                scale: { x: mesh.scale.x, y: mesh.scale.y, z: mesh.scale.z },
                color: '#00f2fe'
            };

            placedObjects.push(newPlaced);
            generatedObjectsCount++;
        }

        if (isAdmin) {
            aiResponse = `🌍 <strong>Paigutasin üle terve mapi ${generatedObjectsCount} tk: ${itemLabel}!</strong><br>• Objektid jaotati ühtlaselt üle kogu 3D maailma (raadiuses 110m).${isCoins ? '<br>🪙 <em>Kõik mündid on Play Test režiimis kogutavad!</em>' : ''}${isEnemies ? '<br>⚔️ <em>Vaenlased liiguvad ja ründavad mängijat (Combat AI)!</em>' : ''}${(isCars || isPlanes) ? '<br>🚗/✈️ <em>Kõik sõidukid on [F] vajutusega juhitavad!</em>' : ''}<br><br>👉 Vajuta <strong>▶️ Play Test Mode</strong> ja uuri tervet kaarti!`;
        } else {
            aiResponse = `🌍 <strong>Distributed ${generatedObjectsCount}x ${itemLabel} across the entire map!</strong><br>• Objects are spread across the full 3D world (110m radius).${isCoins ? '<br>🪙 <em>Coins can be collected in Play Test Mode!</em>' : ''}${isEnemies ? '<br>⚔️ <em>Enemies will patrol and attack player with combat AI!</em>' : ''}${(isCars || isPlanes) ? '<br>🚗/✈️ <em>All vehicles are drivable/flyable with [F]!</em>' : ''}<br><br>👉 Click <strong>▶️ Play Test Mode</strong> to explore the map!`;
        }

    // --- 0.2 FULL GAME: HORROR / ABANDONED HOSPITAL / ESCAPE GAME ---
    } else if (
        (p.includes('haigla') || p.includes('haiglas') || p.includes('hospital')) &&
        (p.includes('õudus') || p.includes('horror') || p.includes('põgene') || p.includes('escape') || p.includes('võt') || p.includes('key'))
    ) {
        // Clear old scene
        placedObjects.forEach(obj => scene.remove(obj.mesh));
        placedObjects.length = 0;
        selectObject(null);

        if (titleInput) titleInput.value = 'Mahajäetud Haigla Õudusunenägu / Horror Hospital';
        if (catSelect) catSelect.value = 'Adventure';
        if (descInput) descInput.value = 'Põgene mahajäetud haiglast! Leia 3 peidetud võtit ja ava väljapääs samal ajal kummitust vältides!';

        setDayNightMode('horror_fog');

        // 1. Hospital Walls & Corridors
        const wallMat = new THREE.MeshStandardMaterial({ color: 0x2c3e50, roughness: 0.9 });
        const bloodMat = new THREE.MeshStandardMaterial({ color: 0x7f1d1d, roughness: 0.8 });

        const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshStandardMaterial({ color: 0x1e272e, roughness: 0.9 }));
        floor.rotation.x = -Math.PI / 2;
        scene.add(floor);

        // Corridors & Rooms
        const wallConfigs = [
            { x: 0, z: -15, w: 40, h: 4, d: 0.6 },
            { x: 0, z: 15, w: 40, h: 4, d: 0.6 },
            { x: -20, z: 0, w: 0.6, h: 4, d: 30 },
            { x: 20, z: 0, w: 0.6, h: 4, d: 30 },
            { x: -8, z: -5, w: 16, h: 4, d: 0.6 },
            { x: 8, z: 5, w: 16, h: 4, d: 0.6 }
        ];

        wallConfigs.forEach((wc, idx) => {
            const wall = new THREE.Mesh(new THREE.BoxGeometry(wc.w, wc.h, wc.d), wallMat);
            wall.position.set(wc.x, wc.h / 2, wc.z);
            scene.add(wall);
            placedObjects.push({
                id: 'placed_hosp_wall_' + idx,
                mesh: wall,
                catalogId: 'wall_stone',
                name: `Sein #${idx + 1}`,
                category: 'city',
                position: { ...wall.position },
                rotation: { x: 0, y: 0, z: 0 },
                scale: { x: 1, y: 1, z: 1 },
                color: '#2c3e50'
            });
            generatedObjectsCount++;
        });

        // 2. Three Hidden Glowing Keys
        const keyLocations = [
            { x: -14, z: -10, name: '🔑 Haigla Võti #1' },
            { x: 14, z: -8, name: '🔑 Haigla Võti #2' },
            { x: -12, z: 10, name: '🔑 Haigla Võti #3' }
        ];

        keyLocations.forEach((loc, idx) => {
            const keyGroup = new THREE.Group();
            const keyMesh = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.08, 8, 16), new THREE.MeshStandardMaterial({ color: 0xffd32a, emissive: 0xffd32a, emissiveIntensity: 0.8 }));
            keyMesh.position.y = 1.0;
            keyGroup.add(keyMesh);
            keyGroup.position.set(loc.x, 0, loc.z);
            scene.add(keyGroup);

            placedObjects.push({
                id: 'placed_hosp_key_' + idx,
                mesh: keyGroup,
                catalogId: 'gold_key',
                name: loc.name,
                category: 'gameplay',
                gameItemType: 'key',
                keyName: loc.name,
                position: { ...keyGroup.position },
                rotation: { x: 0, y: 0, z: 0 },
                scale: { x: 1, y: 1, z: 1 },
                color: '#ffd32a',
                movement: { type: 'rotate', speed: 2.0, distance: 0, origin: { ...keyGroup.position } }
            });
            generatedObjectsCount++;
        });

        // 3. Locked Exit Gate
        const gateGroup = new THREE.Group();
        const gateMesh = new THREE.Mesh(new THREE.BoxGeometry(4, 5, 0.5), new THREE.MeshStandardMaterial({ color: 0xe74c3c, metalness: 0.8, roughness: 0.2 }));
        gateMesh.position.y = 2.5;
        gateGroup.add(gateMesh);
        gateGroup.position.set(0, 0, 15);
        scene.add(gateGroup);

        placedObjects.push({
            id: 'placed_hosp_gate',
            mesh: gateGroup,
            catalogId: 'locked_gate',
            name: '🚪 Lukus Väljapääsu Värav',
            category: 'gameplay',
            gameItemType: 'door',
            requiredKeyName: 'all_keys',
            position: { ...gateGroup.position },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 },
            color: '#e74c3c'
        });
        generatedObjectsCount++;

        // 4. Roaming Scary Ghost / Monster Enemy
        const ghostGroup = new THREE.Group();
        const ghostBody = new THREE.Mesh(new THREE.ConeGeometry(1.0, 2.5, 8), new THREE.MeshStandardMaterial({ color: 0xecf0f1, transparent: true, opacity: 0.75, emissive: 0x00f2fe, emissiveIntensity: 0.3 }));
        ghostBody.position.y = 1.6;
        ghostGroup.add(ghostBody);
        const ghostEyes = new THREE.Mesh(new THREE.SphereGeometry(0.2, 6, 6), new THREE.MeshStandardMaterial({ color: 0xe74c3c, emissive: 0xe74c3c, emissiveIntensity: 1.0 }));
        ghostEyes.position.set(0, 2.3, 0.6);
        ghostGroup.add(ghostEyes);
        ghostGroup.position.set(0, 0, -8);
        scene.add(ghostGroup);

        placedObjects.push({
            id: 'placed_hosp_ghost',
            mesh: ghostGroup,
            catalogId: 'enemy_ghost',
            name: '👻 Õudusunenäo Kummitus',
            category: 'gameplay',
            gameItemType: 'enemy',
            enemyData: { health: 60, maxHealth: 60, damage: 20, speed: 4.2, name: 'Kummitus' },
            position: { ...ghostGroup.position },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 },
            color: '#ecf0f1'
        });
        generatedObjectsCount++;

        // 5. Victory Goal behind gate
        const goalGroup = new THREE.Group();
        const goalMesh = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.2, 16, 32), new THREE.MeshStandardMaterial({ color: 0x00f2fe, emissive: 0x00f2fe, emissiveIntensity: 0.9 }));
        goalMesh.position.y = 2.0;
        goalGroup.add(goalMesh);
        goalGroup.position.set(0, 0, 20);
        scene.add(goalGroup);

        placedObjects.push({
            id: 'placed_hosp_goal',
            mesh: goalGroup,
            catalogId: 'victory_portal',
            name: '🏆 Pääsetee Vabadusse',
            category: 'gameplay',
            gameItemType: 'goal',
            position: { ...goalGroup.position },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 },
            color: '#00f2fe'
        });
        generatedObjectsCount++;

        // Set Active Quest & HUD
        csState.activeQuest = {
            title: 'Põgene Haiglast!',
            desc: 'Otsi üles 3 peidetud võtit ja ava väljapääsu värav!',
            current: 0,
            target: 3,
            completed: false,
            rewardCoins: 100,
            rewardYards: 50
        };

        if (isAdmin) {
            aiResponse = `🏥 <strong>Lõin täieliku Õudusmängu "Mahajäetud Haigla"!</strong><br>• Lõin haigla ruumid, uduse pimeda taeva ja 3 peidetud võtit.<br>• Lisasin patrulliva Kummituse (Enemy AI), lukus värava ja võiduportaali!<br>• Seadistasin ülesande: <em>"Leia 3 võtit ja põgene haiglast!"</em><br><br>👉 Klõpsa <strong>▶️ Play Test Mode</strong> ja alusta põgenemist!`;
        } else {
            aiResponse = `🏥 <strong>Created a full "Abandoned Hospital" Horror Game!</strong><br>• Generated dark corridors, eerie fog, 3 hidden keys, roaming Ghost monster, locked exit gate, and victory trigger!<br>• Configured quest: <em>"Find 3 keys to escape the Hospital!"</em><br><br>👉 Click <strong>▶️ Play Test Mode</strong> to play!`;
        }

    // --- 0.3 FULL GAME: MEDIEVAL RPG & DRAGON QUEST ---
    } else if (
        p.includes('rpg') || (p.includes('loss') && (p.includes('draakon') || p.includes('mõõk') || p.includes('koll'))) ||
        (p.includes('seiklus') && p.includes('draakon')) || (p.includes('dragon') && p.includes('castle'))
    ) {
        placedObjects.forEach(obj => scene.remove(obj.mesh));
        placedObjects.length = 0;
        selectObject(null);

        if (titleInput) titleInput.value = 'Draakoni Lossi Seiklus / Dragon Castle RPG';
        if (catSelect) catSelect.value = 'Adventure';
        if (descInput) descInput.value = 'Võta külast mõõk, osta poest varustust ja alista lossis elutsev hiiglaslik Tule-Draakon!';

        setDayNightMode('sunset');

        // 1. Village & Shopkeeper NPC
        const shopMesh = createCustomProceduralMesh('Pood Shop Merchant', 'Küla Kauplus');
        shopMesh.position.set(-8, 0, -5);
        scene.add(shopMesh);
        placedObjects.push({
            id: 'placed_rpg_shop',
            mesh: shopMesh,
            catalogId: 'shop_npc',
            name: '🛒 Küla Relvapood',
            category: 'gameplay',
            gameItemType: 'shop',
            position: { ...shopMesh.position },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 },
            color: '#ffd32a'
        });
        generatedObjectsCount++;

        // 2. Legendary Sword on Pedestal
        const swordMesh = createCustomProceduralMesh('Mõõk Sword', 'Legendaarne Mõõk');
        swordMesh.position.set(0, 0, -4);
        scene.add(swordMesh);
        placedObjects.push({
            id: 'placed_rpg_sword',
            mesh: swordMesh,
            catalogId: 'item_sword',
            name: '⚔️ Legendaarne Mõõk',
            category: 'gameplay',
            gameItemType: 'weapon',
            position: { ...swordMesh.position },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 },
            color: '#00f2fe',
            movement: { type: 'rotate', speed: 2.5, distance: 0, origin: { ...swordMesh.position } }
        });
        generatedObjectsCount++;

        // 3. Castle Structure
        const castleMesh = createCustomProceduralMesh('Loss Castle Fortress', 'Kuninglik Loss');
        castleMesh.position.set(0, 0, -22);
        castleMesh.scale.setScalar(2.0);
        scene.add(castleMesh);
        placedObjects.push({
            id: 'placed_rpg_castle',
            mesh: castleMesh,
            catalogId: 'castle_main',
            name: '🏰 Kuninglik Loss',
            category: 'city',
            position: { ...castleMesh.position },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 2, y: 2, z: 2 },
            color: '#95a5a6'
        });
        generatedObjectsCount++;

        // 4. Colossal Fire Dragon Boss
        const dragonMesh = createCustomProceduralMesh('Draakon Dragon Monster Boss', 'Tule-Draakon');
        dragonMesh.position.set(0, 0, -26);
        dragonMesh.scale.setScalar(2.2);
        scene.add(dragonMesh);
        placedObjects.push({
            id: 'placed_rpg_dragon',
            mesh: dragonMesh,
            catalogId: 'boss_dragon',
            name: '🐉 Lossi Tule-Draakon (BOSS)',
            category: 'gameplay',
            gameItemType: 'boss',
            enemyData: { health: 150, maxHealth: 150, damage: 25, speed: 3.2, isBoss: true, name: 'Tule-Draakon' },
            position: { ...dragonMesh.position },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 2.2, y: 2.2, z: 2.2 },
            color: '#e74c3c'
        });
        generatedObjectsCount++;

        // 5. Gold Coins scattered
        [-5, 5, -12, 12].forEach((x, idx) => {
            const coinGroup = new THREE.Group();
            const coinMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.1, 16), new THREE.MeshStandardMaterial({ color: 0xffd32a, metalness: 0.9, roughness: 0.1 }));
            coinMesh.rotation.x = Math.PI / 2;
            coinMesh.position.y = 0.8;
            coinGroup.add(coinMesh);
            coinGroup.position.set(x, 0, -10 + idx * 3);
            scene.add(coinGroup);

            placedObjects.push({
                id: 'placed_rpg_coin_' + idx,
                mesh: coinGroup,
                catalogId: 'gold_coin',
                name: '🪙 Kuldne Münt',
                category: 'gameplay',
                gameItemType: 'coin',
                position: { ...coinGroup.position },
                rotation: { x: 0, y: 0, z: 0 },
                scale: { x: 1, y: 1, z: 1 },
                color: '#ffd32a',
                movement: { type: 'rotate', speed: 3.0, distance: 0, origin: { ...coinGroup.position } }
            });
            generatedObjectsCount++;
        });

        // Set Active Quest & HUD
        csState.activeQuest = {
            title: 'Alista Draakon!',
            desc: 'Haara külast mõõk, sisene lossi ja võida Draakon!',
            current: 0,
            target: 1,
            completed: false,
            rewardCoins: 250,
            rewardYards: 100
        };

        if (isAdmin) {
            aiResponse = `🐉 <strong>Lõin täieliku Keskaegse RPG Seiklusmängu!</strong><br>• Külas ootab <strong>🛒 Relvapood</strong> ja maas hõljub <strong>⚔️ Legendaarne Mõõk</strong>.<br>• Lossi troonisaalis varitseb võimas <strong>🐉 Tule-Draakon (Boss)</strong> eluribaga!<br>• Ründa vaenlast hiireklõpsuga või vajuta <strong>[E]</strong>!<br><br>👉 Klõpsa <strong>▶️ Play Test Mode</strong> ja asu lahingusse!`;
        } else {
            aiResponse = `🐉 <strong>Created a complete Medieval RPG Adventure Game!</strong><br>• Features weapon shop NPC, legendary sword pickup, massive castle, and Fire Dragon Boss!<br>• Attack with mouse click or <strong>[E]</strong> key!<br><br>👉 Click <strong>▶️ Play Test Mode</strong> to play!`;
        }

    // --- 0.4 SEMANTIC SCENE & INTENT ACTIONS (Clear, Scale, Color, Transform) ---
    } else if (p.includes('kustuta kõik') || p.includes('tühjenda') || p.includes('tuhjenda') || p.includes('alusta uuesti') || p.includes('clear all') || p.includes('clear scene')) {
        placedObjects.forEach(obj => scene.remove(obj.mesh));
        placedObjects.length = 0;
        selectObject(null);
        if (isAdmin) {
            aiResponse = `🧹 <strong>Puhastasin kogu 3D stseeni!</strong><br>Kõik vanad objektid on eemaldatud. Saad alustada uue maailma loomisega!`;
        } else {
            aiResponse = `🧹 <strong>Cleared the entire 3D scene!</strong><br>All objects have been removed. Ready to build a new world!`;
        }

    } else if (p.includes('suurem') || p.includes('suuremaks') || p.includes('hiiglaslik') || p.includes('scale up') || p.includes('make bigger')) {
        const target = selectedObject || placedObjects[placedObjects.length - 1];
        if (target) {
            target.mesh.scale.multiplyScalar(1.5);
            target.scale = { x: target.mesh.scale.x, y: target.mesh.scale.y, z: target.mesh.scale.z };
            if (isAdmin) {
                aiResponse = `🔍 <strong>Tegin objekti ${target.name} 1.5x suuremaks!</strong>`;
            } else {
                aiResponse = `🔍 <strong>Scaled up ${target.name} by 1.5x!</strong>`;
            }
        } else {
            aiResponse = isAdmin ? `⚠️ Vali enne objekt, mida soovid suurendada!` : `⚠️ Please select an object to scale up!`;
        }

    } else if (p.includes('väiksem') || p.includes('vaiksem') || p.includes('väiksemaks') || p.includes('smaller') || p.includes('scale down')) {
        const target = selectedObject || placedObjects[placedObjects.length - 1];
        if (target) {
            target.mesh.scale.multiplyScalar(0.7);
            target.scale = { x: target.mesh.scale.x, y: target.mesh.scale.y, z: target.mesh.scale.z };
            if (isAdmin) {
                aiResponse = `🔍 <strong>Tegin objekti ${target.name} väiksemaks (0.7x)!</strong>`;
            } else {
                aiResponse = `🔍 <strong>Scaled down ${target.name} (0.7x)!</strong>`;
            }
        } else {
            aiResponse = isAdmin ? `⚠️ Vali enne objekt, mida soovid vähendada!` : `⚠️ Please select an object to scale down!`;
        }

    } else if (p.includes('pood') || p.includes('shop') || p.includes('kauplus') || p.includes('merchant')) {
        const shopMesh = createCustomProceduralMesh('Pood Shop Merchant', 'Kaupmees');
        shopMesh.position.set(0, 0, -4);
        scene.add(shopMesh);
        placedObjects.push({
            id: 'placed_ai_shop_' + Date.now(),
            mesh: shopMesh,
            catalogId: 'shop_npc',
            name: '🛒 Kaupmees (Mängusisene Pood)',
            category: 'gameplay',
            gameItemType: 'shop',
            position: { ...shopMesh.position },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 },
            color: '#ffd32a'
        });
        generatedObjectsCount++;
        if (isAdmin) {
            aiResponse = `🛒 <strong>Lisasin stseeni kaupmehe ja mängusisese poe!</strong><br>Kõnni kaupmehe juurde ja vajuta [E] poe avamiseks, kus mängijad saavad osta elujooke, kiiruseboonuseid ja mõõkasid!`;
        } else {
            aiResponse = `🛒 <strong>Spawned Shopkeeper NPC with In-Game Item Store!</strong><br>Walk near and press [E] to buy potions, speed boosts, and swords!`;
        }

    } else if (
        p.includes('pahalane võtab') || p.includes('pahalase kahju') || p.includes('vaenlase kahju') ||
        p.includes('vaenlane võtab') || p.includes('vaenlane teeb') || p.includes('pahalane teeb') ||
        p.includes('enemy damage') || p.includes('damage taken')
    ) {
        let dmg = 20;
        const numMatch = p.match(/\b(\d+)\b/);
        if (numMatch) dmg = parseInt(numMatch[1], 10);
        placedObjects.forEach(obj => {
            if (obj.gameItemType === 'enemy' && obj.enemyData) {
                obj.enemyData.damage = dmg;
            }
        });
        csState.isCombatSystemEnabled = true;
        updateGameplayHUD();
        aiResponse = isAdmin ? `⚔️ <strong>Pahalase kahjuks määrati ${dmg} HP löögi kohta!</strong><br>Iga kord, kui pahalane või vaenlane sind ründab, võtab ta sinult ${dmg} elupunkti.` : `⚔️ <strong>Enemy damage set to ${dmg} HP per hit!</strong>`;

    } else if (p.includes('pahalane') || p.includes('pahalased') || p.includes('kurikael') || p.includes('vaenlane') || p.includes('vaenlased') || p.includes('koll') || p.includes('villain') || p.includes('enemy') || p.includes('bandit') || p.includes('röövel') || p.includes('roovel')) {
        const villainMesh = createCustomProceduralMesh('Pahalane Villain Kurikael Vaenlane', 'Pahalane');
        villainMesh.position.set(0, 0, -6);
        scene.add(villainMesh);

        placedObjects.push({
            id: 'placed_ai_villain_' + Date.now(),
            mesh: villainMesh,
            catalogId: 'enemy_villain',
            name: '👾 Pahalane (Enemy Mob)',
            category: 'gameplay',
            gameItemType: 'enemy',
            enemyData: { health: 60, maxHealth: 60, damage: 18, speed: 4.0, name: 'Pahalane' },
            position: { ...villainMesh.position },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 },
            color: '#1e272e'
        });
        generatedObjectsCount++;

        if (isAdmin) {
            aiResponse = `👾 <strong>Lisasin mängu Pahalase (Enemy AI)!</strong><br>• Pahalane patrullib ja ründab mängijat, kui talle lähedale minna.<br>• Play Test režiimis saad teda rünnata vajutades <strong>[E]</strong> või klõpsates ekraanilt nuppu <strong>⚔️ RÜNDA [E]</strong>!`;
        } else {
            aiResponse = `👾 <strong>Spawned Bad Guy Villain (Enemy AI)!</strong><br>• Bad guy patrols and attacks player when nearby.<br>• In Play Test Mode, attack him with <strong>[E]</strong> key or the on-screen <strong>⚔️ ATTACK [E]</strong> button!`;
        }

    } else if (p.includes('npc') || p.includes('nbs') || p.includes('tegelane') || p.includes('külaelanik') || p.includes('kulaelanik') || p.includes('quest giver') || p.includes('teejuht') || p.includes('villager')) {
        const npcMesh = createCustomProceduralMesh('NPC NBS Tegelane Külaelanik', 'Külaelanik NPC');
        npcMesh.position.set(0, 0, -4);
        scene.add(npcMesh);

        placedObjects.push({
            id: 'placed_ai_npc_' + Date.now(),
            mesh: npcMesh,
            catalogId: 'npc_character',
            name: '💬 Külaelanik (NPC)',
            category: 'gameplay',
            gameItemType: 'npc',
            trigger: {
                type: 'proximity',
                message: isAdmin ? 'Tere rändur! Olen Playardi NPC tegelane. Avasta seda maailma, võitle pahalastega ja kogu punkte!' : 'Hello adventurer! I am a Playard NPC. Explore this world, fight villains and collect points!',
                title: '💬 Külaelanik (NPC)',
                radius: 4.5
            },
            position: { ...npcMesh.position },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 },
            color: '#3498db'
        });
        generatedObjectsCount++;

        if (isAdmin) {
            aiResponse = `💬 <strong>Lisasin stseeni interaktiivse NPC / tegelase!</strong><br>Kui mängija kõnnib NPC juurde, avaneb automaatselt dialoogiaken ja NPC räägib mängijaga.`;
        } else {
            aiResponse = `💬 <strong>Spawned an interactive NPC / Character!</strong><br>When the player walks near the NPC, a dialogue popup appears and the NPC speaks with the player.`;
        }

    } else if (
        p.includes('eludeks') || p.includes('mängija elud') || p.includes('elusid') ||
        (p.includes('elud') && /\b(\d+)\b/.test(p)) ||
        (p.includes('tervis') && /\b(\d+)\b/.test(p)) ||
        p.includes('max health') || p.includes('player health')
    ) {
        let hp = 100;
        const numMatch = p.match(/\b(\d+)\b/);
        if (numMatch) hp = parseInt(numMatch[1], 10);
        csState.playerMaxHealth = hp;
        csState.playerHealth = hp;
        csState.isCombatSystemEnabled = true;
        updateGameplayHUD();
        aiResponse = isAdmin ? `❤️ <strong>Mängija maksimaalseks terviseks määrati ${hp} HP!</strong><br>Terviseriba on nüüd reguleeritud ja kuvatakse Play Test režiimis.` : `❤️ <strong>Player max health set to ${hp} HP!</strong>`;

    } else if (
        p.includes('mängija teeb') || p.includes('mõõga löök') || p.includes('mõõk võtab') ||
        p.includes('mängija rünnak') || p.includes('player damage') || p.includes('attack damage')
    ) {
        let atk = 25;
        const numMatch = p.match(/\b(\d+)\b/);
        if (numMatch) atk = parseInt(numMatch[1], 10);
        csState.playerAttackDamage = atk;
        csState.isCombatSystemEnabled = true;
        updateGameplayHUD();
        aiResponse = isAdmin ? `⚔️ <strong>Mängija rünnakutugevuseks määrati ${atk} kahju löögi kohta!</strong>` : `⚔️ <strong>Player attack damage set to ${atk}!</strong>`;

    } else if (p.includes('elud') || p.includes('elusid') || p.includes('tervis') || p.includes('ründa') || p.includes('runda') || p.includes('attack') || p.includes('combat') || p.includes('health') || p.includes('võitlus') || p.includes('voitlus')) {
        if (p.includes('eemalda') || p.includes('peida') || p.includes('kustuta') || p.includes('ära') || p.includes('remove') || p.includes('hide') || p.includes('disable') || p.includes('off') || p.includes('välja')) {
            csState.isCombatSystemEnabled = false;
            updateGameplayHUD();
            if (isAdmin) {
                aiResponse = `🛡️ <strong>Peitsin eluriba ja ründamisnupu!</strong><br>Mäng on nüüd rahulikul režiimil ilma elude ja ründamisnupuga.`;
            } else {
                aiResponse = `🛡️ <strong>Disabled Health Bar and Attack button!</strong><br>Game is now in peaceful mode without health bars or attack controls.`;
            }
        } else {
            csState.isCombatSystemEnabled = true;
            updateGameplayHUD();
            if (isAdmin) {
                aiResponse = `❤️ <strong>Tervisesüsteem ja ⚔️ Ründa Nupp on nüüd aktiivsed!</strong><br>• Eluriba ja nupp <strong>⚔️ RÜNDA [E]</strong> ilmuvad nüüd ekraanile Play Test režiimis.<br>• Saad rünnata vaenlasi vajutades klaviatuuril <strong>[E]</strong> või klõpsates ekraanilt punast RÜNDA nuppu.`;
            } else {
                aiResponse = `❤️ <strong>Health System & ⚔️ Attack Button are now active!</strong><br>• Health bar and <strong>⚔️ ATTACK [E]</strong> button will now appear in Play Test Mode.<br>• Attack enemies with <strong>[E]</strong> or by clicking the on-screen Attack button.`;
            }
        }

    } else if (p.includes('yards') || p.includes('yardid') || p.includes('yarde')) {
        if (p.includes('eemalda') || p.includes('peida') || p.includes('remove') || p.includes('hide')) {
            csState.isYardsSystemEnabled = false;
            updateGameplayHUD();
            aiResponse = isAdmin ? `💎 <strong>Peitsin Playard Yards näidiku!</strong>` : `💎 <strong>Disabled Yards counter!</strong>`;
        } else {
            csState.isYardsSystemEnabled = true;
            updateGameplayHUD();
            aiResponse = isAdmin ? `💎 <strong>Lisasin Playard Yards näidiku!</strong><br>See ilmub Play Test režiimis ekraanile.` : `💎 <strong>Enabled Playard Yards counter!</strong>`;
        }

    } else if (p.includes('raha') || p.includes('mündid') || p.includes('münt') || p.includes('munt') || p.includes('coins') || p.includes('coin') || p.includes('money') || p.includes('valuuta')) {
        if (p.includes('eemalda') || p.includes('peida') || p.includes('kustuta') || p.includes('ära') || p.includes('remove') || p.includes('hide') || p.includes('disable') || p.includes('off') || p.includes('välja')) {
            csState.isMoneySystemEnabled = false;
            updateGameplayHUD();
            if (isAdmin) {
                aiResponse = `🪙 <strong>Peitsin mängusisese raha ja müntide näidiku!</strong>`;
            } else {
                aiResponse = `🪙 <strong>Disabled in-game currency and coins counter!</strong>`;
            }
        } else {
            csState.isMoneySystemEnabled = true;
            updateGameplayHUD();
            if (isAdmin) {
                aiResponse = `🪙 <strong>Mängusisene rahasüsteem on nüüd aktiivne!</strong><br>• Mündiloendur (🪙 0) ilmub Play Test režiimis ekraanile.<br>• Mängijad saavad teenida raha münte korjates, ülesandeid täites ja poes oste sooritades!`;
            } else {
                aiResponse = `🪙 <strong>In-Game Currency System is now active!</strong><br>• Coins counter (🪙 0) will now appear in Play Test Mode.<br>• Players can collect coins, complete quests, and buy items in the shop!`;
            }
        }

    } else if (p.includes('paranda') || p.includes('fix') || p.includes('tee korda') || p.includes('repair')) {
        // Ensure spawn point, goal, and valid scene objects
        if (placedObjects.length === 0) {
            executeAiBuild('Loo parkour seiklusrada');
            aiResponse = isAdmin ? `🛠️ <strong>Mäng oli tühi – lõin automaatselt uue täieliku mänguraja!</strong>` : `🛠️ <strong>Repaired empty scene and created a full playable game!</strong>`;
        } else {
            aiResponse = isAdmin ? `🛠️ <strong>Kontrollisin mängu struktuuri:</strong> Kõik 3D objektid, füüsika ja päästikud töötavad korrektselt!` : `🛠️ <strong>Game audit complete:</strong> All 3D objects, physics, and gameplay triggers are functional!`;
        }

    } else if (p.includes('värvi') || p.includes('varvi') || p.includes('color') || p.includes('paint')) {
        const target = selectedObject || placedObjects[placedObjects.length - 1];
        let newColor = '#00f2fe';
        let colorName = 'Cyan';
        if (p.includes('punan') || p.includes('red')) { newColor = '#e74c3c'; colorName = 'Red'; }
        else if (p.includes('kuld') || p.includes('gold') || p.includes('kollan') || p.includes('yellow')) { newColor = '#ffd32a'; colorName = 'Gold'; }
        else if (p.includes('rohelin') || p.includes('green')) { newColor = '#2ecc71'; colorName = 'Green'; }
        else if (p.includes('sinin') || p.includes('blue')) { newColor = '#3498db'; colorName = 'Blue'; }
        else if (p.includes('must') || p.includes('black')) { newColor = '#1e272e'; colorName = 'Black'; }
        else if (p.includes('lilla') || p.includes('purple')) { newColor = '#9b59b6'; colorName = 'Purple'; }

        if (target) {
            target.mesh.traverse((node: any) => {
                if (node.isMesh && node.material) {
                    node.material = new THREE.MeshStandardMaterial({ color: newColor, roughness: 0.4, metalness: 0.4 });
                }
            });
            target.color = newColor;
            if (isAdmin) {
                aiResponse = `🎨 <strong>Värvisin objekti ${target.name} tooni ${colorName}!</strong>`;
            } else {
                aiResponse = `🎨 <strong>Painted ${target.name} into ${colorName}!</strong>`;
            }
        } else {
            aiResponse = isAdmin ? `⚠️ Vali objekt, mida soovid värvida!` : `⚠️ Please select an object to repaint!`;
        }

    // --- 0.0 DYNAMIC MOVEMENT & ANIMATION (Pane liikuma, sõitma, pöörlema, hüppama) ---
    } else if (
        p.includes('liigu') || p.includes('liikuma') || p.includes('move') || p.includes('motion') ||
        p.includes('patrulli') || p.includes('patrol') || p.includes('sõitma') || p.includes('soitma') ||
        p.includes('pöörlema') || p.includes('poorlema') || p.includes('rotate') || p.includes('spin') ||
        p.includes('tiirlema') || p.includes('hüppama') || p.includes('huppama') || p.includes('bounce') ||
        p.includes('lift') || p.includes('elevator')
    ) {
        let target = selectedObject || placedObjects[placedObjects.length - 1];
        let moveType: 'patrol' | 'elevator' | 'rotate' | 'bounce' | 'circle' = 'patrol';
        let moveDescEt = 'patrullima edasi-tagasi';
        let moveDescEn = 'patrolling back and forth';
        let speed = 2.0;
        let distance = 6.0;
        let axis: 'x' | 'y' | 'z' = 'x';

        if (p.includes('pöör') || p.includes('poor') || p.includes('spin') || p.includes('rotate')) {
            moveType = 'rotate';
            speed = 2.0;
            moveDescEt = 'pidevalt ümber oma telje pöörlema';
            moveDescEn = 'continuously spinning around its axis';
        } else if (p.includes('lift') || p.includes('elevator') || p.includes('üles') || p.includes('kõrgus') || p.includes('up and down')) {
            moveType = 'elevator';
            axis = 'y';
            speed = 1.8;
            distance = 5.0;
            moveDescEt = 'üles-alla liftina liikuma (kõrgus 5m)';
            moveDescEn = 'moving up and down like an elevator (5m)';
        } else if (p.includes('hüp') || p.includes('bounce') || p.includes('jump')) {
            moveType = 'bounce';
            speed = 3.2;
            distance = 2.5;
            moveDescEt = 'rõõmsalt hüppama ja põrkama';
            moveDescEn = 'bouncing and hopping dynamically';
        } else if (p.includes('ring') || p.includes('circle') || p.includes('tiirle')) {
            moveType = 'circle';
            speed = 1.4;
            distance = 7.0;
            moveDescEt = 'ringiratast tiirlema';
            moveDescEn = 'moving in a smooth circular orbit';
        } else if (p.includes('edasi') || p.includes('auto') || p.includes('sõit') || p.includes('z')) {
            moveType = 'patrol';
            axis = 'z';
            speed = 2.2;
            distance = 8.0;
            moveDescEt = 'edasi-tagasi mööda teed liikuma (8m)';
            moveDescEn = 'patrolling forward and backward (8m)';
        }

        if (!target) {
            const platGeo = new THREE.BoxGeometry(4.0, 0.4, 4.0);
            const platMat = new THREE.MeshStandardMaterial({ color: 0x00f2fe, emissive: 0x00f2fe, emissiveIntensity: 0.4, roughness: 0.3 });
            const platMesh = new THREE.Mesh(platGeo, platMat);
            platMesh.position.set(0, 1.5, -4.0);
            scene.add(platMesh);

            target = {
                id: 'placed_moving_plat_' + Date.now(),
                mesh: platMesh,
                catalogId: 'moving_platform',
                name: isAdmin ? '⚡ Liikuv 3D Platvorm' : '⚡ Moving 3D Platform',
                category: 'gameplay',
                position: { x: 0, y: 1.5, z: -4.0 },
                rotation: { x: 0, y: 0, z: 0 },
                scale: { x: 1, y: 1, z: 1 },
                color: '#00f2fe'
            };
            placedObjects.push(target);
            generatedObjectsCount++;
        }

        target.movement = {
            type: moveType,
            axis,
            speed,
            distance,
            origin: { x: target.mesh.position.x, y: target.mesh.position.y, z: target.mesh.position.z },
            rotationSpeed: speed
        };

        selectObject(target);

        if (isAdmin) {
            aiResponse = `🎬 <strong>Panin objekti elama ja liikuma!</strong><br>Objekt <strong>${target.name}</strong> hakkas <strong>${moveDescEt}</strong>!<br>💡 Näed liikumist reaalajas nii stuudios kui ka <strong>▶️ Play Test Mode</strong> mängurežiimis!`;
        } else {
            aiResponse = `🎬 <strong>Animated object into motion!</strong><br><strong>${target.name}</strong> is now <strong>${moveDescEn}</strong>!<br>💡 Watch it move live in the Studio and in <strong>▶️ Play Test Mode</strong>!`;
        }

    // --- 0. MATHEMATICS & CALCULATIONS (e.g. 1+1, 5*5, 100/4, 25-10, sqrt, mis on 5+5 jne) ---
    } else if (mathResult !== null) {
        if (isAdmin) {
            aiResponse = `🧮 <strong>Vastus:</strong><br><span style="font-size: 1.25rem; color: #ffd32a; font-weight: bold;">${mathExpr} = ${mathResult}</span><br><br>💡 Oskan arvutada ka muid tehteid (nt liitmine, lahutamine, korrutamine, jagamine ja astendamine)!`;
        } else {
            aiResponse = `🧮 <strong>Result:</strong><br><span style="font-size: 1.25rem; color: #ffd32a; font-weight: bold;">${mathExpr} = ${mathResult}</span><br><br>💡 I can calculate any arithmetic expression (addition, subtraction, multiplication, division, powers)!`;
        }

    // --- 0.1 WORLD CAPITALS Q&A (Pealinnad) ---
    } else if (p.includes('pealinn') || p.includes('capital')) {
        let matchedCapital: { et: string, en: string, countryEt: string, countryEn: string } | null = null;
        for (const [key, val] of Object.entries(WORLD_CAPITALS_MAP)) {
            if (p.includes(key)) {
                matchedCapital = val;
                break;
            }
        }

        if (matchedCapital) {
            if (isAdmin) {
                aiResponse = `🏛️ <strong>Riigi ${matchedCapital.countryEt} pealinn on:</strong><br><span style="font-size: 1.2rem; color: #ffd32a; font-weight: bold;">${matchedCapital.et}</span>`;
            } else {
                aiResponse = `🏛️ <strong>The capital of ${matchedCapital.countryEn} is:</strong><br><span style="font-size: 1.2rem; color: #ffd32a; font-weight: bold;">${matchedCapital.en}</span>`;
            }
        } else {
            if (isAdmin) {
                aiResponse = `🏛️ <strong>Maailma tuntumad pealinnad:</strong><br>
                • 🇪🇪 <strong>Eesti:</strong> Tallinn<br>
                • 🇫🇮 <strong>Soome:</strong> Helsingi<br>
                • 🇸🇪 <strong>Rootsi:</strong> Stockholm<br>
                • 🇱🇻 <strong>Läti:</strong> Riia<br>
                • 🇫🇷 <strong>Prantsusmaa:</strong> Pariis<br>
                • 🇩🇪 <strong>Saksamaa:</strong> Berliin<br>
                • 🇬🇧 <strong>Suurbritannia:</strong> London<br>
                • 🇺🇸 <strong>USA:</strong> Washington D.C.<br>
                • 🇯🇵 <strong>Jaapan:</strong> Tokyo<br>
                • 🇨🇳 <strong>Hiina:</strong> Peking (Beijing)`;
            } else {
                aiResponse = `🏛️ <strong>Notable World Capitals:</strong><br>
                • 🇪🇪 <strong>Estonia:</strong> Tallinn<br>
                • 🇫🇮 <strong>Finland:</strong> Helsinki<br>
                • 🇸🇪 <strong>Sweden:</strong> Stockholm<br>
                • 🇱🇻 <strong>Latvia:</strong> Riga<br>
                • 🇫🇷 <strong>France:</strong> Paris<br>
                • 🇩🇪 <strong>Germany:</strong> Berlin<br>
                • 🇬🇧 <strong>United Kingdom:</strong> London<br>
                • 🇺🇸 <strong>USA:</strong> Washington, D.C.<br>
                • 🇯🇵 <strong>Japan:</strong> Tokyo<br>
                • 🇨🇳 <strong>China:</strong> Beijing`;
            }
        }

    // --- 0.2 LARGEST COUNTRIES Q&A (Suurimad riigid) ---
    } else if (
        (p.includes('riik') || p.includes('riigid') || p.includes('country') || p.includes('countries')) &&
        (p.includes('suurim') || p.includes('suurima') || p.includes('largest') || p.includes('biggest'))
    ) {
        if (isAdmin) {
            aiResponse = `🌍 <strong>Maailma Suurimad Riigid (Pindala järgi):</strong><br>
            1. 🇷🇺 <strong>Venemaa</strong> — 17 098 246 km²<br>
            2. 🇨🇦 <strong>Kanada</strong> — 9 984 670 km²<br>
            3. 🇺🇸 <strong>USA</strong> — 9 833 517 km²<br>
            4. 🇨🇳 <strong>Hiina</strong> — 9 596 960 km²<br>
            5. 🇧🇷 <strong>Brasiilia</strong> — 8 515 767 km²<br>
            6. 🇦🇺 <strong>Austraalia</strong> — 7 692 024 km²<br>
            7. 🇮🇳 <strong>India</strong> — 3 287 263 km²<br><br>
            👥 <em>Rahvaarvu järgi on suurimad riigid <strong>India</strong> (~1.43 mld) ja <strong>Hiina</strong> (~1.41 mld).</em>`;
        } else {
            aiResponse = `🌍 <strong>World's Largest Countries (By Area):</strong><br>
            1. 🇷🇺 <strong>Russia</strong> — 17,098,246 km²<br>
            2. 🇨🇦 <strong>Canada</strong> — 9,984,670 km²<br>
            3. 🇺🇸 <strong>United States</strong> — 9,833,517 km²<br>
            4. 🇨🇳 <strong>China</strong> — 9,596,960 km²<br>
            5. 🇧🇷 <strong>Brazil</strong> — 8,515,767 km²<br>
            6. 🇦🇺 <strong>Australia</strong> — 7,692,024 km²<br>
            7. 🇮🇳 <strong>India</strong> — 3,287,263 km²<br><br>
            👥 <em>By population, the largest nations are <strong>India</strong> (~1.43B) and <strong>China</strong> (~1.41B).</em>`;
        }

    // --- 0.3 GENERAL KNOWLEDGE & WORLD ENCYCLOPEDIA Q&A (e.g. Largest Airplanes, Speed, World records) ---
    } else if (
        (p.includes('lennuk') || p.includes('plane') || p.includes('airplane') || p.includes('aircraft')) &&
        (p.includes('suurim') || p.includes('suurima') || p.includes('largest') || p.includes('biggest') || p.includes('raskeim') || p.includes('heaviest'))
    ) {
        if (isAdmin) {
            aiResponse = `✈️ <strong>Maailma Suurimad Lennukid:</strong><br>
            1. <strong>Antonov An-225 Mriya</strong> — Maailma kõigi aegade raskeim ja pikim 6-mootoriline hiigellennuk (tiivaulatus 88.4 m, maksimaalne stardikaal 640 tonni).<br>
            2. <strong>Stratolaunch Roc</strong> — Maailma suurima tiivaulatusega lennuk (117 meetrit / 385 jalga, kahe kere ja 6 Boeing 747 mootoriga kosmoserakettide kandja).<br>
            3. <strong>Airbus A380-800</strong> — Maailma suurim kahekorruseline reisilennuk (kuni 853 reisijat, tiivaulatus 79.75 m).<br>
            4. <strong>Boeing 747-8</strong> — Maailma pikim reisilennuk (pikkus 76.3 meetrit, tuntud kui "Taevakuninganna").<br>
            5. <strong>Hughes H-4 Hercules ("Spruce Goose")</strong> — Ajalooline puidust hiiglaslik lennupaat (tiivaulatus 97.5 meetrit).`;
        } else {
            aiResponse = `✈️ <strong>World's Largest Airplanes:</strong><br>
            1. <strong>Antonov An-225 Mriya</strong> — Heaviest and longest cargo aircraft ever built (wingspan 88.4m, max takeoff weight 640t).<br>
            2. <strong>Stratolaunch Roc</strong> — Largest wingspan in aviation history (117m / 385ft double-fuselage carrier aircraft).<br>
            3. <strong>Airbus A380-800</strong> — World's largest passenger airliner (full double-decker carrying up to 853 passengers).<br>
            4. <strong>Boeing 747-8</strong> — Longest passenger airliner in service (76.3 meters long).<br>
            5. <strong>Hughes H-4 Hercules ("Spruce Goose")</strong> — Iconic historical flying boat with 97.5m wingspan.`;
        }

    // --- 0.4 GAMEPLAY Q&A (How to drive, jump, save, earn yards, etc.) ---
    } else if (
        p.includes('kuidas autoga') || p.includes('kuidas soita') || p.includes('kuidas sõita') || p.includes('auto juhtimine') ||
        p.includes('how to drive') || p.includes('drive car') || p.includes('drive a car')
    ) {
        if (isAdmin) {
            aiResponse = `🚗 <strong>Kuidas autoga sõita:</strong><br>1. Klõpsa üleval nuppu <strong>▶️ Play Test Mode</strong>.<br>2. Kõnni auto juurde — ekraanile ilmub nupp <strong>[F]</strong>.<br>3. Vajuta klaviatuuril <strong>[F]</strong> (või vajuta ekraani nuppu) autosse istumiseks.<br>4. Juhi auto liikumist: <strong>W / ⬆️</strong> (Gaas), <strong>S / ⬇️</strong> (Pidur/Tagurpidi), <strong>A / D</strong> (Pööramine).<br>5. Väljumiseks vajuta uuesti <strong>[F]</strong>!`;
        } else {
            aiResponse = `🚗 <strong>How to Drive Cars:</strong><br>1. Click <strong>▶️ Play Test Mode</strong> in the top bar.<br>2. Walk close to any car — press <strong>[F]</strong> to enter.<br>3. Drive with <strong>W / ⬆️</strong> (Gas), <strong>S / ⬇️</strong> (Brake/Reverse), and <strong>A / D</strong> (Steer).<br>4. Press <strong>[F]</strong> again to exit!`;
        }

    } else if (
        p.includes('kuidas lennata') || p.includes('kuidas lennukiga') || p.includes('kuidas lennukit juhtida') ||
        p.includes('how to fly') || p.includes('fly airplane') || p.includes('how to control plane')
    ) {
        if (isAdmin) {
            aiResponse = `✈️ <strong>Kuidas lennukiga lennata:</strong><br>1. Klõpsa üleval nuppu <strong>▶️ Play Test Mode</strong>.<br>2. Kõnni lennuki juurde ja vajuta <strong>[F]</strong> lennukisse istumiseks.<br>3. Vajuta <strong>W</strong> gaasi andmiseks (lennuki kiirus tõuseb).<br>4. Hoia all <strong>SPACE</strong> või <strong>Q</strong> tõusmiseks ja taevasse tõusmiseks!<br>5. Pööra lennukit <strong>A / D</strong> klahvidega (lennuk teeb realistlikke pöördeid ja kallutab tiibu).<br>6. Laskumiseks ja maandumiseks kasuta <strong>Shift</strong> või <strong>E</strong> klahve.<br>7. Väljumiseks vajuta uuesti <strong>[F]</strong>!`;
        } else {
            aiResponse = `✈️ <strong>How to Fly Airplanes:</strong><br>1. Click <strong>▶️ Play Test Mode</strong> in the top bar.<br>2. Walk to the airplane and press <strong>[F]</strong> to board.<br>3. Press <strong>W</strong> for throttle/acceleration.<br>4. Hold <strong>SPACE</strong> or <strong>Q</strong> to climb and take off into the sky!<br>5. Steer and bank with <strong>A / D</strong> keys.<br>6. Descend/land using <strong>Shift</strong> or <strong>E</strong>.<br>7. Press <strong>[F]</strong> again to exit!`;
        }

    } else if (p.includes('kuidas hüpata') || p.includes('kuidas hupata') || p.includes('kuidas hüppan') || p.includes('how to jump') || (p.includes('jump') && !p.includes('pad') && !p.includes('parkour'))) {
        if (isAdmin) {
            aiResponse = `🚀 <strong>Kuidas hüpata:</strong><br>Vajuta klaviatuuril <strong>SPACE</strong> (tühikuklahvi) või vajuta ekraani all paremal asuvat sinist nuppu <strong>JUMP 🚀</strong>!`;
        } else {
            aiResponse = `🚀 <strong>How to Jump:</strong><br>Press the <strong>SPACEBAR</strong> on your keyboard or tap the blue <strong>JUMP 🚀</strong> button on screen!`;
        }

    } else if (p.includes('kuidas salvestada') || p.includes('kuidas seivida') || p.includes('how to save') || p.includes('save game')) {
        if (isAdmin) {
            aiResponse = `💾 <strong>Mängu salvestamine:</strong><br>Vajuta üleval paremal nuppu <strong>💾 Save Game</strong> (või <strong>🚀 Submit for Review</strong>, kui soovid mängu avalikustada administraatori ülevaatuseks)! Sinu mäng salvestub automaatselt ka <strong>📂 My Games</strong> kausta.`;
        } else {
            aiResponse = `💾 <strong>Saving your Game:</strong><br>Click <strong>💾 Save Game</strong> (or <strong>🚀 Submit for Review</strong> to publish for admin approval)! Your games are safely stored in <strong>📂 My Games</strong>.`;
        }

    } else if (p.includes('kes sa oled') || p.includes('mis sa oled') || p.includes('who are you') || p.includes('what are you') || p.includes('kes sa selline oled') || p.includes('tutvusta ennast')) {
        if (isAdmin) {
            aiResponse = `🤖 <strong>Mina olen Playard Game Creator AI!</strong><br>Oskan ehitada 3D maailmu, luua asfalteeritud teid ja sõidetavaid autosid, kaunistada loodust, genereerida uusi unikaalseid 3D objekte (dinosaurused, robotid, lossid jne), arvutada matemaatikat (nt 1+1), vastata maailma faktidele (nt mis lennukid on suurimad) ning programmeerida mänguloogikat!`;
        } else {
            aiResponse = `🤖 <strong>Mina olen Playard Game Creator AI (I am Playard Game Creator AI)!</strong><br>I can build 3D worlds, construct asphalt roads with drivable cars, create custom 3D models (dinosaurs, robots, castles), solve math (1+1), answer general knowledge (e.g. largest airplanes), and program interactive game logic!`;
        }

    } else if (p.includes('mis mäng see on') || p.includes('mis mang see on') || p.includes('mis on playard') || p.includes('what is playard') || p.includes('what game is this')) {
        if (isAdmin) {
            aiResponse = `🎮 <strong>Playard Games:</strong><br>See on Eesti oma 3D mängude ja simulaatorite platvorm! Siin saad luua oma 3D mänge (3D Creator Studio), lennata lennukiga (3D Flight Simulator), sõita rallit (Racing Simulator) ja kokata (3D Master Chef)!`;
        } else {
            aiResponse = `🎮 <strong>Playard Games:</strong><br>The ultimate 3D sandbox and simulation gaming platform! Create games in 3D Creator Studio, fly planes, race sports cars, and cook master chef meals!`;
        }

    } else if (p.includes('kuidas kustutada') || p.includes('kuidas eemaldada') || p.includes('how to delete') || p.includes('delete object')) {
        if (isAdmin) {
            aiResponse = `🗑️ <strong>Objekti kustutamine:</strong><br>Klõpsa stseenis objektile, mida soovid kustutada, ja vajuta klaviatuuril <strong>Delete</strong> või <strong>Backspace</strong> klahvi (või paremal paneelis punast nuppu <strong>🗑️ Delete Object</strong>).`;
        } else {
            aiResponse = `🗑️ <strong>Deleting Objects:</strong><br>Click on the object in the scene and press <strong>Delete</strong> or <strong>Backspace</strong> key (or click the red <strong>🗑️ Delete Object</strong> button in the inspector).`;
        }

    } else if (p.includes('kuidas pöörata') || p.includes('kuidas poorata') || p.includes('how to rotate') || p.includes('rotate object')) {
        if (isAdmin) {
            aiResponse = `🔄 <strong>Objekti pööramine:</strong><br>Vali objekt ja vajuta klaviatuuril <strong>[R]</strong> klahvi (iga vajutus pöörab 45°) või kasuta paremal paneelis asuvat nuppu <strong>🔄 R</strong>!`;
        } else {
            aiResponse = `🔄 <strong>Rotating Objects:</strong><br>Select an object and press <strong>[R]</strong> key (rotates 45° each press) or use the <strong>🔄 R</strong> button in the inspector!`;
        }

    } else if (p.includes('kuidas raha') || p.includes('kuidas yarde') || p.includes('how to get yards') || p.includes('earn yards')) {
        if (isAdmin) {
            aiResponse = `💎 <strong>Yards & Raha teenimine:</strong><br>Yarde saad teenida mängides simulaatoreid ja lunastades igapäevaseid seeriaboonuseid (Daily Rewards) oma rahakoti aknas!`;
        } else {
            aiResponse = `💎 <strong>Earning Yards Currency:</strong><br>Earn Yards by playing 3D simulators and claiming Daily Rewards streaks in your Wallet!`;
        }

    // --- 0.3 VERSATILE GAME PROGRAMMING ENGINE (Program whatever creator wants: text, speed boost, jump pad, yards bonus) ---
    } else if (
        p.includes('program') || p.includes('progameeri') || p.includes('skript') || p.includes('script') ||
        p.includes('kui ma') || p.includes('kui mängija') || p.includes('kui mangija') || p.includes('when player') || p.includes('if player') ||
        p.includes('trigger') || p.includes('päästik') || p.includes('paastik')
    ) {
        let behaviorType = 'dialog';
        let msg = '';
        let triggerTitle = isAdmin ? '✨ Interaktiivne Objekt' : '✨ Interactive Object';

        // Detect desired behavior type
        if (p.includes('kiirus') || p.includes('speed') || p.includes('boost')) {
            behaviorType = 'speed_boost';
            msg = isAdmin ? '⚡ Kiiruseboonus aktiveeritud (Speed Boost +100%)!' : '⚡ Speed Boost Activated (+100%)!';
            triggerTitle = isAdmin ? '⚡ Kiirenduspadi' : '⚡ Speed Booster';
        } else if (p.includes('hüpe') || p.includes('hupe') || p.includes('jump pad') || p.includes('bounce') || p.includes('lennuta')) {
            behaviorType = 'super_jump';
            msg = isAdmin ? '🚀 Superhüpe sooritatud!' : '🚀 Super Jump Boost Launched!';
            triggerTitle = isAdmin ? '🚀 Superhüppe Padi' : '🚀 Jump Pad';
        } else if (p.includes('yard') || p.includes('raha') || p.includes('punkt') || p.includes('score') || p.includes('coin')) {
            behaviorType = 'reward_yards';
            msg = isAdmin ? '💎 Kogusid boonuseks +50 Yardi!' : '💎 Collected +50 Yards Bonus!';
            triggerTitle = isAdmin ? '💎 Boonuskristall' : '💎 Reward Crystal';
        } else {
            // Extract custom dialogue/text
            const quoteMatch = promptText.match(/["'„”«»](.*?)["'„”«»]/);
            if (quoteMatch && quoteMatch[1]) {
                msg = quoteMatch[1].trim();
            } else {
                const textMatch = promptText.match(/(?:tekst|kiri|teade|sõnum|sonum|message|dialog|ütleb|utleb|kekst|says|shows|text)\s+(.+)$/i);
                if (textMatch && textMatch[1]) {
                    msg = textMatch[1].replace(/^[.,:!\s]+/, '').trim();
                }
            }
            if (!msg) {
                msg = isAdmin ? '✨ Avastasid interaktiivse mänguobjekti saladuse!' : '✨ You discovered the secret of the interactive object!';
            }
        }

        // Target existing selected object or create interactive beacon
        let targetObj = selectedObject || placedObjects[placedObjects.length - 1];
        if (!targetObj) {
            const padGroup = new THREE.Group();
            const padMat = new THREE.MeshStandardMaterial({ color: 0x00f2fe, emissive: 0x00f2fe, emissiveIntensity: 0.6 });
            const padMesh = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.8, 0.3, 16), padMat);
            padMesh.position.y = 0.15;
            padGroup.add(padMesh);

            const beaconMesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.8), new THREE.MeshStandardMaterial({ color: 0xffd32a, emissive: 0xffd32a, emissiveIntensity: 0.8 }));
            beaconMesh.position.y = 1.6;
            padGroup.add(beaconMesh);

            scene.add(padGroup);
            padGroup.position.set(0, 0, -4);

            targetObj = {
                id: 'placed_ai_script_' + Date.now(),
                mesh: padGroup,
                catalogId: 'custom_script_obj',
                name: triggerTitle,
                category: 'gameplay',
                position: { x: padGroup.position.x, y: padGroup.position.y, z: padGroup.position.z },
                rotation: { x: 0, y: 0, z: 0 },
                scale: { x: 1, y: 1, z: 1 },
                color: '#00f2fe'
            };
            placedObjects.push(targetObj);
            generatedObjectsCount++;
        }

        targetObj.trigger = {
            type: 'touch',
            behavior: behaviorType,
            message: msg,
            title: triggerTitle,
            radius: 5.0
        };

        selectObject(targetObj);

        if (isAdmin) {
            aiResponse = `🤖 <strong>Mänguloogika edukalt programmeeritud!</strong><br>Objektile <strong>${targetObj.name}</strong> määrati käitumine: <strong>${behaviorType}</strong>.<br>👉 Tulemus mängijale:<br><em style="color: #ffd32a; font-size: 1.05rem;">"${msg}"</em><br><br>💡 Vajuta <strong>▶️ Play Test Mode</strong> ja kõnni objekti juurde, et seda kohe testida!`;
        } else {
            aiResponse = `🤖 <strong>Game logic successfully programmed!</strong><br>Assigned logic (<strong>${behaviorType}</strong>) to <strong>${targetObj.name}</strong>.<br>👉 Player action result:<br><em style="color: #ffd32a; font-size: 1.05rem;">"${msg}"</em><br><br>💡 Click <strong>▶️ Play Test Mode</strong> and walk near it to test!`;
        }

    // 1. PARKOUR / OBSTACLES
    } else if (p.includes('parkour') || (p.includes('rada') && !p.includes('lennurada')) || p.includes('hüp') || p.includes('jump') || p.includes('obstacle') || p.includes('takistus')) {
        if (titleInput) titleInput.value = 'AI Parkour Challenge';
        if (catSelect) catSelect.value = 'Platformer';
        if (descInput) descInput.value = 'Exciting 3D Parkour course generated with Playard AI!';

        const parkourItems = CATALOG_DATABASE.filter(c => c.category === 'gameplay' || c.name.includes('Platform') || c.name.includes('Crate') || c.name.includes('Obstacle'));
        let currentHeight = 0.5;
        let currentZ = 0;
        let currentX = 0;

        for (let i = 0; i < 9; i++) {
            const item = parkourItems[i % parkourItems.length] || CATALOG_DATABASE[0];
            const mesh = createObjectMesh(item);
            mesh.position.set(currentX, currentHeight, currentZ);
            mesh.scale.setScalar(item.baseScale * (1 + Math.random() * 0.3));
            scene.add(mesh);

            placedObjects.push({
                id: 'placed_ai_' + Date.now() + '_' + i,
                mesh,
                catalogId: item.id,
                name: item.name,
                category: item.category,
                position: { x: mesh.position.x, y: mesh.position.y, z: mesh.position.z },
                rotation: { x: 0, y: 0, z: 0 },
                scale: { x: mesh.scale.x, y: mesh.scale.y, z: mesh.scale.z },
                color: item.color
            });

            currentHeight += 0.7;
            currentZ -= 4.5;
            currentX += (Math.random() - 0.5) * 3;
            generatedObjectsCount++;
        }

        if (isAdmin) {
            aiResponse = `🏃 Lõin sulle 9-astmelise parkuuriraja tõusvate platvormidega! Saad seda kohe nooltega ja tühikuga (Jump) testida!`;
        } else {
            aiResponse = `🏃 I created a 9-stage parkour challenge with rising platforms! Test it now with arrows and spacebar (Jump)!`;
        }

    // 2. METS / NATURE / FOREST
    } else if (p.includes('mets') || p.includes('forest') || p.includes('puu') || p.includes('tree') || p.includes('nature') || p.includes('loodus')) {
        if (titleInput) titleInput.value = 'AI Mystical Forest';
        if (catSelect) catSelect.value = 'Adventure';
        if (descInput) descInput.value = 'A lush natural 3D forest populated by Playard AI.';

        const natureItems = CATALOG_DATABASE.filter(c => c.category === 'nature');
        for (let i = 0; i < 14; i++) {
            const item = natureItems[i % natureItems.length] || CATALOG_DATABASE[0];
            const mesh = createObjectMesh(item);
            const rX = (Math.random() - 0.5) * 35;
            const rZ = (Math.random() - 0.5) * 35;
            mesh.position.set(rX, 0, rZ);
            mesh.scale.setScalar(item.baseScale * (0.8 + Math.random() * 0.6));
            mesh.rotation.y = Math.random() * Math.PI * 2;
            scene.add(mesh);

            placedObjects.push({
                id: 'placed_ai_' + Date.now() + '_' + i,
                mesh,
                catalogId: item.id,
                name: item.name,
                category: item.category,
                position: { x: mesh.position.x, y: mesh.position.y, z: mesh.position.z },
                rotation: { x: 0, y: mesh.rotation.y, z: 0 },
                scale: { x: mesh.scale.x, y: mesh.scale.y, z: mesh.scale.z },
                color: item.color
            });
            generatedObjectsCount++;
        }

        if (isAdmin) {
            aiResponse = `🌲 Istutasin stseeni ${generatedObjectsCount} puud, kändu ja kivimit! Looduslik metsamaailm on valmis.`;
        } else {
            aiResponse = `🌲 Planted ${generatedObjectsCount} trees, stumps, and rocks! The natural forest world is ready.`;
        }

    // 3. SMART CONTEXTUAL ADDITIONS & OBJECT DECORATOR (Lisa asjadele ise asju juurde)
    } else if (
        p.includes('juurde') || p.includes('kaunista') || p.includes('detail') ||
        p.includes('lisa autole') || p.includes('lisa puule') || p.includes('lisa majale') ||
        p.includes('add details') || p.includes('add to car') || p.includes('add to tree') ||
        p.includes('decorate')
    ) {
        // A. Adding additions to CAR / VEHICLE
        if (p.includes('auto') || p.includes('car') || (selectedObject && selectedObject.category === 'vehicles')) {
            const targetCar = selectedObject || placedObjects.find(obj => obj.category === 'vehicles') || placedObjects[0];
            const baseX = targetCar ? targetCar.position.x : 0;
            const baseZ = targetCar ? targetCar.position.z : 0;

            // Add Road section under/next to car
            const roadItem = CATALOG_DATABASE.find(c => c.name.toLowerCase().includes('road')) || CATALOG_DATABASE[0];
            const meshRoad = createObjectMesh(roadItem);
            meshRoad.position.set(baseX, 0, baseZ);
            scene.add(meshRoad);
            placedObjects.push({
                id: 'placed_ai_add_road_' + Date.now(),
                mesh: meshRoad,
                catalogId: roadItem.id,
                name: isAdmin ? '🛣️ Asfalttee' : '🛣️ Asphalt Road',
                category: 'city',
                position: { x: meshRoad.position.x, y: 0, z: meshRoad.position.z },
                rotation: { x: 0, y: 0, z: 0 },
                scale: { x: 1, y: 1, z: 1 },
                color: roadItem.color
            });
            generatedObjectsCount++;

            // Add Street Lights on both sides
            const lightItem = CATALOG_DATABASE.find(c => c.name.toLowerCase().includes('light')) || CATALOG_DATABASE[0];
            [-3.5, 3.5].forEach((lx, idx) => {
                const meshLight = createObjectMesh(lightItem);
                meshLight.position.set(baseX + lx, 0, baseZ - 3 + idx * 6);
                scene.add(meshLight);
                placedObjects.push({
                    id: 'placed_ai_add_light_' + Date.now() + '_' + idx,
                    mesh: meshLight,
                    catalogId: lightItem.id,
                    name: isAdmin ? '💡 Tänavalamp' : '💡 Street Lamp',
                    category: 'city',
                    position: { x: meshLight.position.x, y: 0, z: meshLight.position.z },
                    rotation: { x: 0, y: 0, z: 0 },
                    scale: { x: 1, y: 1, z: 1 },
                    color: lightItem.color
                });
                generatedObjectsCount++;
            });

            // Add Fuel Tank / Gas Station prop
            const fuelItem = CATALOG_DATABASE.find(c => c.name.toLowerCase().includes('fuel') || c.name.toLowerCase().includes('tank') || c.category === 'scifi') || CATALOG_DATABASE[0];
            const meshFuel = createObjectMesh(fuelItem, '#f39c12');
            meshFuel.position.set(baseX + 4.5, 0, baseZ);
            scene.add(meshFuel);
            placedObjects.push({
                id: 'placed_ai_add_fuel_' + Date.now(),
                mesh: meshFuel,
                catalogId: fuelItem.id,
                name: isAdmin ? '⛽ Kütusetankur' : '⛽ Fuel Station',
                category: 'city',
                position: { x: meshFuel.position.x, y: 0, z: meshFuel.position.z },
                rotation: { x: 0, y: 0, z: 0 },
                scale: { x: 1, y: 1, z: 1 },
                color: '#f39c12'
            });
            generatedObjectsCount++;

            if (isAdmin) {
                aiResponse = `🚗 <strong>Lisasin autole asju juurde!</strong><br>Ehituse käigus lisasin auto juurde asfalteeritud autotee, 2 tänavavalgustit ja kütusetankuri!`;
            } else {
                aiResponse = `🚗 <strong>Added details to the car!</strong><br>During construction, I added an asphalt road, 2 street lights, and a fuel pump!`;
            }

        // B. Adding additions to TREES / NATURE
        } else if (p.includes('puu') || p.includes('mets') || p.includes('nature') || p.includes('loodus') || (selectedObject && selectedObject.category === 'nature')) {
            const targetTree = selectedObject || placedObjects.find(obj => obj.category === 'nature') || placedObjects[0];
            const baseX = targetTree ? targetTree.position.x : 0;
            const baseZ = targetTree ? targetTree.position.z : 0;

            const natureItems = CATALOG_DATABASE.filter(c => c.category === 'nature');
            const rockItem = natureItems.find(c => c.name.toLowerCase().includes('rock') || c.name.toLowerCase().includes('boulder')) || natureItems[0];
            const flowerItem = natureItems.find(c => c.name.toLowerCase().includes('flower') || c.name.toLowerCase().includes('bush')) || natureItems[1];

            // Add rocks and flowers in circle around tree
            for (let i = 0; i < 5; i++) {
                const angle = (i / 5) * Math.PI * 2;
                const r = 2.5 + (i % 2) * 1.2;
                const itm = (i % 2 === 0) ? rockItem : flowerItem;
                const mesh = createObjectMesh(itm);
                mesh.position.set(baseX + Math.cos(angle) * r, 0, baseZ + Math.sin(angle) * r);
                mesh.scale.setScalar(itm.baseScale * 0.9);
                scene.add(mesh);

                placedObjects.push({
                    id: 'placed_ai_add_nat_' + Date.now() + '_' + i,
                    mesh,
                    catalogId: itm.id,
                    name: itm.name,
                    category: 'nature',
                    position: { x: mesh.position.x, y: 0, z: mesh.position.z },
                    rotation: { x: 0, y: 0, z: 0 },
                    scale: { x: mesh.scale.x, y: mesh.scale.y, z: mesh.scale.z },
                    color: itm.color
                });
                generatedObjectsCount++;
            }

            if (isAdmin) {
                aiResponse = `🌲 <strong>Lisasin puule ja loodusele detaile juurde!</strong><br>Paigutasin puu ümber samblased kivid, kaljurahnud ja õitsvad lillepõõsad!`;
            } else {
                aiResponse = `🌲 <strong>Decorated the trees and nature!</strong><br>I placed mossy rocks, boulders, and blooming flower bushes around the trees!`;
            }

        // C. Adding additions to BUILDINGS / HOUSES
        } else {
            const targetObj = selectedObject || placedObjects[0];
            const baseX = targetObj ? targetObj.position.x : 0;
            const baseZ = targetObj ? targetObj.position.z : 0;

            // Place 4 decorative props around the object
            const props = CATALOG_DATABASE.filter(c => c.category === 'city' || c.category === 'nature');
            for (let i = 0; i < 4; i++) {
                const item = props[i % props.length];
                const mesh = createObjectMesh(item);
                mesh.position.set(baseX + ((i % 2) * 2 - 1) * 3.5, 0, baseZ + (Math.floor(i / 2) * 2 - 1) * 3.5);
                scene.add(mesh);

                placedObjects.push({
                    id: 'placed_ai_add_prop_' + Date.now() + '_' + i,
                    mesh,
                    catalogId: item.id,
                    name: item.name,
                    category: item.category,
                    position: { x: mesh.position.x, y: 0, z: mesh.position.z },
                    rotation: { x: 0, y: 0, z: 0 },
                    scale: { x: 1, y: 1, z: 1 },
                    color: item.color
                });
                generatedObjectsCount++;
            }

            if (isAdmin) {
                aiResponse = `✨ <strong>Lisasin objektile asju ja detaile juurde!</strong><br>Paigutasin ümbrusesse 4 sobivat dekoratsiooni ja elementi.`;
            } else {
                aiResponse = `✨ <strong>Added items and details to the object!</strong><br>I placed 4 fitting decorations and elements nearby.`;
            }
        }

    // 4. LENDAVAD LENNUKID & LENNUJAAM / LENNURADA (FLYABLE AIRPLANES & RUNWAY)
    } else if (
        p.includes('lennuk') || p.includes('airplane') || (p.includes('plane') && !p.includes('planet') && !p.includes('planeet')) ||
        p.includes('lendav') || p.includes('lenda') || p.includes('fly') ||
        p.includes('jet') || p.includes('aircraft') || p.includes('hävitaja') ||
        p.includes('havitaja') || p.includes('propeller') || p.includes('lennuväli') ||
        p.includes('lennuvali') || p.includes('lennurada') || p.includes('airport') || p.includes('runway')
    ) {
        if (titleInput) titleInput.value = '3D Flight Simulator';
        if (catSelect) catSelect.value = 'Racing';
        if (descInput) descInput.value = 'Airport runway with high speed flyable 3D airplanes in Playard.';

        // 1. Place Airport Runway Segments
        const roadItem = CATALOG_DATABASE.find(c => c.name.toLowerCase().includes('road') || c.geometryType.includes('road')) || CATALOG_DATABASE[0];
        for (let i = 0; i < 5; i++) {
            const mesh = createObjectMesh(roadItem);
            mesh.position.set(0, 0, (i - 2) * 14);
            mesh.scale.set(1.4, 1, 1);
            scene.add(mesh);

            placedObjects.push({
                id: 'placed_ai_runway_' + Date.now() + '_' + i,
                mesh,
                catalogId: roadItem.id,
                name: isAdmin ? `🛫 Lennurada Lõik #${i + 1}` : `🛫 Runway Section #${i + 1}`,
                category: 'city',
                position: { x: mesh.position.x, y: mesh.position.y, z: mesh.position.z },
                rotation: { x: 0, y: 0, z: 0 },
                scale: { x: 1.4, y: 1, z: 1 },
                color: roadItem.color
            });
            generatedObjectsCount++;
        }

        // 2. Place Runway Edge Lights
        const lightItem = CATALOG_DATABASE.find(c => c.name.toLowerCase().includes('light')) || CATALOG_DATABASE[0];
        [-5.2, 5.2].forEach((lx) => {
            for (let li = 0; li < 4; li++) {
                const meshLight = createObjectMesh(lightItem, '#00f2fe');
                meshLight.position.set(lx, 0, -24 + li * 16);
                meshLight.scale.set(0.7, 0.7, 0.7);
                scene.add(meshLight);

                placedObjects.push({
                    id: 'placed_ai_rlight_' + Date.now() + '_' + lx + '_' + li,
                    mesh: meshLight,
                    catalogId: lightItem.id,
                    name: isAdmin ? '💡 Rajavalgusti' : '💡 Runway Light',
                    category: 'city',
                    position: { x: meshLight.position.x, y: 0, z: meshLight.position.z },
                    rotation: { x: 0, y: 0, z: 0 },
                    scale: { x: 0.7, y: 0.7, z: 0.7 },
                    color: '#00f2fe'
                });
                generatedObjectsCount++;
            }
        });

        // 3. Place Flyable 3D Airplane on Runway
        const planeMesh = createAirplane3DMesh('#3498db');
        planeMesh.position.set(0, 0, -4);
        scene.add(planeMesh);

        placedObjects.push({
            id: 'placed_ai_plane_' + Date.now(),
            mesh: planeMesh,
            catalogId: 'vehicle_plane_' + Date.now(),
            name: isAdmin ? '✈️ Lendav Lennuk' : '✈️ Flyable Airplane',
            category: 'vehicles',
            isAirplane: true,
            position: { x: planeMesh.position.x, y: 0, z: planeMesh.position.z },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 },
            color: '#3498db'
        });
        generatedObjectsCount++;

        if (isAdmin) {
            aiResponse = `✈️ <strong>Lõin stseeni lennuraja ja lendava lennuki!</strong><br>Vajuta ülevalt <strong>▶️ Play Test Mode</strong> ja astu lennuki juurde <strong>[F]</strong>, et taevasse lennata!<br>🎮 <strong>Juhtimine:</strong> <strong>W</strong> (gaas/kiirendus), <strong>S</strong> (pidur), <strong>A/D</strong> (pööramine ja kallutus), <strong>SPACE / Q</strong> (tõus taevasse), <strong>Shift / E</strong> (laskumine).`;
        } else {
            aiResponse = `✈️ <strong>Created a runway and a flyable airplane!</strong><br>Click <strong>▶️ Play Test Mode</strong> above and approach the airplane <strong>[F]</strong> to fly into the sky!<br>🎮 <strong>Controls:</strong> <strong>W</strong> (throttle), <strong>S</strong> (brake), <strong>A/D</strong> (steer & bank), <strong>SPACE / Q</strong> (climb into sky), <strong>Shift / E</strong> (descend).`;
        }

    // 5. AUTOTEED & SÕIDETAVAD AUTOD (ROADS & DRIVABLE CARS)
    } else if (p.includes('autotee') || p.includes('autoteed') || (p.includes('tee') && !p.includes('teade')) || (p.includes('road') && !p.includes('broad')) || p.includes('sõit') || p.includes('soit') || p.includes('drive') || p.includes('car') || p.includes('auto')) {
        if (titleInput) titleInput.value = 'Highway & Supercars 3D';
        if (catSelect) catSelect.value = 'Racing';
        if (descInput) descInput.value = 'Long asphalt highway with high performance drivable supercars.';

        // 1. Place Continuous Asphalt Road Segments
        const roadItem = CATALOG_DATABASE.find(c => c.name.toLowerCase().includes('road') || c.geometryType.includes('road')) || CATALOG_DATABASE[0];
        for (let i = 0; i < 4; i++) {
            const mesh = createObjectMesh(roadItem);
            mesh.position.set(0, 0, (i - 1.5) * 13.5);
            scene.add(mesh);

            placedObjects.push({
                id: 'placed_ai_road_' + Date.now() + '_' + i,
                mesh,
                catalogId: roadItem.id,
                name: isAdmin ? `🛣️ Autotee Lõik #${i + 1}` : `🛣️ Highway Section #${i + 1}`,
                category: 'city',
                position: { x: mesh.position.x, y: mesh.position.y, z: mesh.position.z },
                rotation: { x: 0, y: 0, z: 0 },
                scale: { x: 1, y: 1, z: 1 },
                color: roadItem.color
            });
            generatedObjectsCount++;
        }

        // 2. Place Drivable Supercars
        const vehicleItems = CATALOG_DATABASE.filter(c => c.category === 'vehicles' || c.name.toLowerCase().includes('car') || c.name.toLowerCase().includes('truck'));
        const car1 = vehicleItems[0] || CATALOG_DATABASE[0];
        const meshCar1 = createObjectMesh(car1, '#e74c3c');
        meshCar1.position.set(1.8, 0, -4);
        scene.add(meshCar1);

        placedObjects.push({
            id: 'placed_ai_car_' + Date.now() + '_1',
            mesh: meshCar1,
            catalogId: car1.id,
            name: isAdmin ? '🏎️ Sõidetav Supercar' : '🏎️ Drivable Supercar',
            category: 'vehicles',
            position: { x: meshCar1.position.x, y: meshCar1.position.y, z: meshCar1.position.z },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 },
            color: '#e74c3c'
        });
        generatedObjectsCount++;

        if (isAdmin) {
            aiResponse = `🏎️ <strong>Lõin asfalteeritud autotee ja sõidetava Supercari!</strong><br>Vajuta ülevalt <strong>▶️ Play Test Mode</strong> ja astu auto juurde <strong>[F]</strong>, et autoga sõitma hakata!`;
        } else {
            aiResponse = `🏎️ <strong>Created an asphalt highway and drivable Supercar!</strong><br>Click <strong>▶️ Play Test Mode</strong> above and approach the car <strong>[F]</strong> to start driving!`;
        }

    // 5. SCI-FI / KOSMOS / SPACE
    } else if (p.includes('kosmos') || p.includes('space') || p.includes('sci-fi') || p.includes('alien') || p.includes('laev')) {
        if (titleInput) titleInput.value = 'AI Cosmic Station';
        if (catSelect) catSelect.value = 'Adventure';
        if (descInput) descInput.value = 'Sci-Fi planetary base crafted by AI.';

        const sciFiItems = CATALOG_DATABASE.filter(c => c.category === 'scifi');
        for (let i = 0; i < 8; i++) {
            const item = sciFiItems[i % sciFiItems.length] || CATALOG_DATABASE[0];
            const mesh = createObjectMesh(item);
            mesh.position.set((Math.random() - 0.5) * 25, Math.random() * 2, (Math.random() - 0.5) * 25);
            mesh.scale.setScalar(item.baseScale * (1 + Math.random() * 0.4));
            scene.add(mesh);

            placedObjects.push({
                id: 'placed_ai_' + Date.now() + '_' + i,
                mesh,
                catalogId: item.id,
                name: item.name,
                category: item.category,
                position: { x: mesh.position.x, y: mesh.position.y, z: mesh.position.z },
                rotation: { x: 0, y: 0, z: 0 },
                scale: { x: mesh.scale.x, y: mesh.scale.y, z: mesh.scale.z },
                color: item.color
            });
            generatedObjectsCount++;
        }

        if (isAdmin) {
            aiResponse = `🛸 <strong>Lõin futuristliku kosmosebaasi!</strong><br>Paigutasin stseeni ${generatedObjectsCount} kosmoselaeva ja baasistruktuuri!`;
        } else {
            aiResponse = `🛸 <strong>Created a futuristic space station!</strong><br>Placed ${generatedObjectsCount} spaceships and structures in the scene!`;
        }

    // 6. PROCEDURAL CUSTOM 3D CREATION FOR ANY OTHER OBJECT / NON-CATALOG REQUEST
    } else {
        let customName = promptText.replace(/(?:loo|lisa|tekit|tee|ehita|create|spawn|add|make|build|generate)/gi, '').trim();
        if (!customName || customName.length < 2) customName = isAdmin ? '3D Kohandatud Mudel' : '3D Custom Model';
        customName = customName.charAt(0).toUpperCase() + customName.slice(1);

        const isVehicle = p.includes('auto') || p.includes('car') || p.includes('mootorratas') || p.includes('bike') || p.includes('krossikas') || p.includes('roller') || p.includes('scooter') || p.includes('veoauto') || p.includes('truck') || p.includes('tank') || p.includes('laev') || p.includes('ship') || p.includes('paat') || p.includes('boat') || p.includes('allveelaev') || p.includes('submarine') || p.includes('rong') || p.includes('train');
        const isFlyable = p.includes('lennuk') || (p.includes('plane') && !p.includes('planet') && !p.includes('planeet')) || p.includes('airplane') || p.includes('jet') || p.includes('kopter') || p.includes('copter') || p.includes('ufo') || p.includes('rakett') || p.includes('rocket') || p.includes('kosmoselaev') || p.includes('spaceship') || p.includes('lendav');

        const customMesh = createCustomProceduralMesh(promptText, customName, false);
        if (!customMesh) {
            if (isAdmin) {
                aiResponse = `❌ <strong>Seda asja ei ole olemas!</strong><br>AI ei tundnud eset või sõna <em>"${promptText}"</em> ära ja ei oska seda luua.<br>💡 <em>Vihje: Proovi kirjeldada tuntud esemeid (nt loomad, autod, lennukid, majad, puud, robotid, toidud) või vali ese vasakult 10 000+ objekti kataloogist!</em>`;
            } else {
                aiResponse = `❌ <strong>Seda asja ei ole olemas! / This item does not exist!</strong><br>AI did not recognize <em>"${promptText}"</em> and cannot build it.<br>💡 <em>Hint: Try asking for known objects (e.g. animals, cars, airplanes, buildings, trees, robots, food) or pick an object from the 10,000+ catalog on the left!</em>`;
            }
        } else {
            customMesh.position.set(0, 0, -4.5);
            scene.add(customMesh);

            const newObj: PlacedObject = {
                id: 'placed_ai_custom_' + Date.now(),
                mesh: customMesh,
                catalogId: 'procedural_' + Date.now(),
                name: `✨ ${customName}`,
                category: (isVehicle || isFlyable) ? 'vehicles' : 'custom',
                isAirplane: isFlyable,
                position: { x: customMesh.position.x, y: customMesh.position.y, z: customMesh.position.z },
                rotation: { x: 0, y: 0, z: 0 },
                scale: { x: 1, y: 1, z: 1 },
                color: '#00f2fe'
            };
            placedObjects.push(newObj);
            generatedObjectsCount++;

            if (isAdmin) {
                aiResponse = `✨ <strong>Lõin sinu kirjelduse põhjal täiesti uue 3D mudeli!</strong><br>Paigutasin stseeni: <strong>✨ ${customName}</strong>.${(isVehicle || isFlyable) ? '<br>🚗/✈️ <em>See sõiduk on Play Test režiimis sõidetav / lennatav! Vajuta [F] sisenemiseks!</em>' : ''}`;
            } else {
                aiResponse = `✨ <strong>Created a brand new custom 3D model based on your request!</strong><br>Spawned in scene: <strong>✨ ${customName}</strong>.${(isVehicle || isFlyable) ? '<br>🚗/✈️ <em>This vehicle is drivable/flyable in Play Test mode! Press [F] to enter!</em>' : ''}`;
            }
        }
    }

    autoSaveDraft();

    // Append AI Response to chat
    if (chatLog) {
        const botMsg = document.createElement('div');
        const borderCol = '#00f2fe';
        const botTitle = '🤖 <strong>Playard AI:</strong>';
        botMsg.style.cssText = `background: rgba(255,255,255,0.08); border-left: 3px solid ${borderCol}; border-radius: 8px; padding: 10px 12px; color: #e2e8f0; line-height: 1.4;`;
        botMsg.innerHTML = `${botTitle}<br>${aiResponse}`;
        chatLog.appendChild(botMsg);
        chatLog.scrollTop = chatLog.scrollHeight;
    }
    return aiResponse;
}