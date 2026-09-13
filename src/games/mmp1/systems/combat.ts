import * as THREE from "three";
import { Character, DroppedGun, CoinItem, MapId, Role } from "../types";
import { MAP_CATALOG } from "../catalog";
import { audio } from "../audio";
import { createUltraRealisticRevolver } from "../models/weaponBuilder";

export function hasLineOfSight(
    from: THREE.Vector3 | { x: number; y: number; z: number },
    to: THREE.Vector3 | { x: number; y: number; z: number },
    wallMeshes: THREE.Mesh[]
): boolean {
    const origin = new THREE.Vector3(from.x, from.y + 1.8, from.z);
    const target = new THREE.Vector3(to.x, to.y + 1.8, to.z);
    const dir = target.clone().sub(origin);
    const dist = dir.length();
    if (dist < 0.2) return true;
    dir.normalize();

    const raycaster = new THREE.Raycaster(origin, dir, 0.2, dist);
    const hits = raycaster.intersectObjects(wallMeshes, false);
    if (hits.length > 0 && hits[0].distance < dist - 0.4) {
        return false;
    }
    return true;
}

export function getCharacterFromObject(obj: THREE.Object3D | null, characters: Character[]): Character | null {
    let curr: THREE.Object3D | null = obj;
    while (curr) {
        if (curr.userData && curr.userData.character) {
            return curr.userData.character as Character;
        }
        for (const c of characters) {
            if (c.mesh === curr) return c;
        }
        curr = curr.parent;
    }
    return null;
}

export interface CombatContext {
    characters: Character[];
    playerChar: Character;
    wallMeshes: THREE.Mesh[];
    mapColliders: THREE.Box3[];
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    muzzleFlashLight: THREE.PointLight | null;
    droppedGun: DroppedGun | null;
    currentMapId: MapId;
    isPointerLocked: boolean;
    hasSheriffWitnessedMurder: boolean;
    lastHero: Character | null;
    gunDroppedBanner: HTMLElement | null;
    interactionPrompt: HTMLElement | null;
    addIncidentFeed: (text: string) => void;
    updateAliveCount: () => void;
    updateRoleHud: () => void;
    endRound: (winner: "sheriff_win" | "murderer_win" | "time_out", reason: string) => void;
    setDroppedGun: (gun: DroppedGun | null) => void;
    setHasSheriffWitnessedMurder: (val: boolean) => void;
    setLastHero: (hero: Character | null) => void;
}

export class CombatSystem {
    private ctx: CombatContext;

    constructor(ctx: CombatContext) {
        this.ctx = ctx;
    }

    public hasLineOfSight(from: THREE.Vector3 | { x: number; y: number; z: number }, to: THREE.Vector3 | { x: number; y: number; z: number }): boolean {
        return hasLineOfSight(from, to, this.ctx.wallMeshes);
    }

    public getCharacterFromObject(obj: THREE.Object3D | null): Character | null {
        return getCharacterFromObject(obj, this.ctx.characters);
    }

    public performMurdererSlash(attacker: Character, screenPos?: { x: number; y: number }) {
        audio.playKnifeSlash();
        
        if (!attacker.isPlayer) {
            const attackRange = 3.2;
            for (const target of this.ctx.characters) {
                if (target === attacker || !target.isAlive) continue;
                const dist = attacker.position.distanceTo(target.position);
                if (dist < attackRange && this.hasLineOfSight(attacker.position, target.position)) {
                    this.eliminateCharacter(target, attacker, "knife");
                    break;
                }
            }
            return;
        }

        const coords = screenPos ?? { x: 0, y: 0 };
        this.ctx.camera.updateMatrixWorld(true);
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(coords.x, coords.y), this.ctx.camera);

        const targetMeshes: THREE.Object3D[] = [];
        for (const c of this.ctx.characters) {
            if (c !== attacker && c.isAlive && c.mesh) {
                targetMeshes.push(c.mesh);
            }
        }
        if (targetMeshes.length === 0) return;
        targetMeshes.forEach(m => m.updateMatrixWorld(true));

        const allShootables = [...targetMeshes, ...this.ctx.wallMeshes];
        const hits = raycaster.intersectObjects(allShootables, true);
        if (hits.length === 0) return;

        const firstHit = hits[0];
        let isWall = false;
        let curr: THREE.Object3D | null = firstHit.object;
        while (curr) {
            if (this.ctx.wallMeshes.includes(curr as THREE.Mesh)) {
                isWall = true;
                break;
            }
            curr = curr.parent;
        }
        if (isWall) return;

        const hitTarget = this.getCharacterFromObject(firstHit.object);
        if (!hitTarget || hitTarget === attacker || !hitTarget.isAlive) {
            return;
        }

        const dist = attacker.position.distanceTo(hitTarget.position);
        const maxMeleeDist = 4.2;
        if (dist > maxMeleeDist) {
            return;
        }

        if (!this.hasLineOfSight(attacker.position, hitTarget.position)) {
            return;
        }

        this.eliminateCharacter(hitTarget, attacker, "knife");
    }

    public performSheriffShoot(shooter: Character, screenPos?: { x: number; y: number }) {
        audio.playGunshot();

        if (this.ctx.muzzleFlashLight && shooter.position) {
            this.ctx.muzzleFlashLight.position.copy(shooter.position).add(new THREE.Vector3(0, 1.8, 0));
            this.ctx.muzzleFlashLight.intensity = 5.0;
            setTimeout(() => {
                if (this.ctx.muzzleFlashLight) {
                    this.ctx.muzzleFlashLight.intensity = 0;
                }
            }, 70);
        }

        const charMeshes = this.ctx.characters.filter(c => c !== shooter && c.isAlive && c.mesh).map(c => c.mesh);
        const allShootables = [...charMeshes, ...this.ctx.wallMeshes];
        if (allShootables.length === 0) return;

        let raycaster: THREE.Raycaster;
        if (shooter.isPlayer) {
            const coords = screenPos ?? { x: 0, y: 0 };
            this.ctx.camera.updateMatrixWorld(true);
            raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(new THREE.Vector2(coords.x, coords.y), this.ctx.camera);
            raycaster.far = 100;
        } else {
            const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), shooter.rotation);
            const rayOrigin = shooter.position.clone().add(new THREE.Vector3(0, 1.8, 0));
            raycaster = new THREE.Raycaster(rayOrigin, forward, 0.5, 75);
            raycaster.camera = this.ctx.camera;
        }

        const hits = raycaster.intersectObjects(allShootables, true);

        if (hits.length > 0 && hits[0]?.object) {
            const hitObj = hits[0].object;
            let isWall = false;
            let curr: THREE.Object3D | null = hitObj;
            while (curr) {
                if (this.ctx.wallMeshes.includes(curr as THREE.Mesh)) {
                    isWall = true;
                    break;
                }
                curr = curr.parent;
            }
            if (isWall) {
                return;
            }

            const hitTarget = this.getCharacterFromObject(hitObj);

            if (hitTarget && hitTarget !== shooter && hitTarget.isAlive) {
                if (hitTarget.role === "murderer") {
                    this.ctx.setLastHero(shooter);
                    this.eliminateCharacter(hitTarget, shooter, "gun");
                    this.ctx.endRound("sheriff_win", shooter.name + " laskis mõrvari maha! Süütud ja šerif võitsid!");
                } else {
                    this.eliminateCharacter(hitTarget, shooter, "gun_mistake");
                    this.eliminateCharacter(shooter, null, "sheriff_guilt");
                    this.spawnDroppedGun(shooter.position.clone());
                    this.ctx.addIncidentFeed("⚠️ Šerif eksis ja lasi süütu! Šerif langes!");
                }
            }
        }
    }

    public eliminateCharacter(target: Character, killer: Character | null, cause: string) {
        target.isAlive = false;
        target.mesh.visible = false;
        audio.playStabImpact();

        if (target.isPlayer) {
            this.ctx.addIncidentFeed("💀 Said surma! (" + (cause === "knife" ? "Mõrvar tabas sind" : "Kuulitaba") + ")");
        } else if (cause === "knife" || (killer && killer.role === "murderer")) {
            this.ctx.addIncidentFeed("💀 Mängija " + target.name + " elimineeriti!");
        } else if (cause === "gun") {
            this.ctx.addIncidentFeed("⭐ Šerif tabas märki! " + target.name + " langes!");
        } else {
            this.ctx.addIncidentFeed("💀 Mängija " + target.name + " langes!");
        }

        if (killer && killer.role === "murderer") {
            const sheriff = this.ctx.characters.find(c => c.role === "sheriff" && c.isAlive);
            if (sheriff) {
                const dist = sheriff.position.distanceTo(target.position);
                const seesMurder = this.hasLineOfSight(sheriff.position, target.position) || this.hasLineOfSight(sheriff.position, killer.position);
                if (seesMurder && dist < 36) {
                    this.ctx.setHasSheriffWitnessedMurder(true);
                    this.ctx.addIncidentFeed("👁️ Šerif nägi mõrva pealt! Mõrvar on paljastatud!");
                }
            }
        }

        if (target.role === "sheriff") {
            this.spawnDroppedGun(target.position.clone());
        }

        this.ctx.updateAliveCount();
        this.checkWinConditions();
    }

    public spawnDroppedGun(pos: THREE.Vector3) {
        if (this.ctx.droppedGun) {
            this.ctx.scene.remove(this.ctx.droppedGun.mesh);
        }

        const gunGroup = new THREE.Group();
        const goldenRevolver = createUltraRealisticRevolver(true);
        goldenRevolver.position.set(0, 0.75, 0);
        goldenRevolver.rotation.x = Math.PI / 8;
        goldenRevolver.scale.set(1.4, 1.4, 1.4);
        gunGroup.add(goldenRevolver);

        const beaconGeo = new THREE.CylinderGeometry(0.15, 0.15, 12, 12);
        const beaconMat = new THREE.MeshBasicMaterial({ color: 0xffd32a, transparent: true, opacity: 0.5 });
        const beacon = new THREE.Mesh(beaconGeo, beaconMat);
        beacon.position.set(0, 6, 0);
        gunGroup.add(beacon);

        const pointLight = new THREE.PointLight(0xffd32a, 2.0, 15);
        pointLight.position.set(0, 2, 0);
        gunGroup.add(pointLight);

        gunGroup.position.copy(pos);
        this.ctx.scene.add(gunGroup);

        const gunObj = {
            mesh: gunGroup,
            position: pos.clone(),
            active: true
        };
        this.ctx.setDroppedGun(gunObj);

        if (this.ctx.gunDroppedBanner) this.ctx.gunDroppedBanner.style.display = "flex";
        this.ctx.addIncidentFeed("⚠️ Relv on maas! Süütud saavad selle [E] klahviga üles korjata!");
    }

    public pickUpDroppedGun(char: Character) {
        if (!this.ctx.droppedGun || !this.ctx.droppedGun.active) return;

        this.ctx.droppedGun.active = false;
        this.ctx.scene.remove(this.ctx.droppedGun.mesh);
        this.ctx.setDroppedGun(null);

        char.role = "sheriff";
        char.hasWeaponEquipped = true;
        if (char.gunMesh) char.gunMesh.visible = true;

        audio.playPickupGun();

        if (char.isPlayer) {
            this.ctx.updateRoleHud();
            this.ctx.addIncidentFeed("⭐ Korjasid maast šerifi relva! Oled nüüd Kangelane!");
        } else {
            this.ctx.addIncidentFeed("⭐ " + char.name + " korjas maast šerifi relva!");
        }

        if (this.ctx.gunDroppedBanner) this.ctx.gunDroppedBanner.style.display = "none";
        if (this.ctx.interactionPrompt) this.ctx.interactionPrompt.style.display = "none";
    }

    public checkWinConditions() {
        const murderer = this.ctx.characters.find(c => c.role === "murderer");
        const innocentsAndSheriff = this.ctx.characters.filter(c => c.role !== "murderer");
        const aliveInnocentsAndSheriff = innocentsAndSheriff.filter(c => c.isAlive);

        if (murderer && !murderer.isAlive) {
            const hero = this.ctx.lastHero || this.ctx.characters.find(c => c.role === "sheriff" && c.isAlive) || this.ctx.playerChar;
            const heroName = hero ? hero.name : "Šerif";
            this.ctx.endRound("sheriff_win", heroName + " laskis mõrvari maha! Süütud ja šerif võitsid!");
        } else if (aliveInnocentsAndSheriff.length === 0) {
            this.ctx.endRound("murderer_win", "Mõrvar kõrvaldas kõik süütud ja šerifi! Mõrvar võitis!");
        }
    }
}
