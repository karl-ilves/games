import { supabase } from './lib/supabase';

// Check if we have supabase configured
const hasSupabase = !!supabase;

const authContainer = document.getElementById('auth-container');
const loginBtn = document.getElementById('btn-login');
const registerBtn = document.getElementById('btn-register');
const logoutBtn = document.getElementById('btn-logout');
const emailInput = document.getElementById('auth-email') as HTMLInputElement;
const passwordInput = document.getElementById('auth-password') as HTMLInputElement;
const authMessage = document.getElementById('auth-message');
const userInfo = document.getElementById('user-info');

export async function initAuth() {
    if (!hasSupabase || !authContainer) return;
    
    authContainer.style.display = 'block';

    // Initial session check
    const { data: { session } } = await supabase.auth.getSession();
    updateAuthUI(session);

    // Listen for auth changes
    supabase.auth.onAuthStateChange((_event, session) => {
        updateAuthUI(session);
    });

    if (loginBtn) {
        loginBtn.addEventListener('click', async () => {
            const email = emailInput?.value;
            const password = passwordInput?.value;
            if (!email || !password) return showMsg('Palun sisesta e-post ja parool.', 'error');
            
            showMsg('Sisselogimine...', 'info');
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) showMsg(error.message, 'error');
            else {
                showMsg('Sisselogitud!', 'success');
                emailInput.value = '';
                passwordInput.value = '';
            }
        });
    }

    if (registerBtn) {
        registerBtn.addEventListener('click', async () => {
            const email = emailInput?.value;
            const password = passwordInput?.value;
            if (!email || !password) return showMsg('Palun sisesta e-post ja parool.', 'error');
            
            showMsg('Registreerimine...', 'info');
            const { error } = await supabase.auth.signUp({ email, password });
            if (error) showMsg(error.message, 'error');
            else {
                showMsg('Konto loodud! Oled sisse logitud.', 'success');
                emailInput.value = '';
                passwordInput.value = '';
            }
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await supabase.auth.signOut();
            // Wipe local storage so progress resets to 0 for guests
            localStorage.removeItem('racingSave');
            localStorage.removeItem('wiped_once_v3');
            localStorage.removeItem('wiped_full_v10');
            showMsg('Välja logitud. Mängu progress nulliti (kuni uuesti sisse logid).', 'info');
        });
    }
}

function updateAuthUI(session: any) {
    const loginForm = document.getElementById('login-form');
    
    if (session) {
        if (loginForm) loginForm.style.display = 'none';
        if (userInfo) {
            userInfo.style.display = 'block';
            const emailSpan = document.getElementById('user-email');
            if (emailSpan) emailSpan.innerText = session.user.email;
        }
    } else {
        if (loginForm) loginForm.style.display = 'block';
        if (userInfo) userInfo.style.display = 'none';
    }
}

function showMsg(msg: string, type: 'error' | 'success' | 'info') {
    if (!authMessage) return;
    authMessage.innerText = msg;
    if (type === 'error') authMessage.style.color = '#e74c3c';
    if (type === 'success') authMessage.style.color = '#2ecc71';
    if (type === 'info') authMessage.style.color = '#3498db';
}
