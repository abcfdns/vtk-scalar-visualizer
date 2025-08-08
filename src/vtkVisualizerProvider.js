const vscode = require('vscode');
const path = require('path');
const fs = require('fs');

class VtkVisualizerProvider {
    static viewType = 'vtkVisualizer.editor';

    constructor(extensionUri) {
        this.extensionUri = extensionUri;
    }

    async resolveCustomTextEditor(document, webviewPanel, token) {
        webviewPanel.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.joinPath(this.extensionUri, 'src', 'webview'),
                vscode.Uri.joinPath(this.extensionUri, 'node_modules', 'd3', 'dist')
            ]
        };

        webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview, document);

        // Set initial title
        const initialFileName = path.basename(document.uri.fsPath);
        webviewPanel.title = `VTK Visualizer - ${initialFileName}`;

        // Keep reference to current document for navigation
        let currentDocument = document;

        // Send initial file info
        const updateWebview = () => {
            // Update title with current file name
            const currentFileName = path.basename(currentDocument.uri.fsPath);
            webviewPanel.title = `VTK Visualizer - ${currentFileName}`;
            
            const fileInfo = this.getFileInfo(currentDocument.uri);
            const sequenceInfo = this.getSequenceInfo(currentDocument.uri);
            webviewPanel.webview.postMessage({
                type: 'update',
                text: currentDocument.getText(),
                currentFile: fileInfo.currentFile,
                hasNext: fileInfo.hasNext,
                hasPrev: fileInfo.hasPrev,
                sequenceInfo: sequenceInfo // Add sequence position info
            });
        };

        const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(e => {
            if (e.document.uri.toString() === currentDocument.uri.toString()) {
                updateWebview();
            }
        });

        webviewPanel.onDidDispose(() => {
            changeDocumentSubscription.dispose();
        });

        webviewPanel.webview.onDidReceiveMessage(async e => {
            switch (e.type) {
                case 'error':
                    vscode.window.showErrorMessage(e.message);
                    break;
                case 'info':
                    vscode.window.showInformationMessage(e.message);
                    break;
                case 'navigatePrev':
                case 'navigateNext':
                    try {
                        const newUri = this.getAdjacentFile(currentDocument.uri, e.type === 'navigateNext');
                        if (newUri) {
                            currentDocument = await this.loadNewFile(newUri, webviewPanel, currentDocument);
                        } else {
                            const direction = e.type === 'navigateNext' ? 'next' : 'previous';
                            vscode.window.showInformationMessage(`No ${direction} file found.`);
                        }
                    } catch (error) {
                        vscode.window.showErrorMessage(`Error navigating to file: ${error.message}`);
                    }
                    break;
            }
        });

        updateWebview();
    }

    async loadNewFile(newUri, webviewPanel, currentDocument) {
        try {
            // Read new file content from filesystem
            const newContent = fs.readFileSync(newUri.fsPath, 'utf8');
            
            // Create a new document-like object
            const newDocument = {
                uri: newUri,
                getText: () => newContent,
                fileName: path.basename(newUri.fsPath),
                isUntitled: false,
                languageId: 'vtk',
                version: 1,
                isDirty: false,
                isClosed: false
            };
            
            // Update webview panel title
            const fileName = path.basename(newUri.fsPath);
            webviewPanel.title = `VTK Visualizer - ${fileName}`;
            
            // Get updated file info for new file
            const fileInfo = this.getFileInfo(newUri);
            const sequenceInfo = this.getSequenceInfo(newUri);
            
            // Send updated content to webview
            webviewPanel.webview.postMessage({
                type: 'update',
                text: newContent,
                currentFile: fileInfo.currentFile,
                hasNext: fileInfo.hasNext,
                hasPrev: fileInfo.hasPrev,
                sequenceInfo: sequenceInfo
            });
            
            vscode.window.showInformationMessage(`Navigated to ${fileName}`);
            
            return newDocument;
            
        } catch (error) {
            vscode.window.showErrorMessage(`Error loading file: ${error.message}`);
            return currentDocument; // Return original document on error
        }
    }

    getFileInfo(uri) {
        const filePath = uri.fsPath;
        const fileName = path.basename(filePath);
        const dirPath = path.dirname(filePath);
        
        // Extract pattern from filename (e.g., "karman_vortex_000500.vtk" -> "karman_vortex_")
        const match = fileName.match(/^(.+?)(\d+)\.vtk$/i);
        if (!match) {
            return { currentFile: fileName, hasNext: false, hasPrev: false };
        }

        const prefix = match[1]; // Everything before the number
        const currentNumber = parseInt(match[2], 10);
        
        // Get sorted list of all files with the same pattern
        const sequenceFiles = this.getSequenceFiles(dirPath, prefix);
        const currentIndex = sequenceFiles.findIndex(file => file.number === currentNumber);
        
        if (currentIndex === -1) {
            return { currentFile: fileName, hasNext: false, hasPrev: false };
        }
        
        const hasPrev = currentIndex > 0;
        const hasNext = currentIndex < sequenceFiles.length - 1;
        
        return { currentFile: fileName, hasNext, hasPrev };
    }

    getSequenceFiles(dirPath, prefix) {
        try {
            const files = fs.readdirSync(dirPath);
            const pattern = new RegExp(`^${this.escapeRegExp(prefix)}(\\d+)\\.vtk$`, 'i');
            
            const sequenceFiles = files
                .filter(file => pattern.test(file))
                .map(file => {
                    const match = file.match(pattern);
                    return {
                        name: file,
                        number: parseInt(match[1], 10),
                        fullPath: path.join(dirPath, file)
                    };
                })
                .sort((a, b) => a.number - b.number);
            
            return sequenceFiles;
        } catch (error) {
            console.error('Error reading directory:', error);
            return [];
        }
    }

    escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    getSequenceInfo(uri) {
        const filePath = uri.fsPath;
        const fileName = path.basename(filePath);
        const dirPath = path.dirname(filePath);
        
        const match = fileName.match(/^(.+?)(\d+)\.vtk$/i);
        if (!match) {
            return { currentIndex: -1, totalFiles: 0, sequencePattern: '' };
        }

        const prefix = match[1];
        const currentNumber = parseInt(match[2], 10);
        const sequenceFiles = this.getSequenceFiles(dirPath, prefix);
        const currentIndex = sequenceFiles.findIndex(file => file.number === currentNumber);
        
        return {
            currentIndex: currentIndex + 1, // 1-based index for display
            totalFiles: sequenceFiles.length,
            sequencePattern: prefix + '*'
        };
    }

    getAdjacentFile(uri, isNext) {
        const filePath = uri.fsPath;
        const fileName = path.basename(filePath);
        const dirPath = path.dirname(filePath);
        
        // Extract pattern from filename
        const match = fileName.match(/^(.+?)(\d+)\.vtk$/i);
        if (!match) return null;

        const prefix = match[1];
        const currentNumber = parseInt(match[2], 10);
        
        // Get sorted list of all files with the same pattern
        const sequenceFiles = this.getSequenceFiles(dirPath, prefix);
        const currentIndex = sequenceFiles.findIndex(file => file.number === currentNumber);
        
        if (currentIndex === -1) return null;
        
        const targetIndex = isNext ? currentIndex + 1 : currentIndex - 1;
        
        if (targetIndex < 0 || targetIndex >= sequenceFiles.length) return null;
        
        const targetFile = sequenceFiles[targetIndex];
        
        try {
            if (fs.existsSync(targetFile.fullPath)) {
                return vscode.Uri.file(targetFile.fullPath);
            }
        } catch (error) {
            console.error('Error accessing adjacent file:', error);
        }
        
        return null;
    }

    getHtmlForWebview(webview, document) {
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.extensionUri, 'src', 'webview', 'main.js')
        );
        const styleUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.extensionUri, 'src', 'webview', 'style.css')
        );
        const vtkParserUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.extensionUri, 'src', 'webview', 'vtkParser.js')
        );
        const d3Uri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.extensionUri, 'node_modules', 'd3', 'dist', 'd3.min.js')
        );

        const nonce = getNonce();

        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
            <link href="${styleUri}" rel="stylesheet">
            <title>VTK Scalar Visualizer</title>
        </head>
        <body>
            <div class="controls">
                <div class="main-controls-container">
                    <div>
                        <label for="scalar-select">Scalar Data:</label>
                        <select id="scalar-select" disabled></select>
                    </div>
                    <div>
                        <label for="colormap-select">Color Map:</label>
                        <select id="colormap-select">
                            <option value="Viridis" selected>Viridis</option>
                            <option value="Plasma">Plasma</option>
                            <option value="Inferno">Inferno</option>
                            <option value="Magma">Magma</option>
                            <option value="Cividis">Cividis</option>
                            <option value="Turbo">Turbo</option>
                            <option value="Rainbow">Rainbow</option>
                            <option value="Cool">Cool</option>
                            <option value="Warm">Warm</option>
                            <option value="Blues">Blues</option>
                            <option value="Greens">Greens</option>
                            <option value="Reds">Reds</option>
                            <option value="Greys">Greys</option>
                        </select>
                    </div>
                </div>
            </div>
            
            <div class="controls range-controls-container">
                <input type="checkbox" id="auto-range" checked>
                <label for="auto-range">Auto Range</label>
                <label for="min-value">Min:</label>
                <input type="number" id="min-value" step="any" disabled>
                <label for="max-value">Max:</label>
                <input type="number" id="max-value" step="any" disabled>
                <button id="apply-range" disabled>Apply</button>
            </div>
            
            <div class="navigation-container">
                <button id="prev-file" class="nav-button" title="Previous file (←)">◀ Previous</button>
                <span id="current-file" class="current-file">Loading...</span>
                <button id="next-file" class="nav-button" title="Next file (→)">Next ▶</button>
            </div>
            
            <div class="visualization-container">
                <div id="vtk-canvas"></div>
                <div id="legend"></div>
            </div>

            <script nonce="${nonce}" src="${d3Uri}"></script>
            <script nonce="${nonce}" src="${vtkParserUri}"></script>
            <script nonce="${nonce}" src="${scriptUri}"></script>
        </body>
        </html>`;
    }
}

function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

module.exports = VtkVisualizerProvider;