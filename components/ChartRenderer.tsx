import React, { useEffect, useRef, forwardRef } from 'react';

interface ChartData {
  type: string;
  data: {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      backgroundColor?: string[];
    }[];
  };
}

interface ChartRendererProps {
  chartData: ChartData;
  customColors?: string[];
  forcedType?: 'bar' | 'pie' | 'doughnut' | null;
}

const isValidHex = (color: string | undefined | null): color is string => {
    if (!color) return false;
    return /^#[0-9A-F]{6}$/i.test(color) || /^#[0-9A-F]{3}$/i.test(color);
};

const ChartRenderer = forwardRef<HTMLCanvasElement, ChartRendererProps>(({ chartData, customColors, forcedType }, ref) => {
  const internalCanvasRef = useRef<HTMLCanvasElement>(null);
  const canvasRef = ref || internalCanvasRef;
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartData) return;

    const canvas = (canvasRef as React.RefObject<HTMLCanvasElement>)?.current;
    const container = containerRef.current;

    if (!canvas || !container) return;

    const drawChart = (width: number, height: number) => {
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        ctx.scale(dpr, dpr);
        
        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        const { type: originalType, data: { labels, datasets } } = chartData;
        const dataset = datasets[0];
        
        // Determine type to draw
        const chartTypeToDraw = forcedType || originalType;
        
        // Use custom colors if provided, otherwise fallback to AI provided colors, then default
        const defaultColors = ['#60A5FA', '#34D399', '#FBBF24', '#F87171', '#A78BFA', '#FB923C', '#EC4899', '#14B8A6'];
        
        const colors = dataset.data.map((_, index) => {
            // Prioritize custom palette override if provided
            if (customColors && customColors.length > 0) {
                return customColors[index % customColors.length];
            }
            // Then check for AI provided colors
            if (isValidHex(dataset.backgroundColor?.[index])) {
                return dataset.backgroundColor![index];
            }
            // Fallback to default
            return defaultColors[index % defaultColors.length];
        });

        const drawBarChart = () => {
            const paddingBottom = 50;
            const paddingTop = 50;
            const paddingX = 50;
            
            const chartWidth = width - 2 * paddingX;
            const chartHeight = height - paddingTop - paddingBottom;
            
            if (chartWidth <= 0 || chartHeight <= 0) return;

            const barWidth = Math.min(50, chartWidth / (dataset.data.length * 2));
            const maxValue = Math.max(...dataset.data, 1);

            // Draw Axes
            ctx.beginPath();
            ctx.moveTo(paddingX, paddingTop);
            ctx.lineTo(paddingX, chartHeight + paddingTop);
            ctx.lineTo(chartWidth + paddingX, chartHeight + paddingTop);
            ctx.strokeStyle = '#cbd5e1';
            ctx.lineWidth = 1;
            ctx.stroke();

            dataset.data.forEach((value, index) => {
                const barHeight = (value / maxValue) * chartHeight;
                const x = paddingX + index * (chartWidth / dataset.data.length) + (chartWidth / dataset.data.length - barWidth) / 2;
                const y = chartHeight + paddingTop - barHeight;

                ctx.fillStyle = colors[index];
                // Simple rounded top corners simulation
                ctx.fillRect(x, y, barWidth, barHeight);

                ctx.save();
                ctx.fillStyle = '#475569';
                ctx.textAlign = 'center';
                ctx.font = '11px sans-serif';
                // Truncate long labels
                let label = labels[index] || '';
                if (label.length > 10) label = label.substring(0, 8) + '..';
                ctx.fillText(label, x + barWidth / 2, chartHeight + paddingTop + 20);
                
                ctx.fillStyle = '#1e293b';
                ctx.font = 'bold 12px sans-serif';
                ctx.fillText(String(value), x + barWidth / 2, y - 5);
                ctx.restore();
            });
        };

        const drawPieChart = (isDoughnut: boolean) => {
            const total = dataset.data.reduce((sum, value) => sum + value, 0);
            if (total === 0) return;
            
            // Layout: Chart on left, Legend on right (if space permits)
            const isWide = width > 400;
            const legendWidth = isWide ? 150 : 0;
            const chartAreaWidth = width - legendWidth;

            const radius = Math.min(chartAreaWidth, height) * 0.35;
            const centerX = isWide ? chartAreaWidth / 2 : width / 2;
            const centerY = height / 2;
            
            let startAngle = -0.5 * Math.PI;

            dataset.data.forEach((value, index) => {
                const sliceAngle = (value / total) * 2 * Math.PI;
                ctx.fillStyle = colors[index];
                ctx.beginPath();
                ctx.moveTo(centerX, centerY);
                ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
                ctx.closePath();
                ctx.fill();
                startAngle += sliceAngle;
            });

            if (isDoughnut) {
                ctx.fillStyle = '#FFFFFF'; // Assuming white background, ideally transparent logic
                ctx.globalCompositeOperation = 'destination-out';
                ctx.beginPath();
                ctx.arc(centerX, centerY, radius * 0.55, 0, 2 * Math.PI);
                ctx.fill();
                ctx.globalCompositeOperation = 'source-over';
                
                // Draw Total in center
                ctx.fillStyle = '#1e293b';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.font = 'bold 20px sans-serif';
                ctx.fillText(String(total), centerX, centerY);
            }

            // Draw Legend if wide enough or separate logic
            if (isWide) {
                const legendItemHeight = 20;
                const legendX = chartAreaWidth + 10;
                let legendY = (height - (labels.length * legendItemHeight)) / 2;
                
                labels.forEach((label, index) => {
                    ctx.fillStyle = colors[index];
                    ctx.fillRect(legendX, legendY, 12, 12);
                    ctx.save();
                    ctx.fillStyle = '#475569';
                    ctx.font = '11px sans-serif';
                    ctx.textAlign = 'left';
                    ctx.textBaseline = 'middle';
                    const percentage = ((dataset.data[index] / total) * 100).toFixed(0);
                    let text = `${label} (${percentage}%)`;
                    if (text.length > 20) text = text.substring(0, 18) + '..';
                    ctx.fillText(text, legendX + 20, legendY + 6);
                    ctx.restore();
                    legendY += legendItemHeight + 5;
                });
            }
        };
        
        switch (chartTypeToDraw.toLowerCase()) {
            case 'bar':
                drawBarChart();
                break;
            case 'pie':
                drawPieChart(false);
                break;
            case 'doughnut':
                drawPieChart(true);
                break;
            default:
                 // Fallback to bar
                 drawBarChart();
        }
    };

    const resizeObserver = new ResizeObserver(entries => {
        if (!entries || entries.length === 0) return;
        const { width, height } = entries[0].contentRect;
        drawChart(width, height);
    });

    resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, [chartData, canvasRef, customColors, forcedType]);

  if (!chartData || !chartData.data?.datasets?.[0]?.data) {
    return <p className="text-slate-500 dark:text-slate-400 text-sm p-4">Données du graphique non disponibles.</p>;
  }

  return (
    <div ref={containerRef} className="w-full h-72 min-h-[250px]">
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        aria-label={`Chart for ${chartData.data.datasets[0].label}`}
      />
    </div>
  );
});

export default ChartRenderer;