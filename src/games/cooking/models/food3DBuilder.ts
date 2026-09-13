import * as THREE from 'three';

export class Food3DBuilder {
    public food3DGroup: THREE.Group = new THREE.Group();

    public update3DPlateModel(plateItems: string[]): void {
        while (this.food3DGroup.children.length > 0) {
            const obj = this.food3DGroup.children[0];
            this.food3DGroup.remove(obj);
        }

        let currentY = 1.5;

        plateItems.forEach(itemKey => {
            let mesh: THREE.Mesh | null = null;

            if (itemKey === 'bun_bottom') {
                const geo = new THREE.CylinderGeometry(0.65, 0.6, 0.12, 24);
                const mat = new THREE.MeshStandardMaterial({ color: 0xd38e47, roughness: 0.6 });
                mesh = new THREE.Mesh(geo, mat);
                mesh.position.set(0, currentY + 0.06, 0.5);
                currentY += 0.12;
            } else if (itemKey === 'bun_top') {
                const geo = new THREE.SphereGeometry(0.66, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2);
                const mat = new THREE.MeshStandardMaterial({ color: 0xcd8237, roughness: 0.5 });
                mesh = new THREE.Mesh(geo, mat);
                mesh.position.set(0, currentY, 0.5);
                currentY += 0.25;
            } else if (itemKey === 'cooked_patty') {
                const geo = new THREE.CylinderGeometry(0.65, 0.65, 0.14, 24);
                const mat = new THREE.MeshStandardMaterial({ color: 0x4a2311, roughness: 0.8 });
                mesh = new THREE.Mesh(geo, mat);
                mesh.position.set(0, currentY + 0.07, 0.5);
                currentY += 0.14;
            } else if (itemKey === 'cheese_slice') {
                const geo = new THREE.BoxGeometry(1.0, 0.03, 1.0);
                const mat = new THREE.MeshStandardMaterial({ color: 0xf6b93b });
                mesh = new THREE.Mesh(geo, mat);
                mesh.rotation.y = 0.4;
                mesh.position.set(0, currentY + 0.02, 0.5);
                currentY += 0.04;
            } else if (itemKey === 'tomato_chopped') {
                const geo = new THREE.CylinderGeometry(0.3, 0.3, 0.04, 16);
                const mat = new THREE.MeshStandardMaterial({ color: 0xeb2f06 });
                mesh = new THREE.Mesh(geo, mat);
                mesh.position.set(0.15, currentY + 0.02, 0.45);
                currentY += 0.05;
            } else if (itemKey === 'lettuce_chopped') {
                const geo = new THREE.BoxGeometry(0.9, 0.04, 0.9);
                const mat = new THREE.MeshStandardMaterial({ color: 0x78e08f });
                mesh = new THREE.Mesh(geo, mat);
                mesh.position.set(0, currentY + 0.02, 0.5);
                currentY += 0.05;
            } else if (itemKey === 'onion_chopped') {
                const geo = new THREE.TorusGeometry(0.3, 0.04, 8, 16);
                const mat = new THREE.MeshStandardMaterial({ color: 0xb53471 });
                mesh = new THREE.Mesh(geo, mat);
                mesh.rotation.x = Math.PI / 2;
                mesh.position.set(0, currentY + 0.02, 0.5);
                currentY += 0.05;
            } else if (itemKey === 'pizza_dough' || itemKey === 'baked_in_oven') {
                const geo = new THREE.CylinderGeometry(0.8, 0.8, 0.08, 24);
                const mat = new THREE.MeshStandardMaterial({ color: itemKey === 'baked_in_oven' ? 0xe58e26 : 0xf8c291 });
                mesh = new THREE.Mesh(geo, mat);
                mesh.position.set(0, currentY + 0.04, 0.5);
                currentY += 0.09;
            } else if (itemKey === 'cooked_steak') {
                const geo = new THREE.BoxGeometry(0.9, 0.15, 0.6);
                const mat = new THREE.MeshStandardMaterial({ color: 0x592815, roughness: 0.7 });
                mesh = new THREE.Mesh(geo, mat);
                mesh.position.set(0, currentY + 0.08, 0.5);
                currentY += 0.16;
            } else if (itemKey === 'boiled_pasta') {
                const geo = new THREE.SphereGeometry(0.65, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
                const mat = new THREE.MeshStandardMaterial({ color: 0xf8efba });
                mesh = new THREE.Mesh(geo, mat);
                mesh.position.set(0, currentY, 0.5);
                currentY += 0.2;
            } else if (itemKey === 'fried_crispy' || itemKey === 'potato_chopped') {
                const geo = new THREE.BoxGeometry(0.7, 0.35, 0.7);
                const mat = new THREE.MeshStandardMaterial({ color: 0xf6b93b });
                mesh = new THREE.Mesh(geo, mat);
                mesh.position.set(0, currentY + 0.15, 0.5);
                currentY += 0.25;
            } else {
                const geo = new THREE.BoxGeometry(0.4, 0.05, 0.4);
                const mat = new THREE.MeshStandardMaterial({ color: 0xffd32a });
                mesh = new THREE.Mesh(geo, mat);
                mesh.position.set(0, currentY + 0.03, 0.5);
                currentY += 0.06;
            }

            if (mesh) {
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                this.food3DGroup.add(mesh);
            }
        });
    }
}
