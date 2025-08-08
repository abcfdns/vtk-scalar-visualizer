const vscode = require('vscode');
const VtkVisualizerProvider = require('./vtkVisualizerProvider');

function activate(context) {
    const provider = new VtkVisualizerProvider(context.extensionUri);
    
    context.subscriptions.push(
        vscode.window.registerCustomEditorProvider(
            VtkVisualizerProvider.viewType,
            provider,
            {
                webviewOptions: {
                    retainContextWhenHidden: true,
                }
            }
        )
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('vtkVisualizer.openWith', (uri) => {
            vscode.commands.executeCommand('vscode.openWith', uri, VtkVisualizerProvider.viewType);
        })
    );
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
};