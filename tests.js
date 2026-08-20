const resultsDiv = document.getElementById('test-results');

function assert(condition, message) {
    const el = document.createElement('div');
    if (condition) {
        el.className = 'pass';
        el.innerText = 'PASS: ' + message;
    } else {
        el.className = 'fail';
        el.innerText = 'FAIL: ' + message;
        console.error('Assertion failed:', message);
    }
    resultsDiv.appendChild(el);
}

let mockTime = 0;
const originalNow = performance.now.bind(performance);
performance.now = function() {
    return mockTime;
};

function stepPhysics(frames) {
    for (let i = 0; i < frames; i++) {
        mockTime += 1000 / 30; // simulate 30 FPS (approx 33.3ms per frame)
        if (gameState === 'playing') {
            updatePhysics();
        }
        updateEmergencies();
        updateWeather();
        updateWorld();
        updatePlayer();
        updateCamera();
        updateSirenVolume();
        updateUI();
    }
}

async function runTests() {
    console.log("Running tests...");
    
    // We start in intro mode now, bypass it for tests
    gameState = 'playing';

    // TEST 1: Doesn't crash on spawn
    resetPlane();
    stepPhysics(150); // 2.5 seconds of physics (at 60fps), equivalent to 5s at 30fps
    assert(gameState === 'playing', "Game should remain 'playing' on spawn without input.");
    assert(planeGroup.position.y === 2, "Plane should remain on the ground (y=2).");
    assert(planeVelocity.length() < 0.1, "Plane should not be moving.");

    // TEST 2: Throttle up causes takeoff
    resetPlane();
    keys['KeyW'] = true; // Hold throttle up
    stepPhysics(600); // Need more frames since 30FPS physics adjustments
    keys['KeyW'] = false;
    assert(planeVelocity.length() > 1.0, "Plane should gain speed with throttle.");
    assert(planeGroup.position.y > 5, "Plane should take off after gaining speed.");
    assert(hasTakenOff === true, "hasTakenOff should be true.");
    
    // TEST 3: Pitching down causes crash
    resetPlane();
    startTime = -9999; // Bypass crash grace period
    planeGroup.position.set(0, 100, 0); // High up
    planeVelocity.set(0, 0, -20); // Fast forward
    hasTakenOff = true;
    keys['ArrowUp'] = true; // Pitch down
    stepPhysics(300); // Wait for it to hit ground
    keys['ArrowUp'] = false;
    assert(gameState === 'crashed', "Pitching down into the ground should cause a crash.");
    assert(document.getElementById('message').innerText.includes("Crash!"), "Crash message should be displayed.");
    
    // TEST 4: Autopilot maintains flight
    resetPlane();
    // Cheat the plane into the air
    planeGroup.position.set(0, 500, 0); // Higher to avoid crashing
    planeVelocity.set(0, 0, -5); 
    hasTakenOff = true;
    autopilot = true;
    gameState = 'playing';
    
    // Give it a bad roll and pitch
    planeGroup.rotation.z = 0.5;
    planeGroup.rotation.x = -0.5;
    
    stepPhysics(1500); // Give it plenty of time to level out (30FPS means more frames)
    
    let roll = planeGroup.rotation.z;
    assert(Math.abs(roll) < 0.1, "Autopilot should level the wings.");
    assert(gameState === 'playing', "Autopilot should not crash the plane.");
    
    autopilot = false;
    
    // TEST 5: Alarms trigger correctly (PULL UP)
    resetPlane();
    hasTakenOff = true;
    planeGroup.position.y = 100; // In the air
    planeVelocity.y = -5; // High sink rate
    stepPhysics(10); // Run physics briefly
    assert(document.getElementById('pullup-text').style.display === 'block', "PULL UP alarm should trigger on high sink rate.");
    
    // TEST 6: Air Speed Low Alarm (25 - 50 knots, gear UP)
    resetPlane();
    hasTakenOff = true;
    planeGroup.position.y = 500;
    // planeVelocity.length() * 10 is knots. We want 40 knots, so length = 4.0
    planeVelocity.set(0, 0, -4.0); 
    gearDown = false; 
    stepPhysics(10);
    assert(document.getElementById('airspeed-text').style.display === 'block', "AIR SPEED LOW alarm should trigger between 25-50 knots when gear is up.");
    
    // TEST 7: Stall Alarm (< 25 knots)
    resetPlane();
    hasTakenOff = true;
    planeGroup.position.y = 500;
    planeVelocity.set(0, 0, -2.0); // 20 knots
    stepPhysics(10);
    assert(document.getElementById('stall-text').style.display === 'block', "STALL alarm should trigger on < 25 knots.");
    
    // TEST 8: GEARS Alarm (< 500 ft, gear UP)
    resetPlane();
    buildPlane('boeing'); // Cessna does not have retractable gear
    hasTakenOff = true;
    planeGroup.position.y = 40; // 400 ft
    planeVelocity.set(0, 0, -10.0); // 100 knots
    gearDown = false; // Wheels up
    stepPhysics(10);
    assert(document.getElementById('gears-text').style.display === 'block', "GEARS alarm should trigger below 500 ft with wheels up.");
    buildPlane('cessna'); // Restore default
    
    // TEST 9: Wing Strike
    resetPlane();
    startTime = -9999;
    hasTakenOff = true;
    planeVelocity.set(0, 0, -5.0); // 50 knots
    planeGroup.position.set(0, 5, -100);
    // Bank 90 degrees right
    planeGroup.rotation.z = -Math.PI / 2;
    planeGroup.updateMatrixWorld(true);
    stepPhysics(1);
    assert(gameState === 'crashed', "Banking heavily near ground should cause Wing Strike crash");
    assert(document.getElementById('message').innerText.includes("Wing Strike"), "Crash message should say Wing Strike");

    // TEST 10: Weather Lock (Snow)
    resetPlane();
    setWeather('snow'); // Trigger snowstorm
    stepPhysics(10);
    assert(document.getElementById('weather-select').disabled === true, "Weather select should be disabled during snowstorm.");
    // fast forward 5 mins (5 * 60 * 30 = 9000 frames)
    stepPhysics(9001);
    assert(document.getElementById('weather-select').disabled === false, "Weather select should be re-enabled after snowstorm ends.");

    const done = document.createElement('h3');
    done.innerText = "Tests Complete.";
    resultsDiv.appendChild(done);
}

setTimeout(runTests, 500);
