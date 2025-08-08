const assert = require('assert');
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

describe('Webview Navigation Tests', function() {
    let dom;
    let window;
    let document;
    let mockVscode;
    let receivedMessages;

    before(function() {
        // Create a mock DOM environment
        const html = `
        <!DOCTYPE html>
        <html>
        <head><title>Test</title></head>
        <body>
            <button id="prev-file" class="nav-button">Previous</button>
            <span id="current-file" class="current-file">Loading...</span>
            <button id="next-file" class="nav-button">Next</button>
            <select id="scalar-select"></select>
            <select id="colormap-select"></select>
            <input type="checkbox" id="auto-range" checked>
            <input type="number" id="min-value">
            <input type="number" id="max-value">
            <button id="apply-range">Apply</button>
            <div id="vtk-canvas"></div>
            <div id="legend"></div>
        </body>
        </html>`;

        dom = new JSDOM(html, { 
            url: 'http://localhost',
            pretendToBeVisual: true,
            resources: 'usable'
        });
        window = dom.window;
        document = window.document;
        global.window = window;
        global.document = document;

        // Mock d3 library with basic functionality
        global.d3 = {
            interpolateViridis: (t) => `rgb(${Math.floor(t*255)}, ${Math.floor(t*255)}, ${Math.floor(t*255)})`,
            interpolatePlasma: (t) => `rgb(${Math.floor(t*255)}, 0, ${Math.floor(t*255)})`,
            interpolateInferno: (t) => `rgb(${Math.floor(t*255)}, 0, 0)`,
            interpolateMagma: (t) => `rgb(${Math.floor(t*255)}, 0, ${Math.floor(t*128)})`,
            interpolateCividis: (t) => `rgb(0, ${Math.floor(t*255)}, ${Math.floor(t*255)})`,
            interpolateTurbo: (t) => `rgb(${Math.floor(t*255)}, ${Math.floor(t*128)}, 0)`,
            interpolateRainbow: (t) => `hsl(${Math.floor(t*360)}, 100%, 50%)`,
            interpolateCool: (t) => `rgb(0, ${Math.floor(t*255)}, 255)`,
            interpolateWarm: (t) => `rgb(255, ${Math.floor(t*255)}, 0)`,
            interpolateBlues: (t) => `rgb(0, 0, ${Math.floor(t*255)})`,
            interpolateGreens: (t) => `rgb(0, ${Math.floor(t*255)}, 0)`,
            interpolateReds: (t) => `rgb(${Math.floor(t*255)}, 0, 0)`,
            interpolateGreys: (t) => `rgb(${Math.floor(t*255)}, ${Math.floor(t*255)}, ${Math.floor(t*255)})`,
            min: (arr) => Math.min(...arr),
            max: (arr) => Math.max(...arr),
            select: (selector) => ({
                append: () => ({ attr: () => ({ attr: () => ({}) }) }),
                selectAll: () => ({ data: () => ({ enter: () => ({ append: () => ({ attr: () => ({}) }) }) }) })
            }),
            scaleSequential: () => ({ domain: () => ({ clamp: () => ({}) }) }),
            scaleLinear: () => ({ domain: () => ({ range: () => ({}) }) }),
            axisRight: () => ({ ticks: () => ({}) })
        };

        // Mock vscode API
        receivedMessages = [];
        mockVscode = {
            postMessage: (message) => {
                receivedMessages.push(message);
            }
        };
        
        global.acquireVsCodeApi = () => mockVscode;

        // Mock parseVTK function
        global.parseVTK = (content) => {
            if (!content || content.trim() === '') {
                throw new Error('Invalid VTK content');
            }
            return {
                dimensions: [10, 10, 1],
                pointData: {
                    scalars: {
                        'temperature': new Array(100).fill(0).map((_, i) => 20 + i * 0.1),
                        'velocity': new Array(100).fill(0).map((_, i) => 1 + i * 0.05)
                    },
                    vectors: {}
                }
            };
        };
    });

    beforeEach(function() {
        receivedMessages = [];
        
        // Reset DOM elements
        document.getElementById('current-file').textContent = 'Loading...';
        document.getElementById('prev-file').disabled = false;
        document.getElementById('next-file').disabled = false;
        document.getElementById('scalar-select').innerHTML = '';
        document.getElementById('scalar-select').disabled = true;
    });

    after(function() {
        // Clean up global variables
        delete global.window;
        delete global.document;
        delete global.d3;
        delete global.acquireVsCodeApi;
        delete global.parseVTK;
    });

    it('should load main.js without errors', function() {
        const mainJsPath = path.join(__dirname, '../src/webview/main.js');
        const mainJsCode = fs.readFileSync(mainJsPath, 'utf8');
        
        assert.doesNotThrow(() => {
            eval(mainJsCode);
        });
    });

    describe('Navigation UI Updates', function() {
        let mainJsCode;

        before(function() {
            const mainJsPath = path.join(__dirname, '../src/webview/main.js');
            mainJsCode = fs.readFileSync(mainJsPath, 'utf8');
            eval(mainJsCode);
        });

        it('should update navigation UI with sequence info', function() {
            const mockMessage = {
                data: {
                    type: 'update',
                    text: '# vtk DataFile Version 2.0\\nTest\\nASCII\\nDATASET STRUCTURED_POINTS\\nDIMENSIONS 10 10 1\\nSPACING 1.0 1.0 1.0\\nORIGIN 0.0 0.0 0.0\\nPOINT_DATA 100\\nSCALARS temperature float 1\\nLOOKUP_TABLE default\\n' + new Array(100).fill('1.0').join(' '),
                    currentFile: 'karman_vortex_001000.vtk',
                    hasNext: true,
                    hasPrev: true,
                    sequenceInfo: {
                        currentIndex: 2,
                        totalFiles: 3,
                        sequencePattern: 'karman_vortex_*'
                    }
                }
            };

            // Simulate receiving message from extension
            window.dispatchEvent(new window.MessageEvent('message', mockMessage));

            // Check if UI was updated correctly
            const currentFileSpan = document.getElementById('current-file');
            assert.strictEqual(currentFileSpan.textContent, 'karman_vortex_001000.vtk (2/3)');

            const prevButton = document.getElementById('prev-file');
            const nextButton = document.getElementById('next-file');
            assert.strictEqual(prevButton.disabled, false);
            assert.strictEqual(nextButton.disabled, false);
        });

        it('should disable buttons appropriately for first file', function() {
            const mockMessage = {
                data: {
                    type: 'update',
                    text: '# vtk DataFile Version 2.0\\nTest\\nASCII\\nDATASET STRUCTURED_POINTS\\nDIMENSIONS 10 10 1\\nSPACING 1.0 1.0 1.0\\nORIGIN 0.0 0.0 0.0\\nPOINT_DATA 100\\nSCALARS temperature float 1\\nLOOKUP_TABLE default\\n' + new Array(100).fill('1.0').join(' '),
                    currentFile: 'karman_vortex_000500.vtk',
                    hasNext: true,
                    hasPrev: false,
                    sequenceInfo: {
                        currentIndex: 1,
                        totalFiles: 3,
                        sequencePattern: 'karman_vortex_*'
                    }
                }
            };

            window.dispatchEvent(new window.MessageEvent('message', mockMessage));

            const prevButton = document.getElementById('prev-file');
            const nextButton = document.getElementById('next-file');
            assert.strictEqual(prevButton.disabled, true);
            assert.strictEqual(nextButton.disabled, false);
        });

        it('should disable buttons appropriately for last file', function() {
            const mockMessage = {
                data: {
                    type: 'update',
                    text: '# vtk DataFile Version 2.0\\nTest\\nASCII\\nDATASET STRUCTURED_POINTS\\nDIMENSIONS 10 10 1\\nSPACING 1.0 1.0 1.0\\nORIGIN 0.0 0.0 0.0\\nPOINT_DATA 100\\nSCALARS temperature float 1\\nLOOKUP_TABLE default\\n' + new Array(100).fill('1.0').join(' '),
                    currentFile: 'karman_vortex_001500.vtk',
                    hasNext: false,
                    hasPrev: true,
                    sequenceInfo: {
                        currentIndex: 3,
                        totalFiles: 3,
                        sequencePattern: 'karman_vortex_*'
                    }
                }
            };

            window.dispatchEvent(new window.MessageEvent('message', mockMessage));

            const prevButton = document.getElementById('prev-file');
            const nextButton = document.getElementById('next-file');
            assert.strictEqual(prevButton.disabled, false);
            assert.strictEqual(nextButton.disabled, true);
        });

        it('should handle single file without sequence info', function() {
            const mockMessage = {
                data: {
                    type: 'update',
                    text: '# vtk DataFile Version 2.0\\nTest\\nASCII\\nDATASET STRUCTURED_POINTS\\nDIMENSIONS 10 10 1\\nSPACING 1.0 1.0 1.0\\nORIGIN 0.0 0.0 0.0\\nPOINT_DATA 100\\nSCALARS temperature float 1\\nLOOKUP_TABLE default\\n' + new Array(100).fill('1.0').join(' '),
                    currentFile: 'single.vtk',
                    hasNext: false,
                    hasPrev: false,
                    sequenceInfo: null
                }
            };

            window.dispatchEvent(new window.MessageEvent('message', mockMessage));

            const currentFileSpan = document.getElementById('current-file');
            assert.strictEqual(currentFileSpan.textContent, 'single.vtk');

            const prevButton = document.getElementById('prev-file');
            const nextButton = document.getElementById('next-file');
            assert.strictEqual(prevButton.disabled, true);
            assert.strictEqual(nextButton.disabled, true);
        });
    });

    describe('Navigation Button Events', function() {
        let mainJsCode;

        before(function() {
            const mainJsPath = path.join(__dirname, '../src/webview/main.js');
            mainJsCode = fs.readFileSync(mainJsPath, 'utf8');
            eval(mainJsCode);
        });

        beforeEach(function() {
            receivedMessages = [];
        });

        it('should send navigatePrev message when previous button clicked', function() {
            const prevButton = document.getElementById('prev-file');
            prevButton.click();

            assert.strictEqual(receivedMessages.length, 1);
            assert.strictEqual(receivedMessages[0].type, 'navigatePrev');
        });

        it('should send navigateNext message when next button clicked', function() {
            const nextButton = document.getElementById('next-file');
            nextButton.click();

            assert.strictEqual(receivedMessages.length, 1);
            assert.strictEqual(receivedMessages[0].type, 'navigateNext');
        });

        it('should handle keyboard navigation', function() {
            // First set up a valid file state
            const mockMessage = {
                data: {
                    type: 'update',
                    text: '# vtk DataFile Version 2.0\\nTest\\nASCII\\nDATASET STRUCTURED_POINTS\\nDIMENSIONS 10 10 1\\nSPACING 1.0 1.0 1.0\\nORIGIN 0.0 0.0 0.0\\nPOINT_DATA 100\\nSCALARS temperature float 1\\nLOOKUP_TABLE default\\n' + new Array(100).fill('1.0').join(' '),
                    currentFile: 'karman_vortex_001000.vtk',
                    hasNext: true,
                    hasPrev: true
                }
            };
            window.dispatchEvent(new window.MessageEvent('message', mockMessage));

            receivedMessages = [];

            // Test left arrow key
            const leftKeyEvent = new window.KeyboardEvent('keydown', { key: 'ArrowLeft' });
            document.dispatchEvent(leftKeyEvent);

            assert.strictEqual(receivedMessages.length, 1);
            assert.strictEqual(receivedMessages[0].type, 'navigatePrev');

            receivedMessages = [];

            // Test right arrow key
            const rightKeyEvent = new window.KeyboardEvent('keydown', { key: 'ArrowRight' });
            document.dispatchEvent(rightKeyEvent);

            assert.strictEqual(receivedMessages.length, 1);
            assert.strictEqual(receivedMessages[0].type, 'navigateNext');
        });
    });
});
