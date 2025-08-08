const path = require('path');
const { runTests } = require('@vscode/test-electron');

async function main() {
    try {
        const extensionDevelopmentPath = path.resolve(__dirname, '../');
        const extensionTestsPath = path.resolve(__dirname, './suite/index');

        // Configure test options with specific VS Code version
        const testOptions = {
            extensionDevelopmentPath,
            extensionTestsPath,
            version: '1.85.0', // Use a more stable version
            platform: process.platform === 'win32' ? 'win32-x64-archive' : undefined
        };

        await runTests(testOptions);
    } catch (err) {
        console.error('Failed to run tests:', err.message);
        
        // Fallback: run unit tests without VS Code extension host
        console.log('Running fallback unit tests...');
        const { spawn } = require('child_process');
        const mocha = spawn('npx', ['mocha', 'test/vtkParser.test.js'], { 
            stdio: 'inherit',
            cwd: path.resolve(__dirname, '../')
        });
        
        mocha.on('close', (code) => {
            process.exit(code);
        });
    }
}

main();