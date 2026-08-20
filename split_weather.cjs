const fs = require('fs');
let content = fs.readFileSync('src/games/airplane/main.ts', 'utf8');

const regex = /function createClouds\(\) \{[\s\S]*?function updateWeather\(\) \{[\s\S]*?\n\}/;
const match = regex.exec(content);

if (match) {
    const weatherCode = `import * as THREE from 'three';\n// Import shared state later\n\n` + match[0];
    fs.writeFileSync('src/games/airplane/Weather.ts', weatherCode);
    console.log("Weather extracted");
} else {
    console.log("Not found");
}
