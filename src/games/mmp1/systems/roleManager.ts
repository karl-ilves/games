import { Role, Character } from '../types';
import { audio } from '../audio';
import { HudUI } from '../ui/hud';
import { AdminPanelUI } from '../ui/adminPanel';

export function handleSetAdminRole(
    role: Role,
    characters: Character[],
    playerChar: Character,
    gameState: string,
    adminPanelUI: AdminPanelUI,
    hudUI: HudUI,
    setAdminForcedRole: (r: Role) => void,
    addIncidentFeed: (msg: string) => void,
    updateRoleHud: () => void
) {
    setAdminForcedRole(role);
    adminPanelUI.updateAdminModalActiveState();

    const roleNames: Record<Role, string> = {
        murderer: "MÕRVAR 🔪",
        sheriff: "ŠERIF 🔫",
        innocent: "SÜÜTU 🛡️"
    };

    if (gameState === "lobby") {
        addIncidentFeed("👑 Admin valis oma rolliks: " + roleNames[role]);
    } else if (gameState === "in_game" && playerChar.isAlive) {
        const oldRole = playerChar.role;
        playerChar.role = role;
        playerChar.hasWeaponEquipped = false;
        if (playerChar.knifeMesh) playerChar.knifeMesh.visible = false;
        if (playerChar.gunMesh) playerChar.gunMesh.visible = false;

        if (role === "murderer") {
            characters.forEach(c => {
                if (!c.isPlayer && c.role === "murderer") {
                    c.role = "innocent";
                    c.hasWeaponEquipped = false;
                    if (c.knifeMesh) c.knifeMesh.visible = false;
                }
            });
            if (!characters.some(c => !c.isPlayer && c.isAlive && c.role === "sheriff")) {
                const livingBot = characters.find(c => !c.isPlayer && c.isAlive);
                if (livingBot) livingBot.role = "sheriff";
            }
        } else if (role === "sheriff") {
            characters.forEach(c => {
                if (!c.isPlayer && c.role === "sheriff") {
                    c.role = "innocent";
                    c.hasWeaponEquipped = false;
                    if (c.gunMesh) c.gunMesh.visible = false;
                }
            });
            if (!characters.some(c => !c.isPlayer && c.isAlive && c.role === "murderer")) {
                const livingBot = characters.find(c => !c.isPlayer && c.isAlive);
                if (livingBot) livingBot.role = "murderer";
            }
        } else if (role === "innocent") {
            if (oldRole === "murderer") {
                const livingBot = characters.find(c => !c.isPlayer && c.isAlive && c.role === "innocent");
                if (livingBot) livingBot.role = "murderer";
            }
            if (oldRole === "sheriff") {
                const livingBot = characters.find(c => !c.isPlayer && c.isAlive && c.role === "innocent");
                if (livingBot) livingBot.role = "sheriff";
            }
        }

        updateRoleHud();
        audio.playRoleReveal(role);
        addIncidentFeed("👑 Sinu roll on nüüd: " + roleNames[role] + "!");
    }
}
