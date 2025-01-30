export const MilestoneLinesPlugin = {
  id: 'milestone-lines',
  // Last event in render pipeline
  beforeDraw: (chart, args, options) => {
    const {
      ctx,
      chartArea: { left, right, top, bottom },
      scales
    } = chart;
    const primaryScale = scales['x'];

    // Get milestones from the plugin options
    const milestones = options.milestones || [];

    const lineWidth = options.lineWidth || 1;
    const lineColor = options.lineColor || 'red';
    const lineDash = options.lineDash || [];
    const showLabels = options.showLabels;
    const labelColor = options.labelColor || 'black';
    const labelFont = options.labelFont || '12px Arial';

    ctx.save();
    ctx.lineWidth = lineWidth || 1;
    ctx.strokeStyle = lineColor || 'red';
    ctx.setLineDash(lineDash || []);

    for (const milestone of milestones) {
      const xPosition = primaryScale.getPixelForValue(new Date(milestone.dueDate));

      if (xPosition >= left && xPosition <= right) {
        const labelOffset = 10;
        const lineOffset = 15;

        ctx.beginPath();
        ctx.moveTo(xPosition, top + lineOffset);
        ctx.lineTo(xPosition, bottom);
        ctx.stroke();

        if (showLabels && milestone.title) {
          ctx.fillStyle = labelColor || 'black';
          ctx.font = labelFont || '12px Arial';
          ctx.textAlign = 'center';
          ctx.fillText(milestone.title, xPosition, top + labelOffset);
        }
      }
    }

    ctx.restore();
  }
};
