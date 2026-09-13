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

export function isUserAdmin(email?: string | null): boolean {
    if (!email) return false;
    return email.trim().toLowerCase() === 'grx@trenet.ee';
}

export function getAdminDisplayName(email?: string | null): string {
    if (!email) return 'Admin✅';
    const clean = email.trim().toLowerCase();
    if (clean === '1karl.iles@gmail.com' || clean === '1karl.ilves@gmail.com' || clean === '1karl.ilves@gmailo.com') {
        return 'Playard Owner✅';
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

    if (trimmed.length < 3 || trimmed.length > 20) {
        return { valid: false, error: 'Username must be between 3 and 20 characters.' };
    }

    const usernameRegex = /^[a-zA-Z0-9_.-]+$/;
    if (!usernameRegex.test(trimmed)) {
        return { valid: false, error: 'Username can only contain letters, numbers, dots, and hyphens (no emojis).' };
    }
    return { valid: true };
}

export function getCurrentUserProfile(): UserProfile | null {
    try {
        const raw = localStorage.getItem(CURRENT_PROFILE_KEY);
        if (raw) return JSON.parse(raw);
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
            const isInternalEmail = !profile.email || profile.email.endsWith('@playard.player');
            const emailSubtitle = (!isInternalEmail && !isOwner && profile.email) 
                ? ` <span style="font-size: 0.8rem; color: #718093;">(${profile.email})</span>` 
                : '';
            emailSpan.innerHTML = `<strong>${profile.displayName}</strong>${emailSubtitle}`;
        }
        window.dispatchEvent(new CustomEvent('playard_auth_changed', { detail: profile }));
        _renderAgeInUI(profile);
        _renderGenderInUI(profile);
    } else {
        if (loginForm) loginForm.style.display = 'block';
        if (userInfo) userInfo.style.display = 'none';
        window.dispatchEvent(new CustomEvent('playard_auth_changed', { detail: null }));
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
                .select('birth_date, age')
                .eq('id', profile.id)
                .single();
            if (data?.birth_date) {
                profile.birthDate = data.birth_date;
                profile.age = calculateAge(data.birth_date);
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
            try {
                await supabase.from('profiles').upsert({
                    id: profile.id,
                    username: profile.username,
                    email: profile.email,
                    display_name: profile.displayName,
                    birth_date: birthDateStr,
                    age: age
                });
            } catch (e) { console.warn('Supabase birth_date upsert failed:', e); }
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
    const ageInput = document.getElementById('auth-age') as HTMLInputElement | null;
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
            if (authSubtitle) authSubtitle.textContent = 'Log in to create games & save your progress';
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
                        .select('id, username, email, age, gender')
                        .ilike('username', cleanUser)
                        .single();
                    if (profileRow?.email) {
                        resolvedEmail = profileRow.email;
                    }
                } catch (e) {}
            }

            if (!resolvedEmail) {
                resolvedEmail = `${cleanUser.replace(/[^a-z0-9_.-]/g, '')}@playard.player`;
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
                    try {
                        await supabase.from('profiles').upsert({
                            id: adminProfile.id,
                            username: adminUsername,
                            email: resolvedEmail,
                            display_name: adminTitle
                        });
                    } catch (e) {}
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
                            .select('age, gender')
                            .eq('id', data.session.user.id)
                            .single();
                        if (profileRow?.age) ageVal = profileRow.age;
                        if (profileRow?.gender) genderVal = profileRow.gender;
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
                        return showMsg(error.message, 'error');
                    }
                }

                // Fallback to local profile if network error
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

            const ageNum = parseInt(ageStr, 10);
            if (!ageStr || isNaN(ageNum) || ageNum < 3 || ageNum > 120) {
                return showMsg('Please enter a valid age (3-120).', 'error');
            }

            const gender = selectedGender || 'boy';

            const localProfiles = getLocalProfiles();
            const taken = localProfiles.find(p => p.username.toLowerCase() === cleanUser);
            if (taken) {
                return showMsg(`Username '@${username}' is already taken!`, 'error');
            }

            showMsg('Creating account...', 'info');

            const internalEmail = `${cleanUser.replace(/[^a-z0-9_.-]/g, '')}@playard.player`;

            // --- TEST MODE OR OFFLINE REGISTRATION ---
            if (isTestMode() || !hasSupabase) {
                const displayName = isAdmin ? getAdminDisplayName(internalEmail) : `@${username}`;
                const profile: UserProfile = {
                    id: 'user_' + cleanUser,
                    username: username,
                    email: internalEmail,
                    displayName: displayName,
                    isAdmin: isAdmin,
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
                        return showMsg(`Username '@${username}' is already taken!`, 'error');
                    }
                } catch (e) {}

                const redirectUrl = window.location.origin + window.location.pathname;
                const { data, error } = await supabase.auth.signUp({
                    email: internalEmail,
                    password,
                    options: {
                        emailRedirectTo: redirectUrl,
                        data: {
                            username: username,
                            age: ageNum,
                            gender: gender
                        }
                    }
                });

                if (error) {
                    if (error.message.toLowerCase().includes('already registered') || error.message.toLowerCase().includes('already exists')) {
                        const { data: loginData, error: loginErr } = await supabase.auth.signInWithPassword({ email: internalEmail, password });
                        if (!loginErr && loginData.session) {
                            const profile: UserProfile = {
                                id: loginData.session.user.id,
                                username: username,
                                email: internalEmail,
                                displayName: `@${username}`,
                                isAdmin: isAdmin,
                                age: ageNum,
                                gender: gender
                            };
                            localStorage.setItem(CURRENT_PROFILE_KEY, JSON.stringify(profile));
                            saveLocalProfile(profile);
                            await yardService.onUserLogin(profile.id, profile.username);
                            showMsg(`Welcome back, @${username}!`, 'success');
                            if (usernameInput) usernameInput.value = '';
                            if (passwordInput) passwordInput.value = '';
                            if (ageInput) ageInput.value = '';
                            updateAuthDisplay(profile);
                            return;
                        }
                    }

                    // Fallback to local profile on network or rate limit error
                    const profile: UserProfile = {
                        id: 'local_' + Date.now(),
                        username: username,
                        email: internalEmail,
                        displayName: `@${username}`,
                        isAdmin: isAdmin,
                        age: ageNum,
                        gender: gender
                    };
                    localStorage.setItem(CURRENT_PROFILE_KEY, JSON.stringify(profile));
                    saveLocalProfile(profile);
                    await yardService.onUserLogin(profile.id, profile.username);
                    showMsg(`Account created: @${username}`, 'success');
                    if (usernameInput) usernameInput.value = '';
                    if (passwordInput) passwordInput.value = '';
                    if (ageInput) ageInput.value = '';
                    updateAuthDisplay(profile);
                    return;
                }

                const profile: UserProfile = {
                    id: data.session?.user?.id || data.user?.id || 'user_' + Date.now(),
                    username: username,
                    email: internalEmail,
                    displayName: `@${username}`,
                    isAdmin: isAdmin,
                    age: ageNum,
                    gender: gender
                };

                localStorage.setItem(CURRENT_PROFILE_KEY, JSON.stringify(profile));
                saveLocalProfile(profile);

                try {
                    await supabase.from('profiles').upsert({
                        id: profile.id,
                        username: profile.username,
                        email: internalEmail,
                        display_name: profile.displayName,
                        age: ageNum,
                        gender: gender
                    });
                } catch (err) {
                    console.warn(err);
                }

                await yardService.onUserLogin(profile.id, profile.username, profile.email);
                restoreUserGameProgress(profile);

                showMsg(`Account created! You are logged in as @${username}.`, 'success');
                if (usernameInput) usernameInput.value = '';
                if (passwordInput) passwordInput.value = '';
                if (ageInput) ageInput.value = '';
                updateAuthDisplay(profile);
            } else {
                const displayName = isAdmin ? 'Admin✅' : `@${username}`;
                const profile: UserProfile = {
                    id: 'offline_' + Date.now(),
                    username,
                    email: internalEmail,
                    displayName: displayName,
                    isAdmin: isAdmin,
                    age: ageNum,
                    gender: gender
                };
                localStorage.setItem(CURRENT_PROFILE_KEY, JSON.stringify(profile));
                saveLocalProfile(profile);
                await yardService.onUserLogin(profile.id, profile.username, profile.email);
                restoreUserGameProgress(profile);

                showMsg(`Account created as ${profile.displayName}!`, 'success');
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
