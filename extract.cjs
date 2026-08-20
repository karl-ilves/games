const fs = require('fs');
const content = fs.readFileSync('src/games/airplane/main.ts', 'utf8');
const regex = /function\s+([a-zA-Z0-9_]+)\s*\(/g;
let match;
const funcs = [];
while ((match = regex.exec(content)) !== null) {
    funcs.push(match[1]);
}
console.log(funcs.join(', '));
