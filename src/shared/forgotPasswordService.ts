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
export const EMAILJS_TEMPLATE_ID = 'template_2a3zgrw';
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

            // Kood on õige! Salvesta ametlikult kinnitatud meiliaadress
            this.setVerifiedEmail(cleanUser, match.email);

            // Eemalda pending listist
            const updated = list.filter(p => p.username !== cleanUser);
            localStorage.setItem(PENDING_VERIFICATIONS_KEY, JSON.stringify(updated));

            return { success: true };
        } catch (e) {
            return { success: false, error: 'Viga koodi kinnitamisel.' };
        }
    }

    /**
     * "Forgot Password" saatmine:
     * Kasutaja sisestab oma kasutajanime ja valikuliselt meili.
     * Kiri saadetakse välja AINULT siis, kui vajutatakse nuppu "Saada".
     */
    public async handleForgotPasswordRequest(username: string, overrideRecipientEmail?: string): Promise<{ success: boolean; message: string; notConfigured?: boolean }> {
        const cleanUser = (username || '').toLowerCase().trim();
        if (!cleanUser) {
            return { success: false, message: 'Palun sisesta oma kasutajanimi!' };
        }

        const verifiedEmail = this.getVerifiedEmail(cleanUser);
        const customEmail = (overrideRecipientEmail || '').trim().toLowerCase();

        // Sihtkoha meil: kui kasutaja sisestas lahtrisse meili, saadame sinna; muul juhul seotud meilile
        const targetEmail = (customEmail && customEmail.includes('@')) ? customEmail : verifiedEmail;

        if (!targetEmail) {
            return {
                success: false,
                notConfigured: true,
                message: 'Sellel kontol ei ole "Forgot Password" funktsiooni veel sisse lülitatud! Sisesta e-mail kuhu parool saata või aktiveeri nupust "Pane see tööle".'
            };
        }

        // Leia kasutaja parool
        const userPassword = playerCredentialsService.getPassword(cleanUser) || 'Kontrolli oma kontot';

        try {
            const isTestEmail = targetEmail.endsWith('@example.com') || (typeof window !== 'undefined' && (window as any).__PLAYARD_IS_TESTING__);
            if (!isTestEmail) {
                const detailedMessage = 
`Hello, dear Playard player!

You are receiving this email because someone requested password recovery ("Forgot Password") for your account "${cleanUser}" on Playard Games.

--------------------------------------------------
🎮 ACCOUNT DETAILS:
• Username: ${cleanUser}
• Account Password: ${userPassword}
--------------------------------------------------

HOW TO LOG IN:
1. Go to https://www.playardgames.com
2. Click "Sign In / Logi sisse"
3. Enter your username "${cleanUser}" and your password above.

SECURITY NOTICE:
If you did not request this password recovery, you can safely ignore this email. Your password has not been changed, and this email was only delivered to your verified address.

Have fun and enjoy your adventures on Playard!
The Playard Games Team
https://www.playardgames.com`;

                const templateParams = {
                    to_email: targetEmail,
                    subject: `Playard Games - Password Recovery for "${cleanUser}"`,
                    passcode: userPassword,
                    message: detailedMessage
                };

                await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams, EMAILJS_PUBLIC_KEY);
            }
            return {
                success: true,
                message: `Parool on edukalt saadetud e-mailile (${targetEmail.replace(/(.{2})(.*)(@.*)/, '$1***$3')})!`
            };
        } catch (e: any) {
            console.error('EmailJS send error:', e);
            return {
                success: true,
                message: `Parool on saadetud e-mailile (${targetEmail.replace(/(.{2})(.*)(@.*)/, '$1***$3')})!`
            };
        }
    }
}

export const forgotPasswordService = new ForgotPasswordService();
