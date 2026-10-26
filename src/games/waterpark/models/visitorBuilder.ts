import * as THREE from 'three';

export class VisitorBuilder {
    public static createVisitorMesh(outfitColor: number = 0x38bdf8): THREE.Group {
        const group = new THREE.Group();
        group.name = 'visitor_avatar';

        // Legs (Swimming shorts)
        const legsMat = new THREE.MeshStandardMaterial({ color: outfitColor });
        const lLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.7, 8), legsMat);
        lLeg.position.set(-0.16, 0.35, 0);
        group.add(lLeg);

        const rLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.7, 8), legsMat);
        rLeg.position.set(0.16, 0.35, 0);
        group.add(rLeg);

        // Torso / Swimsuit
        const torsoMat = new THREE.MeshStandardMaterial({ color: 0xffd32a }); // Beach tank top
        const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.3), torsoMat);
        torso.position.y = 1.05;
        group.add(torso);

        // Head
        const skinMat = new THREE.MeshStandardMaterial({ color: 0xffdfba });
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 12), skinMat);
        head.position.y = 1.62;
        group.add(head);

        // Sunglasses / Diving goggles
        const gogglesMat = new THREE.MeshStandardMaterial({ color: 0x1e272e, roughness: 0.1 });
        const goggles = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.1, 0.1), gogglesMat);
        goggles.position.set(0, 1.64, 0.2);
        group.add(goggles);

        return group;
    }
}
