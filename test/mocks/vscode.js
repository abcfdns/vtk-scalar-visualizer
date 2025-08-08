// Mock vscode module for testing
const path = require('path');

const mockVscode = {
    Uri: {
        file: (filePath) => ({
            fsPath: filePath,
            toString: () => `file://${filePath}`
        }),
        joinPath: (base, ...segments) => ({
            fsPath: path.join(base.fsPath || base, ...segments)
        })
    },
    window: {
        showErrorMessage: (message) => console.log('Error:', message),
        showInformationMessage: (message) => console.log('Info:', message)
    },
    commands: {
        executeCommand: (command, ...args) => {
            console.log('Command executed:', command, args);
            return Promise.resolve();
        }
    },
    workspace: {
        onDidChangeTextDocument: () => ({ dispose: () => {} })
    }
};

module.exports = mockVscode;
