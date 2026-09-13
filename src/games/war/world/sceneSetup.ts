import * as THREE from 'three';

export interface WarSceneContext {
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
}

export function createWarScene(container: HTMLElement): WarSceneContext {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x090e17);
    scene.fog = new THREE.FogExp2(0x090e17, 0.007);
    const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.5, 1000);
    camera.position.set(0, 16, -26);

    let renderer: THREE.WebGLRenderer;
    try {
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.appendChild(renderer.domElement);
    } catch (e) {
        const canvas = document.createElement('canvas');
        container.appendChild(canvas);
        renderer = {
            domElement: canvas,
            setSize: () => {},
            setPixelRatio: () => {},
            render: () => {},
            shadowMap: { enabled: false, type: 0 }
        } as any;
    }

    const ambientLight = new THREE.AmbientLight(0xdce7f0, 0.75);
    scene.add(ambientLight);
    const sunLight = new THREE.DirectionalLight(0xfffaed, 1.25);
    sunLight.position.set(70, 140, 90);
    sunLight.castShadow = true;
    scene.add(sunLight);

    return { scene, camera, renderer };
}
