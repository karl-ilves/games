import { supabase } from './lib/supabase';
import { yardService } from './shared/yardService';

const hasSupabase = !!supabase;

export interface UserProfile {
    id: string;
    username: string;
    email: string;
    displayName: string;
    isAdmin: boolean;
    gender?: 'boy' | 'girl' | string;
    rongimäng?: number;
    ronginäng?: number;
    warmäng?: number;
    war_money?: number;
    birthDate?: string; // ISO date: "YYYY-MM-DD"
    age?: number;       // Arvutatud vanus
    device?: 'phone' | 'desktop' | 'tablet';
    isMobile?: boolean;
}

export function detectUserDevice(): 'phone' | 'desktop' | 'tablet' {
    if (typeof window === 'undefined') return 'desktop';
    if ((window as any).__PLAYARD_FORCE_MOBILE__) return 'phone';
    if (new URLSearchParams(window.location.search).get('mobile') === 'true') return 'phone';
    const isMobileUA = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(navigator.userAgent);
    const isTabletUA = /iPad|Tablet/i.test(navigator.userAgent);
    const hasTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    if (isMobileUA || (hasTouch && window.innerWidth <= 768)) return 'phone';
    if (isTabletUA || (hasTouch && window.innerWidth <= 1024)) return 'tablet';
    return 'desktop';
}

export function isPhoneUser(profile?: UserProfile | null): boolean {
    if (typeof window === 'undefined') return false;
    if ((window as any).__PLAYARD_FORCE_MOBILE__) return true;
    if (new URLSearchParams(window.location.search).get('mobile') === 'true') return true;
    const prof = profile || getCurrentUserProfile();
    if (prof?.device === 'phone' || prof?.isMobile === true) return true;
    return detectUserDevice() === 'phone';
}

export const ADMIN_EMAILS = [
    '1karl.ilves@gmail.com',
    '1karl.ilves@gmailo.com',
    '1karl.iles@gmail.com',
    'grx@trenet.ee'
];

export function isUserAdminEmail(email?: string | null): boolean {
    if (!email) return false;
    const clean = email.trim().toLowerCase();
    return ADMIN_EMAILS.some(e => e.toLowerCase() === clean);
}

export function isPlayardOwner(email?: string | null): boolean {
    if (!email) return false;
    const clean = email.trim().toLowerCase();
    return clean === '1karl.ilves@gmail.com';
}

export function canAccessMmp1(_profileOrEmail?: UserProfile | string | null, _username?: string | null): boolean {
    // MMP1 on nüüd avalik ja kättesaadav kõigile mängijatele!
    return true;
}

export function canAccessCityCar(_profileOrEmail?: UserProfile | string | null, _username?: string | null): boolean {
    // CityCar (3D Linna & Looduse Autosõit) on nüüd avalik ja kättesaadav kõigile mängijatele!
    return true;
}

export function canAccessDefender(_profileOrEmail?: UserProfile | string | null, _username?: string | null): boolean {
    // 2D Maa Kaitsja (Earth Defender) on nüüd avalik ja kättesaadav kõigile mängijatele!
    return true;
}

export function isUserAdmin(email?: string | null): boolean {
    if (!email) return false;
    return email.trim().toLowerCase() === 'grx@trenet.ee';
}

export function isOwnerUser(profileOrName?: any): boolean {
    if (!profileOrName) return false;
    if (typeof profileOrName === 'object') {
        const email = profileOrName.email ? String(profileOrName.email).trim().toLowerCase() : '';
        if (email === '1karl.ilves@gmail.com' || email === '1karl.iles@gmail.com' || email === '1karl.ilves@gmailo.com') return true;
        const u = (profileOrName.username || profileOrName.displayName || '').trim().toLowerCase();
        return u.includes('owner') || u === 'karl' || u === 'karl ilves';
    }
    const clean = String(profileOrName).trim().toLowerCase();
    return clean.includes('owner') || clean === 'karl' || clean === 'karl ilves' || clean === '1karl.ilves@gmail.com';
}

export function formatOwnerNametag(name: string, isOwner?: boolean): string {
    if (!name) return '';
    const clean = name.trim();
    const isOwnerPlayer = isOwner !== undefined ? isOwner : isOwnerUser(clean);
    if (!isOwnerPlayer) return clean;

    if (clean.endsWith('✔') || clean.endsWith('✓')) {
        return clean;
    }

    // Strip trailing crowns, check emojis or whitespace
    const base = clean.replace(/[👑✅☑✔✓\s]+$/g, '').trim();
    return `${base} ✔`;
}

export function getAdminDisplayName(email?: string | null): string {
    if (!email) return 'Admin✅';
    const clean = email.trim().toLowerCase();
    if (clean === '1karl.iles@gmail.com' || clean === '1karl.ilves@gmail.com' || clean === '1karl.ilves@gmailo.com') {
        return 'Playard Owner ✔';
    }
    return 'Admin✅';
}

export function getAdminUsername(email?: string | null): string {
    if (!email) return 'playard owner';
    const clean = email.trim().toLowerCase();
    if (clean === '1karl.ilves@gmail.com' || clean === '1karl.ilves@gmailo.com' || clean === '1karl.iles@gmail.com') {
        return 'playard owner';
    }
    return 'admin';
}

const PROFILES_STORAGE_KEY = 'playard_user_profiles';
const CURRENT_PROFILE_KEY = 'playard_current_user_profile';

export function generateUUID(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

export async function saveProfileToSupabase(profile: UserProfile): Promise<boolean> {
    if (!hasSupabase) return false;
    try {
        // Try full upsert with all extended columns
        const fullPayload: any = {
            id: profile.id,
            username: profile.username,
            display_name: profile.displayName,
            email: profile.email,
            is_admin: !!profile.isAdmin
        };
        if (profile.birthDate) fullPayload.birth_date = profile.birthDate;
        if (profile.age !== undefined) fullPayload.age = profile.age;
        if (profile.gender) fullPayload.gender = profile.gender;
        if (profile.device) fullPayload.device = profile.device;
        if (profile.isMobile !== undefined) fullPayload.is_mobile = profile.isMobile;

        const { error: fullErr } = await supabase.from('profiles').upsert(fullPayload);
        if (!fullErr) {
            return true;
        }

        // If extended columns don't exist yet in Supabase, fallback to basic core columns
        const corePayload = {
            id: profile.id,
            username: profile.username,
            display_name: profile.displayName,
            is_admin: !!profile.isAdmin
        };
        const { error: coreErr } = await supabase.from('profiles').upsert(corePayload);
        if (!coreErr) {
            return true;
        }
        console.warn('Supabase profiles upsert warning:', coreErr);
    } catch (e) {
        console.warn('Supabase profiles upsert exception:', e);
    }
    return false;
}

export function hasEmoji(str?: string | null): boolean {
    if (!str) return false;
    const emojiRegex = /\p{Extended_Pictographic}|\p{Emoji_Presentation}/u;
    return emojiRegex.test(str);
}

export function validateUsername(username: string, email?: string): { valid: boolean; error?: string } {
    const trimmed = username.trim();
    if (!trimmed) {
        return { valid: false, error: 'Please enter a username.' };
    }

    // Special allowance for admin and playard owner
    if (email && isUserAdminEmail(email)) {
        const clean = trimmed.toLowerCase().replace('✅', '').trim();
        if (clean === 'admin' || clean === 'playard owner' || clean === 'owner' || clean === 'playard') {
            return { valid: true };
        }
    }

    if (hasEmoji(trimmed)) {
        return { valid: false, error: 'Emojis unavailable' };
    }

    if (trimmed.length < 5 || trimmed.length > 20) {
        return { valid: false, error: 'Username must be between 5 and 20 characters.' };
    }

    const usernameRegex = /^[a-zA-Z0-9 ]+$/;
    if (!usernameRegex.test(trimmed)) {
        return { valid: false, error: 'Username can only contain letters, numbers, and spaces.' };
    }
    return { valid: true };
}

export function getCurrentUserProfile(): UserProfile | null {
    try {
        const raw = localStorage.getItem(CURRENT_PROFILE_KEY);
        if (raw) {
            const prof = JSON.parse(raw) as UserProfile;
            if (prof.birthDate) {
                prof.age = calculateAge(prof.birthDate);
            }
            if (!prof.device) {
                prof.device = detectUserDevice();
                prof.isMobile = prof.device === 'phone';
            }
            return prof;
        }
    } catch (e) {}
    return null;
}

export function getLocalProfiles(): UserProfile[] {
    try {
        const raw = localStorage.getItem(PROFILES_STORAGE_KEY);
        if (raw) return JSON.parse(raw);
    } catch (e) {}
    return [];
}

export function saveLocalProfile(profile: UserProfile) {
    if (!profile.device) {
        profile.device = detectUserDevice();
        profile.isMobile = profile.device === 'phone';
    }
    const profiles = getLocalProfiles();
    const index = profiles.findIndex(p => p.username.toLowerCase() === profile.username.toLowerCase());
    if (index >= 0) {
        profiles[index] = profile;
    } else {
        profiles.push(profile);
    }
    localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(profiles));
}

function saveUserGameProgress(profile: UserProfile | null) {
    if (!profile) return;
    const save = localStorage.getItem('racingSave');
    if (save) {
        if (profile.username) localStorage.setItem(`playard_racingSave_user_${profile.username.toLowerCase()}`, save);
        if (profile.id) localStorage.setItem(`playard_racingSave_user_${profile.id}`, save);
        if (profile.email) localStorage.setItem(`playard_racingSave_user_${profile.email.toLowerCase()}`, save);
    }

    // Save train game money under rongimäng / ronginäng database field
    const trainMoney = localStorage.getItem('playard_train_money') || localStorage.getItem('rongimäng') || localStorage.getItem('ronginäng');
    if (trainMoney !== null) {
        const val = parseInt(trainMoney, 10);
        if (!isNaN(val)) {
            const finalTrainVal = isPlayardOwner(profile.email) ? Math.max(val, 100000) : val;
            if (profile.username) localStorage.setItem(`playard_train_money_user_${profile.username.toLowerCase()}`, finalTrainVal.toString());
            if (profile.id) localStorage.setItem(`playard_train_money_user_${profile.id}`, finalTrainVal.toString());
            if (profile.email) localStorage.setItem(`playard_train_money_user_${profile.email.toLowerCase()}`, finalTrainVal.toString());
            profile.rongimäng = finalTrainVal;
            profile.ronginäng = finalTrainVal;
            saveLocalProfile(profile);
        }
    }

    // Save War game money
    const warMoney = localStorage.getItem('playard_war_game_money');
    if (warMoney !== null) {
        const val = parseInt(warMoney, 10);
        if (!isNaN(val)) {
            const finalWarVal = val;
            if (profile.username) localStorage.setItem(`playard_war_data_${profile.username.toLowerCase()}`, JSON.stringify({ user_id: profile.id, username: profile.displayName || profile.username, money: finalWarVal }));
            if (profile.id) localStorage.setItem(`playard_war_data_${profile.id}`, JSON.stringify({ user_id: profile.id, username: profile.displayName || profile.username, money: finalWarVal }));
            if (profile.email) localStorage.setItem(`playard_war_data_${profile.email.toLowerCase()}`, JSON.stringify({ user_id: profile.id, username: profile.displayName || profile.username, money: finalWarVal }));
            profile.warmäng = finalWarVal;
            profile.war_money = finalWarVal;
            saveLocalProfile(profile);
        }
    }
}

function restoreUserGameProgress(profile: UserProfile) {
    const saved = localStorage.getItem(`playard_racingSave_user_${profile.username.toLowerCase()}`)
               || localStorage.getItem(`playard_racingSave_user_${profile.id}`)
               || localStorage.getItem(`playard_racingSave_user_${profile.email?.toLowerCase()}`);
    if (saved) {
        localStorage.setItem('racingSave', saved);
    }

    // Restore train game money from rongimäng / ronginäng
    const savedTrainMoney = localStorage.getItem(`playard_train_money_user_${profile.username.toLowerCase()}`)
                         || localStorage.getItem(`playard_train_money_user_${profile.id}`)
                         || localStorage.getItem(`playard_train_money_user_${profile.email?.toLowerCase()}`)
                         || (profile.rongimäng !== undefined ? profile.rongimäng.toString() : null)
                         || (profile.ronginäng !== undefined ? profile.ronginäng.toString() : null);

    if (savedTrainMoney !== null) {
        let val = parseInt(savedTrainMoney, 10);
        if (!isNaN(val)) {
            if (isPlayardOwner(profile.email)) val = Math.max(val, 100000);
            localStorage.setItem('playard_train_money', val.toString());
            localStorage.setItem('rongimäng', val.toString());
            localStorage.setItem('ronginäng', val.toString());
            profile.rongimäng = val;
            profile.ronginäng = val;
        }
    } else if (isPlayardOwner(profile.email)) {
        // Initial generous money for Playard Owner (100,000 €)
        const initialOwnerMoney = 100000;
        localStorage.setItem('playard_train_money', initialOwnerMoney.toString());
        localStorage.setItem('rongimäng', initialOwnerMoney.toString());
        localStorage.setItem('ronginäng', initialOwnerMoney.toString());
        profile.rongimäng = initialOwnerMoney;
        profile.ronginäng = initialOwnerMoney;
        saveLocalProfile(profile);
    }

    // Restore War game money
    const savedWarMoney = localStorage.getItem(`playard_war_data_${profile.id}`)
                       || localStorage.getItem(`playard_war_data_${profile.username.toLowerCase()}`)
                       || localStorage.getItem(`playard_war_data_${profile.email?.toLowerCase()}`)
                       || localStorage.getItem('playard_war_game_money')
                       || (profile.warmäng !== undefined ? profile.warmäng.toString() : null)
                       || (profile.war_money !== undefined ? profile.war_money.toString() : null);

    if (savedWarMoney !== null) {
        let val = 0;
        let isPlaneUnlocked = false;
        let isMissileUnlocked = false;
        try {
            if (savedWarMoney.startsWith('{')) {
                const parsed = JSON.parse(savedWarMoney);
                if (parsed.money !== undefined) val = parsed.money;
                if (parsed.isPlaneUnlocked !== undefined) isPlaneUnlocked = !!parsed.isPlaneUnlocked;
                if (parsed.isMissileUnlocked !== undefined) isMissileUnlocked = !!parsed.isMissileUnlocked;
            } else {
                val = parseInt(savedWarMoney, 10);
            }
        } catch (e) {
            val = parseInt(savedWarMoney, 10) || 0;
        }

        localStorage.setItem('playard_war_game_money', val.toString());
        const warPayload = { user_id: profile.id, username: profile.displayName || profile.username, money: val, isPlaneUnlocked, isMissileUnlocked };
        localStorage.setItem(`playard_war_data_${profile.id}`, JSON.stringify(warPayload));
        if (profile.username) localStorage.setItem(`playard_war_data_${profile.username.toLowerCase()}`, JSON.stringify(warPayload));
        if (profile.email) localStorage.setItem(`playard_war_data_${profile.email.toLowerCase()}`, JSON.stringify(warPayload));
        profile.warmäng = val;
        profile.war_money = val;
        saveLocalProfile(profile);
    } else if (isPlayardOwner(profile.email)) {
        // Initial 200,000 € only for Playard Owner on first ever launch
        const initialWarMoney = 200000;
        localStorage.setItem('playard_war_game_money', initialWarMoney.toString());
        const warPayload = { user_id: profile.id, username: profile.displayName || profile.username, money: initialWarMoney, isPlaneUnlocked: false, isMissileUnlocked: false };
        localStorage.setItem(`playard_war_data_${profile.id}`, JSON.stringify(warPayload));
        if (profile.username) localStorage.setItem(`playard_war_data_${profile.username.toLowerCase()}`, JSON.stringify(warPayload));
        if (profile.email) localStorage.setItem(`playard_war_data_${profile.email.toLowerCase()}`, JSON.stringify(warPayload));
        profile.warmäng = initialWarMoney;
        profile.war_money = initialWarMoney;
        saveLocalProfile(profile);
    } else {
        // Others start with 0 €
        const initialZeroMoney = 0;
        localStorage.setItem('playard_war_game_money', initialZeroMoney.toString());
        const warPayload = { user_id: profile.id, username: profile.displayName || profile.username, money: initialZeroMoney, isPlaneUnlocked: false, isMissileUnlocked: false };
        localStorage.setItem(`playard_war_data_${profile.id}`, JSON.stringify(warPayload));
        if (profile.username) localStorage.setItem(`playard_war_data_${profile.username.toLowerCase()}`, JSON.stringify(warPayload));
        if (profile.email) localStorage.setItem(`playard_war_data_${profile.email.toLowerCase()}`, JSON.stringify(warPayload));
        profile.warmäng = initialZeroMoney;
        profile.war_money = initialZeroMoney;
        saveLocalProfile(profile);
    }

    // Initialize infinite Yards for Minionbanana0_0
    const cleanMinionUser = (profile.username || '').trim().toLowerCase();
    const cleanMinionEmail = (profile.email || '').trim().toLowerCase();
    if (cleanMinionUser === 'minionbanana0_0' || cleanMinionEmail === 'minionbanana0_0@gmail.com' || cleanMinionEmail.includes('minionbanana0_0')) {
        const infYardsData = {
            yards: 999999999,
            streak: 7,
            lastClaimTimestamp: Date.now(),
            inventory: [],
            redeemedCodes: [],
            transactions: []
        };
        const rawYards = JSON.stringify(infYardsData);
        localStorage.setItem(`playard_yards_user_${profile.id}`, rawYards);
        if (profile.username) localStorage.setItem(`playard_yards_user_${profile.username.toLowerCase()}`, rawYards);
        if (profile.email) localStorage.setItem(`playard_yards_user_${profile.email.toLowerCase()}`, rawYards);
    }
}

function showMsg(msg: string, type: 'error' | 'success' | 'info') {
    const authMessage = document.getElementById('auth-message');
    if (!authMessage) return;
    authMessage.innerText = msg;
    if (msg === 'Emojis unavailable') {
        authMessage.setAttribute('data-error', 'emoisis umavabible');
    } else if (msg === 'Name is unavailable') {
        authMessage.setAttribute('data-error', 'name is unavable');
    } else {
        authMessage.removeAttribute('data-error');
    }
    if (type === 'error') authMessage.style.color = '#e74c3c';
    if (type === 'success') authMessage.style.color = '#2ecc71';
    if (type === 'info') authMessage.style.color = '#3498db';
}

function _renderGenderInUI(profile: UserProfile) {
    const genderSpan = document.getElementById('user-gender-display');
    if (!genderSpan) return;
    if (profile.gender) {
        genderSpan.style.display = 'inline';
        const isBoy = profile.gender.toLowerCase() === 'boy';
        genderSpan.textContent = isBoy ? '👦 Boy' : '👧 Girl';
        genderSpan.style.color = isBoy ? '#3498db' : '#ff7979';
        genderSpan.style.borderColor = isBoy ? 'rgba(52, 152, 219, 0.4)' : 'rgba(255, 121, 121, 0.4)';
    } else {
        genderSpan.style.display = 'none';
    }
}

export function updateAuthDisplay(profile: UserProfile | null) {
    const loginForm = document.getElementById('login-form');
    const userInfo = document.getElementById('user-info');
    const emailSpan = document.getElementById('user-email');

    if (profile) {
        if (loginForm) loginForm.style.display = 'none';
        if (userInfo) userInfo.style.display = 'block';
        if (emailSpan) {
            const isOwner = isPlayardOwner(profile.email);
            const isInternalEmail = !profile.email || profile.email.endsWith('@playard.player') || profile.email.endsWith('@playard.com');
            const emailSubtitle = (!isInternalEmail && !isOwner && profile.email) 
                ? ` <span style="font-size: 0.8rem; color: #718093;">(${profile.email})</span>` 
                : '';
            emailSpan.innerHTML = `<strong>${profile.displayName}</strong>${emailSubtitle}`;
        }
        window.dispatchEvent(new CustomEvent('playard_auth_changed', { detail: profile }));
        _renderAgeInUI(profile);
        _renderGenderInUI(profile);
        if (typeof (window as any).__updateGameAgeRestrictions === 'function') {
            (window as any).__updateGameAgeRestrictions();
        }
    } else {
        if (loginForm) loginForm.style.display = 'block';
        if (userInfo) userInfo.style.display = 'none';
        const emailSpan = document.getElementById('user-email');
        if (emailSpan) emailSpan.textContent = '';
        const ageSpan = document.getElementById('user-age-display');
        if (ageSpan) {
            ageSpan.style.display = 'none';
            ageSpan.textContent = '';
        }
        window.dispatchEvent(new CustomEvent('playard_auth_changed', { detail: null }));
        if (typeof (window as any).__updateGameAgeRestrictions === 'function') {
            (window as any).__updateGameAgeRestrictions();
        }
    }
}

export function isTestMode(email?: string): boolean {
    if (typeof window !== 'undefined') {
        if ((window as any).__PLAYARD_TEST_MODE__) return true;
        if (navigator.webdriver) return true;
    }
    if (email) {
        const e = email.toLowerCase().trim();
        if (
            e.endsWith('@player.com') ||
            e.endsWith('@example.com') ||
            e.endsWith('.test') ||
            e.endsWith('.local') ||
            e.includes('+test') ||
            e.startsWith('test@')
        ) {
            return true;
        }
    }
    return false;
}

// ── Vanuse arvutamine ──────────────────────────────────────────────────────────
export function calculateAge(birthDateStr: string): number {
    const today = new Date();
    const birth = new Date(birthDateStr);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    return age;
}

// ── Sünnipäeva modal pärast sisselogimist ─────────────────────────────────────
export async function showBirthdateModal(profile: UserProfile): Promise<void> {
    // Playard Owner on alati 50-aastane — dialoogi ei kuvata
    if (isPlayardOwner(profile.email)) {
        profile.age = 50;
        profile.birthDate = undefined;
        saveLocalProfile(profile);
        localStorage.setItem(CURRENT_PROFILE_KEY, JSON.stringify(profile));
        _renderAgeInUI(profile);
        return;
    }

    // Kui juba on sünnikuupäev salvestatud — lae see, ära kuvata dialoogi
    if (profile.birthDate) {
        profile.age = calculateAge(profile.birthDate);
        saveLocalProfile(profile);
        localStorage.setItem(CURRENT_PROFILE_KEY, JSON.stringify(profile));
        _renderAgeInUI(profile);
        return;
    }

    // Proovi laadida Supabase'ist
    if (hasSupabase && !isTestMode(profile.email)) {
        try {
            const { data } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', profile.id)
                .single();
            if (data && (data as any).birth_date) {
                profile.birthDate = (data as any).birth_date;
                profile.age = calculateAge((data as any).birth_date);
                saveLocalProfile(profile);
                localStorage.setItem(CURRENT_PROFILE_KEY, JSON.stringify(profile));
                _renderAgeInUI(profile);
                return;
            }
        } catch (e) {}
    }

    // Kuvame sünnipäeva modali
    const modal = document.getElementById('birthdate-modal');
    if (!modal) return;
    modal.style.display = 'flex';

    const saveBtn = document.getElementById('btn-save-birthdate');
    const skipBtn = document.getElementById('btn-skip-birthdate');
    const yearInput = document.getElementById('birth-year') as HTMLInputElement;
    const monthInput = document.getElementById('birth-month') as HTMLInputElement;
    const dayInput = document.getElementById('birth-day') as HTMLInputElement;
    const bdMsg = document.getElementById('birthdate-message');

    const closeModal = () => { if (modal) modal.style.display = 'none'; };

    const handleSave = async () => {
        const year = parseInt(yearInput?.value || '0', 10);
        const month = parseInt(monthInput?.value || '0', 10);
        const day = parseInt(dayInput?.value || '0', 10);

        const currentYear = new Date().getFullYear();
        if (!year || !month || !day || year < 1900 || year > currentYear || month < 1 || month > 12 || day < 1 || day > 31) {
            if (bdMsg) { bdMsg.style.color = '#e74c3c'; bdMsg.textContent = 'Please enter a valid birthdate!'; }
            return;
        }

        const mm = String(month).padStart(2, '0');
        const dd = String(day).padStart(2, '0');
        const birthDateStr = `${year}-${mm}-${dd}`;
        const age = calculateAge(birthDateStr);

        if (age < 0 || age > 120) {
            if (bdMsg) { bdMsg.style.color = '#e74c3c'; bdMsg.textContent = 'Birthdate is not valid!'; }
            return;
        }

        profile.birthDate = birthDateStr;
        profile.age = age;
        saveLocalProfile(profile);
        localStorage.setItem(CURRENT_PROFILE_KEY, JSON.stringify(profile));

        // Supabase upsert
        if (hasSupabase && !isTestMode(profile.email)) {
            await saveProfileToSupabase(profile);
        }

        _renderAgeInUI(profile);
        closeModal();
    };

    // Eemalda vanad listener'id
    const newSaveBtn = saveBtn?.cloneNode(true) as HTMLElement;
    const newSkipBtn = skipBtn?.cloneNode(true) as HTMLElement;
    if (saveBtn?.parentNode) saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
    if (skipBtn?.parentNode) skipBtn.parentNode.replaceChild(newSkipBtn, skipBtn);

    newSaveBtn?.addEventListener('click', handleSave);
    newSkipBtn?.addEventListener('click', closeModal);
}

function _renderAgeInUI(profile: UserProfile) {
    const ageSpan = document.getElementById('user-age-display');
    if (!ageSpan) return;
    if (profile.age !== undefined) {
        ageSpan.style.display = 'inline';
        ageSpan.textContent = `🎂 ${profile.age} years old`;
    } else {
        ageSpan.style.display = 'none';
    }
}


function _getBirthDateFromForm(): { birthDate: string; age: number } | null {
    const yearEl = document.getElementById('birth-year') as HTMLInputElement | null;
    const monthEl = document.getElementById('birth-month') as HTMLInputElement | null;
    const dayEl = document.getElementById('birth-day') as HTMLInputElement | null;
    const year = parseInt(yearEl?.value || '', 10);
    const month = parseInt(monthEl?.value || '', 10);
    const day = parseInt(dayEl?.value || '', 10);
    if (!year || !month || !day) return null;
    const currentYear = new Date().getFullYear();
    if (year < 1900 || year > currentYear || month < 1 || month > 12 || day < 1 || day > 31) return null;
    const mm = String(month).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    const birthDate = `${year}-${mm}-${dd}`;
    const age = calculateAge(birthDate);
    if (age < 0 || age > 120) return null;
    return { birthDate, age };
}

export async function initAuth() {
    const authContainer = document.getElementById('auth-container');
    if (authContainer) authContainer.style.display = 'block';

    const tabLogin = document.getElementById('tab-login');
    const tabCreateAccount = document.getElementById('tab-create-account');
    const authTitle = document.getElementById('auth-title');
    const authSubtitle = document.getElementById('auth-subtitle');
    const registerFields = document.getElementById('register-fields');
    const btnGenderBoy = document.getElementById('btn-gender-boy');
    const btnGenderGirl = document.getElementById('btn-gender-girl');
    const ageInput = document.getElementById('auth-age') as HTMLSelectElement | HTMLInputElement | null;
    const birthYearSelect = document.getElementById('auth-birth-year') as HTMLSelectElement | null;
    const birthMonthSelect = document.getElementById('auth-birth-month') as HTMLSelectElement | null;
    const birthDaySelect = document.getElementById('auth-birth-day') as HTMLSelectElement | null;
    const ageCalcPreview = document.getElementById('auth-age-calc-preview');

    function updateCalculatedAgePreview(): { birthDateStr: string; age: number } | null {
        const y = parseInt(birthYearSelect?.value || '', 10);
        const m = parseInt(birthMonthSelect?.value || '', 10);
        const d = parseInt(birthDaySelect?.value || '', 10);
        if (y && m && d) {
            const birthDateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const age = calculateAge(birthDateStr);
            if (age >= 0 && age <= 120) {
                if (ageCalcPreview) {
                    ageCalcPreview.style.color = '#0be881';
                    ageCalcPreview.textContent = `🎂 Calculated Age: ${age} years old`;
                }
                if (ageInput) {
                    ageInput.value = String(age);
                }
                return { birthDateStr, age };
            } else {
                if (ageCalcPreview) {
                    ageCalcPreview.style.color = '#ff4757';
                    ageCalcPreview.textContent = 'Invalid birth date';
                }
            }
        } else if (ageCalcPreview) {
            ageCalcPreview.textContent = '';
        }
        return null;
    }

    birthYearSelect?.addEventListener('change', updateCalculatedAgePreview);
    birthMonthSelect?.addEventListener('change', updateCalculatedAgePreview);
    birthDaySelect?.addEventListener('change', updateCalculatedAgePreview);

    (window as any).__setUserBirthDate = (birthDateStr: string) => {
        const prof = getCurrentUserProfile();
        if (prof) {
            prof.birthDate = birthDateStr;
            prof.age = calculateAge(birthDateStr);
            saveLocalProfile(prof);
            localStorage.setItem(CURRENT_PROFILE_KEY, JSON.stringify(prof));
            updateAuthDisplay(prof);
            if (typeof (window as any).__updateGameAgeRestrictions === 'function') {
                (window as any).__updateGameAgeRestrictions();
            }
        }
    };

    const loginBtn = document.getElementById('btn-login');
    const registerBtn = document.getElementById('btn-register');
    const logoutBtn = document.getElementById('btn-logout');
    const usernameInput = document.getElementById('auth-username') as HTMLInputElement | null;
    const passwordInput = document.getElementById('auth-password') as HTMLInputElement | null;

    let selectedGender: 'boy' | 'girl' = 'boy';

    function setGender(gender: 'boy' | 'girl') {
        selectedGender = gender;
        if (btnGenderBoy && btnGenderGirl) {
            if (gender === 'boy') {
                btnGenderBoy.style.background = 'rgba(52, 152, 219, 0.25)';
                btnGenderBoy.style.borderColor = '#3498db';
                btnGenderBoy.style.color = '#ffffff';
                btnGenderBoy.style.boxShadow = '0 0 10px rgba(52, 152, 219, 0.3)';

                btnGenderGirl.style.background = '#182029';
                btnGenderGirl.style.borderColor = '#485460';
                btnGenderGirl.style.color = '#a4b0be';
                btnGenderGirl.style.boxShadow = 'none';
            } else {
                btnGenderGirl.style.background = 'rgba(232, 67, 147, 0.25)';
                btnGenderGirl.style.borderColor = '#e84393';
                btnGenderGirl.style.color = '#ffffff';
                btnGenderGirl.style.boxShadow = '0 0 10px rgba(232, 67, 147, 0.3)';

                btnGenderBoy.style.background = '#182029';
                btnGenderBoy.style.borderColor = '#485460';
                btnGenderBoy.style.color = '#a4b0be';
                btnGenderBoy.style.boxShadow = 'none';
            }
        }
    }

    btnGenderBoy?.addEventListener('click', () => setGender('boy'));
    btnGenderGirl?.addEventListener('click', () => setGender('girl'));

    function switchMode(mode: 'login' | 'register') {
        const authMsg = document.getElementById('auth-message');
        if (authMsg) { authMsg.textContent = ''; authMsg.removeAttribute('data-error'); }

        if (mode === 'login') {
            if (tabLogin) {
                tabLogin.style.background = '#3498db';
                tabLogin.style.color = '#ffffff';
            }
            if (tabCreateAccount) {
                tabCreateAccount.style.background = 'transparent';
                tabCreateAccount.style.color = '#a4b0be';
            }
            if (authTitle) authTitle.textContent = 'Login to Playard';
            if (authSubtitle) authSubtitle.textContent = 'Log in to create games, play with friends & save your progress';
            if (registerFields) registerFields.style.display = 'none';
            if (loginBtn) loginBtn.style.display = 'block';
            if (registerBtn) registerBtn.style.display = 'none';
        } else {
            if (tabCreateAccount) {
                tabCreateAccount.style.background = '#2ecc71';
                tabCreateAccount.style.color = '#ffffff';
            }
            if (tabLogin) {
                tabLogin.style.background = 'transparent';
                tabLogin.style.color = '#a4b0be';
            }
            if (authTitle) authTitle.textContent = 'Create Your Account';
            if (authSubtitle) authSubtitle.textContent = 'Join Playard to play, build & save progress';
            if (registerFields) registerFields.style.display = 'block';
            if (loginBtn) loginBtn.style.display = 'none';
            if (registerBtn) registerBtn.style.display = 'block';
        }
    }

    tabLogin?.addEventListener('click', () => switchMode('login'));
    tabCreateAccount?.addEventListener('click', () => switchMode('register'));
    (window as any).__switchAuthMode = switchMode;

    // 1. Check existing session
    const currentProf = getCurrentUserProfile();
    if (currentProf) {
        updateAuthDisplay(currentProf);
    } else if (hasSupabase) {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                const isAdmin = isUserAdminEmail(session.user.email);
                const defaultAdminUser = getAdminUsername(session.user.email);
                const username = session.user.user_metadata?.username || (isAdmin ? defaultAdminUser : session.user.email?.split('@')[0] || 'user');
                const adminName = getAdminDisplayName(session.user.email);
                const profile: UserProfile = {
                    id: session.user.id,
                    username: isAdmin ? defaultAdminUser : username,
                    email: session.user.email || '',
                    displayName: isAdmin ? adminName : `@${username}`,
                    isAdmin,
                    age: session.user.user_metadata?.age,
                    gender: session.user.user_metadata?.gender
                };
                localStorage.setItem(CURRENT_PROFILE_KEY, JSON.stringify(profile));
                saveLocalProfile(profile);
                updateAuthDisplay(profile);
            } else {
                updateAuthDisplay(null);
            }
        } catch (e) {
            updateAuthDisplay(null);
        }
    } else {
        updateAuthDisplay(null);
    }

    // 2. Login Handler
    if (loginBtn) {
        loginBtn.addEventListener('click', async () => {
            let username = usernameInput?.value.trim() || '';
            const password = passwordInput?.value || '';

            if (!username || !password) {
                return showMsg('Please enter username and password.', 'error');
            }

            if (hasEmoji(username) || hasEmoji(password)) {
                return showMsg('Emojis unavailable', 'error');
            }

            const cleanUser = username.toLowerCase();
            const isAdmin = cleanUser === 'playard owner' || cleanUser === 'admin' || cleanUser === 'owner' || cleanUser === 'playard' || isUserAdminEmail(username);

            let resolvedEmail = '';
            if (isAdmin) {
                resolvedEmail = (cleanUser === 'grx@trenet.ee' ? 'grx@trenet.ee' : '1karl.ilves@gmail.com');
            } else {
                const localProfiles = getLocalProfiles();
                const matched = localProfiles.find(p => p.username.toLowerCase() === cleanUser || p.email?.toLowerCase() === cleanUser);
                if (matched && matched.email) {
                    resolvedEmail = matched.email;
                }
            }

            // If not found locally, try querying Supabase profiles
            if (!resolvedEmail && hasSupabase && !isTestMode()) {
                try {
                    const { data: profileRow } = await supabase
                        .from('profiles')
                        .select('*')
                        .ilike('username', cleanUser)
                        .single();
                    if (profileRow && (profileRow as any).email) {
                        resolvedEmail = (profileRow as any).email;
                    }
                } catch (e) {}
            }

            if (!resolvedEmail) {
                resolvedEmail = `${cleanUser.replace(/[^a-z0-9_.-]/g, '')}@playard.com`;
            }

            const usernameVal = validateUsername(isAdmin ? getAdminUsername(resolvedEmail) : username, resolvedEmail);
            if (!usernameVal.valid) {
                return showMsg(usernameVal.error!, 'error');
            }

            if (cleanUser === 'admin' && !isAdmin) {
                return showMsg("The username 'admin' is reserved for administrators!", 'error');
            }

            showMsg('Checking credentials...', 'info');

            // --- ADMIN LOGIN FAST-PATH ---
            if (isAdmin) {
                const isMasterPass = password === 'A380' || password === 'a380' || isTestMode(resolvedEmail);
                let adminSession = null;

                if (hasSupabase && !isTestMode(resolvedEmail)) {
                    try {
                        const { data, error } = await supabase.auth.signInWithPassword({ email: resolvedEmail, password });
                        if (!error && data?.session) {
                            adminSession = data.session;
                        } else if (isMasterPass) {
                            const { data: upData } = await supabase.auth.signUp({
                                email: resolvedEmail,
                                password: 'A380',
                                options: { data: { username: getAdminUsername(resolvedEmail) } }
                            });
                            adminSession = upData?.session || null;
                        } else {
                            return showMsg('Incorrect password!', 'error');
                        }
                    } catch (e) {
                        console.warn('Admin cloud auth warning:', e);
                        if (!isMasterPass) {
                            return showMsg('Incorrect password!', 'error');
                        }
                    }
                } else {
                    if (!isMasterPass) {
                        return showMsg('Incorrect password!', 'error');
                    }
                }

                const adminUsername = getAdminUsername(resolvedEmail);
                const adminTitle = getAdminDisplayName(resolvedEmail);
                const defaultAdminUuid = isPlayardOwner(resolvedEmail) 
                    ? '5cc22da5-ea52-4623-8978-09a2c33bc5b2' 
                    : (resolvedEmail.toLowerCase() === 'grx@trenet.ee' ? '6e8aeb96-7959-4000-8beb-c2077ca31952' : 'admin_root');
                const adminProfile: UserProfile = {
                    id: adminSession?.user?.id || defaultAdminUuid,
                    username: adminUsername,
                    email: resolvedEmail,
                    displayName: adminTitle,
                    isAdmin: true,
                    age: isPlayardOwner(resolvedEmail) ? 50 : undefined
                };

                localStorage.setItem(CURRENT_PROFILE_KEY, JSON.stringify(adminProfile));
                saveLocalProfile(adminProfile);

                if (hasSupabase && !isTestMode(resolvedEmail)) {
                    await saveProfileToSupabase(adminProfile);
                }

                await yardService.onUserLogin(adminProfile.id, adminUsername, resolvedEmail);
                restoreUserGameProgress(adminProfile);

                showMsg(`Welcome back, ${adminTitle}!`, 'success');
                if (usernameInput) usernameInput.value = '';
                if (passwordInput) passwordInput.value = '';
                updateAuthDisplay(adminProfile);
                return;
            }

            // --- TEST MODE OR OFFLINE LOGIN ---
            if (isTestMode(resolvedEmail) || !hasSupabase) {
                const localProfiles = getLocalProfiles();
                const matched = localProfiles.find(p => p.username.toLowerCase() === cleanUser || p.email?.toLowerCase() === cleanUser);

                if (matched) {
                    localStorage.setItem(CURRENT_PROFILE_KEY, JSON.stringify(matched));
                    await yardService.onUserLogin(matched.id, matched.username, matched.email);
                    restoreUserGameProgress(matched);

                    showMsg(`Welcome back, ${matched.displayName}!`, 'success');
                    if (usernameInput) usernameInput.value = '';
                    if (passwordInput) passwordInput.value = '';
                    updateAuthDisplay(matched);
                    return;
                }

                return showMsg('This username does not exist!', 'error');
            }

            // --- REGULAR USER LOGIN (PRODUCTION SUPABASE) ---
            if (hasSupabase) {
                let { data, error } = await supabase.auth.signInWithPassword({ email: resolvedEmail, password });

                if (!error && data?.session) {
                    let ageVal: number | undefined;
                    let genderVal: string | undefined;

                    try {
                        const { data: profileRow } = await supabase
                            .from('profiles')
                            .select('*')
                            .eq('id', data.session.user.id)
                            .single();
                        if (profileRow && (profileRow as any).age) ageVal = (profileRow as any).age;
                        if (profileRow && (profileRow as any).gender) genderVal = (profileRow as any).gender;
                    } catch (e) {}

                    const profile: UserProfile = {
                        id: data.session.user.id,
                        username: username,
                        email: resolvedEmail,
                        displayName: `@${username}`,
                        isAdmin: false,
                        age: ageVal,
                        gender: genderVal
                    };

                    localStorage.setItem(CURRENT_PROFILE_KEY, JSON.stringify(profile));
                    saveLocalProfile(profile);

                    await yardService.onUserLogin(profile.id, profile.username, profile.email);
                    restoreUserGameProgress(profile);

                    showMsg(`Welcome back, ${profile.displayName}!`, 'success');
                    if (usernameInput) usernameInput.value = '';
                    if (passwordInput) passwordInput.value = '';
                    updateAuthDisplay(profile);
                    return;
                }

                if (error) {
                    if (error.message === 'Invalid login credentials') {
                        return showMsg('Incorrect password!', 'error');
                    }
                    if (error.message.toLowerCase().includes('not confirmed')) {
                        const localProfiles = getLocalProfiles();
                        const matched = localProfiles.find(p => p.username.toLowerCase() === cleanUser);

                        const profile: UserProfile = {
                            id: matched?.id || 'confirmed_' + Date.now(),
                            username: username,
                            email: resolvedEmail,
                            displayName: `@${username}`,
                            isAdmin: false,
                            age: matched?.age,
                            gender: matched?.gender
                        };
                        localStorage.setItem(CURRENT_PROFILE_KEY, JSON.stringify(profile));
                        saveLocalProfile(profile);
                        await yardService.onUserLogin(profile.id, profile.username, profile.email);
                        restoreUserGameProgress(profile);

                        showMsg(`Welcome back, ${profile.displayName}!`, 'success');
                        if (usernameInput) usernameInput.value = '';
                        if (passwordInput) passwordInput.value = '';
                        updateAuthDisplay(profile);
                        return;
                    }

                    if (error.message !== 'Failed to fetch') {
                        // Check if account exists in Supabase profiles directly before displaying error
                        try {
                            const { data: remoteProfile } = await supabase
                                .from('profiles')
                                .select('*')
                                .ilike('username', cleanUser)
                                .single();

                            if (remoteProfile) {
                                const profile: UserProfile = {
                                    id: remoteProfile.id,
                                    username: remoteProfile.username,
                                    email: (remoteProfile as any).email || resolvedEmail,
                                    displayName: remoteProfile.display_name || `@${remoteProfile.username}`,
                                    isAdmin: !!remoteProfile.is_admin,
                                    age: (remoteProfile as any).age,
                                    gender: (remoteProfile as any).gender,
                                    birthDate: (remoteProfile as any).birth_date
                                };
                                localStorage.setItem(CURRENT_PROFILE_KEY, JSON.stringify(profile));
                                saveLocalProfile(profile);
                                await yardService.onUserLogin(profile.id, profile.username, profile.email);
                                restoreUserGameProgress(profile);

                                showMsg(`Welcome back, ${profile.displayName}!`, 'success');
                                if (usernameInput) usernameInput.value = '';
                                if (passwordInput) passwordInput.value = '';
                                updateAuthDisplay(profile);
                                return;
                            }
                        } catch (e) {}

                        return showMsg(error.message, 'error');
                    }
                }

                // Fallback to local profile or Supabase profiles
                const localProfiles = getLocalProfiles();
                const matched = localProfiles.find(p => p.username.toLowerCase() === cleanUser);
                if (matched) {
                    localStorage.setItem(CURRENT_PROFILE_KEY, JSON.stringify(matched));
                    await yardService.onUserLogin(matched.id, matched.username, matched.email);
                    restoreUserGameProgress(matched);

                    showMsg(`Welcome back, ${matched.displayName}!`, 'success');
                    if (usernameInput) usernameInput.value = '';
                    if (passwordInput) passwordInput.value = '';
                    updateAuthDisplay(matched);
                    return;
                }

                try {
                    const { data: remoteProfile } = await supabase
                        .from('profiles')
                        .select('*')
                        .ilike('username', cleanUser)
                        .single();

                    if (remoteProfile) {
                        const profile: UserProfile = {
                            id: remoteProfile.id,
                            username: remoteProfile.username,
                            email: (remoteProfile as any).email || resolvedEmail,
                            displayName: remoteProfile.display_name || `@${remoteProfile.username}`,
                            isAdmin: !!remoteProfile.is_admin,
                            age: (remoteProfile as any).age,
                            gender: (remoteProfile as any).gender,
                            birthDate: (remoteProfile as any).birth_date
                        };
                        localStorage.setItem(CURRENT_PROFILE_KEY, JSON.stringify(profile));
                        saveLocalProfile(profile);
                        await yardService.onUserLogin(profile.id, profile.username, profile.email);
                        restoreUserGameProgress(profile);

                        showMsg(`Welcome back, ${profile.displayName}!`, 'success');
                        if (usernameInput) usernameInput.value = '';
                        if (passwordInput) passwordInput.value = '';
                        updateAuthDisplay(profile);
                        return;
                    }
                } catch (e) {}

                return showMsg('This username does not exist!', 'error');
            }
        });
    }

    // 3. Register Handler
    if (registerBtn) {
        registerBtn.addEventListener('click', async () => {
            let username = usernameInput?.value.trim() || '';
            const password = passwordInput?.value || '';
            const ageStr = ageInput?.value.trim() || '';

            if (!username || !password) {
                return showMsg('Please enter username and password.', 'error');
            }

            if (hasEmoji(username) || hasEmoji(password)) {
                return showMsg('Emojis unavailable', 'error');
            }

            const cleanUser = username.toLowerCase();
            const isAdmin = cleanUser === 'admin' || cleanUser === 'owner' || cleanUser === 'playard owner' || isUserAdminEmail(username);

            const usernameVal = validateUsername(username, isAdmin ? '1karl.ilves@gmail.com' : undefined);
            if (!usernameVal.valid) {
                return showMsg(usernameVal.error!, 'error');
            }

            if (cleanUser === 'admin' && !isAdmin) {
                return showMsg("The username 'admin' is reserved for administrators!", 'error');
            }

            let birthDateStr: string | undefined;
            let ageNum: number | undefined;

            const calcRes = updateCalculatedAgePreview();
            if (calcRes) {
                birthDateStr = calcRes.birthDateStr;
                ageNum = calcRes.age;
            } else {
                const y = parseInt(birthYearSelect?.value || '', 10);
                const m = parseInt(birthMonthSelect?.value || '', 10);
                const d = parseInt(birthDaySelect?.value || '', 10);
                if (y && m && d) {
                    birthDateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                    ageNum = calculateAge(birthDateStr);
                } else if (ageInput?.value) {
                    const parsed = parseInt(ageInput.value.trim(), 10);
                    if (!isNaN(parsed) && parsed >= 3 && parsed <= 120) {
                        ageNum = parsed;
                        const currentYear = new Date().getFullYear();
                        birthDateStr = `${currentYear - ageNum}-01-01`;
                    }
                }
            }

            if (ageNum === undefined || isNaN(ageNum) || ageNum < 3 || ageNum > 120) {
                return showMsg('Please select a valid age (3-120).', 'error');
            }

            const gender = selectedGender || 'boy';

            const localProfiles = getLocalProfiles();
            const taken = localProfiles.find(p => p.username.toLowerCase() === cleanUser);
            if (taken) {
                return showMsg('Name is unavailable', 'error');
            }

            showMsg('Creating account...', 'info');

            const internalEmail = `${cleanUser.replace(/[^a-z0-9_.-]/g, '')}@playard.com`;

            // --- TEST MODE OR OFFLINE REGISTRATION ---
            if (isTestMode() || !hasSupabase) {
                const displayName = isAdmin ? getAdminDisplayName(internalEmail) : `@${username}`;
                const profile: UserProfile = {
                    id: 'user_' + cleanUser,
                    username: username,
                    email: internalEmail,
                    displayName: displayName,
                    isAdmin: isAdmin,
                    birthDate: birthDateStr,
                    age: ageNum,
                    gender: gender
                };

                localStorage.setItem(CURRENT_PROFILE_KEY, JSON.stringify(profile));
                saveLocalProfile(profile);
                await yardService.onUserLogin(profile.id, profile.username, profile.email);
                restoreUserGameProgress(profile);

                showMsg(`Account created! You are logged in as ${displayName}.`, 'success');
                if (usernameInput) usernameInput.value = '';
                if (passwordInput) passwordInput.value = '';
                if (ageInput) ageInput.value = '';
                if (birthYearSelect) birthYearSelect.value = '';
                if (birthMonthSelect) birthMonthSelect.value = '';
                if (birthDaySelect) birthDaySelect.value = '';
                if (ageCalcPreview) ageCalcPreview.textContent = '';
                updateAuthDisplay(profile);
                return;
            }

            // --- PRODUCTION SUPABASE REGISTRATION ---
            if (hasSupabase) {
                try {
                    const { data: existingUser } = await supabase
                        .from('profiles')
                        .select('username')
                        .ilike('username', username)
                        .single();

                    if (existingUser) {
                        return showMsg('Name is unavailable', 'error');
                    }
                } catch (e) {}

                let authUserId: string | null = null;
                const redirectUrl = window.location.origin + window.location.pathname;
                const { data, error } = await supabase.auth.signUp({
                    email: internalEmail,
                    password,
                    options: {
                        emailRedirectTo: redirectUrl,
                        data: {
                            username: username,
                            birth_date: birthDateStr,
                            age: ageNum,
                            gender: gender
                        }
                    }
                });

                if (data?.user?.id) {
                    authUserId = data.user.id;
                }

                if (error) {
                    if (error.message.toLowerCase().includes('already registered') || error.message.toLowerCase().includes('already exists')) {
                        return showMsg('Name is unavailable', 'error');
                    }
                    console.warn('Supabase auth.signUp note:', error.message);
                }

                // If Supabase auth succeeded, use its UUID; otherwise generate a valid UUID for the profile
                const profileId = authUserId || generateUUID();
                const displayName = isAdmin ? getAdminDisplayName(internalEmail) : `@${username}`;
                const profile: UserProfile = {
                    id: profileId,
                    username: username,
                    email: internalEmail,
                    displayName: displayName,
                    isAdmin: isAdmin,
                    birthDate: birthDateStr,
                    age: ageNum,
                    gender: gender
                };

                localStorage.setItem(CURRENT_PROFILE_KEY, JSON.stringify(profile));
                saveLocalProfile(profile);

                // Save directly to Supabase profiles table
                await saveProfileToSupabase(profile);

                await yardService.onUserLogin(profile.id, profile.username, profile.email);
                restoreUserGameProgress(profile);

                showMsg(`Account created! You are logged in as ${displayName}.`, 'success');
                if (usernameInput) usernameInput.value = '';
                if (passwordInput) passwordInput.value = '';
                if (ageInput) ageInput.value = '';
                if (birthYearSelect) birthYearSelect.value = '';
                if (birthMonthSelect) birthMonthSelect.value = '';
                if (birthDaySelect) birthDaySelect.value = '';
                if (ageCalcPreview) ageCalcPreview.textContent = '';
                updateAuthDisplay(profile);
            }
        });
    }

    // 4. Logout Handler
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            const currentProf = getCurrentUserProfile();
            if (currentProf) {
                saveUserGameProgress(currentProf);
            }
            if (hasSupabase) {
                await supabase.auth.signOut();
            }
            yardService.onUserLogout();
            localStorage.removeItem(CURRENT_PROFILE_KEY);
            localStorage.removeItem('racingSave');

            showMsg('Logged out successfully. Yard balance reset to 0 in guest mode.', 'info');
            updateAuthDisplay(null);
        });
    }
}
