/**
 * PI Lights.js
 * 
 * Juhib Raspberry Pi 3 (192.168.1.219) LED-tulesid vastavalt määratud mustrile:
 * - Kui agent/server teeb tööd:
 *   Roheline tuli (ACT): I 0,2s vahet I 0,2s vahet I 1s vahe
 *   Punane tuli (PWR): I 0,2s vahet I 0,2s vahet I 1s vahe
 *   ja kordub loopis seni, kuni töö kestab.
 * - Kui töö lõppeb: lülitub tagasi ooterežiimile (waiting).
 */

import { exec } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export class PiLightsController {
    constructor(host = '192.168.1.219', user = 'karl', pass = 't2103') {
        this.host = host;
        this.user = user;
        this.pass = pass;
    }

    /**
     * Saadab SSH kaudu käsu Raspberry Pi tulede oleku muutmiseks ('busy', 'waiting', 'error')
     */
    setState(state = 'busy') {
        return new Promise((resolve) => {
            const pythonScript = `
import pty, os, select, time, fcntl, termios

master, slave = pty.openpty()
pid = os.fork()
cmd = "sudo /usr/local/bin/playard-led ${state}"

if pid == 0:
    os.close(master)
    os.setsid()
    fcntl.ioctl(slave, termios.TIOCSCTTY, 0)
    os.dup2(slave, 0); os.dup2(slave, 1); os.dup2(slave, 2)
    os.close(slave)
    os.execlp('ssh', 'ssh', '-tt', '-o', 'StrictHostKeyChecking=no', '-o', 'ConnectTimeout=5', '${this.user}@${this.host}', cmd)
else:
    os.close(slave)
    sent_pw = False
    deadline = time.time() + 10
    out = b''
    while time.time() < deadline:
        r, _, _ = select.select([master], [], [], 0.3)
        if r:
            try: chunk = os.read(master, 1024)
            except OSError: break
            if not chunk: break
            out += chunk
            if not sent_pw and b'password:' in chunk.lower():
                time.sleep(0.1)
                os.write(master, b'${this.pass}\\n')
                sent_pw = True
            elif sent_pw and b'password for' in chunk.lower():
                time.sleep(0.1)
                os.write(master, b'${this.pass}\\n')
        else:
            wpid, _ = os.waitpid(pid, os.WNOHANG)
            if wpid != 0: break
    os.close(master)
`;
            exec(`python3 -c "${pythonScript.replace(/"/g, '\\"')}"`, (err) => {
                if (err) {
                    console.warn(`[PI Lights] Viga oleku '${state}' seadmisel:`, err.message);
                    return resolve(false);
                }
                console.log(`[PI Lights] Oleku seadmine õnnestus: ${state}`);
                resolve(true);
            });
        });
    }

    /**
     * Aktiveerib töötamise mustri (Roheline vilgub 3x 0.2s vahedega -> 1s paus -> Punane vilgub 3x 0.2s vahedega -> 1s paus)
     */
    async startWorking() {
        return await this.setState('busy');
    }

    /**
     * Lõpetab töötamise mustri ja viib tuled tagasi ooterežiimile
     */
    async stopWorking() {
        return await this.setState('waiting');
    }
}

export const piLights = new PiLightsController();

// Kui skript käivitatakse otse terminalist: node "PI Lights.js" [busy|waiting]
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
    const action = process.argv[2] || 'busy';
    const controller = new PiLightsController();
    console.log(`[PI Lights] Käivitan oleku: ${action}...`);
    controller.setState(action).then(() => {
        console.log(`[PI Lights] Valmis.`);
        process.exit(0);
    });
}
