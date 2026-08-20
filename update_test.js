const fs = require('fs');
let indexHtml = fs.readFileSync('index.html', 'utf8');

// Replace the end of the body with our test scripts
const replacement = `
    <!-- TEST UI MOCKING -->
    <div id="test-results" style="position: absolute; top: 10px; right: 10px; background: rgba(0,0,0,0.8); color: white; padding: 10px; z-index: 10000; font-family: monospace; max-height: 80%; overflow-y: auto;">
        <h2>Test Results</h2>
    </div>
    
    <style>
        .pass { color: #2ecc71; font-weight: bold; }
        .fail { color: #e74c3c; font-weight: bold; }
        canvas { display: none !important; }
    </style>

    <script>
        window.requestAnimationFrame = function() {};
    </script>
    <script src="main.js"></script>
    <script src="tests.js"></script>
</body>
</html>`;

// We find where main.js is loaded and replace from there
let testHtml = indexHtml.replace(/<script src="main\.js(\?v=.*)?"><\/script>[\s\S]*<\/html>/, replacement);

fs.writeFileSync('test.html', testHtml);
console.log("Updated test.html");
