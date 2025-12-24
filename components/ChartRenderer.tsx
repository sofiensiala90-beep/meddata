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
        const isDarkMode = document.documentElement.classList.contains('dark');
        
        // Couleurs adaptatives
        const textColorPrimary = isDarkMode ? '#f8fafc' : '#1e293b'; // Slate 50 vs Slate 900
        const textColorSecondary = isDarkMode ? '#94a3b8' : '#64748b'; // Slate 400 vs Slate 500
        const axisColor = isDarkMode ? '#334155' : '#e2e8f0'; // Slate 700 vs Slate 200

        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        ctx.scale(dpr, dpr);
        
        // Nettoyage du canvas
        ctx.clearRect(0, 0, width, height);

        const { type: originalType, data: { labels, datasets } } = chartData;
        const dataset = datasets[0];
        const chartTypeToDraw = (forcedType || originalType).toLowerCase();
        
        const defaultColors = ['#14b8a6', '#0f766e', '#2dd4bf', '#5eead4', '#99f6e4', '#ccfbf1', '#0d9488', '#042f2e'];
        const colors = dataset.data.map((_, index) => {
            if (customColors && customColors.length > 0) return customColors[index % customColors.length];
            if (isValidHex(dataset.backgroundColor?.[index])) return dataset.backgroundColor![index];
            return defaultColors[index % defaultColors.length];
        });

        const drawBarChart = () => {
            const paddingBottom = 60;
            const paddingTop = 30;
            const paddingX = 40;
            
            const chartWidth = width - 2 * paddingX;
            const chartHeight = height - paddingTop - paddingBottom;
            
            if (chartWidth <= 0 || chartHeight <= 0) return;

            const totalBars = dataset.data.length;
            const barContainerWidth = chartWidth / totalBars;
            const barWidth = Math.min(40, barContainerWidth * 0.7);
            const maxValue = Math.max(...dataset.data, 1);

            // Dessin des axes
            ctx.beginPath();
            ctx.moveTo(paddingX, paddingTop);
            ctx.lineTo(paddingX, chartHeight + paddingTop);
            ctx.lineTo(chartWidth + paddingX, chartHeight + paddingTop);
            ctx.strokeStyle = axisColor;
            ctx.lineWidth = 1;
            ctx.stroke();

            dataset.data.forEach((value, index) => {
                const barHeight = (value / maxValue) * chartHeight;
                const x = paddingX + index * barContainerWidth + (barContainerWidth - barWidth) / 2;
                const y = chartHeight + paddingTop - barHeight;

                // Barre avec coins arrondis
                ctx.fillStyle = colors[index];
                const radius = 4;
                ctx.beginPath();
                ctx.moveTo(x, y + barHeight);
                ctx.lineTo(x, y + radius);
                ctx.quadraticCurveTo(x, y, x + radius, y);
                ctx.lineTo(x + barWidth - radius, y);
                ctx.quadraticCurveTo(x + barWidth, y, x + barWidth, y + radius);
                ctx.lineTo(x + barWidth, y + barHeight);
                ctx.closePath();
                ctx.fill();

                // Affichage de la valeur AU-DESSUS de la barre (Adapté Dark Mode)
                ctx.save();
                ctx.fillStyle = textColorPrimary;
                ctx.font = 'bold 11px Inter, sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(String(value), x + barWidth / 2, y - 8);
                ctx.restore();

                // Gestion des labels X
                ctx.save();
                ctx.translate(x + barWidth / 2, chartHeight + paddingTop + 15);
                
                let label = labels[index] || '';
                const isTooMany = totalBars > 6 || barContainerWidth < 60;
                
                if (isTooMany) {
                    ctx.rotate(Math.PI / 4);
                    ctx.textAlign = 'left';
                    if (label.length > 15) label = label.substring(0, 12) + '...';
                } else {
                    ctx.textAlign = 'center';
                    if (label.length > 12) label = label.substring(0, 10) + '...';
                }
                
                ctx.fillStyle = textColorSecondary;
                ctx.font = '500 10px Inter, sans-serif';
                ctx.fillText(label, 0, 0);
                ctx.restore();
            });
        };

        const drawPieChart = (isDoughnut: boolean) => {
            const total = dataset.data.reduce((sum, value) => sum + value, 0);
            if (total === 0) return;
            
            const isWide = width > 500;
            const legendSpace = isWide ? 180 : 0;
            const chartAreaWidth = width - legendSpace;
            const centerX = isWide ? (chartAreaWidth / 2) + 20 : width / 2;
            const centerY = isWide ? height / 2 : height * 0.45;
            const radius = Math.min(chartAreaWidth, height) * (isWide ? 0.38 : 0.32);
            
            let startAngle = -0.5 * Math.PI;

            dataset.data.forEach((value, index) => {
                const sliceAngle = (value / total) * 2 * Math.PI;
                const endAngle = startAngle + sliceAngle;
                
                ctx.fillStyle = colors[index];
                ctx.beginPath();
                ctx.moveTo(centerX, centerY);
                ctx.arc(centerX, centerY, radius, startAngle, endAngle);
                ctx.closePath();
                ctx.fill();
                
                ctx.strokeStyle = isDarkMode ? '#1e293b' : '#fff';
                ctx.lineWidth = 2;
                ctx.stroke();

                if (sliceAngle > 0.15) {
                    const midAngle = startAngle + sliceAngle / 2;
                    const labelRadius = radius * (isDoughnut ? 0.75 : 0.65);
                    const lx = centerX + Math.cos(midAngle) * labelRadius;
                    const ly = centerY + Math.sin(midAngle) * labelRadius;
                    
                    ctx.save();
                    ctx.fillStyle = '#fff';
                    ctx.shadowColor = 'rgba(0,0,0,0.5)';
                    ctx.shadowBlur = 4;
                    ctx.font = 'bold 11px Inter, sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    const pct = ((value / total) * 100).toFixed(0);
                    ctx.fillText(`${pct}%`, lx, ly);
                    ctx.restore();
                }

                startAngle = endAngle;
            });

            if (isDoughnut) {
                ctx.save();
                ctx.globalCompositeOperation = 'destination-out';
                ctx.beginPath();
                ctx.arc(centerX, centerY, radius * 0.6, 0, 2 * Math.PI);
                ctx.fill();
                ctx.restore();
                
                ctx.fillStyle = textColorPrimary;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.font = 'bold 22px Inter, sans-serif';
                ctx.fillText(String(total), centerX, centerY - 5);
                ctx.font = '500 10px Inter, sans-serif';
                ctx.fillStyle = textColorSecondary;
                ctx.fillText('TOTAL', centerX, centerY + 12);
            }

            const drawLegend = (lx: number, ly: number, vertical: boolean) => {
                const itemHeight = 18;
                let curX = lx;
                let curY = ly;

                labels.forEach((label, index) => {
                    const value = dataset.data[index];
                    const pct = ((value / total) * 100).toFixed(1);
                    
                    ctx.fillStyle = colors[index];
                    ctx.beginPath();
                    ctx.roundRect(curX, curY - 10, 10, 10, 2);
                    ctx.fill();

                    ctx.fillStyle = textColorPrimary;
                    ctx.font = 'bold 10px Inter, sans-serif';
                    ctx.textAlign = 'left';
                    let text = `${label}`;
                    if (text.length > 20) text = text.substring(0, 18) + '..';
                    ctx.fillText(text, curX + 16, curY - 1);
                    
                    ctx.fillStyle = textColorSecondary;
                    ctx.font = '500 10px Inter, sans-serif';
                    ctx.fillText(`${value} (${pct}%)`, curX + 16, curY + 10);

                    if (vertical) {
                        curY += itemHeight + 12;
                    } else {
                        curX += 100;
                        if (curX > width - 100) { curX = lx; curY += 30; }
                    }
                });
            };

            if (isWide) {
                drawLegend(chartAreaWidth + 10, (height - (labels.length * 30)) / 2 + 10, true);
            } else {
                drawLegend(20, height - 50, false);
            }
        };
        
        if (chartTypeToDraw === 'bar') drawBarChart();
        else if (chartTypeToDraw === 'pie') drawPieChart(false);
        else if (chartTypeToDraw === 'doughnut') drawPieChart(true);
        else drawBarChart();
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
    return <div className="flex items-center justify-center h-72 bg-slate-50 dark:bg-slate-900/20 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-slate-400 text-sm italic">Données non disponibles</div>;
  }

  return (
    <div ref={containerRef} className="w-full h-80 min-h-[300px] relative overflow-hidden">
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        aria-label={`Graphique : ${chartData.data.datasets[0].label}`}
      />
    </div>
  );
});

export default ChartRenderer;