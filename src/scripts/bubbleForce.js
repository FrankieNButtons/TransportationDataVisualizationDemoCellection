(function () {
  const WIDTH = 600;
  const HEIGHT = 400;

  // 区域色彩比例尺
  const regionColor = d3.scaleOrdinal()
    .domain(["region-A", "region-B", "region-C"])
    .range(["#004d40", "#8B0000", "#FFD700"]); // 墨绿、暗红、金黄

  // 每个区域的小地点配色数组
  const subregionColorMap = {
    "region-A": ["#66bb6a", "#9ccc65", "#d4e157", "#aed581"], // 绿系
    "region-B": ["#ef5350", "#e57373", "#ef9a9a", "#ffcdd2"],  // 红系
    "region-C": ["#FFEB3B", "#FFF176", "#FFEE58", "#FDD835"]  // 黄系
  };

  // 任意两点间的交通流量示例（对称矩阵）
  const smallFlowMatrix = {
    "区域A-部1": {"区域B-部2": 50, "区域C-部3": 30},
    "区域B-部2": {"区域A-部1": 50, "区域D-部4": 20},
    "区域C-部3": {"区域A-部1": 30},
    "区域D-部4": {"区域B-部2": 20}
  };

  // 区域及其下属部门示例
  const regions = [
    {
      id: "region-A",
      name: "区域A",
      sum: 500,  // 区域总流量或权重
      types: [
        { type: "部1", sum: 200 },
        { type: "部2", sum: 150 },
        { type: "部3", sum: 100 },
        { type: "部4", sum: 50 }
      ]
    },
    {
      id: "region-B",
      name: "区域B",
      sum: 400,
      types: [
        { type: "部5", sum: 180 },
        { type: "部6", sum: 120 },
        { type: "部7", sum: 60 },
        { type: "部8", sum: 40 }
      ]
    },
    {
      id: "region-C",
      name: "区域C",
      sum: 300,  // 可根据实际数据调整
      types: [
        { type: "部9",  sum: 120 },
        { type: "部10", sum: 80 },
        { type: "部11", sum: 60 },
        { type: "部12", sum: 40 }
      ]
    },
    // 可按实际数据继续添加更多区域
  ];

  const container = d3.select("#bubble-viz");
  container.select("svg").remove();

  const svg = container.append("svg")
    .attr("width", WIDTH)
    .attr("height", HEIGHT);

  let nodes = [];

  const sim = d3.forceSimulation()
    .force("charge", d3.forceManyBody().strength(5))
    .force("center", d3.forceCenter(WIDTH / 2, HEIGHT / 2))
    .force("collision", d3.forceCollide().radius(d => d.r + 1))
    .force("pull", d3.forceRadial(0, WIDTH / 2, HEIGHT / 2).strength(0.08)) // soft radial pull
    .force("link", d3.forceLink().id(d => d.id)
      .distance(l => 200 / l.value)
      .strength(l => Math.min(l.value / 100, 1))
    )
    .on("tick", () => {
      svg.selectAll("circle")
        .attr("cx", d => d.x)
        .attr("cy", d => d.y);
      svg.selectAll("text")
        .attr("x", d => d.x)
        .attr("y", d => d.y + 4);
    });

  function scaleRadius(value) {
    return Math.sqrt(value) * 2.2;
  }

  function render(data) {
    // 动态聚合不同层级之间的流量，生成 link 数据
    const links = [];
    for (let i = 0; i < data.length; i++) {
      for (let j = i + 1; j < data.length; j++) {
        const a = data[i], b = data[j];
        let flow = 0;

        // 子‑子
        if (a.level === 1 && b.level === 1) {
          flow = smallFlowMatrix[a.id]?.[b.id] || smallFlowMatrix[b.id]?.[a.id] || 0;
        }
        // 区‑子 或 子‑区
        else if (a.level !== b.level) {
          const parent = a.level === 0 ? a : b;
          const child  = a.level === 1 ? a : b;
          const siblings = regions
            .find(r => r.id === parent.id)
            .types
            .map(t => `${parent.id}-${t.type}`);
          flow = siblings.reduce(
            (sum, sid) => sum +
              (smallFlowMatrix[sid]?.[child.id] || 0) +
              (smallFlowMatrix[child.id]?.[sid] || 0),
            0
          );
        }
        // 区‑区
        else {
          const childrenA = regions
            .find(r => r.id === a.id)
            .types
            .map(t => `${a.id}-${t.type}`);
          const childrenB = regions
            .find(r => r.id === b.id)
            .types
            .map(t => `${b.id}-${t.type}`);
          childrenA.forEach(idA => {
            childrenB.forEach(idB => {
              flow +=
                (smallFlowMatrix[idA]?.[idB] || 0) +
                (smallFlowMatrix[idB]?.[idA] || 0);
            });
          });
        }

        if (flow > 0) links.push({ source: a.id, target: b.id, value: flow });
      }
    }
    sim.force("link").links(links);

    nodes = data;
    sim.nodes(nodes);
    sim.alpha(0.9).alphaTarget(0.4).restart();

    // JOIN
    const circles = svg.selectAll("circle").data(nodes, d => d.id);
    circles.exit().remove();

    const enter = circles.enter().append("circle")
      .attr("r", 0)
      .attr("fill", d => d.fill || "#ccc")
      .attr("stroke", "#fff")
      .attr("cursor", "pointer")
      .call(drag(sim))
      .on("click", (event, d) => {
        event.stopPropagation();
        if (d.level === 0) expand(d);
        else collapse(d);
      });

    enter.merge(circles)
      .transition().duration(150)
      .attr("r", d => d.r)
      .attr("fill-opacity", d => d.faded ? 0.3 : 0.9);

    const labels = svg.selectAll("text").data(nodes, d => d.id);
    labels.exit().remove();

    const textEnter = labels.enter().append("text")
      .attr("text-anchor", "middle")
      .style("font-size", "12px")
      .style("pointer-events", "none")
      .text(d => d.name);

    textEnter.merge(labels)
      .transition().duration(150)
      .attr("x", d => d.x)
      .attr("y", d => d.y + 4)
      .style("opacity", d => d.faded ? 0.4 : 1);
  }

  function drag(sim) {
    return d3.drag()
      .on("start", (event, d) => {
        if (!event.active) sim.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on("drag", (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on("end", (event, d) => {
        if (!event.active) sim.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });
  }

  // 当前已展开的区域集合
  let expandedRegions = new Set();

  function updateNodes() {
    const nodes = [];
    regions.forEach(r => {
      if (expandedRegions.has(r.id)) {
        // 展开的区域，添加其子节点
        r.types.forEach((t, i) => {
          nodes.push({
            id: `${r.id}-${t.type}`,
            name: t.type,
            level: 1,
            r: scaleRadius(t.sum),
            fill: subregionColorMap[r.id][i % subregionColorMap[r.id].length],
            parentId: r.id
          });
        });
      } else {
        // 未展开区域，添加区域节点
        nodes.push({
          id: r.id,
          name: r.name,
          level: 0,
          r: scaleRadius(r.sum),
          fill: regionColor(r.id),
          ...r
        });
      }
    });
    render(nodes);
  }

  function expand(parent) {
    expandedRegions.add(parent.id);
    updateNodes();
  }

  function collapse(selected) {
    if (selected && selected.level === 1) {
      const parentId = selected.parentId;
      // 聚集动画
      const circles = svg.selectAll("circle").filter(d => d.parentId === parentId && d.level === 1);
      const texts   = svg.selectAll("text").filter(d => d.parentId === parentId && d.level === 1);
      // 圆圈聚集动画，完成后合并
      circles.transition().duration(600)
        .attr("cx", selected.x)
        .attr("cy", selected.y)
        .on("end", () => {
          expandedRegions.delete(parentId);
          updateNodes();
        });
      // 文本直接淡出
      texts.transition().duration(600)
        .style("opacity", 0)
        .remove();
    } else {
      // 点击空白或大泡泡收起全部
      expandedRegions.clear();
      updateNodes();
    }
  }

  // 初始化点击空白收起
  svg.on("click", () => collapse());

  // 初始绘制
  updateNodes();
})();