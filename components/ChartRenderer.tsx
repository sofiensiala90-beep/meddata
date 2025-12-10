
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
}

const isValidHex = (color: string | undefined | null): color is string => {
    if (!color) return false;
    return /^#[0-9A-F]{6}$/i.test(color) || /^#[0-9A-F]{3}$/i.test(color);
};

const ChartRenderer = forwardRef<HTMLCanvasElement, ChartRendererProps>(({ chartData, customColors }, ref) => {
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
        
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);

        const { type, data: { labels, datasets } } = chartData;
        const dataset = datasets[0];
        
        // Use custom colors if provided, otherwise fallback to AI provided colors, then default
        const defaultColors = ['#60A5FA', '#34D399', '#FBBF24', '#F87171', '#A78BFA', '#FB923C', '#EC4899', '#14B8A6'];
        
        let palette = defaultColors;
        if (customColors && customColors.length > 0) {
            palette = customColors;
        }

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
            const paddingTop = 70;
            const paddingX = 50;
            
            const chartWidth = width - 2 * paddingX;
            const chartHeight = height - paddingTop - paddingBottom;
            
            if (chartWidth <= 0 || chartHeight <= 0) return;

            const barWidth = Math.min(50, chartWidth / (dataset.data.length * 2));
            const maxValue = Math.max(...dataset.data, 1);

            ctx.save();
            ctx.font = 'bold 16px sans-serif';
            ctx.fillStyle = '#1e293b';
            ctx.textAlign = 'center';
            ctx.fillText(dataset.label, width / 2, 30);
            ctx.restore();

            ctx.beginPath();
            ctx.moveTo(paddingX, paddingTop);
            ctx.lineTo(paddingX, chartHeight + paddingTop);
            ctx.lineTo(chartWidth + paddingX, chartHeight + paddingTop);
            ctx.strokeStyle = '#cbd5e1';
            ctx.stroke();

            dataset.data.forEach((value, index) => {
                const barHeight = (value / maxValue) * chartHeight;
                const x = paddingX + index * (chartWidth / dataset.data.length) + (chartWidth / dataset.data.length - barWidth) / 2;
                const y = chartHeight + paddingTop - barHeight;

                ctx.fillStyle = colors[index];
                ctx.fillRect(x, y, barWidth, barHeight);

                ctx.save();
                ctx.fillStyle = '#475569';
                ctx.textAlign = 'center';
                ctx.font = '12px sans-serif';
                ctx.fillText(labels[index], x + barWidth / 2, chartHeight + paddingTop + 20);
                
                ctx.fillStyle = '#1e293b';
                ctx.font = 'bold 12px sans-serif';
                ctx.fillText(String(value), x + barWidth / 2, y - 8);
                ctx.restore();
            });
        };

        const drawPieChart = () => {
            const total = dataset.data.reduce((sum, value) => sum + value, 0);
            if (total === 0) return;
            
            const legendWidth = Math.min(200, width * 0.3); // Reserve space for legend
            const chartAreaWidth = width - legendWidth;

            const radius = Math.min(chartAreaWidth, height) * 0.35;
            const centerX = chartAreaWidth / 2;
            const centerY = height / 2;
            
            ctx.save();
            ctx.font = 'bold 16px sans-serif';
            ctx.fillStyle = '#1e293b';
            ctx.textAlign = 'center';
            ctx.fillText(dataset.label, width / 2, 30);
            ctx.restore();

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

            if (type === 'doughnut') {
                ctx.fillStyle = '#FFFFFF';
                ctx.beginPath();
                ctx.arc(centerX, centerY, radius * 0.5, 0, 2 * Math.PI);
                ctx.fill();
            }

            const legendItemHeight = 25;
            const legendX = chartAreaWidth + 20;
            let legendY = (height - (labels.length * legendItemHeight)) / 2;
            
            labels.forEach((label, index) => {
                ctx.fillStyle = colors[index];
                ctx.fillRect(legendX, legendY, 15, 15);
                ctx.save();
                ctx.fillStyle = '#475569';
                ctx.font = '14px sans-serif';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                const percentage = ((dataset.data[index] / total) * 100).toFixed(1);
                ctx.fillText(`${label}: ${percentage}%`, legendX + 25, legendY + 8);
                ctx.restore();
                legendY += legendItemHeight;
            });
        };
        
        switch (type.toLowerCase()) {
            case 'bar':
                drawBarChart();
                break;
            case 'pie':
            case 'doughnut':
                drawPieChart();
                break;
            default:
                 ctx.save();
                 ctx.fillStyle = '#475569';
                 ctx.textAlign = 'center';
                 ctx.font = '16px sans-serif';
                 ctx.fillText(`Type de graphique non supporté: ${type}`, width / 2, height / 2);
                 ctx.restore();
        }
    };

    const resizeObserver = new ResizeObserver(entries => {
        if (!entries || entries.length === 0) return;
        const { width, height } = entries[0].contentRect;
        drawChart(width, height);
    });

    resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, [chartData, canvasRef, customColors]);

  if (!chartData || !chartData.data?.datasets?.[0]?.data) {
    return <p className="text-slate-500 dark:text-slate-400">Données du graphique non valides.</p>;
  }

  return (
    <div ref={containerRef} className="w-full h-96 min-h-[300px]">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        aria-label={`Chart for ${chartData.data.datasets[0].label}`}
      />
    </div>
  );
});

export default ChartRenderer;
