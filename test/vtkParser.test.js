const assert = require('assert');
const fs = require('fs');
const path = require('path');

// Load the VTK parser function
const vtkParserCode = fs.readFileSync(path.join(__dirname, '../src/webview/vtkParser.js'), 'utf8');
eval(vtkParserCode);

describe('VTK Parser Tests', function() {
    it('should parse valid VTK file correctly', function() {
        const validVtkPath = path.join(__dirname, 'fixtures/sample.vtk');
        const content = fs.readFileSync(validVtkPath, 'utf8');
        
        const result = parseVTK(content);
        
        assert.strictEqual(Array.isArray(result.dimensions), true);
        assert.strictEqual(result.dimensions.length, 3);
        assert.strictEqual(result.dimensions[0], 10);
        assert.strictEqual(result.dimensions[1], 10);
        assert.strictEqual(result.dimensions[2], 1);
        
        assert.strictEqual(typeof result.pointData, 'object');
        assert.strictEqual(typeof result.pointData.scalars, 'object');
        assert.strictEqual(Array.isArray(result.pointData.scalars.temperature), true);
        assert.strictEqual(Array.isArray(result.pointData.scalars.pressure), true);
        assert.strictEqual(result.pointData.scalars.temperature.length, 100);
        assert.strictEqual(result.pointData.scalars.pressure.length, 100);
    });

    it('should throw error for invalid VTK file', function() {
        const invalidVtkPath = path.join(__dirname, 'fixtures/invalid.vtk');
        const content = fs.readFileSync(invalidVtkPath, 'utf8');
        
        assert.throws(() => {
            parseVTK(content);
        }, /Invalid or unsupported VTK format/);
    });

    it('should handle empty content', function() {
        assert.throws(() => {
            parseVTK('');
        }, /Invalid or unsupported VTK format/);
    });

    it('should extract scalar data correctly', function() {
        const validVtkPath = path.join(__dirname, 'fixtures/sample.vtk');
        const content = fs.readFileSync(validVtkPath, 'utf8');
        
        const result = parseVTK(content);
        
        // Check first temperature value
        assert.strictEqual(result.pointData.scalars.temperature[0], 23.5);
        // Check first pressure value  
        assert.strictEqual(result.pointData.scalars.pressure[0], 101.3);
        
        // Check that all values are numbers
        result.pointData.scalars.temperature.forEach(value => {
            assert.strictEqual(typeof value, 'number');
            assert.strictEqual(isNaN(value), false);
        });
        
        result.pointData.scalars.pressure.forEach(value => {
            assert.strictEqual(typeof value, 'number');
            assert.strictEqual(isNaN(value), false);
        });
    });
});