// ----- 基础数据与配置 -----
// tooltip
const tooltip = d3.select("#tooltip");
const countries = ["东门", "西门", "北门", "南门"];
const vehicleTypes = ["小轿车", "货车", "摩托车", "公交车"];
// 随机示例矩阵，并确保对角为0
// const matrix = Array.from({ length: 4 }, () => Array.from({ length: 4 }, () => Math.floor(Math.random() * 40 + 10)));
// matrix.forEach((row, i) => row[i] = 0);
// 等价量示例
const vehicleEquivalents = [
    [33, 17, 4, 11],
    [21, 23, 12, 6],
    [9, 13, 18, 7],
    [37, 6, 7, 14]
];

// 每种载具的示例地点间流量矩阵（对角为 0，表示无自流量）
const matricesByType = [
    [[0, 2, 3, 4], [2, 0, 1, 3], [3, 1, 0, 2], [4, 3, 2, 0]],  // 小轿车
    [[0, 3, 2, 1], [3, 0, 2, 2], [2, 2, 0, 1], [1, 2, 1, 0]],  // 货车
    [[0, 4, 1, 2], [4, 0, 3, 1], [1, 3, 0, 4], [2, 1, 4, 0]],  // 摩托车
    [[0, 1, 4, 3], [1, 0, 3, 2], [4, 3, 0, 1], [3, 2, 1, 0]]   // 公交车
];
// 总体矩阵：所有类型矩阵逐点相加
const summedMatrix = matricesByType.reduce((acc, m) =>
    acc.map((row, i) => row.map((v, j) => v + m[i][j]))
    , matricesByType[0].map(row => row.map(() => 0)));

// 颜色比例
const chordColor = d3.scaleOrdinal().domain(d3.range(4)).range(["#80cbc4", "#a5d6a7", "#fff59d", "#90caf9"]);
const typeColor = d3.scaleOrdinal().domain(d3.range(4)).range(["#ef5350", "#ab47bc", "#42a5f5", "#26a69a"]);

let selectedType = null;

// ----- 在左上容器渲染 Chord 图 -----
const chordContainer = d3.select("#chord-container");
const cw = chordContainer.node().clientWidth;
const ch = chordContainer.node().clientHeight;
const innerR = Math.min(cw, ch) * 0.4;
const outerR = innerR * 1.1;
const chordLayout = d3.chord().padAngle(0.05).sortSubgroups(d3.descending);

let chords, arcPaths, ribbons, groupLabels;

const arc = d3.arc().innerRadius(innerR).outerRadius(outerR);
const ribbon = d3.ribbon().radius(innerR);
const outerArc = d3.arc().innerRadius(outerR + 6).outerRadius(outerR + 20);

// 构建所有扇形数据（外环等价量分段）
// 这里 outerSegments 和 outerPaths 需要在外部作用域定义以便交互使用
const outerSegments = [];
let outerPaths;

function drawChord(mat) {
    d3.select("#chord-container svg").remove();

    // 动态添加 Chord 标题
    chordContainer.selectAll(".chart-title").remove();
    chordContainer.append("div")
        .attr("class", "chart-title")
        .text("过去5分钟流量一览");

    chords = chordLayout(mat);

    const svg = chordContainer.append("svg")
        .attr("width", cw).attr("height", ch)
        .attr("viewBox", [-cw / 2, -ch / 2, cw, ch]);

    // 连线（hover 显示 tooltip）
    const ribbonGroup = svg.append("g");
    ribbons = ribbonGroup.selectAll("path")
        .data(chords)
        .enter().append("path")
        .attr("d", ribbon)
        .attr("fill", d => chordColor(d.source.index))
        .attr("stroke", "#ddd")
        .style("opacity", 0.7)
        .on("mouseover", (event, d) => {
            const src = countries[d.source.index];
            const tgt = countries[d.target.index];
            const val = d.source.value;
            if (selectedType !== null) {
                tooltip.html(`${src} → ${tgt}（${vehicleTypes[selectedType]}）：${val}`);
            } else {
                tooltip.html(`${src} → ${tgt}：${val}`);
            }
            tooltip.style("visibility", "visible");
        })
        .on("mousemove", (event) => {
            tooltip.style("top", `${event.pageY + 10}px`)
                .style("left", `${event.pageX + 10}px`);
        })
        .on("mouseout", () => {
            tooltip.style("visibility", "hidden");
        });

    // 外圈弧（可点击高亮 ribbon，悬停高亮外环）
    arcPaths = svg.append("g")
        .selectAll("path")
        .data(chords.groups)
        .enter().append("path")
        .attr("d", arc)
        .attr("fill", d => chordColor(d.index))
        .attr("stroke", "#fff")
        .style("cursor", "pointer")
        .style("opacity", 0.8)
        .on("mouseover", function (event, d) {
            // 悬停：高亮当前扇区，淡化其他
            arcPaths.transition().duration(200)
                .style("opacity", a => a.index === d.index ? 1 : 0.3);
        })
        .on("mouseout", function (event, d) {
            // 还原所有扇区
            arcPaths.transition().duration(200)
                .style("opacity", 0.8);
        })
        .on("click", function (event, d) {
            // 点击：高亮对应 ribbons，其余灰度化
            ribbons.transition().duration(300)
                .style("opacity", r =>
                    r.source.index === d.index || r.target.index === d.index ? 0.7 : 0.1
                )
                .attr("fill", r =>
                    (r.source.index === d.index || r.target.index === d.index)
                        ? chordColor(r.source.index)
                        : "#ccc"
                );
        });

    // 在外环之外添加区域名称标签
    groupLabels = svg.append("g")
        .selectAll("text")
        .data(chords.groups)
        .enter().append("text")
        .attr("x", d => Math.cos((d.startAngle + d.endAngle) / 2 - Math.PI / 2) * (outerR + 50))
        .attr("y", d => Math.sin((d.startAngle + d.endAngle) / 2 - Math.PI / 2) * (outerR + 50))
        .attr("dy", "0.35em")
        .attr("text-anchor", "middle")
        .text((d, i) => countries[i]);

    // 外圈等价量分段（点击触发柱状图 + 同类圆弧高亮）
    outerSegments.length = 0; // 清空之前数据
    chords.groups.forEach((d, i) => {
        const total = d3.sum(vehicleEquivalents[i]);
        let start = d.startAngle;
        vehicleEquivalents[i].forEach((val, j) => {
            const angle = (d.endAngle - d.startAngle) * (val / total);
            outerSegments.push({ startAngle: start, endAngle: start + angle, idx: i, type: j, value: val });
            start += angle;
        });
    });

    const outerGroup = svg.append("g");
    outerPaths = outerGroup.selectAll("path")
        .data(outerSegments)
        .enter().append("path")
        .attr("d", outerArc)
        .attr("fill", seg => typeColor(seg.type))
        .attr("stroke", "#fff")
        .style("cursor", "pointer")
        .style("opacity", 1.0)
        .on("click", function (event, d) {
            // 记录选中载具类型
            drawChord(matricesByType[d.type]);
            selectedType = d.type;
            drawBarChart(d.type);
            // 高亮同类圆弧，灰化其他
            outerPaths.transition().duration(300)
                .style("opacity", seg => seg.type === d.type ? 1 : 0.3);
        })
        .on("mouseover", (event, d) => {
            tooltip.html(`${vehicleTypes[d.type]}：${d.value}`)
                .style("visibility", "visible");
        })
        .on("mousemove", (event) => {
            tooltip.style("top", `${event.pageY + 10}px`)
                .style("left", `${event.pageX + 10}px`);
        })
        .on("mouseout", () => {
            tooltip.style("visibility", "hidden");
        });
}

drawChord(summedMatrix);

// ----- 在右上容器绘制水平柱状图 -----
function drawBarChart(typeIdx) {
    const svgBar = d3.select("#bar-chart");
    svgBar.selectAll("*").remove();
    const W = svgBar.node().clientWidth;
    const H = svgBar.node().clientHeight;
    const margin = { top: 50, right: 20, bottom: 20, left: 50 };
    const w = W - margin.left - margin.right;
    const h = H - margin.top - margin.bottom;
    const g = svgBar.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
    let titleText;
    let data;
    if (typeIdx === null) {
        // 总体：每个地点的总流量（行和）
        data = countries.map((c, i) => ({
            name: c,
            value: d3.sum(summedMatrix[i]) + d3.sum(summedMatrix.map(row => row[i]))
        }));
        titleText = '总体流量柱形图';
    } else {
        data = countries.map((c, i) => ({ name: c, value: vehicleEquivalents[i][typeIdx] }));
        titleText = vehicleTypes[typeIdx] + " 流量柱形图";
    }
    data = data.sort((a, b) => b.value - a.value);
    // 标题
    g.append("text")
        .attr("class", "chart-title")
        .attr("x", w / 2)
        .attr("y", -margin.top / 2)
        .attr("text-anchor", "middle")
        .style("fill", "#333")
        .text(titleText);
    const y = d3.scaleBand().domain(data.map(d => d.name)).range([0, h]).padding(0.2);
    const x = d3.scaleLinear().domain([0, d3.max(data, d => d.value)]).range([0, w]);
    g.append("g")
        .call(d3.axisLeft(y))
        .selectAll("text")
        .style("font-size", "15px");
    g.selectAll("rect").data(data).enter()
        .append("rect")
        .attr("y", d => y(d.name))
        .attr("height", y.bandwidth())
        .attr("width", 0)
        .attr("fill", typeIdx === null ? "#90caf9" : typeColor(typeIdx))
        .transition().duration(600).attr("width", d => x(d.value));

    // 动态递增标签
    const texts = g.selectAll("text.label")
        .data(data)
        .enter().append("text")
        .attr("class", "label")
        .attr("y", d => y(d.name) + y.bandwidth() / 2 + 4)
        .attr("x", 0)
        .attr("text-anchor", "start")
        .text("0");

    texts.transition()
        .duration(600)
        .tween("text", function (d) {
            const i = d3.interpolateNumber(0, d.value);
            return function (t) {
                const current = Math.round(i(t));
                d3.select(this)
                    .text(current)
                    .attr("x", x(i(t)) + 5);
            };
        });
}
// 清除右侧柱状图内容
function clearBarChart() {
    d3.select("#bar-chart").selectAll("*").remove();
}
function resetBarChart() {
    selectedType = null;
    clearBarChart();
    outerPaths.transition().duration(300)
        .style("opacity", 1.0);
}
// 重置 Chord 及外环和连线交互状态
function resetChord() {
    selectedType = null;
    arcPaths.transition().duration(300)
        .style("opacity", 0.8);
    ribbons.transition().duration(300)
        .style("opacity", 0.7)
        .attr("fill", d => chordColor(d.source.index));
    outerPaths.transition().duration(300)
        .style("opacity", 1.0);
    drawChord(summedMatrix);
    drawBarChart(null);
}

// 点击容器内任意非 path 元素时重置
d3.select("#chord-container")
    .on("click", function (event) {
        // 点击容器内任意非 path 元素时重置
        if (!event.target.matches('path')) {
            resetChord();
        }
    });
drawBarChart(null);