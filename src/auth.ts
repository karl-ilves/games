import { supabase } from './lib/supabase';

// Check if we have supabase configured
const hasSupabase = !!supabase;

const authContainer = document.getElementById('auth-container');
const loginBtn = document.getElementById('btn-login');
const registerBtn = document.getElementById('btn-register');
const logoutBtn = document.getElementById('btn-logout');
const emailInput = document.getElementById('auth-email') as HTMLInputElement;
const usernameInput = document.getElementById('auth-username') as HTMLInputElement;
const passwordInput = document.getElementById('auth-password') as HTMLInputElement;
const authMessage = document.getElementById('auth-message');
const userInfo = document.getElementById('user-info');

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

// Validate username (No emojis, alphanumeric + _ - ., 3 to 20 chars)
export function validateUsername(username: string): { valid: boolean; error?: string } {
    const trimmed = username.trim();
    if (!trimmed) {
        return { valid: false, error: 'Username cannot be empty.' };
    }
    if (trimmed.length < 3 || trimmed.length > 20) {
        return { valid: false, error: 'Username must be between 3 and 20 characters.' };
    }
    // Check for emojis or disallowed characters
    const usernameRegex = /^[a-zA-Z0-9_.-]+$/;
    if (!usernameRegex.test(trimmed)) {
        return { valid: false, error: 'Usernames can only contain letters, numbers, dots, dashes, and underscores (no emojis or special symbols).' };
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

export async function initAuth() {
    if (!authContainer) return;
    authContainer.style.display = 'block';

    // 1. Check existing session
    if (hasSupabase) {
        const { data: { session } } = await supabase.auth.getSession();
        await updateAuthUI(session);

        supabase.auth.onAuthStateChange(async (_event, session) => {
            await updateAuthUI(session);
        });
    } else {
        const localProf = getCurrentUserProfile();
        updateLocalAuthUI(localProf);
    }

    // 2. Login Handler
    if (loginBtn) {
        loginBtn.addEventListener('click', async () => {
            const email = emailInput?.value.trim().toLowerCase();
            const username = usernameInput?.value.trim();
            const password = passwordInput?.value;

            if (!email || !username || !password) {
                return showMsg('Please enter your email, username, and password.', 'error');
            }

            const usernameVal = validateUsername(username);
            if (!usernameVal.valid) {
                return showMsg(usernameVal.error!, 'error');
            }

            // Check admin username reservation
            if (username.toLowerCase() === 'admin' && email !== ADMIN_EMAIL.toLowerCase()) {
                return showMsg("The username 'admin' is strictly reserved for the system administrator!", 'error');
            }

            showMsg('Logging in...', 'info');

            if (hasSupabase) {
                const { data, error } = await supabase.auth.signInWithPassword({ email, password });
                if (!error && data.session) {
                    const isAdmin = email === ADMIN_EMAIL.toLowerCase();
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

                    showMsg(`Welcome back, ${displayName}!`, 'success');
                    emailInput.value = '';
                    usernameInput.value = '';
                    passwordInput.value = '';
                    await updateAuthUI(data.session);
                    return;
                }

                // If Supabase login fails, check local profile fallback (e.g. for testing / offline)
                const localProfiles = getLocalProfiles();
                const matched = localProfiles.find(p => p.email === email && p.username.toLowerCase() === username.toLowerCase());
                if (matched) {
                    localStorage.setItem(CURRENT_PROFILE_KEY, JSON.stringify(matched));
                    showMsg(`Welcome back, ${matched.displayName}!`, 'success');
                    emailInput.value = '';
                    usernameInput.value = '';
                    passwordInput.value = '';
                    updateLocalAuthUI(matched);
                    return;
                }

                if (error) {
                    return showMsg(error.message, 'error');
                }
            } else {
                // Offline fallback
                const isAdmin = email === ADMIN_EMAIL.toLowerCase();
                const profile: UserProfile = {
                    id: 'offline_' + Date.now(),
                    username,
                    email,
                    displayName: isAdmin ? 'Admin✅' : `@${username}`,
                    isAdmin
                };
                localStorage.setItem(CURRENT_PROFILE_KEY, JSON.stringify(profile));
                showMsg(`Welcome, ${profile.displayName}! (Offline mode)`, 'success');
                updateLocalAuthUI(profile);
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
                return showMsg('Please enter your email, username, and password.', 'error');
            }

            const usernameVal = validateUsername(username);
            if (!usernameVal.valid) {
                return showMsg(usernameVal.error!, 'error');
            }

            // Check admin username reservation
            if (username.toLowerCase() === 'admin' && email !== ADMIN_EMAIL.toLowerCase()) {
                return showMsg("The username 'admin' is reserved only for 1karl.ilves@gmail.com!", 'error');
            }

            // Check if username is already taken locally
            const localProfiles = getLocalProfiles();
            const taken = localProfiles.find(p => p.username.toLowerCase() === username.toLowerCase() && p.email !== email);
            if (taken) {
                return showMsg(`Username '@${username}' is already taken. Please choose another username!`, 'error');
            }

            showMsg('Creating account...', 'info');

            if (hasSupabase) {
                // Check if username is taken in Supabase
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
                    return showMsg(error.message, 'error');
                }

                const isAdmin = email === ADMIN_EMAIL.toLowerCase();
                const displayName = isAdmin ? 'Admin✅' : `@${username}`;

                if (data.session) {
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
                        console.warn(err);
                    }

                    showMsg(`Account created! Logged in as ${displayName}.`, 'success');
                    emailInput.value = '';
                    usernameInput.value = '';
                    passwordInput.value = '';
                    await updateAuthUI(data.session);
                } else {
                    const profile: UserProfile = {
                        id: data.user?.id || 'reg_' + Date.now(),
                        username: username,
                        email: email,
                        displayName: displayName,
                        isAdmin: isAdmin
                    };
                    localStorage.setItem(CURRENT_PROFILE_KEY, JSON.stringify(profile));
                    saveLocalProfile(profile);
                    showMsg('Registration successful! Please check your email to confirm your account.', 'success');
                    emailInput.value = '';
                    usernameInput.value = '';
                    passwordInput.value = '';
                    updateLocalAuthUI(profile);
                }
            } else {
                // Offline mode register
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
                showMsg(`Account created as ${profile.displayName}!`, 'success');
                updateLocalAuthUI(profile);
            }
        });
    }

    // 4. Logout Handler
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            if (hasSupabase) {
                await supabase.auth.signOut();
            }
            localStorage.removeItem(CURRENT_PROFILE_KEY);
            showMsg('Logged out successfully.', 'info');
            updateLocalAuthUI(null);
            window.dispatchEvent(new CustomEvent('playard_auth_changed', { detail: null }));
        });
    }
}

async function updateAuthUI(session: any) {
    const loginForm = document.getElementById('login-form');
    
    if (session?.user) {
        if (loginForm) loginForm.style.display = 'none';
        if (userInfo) {
            userInfo.style.display = 'block';
            const emailSpan = document.getElementById('user-email');
            
            let profile = getCurrentUserProfile();
            if (!profile || profile.email !== session.user.email) {
                const isAdmin = session.user.email === ADMIN_EMAIL.toLowerCase();
                const username = session.user.user_metadata?.username || (isAdmin ? 'admin' : session.user.email.split('@')[0]);
                profile = {
                    id: session.user.id,
                    username,
                    email: session.user.email,
                    displayName: isAdmin ? 'Admin✅' : `@${username}`,
                    isAdmin
                };
                localStorage.setItem(CURRENT_PROFILE_KEY, JSON.stringify(profile));
            }

            if (emailSpan) {
                emailSpan.innerHTML = `<strong>${profile.displayName}</strong> <span style="font-size: 0.8rem; color: #718093;">(${profile.email})</span>`;
            }
        }
    } else {
        const localProf = getCurrentUserProfile();
        if (localProf) {
            updateLocalAuthUI(localProf);
        } else {
            if (loginForm) loginForm.style.display = 'block';
            if (userInfo) userInfo.style.display = 'none';
            window.dispatchEvent(new CustomEvent('playard_auth_changed', { detail: null }));
        }
    }
}

function updateLocalAuthUI(profile: UserProfile | null) {
    const loginForm = document.getElementById('login-form');
    if (profile) {
        if (loginForm) loginForm.style.display = 'none';
        if (userInfo) {
            userInfo.style.display = 'block';
            const emailSpan = document.getElementById('user-email');
            if (emailSpan) {
                emailSpan.innerHTML = `<strong>${profile.displayName}</strong> <span style="font-size: 0.8rem; color: #718093;">(${profile.email})</span>`;
            }
        }
        window.dispatchEvent(new CustomEvent('playard_auth_changed', { detail: profile }));
    } else {
        if (loginForm) loginForm.style.display = 'block';
        if (userInfo) userInfo.style.display = 'none';
        window.dispatchEvent(new CustomEvent('playard_auth_changed', { detail: null }));
    }
}

function getLocalProfiles(): UserProfile[] {
    try {
        const raw = localStorage.getItem(PROFILES_STORAGE_KEY);
        if (raw) return JSON.parse(raw);
    } catch (e) {}
    return [];
}

function saveLocalProfile(profile: UserProfile) {
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
    if (!authMessage) return;
    authMessage.innerText = msg;
    if (type === 'error') authMessage.style.color = '#e74c3c';
    if (type === 'success') authMessage.style.color = '#2ecc71';
    if (type === 'info') authMessage.style.color = '#3498db';
}
