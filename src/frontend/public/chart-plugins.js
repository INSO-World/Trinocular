export const MilestoneLinesPlugin = {
  id: 'milestone-lines',
  // Last event in render pipeline
  beforeDraw: (chart, args, options) => {
    const { ctx, chartArea: { left, right, top, bottom }, scales } = chart;
    const xScale = scales['x'];

    // Get milestones from the plugin options
    const milestones = options.milestones || [];

    ctx.save();
    ctx.lineWidth = options.lineWidth || 1;
    ctx.strokeStyle = options.lineColor || 'red';
    ctx.setLineDash(options.lineDash || []);

    milestones.forEach(milestone => {
      const xPosition = xScale.getPixelForValue(milestone.date);

      if (xPosition >= left && xPosition <= right) {
        const labelOffset = 10;
        const lineOffset = 15

        ctx.beginPath();
        ctx.moveTo(xPosition, top + lineOffset);
        ctx.lineTo(xPosition, bottom);
        ctx.stroke();

        if (options.showLabels && milestone.title) {
          ctx.fillStyle = options.labelColor || 'black';
          ctx.font = options.labelFont || '12px Arial';
          ctx.textAlign = 'center';
          ctx.fillText(milestone.title, xPosition, top + labelOffset);
        }
      }
    });

    ctx.restore();
  }
};
