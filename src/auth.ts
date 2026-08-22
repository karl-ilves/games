import { supabase } from './lib/supabase';
import { yardService } from './shared/yardService';

const hasSupabase = !!supabase;

export interface UserProfile {
    id: string;
    username: string;
    email: string;
    displayName: string;
    isAdmin: boolean;
}

const ADMIN_EMAIL = '1karl.ilves@gmail.com';
const PROFILES_STORAGE_KEY = 'playard_user_profiles';
const CURRENT_PROFILE_KEY = 'playard_current_user_profile';

export function validateUsername(username: string): { valid: boolean; error?: string } {
    const trimmed = username.trim();
    if (!trimmed) {
        return { valid: false, error: 'Palun sisesta kasutajanimi.' };
    }
    if (trimmed.length < 3 || trimmed.length > 20) {
        return { valid: false, error: 'Kasutajanimi peab olema 3 kuni 20 tähemärki pikk.' };
    }
    const usernameRegex = /^[a-zA-Z0-9_.-]+$/;
    if (!usernameRegex.test(trimmed)) {
        return { valid: false, error: 'Kasutajanimi võib sisaldada ainult tähti, numbreid ja punkte/kriipse (emotikonid pole lubatud).' };
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

function showMsg(msg: string, type: 'error' | 'success' | 'info') {
    const authMessage = document.getElementById('auth-message');
    if (!authMessage) return;
    authMessage.innerText = msg;
    if (type === 'error') authMessage.style.color = '#e74c3c';
    if (type === 'success') authMessage.style.color = '#2ecc71';
    if (type === 'info') authMessage.style.color = '#3498db';
}

export function updateAuthDisplay(profile: UserProfile | null) {
    const loginForm = document.getElementById('login-form');
    const userInfo = document.getElementById('user-info');
    const emailSpan = document.getElementById('user-email');

    if (profile) {
        if (loginForm) loginForm.style.display = 'none';
        if (userInfo) userInfo.style.display = 'block';
        if (emailSpan) {
            emailSpan.innerHTML = `<strong>${profile.displayName}</strong> <span style="font-size: 0.8rem; color: #718093;">(${profile.email})</span>`;
        }
        window.dispatchEvent(new CustomEvent('playard_auth_changed', { detail: profile }));
    } else {
        if (loginForm) loginForm.style.display = 'block';
        if (userInfo) userInfo.style.display = 'none';
        window.dispatchEvent(new CustomEvent('playard_auth_changed', { detail: null }));
    }
}

export async function initAuth() {
    const authContainer = document.getElementById('auth-container');
    if (authContainer) authContainer.style.display = 'block';

    const loginBtn = document.getElementById('btn-login');
    const registerBtn = document.getElementById('btn-register');
    const logoutBtn = document.getElementById('btn-logout');
    const emailInput = document.getElementById('auth-email') as HTMLInputElement | null;
    const usernameInput = document.getElementById('auth-username') as HTMLInputElement | null;
    const passwordInput = document.getElementById('auth-password') as HTMLInputElement | null;

    // 1. Check existing session
    const currentProf = getCurrentUserProfile();
    if (currentProf) {
        updateAuthDisplay(currentProf);
    } else if (hasSupabase) {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                const isAdmin = session.user.email === ADMIN_EMAIL.toLowerCase();
                const username = session.user.user_metadata?.username || (isAdmin ? 'admin' : session.user.email?.split('@')[0] || 'user');
                const profile: UserProfile = {
                    id: session.user.id,
                    username,
                    email: session.user.email || '',
                    displayName: isAdmin ? 'Admin✅' : `@${username}`,
                    isAdmin
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
            const email = emailInput?.value.trim().toLowerCase();
            const username = usernameInput?.value.trim();
            const password = passwordInput?.value;

            if (!email || !username || !password) {
                return showMsg('Palun sisesta e-post, kasutajanimi ja parool.', 'error');
            }

            const usernameVal = validateUsername(username);
            if (!usernameVal.valid) {
                return showMsg(usernameVal.error!, 'error');
            }

            if (username.toLowerCase() === 'admin' && email !== ADMIN_EMAIL.toLowerCase()) {
                return showMsg("Kasutajanimi 'admin' on reserveeritud administraatorile!", 'error');
            }

            showMsg('Kontrollin andmeid...', 'info');

            // --- Step 1: Authenticate with Supabase or Local Storage ---
            if (hasSupabase) {
                const { data, error } = await supabase.auth.signInWithPassword({ email, password });
                
                if (!error && data.session) {
                    // Password is correct! Now check username validation
                    const isAdmin = email === ADMIN_EMAIL.toLowerCase();
                    const expectedUsername = data.session.user.user_metadata?.username;

                    if (expectedUsername && expectedUsername.toLowerCase() !== username.toLowerCase()) {
                        await supabase.auth.signOut();
                        return showMsg(`Seda nime ei ole sellel kontol! (Õige kasutajanimi sellele e-mailile on @${expectedUsername})`, 'error');
                    }

                    const displayName = isAdmin ? 'Admin✅' : `@${username}`;
                    const profile: UserProfile = {
                        id: data.session.user.id,
                        username: username,
                        email: email,
                        displayName: displayName,
                        isAdmin: isAdmin
                    };

                    localStorage.setItem(CURRENT_PROFILE_KEY, JSON.stringify(profile));
                    saveLocalProfile(profile);

                    try {
                        await supabase.from('profiles').upsert({
                            id: profile.id,
                            username: profile.username,
                            email: profile.email,
                            display_name: profile.displayName,
                            is_admin: profile.isAdmin
                        });
                    } catch (err) {
                        console.warn('Profile sync error:', err);
                    }

                    // Restore user's Yard balance!
                    await yardService.onUserLogin(profile.id, profile.username);

                    showMsg(`Tere tulemast tagasi, ${displayName}!`, 'success');
                    if (emailInput) emailInput.value = '';
                    if (usernameInput) usernameInput.value = '';
                    if (passwordInput) passwordInput.value = '';
                    updateAuthDisplay(profile);
                    return;
                }

                // If Supabase gave "Email not confirmed", check username first
                if (error && error.message.toLowerCase().includes('not confirmed')) {
                    const localProfiles = getLocalProfiles();
                    const matched = localProfiles.find(p => p.email.toLowerCase() === email.toLowerCase());
                    if (matched && matched.username.toLowerCase() !== username.toLowerCase()) {
                        return showMsg('Seda nime ei ole!', 'error');
                    }

                    const isAdmin = email === ADMIN_EMAIL.toLowerCase();
                    const displayName = isAdmin ? 'Admin✅' : `@${username}`;
                    const profile: UserProfile = {
                        id: matched?.id || 'confirmed_' + Date.now(),
                        username: username,
                        email: email,
                        displayName: displayName,
                        isAdmin: isAdmin
                    };
                    localStorage.setItem(CURRENT_PROFILE_KEY, JSON.stringify(profile));
                    saveLocalProfile(profile);
                    await yardService.onUserLogin(profile.id, profile.username);

                    showMsg(`Tere tulemast tagasi, ${displayName}!`, 'success');
                    if (emailInput) emailInput.value = '';
                    if (usernameInput) usernameInput.value = '';
                    if (passwordInput) passwordInput.value = '';
                    updateAuthDisplay(profile);
                    return;
                }

                // Fallback login for locally registered profiles
                const localProfiles = getLocalProfiles();
                const matched = localProfiles.find(p => p.email.toLowerCase() === email.toLowerCase());

                if (matched) {
                    if (matched.username.toLowerCase() !== username.toLowerCase()) {
                        return showMsg('Seda nime ei ole!', 'error');
                    }
                    localStorage.setItem(CURRENT_PROFILE_KEY, JSON.stringify(matched));
                    await yardService.onUserLogin(matched.id, matched.username);

                    showMsg(`Tere tulemast tagasi, ${matched.displayName}!`, 'success');
                    if (emailInput) emailInput.value = '';
                    if (usernameInput) usernameInput.value = '';
                    if (passwordInput) passwordInput.value = '';
                    updateAuthDisplay(matched);
                    return;
                }

                // If username is not found in local profiles either
                const usernameExistsAnywhere = localProfiles.some(p => p.username.toLowerCase() === username.toLowerCase());
                if (!usernameExistsAnywhere && username.toLowerCase() !== 'admin') {
                    return showMsg('Seda nime ei ole!', 'error');
                }

                if (error) {
                    return showMsg(error.message === 'Invalid login credentials' ? 'Vale parool või e-post!' : error.message, 'error');
                }
            } else {
                // Offline fallback
                const localProfiles = getLocalProfiles();
                const matched = localProfiles.find(p => p.email.toLowerCase() === email.toLowerCase());
                
                if (matched && matched.username.toLowerCase() !== username.toLowerCase()) {
                    return showMsg('Seda nime ei ole!', 'error');
                }

                const isAdmin = email === ADMIN_EMAIL.toLowerCase();
                const profile: UserProfile = {
                    id: matched?.id || 'offline_' + Date.now(),
                    username,
                    email,
                    displayName: isAdmin ? 'Admin✅' : `@${username}`,
                    isAdmin
                };
                localStorage.setItem(CURRENT_PROFILE_KEY, JSON.stringify(profile));
                saveLocalProfile(profile);
                await yardService.onUserLogin(profile.id, profile.username);

                showMsg(`Tere tulemast tagasi, ${profile.displayName}!`, 'success');
                updateAuthDisplay(profile);
            }
        });
    }

    // 3. Register Handler
    if (registerBtn) {
        registerBtn.addEventListener('click', async () => {
            const email = emailInput?.value.trim().toLowerCase();
            const username = usernameInput?.value.trim();
            const password = passwordInput?.value;

            if (!email || !username || !password) {
                return showMsg('Palun sisesta e-post, kasutajanimi ja parool.', 'error');
            }

            const usernameVal = validateUsername(username);
            if (!usernameVal.valid) {
                return showMsg(usernameVal.error!, 'error');
            }

            if (username.toLowerCase() === 'admin' && email !== ADMIN_EMAIL.toLowerCase()) {
                return showMsg("Kasutajanimi 'admin' on reserveeritud administraatorile!", 'error');
            }

            const localProfiles = getLocalProfiles();
            const taken = localProfiles.find(p => p.username.toLowerCase() === username.toLowerCase() && p.email !== email);
            if (taken) {
                return showMsg(`Kasutajanimi '@${username}' on juba võetud!`, 'error');
            }

            showMsg('Konto loomine...', 'info');

            if (hasSupabase) {
                try {
                    const { data: existingUser } = await supabase
                        .from('profiles')
                        .select('username')
                        .ilike('username', username)
                        .single();

                    if (existingUser) {
                        return showMsg(`Kasutajanimi '@${username}' on juba võetud!`, 'error');
                    }
                } catch (e) {}

                const redirectUrl = window.location.origin + window.location.pathname;
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        emailRedirectTo: redirectUrl,
                        data: {
                            username: username
                        }
                    }
                });

                if (error) {
                    if (error.message.toLowerCase().includes('already registered') || error.message.toLowerCase().includes('already exists')) {
                        const { data: loginData, error: loginErr } = await supabase.auth.signInWithPassword({ email, password });
                        if (!loginErr && loginData.session) {
                            const isAdmin = email === ADMIN_EMAIL.toLowerCase();
                            const displayName = isAdmin ? 'Admin✅' : `@${username}`;
                            const profile: UserProfile = {
                                id: loginData.session.user.id,
                                username: username,
                                email: email,
                                displayName: displayName,
                                isAdmin: isAdmin
                            };
                            localStorage.setItem(CURRENT_PROFILE_KEY, JSON.stringify(profile));
                            saveLocalProfile(profile);
                            await yardService.onUserLogin(profile.id, profile.username);
                            showMsg(`Tere tulemast tagasi, ${displayName}!`, 'success');
                            if (emailInput) emailInput.value = '';
                            if (usernameInput) usernameInput.value = '';
                            if (passwordInput) passwordInput.value = '';
                            updateAuthDisplay(profile);
                            return;
                        }
                    }

                    // If rate limit or other error, fallback to local registration gracefully
                    if (error.message.toLowerCase().includes('rate limit') || error.message.toLowerCase().includes('limit')) {
                        const isAdmin = email === ADMIN_EMAIL.toLowerCase();
                        const displayName = isAdmin ? 'Admin✅' : `@${username}`;
                        const profile: UserProfile = {
                            id: 'local_' + Date.now(),
                            username: username,
                            email: email,
                            displayName: displayName,
                            isAdmin: isAdmin
                        };
                        localStorage.setItem(CURRENT_PROFILE_KEY, JSON.stringify(profile));
                        saveLocalProfile(profile);
                        await yardService.onUserLogin(profile.id, profile.username);
                        showMsg(`Konto loodud kohapeal (e-posti piirang): ${displayName}`, 'success');
                        if (emailInput) emailInput.value = '';
                        if (usernameInput) usernameInput.value = '';
                        if (passwordInput) passwordInput.value = '';
                        updateAuthDisplay(profile);
                        return;
                    }

                    return showMsg(error.message, 'error');
                }

                const isAdmin = email === ADMIN_EMAIL.toLowerCase();
                const displayName = isAdmin ? 'Admin✅' : `@${username}`;

                const profile: UserProfile = {
                    id: data.session?.user?.id || data.user?.id || 'user_' + Date.now(),
                    username: username,
                    email: email,
                    displayName: displayName,
                    isAdmin: isAdmin
                };
                localStorage.setItem(CURRENT_PROFILE_KEY, JSON.stringify(profile));
                saveLocalProfile(profile);

                try {
                    await supabase.from('profiles').upsert({
                        id: profile.id,
                        username: profile.username,
                        email: profile.email,
                        display_name: profile.displayName,
                        is_admin: profile.isAdmin
                    });
                } catch (err) {
                    console.warn(err);
                }

                await yardService.onUserLogin(profile.id, profile.username);

                showMsg(`Konto loodud! Oled sisse logitud kui ${displayName}.`, 'success');
                if (emailInput) emailInput.value = '';
                if (usernameInput) usernameInput.value = '';
                if (passwordInput) passwordInput.value = '';
                updateAuthDisplay(profile);
            } else {
                const isAdmin = email === ADMIN_EMAIL.toLowerCase();
                const profile: UserProfile = {
                    id: 'offline_' + Date.now(),
                    username,
                    email,
                    displayName: isAdmin ? 'Admin✅' : `@${username}`,
                    isAdmin
                };
                localStorage.setItem(CURRENT_PROFILE_KEY, JSON.stringify(profile));
                saveLocalProfile(profile);
                await yardService.onUserLogin(profile.id, profile.username);

                showMsg(`Konto loodud kui ${profile.displayName}!`, 'success');
                updateAuthDisplay(profile);
            }
        });
    }

    // 4. Logout Handler
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            if (hasSupabase) {
                await supabase.auth.signOut();
            }
            // Strict reset of yards to 0 on logout
            yardService.onUserLogout();
            localStorage.removeItem(CURRENT_PROFILE_KEY);
            localStorage.removeItem('racingSave');

            showMsg('Oled välja logitud. Yardid lähtestatud külalise režiimis 0-le.', 'info');
            updateAuthDisplay(null);
        });
    }
}
