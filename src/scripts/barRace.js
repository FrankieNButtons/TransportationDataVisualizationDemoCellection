(function(){
  function renderBarRace(selector){
    const W=600,H=400,BAR_H=28,MARGIN_R=80,N=10;
    const svg=d3.select(selector).append('svg')
                .attr('width',W).attr('height',H);
    const x=d3.scaleLinear().domain([0,100]).range([0,W-MARGIN_R]);

    // 十种载具类型与对应颜色
    const vehicleTypes = [
      "小轿车","货车","摩托车","公交车","出租车",
      "卡车","电动车","自行车","巴士","三轮车"
    ];
    const colorScale = d3.scaleOrdinal()
      .domain(vehicleTypes)
      .range([
        "#e6194b","#3cb44b","#ffe119","#4363d8","#f58231",
        "#911eb4","#46f0f0","#f032e6","#bcf60c","#fabebe"
      ]);

    function update(){
      const data = vehicleTypes.map(name => ({ name, value: Math.random() * 100 }))
        .sort((a, b) => b.value - a.value);

      const rows=svg.selectAll('g.row').data(data,d=>d.name);

      const enter=rows.enter().append('g').attr('class','row');
      enter.append('rect').attr('height',BAR_H);
      enter.append('text').attr('dy','.9em').style('font-size',12);

      const all=enter.merge(rows);
      all.transition().duration(750).attr('transform',(d,i)=>`translate(0,${i*(BAR_H+2)})`);
      all.select('rect').transition().duration(750)
        .attr('width', d => x(d.value))
        .attr('fill', d => colorScale(d.name));
      all.select('text').transition().duration(750)
         .attr('x',d=>x(d.value)+5).text(d=>`${d.name} ${d.value.toFixed(0)}`);

      rows.exit().remove();
    }

    update();
    setInterval(update,2000);
  }

  renderBarRace('#bar-race-viz');
  window.renderBarRace=renderBarRace;
})();