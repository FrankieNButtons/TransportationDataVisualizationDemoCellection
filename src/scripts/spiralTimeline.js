(function(){
  function renderSpiral(selector){
    const W=600,H=400,R=180,TURNS=4,PTS=200;
    const g=d3.select(selector).append('svg')
              .attr('width',W).attr('height',H)
              .append('g').attr('transform',`translate(${W/2},${H/2})`);

    const data=d3.range(PTS).map(i=>{
      const theta=i/PTS*TURNS*2*Math.PI;
      const traffic=Math.abs(Math.sin(theta*3 + Math.random()))*100; // 模拟流量值
      return {theta,r:i/PTS*R, traffic};
    });

    g.append('path')
      .datum(data)
      .attr('d',d3.lineRadial().angle(d=>d.theta).radius(d=>d.r))
      .attr('fill','none').attr('stroke','#6a5acd').attr('stroke-width', d => 1 + d3.max(data, d => d.traffic) / 100);

    g.selectAll('circle')
      .data(data.filter(()=>Math.random()<0.15))
      .enter().append('circle')
      .attr('transform',d=>`rotate(${d.theta*180/Math.PI}) translate(${d.r},0)`)
      .attr('r',d => 3 + d.traffic/50)
      .attr('fill',d => d.traffic > 80 ? '#ff4500' : '#e75480')
      .attr('opacity',.85);

    // 添加交通数据可视化图例
    const legend = g.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${-W/2 + 20},${-H/2 + 20})`);
    // 趋势线图例
    legend.append('line')
      .attr('x1', 0).attr('y1', 0).attr('x2', 20).attr('y2', 0)
      .attr('stroke', '#6a5acd').attr('stroke-width', 2);
    legend.append('text')
      .attr('x', 25).attr('y', 5)
      .text('交通流量趋势')
      .style('font-size', '12px')
      .style('alignment-baseline', 'middle');
    // 流量监测点图例
    legend.append('circle')
      .attr('cx', 0).attr('cy', 20).attr('r', 4)
      .attr('fill', '#e75480').attr('opacity', 0.8);
    legend.append('text')
      .attr('x', 10).attr('y', 23)
      .text('流量监测点')
      .style('font-size', '12px')
      .style('alignment-baseline', 'middle');
    // 流量高峰图例（大圆点，橙红色）
    legend.append('circle')
      .attr('cx', 0).attr('cy', 40).attr('r', 6)
      .attr('fill', '#ff4500').attr('opacity', 0.85);
    legend.append('text')
      .attr('x', 10).attr('y', 44)
      .text('流量高峰')
      .style('font-size', '12px')
      .style('alignment-baseline', 'middle');

  }

  renderSpiral('#spiral-viz');
  window.renderSpiral=renderSpiral;
})();