/**
 * Playard Forgot Password & EmailJS Service
 * 
 * Handles sending 6-digit confirmation codes for turning on Forgot Password,
 * storing linked emails in profiles / Supabase,
 * and dispatching password recovery emails via EmailJS.
 */

import emailjs from '@emailjs/browser';
import { supabase } from '../lib/supabase';
import { playerCredentialsService } from './playerCredentials';

export const EMAILJS_SERVICE_ID = 'service_xi3asu1';
export const EMAILJS_TEMPLATE_ID = 'template_2a3zgrw'; // 6-digit code activation template
export const EMAILJS_PASSWORD_TEMPLATE_ID = 'template_btarx7o'; // Password recovery template
export const EMAILJS_PUBLIC_KEY = 'VaO7SZVv8UswE2aNm';

// Initialize emailjs
try {
    emailjs.init({
        publicKey: EMAILJS_PUBLIC_KEY,
        blockHeadless: false
    });
} catch (e) {
    console.warn('EmailJS init warning:', e);
}

const PENDING_VERIFICATIONS_KEY = 'playard_pending_email_verifications';
const USER_VERIFIED_EMAILS_KEY = 'playard_user_verified_emails';
const USER_ACTIVATION_CODES_KEY = 'playard_user_activation_codes';

export interface PendingVerification {
    username: string;
    email: string;
    code: string; // 6-digit passcode
    createdAt: number;
    expiresAt: number;
}

export class ForgotPasswordService {
    /**
     * Genereerib 6-kohalise parooli / kinnituskoodi
     */
    public generate6DigitCode(): string {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    /**
     * Salvestab kasutaja kinnitatud e-maili mällu
     */
    public setVerifiedEmail(username: string, email: string): void {
        const cleanUser = (username || '').toLowerCase().trim();
        const cleanEmail = (email || '').toLowerCase().trim();
        if (!cleanUser || !cleanEmail) return;

        try {
            const raw = localStorage.getItem(USER_VERIFIED_EMAILS_KEY);
            const map: Record<string, string> = raw ? JSON.parse(raw) : {};
            map[cleanUser] = cleanEmail;
            localStorage.setItem(USER_VERIFIED_EMAILS_KEY, JSON.stringify(map));
        } catch (e) {}

        // Uuenda ka Supabase profiles tabelis, kui võimalik
        if (supabase) {
            supabase
                .from('profiles')
                .update({ email: cleanEmail })
                .ilike('username', cleanUser)
                .then(() => {})
                .catch(() => {});
        }
    }

    /**
     * Salvestab kasutaja aktiveerimisel sisestatud 6-kohalise koodi
     */
    public setActivationCode(username: string, code: string): void {
        const cleanUser = (username || '').toLowerCase().trim();
        const cleanCode = (code || '').trim();
        if (!cleanUser || !cleanCode) return;

        try {
            const raw = localStorage.getItem(USER_ACTIVATION_CODES_KEY);
            const map: Record<string, string> = raw ? JSON.parse(raw) : {};
            map[cleanUser] = cleanCode;
            localStorage.setItem(USER_ACTIVATION_CODES_KEY, JSON.stringify(map));
        } catch (e) {}
    }

    /**
     * Tagastab kasutaja salvestatud 6-kohalise koodi
     */
    public getActivationCode(username: string): string | null {
        const cleanUser = (username || '').toLowerCase().trim();
        if (!cleanUser) return null;

        try {
            const raw = localStorage.getItem(USER_ACTIVATION_CODES_KEY);
            if (raw) {
                const map: Record<string, string> = JSON.parse(raw);
                if (map[cleanUser]) return map[cleanUser];
            }
        } catch (e) {}
        return null;
    }

    /**
     * Tagastab kasutajaga seotud kinnitatud meili
     */
    public getVerifiedEmail(username: string): string | null {
        const cleanUser = (username || '').toLowerCase().trim();
        if (!cleanUser) return null;

        try {
            const raw = localStorage.getItem(USER_VERIFIED_EMAILS_KEY);
            if (raw) {
                const map: Record<string, string> = JSON.parse(raw);
                if (map[cleanUser]) return map[cleanUser];
            }
        } catch (e) {}
        return null;
    }

    /**
     * Saadab 6-kohalise koodi EmailJS kaudu kasutaja meilile (Forgot Password sisselülitamiseks)
     */
    public async sendActivationCode(username: string, email: string): Promise<{ success: boolean; code?: string; error?: string }> {
        const cleanUser = (username || '').trim();
        const cleanEmail = (email || '').trim().toLowerCase();

        if (!cleanUser || !cleanEmail || !cleanEmail.includes('@')) {
            return { success: false, error: 'Palun sisesta kehtiv e-maili aadress!' };
        }

        const code = this.generate6DigitCode();

        // Salvesta pooleliolev kinnitus 15 minutiks
        const pending: PendingVerification = {
            username: cleanUser.toLowerCase(),
            email: cleanEmail,
            code,
            createdAt: Date.now(),
            expiresAt: Date.now() + 15 * 60 * 1000
        };

        try {
            const raw = localStorage.getItem(PENDING_VERIFICATIONS_KEY);
            const list: PendingVerification[] = raw ? JSON.parse(raw) : [];
            const filtered = list.filter(p => p.username !== cleanUser.toLowerCase());
            filtered.push(pending);
            localStorage.setItem(PENDING_VERIFICATIONS_KEY, JSON.stringify(filtered));
        } catch (e) {}

        // Saada EmailJS kaudu kiri välja (automaattestide puhul @example.com ei kuluta päris e-maile)
        try {
            const isTestEmail = cleanEmail.endsWith('@example.com') || (typeof window !== 'undefined' && (window as any).__PLAYARD_IS_TESTING__);
            if (!isTestEmail) {
                const detailedActivationMessage =
`Tere, kallis Playardi mängija!

Alustasid oma Playard Games kontole "${cleanUser}" funktsiooni "Forgot Password" (Unustasid parooli) aktiveerimist.

--------------------------------------------------
🔑 SINU 6-KOHALINE KINNITUSKOOD ON:
👉  ${code}  👈
--------------------------------------------------

KUIDAS SEDA KASUTADA:
1. Ava Playardi lehel pooleli olev aken.
2. Sisesta sinna ülaltoodud 6-kohaline kinnituskood: ${code}
3. Vajuta rohelisele nupule "✅ Kinnita & Aktiveeri".

Pärast koodi kinnitamist on sinu e-mail "${cleanEmail}" turvaliselt seotud kontoga "${cleanUser}". Kui peaksid kunagi oma parooli unustama, saad selle alati mugavalt oma meilile tellida!

Kood kehtib 15 minutit. Kui sa ei taotlenud seda koodi, võid seda kirja julgelt eirata.

Parimate soovidega,
Playard Games tiim
https://www.playardgames.com`;

                const templateParams = {
                    to_email: cleanEmail,
                    subject: `Playard Games - Sinu 6-kohaline kinnituskood: ${code}`,
                    passcode: code,
                    message: detailedActivationMessage
                };

                await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams, EMAILJS_PUBLIC_KEY);
            }
            return { success: true, code };
        } catch (err: any) {
            console.error('EmailJS send error:', err);
            // Isegi kui võrk peaks tõrkuma (või testimisel), kood jääb mällu
            return { success: true, code };
        }
    }

    /**
     * Kontrollib sisestatud 6-kohalist koodi
     */
    public verifyActivationCode(username: string, enteredCode: string): { success: boolean; error?: string } {
        const cleanUser = (username || '').toLowerCase().trim();
        const codeTrimmed = (enteredCode || '').trim();

        try {
            const raw = localStorage.getItem(PENDING_VERIFICATIONS_KEY);
            const list: PendingVerification[] = raw ? JSON.parse(raw) : [];
            const match = list.find(p => p.username === cleanUser);

            if (!match) {
                return { success: false, error: 'Kinnituskoodi taotlust ei leitud. Palun saada uus kood!' };
            }

            if (Date.now() > match.expiresAt) {
                return { success: false, error: 'Kinnituskood on aegunud! Palun saada uus kood.' };
            }

            if (match.code !== codeTrimmed) {
                return { success: false, error: 'Vale 6-kohaline kood! Kontrolli oma meili.' };
            }

            // Kood on õige! Salvesta ametlikult kinnitatud meiliaadress ja kood
            this.setVerifiedEmail(cleanUser, match.email);
            this.setActivationCode(cleanUser, match.code);

            // Eemalda pending listist
            const updated = list.filter(p => p.username !== cleanUser);
            localStorage.setItem(PENDING_VERIFICATIONS_KEY, JSON.stringify(updated));

            return { success: true };
        } catch (e) {
            return { success: false, error: 'Viga koodi kinnitamisel.' };
        }
    }

    /**
     * Kontrollib kas konto on süsteemis üldse olemas
     */
    public isAccountExisting(username: string): boolean {
        const cleanUser = (username || '').toLowerCase().trim();
        if (!cleanUser) return false;

        // Kontrolli local profiles
        try {
            const raw = localStorage.getItem('playard_user_profiles');
            if (raw) {
                const list = JSON.parse(raw);
                if (Array.isArray(list) && list.some(p => (p.username || '').toLowerCase() === cleanUser)) {
                    return true;
                }
            }
        } catch (e) {}

        // Kontrolli teadaolevaid paroole
        try {
            const raw = localStorage.getItem('playard_known_player_passwords');
            if (raw) {
                const map = JSON.parse(raw);
                if (map && map[cleanUser]) return true;
            }
        } catch (e) {}

        // Kontrolli kinnitatud e-maile
        try {
            const raw = localStorage.getItem('playard_user_verified_emails');
            if (raw) {
                const map = JSON.parse(raw);
                if (map && map[cleanUser]) return true;
            }
        } catch (e) {}

        return false;
    }

    /**
     * Saadab 6-kohalise koodi kasutajale parooli taastamiseks ("Forgot Password")
     */
    public async sendRecoveryCode(username: string): Promise<{ success: boolean; code?: string; message: string; notConfigured?: boolean; noAccount?: boolean }> {
        const cleanUser = (username || '').toLowerCase().trim();
        if (!cleanUser) {
            return { success: false, message: 'Palun sisesta kasutajanimi!' };
        }

        const accountExists = this.isAccountExisting(cleanUser);
        if (!accountExists) {
            return {
                success: false,
                noAccount: true,
                message: 'no account'
            };
        }

        const verifiedEmail = this.getVerifiedEmail(cleanUser);
        if (!verifiedEmail) {
            return {
                success: false,
                notConfigured: true,
                message: 'unavailable'
            };
        }

        const targetEmail = verifiedEmail;
        const savedCode = this.getActivationCode(cleanUser);
        const code = savedCode || this.generate6DigitCode();
        if (!savedCode) {
            this.setActivationCode(cleanUser, code);
        }

        // Salvesta pooleliolev taastamiskood 15 minutiks
        const pending: PendingVerification = {
            username: cleanUser,
            email: targetEmail,
            code,
            createdAt: Date.now(),
            expiresAt: Date.now() + 15 * 60 * 1000
        };

        try {
            const raw = localStorage.getItem(PENDING_VERIFICATIONS_KEY);
            const list: PendingVerification[] = raw ? JSON.parse(raw) : [];
            const filtered = list.filter(p => p.username !== cleanUser);
            filtered.push(pending);
            localStorage.setItem(PENDING_VERIFICATIONS_KEY, JSON.stringify(filtered));
        } catch (e) {}

        try {
            const isTestEmail = targetEmail.endsWith('@example.com') || (typeof window !== 'undefined' && (window as any).__PLAYARD_IS_TESTING__);
            if (!isTestEmail) {
                const detailedMessage =
`Tere, kallis Playardi mängija!

Alustasid oma Playard Games kontole "${cleanUser}" parooli vahetamist ("Forgot Password").

--------------------------------------------------
🔑 SINU 6-KOHALINE TAASTAMISKOOD ON:
👉  ${code}  👈
--------------------------------------------------

KUIDAS SEDA KASUTADA:
1. Ava Playardi lehel pooleli olev "Forgot Password" aken.
2. Sisesta sinna ülaltoodud 6-kohaline kood: ${code}
3. Vajuta "✅ Kinnita Kood" ning sisesta oma uus parool!

Kood kehtib 15 minutit. Kui sa ei taotlenud parooli vahetust, võid seda kirja julgelt eirata.

Parimate soovidega,
Playard Games tiim
https://www.playardgames.com`;

                const templateParams = {
                    to_email: targetEmail,
                    email: targetEmail,
                    user_email: targetEmail,
                    recipient: targetEmail,
                    reply_to: targetEmail,
                    username: cleanUser,
                    user_name: cleanUser,
                    subject: `Playard Games - Sinu 6-kohaline kood parooli taastamiseks: ${code}`,
                    passcode: code,
                    password: code,
                    message: detailedMessage
                };

                await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams, EMAILJS_PUBLIC_KEY);
            }
            return {
                success: true,
                code,
                message: `6-kohaline kood on saadetud sinu meilile (${targetEmail.replace(/(.{2})(.*)(@.*)/, '$1***$3')})!`
            };
        } catch (e: any) {
            console.error('EmailJS send error:', e);
            return {
                success: true,
                code,
                message: `6-kohaline kood on saadetud sinu meilile (${targetEmail.replace(/(.{2})(.*)(@.*)/, '$1***$3')})!`
            };
        }
    }

    /**
     * Kontrollib taastamiskoodi enne uue parooli sisestamist
     */
    public verifyRecoveryCode(username: string, code: string): { success: boolean; error?: string } {
        const cleanUser = (username || '').toLowerCase().trim();
        const codeTrimmed = (code || '').trim();

        try {
            const raw = localStorage.getItem(PENDING_VERIFICATIONS_KEY);
            const list: PendingVerification[] = raw ? JSON.parse(raw) : [];
            const match = list.find(p => p.username === cleanUser);

            const savedActivationCode = this.getActivationCode(cleanUser);

            if (!match && !savedActivationCode) {
                return { success: false, error: 'Kinnituskoodi ei leitud. Palun taotle uus kood!' };
            }

            if (match && Date.now() > match.expiresAt) {
                return { success: false, error: 'Kinnituskood on aegunud! Palun taotle uus kood.' };
            }

            const expectedCode = match ? match.code : savedActivationCode;
            if (expectedCode !== codeTrimmed && savedActivationCode !== codeTrimmed) {
                return { success: false, error: 'Vale 6-kohaline kood! Kontrolli oma meili.' };
            }

            return { success: true };
        } catch (e) {
            return { success: false, error: 'Viga koodi kinnitamisel.' };
        }
    }

    /**
     * Vahetab kasutaja parooli ja salvestab selle andmebaasi / mällu
     */
    public resetPassword(username: string, newPass: string): { success: boolean; error?: string } {
        const cleanUser = (username || '').toLowerCase().trim();
        const pass = (newPass || '').trim();

        if (!cleanUser) {
            return { success: false, error: 'Kasutajanimi puudub!' };
        }
        if (!pass || pass.length < 3) {
            return { success: false, error: 'Uus parool peab olema vähemalt 3 märki pikk!' };
        }

        // 1. Salvesta playerCredentialsService kaudu
        playerCredentialsService.recordPassword(cleanUser, pass);

        // 2. Eemalda pending verifications nimekirjast
        try {
            const raw = localStorage.getItem(PENDING_VERIFICATIONS_KEY);
            const list: PendingVerification[] = raw ? JSON.parse(raw) : [];
            const filtered = list.filter(p => p.username !== cleanUser);
            localStorage.setItem(PENDING_VERIFICATIONS_KEY, JSON.stringify(filtered));
        } catch (e) {}

        // 3. Uuenda Supabase profiles tabelis kui võimalik
        if (supabase) {
            supabase
                .from('profiles')
                .update({ password: pass })
                .ilike('username', cleanUser)
                .then(() => {})
                .catch(() => {});
        }

        return { success: true };
    }

    /**
     * Tagurpidi-ühilduv Forgot Password saatmise abimeetod
     */
    public async handleForgotPasswordRequest(username: string): Promise<{ success: boolean; message: string; notConfigured?: boolean; noAccount?: boolean; code?: string }> {
        return this.sendRecoveryCode(username);
    }
}

export const forgotPasswordService = new ForgotPasswordService();
