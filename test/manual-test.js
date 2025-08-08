const fs = require('fs');
const path = require('path');

// Mock vscode before requiring the provider
const mockVscode = require('./mocks/vscode');
global.vscode = mockVscode;

console.log('🧪 Testing VTK Visualizer Navigation Features...\n');

// Load the provider
const VtkVisualizerProvider = require('../src/vtkVisualizerProvider');
const provider = new VtkVisualizerProvider(mockVscode.Uri.file('/mock/extension'));

// Test 1: Test sequence file detection
console.log('📁 Test 1: Sequence File Detection');
try {
    const sequenceFiles = provider.getSequenceFiles(path.join(__dirname, 'fixtures'), 'karman_vortex_');
    console.log('✅ Found sequence files:', sequenceFiles.map(f => `${f.name} (${f.number})`));
    console.log(`   Total files in sequence: ${sequenceFiles.length}`);
} catch (error) {
    console.log('❌ Error in sequence detection:', error.message);
}

// Test 2: Test file info for middle file
console.log('\n📄 Test 2: File Info for Middle File');
try {
    const testUri = mockVscode.Uri.file(path.join(__dirname, 'fixtures', 'karman_vortex_001000.vtk'));
    const fileInfo = provider.getFileInfo(testUri);
    console.log('✅ File info retrieved:');
    console.log(`   Current file: ${fileInfo.currentFile}`);
    console.log(`   Has previous: ${fileInfo.hasPrev}`);
    console.log(`   Has next: ${fileInfo.hasNext}`);
} catch (error) {
    console.log('❌ Error getting file info:', error.message);
}

// Test 3: Test sequence info
console.log('\n📊 Test 3: Sequence Information');
try {
    const testUri = mockVscode.Uri.file(path.join(__dirname, 'fixtures', 'karman_vortex_001000.vtk'));
    const sequenceInfo = provider.getSequenceInfo(testUri);
    console.log('✅ Sequence info retrieved:');
    console.log(`   Current position: ${sequenceInfo.currentIndex}/${sequenceInfo.totalFiles}`);
    console.log(`   Pattern: ${sequenceInfo.sequencePattern}`);
} catch (error) {
    console.log('❌ Error getting sequence info:', error.message);
}

// Test 4: Test navigation to next file
console.log('\n➡️  Test 4: Navigate to Next File');
try {
    const currentUri = mockVscode.Uri.file(path.join(__dirname, 'fixtures', 'karman_vortex_001000.vtk'));
    const nextUri = provider.getAdjacentFile(currentUri, true);
    if (nextUri) {
        console.log('✅ Next file found:', path.basename(nextUri.fsPath));
    } else {
        console.log('❌ No next file found');
    }
} catch (error) {
    console.log('❌ Error navigating to next file:', error.message);
}

// Test 5: Test navigation to previous file
console.log('\n⬅️  Test 5: Navigate to Previous File');
try {
    const currentUri = mockVscode.Uri.file(path.join(__dirname, 'fixtures', 'karman_vortex_001000.vtk'));
    const prevUri = provider.getAdjacentFile(currentUri, false);
    if (prevUri) {
        console.log('✅ Previous file found:', path.basename(prevUri.fsPath));
    } else {
        console.log('❌ No previous file found');
    }
} catch (error) {
    console.log('❌ Error navigating to previous file:', error.message);
}

// Test 6: Test edge cases - first file
console.log('\n🔄 Test 6: Edge Case - First File');
try {
    const firstUri = mockVscode.Uri.file(path.join(__dirname, 'fixtures', 'karman_vortex_000500.vtk'));
    const fileInfo = provider.getFileInfo(firstUri);
    console.log('✅ First file info:');
    console.log(`   Has previous: ${fileInfo.hasPrev} (should be false)`);
    console.log(`   Has next: ${fileInfo.hasNext} (should be true)`);
} catch (error) {
    console.log('❌ Error testing first file:', error.message);
}

// Test 7: Test edge cases - last file
console.log('\n🔄 Test 7: Edge Case - Last File');
try {
    const lastUri = mockVscode.Uri.file(path.join(__dirname, 'fixtures', 'karman_vortex_001500.vtk'));
    const fileInfo = provider.getFileInfo(lastUri);
    console.log('✅ Last file info:');
    console.log(`   Has previous: ${fileInfo.hasPrev} (should be true)`);
    console.log(`   Has next: ${fileInfo.hasNext} (should be false)`);
} catch (error) {
    console.log('❌ Error testing last file:', error.message);
}

// Test 8: Test non-sequence file
console.log('\n🚫 Test 8: Non-Sequence File');
try {
    const nonSeqUri = mockVscode.Uri.file(path.join(__dirname, 'fixtures', 'sample.vtk'));
    const fileInfo = provider.getFileInfo(nonSeqUri);
    console.log('✅ Non-sequence file info:');
    console.log(`   Has previous: ${fileInfo.hasPrev} (should be false)`);
    console.log(`   Has next: ${fileInfo.hasNext} (should be false)`);
} catch (error) {
    console.log('❌ Error testing non-sequence file:', error.message);
}

console.log('\n🎉 Navigation Tests Completed!');
