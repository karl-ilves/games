const fs = require('fs');
let content = fs.readFileSync('src/games/airplane/main.ts', 'utf8');

// Replace top-level variables with "this."
// It's too complex to do safely with a simple script.

