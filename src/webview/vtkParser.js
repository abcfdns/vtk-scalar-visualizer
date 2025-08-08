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
            lineIndex++; // Skip LOOKUP_TABLE line
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