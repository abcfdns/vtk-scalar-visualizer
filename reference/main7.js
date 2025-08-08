document.addEventListener('DOMContentLoaded', () => {
    // --- UI要素の取得 ---
    const fileInput = document.getElementById('vtk-file');
    const mainControlsContainer = document.getElementById('main-controls-container');
    const scalarSelect = document.getElementById('scalar-select');
    const colormapSelect = document.getElementById('colormap-select');
    const rangeControlsContainer = document.getElementById('range-controls-container');
    const autoRangeCheckbox = document.getElementById('auto-range');
    const minInput = document.getElementById('min-value');
    const maxInput = document.getElementById('max-value');
    const applyRangeButton = document.getElementById('apply-range');

    // --- グローバル変数・定数 ---
    const colorInterpolators = {
        "Viridis": d3.interpolateViridis, "Plasma": d3.interpolatePlasma, "Inferno": d3.interpolateInferno,
        "Magma": d3.interpolateMagma, "Cividis": d3.interpolateCividis, "Turbo": d3.interpolateTurbo,
        "Rainbow": d3.interpolateRainbow, "Cool": d3.interpolateCool, "Warm": d3.interpolateWarm,
        "Blues": d3.interpolateBlues, "Greens": d3.interpolateGreens, "Reds": d3.interpolateReds,
        "Greys": d3.interpolateGreys
    };
    let vtkData = null;

    // --- イベントリスナー ---

    // ファイルが選択されたときのイベント
    fileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target.result;
            try {
                vtkData = parseVTK(content);
                mainControlsContainer.style.display = 'flex';
                rangeControlsContainer.style.display = 'flex';
                
                updateScalarSelector();

                const firstScalarName = vtkData && Object.keys(vtkData.pointData.scalars)[0];
                if (firstScalarName) {
                    autoRangeCheckbox.checked = true;
                    autoRangeCheckbox.dispatchEvent(new Event('change'));
                    visualize(firstScalarName);
                }
            } catch (error) {
                alert(`Error parsing VTK file: ${error.message}`);
                console.error(error);
            }
        };
        reader.readAsText(file);
    });

    // 表示するスカラデータが変更されたときのイベント
    scalarSelect.addEventListener('change', () => {
        if (vtkData) {
            autoRangeCheckbox.checked = true;
            autoRangeCheckbox.dispatchEvent(new Event('change'));
            visualize();
        }
    });
    
    // カラーマップが変更されたときのイベント
    colormapSelect.addEventListener('change', () => {
        if (vtkData) visualize();
    });

    // 自動範囲設定チェックボックスが変更されたときのイベント
    autoRangeCheckbox.addEventListener('change', () => {
        const isManual = !autoRangeCheckbox.checked;
        minInput.disabled = !isManual;
        maxInput.disabled = !isManual;
        applyRangeButton.disabled = !isManual;
        if (autoRangeCheckbox.checked && vtkData) {
            visualize();
        }
    });

    // 「適用」ボタンがクリックされたときのイベント
    applyRangeButton.addEventListener('click', () => {
        if (vtkData) visualize();
    });

    // --- 主要な関数 ---

    /**
     * D3.jsを使って可視化を描画する
     * @param {string} [scalarNameToDraw] - (オプション) 描画するスカラ名。なければUIの選択値を使用
     */
    function visualize(scalarNameToDraw) {
        const selectedScalarName = scalarNameToDraw || scalarSelect.value;
        
        if (!vtkData || !selectedScalarName) {
            console.warn("描画対象のスカラデータが見つかりません。");
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
                alert("無効な数値範囲です。\nMinにはMaxより小さい数値を入力してください。");
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
    
    /**
     * カラーマップの凡例を描画する
     */
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
            .data(colorScale.ticks().map((t, i, n) => ({ offset: `${100*i/n.length}%`, color: colorScale(t) })))
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

    /**
     * スカラ選択のドロップダウンを更新する
     */
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

    /**
     * VTK Legacy (ASCII) 形式のファイルをパースする
     */
    function parseVTK(content) {
        const lines = content.split('\n');
        const data = {
            dimensions: null,
            pointData: {
                scalars: {},
                vectors: {}
            }
        };
        let pointDataCount = 0;
        let lineIndex = 0;

        while (lineIndex < lines.length) {
            const line = lines[lineIndex].trim();
            if (line.startsWith('DIMENSIONS')) {
                data.dimensions = line.split(' ').slice(1).map(Number);
            } else if (line.startsWith('POINT_DATA')) {
                pointDataCount = parseInt(line.split(' ')[1], 10);
            } else if (line.startsWith('SCALARS')) {
                const parts = line.split(' ');
                const name = parts[1];
                lineIndex++; // LOOKUP_TABLE line
                let values = [];
                while (values.length < pointDataCount) {
                    lineIndex++;
                    if (lineIndex >= lines.length || !lines[lineIndex]) break;
                    values.push(...lines[lineIndex].trim().split(/\s+/).map(Number));
                }
                data.pointData.scalars[name] = values;
            } else if (line.startsWith('VECTORS')) {
                 const parts = line.split(' ');
                 const name = parts[1];
                 let values = [];
                 while (values.length < pointDataCount * 3) {
                     lineIndex++;
                     if (lineIndex >= lines.length || !lines[lineIndex]) break;
                     values.push(...lines[lineIndex].trim().split(/\s+/).map(Number));
                 }
                 data.pointData.vectors[name] = values;
            }
            lineIndex++;
        }

        if (!data.dimensions || Object.keys(data.pointData.scalars).length === 0) {
            throw new Error("Invalid or unsupported VTK format. Required: ASCII, STRUCTURED_POINTS, POINT_DATA with SCALARS.");
        }
        return data;
    }
});