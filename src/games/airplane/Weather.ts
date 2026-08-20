import * as THREE from 'three';

export class WeatherSystem {
    scene: THREE.Scene;
    particlesGroup: THREE.Group;
    snowMat: THREE.PointsMaterial;
    rainMat: THREE.PointsMaterial;
    weatherMode: string = 'sun';

    constructor(scene: THREE.Scene) {
        this.scene = scene;
        this.particlesGroup = new THREE.Group();
        this.scene.add(this.particlesGroup);

        this.snowMat = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 2,
            transparent: true,
            opacity: 0.8
        });

        this.rainMat = new THREE.PointsMaterial({
            color: 0xaaccff,
            size: 1,
            transparent: true,
            opacity: 0.6
        });
    }

    setWeather(mode: string) {
        this.weatherMode = mode;
        // Logic to clear old particles and spawn new ones
    }

    update(dt: number) {
        // Logic to move particles
    }
}