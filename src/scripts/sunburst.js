(function () {
    // Sundial Sunburst Chart rendered into #sundial-container
    const container = d3.select("#sundial-container");
    const width = container.node().clientWidth || 260;
    const height = container.node().clientHeight || 260;
    const radius = Math.min(width, height) / 2;

    // 动态标题（不改 HTML 结构）
    container.insert("div", ":first-child")
      .attr("class", "chart-title")
      .style("text-align", "center")
      .style("font-weight", "standard")
      .style("margin-bottom", "4px")
      .style("font-size", "18px")           // 与其他图统一
      .style("font-family", "sans-serif")
      .text("各类型载具总量日晷图");

    // --- Demo data --------------------------------------------------------
    // 四轮车（大型车（公交车, 货车），小型车（小轿车, 跑车（轿跑, 赛车）））
    // 两轮车（摩托车, 电动车, 自行车）
    const data = {
      name: "车辆",
      children: [
        {
          name: "四轮车",
          children: [
            {
              name: "大型车",
              children: [
                { name: "公交车", value: 15 },
                { name: "货车", value: 12 }
              ]
            },
            {
              name: "小型车",
              children: [
                { name: "小轿车", value: 30 },
                {
                  name: "跑车",
                  children: [
                    { name: "轿跑", value: 5 },
                    { name: "赛车", value: 3 }
                  ]
                }
              ]
            }
          ]
        },
        {
          name: "两轮车",
          children: [
            { name: "摩托车", value: 20 },
            { name: "电动车", value: 25 },
            { name: "自行车", value: 18 }
          ]
        }
      ]
    };
    // ----------------------------------------------------------------------

    const root = d3.hierarchy(data)
      .sum(d => d.value)
      .sort((a, b) => b.value - a.value);

    const partition = d3.partition()
      .size([2 * Math.PI, radius]);

    partition(root);

    // 颜色：为所有类别（含子类）分配独立颜色
    const color = d3.scaleOrdinal()
      .domain(root.descendants().filter(d => d.depth > 0).map(d => d.data.name))
      .range(d3.schemeTableau10.concat(d3.schemeSet3).concat(d3.schemeSet2));

    const arc = d3.arc()
      .startAngle(d => d.x0)
      .endAngle(d => d.x1)
      .innerRadius(d => d.y0)
      .outerRadius(d => d.y1 - 1);

    const svg = container.append("svg")
      .attr("width", width)
      .attr("height", height);

    // 向上微移，减少底部留白
    const g = svg.append("g")
        .attr("transform", `translate(${width / 2},${height / 2 - 10})`);

    // 每个节点保存当前可视坐标（初始全部展开）
    root.each(d => d.current = d);

    const path = g.append("g")
      .selectAll("path")
      .data(root.descendants())
      .join("path")
        // 根节点也占用可点击面，但保持透明
        .attr("fill", d => d.depth === 0 ? "#ffffff" : color(d.data.name))
        .attr("fill-opacity", d => d.depth === 0 ? 0.001 : 0.8)
        .attr("pointer-events", "all")        // 任何位置均可点击
        .attr("d", d => arc(d.current))
        .style("cursor", d => d.children ? "pointer" : null)
        .on("click", clicked);

    // Tooltip
    path.append("title")
        .text(d =>
          `${d.ancestors().map(d => d.data.name).reverse().join(" → ")}\n${d.value}`);

    // label group inside g
    const labelGroup = g.append("g").attr("class", "label-group");

    /** 淡出当前所有标签 */
    function fadeOutLabels() {
      labelGroup.selectAll("text")
        .transition().duration(300)
        .style("opacity", 0)
        .remove();
    }

    function updateLabels(rootNode) {
      const leaves = rootNode.descendants().filter(d => !d.children);

      const labels = labelGroup.selectAll("text")
        .data(leaves, d => d.data.name);

      // ENTER
      const enterSel = labels.enter()
        .append("text")
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .style("font-family", "sans-serif")
        .style("fill", "#555")
        .style("opacity", 0);

      // ENTER + UPDATE (merging)
      enterSel.merge(labels)
        .each(function (d) {
          const pct = ((d.value / rootNode.value) * 100).toFixed(1);
          const txtSel = d3.select(this);
          txtSel.selectAll("tspan").remove();        // clear old

          txtSel.append("tspan")
            .attr("x", 0).attr("dy", 0)
            .text(d.data.name);

          txtSel.append("tspan")
            .attr("x", 0).attr("dy", "1.2em")
            .text(`数量：${d.value}`);

          txtSel.append("tspan")
            .attr("x", 0).attr("dy", "1.2em")
            .text(`占比：${pct}%`);
        })
        .attr("transform", (function () {
          let lastAngle = null;                // 记录上一标签角度
          const MIN_DIFF = 0.22;               // ~12.5° 最小间隔
          return function (d) {
            const mid = (d.current.x0 + d.current.x1) / 2;
            let r = d.current.y1 + 14;

            if (lastAngle !== null && Math.abs(mid - lastAngle) < MIN_DIFF) {
              r += 18;                         // 额外外推
            }
            lastAngle = mid;

            const x = Math.sin(mid) * r;
            const y = -Math.cos(mid) * r;
            return `translate(${x},${y})`;
          };
        })())
        .transition().duration(500)
        .style("opacity", 1);

      // UPDATE exit handled by fadeOutLabels when next navigation happens
    }

    // ------------------------------------------------------------
    // 交互：点击弧段 -> 折叠至该层节点圆盘
    //      点击空白 -> 直接回到顶层，无逐层外扩
    // ------------------------------------------------------------
    let collapsed = false;      // 当前是否处于“折叠”状态
    let collapsedNode = null;   // 被折叠到的节点（弧）

path.on("click", (event, d) => {
  event.stopPropagation();  // 阻止触发背景事件
  fadeOutLabels();
  collapsed = true;
  collapsedNode = d;
  clicked(event, d);        // 利用现成的 zoom 动画：d 成为新的 root
});

    // 空白点击 -> 直接回到顶层，无逐层外扩
container.on("click", () => {
  if (!collapsed) return;
  fadeOutLabels();
  collapsed = false;
  clicked(null, root);
});

    // 点击放大/折叠
    function clicked(event, p) {
      p = p || root;                       // root 表示回到顶层
      // parent.datum(p.parent || root);

      root.each(d => d.target = {
        x0: Math.max(0, Math.min(1, (d.x0 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
        x1: Math.max(0, Math.min(1, (d.x1 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
        y0: Math.max(0, d.y0 - p.y0),
        y1: Math.max(0, d.y1 - p.y0)
      });

      const t = svg.transition().duration(750);

      path.transition(t)
        .tween("data", d => {
          const i = d3.interpolate(d.current, d.target);
          return t => d.current = i(t);
        })
        .attrTween("d", d => () => arc(d.current))
        .on("end", () => {
          updateLabels(p);
        });
    }

    updateLabels(root);

  })();