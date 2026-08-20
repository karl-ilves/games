const fs = require('fs');
const content = fs.readFileSync('src/games/airplane/main.ts', 'utf8');

const assignmentRegex = /^\s*([a-zA-Z0-9_]+)\s*=[^=]/gm;
let match;
const assignments = new Set();
while ((match = assignmentRegex.exec(content)) !== null) {
    assignments.add(match[1]);
}

const declarations = new Set();
const declRegex = /(?:let|const|var)\s+([a-zA-Z0-9_]+)/g;
while ((match = declRegex.exec(content)) !== null) {
    declarations.add(match[1]);
}
const funcRegex = /function\s+([a-zA-Z0-9_]+)/g;
while ((match = funcRegex.exec(content)) !== null) {
    declarations.add(match[1]);
}

const undeclared = [];
for (let v of assignments) {
    if (!declarations.has(v)) {
        undeclared.push(v);
    }
}
console.log("Undeclared Variables: ", undeclared.join(', '));
