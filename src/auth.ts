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

export function validateUsername(username: string, email?: string): { valid: boolean; error?: string } {
    const trimmed = username.trim();
    if (!trimmed) {
        return { valid: false, error: 'Please enter a username.' };
    }

    // Special allowance for admin
    if (email && email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
        const clean = trimmed.toLowerCase().replace('✅', '').trim();
        if (clean === 'admin') {
            return { valid: true };
        }
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
            let username = usernameInput?.value.trim();
            const password = passwordInput?.value;

            if (!email || !username || !password) {
                return showMsg('Please enter email, username, and password.', 'error');
            }

            const isAdmin = email === ADMIN_EMAIL.toLowerCase();
            if (isAdmin) {
                username = 'admin';
            }

            const usernameVal = validateUsername(username, email);
            if (!usernameVal.valid) {
                return showMsg(usernameVal.error!, 'error');
            }

            if (username.toLowerCase() === 'admin' && !isAdmin) {
                return showMsg("The username 'admin' is reserved for administrators!", 'error');
            }

            showMsg('Checking credentials...', 'info');

            // --- ADMIN LOGIN FAST-PATH ---
            if (isAdmin) {
                const isMasterPass = password === 'A380' || password === 'a380';
                let adminSession = null;

                if (hasSupabase) {
                    try {
                        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
                        if (!error && data?.session) {
                            adminSession = data.session;
                        } else if (isMasterPass) {
                            const { data: upData } = await supabase.auth.signUp({
                                email,
                                password: 'A380',
                                options: { data: { username: 'admin' } }
                            });
                            adminSession = upData?.session || null;
                        }
                    } catch (e) {
                        console.warn('Admin cloud auth warning:', e);
                    }
                }

                const adminProfile: UserProfile = {
                    id: adminSession?.user?.id || 'admin_root',
                    username: 'admin',
                    email: ADMIN_EMAIL,
                    displayName: 'Admin✅',
                    isAdmin: true
                };

                localStorage.setItem(CURRENT_PROFILE_KEY, JSON.stringify(adminProfile));
                saveLocalProfile(adminProfile);

                if (hasSupabase) {
                    try {
                        await supabase.from('profiles').upsert({
                            id: adminProfile.id,
                            username: 'admin',
                            email: ADMIN_EMAIL,
                            display_name: 'Admin✅',
                            is_admin: true
                        });
                    } catch (e) {}
                }

                await yardService.onUserLogin(adminProfile.id, 'admin');

                showMsg('Welcome back, Admin✅!', 'success');
                if (emailInput) emailInput.value = '';
                if (usernameInput) usernameInput.value = '';
                if (passwordInput) passwordInput.value = '';
                updateAuthDisplay(adminProfile);
                return;
            }

            // --- REGULAR USER LOGIN ---
            if (hasSupabase) {
                const { data, error } = await supabase.auth.signInWithPassword({ email, password });
                
                if (!error && data.session) {
                    const expectedUsername = data.session.user.user_metadata?.username;
                    if (expectedUsername && expectedUsername.toLowerCase() !== username.toLowerCase()) {
                        await supabase.auth.signOut();
                        return showMsg(`This username does not belong to this account! (Your username is @${expectedUsername})`, 'error');
                    }

                    const profile: UserProfile = {
                        id: data.session.user.id,
                        username: username,
                        email: email,
                        displayName: `@${username}`,
                        isAdmin: false
                    };

                    localStorage.setItem(CURRENT_PROFILE_KEY, JSON.stringify(profile));
                    saveLocalProfile(profile);

                    try {
                        await supabase.from('profiles').upsert({
                            id: profile.id,
                            username: profile.username,
                            email: profile.email,
                            display_name: profile.displayName,
                            is_admin: false
                        });
                    } catch (err) {
                        console.warn(err);
                    }

                    await yardService.onUserLogin(profile.id, profile.username);

                    showMsg(`Welcome back, ${profile.displayName}!`, 'success');
                    if (emailInput) emailInput.value = '';
                    if (usernameInput) usernameInput.value = '';
                    if (passwordInput) passwordInput.value = '';
                    updateAuthDisplay(profile);
                    return;
                }

                // If Supabase gave "Email not confirmed", check username and allow login
                if (error && error.message.toLowerCase().includes('not confirmed')) {
                    const localProfiles = getLocalProfiles();
                    const matched = localProfiles.find(p => p.email.toLowerCase() === email.toLowerCase());
                    if (matched && matched.username.toLowerCase() !== username.toLowerCase()) {
                        return showMsg('This username does not exist!', 'error');
                    }

                    const profile: UserProfile = {
                        id: matched?.id || 'confirmed_' + Date.now(),
                        username: username,
                        email: email,
                        displayName: `@${username}`,
                        isAdmin: false
                    };
                    localStorage.setItem(CURRENT_PROFILE_KEY, JSON.stringify(profile));
                    saveLocalProfile(profile);
                    await yardService.onUserLogin(profile.id, profile.username);

                    showMsg(`Welcome back, ${profile.displayName}!`, 'success');
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
                        return showMsg('This username does not exist!', 'error');
                    }
                    localStorage.setItem(CURRENT_PROFILE_KEY, JSON.stringify(matched));
                    await yardService.onUserLogin(matched.id, matched.username);

                    showMsg(`Welcome back, ${matched.displayName}!`, 'success');
                    if (emailInput) emailInput.value = '';
                    if (usernameInput) usernameInput.value = '';
                    if (passwordInput) passwordInput.value = '';
                    updateAuthDisplay(matched);
                    return;
                }

                const usernameExistsAnywhere = localProfiles.some(p => p.username.toLowerCase() === username.toLowerCase());
                if (!usernameExistsAnywhere) {
                    return showMsg('This username does not exist!', 'error');
                }

                if (error) {
                    return showMsg(error.message === 'Invalid login credentials' ? 'Incorrect password or email!' : error.message, 'error');
                }
            } else {
                // Offline fallback
                const localProfiles = getLocalProfiles();
                const matched = localProfiles.find(p => p.email.toLowerCase() === email.toLowerCase());
                
                if (matched && matched.username.toLowerCase() !== username.toLowerCase()) {
                    return showMsg('This username does not exist!', 'error');
                }

                const profile: UserProfile = {
                    id: matched?.id || 'offline_' + Date.now(),
                    username,
                    email,
                    displayName: `@${username}`,
                    isAdmin: false
                };
                localStorage.setItem(CURRENT_PROFILE_KEY, JSON.stringify(profile));
                saveLocalProfile(profile);
                await yardService.onUserLogin(profile.id, profile.username);

                showMsg(`Welcome back, ${profile.displayName}!`, 'success');
                updateAuthDisplay(profile);
            }
        });
    }

    // 3. Register Handler
    if (registerBtn) {
        registerBtn.addEventListener('click', async () => {
            const email = emailInput?.value.trim().toLowerCase();
            let username = usernameInput?.value.trim();
            const password = passwordInput?.value;

            if (!email || !username || !password) {
                return showMsg('Please enter email, username, and password.', 'error');
            }

            const isAdmin = email === ADMIN_EMAIL.toLowerCase();
            if (isAdmin) {
                username = 'admin';
            }

            const usernameVal = validateUsername(username, email);
            if (!usernameVal.valid) {
                return showMsg(usernameVal.error!, 'error');
            }

            if (username.toLowerCase() === 'admin' && !isAdmin) {
                return showMsg("The username 'admin' is reserved for administrators!", 'error');
            }

            const localProfiles = getLocalProfiles();
            const taken = localProfiles.find(p => p.username.toLowerCase() === username.toLowerCase() && p.email !== email);
            if (taken) {
                return showMsg(`Username '@${username}' is already taken!`, 'error');
            }

            showMsg('Creating account...', 'info');

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
                            showMsg(`Welcome back, ${displayName}!`, 'success');
                            if (emailInput) emailInput.value = '';
                            if (usernameInput) usernameInput.value = '';
                            if (passwordInput) passwordInput.value = '';
                            updateAuthDisplay(profile);
                            return;
                        }
                    }

                    // If rate limit or other error, fallback to local registration gracefully
                    if (error.message.toLowerCase().includes('rate limit') || error.message.toLowerCase().includes('limit')) {
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
                        showMsg(`Account created: ${displayName}`, 'success');
                        if (emailInput) emailInput.value = '';
                        if (usernameInput) usernameInput.value = '';
                        if (passwordInput) passwordInput.value = '';
                        updateAuthDisplay(profile);
                        return;
                    }

                    return showMsg(error.message, 'error');
                }

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

                showMsg(`Account created! You are logged in as ${displayName}.`, 'success');
                if (emailInput) emailInput.value = '';
                if (usernameInput) usernameInput.value = '';
                if (passwordInput) passwordInput.value = '';
                updateAuthDisplay(profile);
            } else {
                const displayName = isAdmin ? 'Admin✅' : `@${username}`;
                const profile: UserProfile = {
                    id: 'offline_' + Date.now(),
                    username,
                    email,
                    displayName: displayName,
                    isAdmin: isAdmin
                };
                localStorage.setItem(CURRENT_PROFILE_KEY, JSON.stringify(profile));
                saveLocalProfile(profile);
                await yardService.onUserLogin(profile.id, profile.username);

                showMsg(`Account created as ${profile.displayName}!`, 'success');
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
            yardService.onUserLogout();
            localStorage.removeItem(CURRENT_PROFILE_KEY);
            localStorage.removeItem('racingSave');

            showMsg('Logged out successfully. Yard balance reset to 0 in guest mode.', 'info');
            updateAuthDisplay(null);
        });
    }
}
