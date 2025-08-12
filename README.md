
# VTK Scalar Visualizer VS Code Extension

This is a VS Code extension for visualizing scalar data in VTK legacy files. It displays 2D structured grid data.

## Features

- **Automatic VTK File Recognition**: The visualizer automatically launches when you open a `.vtk` file
- **Multiple Scalar Field Support**: Switch between all scalar data fields in the file
- **Rich Color Maps**: 13 D3.js color schemes (Viridis, Plasma, Inferno, etc.)
- **Range Adjustment**: Set min/max range automatically or manually
- **File Navigation**: Sequentially display VTK file sequences in the same directory
- **Sparse Number Support**: Handles file sequences with non-consecutive numbers (e.g., 000500, 001000, 001500)
- **Setting Retention**: Retains color range and scalar field settings during navigation

## Installation

### Prerequisites
- Node.js 16.x or later
- VS Code 1.60.0 or later

### Install for Development

1. Clone or download this repository
2. Move to the extension directory in your terminal
3. Install dependencies:
   ```bash
   npm install
   ```
4. Open the extension folder in VS Code
5. Press `F5` to run the extension in debug mode

### Package and Install

1. Install VS Code Extension Manager (vsce):
   ```bash
   npm install -g vsce
   ```
2. Package the extension:
   ```bash
   vsce package
   ```
3. Install the generated `.vsix` file in VS Code:
   - Open the command palette (`Ctrl+Shift+P`)
   - Select "Extensions: Install from VSIX..."
   - Choose the generated `.vsix` file

## Usage

### Opening a VTK File

1. **Method 1**: Click a `.vtk` file in the Explorer
   - It will automatically open in the VTK Visualizer

2. **Method 2**: Open from the right-click menu
   - Right-click a `.vtk` file
   - Select "Open with VTK Visualizer"

3. **Method 3**: Open from the command palette
   - Open the file in the regular text editor
   - Open the command palette (`Ctrl+Shift+P`)
   - Run "VTK: Open with VTK Visualizer"

### Visualizer Controls

1. **Select Scalar Data**
   - Choose the scalar field to display from the dropdown menu at the top

2. **Change Color Map**
   - Select your preferred color scheme from the Color Map dropdown
   - Available color maps:
     - Scientific: Viridis, Plasma, Inferno, Magma, Cividis, Turbo
     - Diverging: Rainbow, Cool, Warm
     - Sequential: Blues, Greens, Reds, Greys

3. **Adjust Value Range**
   - **Auto Range**: Turn on the "Auto Range" checkbox (default)
   - **Manual Range**:
     1. Turn off the "Auto Range" checkbox
     2. Enter Min/Max values
     3. Click the "Apply" button

4. **File Navigation**
   - **Next/Previous buttons**: Sequentially display VTK file sequences in the same directory
   - **Supported pattern**: e.g., `filename_001.vtk`
   - **Sparse numbers**: Handles non-consecutive numbers (000500, 001000, 001500...)
   - **Setting retention**: Manual range settings are retained when navigating within the same scalar field

## Supported VTK File Formats

Currently, the following VTK file formats are supported:

- VTK Legacy ASCII format
- STRUCTURED_POINTS dataset
- POINT_DATA section
- SCALARS data (float type)

### Sample VTK File Format

```vtk
# vtk DataFile Version 2.0
Sample Temperature Data
ASCII
DATASET STRUCTURED_POINTS
DIMENSIONS 100 100 1
SPACING 1.0 1.0 1.0
ORIGIN 0.0 0.0 0.0
POINT_DATA 10000
SCALARS temperature float 1
LOOKUP_TABLE default
23.5 24.1 25.2 26.3 27.4 ...
```

## Troubleshooting

### If the file does not open
- Make sure the VTK file is in ASCII format
- Make sure it contains STRUCTURED_POINTS and POINT_DATA sections

### If the visualization does not appear
- Check for error messages in the browser developer tools (F12)
- Make sure the VTK file format is correct

### If navigation buttons do not work
- Make sure there are other VTK files in the same directory
- Make sure the file names follow the `basename_number.vtk` pattern
- Examples: `data_001.vtk`, `karman_vortex_000500.vtk`

### If settings are not retained
- Settings are only retained when navigating within the same scalar field
- If the scalar field changes, Auto Range is automatically restored

### If performance is poor
- Large VTK files (tens of thousands of points or more) may take time to load
- Very large datasets may not be displayed due to browser memory limits

## License

[MIT License](LICENSE)
