import { VehicleDef, Checkpoint } from './types';

export const VEHICLES: VehicleDef[] = [
    // --- CARS (12) ---
    { id: 'car_1', name: 'Starter Car', type: 'car', price: 0, yardPrice: 0, maxSpeed: 32, acceleration: 10, handling: 1.0, image: import.meta.env.BASE_URL + 'assets/shop_sports_car.jpg', hueRotate: 0 },
    { id: 'car_2', name: 'City Cruiser', type: 'car', price: 500, yardPrice: 30, maxSpeed: 34, acceleration: 14, handling: 1.1, image: import.meta.env.BASE_URL + 'assets/shop_sports_car.jpg', hueRotate: 45 },
    { id: 'car_3', name: 'Offroader', type: 'car', price: 1200, yardPrice: 60, maxSpeed: 33, acceleration: 9, handling: 0.8, image: import.meta.env.BASE_URL + 'assets/shop_suv.jpg', hueRotate: 0 },
    { id: 'car_4', name: 'Street Tuner', type: 'car', price: 2000, yardPrice: 100, maxSpeed: 40, acceleration: 17, handling: 1.2, image: import.meta.env.BASE_URL + 'assets/shop_sports_car.jpg', hueRotate: 120 },
    { id: 'car_5', name: 'Desert Truck', type: 'car', price: 3500, yardPrice: 160, maxSpeed: 39, acceleration: 10, handling: 0.9, image: import.meta.env.BASE_URL + 'assets/shop_suv.jpg', hueRotate: 90 },
    { id: 'car_6', name: 'Muscle Car', type: 'car', price: 5000, yardPrice: 240, maxSpeed: 45, acceleration: 22, handling: 0.9, image: import.meta.env.BASE_URL + 'assets/shop_sports_car.jpg', hueRotate: 200 },
    { id: 'car_7', name: 'V8 Interceptor', type: 'car', price: 7500, yardPrice: 360, maxSpeed: 48, acceleration: 25, handling: 1.0, image: import.meta.env.BASE_URL + 'assets/shop_sports_car.jpg', hueRotate: -50 },
    { id: 'car_8', name: 'Supercar', type: 'car', price: 12000, yardPrice: 500, maxSpeed: 54, acceleration: 29, handling: 1.3, image: import.meta.env.BASE_URL + 'assets/shop_hypercar.jpg', hueRotate: 0 },
    { id: 'car_9', name: 'Neon Hypercar', type: 'car', price: 20000, yardPrice: 800, maxSpeed: 60, acceleration: 34, handling: 1.4, image: import.meta.env.BASE_URL + 'assets/shop_hypercar.jpg', hueRotate: 180 },
    { id: 'car_10', name: 'Stealth Racer', type: 'car', price: 35000, yardPrice: 1200, maxSpeed: 65, acceleration: 39, handling: 1.5, image: import.meta.env.BASE_URL + 'assets/shop_hypercar.jpg', hueRotate: 45 },
    { id: 'car_11', name: 'F1 Prototype', type: 'car', price: 50000, yardPrice: 1600, maxSpeed: 78, acceleration: 47, handling: 1.8, image: import.meta.env.BASE_URL + 'assets/shop_hypercar.jpg', hueRotate: -90 },
    { id: 'cyber_hypercar', name: '💎 Yard Cyber Hypercar', type: 'car', price: 75000, yardPrice: 2000, maxSpeed: 88, acceleration: 52, handling: 1.85, image: import.meta.env.BASE_URL + 'assets/shop_hypercar.jpg', hueRotate: 160 },

    // --- MOTOS (11) ---
    { id: 'moto_1', name: 'Starter Bike', type: 'moto', price: 0, yardPrice: 0, maxSpeed: 33, acceleration: 15, handling: 1.1, image: import.meta.env.BASE_URL + 'assets/shop_moto.jpg', hueRotate: 0 },
    { id: 'moto_2', name: 'Scooter', type: 'moto', price: 400, yardPrice: 20, maxSpeed: 29, acceleration: 10, handling: 1.2, image: import.meta.env.BASE_URL + 'assets/shop_moto.jpg', hueRotate: 150 },
    { id: 'moto_3', name: 'Classic Chopper', type: 'moto', price: 1000, yardPrice: 50, maxSpeed: 34, acceleration: 14, handling: 0.8, image: import.meta.env.BASE_URL + 'assets/shop_chopper.jpg', hueRotate: 0 },
    { id: 'moto_4', name: 'Dirtbike', type: 'moto', price: 1800, yardPrice: 90, maxSpeed: 38, acceleration: 19, handling: 1.4, image: import.meta.env.BASE_URL + 'assets/shop_moto.jpg', hueRotate: 90 },
    { id: 'moto_5', name: 'Cruiser', type: 'moto', price: 3000, yardPrice: 150, maxSpeed: 40, acceleration: 17, handling: 0.9, image: import.meta.env.BASE_URL + 'assets/shop_chopper.jpg', hueRotate: 60 },
    { id: 'moto_6', name: 'Street Bike', type: 'moto', price: 4500, yardPrice: 220, maxSpeed: 47, acceleration: 23, handling: 1.3, image: import.meta.env.BASE_URL + 'assets/shop_moto.jpg', hueRotate: 210 },
    { id: 'moto_7', name: 'Heavy Chopper', type: 'moto', price: 6500, yardPrice: 320, maxSpeed: 45, acceleration: 20, handling: 0.85, image: import.meta.env.BASE_URL + 'assets/shop_chopper.jpg', hueRotate: -40 },
    { id: 'moto_8', name: 'Superbike', type: 'moto', price: 10000, yardPrice: 480, maxSpeed: 58, acceleration: 32, handling: 1.4, image: import.meta.env.BASE_URL + 'assets/shop_moto.jpg', hueRotate: -90 },
    { id: 'moto_9', name: 'Night Rider', type: 'moto', price: 18000, yardPrice: 760, maxSpeed: 64, acceleration: 34, handling: 1.5, image: import.meta.env.BASE_URL + 'assets/shop_chopper.jpg', hueRotate: 180 },
    { id: 'moto_10', name: 'Hyper Moto', type: 'moto', price: 30000, yardPrice: 1100, maxSpeed: 70, acceleration: 42, handling: 1.6, image: import.meta.env.BASE_URL + 'assets/shop_moto.jpg', hueRotate: 45 },
    { id: 'moto_11', name: 'Tron Bike', type: 'moto', price: 50000, yardPrice: 1600, maxSpeed: 85, acceleration: 54, handling: 1.7, image: import.meta.env.BASE_URL + 'assets/shop_moto.jpg', hueRotate: 270 }
];

export const LEVEL_CHECKPOINTS: { [level: number]: Checkpoint[] } = {
    1: [
        { x: 0, z: 0, radius: 40 },
        { x: 0, z: -400, radius: 40 },
        { x: -400, z: -400, radius: 40 },
        { x: -400, z: -100, radius: 40 },
        { x: -600, z: -100, radius: 40 },
        { x: -600, z: 300, radius: 40 },
        { x: -200, z: 300, radius: 40 },
        { x: -200, z: 500, radius: 40 },
        { x: 300, z: 500, radius: 40 },
        { x: 300, z: 0, radius: 40 }
    ],
    2: [
        { x: 0, z: 0, radius: 45 },
        { x: 0, z: -500, radius: 45 },
        { x: 400, z: -700, radius: 45 },
        { x: 700, z: -400, radius: 45 },
        { x: 500, z: 0, radius: 45 },
        { x: 500, z: 400, radius: 45 },
        { x: 200, z: 600, radius: 45 },
        { x: -300, z: 600, radius: 45 },
        { x: -500, z: 300, radius: 45 },
        { x: -300, z: 0, radius: 45 }
    ],
    3: [
        { x: 0, z: 0, radius: 50 },
        { x: 0, z: -800, radius: 50 },
        { x: -500, z: -1000, radius: 50 },
        { x: -1000, z: -500, radius: 50 },
        { x: -1000, z: 500, radius: 50 },
        { x: -500, z: 1000, radius: 50 },
        { x: 500, z: 1000, radius: 50 },
        { x: 1000, z: 500, radius: 50 },
        { x: 1000, z: -500, radius: 50 },
        { x: 500, z: -800, radius: 50 }
    ]
};
