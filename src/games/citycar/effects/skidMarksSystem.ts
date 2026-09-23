import * as THREE from 'three';

export interface SkidMarkSegment {
    mesh: THREE.Mesh;
    createdAt: number; // timestamp in seconds
}

export class SkidMarksSystem {
    private scene: THREE.Scene;
    private marks: SkidMarkSegment[] = [];
    private prevRearLeft: THREE.Vector3 | null = null;
    private prevRearRight: THREE.Vector3 | null = null;
    private maxMarks = 500;

    constructor(scene: THREE.Scene) {
        this.scene = scene;
    }

    /**
     * Record wheel positions while drifting and lay down dark rubber skid marks on the road
     */
    public recordDrift(
        rearLeftPos: THREE.Vector3,
        rearRightPos: THREE.Vector3,
        timeSec: number,
        groundY: number
    ): void {
        // Do not lay skid marks in deep water / river
        if (groundY < -0.2) {
            this.prevRearLeft = null;
            this.prevRearRight = null;
            return;
        }

        if (this.prevRearLeft && this.prevRearRight) {
            const distL = this.prevRearLeft.distanceTo(rearLeftPos);
            const distR = this.prevRearRight.distanceTo(rearRightPos);

            // Lay a mark segment when the car has moved at least 0.4 meters
            if (distL >= 0.4 || distR >= 0.4) {
                this.createSkidSegment(this.prevRearLeft, rearLeftPos, groundY, timeSec);
                this.createSkidSegment(this.prevRearRight, rearRightPos, groundY, timeSec);

                this.prevRearLeft.copy(rearLeftPos);
                this.prevRearRight.copy(rearRightPos);
            }
        } else {
            this.prevRearLeft = rearLeftPos.clone();
            this.prevRearRight = rearRightPos.clone();
        }
    }

    /**
     * Call when not drifting to break the skid line continuity
     */
    public endDrift(): void {
        this.prevRearLeft = null;
        this.prevRearRight = null;
    }

    private createSkidSegment(
        startPos: THREE.Vector3,
        endPos: THREE.Vector3,
        groundY: number,
        timeSec: number
    ): void {
        const dx = endPos.x - startPos.x;
        const dz = endPos.z - startPos.z;
        const length = Math.sqrt(dx * dx + dz * dz);
        if (length < 0.05) return;

        const midX = (startPos.x + endPos.x) / 2;
        const midZ = (startPos.z + endPos.z) / 2;
        const angle = Math.atan2(dx, dz);

        // Width of car tire ~0.26m
        const geo = new THREE.PlaneGeometry(0.26, length);
        const mat = new THREE.MeshBasicMaterial({
            color: 0x151515,
            transparent: true,
            opacity: 0.72,
            depthWrite: false,
            side: THREE.DoubleSide
        });

        const mesh = new THREE.Mesh(geo, mat);
        // Slightly elevated above asphalt to prevent z-fighting
        mesh.position.set(midX, groundY + 0.025, midZ);
        mesh.rotation.order = 'YXZ';
        mesh.rotation.y = angle;
        mesh.rotation.x = -Math.PI / 2;

        this.scene.add(mesh);
        this.marks.push({ mesh, createdAt: timeSec });

        // Cap maximum marks for mobile performance
        if (this.marks.length > this.maxMarks) {
            const oldest = this.marks.shift();
            if (oldest) {
                this.scene.remove(oldest.mesh);
                oldest.mesh.geometry.dispose();
                (oldest.mesh.material as THREE.Material).dispose();
            }
        }
    }

    /**
     * Update active skid marks.
     * User requirement: "ja jälg kaob ära 1 min pärast" (marks disappear after 1 minute = 60s)
     */
    public update(timeSec: number): void {
        for (let i = this.marks.length - 1; i >= 0; i--) {
            const mark = this.marks[i];
            const age = timeSec - mark.createdAt;

            if (age >= 60.0) {
                // Exactly 1 minute (60s) elapsed: remove from scene and memory
                this.scene.remove(mark.mesh);
                mark.mesh.geometry.dispose();
                (mark.mesh.material as THREE.Material).dispose();
                this.marks.splice(i, 1);
            } else if (age >= 55.0) {
                // Smooth fade-out during the final 5 seconds before 1 minute
                const mat = mark.mesh.material as THREE.MeshBasicMaterial;
                mat.opacity = THREE.MathUtils.clamp(((60.0 - age) / 5.0) * 0.72, 0, 0.72);
            }
        }
    }

    public getMarksCount(): number {
        return this.marks.length;
    }

    public getOldestMarkAge(timeSec: number): number {
        if (this.marks.length === 0) return 0;
        return timeSec - this.marks[0].createdAt;
    }

    public clear(): void {
        for (const mark of this.marks) {
            this.scene.remove(mark.mesh);
            mark.mesh.geometry.dispose();
            (mark.mesh.material as THREE.Material).dispose();
        }
        this.marks = [];
        this.prevRearLeft = null;
        this.prevRearRight = null;
    }
}
