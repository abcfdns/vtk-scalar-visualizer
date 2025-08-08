(function() {
    const vscode = acquireVsCodeApi();
    
    // Color interpolators mapping
    const colorInterpolators = {
        "Viridis": d3.interpolateViridis,
        "Plasma": d3.interpolatePlasma,
        "Inferno": d3.interpolateInferno,
        "Magma": d3.interpolateMagma,
        "Cividis": d3.interpolateCividis,
        "Turbo": d3.interpolateTurbo,
        "Rainbow": d3.interpolateRainbow,
        "Cool": d3.interpolateCool,
        "Warm": d3.interpolateWarm,
        "Blues": d3.interpolateBlues,
        "Greens": d3.interpolateGreens,
        "Reds": d3.interpolateReds,
        "Greys": d3.interpolateGreys
    };
    
    let vtkData = null;
    let fileInfo = { currentFile: '', hasNext: false, hasPrev: false };
    let isInitialLoad = true; // Track if this is the first file load
    let currentScalarField = null; // Track current scalar field
    
    // UI Elements
    const scalarSelect = document.getElementById('scalar-select');
    const colormapSelect = document.getElementById('colormap-select');
    const autoRangeCheckbox = document.getElementById('auto-range');
    const minInput = document.getElementById('min-value');
    const maxInput = document.getElementById('max-value');
    const applyRangeButton = document.getElementById('apply-range');
    const prevButton = document.getElementById('prev-file');
    const nextButton = document.getElementById('next-file');
    const currentFileSpan = document.getElementById('current-file');

    // Event Listeners
    scalarSelect.addEventListener('change', () => {
        if (vtkData) {
            // Only reset to auto range if scalar field actually changed
            const newScalarField = scalarSelect.value;
            if (newScalarField !== currentScalarField) {
                autoRangeCheckbox.checked = true;
                autoRangeCheckbox.dispatchEvent(new Event('change'));
                currentScalarField = newScalarField;
            }
            visualize();
        }
    });
    
    colormapSelect.addEventListener('change', () => {
        if (vtkData) visualize();
    });

    autoRangeCheckbox.addEventListener('change', () => {
        const isManual = !autoRangeCheckbox.checked;
        minInput.disabled = !isManual;
        maxInput.disabled = !isManual;
        applyRangeButton.disabled = !isManual;
        if (autoRangeCheckbox.checked && vtkData) {
            visualize();
        }
    });

    applyRangeButton.addEventListener('click', () => {
        if (vtkData) visualize();
    });

    // Navigation buttons
    prevButton.addEventListener('click', () => {
        vscode.postMessage({ type: 'navigatePrev' });
    });

    nextButton.addEventListener('click', () => {
        vscode.postMessage({ type: 'navigateNext' });
    });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft' && fileInfo.hasPrev) {
            vscode.postMessage({ type: 'navigatePrev' });
        } else if (e.key === 'ArrowRight' && fileInfo.hasNext) {
            vscode.postMessage({ type: 'navigateNext' });
        }
    });

    // Listen for messages from the extension
    window.addEventListener('message', event => {
        const message = event.data;
        switch (message.type) {
            case 'update':
                try {
                    vtkData = parseVTK(message.text);
                    updateScalarSelector();
                    
                    // Update file navigation info
                    fileInfo = {
                        currentFile: message.currentFile || 'Unknown',
                        hasNext: message.hasNext || false,
                        hasPrev: message.hasPrev || false,
                        sequenceInfo: message.sequenceInfo || null
                    };
                    updateNavigationUI();
                    
                    const firstScalarName = vtkData && Object.keys(vtkData.pointData.scalars)[0];
                    if (firstScalarName) {
                        // Only set auto range on initial load, preserve user settings on navigation
                        if (isInitialLoad) {
                            autoRangeCheckbox.checked = true;
                            autoRangeCheckbox.dispatchEvent(new Event('change'));
                            currentScalarField = firstScalarName;
                            isInitialLoad = false; // Mark that initial load is complete
                        } else {
                            // On navigation, preserve current scalar field selection if it exists in new file
                            const availableScalars = Object.keys(vtkData.pointData.scalars);
                            if (currentScalarField && availableScalars.includes(currentScalarField)) {
                                scalarSelect.value = currentScalarField;
                            } else {
                                // If current scalar field doesn't exist, select first available and reset to auto range
                                scalarSelect.value = firstScalarName;
                                currentScalarField = firstScalarName;
                                autoRangeCheckbox.checked = true;
                                autoRangeCheckbox.dispatchEvent(new Event('change'));
                            }
                        }
                        visualize(scalarSelect.value);
                    }
                } catch (error) {
                    vscode.postMessage({
                        type: 'error',
                        message: `Error parsing VTK file: ${error.message}`
                    });
                    console.error(error);
                }
                break;
        }
    });

    function visualize(scalarNameToDraw) {
        const selectedScalarName = scalarNameToDraw || scalarSelect.value;
        
        if (!vtkData || !selectedScalarName) {
            console.warn("No scalar data found for visualization.");
            return;
        }
        
        const selectedColormapName = colormapSelect.value;
        const interpolator = colorInterpolators[selectedColormapName] || d3.interpolateViridis;

        const scalars = vtkData.pointData.scalars[selectedScalarName];
        const [dimX, dimY] = vtkData.dimensions;

        const canvasDiv = document.getElementById('vtk-canvas');
        canvasDiv.innerHTML = '';

        const margin = { top: 20, right: 20, bottom: 20, left: 20 };
        const canvasWidth = 500;
        const cellWidth = canvasWidth / dimX;
        const canvasHeight = cellWidth * dimY;
        const width = canvasWidth + margin.left + margin.right;
        const height = canvasHeight + margin.top + margin.bottom;

        const svg = d3.select(canvasDiv)
            .append("svg")
            .attr("width", width)
            .attr("height", height)
            .attr("shape-rendering", "crispEdges")
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);
        
        let colorMin, colorMax;
        if (autoRangeCheckbox.checked) {
            colorMin = d3.min(scalars);
            colorMax = d3.max(scalars);
            minInput.value = colorMin;
            maxInput.value = colorMax;
        } else {
            colorMin = parseFloat(minInput.value);
            colorMax = parseFloat(maxInput.value);
            if (isNaN(colorMin) || isNaN(colorMax) || colorMin >= colorMax) {
                vscode.postMessage({
                    type: 'error',
                    message: "Invalid range values. Min must be less than Max."
                });
                autoRangeCheckbox.checked = true;
                autoRangeCheckbox.dispatchEvent(new Event('change'));
                visualize();
                return;
            }
        }

        const colorScale = d3.scaleSequential(interpolator)
            .domain([colorMin, colorMax])
            .clamp(true);

        for (let j = 0; j < dimY; j++) {
            for (let i = 0; i < dimX; i++) {
                const index = j * dimX + i;
                svg.append("rect")
                    .attr("x", i * cellWidth)
                    .attr("y", (dimY - 1 - j) * cellWidth)
                    .attr("width", cellWidth)
                    .attr("height", cellWidth)
                    .attr("fill", colorScale(scalars[index]));
            }
        }
        
        drawLegend(colorScale, colorMin, colorMax, canvasHeight, margin);
    }
    
    function drawLegend(colorScale, min, max, graphHeight, margin) {
        const legendDiv = document.getElementById('legend');
        legendDiv.innerHTML = '';

        const legendHeight = graphHeight;
        const legendWidth = 80;
        const barWidth = 20;
        const svgHeight = legendHeight + margin.top + margin.bottom;

        const legendSvg = d3.select(legendDiv)
            .append("svg")
            .attr("width", legendWidth)
            .attr("height", svgHeight)
            .append("g")
            .attr("transform", `translate(10, ${margin.top})`);

        const defs = legendSvg.append("defs");
        const linearGradient = defs.append("linearGradient")
            .attr("id", "linear-gradient")
            .attr("x1", "0%")
            .attr("y1", "100%")
            .attr("x2", "0%")
            .attr("y2", "0%");

        linearGradient.selectAll("stop")
            .data(colorScale.ticks().map((t, i, n) => ({ 
                offset: `${100*i/(n.length-1)}%`, 
                color: colorScale(t) 
            })))
            .enter().append("stop")
            .attr("offset", d => d.offset)
            .attr("stop-color", d => d.color);

        legendSvg.append("rect")
            .attr("width", barWidth)
            .attr("height", legendHeight)
            .style("fill", "url(#linear-gradient)");

        const y = d3.scaleLinear()
            .domain([min, max])
            .range([legendHeight, 0]);

        const yAxis = d3.axisRight(y).ticks(10, ".2f");

        legendSvg.append("g")
            .attr("class", "axis")
            .attr("transform", `translate(${barWidth}, 0)`)
            .call(yAxis);
    }

    function updateScalarSelector() {
        scalarSelect.innerHTML = '';
        const scalarNames = Object.keys(vtkData.pointData.scalars);
        if (scalarNames.length > 0) {
            scalarNames.forEach(name => {
                const option = document.createElement('option');
                option.value = name;
                option.textContent = name;
                scalarSelect.appendChild(option);
            });
            scalarSelect.disabled = false;
        } else {
            scalarSelect.disabled = true;
        }
    }

    function updateNavigationUI() {
        let displayText = fileInfo.currentFile;
        
        // Add sequence information if available
        if (fileInfo.sequenceInfo && fileInfo.sequenceInfo.totalFiles > 1) {
            displayText += ` (${fileInfo.sequenceInfo.currentIndex}/${fileInfo.sequenceInfo.totalFiles})`;
        }
        
        currentFileSpan.textContent = displayText;
        prevButton.disabled = !fileInfo.hasPrev;
        nextButton.disabled = !fileInfo.hasNext;
    }
})();