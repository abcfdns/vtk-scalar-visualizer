const assert = require('assert');
const path = require('path');
const fs = require('fs');
const os = require('os');

describe('Integration Tests - Navigation Feature', function() {
    let tempDir;
    let testFiles;

    before(function() {
        // Create temporary directory for integration tests
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vtk-integration-'));
        
        // Create test VTK files for integration testing
        const vtkTemplate = (title, values) => `# vtk DataFile Version 2.0
${title}
ASCII
DATASET STRUCTURED_POINTS
DIMENSIONS 5 5 1
SPACING 1.0 1.0 1.0
ORIGIN 0.0 0.0 0.0
POINT_DATA 25
SCALARS temperature float 1
LOOKUP_TABLE default
${values.join(' ')}`;

        // Create test files with different patterns
        testFiles = {
            // Karman vortex series (sparse numbering)
            'karman_vortex_000500.vtk': vtkTemplate('Karman Vortex 500', 
                new Array(25).fill(0).map((_, i) => (500 + i * 0.1).toFixed(1))),
            'karman_vortex_001000.vtk': vtkTemplate('Karman Vortex 1000', 
                new Array(25).fill(0).map((_, i) => (1000 + i * 0.1).toFixed(1))),
            'karman_vortex_001500.vtk': vtkTemplate('Karman Vortex 1500', 
                new Array(25).fill(0).map((_, i) => (1500 + i * 0.1).toFixed(1))),
            
            // Data series (dense numbering with gaps)
            'data_001.vtk': vtkTemplate('Data 1', 
                new Array(25).fill(0).map((_, i) => (1 + i * 0.01).toFixed(2))),
            'data_002.vtk': vtkTemplate('Data 2', 
                new Array(25).fill(0).map((_, i) => (2 + i * 0.01).toFixed(2))),
            'data_005.vtk': vtkTemplate('Data 5', 
                new Array(25).fill(0).map((_, i) => (5 + i * 0.01).toFixed(2))),
            'data_010.vtk': vtkTemplate('Data 10', 
                new Array(25).fill(0).map((_, i) => (10 + i * 0.01).toFixed(2))),
            
            // Single files (no sequence)
            'standalone.vtk': vtkTemplate('Standalone', 
                new Array(25).fill(0).map((_, i) => (100 + i).toFixed(0))),
            'another_single.vtk': vtkTemplate('Another Single', 
                new Array(25).fill(0).map((_, i) => (200 + i).toFixed(0)))
        };

        // Write all test files
        Object.entries(testFiles).forEach(([filename, content]) => {
            fs.writeFileSync(path.join(tempDir, filename), content);
        });
    });

    after(function() {
        // Clean up
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });

    describe('End-to-End Navigation Scenarios', function() {
        const VtkVisualizerProvider = require('../src/vtkVisualizerProvider');
        
        // Mock vscode for testing
        const mockVscode = {
            Uri: {
                file: (path) => ({ fsPath: path, toString: () => `file://${path}` }),
                joinPath: (base, ...segments) => ({ fsPath: path.join(base.fsPath || base, ...segments) })
            }
        };
        
        let provider;

        before(function() {
            global.vscode = mockVscode;
            provider = new VtkVisualizerProvider(mockVscode.Uri.file('/mock/extension'));
        });

        after(function() {
            delete global.vscode;
        });

        it('should navigate through sparse Karman vortex sequence', function() {
            // Start with middle file
            let currentUri = mockVscode.Uri.file(path.join(tempDir, 'karman_vortex_001000.vtk'));
            
            // Check current file info
            let fileInfo = provider.getFileInfo(currentUri);
            assert.strictEqual(fileInfo.currentFile, 'karman_vortex_001000.vtk');
            assert.strictEqual(fileInfo.hasPrev, true);
            assert.strictEqual(fileInfo.hasNext, true);
            
            // Get sequence info
            let sequenceInfo = provider.getSequenceInfo(currentUri);
            assert.strictEqual(sequenceInfo.currentIndex, 2);
            assert.strictEqual(sequenceInfo.totalFiles, 3);
            
            // Navigate to previous
            let prevUri = provider.getAdjacentFile(currentUri, false);
            assert.notStrictEqual(prevUri, null);
            assert.strictEqual(path.basename(prevUri.fsPath), 'karman_vortex_000500.vtk');
            
            // Check previous file info
            fileInfo = provider.getFileInfo(prevUri);
            assert.strictEqual(fileInfo.hasPrev, false);
            assert.strictEqual(fileInfo.hasNext, true);
            
            // Navigate to next from original position
            let nextUri = provider.getAdjacentFile(currentUri, true);
            assert.notStrictEqual(nextUri, null);
            assert.strictEqual(path.basename(nextUri.fsPath), 'karman_vortex_001500.vtk');
            
            // Check next file info
            fileInfo = provider.getFileInfo(nextUri);
            assert.strictEqual(fileInfo.hasPrev, true);
            assert.strictEqual(fileInfo.hasNext, false);
        });

        it('should navigate through dense data sequence with gaps', function() {
            // Start with data_002.vtk
            let currentUri = mockVscode.Uri.file(path.join(tempDir, 'data_002.vtk'));
            
            let fileInfo = provider.getFileInfo(currentUri);
            assert.strictEqual(fileInfo.currentFile, 'data_002.vtk');
            assert.strictEqual(fileInfo.hasPrev, true);
            assert.strictEqual(fileInfo.hasNext, true);
            
            // Navigate to previous (should be data_001.vtk)
            let prevUri = provider.getAdjacentFile(currentUri, false);
            assert.notStrictEqual(prevUri, null);
            assert.strictEqual(path.basename(prevUri.fsPath), 'data_001.vtk');
            
            // Navigate to next (should skip to data_005.vtk, not data_003.vtk)
            let nextUri = provider.getAdjacentFile(currentUri, true);
            assert.notStrictEqual(nextUri, null);
            assert.strictEqual(path.basename(nextUri.fsPath), 'data_005.vtk');
        });

        it('should handle standalone files correctly', function() {
            let standaloneUri = mockVscode.Uri.file(path.join(tempDir, 'standalone.vtk'));
            
            let fileInfo = provider.getFileInfo(standaloneUri);
            assert.strictEqual(fileInfo.currentFile, 'standalone.vtk');
            assert.strictEqual(fileInfo.hasPrev, false);
            assert.strictEqual(fileInfo.hasNext, false);
            
            // Try to navigate (should return null)
            let prevUri = provider.getAdjacentFile(standaloneUri, false);
            let nextUri = provider.getAdjacentFile(standaloneUri, true);
            assert.strictEqual(prevUri, null);
            assert.strictEqual(nextUri, null);
            
            // Sequence info should show no sequence
            let sequenceInfo = provider.getSequenceInfo(standaloneUri);
            assert.strictEqual(sequenceInfo.currentIndex, -1);
            assert.strictEqual(sequenceInfo.totalFiles, 0);
        });

        it('should handle complete navigation cycle', function() {
            // Complete forward navigation through Karman vortex series
            let files = ['karman_vortex_000500.vtk', 'karman_vortex_001000.vtk', 'karman_vortex_001500.vtk'];
            let currentUri = mockVscode.Uri.file(path.join(tempDir, files[0]));
            
            for (let i = 0; i < files.length - 1; i++) {
                let fileInfo = provider.getFileInfo(currentUri);
                assert.strictEqual(fileInfo.currentFile, files[i]);
                assert.strictEqual(fileInfo.hasPrev, i > 0);
                assert.strictEqual(fileInfo.hasNext, i < files.length - 1);
                
                // Move to next
                if (i < files.length - 1) {
                    currentUri = provider.getAdjacentFile(currentUri, true);
                    assert.notStrictEqual(currentUri, null);
                    assert.strictEqual(path.basename(currentUri.fsPath), files[i + 1]);
                }
            }
            
            // Complete backward navigation
            for (let i = files.length - 1; i > 0; i--) {
                let fileInfo = provider.getFileInfo(currentUri);
                assert.strictEqual(fileInfo.currentFile, files[i]);
                assert.strictEqual(fileInfo.hasPrev, i > 0);
                assert.strictEqual(fileInfo.hasNext, i < files.length - 1);
                
                // Move to previous
                if (i > 0) {
                    currentUri = provider.getAdjacentFile(currentUri, false);
                    assert.notStrictEqual(currentUri, null);
                    assert.strictEqual(path.basename(currentUri.fsPath), files[i - 1]);
                }
            }
        });
    });

    describe('Error Handling and Edge Cases', function() {
        const VtkVisualizerProvider = require('../src/vtkVisualizerProvider');
        
        const mockVscode = {
            Uri: {
                file: (path) => ({ fsPath: path, toString: () => `file://${path}` }),
                joinPath: (base, ...segments) => ({ fsPath: path.join(base.fsPath || base, ...segments) })
            }
        };
        
        let provider;

        before(function() {
            global.vscode = mockVscode;
            provider = new VtkVisualizerProvider(mockVscode.Uri.file('/mock/extension'));
        });

        after(function() {
            delete global.vscode;
        });

        it('should handle non-existent directory gracefully', function() {
            let nonExistentUri = mockVscode.Uri.file('/non/existent/path/test_001.vtk');
            
            let fileInfo = provider.getFileInfo(nonExistentUri);
            assert.strictEqual(fileInfo.hasNext, false);
            assert.strictEqual(fileInfo.hasPrev, false);
            
            let adjacentFile = provider.getAdjacentFile(nonExistentUri, true);
            assert.strictEqual(adjacentFile, null);
        });

        it('should handle files with invalid name patterns', function() {
            let invalidUri = mockVscode.Uri.file(path.join(tempDir, 'invalid_name.vtk'));
            
            let fileInfo = provider.getFileInfo(invalidUri);
            assert.strictEqual(fileInfo.currentFile, 'invalid_name.vtk');
            assert.strictEqual(fileInfo.hasNext, false);
            assert.strictEqual(fileInfo.hasPrev, false);
        });

        it('should handle special characters in filename prefixes', function() {
            // Create test file with special characters
            const specialFile = 'test-data.with_special+chars_001.vtk';
            const specialContent = testFiles['data_001.vtk'];
            fs.writeFileSync(path.join(tempDir, specialFile), specialContent);
            
            let specialUri = mockVscode.Uri.file(path.join(tempDir, specialFile));
            let fileInfo = provider.getFileInfo(specialUri);
            
            // Should handle gracefully even if no other files match the pattern
            assert.strictEqual(fileInfo.currentFile, specialFile);
            assert.strictEqual(fileInfo.hasNext, false);
            assert.strictEqual(fileInfo.hasPrev, false);
        });
    });
});
