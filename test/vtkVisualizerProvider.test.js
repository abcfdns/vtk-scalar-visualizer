const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const vscode = require('vscode');

// Mock vscode module for testing
const mockVscode = {
    Uri: {
        file: (path) => ({ fsPath: path, toString: () => `file://${path}` }),
        joinPath: (base, ...segments) => ({ fsPath: path.join(base.fsPath || base, ...segments) })
    }
};

// Replace vscode module temporarily
const originalVscode = global.vscode;
global.vscode = mockVscode;

const VtkVisualizerProvider = require('../src/vtkVisualizerProvider');

describe('VtkVisualizerProvider Navigation Tests', function() {
    let provider;
    let tempDir;
    let testFiles;

    before(function() {
        // Create temporary directory for test files
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vtk-test-'));
        provider = new VtkVisualizerProvider(mockVscode.Uri.file('/mock/extension'));
        
        // Create test VTK files with different patterns
        testFiles = {
            sequence1: [
                'karman_vortex_000500.vtk',
                'karman_vortex_001000.vtk', 
                'karman_vortex_001500.vtk'
            ],
            sequence2: [
                'data_001.vtk',
                'data_002.vtk',
                'data_005.vtk',
                'data_010.vtk'
            ],
            nonSequence: [
                'single.vtk',
                'another_file.vtk'
            ]
        };

        // Create actual test files
        const vtkContent = `# vtk DataFile Version 2.0
Test Data
ASCII
DATASET STRUCTURED_POINTS
DIMENSIONS 5 5 1
SPACING 1.0 1.0 1.0
ORIGIN 0.0 0.0 0.0
POINT_DATA 25
SCALARS test float 1
LOOKUP_TABLE default
1.0 2.0 3.0 4.0 5.0
1.1 2.1 3.1 4.1 5.1
1.2 2.2 3.2 4.2 5.2
1.3 2.3 3.3 4.3 5.3
1.4 2.4 3.4 4.4 5.4`;

        // Create all test files
        Object.values(testFiles).flat().forEach(filename => {
            fs.writeFileSync(path.join(tempDir, filename), vtkContent);
        });
    });

    after(function() {
        // Clean up temporary files
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
        // Restore original vscode module
        global.vscode = originalVscode;
    });

    describe('getSequenceFiles', function() {
        it('should find sequence files with karman_vortex pattern', function() {
            const sequenceFiles = provider.getSequenceFiles(tempDir, 'karman_vortex_');
            
            assert.strictEqual(sequenceFiles.length, 3);
            assert.strictEqual(sequenceFiles[0].name, 'karman_vortex_000500.vtk');
            assert.strictEqual(sequenceFiles[0].number, 500);
            assert.strictEqual(sequenceFiles[1].name, 'karman_vortex_001000.vtk');
            assert.strictEqual(sequenceFiles[1].number, 1000);
            assert.strictEqual(sequenceFiles[2].name, 'karman_vortex_001500.vtk');
            assert.strictEqual(sequenceFiles[2].number, 1500);
        });

        it('should find sequence files with data pattern', function() {
            const sequenceFiles = provider.getSequenceFiles(tempDir, 'data_');
            
            assert.strictEqual(sequenceFiles.length, 4);
            assert.strictEqual(sequenceFiles[0].number, 1);
            assert.strictEqual(sequenceFiles[1].number, 2);
            assert.strictEqual(sequenceFiles[2].number, 5);
            assert.strictEqual(sequenceFiles[3].number, 10);
        });

        it('should return empty array for non-existent pattern', function() {
            const sequenceFiles = provider.getSequenceFiles(tempDir, 'nonexistent_');
            assert.strictEqual(sequenceFiles.length, 0);
        });

        it('should handle directory read errors gracefully', function() {
            const sequenceFiles = provider.getSequenceFiles('/nonexistent/path', 'test_');
            assert.strictEqual(sequenceFiles.length, 0);
        });
    });

    describe('getFileInfo', function() {
        it('should return correct info for middle file in sequence', function() {
            const uri = mockVscode.Uri.file(path.join(tempDir, 'karman_vortex_001000.vtk'));
            const fileInfo = provider.getFileInfo(uri);
            
            assert.strictEqual(fileInfo.currentFile, 'karman_vortex_001000.vtk');
            assert.strictEqual(fileInfo.hasNext, true);
            assert.strictEqual(fileInfo.hasPrev, true);
        });

        it('should return correct info for first file in sequence', function() {
            const uri = mockVscode.Uri.file(path.join(tempDir, 'karman_vortex_000500.vtk'));
            const fileInfo = provider.getFileInfo(uri);
            
            assert.strictEqual(fileInfo.currentFile, 'karman_vortex_000500.vtk');
            assert.strictEqual(fileInfo.hasNext, true);
            assert.strictEqual(fileInfo.hasPrev, false);
        });

        it('should return correct info for last file in sequence', function() {
            const uri = mockVscode.Uri.file(path.join(tempDir, 'karman_vortex_001500.vtk'));
            const fileInfo = provider.getFileInfo(uri);
            
            assert.strictEqual(fileInfo.currentFile, 'karman_vortex_001500.vtk');
            assert.strictEqual(fileInfo.hasNext, false);
            assert.strictEqual(fileInfo.hasPrev, true);
        });

        it('should return false for navigation when file has no sequence', function() {
            const uri = mockVscode.Uri.file(path.join(tempDir, 'single.vtk'));
            const fileInfo = provider.getFileInfo(uri);
            
            assert.strictEqual(fileInfo.currentFile, 'single.vtk');
            assert.strictEqual(fileInfo.hasNext, false);
            assert.strictEqual(fileInfo.hasPrev, false);
        });

        it('should handle files with no number pattern', function() {
            const uri = mockVscode.Uri.file(path.join(tempDir, 'another_file.vtk'));
            const fileInfo = provider.getFileInfo(uri);
            
            assert.strictEqual(fileInfo.currentFile, 'another_file.vtk');
            assert.strictEqual(fileInfo.hasNext, false);
            assert.strictEqual(fileInfo.hasPrev, false);
        });
    });

    describe('getAdjacentFile', function() {
        it('should return next file in sequence', function() {
            const uri = mockVscode.Uri.file(path.join(tempDir, 'karman_vortex_000500.vtk'));
            const nextUri = provider.getAdjacentFile(uri, true);
            
            assert.notStrictEqual(nextUri, null);
            assert.strictEqual(path.basename(nextUri.fsPath), 'karman_vortex_001000.vtk');
        });

        it('should return previous file in sequence', function() {
            const uri = mockVscode.Uri.file(path.join(tempDir, 'karman_vortex_001000.vtk'));
            const prevUri = provider.getAdjacentFile(uri, false);
            
            assert.notStrictEqual(prevUri, null);
            assert.strictEqual(path.basename(prevUri.fsPath), 'karman_vortex_000500.vtk');
        });

        it('should return null when no next file exists', function() {
            const uri = mockVscode.Uri.file(path.join(tempDir, 'karman_vortex_001500.vtk'));
            const nextUri = provider.getAdjacentFile(uri, true);
            
            assert.strictEqual(nextUri, null);
        });

        it('should return null when no previous file exists', function() {
            const uri = mockVscode.Uri.file(path.join(tempDir, 'karman_vortex_000500.vtk'));
            const prevUri = provider.getAdjacentFile(uri, false);
            
            assert.strictEqual(prevUri, null);
        });

        it('should handle sparse sequences correctly', function() {
            const uri = mockVscode.Uri.file(path.join(tempDir, 'data_002.vtk'));
            
            // Next should be data_005.vtk (skipping 003, 004)
            const nextUri = provider.getAdjacentFile(uri, true);
            assert.notStrictEqual(nextUri, null);
            assert.strictEqual(path.basename(nextUri.fsPath), 'data_005.vtk');
            
            // Previous should be data_001.vtk
            const prevUri = provider.getAdjacentFile(uri, false);
            assert.notStrictEqual(prevUri, null);
            assert.strictEqual(path.basename(prevUri.fsPath), 'data_001.vtk');
        });
    });

    describe('getSequenceInfo', function() {
        it('should return correct sequence position info', function() {
            const uri = mockVscode.Uri.file(path.join(tempDir, 'karman_vortex_001000.vtk'));
            const sequenceInfo = provider.getSequenceInfo(uri);
            
            assert.strictEqual(sequenceInfo.currentIndex, 2); // 1-based index
            assert.strictEqual(sequenceInfo.totalFiles, 3);
            assert.strictEqual(sequenceInfo.sequencePattern, 'karman_vortex_*');
        });

        it('should handle single file sequence', function() {
            const uri = mockVscode.Uri.file(path.join(tempDir, 'single.vtk'));
            const sequenceInfo = provider.getSequenceInfo(uri);
            
            assert.strictEqual(sequenceInfo.currentIndex, -1);
            assert.strictEqual(sequenceInfo.totalFiles, 0);
            assert.strictEqual(sequenceInfo.sequencePattern, '');
        });

        it('should handle sparse sequence correctly', function() {
            const uri = mockVscode.Uri.file(path.join(tempDir, 'data_005.vtk'));
            const sequenceInfo = provider.getSequenceInfo(uri);
            
            assert.strictEqual(sequenceInfo.currentIndex, 3); // 3rd in sorted sequence
            assert.strictEqual(sequenceInfo.totalFiles, 4);
            assert.strictEqual(sequenceInfo.sequencePattern, 'data_*');
        });
    });

    describe('escapeRegExp', function() {
        it('should escape special regex characters', function() {
            const testString = 'test.+*?^${}()|[]\\';
            const escaped = provider.escapeRegExp(testString);
            
            // Should not throw when used in RegExp
            assert.doesNotThrow(() => {
                new RegExp(escaped);
            });
            
            // Should match the original string literally
            const regex = new RegExp('^' + escaped + '$');
            assert.strictEqual(regex.test(testString), true);
        });
    });
});
