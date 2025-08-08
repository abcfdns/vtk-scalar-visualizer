const assert = require('assert');
const vscode = require('vscode');
const path = require('path');

suite('Extension Test Suite', () => {
    vscode.window.showInformationMessage('Start all tests.');

    test('Extension should be present', () => {
        assert.ok(vscode.extensions.getExtension('your-publisher.vtk-scalar-visualizer'));
    });

    test('Extension should activate', async () => {
        const extension = vscode.extensions.getExtension('your-publisher.vtk-scalar-visualizer');
        if (extension) {
            await extension.activate();
            assert.strictEqual(extension.isActive, true);
        }
    });

    test('Commands should be registered', async () => {
        const commands = await vscode.commands.getCommands(true);
        assert.ok(commands.includes('vtkVisualizer.openWith'));
    });
});