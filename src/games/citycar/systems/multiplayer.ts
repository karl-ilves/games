import * as THREE from 'three';
import Peer, { DataConnection } from 'peerjs';
import { supabase } from '../../../lib/supabase';
import { CarNetworkPacket, DriverInfo, WorldZone } from '../types';
import { createCarMesh, CarMeshContainer } from '../models/carModel';

export interface RemoteDriver {
    info: DriverInfo;
    mesh: CarMeshContainer;
    targetPos: THREE.Vector3;
    targetRotY: number;
    currentWheelRot: number;
    currentSteerAngle: number;
}

export class CityCarMultiplayerSystem {
    private localId: string;
    private localName: string;
    private localColor: string;
    private scene: THREE.Scene;

    private remoteDrivers: Map<string, RemoteDriver> = new Map();
    private broadcastChannel: BroadcastChannel | null = null;
    private supabaseChannel: any = null;
    private peer: Peer | null = null;
    private peerConnections: Map<string, DataConnection> = new Map();

    private lastBroadcastTime = 0;
    private onDriversChanged?: (drivers: DriverInfo[]) => void;

    constructor(
        localId: string,
        localName: string,
        localColor: string,
        scene: THREE.Scene,
        onDriversChanged?: (drivers: DriverInfo[]) => void
    ) {
        this.localId = localId;
        this.localName = localName;
        this.localColor = localColor;
        this.scene = scene;
        this.onDriversChanged = onDriversChanged;

        this.initBroadcastChannel();
        this.initSupabase();
        this.initPeerJS();
    }

    public setLocalColor(color: string): void {
        this.localColor = color;
    }

    private initBroadcastChannel(): void {
        if (typeof BroadcastChannel === 'undefined') return;
        try {
            this.broadcastChannel = new BroadcastChannel('playard_citycar_room_v1');
            this.broadcastChannel.onmessage = (e) => {
                const packet = e.data as CarNetworkPacket;
                if (!packet || packet.id === this.localId) return;
                this.handlePacket(packet);
            };
        } catch (e) {
            console.warn('[CityCar] BroadcastChannel init note:', e);
        }
    }

    private initSupabase(): void {
        if (!supabase) return;
        try {
            this.supabaseChannel = supabase.channel('citycar_realtime_server', {
                config: { broadcast: { self: false }, presence: { key: this.localId } }
            });

            this.supabaseChannel
                .on('presence', { event: 'sync' }, () => {
                    this.notifyDriversChanged();
                })
                .on('broadcast', { event: 'car_state' }, ({ payload }: { payload: CarNetworkPacket }) => {
                    if (payload && payload.id !== this.localId) {
                        this.handlePacket(payload);
                    }
                })
                .subscribe(async (status: string) => {
                    if (status === 'SUBSCRIBED') {
                        await this.supabaseChannel.track({
                            id: this.localId,
                            name: this.localName,
                            color: this.localColor,
                            onlineAt: new Date().toISOString()
                        });
                    }
                });
        } catch (e) {
            console.warn('[CityCar] Supabase note:', e);
        }
    }

    private initPeerJS(): void {
        try {
            const hostId = 'playard_citycar_host_room';
            this.peer = new Peer(hostId, {
                debug: 0,
                config: {
                    iceServers: [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:stun1.l.google.com:19302' }
                    ]
                }
            });

            this.peer.on('connection', (conn) => {
                this.setupPeerConn(conn);
            });

            this.peer.on('error', () => {
                // Host peer already taken, create client peer and connect to host
                try {
                    const clientPeer = new Peer({
                        debug: 0,
                        config: {
                            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
                        }
                    });
                    clientPeer.on('open', () => {
                        const conn = clientPeer.connect(hostId);
                        this.setupPeerConn(conn);
                    });
                    this.peer = clientPeer;
                } catch (err) {}
            });
        } catch (e) {
            console.warn('[CityCar] PeerJS note:', e);
        }
    }

    private setupPeerConn(conn: DataConnection): void {
        conn.on('open', () => {
            this.peerConnections.set(conn.peer, conn);
        });
        conn.on('data', (data: any) => {
            const packet = data as CarNetworkPacket;
            if (packet && packet.id !== this.localId) {
                this.handlePacket(packet);
            }
        });
        conn.on('close', () => {
            this.peerConnections.delete(conn.peer);
        });
    }

    private handlePacket(packet: CarNetworkPacket): void {
        let remote = this.remoteDrivers.get(packet.id);
        if (!remote) {
            // Spawn new opponent car mesh
            const mesh = createCarMesh({
                driverName: packet.name,
                bodyColor: packet.color,
                secondaryColor: '#1e272e',
                isOpponent: true
            });
            this.scene.add(mesh.group);

            remote = {
                info: {
                    id: packet.id,
                    name: packet.name,
                    color: packet.color,
                    isLocal: false,
                    lastSeen: Date.now(),
                    speed: packet.speed,
                    zone: packet.zone
                },
                mesh,
                targetPos: new THREE.Vector3(packet.x, packet.y, packet.z),
                targetRotY: packet.rotY,
                currentWheelRot: packet.wheelRot || 0,
                currentSteerAngle: packet.steerAngle || 0
            };
            this.remoteDrivers.set(packet.id, remote);
            this.notifyDriversChanged();
        }

        // Update target
        remote.info.lastSeen = Date.now();
        remote.info.speed = packet.speed;
        remote.info.zone = packet.zone;
        remote.targetPos.set(packet.x, packet.y, packet.z);
        remote.targetRotY = packet.rotY;
        remote.currentWheelRot = packet.wheelRot || 0;
        remote.currentSteerAngle = packet.steerAngle || 0;

        if (remote.info.color !== packet.color) {
            remote.info.color = packet.color;
            remote.mesh.setBodyColor(packet.color);
        }
    }

    public sendLocalState(
        x: number,
        y: number,
        z: number,
        rotY: number,
        speed: number,
        wheelRot: number,
        steerAngle: number,
        zone: WorldZone
    ): void {
        const now = performance.now();
        if (now - this.lastBroadcastTime < 45) return; // ~22 updates/sec max
        this.lastBroadcastTime = now;

        const packet: CarNetworkPacket = {
            id: this.localId,
            name: this.localName,
            color: this.localColor,
            x,
            y,
            z,
            rotY,
            speed,
            wheelRot,
            steerAngle,
            zone,
            time: Date.now()
        };

        // 1. BroadcastChannel (Local multi-tab)
        if (this.broadcastChannel) {
            try {
                this.broadcastChannel.postMessage(packet);
            } catch (e) {}
        }

        // 2. Supabase Realtime (Internet broadcast)
        if (this.supabaseChannel) {
            try {
                this.supabaseChannel.send({
                    type: 'broadcast',
                    event: 'car_state',
                    payload: packet
                });
            } catch (e) {}
        }

        // 3. PeerJS DataConnections
        if (this.peerConnections.size > 0) {
            this.peerConnections.forEach((conn) => {
                if (conn.open) {
                    try {
                        conn.send(packet);
                    } catch (e) {}
                }
            });
        }
    }

    public update(dt: number): void {
        const now = Date.now();
        const delta = Math.min(dt, 0.1);
        let removedAny = false;

        this.remoteDrivers.forEach((driver, id) => {
            // Remove disconnected drivers after 8 seconds of silence
            if (now - driver.info.lastSeen > 8000) {
                this.scene.remove(driver.mesh.group);
                this.remoteDrivers.delete(id);
                removedAny = true;
                return;
            }

            // Smooth interpolation to target position
            driver.mesh.group.position.lerp(driver.targetPos, delta * 12.0);

            // Interpolate rotation smoothly
            let diffRot = driver.targetRotY - driver.mesh.group.rotation.y;
            while (diffRot > Math.PI) diffRot -= Math.PI * 2;
            while (diffRot < -Math.PI) diffRot += Math.PI * 2;
            driver.mesh.group.rotation.y += diffRot * delta * 12.0;

            // Animate wheels
            driver.mesh.updateSteeringAndSpin(driver.currentSteerAngle, driver.currentWheelRot);
        });

        if (removedAny) {
            this.notifyDriversChanged();
        }
    }

    private notifyDriversChanged(): void {
        if (!this.onDriversChanged) return;
        const list: DriverInfo[] = [
            {
                id: this.localId,
                name: this.localName,
                color: this.localColor,
                isLocal: true,
                lastSeen: Date.now(),
                speed: 0,
                zone: 'city'
            }
        ];
        this.remoteDrivers.forEach((d) => list.push(d.info));
        this.onDriversChanged(list);
    }

    public getRemoteCount(): number {
        return this.remoteDrivers.size;
    }
}
