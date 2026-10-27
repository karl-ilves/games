import * as THREE from 'three';
import { WaterParkEnvironment } from './world/environment';
import { BuildSystem } from './systems/buildSystem';
import { PlayerAvatarSystem } from './systems/playerAvatar';
import { ThirdPersonFollowCamera } from './systems/followCamera';
import { WaterParkHUD } from './ui/hud';

export class WaterParkGame {
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;

    public environment: WaterParkEnvironment;
    public playerAvatar: PlayerAvatarSystem;
    public followCamera: ThirdPersonFollowCamera;
    public buildSystem: BuildSystem;
    public hud: WaterParkHUD;

    private lastTime: number = performance.now();

    constructor() {
        const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
        this.scene = new THREE.Scene();

        this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.5, 500);
        this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;

        this.environment = new WaterParkEnvironment(this.scene);
        this.playerAvatar = new PlayerAvatarSystem(this.scene);
        this.followCamera = new ThirdPersonFollowCamera(this.camera, canvas, (deltaYaw) => {
            this.playerAvatar.characterYaw -= deltaYaw;
        });
        this.buildSystem = new BuildSystem(this.scene, this.camera, canvas);

        this.hud = new WaterParkHUD(
            (id: string) => {
                this.buildSystem.selectItem(id);
            },
            (isDelete: boolean) => {
                this.buildSystem.setDeleteMode(isDelete);
            }
        );

        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });

        this.animate();
    }

    private animate = () => {
        requestAnimationFrame(this.animate);
        const now = performance.now();
        const delta = Math.min(0.1, (now - this.lastTime) / 1000);
        this.lastTime = now;

        // Player walking controls & physical climbing on 2x stairs / towers
        this.playerAvatar.update(delta, this.buildSystem.getPlacedStructureMeshes());

        // Follow player avatar with camera
        this.followCamera.update(this.playerAvatar.position, this.playerAvatar.characterYaw);

        this.renderer.render(this.scene, this.camera);
    };
}

// Global bootstrap
window.addEventListener('DOMContentLoaded', () => {
    (window as any).__waterParkGame = new WaterParkGame();
});
