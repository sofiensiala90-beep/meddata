import React, { useState, useEffect, useRef, useMemo } from 'react';
import { User, Form, FormResponse, TransactionReason, AnalysisHistory } from '../types';
import Card from '../components/Card';
import Button from '../components/Button';
import Spinner from '../components/Spinner';
import ChartRenderer from '../components/ChartRenderer';
import { getAnalysis } from '../services/geminiService';
import DownloadIcon from '../components/icons/DownloadIcon';
import BarChartIcon from '../components/icons/BarChartIcon';
import PieChartIcon from '../components/icons/PieChartIcon';
import DoughnutChartIcon from '../components/icons/DoughnutChartIcon';
import HistoryIcon from '../components/icons/HistoryIcon';
import ConfirmationModal, { ConfirmationModalProps } from '../components/ConfirmationModal';


interface AnalysisProps {
  user: User;
  forms: Form[];
  responses: FormResponse[];
  onTransaction: (userId: string, reason: TransactionReason, context?: { formTitle?: string, formCount?: number }) => boolean;
  analysisContext?: { formIds: string[] } | null;
  onNavigate: (page: string) => void;
  analysisHistory: AnalysisHistory[];
  saveAnalysisToHistory: (formIds: string[], formTitles: string[], userPrompt: string, analysisResult: any) => void;
  deleteAnalysisHistory: (historyId: string) => void;
}

const isValidHex = (color: string | undefined | null): color is string => {
    if (!color) return false;
    // Supports 3 and 6 digit hex codes
    return /^#[0-9A-F]{6}$/i.test(color) || /^#[0-9A-F]{3}$/i.test(color);
};

const ChartTypeButton: React.FC<{ icon: React.ReactNode; label: string; isActive: boolean; onClick: () => void; }> = ({ icon, label, isActive, onClick }) => (
    <button
        onClick={onClick}
        title={`Afficher en graphique ${label.toLowerCase()}`}
        className={`flex items-center space-x-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800 ${
            isActive
            ? 'bg-white dark:bg-slate-800 text-primary-600 dark:text-primary-400 shadow-sm'
            : 'text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-600/50'
        }`}
    >
        {icon}
        <span>{label}</span>
    </button>
);

const Analysis: React.FC<AnalysisProps> = ({ user, forms, responses, onTransaction, analysisContext, onNavigate, analysisHistory, saveAnalysisToHistory, deleteAnalysisHistory }) => {
    const [selectedFormId, setSelectedFormId] = useState<string>('');
    const [userPrompt, setUserPrompt] = useState<string>('');
    const [analysisResult, setAnalysisResult] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string>('');
    const [displayedChartType, setDisplayedChartType] = useState<string | null>(null);
    const chartCanvasRef = useRef<HTMLCanvasElement>(null);
    const resultsRef = useRef<HTMLDivElement>(null);
    const [confirmation, setConfirmation] = useState<ConfirmationModalProps | null>(null);
    
    const isMultiFormMode = user.role === 'admin' && !!analysisContext?.formIds && analysisContext.formIds.length > 0;
    const [selectedFormsForAnalysis, setSelectedFormsForAnalysis] = useState<Form[]>([]);
    const isSuspended = user.role === 'student' && user.status.startsWith('suspended');

    useEffect(() => {
        if (isMultiFormMode && analysisContext?.formIds) {
            const selected = forms.filter(f => analysisContext.formIds.includes(f.id));
            setSelectedFormsForAnalysis(selected);
            setSelectedFormId(''); // Clear single form selection
        } else {
            setSelectedFormsForAnalysis([]);
        }
    }, [analysisContext, forms, isMultiFormMode]);


    const handleAnalysis = async () => {
        const promptIsMissing = !userPrompt.trim();
        if (promptIsMissing) {
            setError("Veuillez décrire votre besoin d'analyse.");
            return;
        }

        let formsToAnalyze: Form[];
        if (isMultiFormMode) {
             if (selectedFormsForAnalysis.length === 0) {
                setError('Aucun formulaire sélectionné pour l\'analyse.');
                return;
            }
            formsToAnalyze = selectedFormsForAnalysis;
        } else {
            if (!selectedFormId) {
                setError('Veuillez sélectionner un formulaire à analyser.');
                return;
            }
            const form = forms.find(f => f.id === selectedFormId);
            if (!form) {
                setError('Le formulaire sélectionné est introuvable.');
                return;
            }
            formsToAnalyze = [form];
        }
        
        const transactionContext = {
            formCount: formsToAnalyze.length,
            formTitle: formsToAnalyze.length === 1 ? formsToAnalyze[0].title : undefined,
        };

        if (!onTransaction(user.id, TransactionReason.AiRequest, transactionContext)) {
            return; 
        }
        
        setIsLoading(true);
        setError('');
        setAnalysisResult(null);
        setDisplayedChartType(null);

        try {
            const responsesToAnalyze = responses.filter(r => formsToAnalyze.map(f => f.id).includes(r.formId));

            if (formsToAnalyze.length === 0 || responsesToAnalyze.length === 0) {
                setError('Aucune réponse à analyser pour le(s) formulaire(s) sélectionné(s).');
                setIsLoading(false);
                return;
            }

            const result = await getAnalysis(formsToAnalyze, responsesToAnalyze, userPrompt);
            setAnalysisResult(result);
             if (result.chartData) {
                setDisplayedChartType(result.chartData.type);
            }
            saveAnalysisToHistory(formsToAnalyze.map(f => f.id), formsToAnalyze.map(f => f.title), userPrompt, result);
            setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);

        } catch (e) {
            setError('Une erreur est survenue lors de l\'analyse. Veuillez réessayer.');
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleLoadHistory = (historyItem: AnalysisHistory) => {
        setError('');
        setIsLoading(false);
        
        setAnalysisResult(historyItem.analysisResult);
        setUserPrompt(historyItem.userPrompt);
    
        if (isMultiFormMode) {
          const selected = forms.filter(f => historyItem.formIds.includes(f.id));
          setSelectedFormsForAnalysis(selected);
        } else {
          setSelectedFormId(historyItem.formIds[0] || '');
        }
        
        if (historyItem.analysisResult.chartData) {
          setDisplayedChartType(historyItem.analysisResult.chartData.type);
        } else {
          setDisplayedChartType(null);
        }
    
        setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    };
    
    const handleDeleteHistoryClick = (item: AnalysisHistory) => {
        setConfirmation({
            isOpen: true,
            title: "Confirmer la suppression",
            message: (
                <>
                    <p>Êtes-vous sûr de vouloir supprimer cet élément de l'historique ?</p>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 border-l-4 border-slate-300 dark:border-slate-600 pl-3">
                        "{item.userPrompt}"
                    </p>
                    <p className="text-red-600 dark:text-red-400 font-semibold mt-3">Cette action est irréversible.</p>
                </>
            ),
            onConfirm: () => {
                deleteAnalysisHistory(item.id);
                setConfirmation(null);
            },
            onClose: () => setConfirmation(null),
            variant: 'danger',
            confirmText: 'Supprimer'
        });
    };

    const handleExportToWord = () => {
        if (!analysisResult) return;

        let chartImageHtml = '';
        if (analysisResult.chartData && chartCanvasRef.current) {
            try {
                // Get the chart as a base64 encoded PNG image
                const chartImage = chartCanvasRef.current.toDataURL('image/png');
                chartImageHtml = `
                    <h2>Visualisation Graphique</h2>
                    <p><img src="${chartImage}" alt="Chart Analysis" style="max-width: 540px; height: auto; border: 1px solid #cccccc;" /></p>
                    <br />
                `;
            } catch (e) {
                console.error("Could not generate chart image for export:", e);
                chartImageHtml = '<h2>Visualisation Graphique</h2><p>L\'image du graphique n\'a pas pu être générée.</p>';
            }
        }

        let chartDataTableHtml = '';
        if (analysisResult.chartData) {
            const { labels, datasets } = analysisResult.chartData.data;
            const dataset = datasets[0];
            const defaultColors = ['#60A5FA', '#34D399', '#FBBF24', '#F87171', '#A78BFA', '#FB923C', '#EC4899', '#14B8A6'];

            chartDataTableHtml = `
                <h2>Données du Graphique : ${dataset.label}</h2>
                <table border="1" style="width:100%; border-collapse: collapse; font-family: Arial, sans-serif;">
                    <thead>
                        <tr style="background-color: #f2f2f2;">
                            <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Label</th>
                            <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Valeur</th>
                            <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Couleur</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${labels.map((label: string, index: number) => {
                            const color = isValidHex(dataset.backgroundColor?.[index]) 
                                ? dataset.backgroundColor![index] 
                                : defaultColors[index % defaultColors.length];
                            return `
                            <tr>
                                <td style="padding: 8px; border: 1px solid #ddd;">${label}</td>
                                <td style="padding: 8px; border: 1px solid #ddd;">${dataset.data[index]}</td>
                                <td style="padding: 8px; border: 1px solid #ddd;">
                                    <table border="0" cellpadding="0" cellspacing="0" style="border:none; font-family: Arial, sans-serif;">
                                        <tr>
                                            <td width="15" height="15" bgcolor="${color}" style="border: 1px solid #cccccc;"></td>
                                            <td style="padding-left: 8px; vertical-align: middle; font-family: monospace;">${color}</td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                        `}).join('')}
                    </tbody>
                </table>
            `;
        }

        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Analyse MedataAI</title>
            </head>
            <body style="font-family: Arial, sans-serif;">
                <h1>Résultats de l'analyse MedataAI</h1>
                <hr>
                <h2>Analyse Textuelle</h2>
                <p>${analysisResult.analysisText.replace(/\n/g, '<br />')}</p>
                <br>
                ${chartImageHtml}
                ${chartDataTableHtml}
            </body>
            </html>
        `;

        const blob = new Blob(['\ufeff', htmlContent], {
            type: 'application/msword'
        });

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'analyse-medata-ai.doc';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };
    
    const chartDataForRenderer = useMemo(() => {
        if (!analysisResult?.chartData || !displayedChartType) return null;
        return {
            ...analysisResult.chartData,
            type: displayedChartType,
        };
    }, [analysisResult, displayedChartType]);


    if (isSuspended) {
        return (
             <div className="space-y-6">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Analyse IA</h2>
                <Card className="!bg-red-50 dark:!bg-red-900/20 border border-red-200 dark:border-red-800">
                    <div className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-red-500 dark:text-red-400 mr-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        <div>
                            <h3 className="text-lg font-semibold text-red-800 dark:text-red-200">Accès refusé</h3>
                            {user.status === 'suspended_manual' ? (
                                <p className="text-red-700 dark:text-red-300 text-sm mt-1">
                                    L'analyse IA est désactivée car votre compte a été suspendu par un administrateur. Veuillez contacter le support pour plus d'informations.
                                </p>
                            ) : (
                                <>
                                    <p className="text-red-700 dark:text-red-300 text-sm mt-1">
                                        L'analyse IA est désactivée car votre compte est suspendu. 
                                        Veuillez recharger votre portefeuille pour y accéder à nouveau.
                                    </p>
                                    <Button variant="danger" className="!bg-red-500 hover:!bg-red-600 mt-3 !py-1.5 !px-3 !text-sm" onClick={() => onNavigate('portefeuille')}>
                                        Aller au Portefeuille
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Analyse IA</h2>
            <Card>
                <div className="space-y-4">
                    {isMultiFormMode ? (
                        <div>
                             <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                1. Formulaires sélectionnés pour l'analyse
                            </label>
                            <div className="mt-1 p-3 bg-slate-100 dark:bg-slate-700/50 rounded-md">
                                <ul className="list-disc list-inside text-sm text-slate-800 dark:text-slate-200">
                                    {selectedFormsForAnalysis.map(f => <li key={f.id}>{f.title}</li>)}
                                </ul>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <label htmlFor="form-select" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                1. Sélectionner un formulaire
                            </label>
                            <select
                                id="form-select"
                                value={selectedFormId}
                                onChange={(e) => setSelectedFormId(e.target.value)}
                                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                            >
                                <option value="" disabled>Choisissez un formulaire validé</option>
                                {forms.filter(f => f.validated).map(form => (
                                    <option key={form.id} value={form.id}>
                                        {form.title}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}


                    <div>
                        <label htmlFor="prompt-input" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                           2. Décrivez votre besoin d'analyse
                        </label>
                        <textarea
                            id="prompt-input"
                            rows={3}
                            value={userPrompt}
                            onChange={(e) => setUserPrompt(e.target.value)}
                            placeholder="Ex: Donne-moi l'âge moyen des patients et crée un graphique à barres des symptômes."
                            className="mt-1 block w-full shadow-sm sm:text-sm border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-md"
                        />
                    </div>

                    <Button 
                        onClick={handleAnalysis} 
                        disabled={isLoading || (isMultiFormMode ? selectedFormsForAnalysis.length === 0 : !selectedFormId) || !userPrompt.trim()}
                    >
                        {isLoading ? <Spinner /> : `Lancer l'analyse (${user.role === 'admin' ? 'Gratuit' : '10 Coins'})`}
                    </Button>
                </div>
            </Card>

            {error && (
                <Card>
                    <p className="text-red-500 text-center">{error}</p>
                </Card>
            )}

            {isLoading && (
                <Card>
                    <div className="flex flex-col items-center justify-center p-8">
                        <Spinner className="w-12 h-12" />
                        <p className="mt-4 text-slate-500 dark:text-slate-400">Analyse en cours...</p>
                    </div>
                </Card>
            )}

            {analysisResult && (
                <div ref={resultsRef}>
                    <Card>
                        <div className="flex justify-between items-center pb-4 border-b border-slate-200 dark:border-slate-700 mb-6 -mt-2 -mx-6 px-6">
                            <h3 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-white">
                                Résultats de l'analyse
                            </h3>
                            <Button onClick={handleExportToWord} variant="secondary" className="!py-1.5 !px-3 !text-sm">
                                <DownloadIcon className="w-4 h-4 mr-2" />
                                Exporter en Word
                            </Button>
                        </div>
                        <div className="prose dark:prose-invert max-w-none">
                        {analysisResult.analysisText && <p className="mb-6 whitespace-pre-wrap">{analysisResult.analysisText}</p>}
                        </div>
                        
                        {analysisResult.chartData && (
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="text-base font-semibold text-slate-800 dark:text-slate-200">
                                    Visualisation
                                </h4>
                                <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-900/50 p-1 rounded-lg">
                                    <ChartTypeButton
                                        icon={<BarChartIcon className="w-5 h-5" />}
                                        label="Barres"
                                        isActive={displayedChartType === 'bar'}
                                        onClick={() => setDisplayedChartType('bar')}
                                    />
                                    <ChartTypeButton
                                        icon={<PieChartIcon className="w-5 h-5" />}
                                        label="Circulaire"
                                        isActive={displayedChartType === 'pie'}
                                        onClick={() => setDisplayedChartType('pie')}
                                    />
                                    <ChartTypeButton
                                        icon={<DoughnutChartIcon className="w-5 h-5" />}
                                        label="Donut"
                                        isActive={displayedChartType === 'doughnut'}
                                        onClick={() => setDisplayedChartType('doughnut')}
                                    />
                                </div>
                            </div>
                        )}

                        {chartDataForRenderer && (
                        <div className="mt-4">
                            <ChartRenderer ref={chartCanvasRef} chartData={chartDataForRenderer} />
                        </div>
                        )}
                    </Card>
                </div>
            )}

            <Card>
                <div className="flex items-center">
                    <HistoryIcon className="w-6 h-6 mr-3 text-slate-500 dark:text-slate-400" />
                    <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Historique d'Analyse</h3>
                </div>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Revoyez vos analyses précédentes gratuitement.
                </p>

                <div className="mt-4 space-y-3 max-h-96 overflow-y-auto">
                    {analysisHistory.length > 0 ? (
                        analysisHistory.map(item => (
                            <div key={item.id} className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg flex justify-between items-center">
                                <div className="flex-grow min-w-0">
                                    <p className="font-semibold text-sm text-slate-800 dark:text-slate-200 truncate" title={item.userPrompt}>
                                        {item.userPrompt}
                                    </p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                        Analysé le {new Date(item.createdAt).toLocaleDateString()} sur : {item.formTitles.join(', ')}
                                    </p>
                                </div>
                                <div className="flex space-x-2 flex-shrink-0 ml-4">
                                    <Button onClick={() => handleLoadHistory(item)} variant="secondary" className="!text-xs !py-1.5 !px-3">
                                        Revoir
                                    </Button>
                                    <Button 
                                        onClick={() => handleDeleteHistoryClick(item)} 
                                        variant="secondary" 
                                        className="!text-xs !py-1.5 !px-3 !bg-transparent hover:!bg-red-100 dark:hover:!bg-red-900/50 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/50 hover:border-red-300 dark:hover:border-red-700"
                                        title="Supprimer l'analyse"
                                    >
                                        Supprimer
                                    </Button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-center text-slate-500 dark:text-slate-400 py-8">
                            Aucun historique d'analyse trouvé.
                        </p>
                    )}
                </div>
            </Card>
             {confirmation && <ConfirmationModal {...confirmation} />}
        </div>
    );
};

export default Analysis;