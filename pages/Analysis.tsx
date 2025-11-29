
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { User, Form, FormResponse, TransactionReason, AnalysisHistory, SystemSettings } from '../types';
import Card from '../components/Card';
import Button from '../components/Button';
import Spinner from '../components/Spinner';
import ChartRenderer from '../components/ChartRenderer';
import { getAnalysis, performSampledAnalysis, getAnalysisSuggestions } from '../services/geminiService';
import DownloadIcon from '../components/icons/DownloadIcon';
import BarChartIcon from '../components/icons/BarChartIcon';
import PieChartIcon from '../components/icons/PieChartIcon';
import DoughnutChartIcon from '../components/icons/DoughnutChartIcon';
import HistoryIcon from '../components/icons/HistoryIcon';
import ConfirmationModal, { ConfirmationModalProps } from '../components/ConfirmationModal';
import CoinIcon from '../components/icons/CoinIcon';


interface AnalysisProps {
  user: User;
  forms: Form[];
  responses: FormResponse[];
  // FIX: Updated prop type to handle async function returning a Promise.
  onTransaction: (userId: string, reason: TransactionReason, context?: { formIds?: string[], formTitles?: string[] }) => Promise<boolean>;
  analysisContext?: { formIds: string[] } | null;
  onNavigate: (page: string) => void;
  analysisHistory: AnalysisHistory[];
  saveAnalysisToHistory: (formIds: string[], formTitles: string[], userPrompt: string, analysisResult: any) => void;
  deleteAnalysisHistory: (historyId: string) => void;
  unlockedAnalysis: {userId: string; formId: string}[];
  systemSettings: SystemSettings;
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

const Analysis: React.FC<AnalysisProps> = ({ user, forms, responses, onTransaction, analysisContext, onNavigate, analysisHistory, saveAnalysisToHistory, deleteAnalysisHistory, unlockedAnalysis, systemSettings }) => {
    const [selectedFormId, setSelectedFormId] = useState<string>('');
    const [userPrompt, setUserPrompt] = useState<string>('');
    const [analysisResult, setAnalysisResult] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
    const [expertSuggestions, setExpertSuggestions] = useState<Array<{title: string, description: string, searchPrompt: string}>>([]);
    const [error, setError] = useState<string>('');
    const [displayedChartType, setDisplayedChartType] = useState<string | null>(null);
    const chartCanvasRef = useRef<HTMLCanvasElement>(null);
    const resultsRef = useRef<HTMLDivElement>(null);
    const [confirmation, setConfirmation] = useState<ConfirmationModalProps | null>(null);
    const analysisContinuationRef = useRef<{ relevantFieldIds: string[] } | null>(null);

    
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

    // Reset suggestions when form changes
    useEffect(() => {
        setExpertSuggestions([]);
        setUserPrompt('');
        setAnalysisResult(null);
    }, [selectedFormId, isMultiFormMode]);

    const getFormsToAnalyze = () => {
        if (isMultiFormMode) {
            return selectedFormsForAnalysis;
        }
        const form = forms.find(f => f.id === selectedFormId);
        return form ? [form] : [];
    };

    // Vérifie si le(s) formulaire(s) sélectionné(s) sont déjà débloqués
    const isAccessUnlocked = useMemo(() => {
        const targetForms = getFormsToAnalyze();
        if (targetForms.length === 0) return false;
        
        // Tous les formulaires ciblés doivent être dans la liste unlockedAnalysis
        return targetForms.every(form => 
            unlockedAnalysis.some(ua => ua.userId === user.id && ua.formId === form.id)
        );
    }, [getFormsToAnalyze, unlockedAnalysis, user.id]);


    const executeSampledAnalysis = async () => {
        const formsToAnalyze = getFormsToAnalyze();
        if (formsToAnalyze.length === 0 || !analysisContinuationRef.current) return;
        
        setIsLoading(true);
        setError('');
        setAnalysisResult(null);

        try {
            const result = await performSampledAnalysis(formsToAnalyze, responses, userPrompt, analysisContinuationRef.current.relevantFieldIds);
            setAnalysisResult(result);
            if (result.chartData) setDisplayedChartType(result.chartData.type);
            saveAnalysisToHistory(formsToAnalyze.map(f=>f.id), formsToAnalyze.map(f=>f.title), userPrompt, result);
            setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        } catch (e) {
            setError('Une erreur est survenue lors de l\'analyse de l\'échantillon. Veuillez réessayer.');
            console.error(e);
        } finally {
            setIsLoading(false);
            analysisContinuationRef.current = null;
        }
    };

    // Nouvelle fonction dédiée uniquement au déblocage (Paiement)
    const handleUnlockAccess = async () => {
        const formsToAnalyze = getFormsToAnalyze();
        if (formsToAnalyze.length === 0) {
            setError(isMultiFormMode ? 'Aucun formulaire sélectionné.' : 'Veuillez sélectionner un formulaire.');
            return;
        }

        const formsToUnlock = formsToAnalyze.filter(form => 
            !unlockedAnalysis.some(ua => ua.userId === user.id && ua.formId === form.id)
        );
        const cost = formsToUnlock.length * systemSettings.coinCosts.aiAnalysis;

        const processUnlock = async () => {
             const transactionContext = {
                formIds: formsToAnalyze.map(f => f.id),
                formTitles: formsToAnalyze.map(f => f.title),
            };
            // La transaction mettra à jour unlockedAnalysis via Firebase, ce qui déclenchera le changement d'état via le useEffect/useMemo
            await onTransaction(user.id, TransactionReason.AiRequest, transactionContext);
        };

        if (cost > 0) {
            setConfirmation({
                isOpen: true,
                title: "Commencer les analyses AI",
                message: (
                    <div className="space-y-3">
                        <p>Vous êtes sur le point d'accéder aux outils d'analyse pour :</p>
                        <ul className="list-disc list-inside bg-slate-100 dark:bg-slate-700 p-3 rounded-md text-sm font-medium">
                            {formsToUnlock.map(f => <li key={f.id}>{f.title}</li>)}
                        </ul>
                        <div className="flex justify-between items-center bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800">
                            <span className="text-yellow-800 dark:text-yellow-200">Frais d'accès :</span>
                            <span className="font-bold text-lg text-yellow-700 dark:text-yellow-300 flex items-center">
                                {cost} <CoinIcon className="w-5 h-5 ml-1" />
                            </span>
                        </div>
                        <p className="text-sm text-slate-500">Une fois l'accès débloqué, vous pourrez effectuer autant d'analyses que vous le souhaitez sur ce formulaire, sans frais supplémentaires.</p>
                    </div>
                ),
                onConfirm: async () => {
                    setConfirmation(null);
                    await processUnlock();
                },
                onClose: () => setConfirmation(null),
                variant: 'primary',
                confirmText: `Payer et Commencer`,
            });
        } else {
            // Déjà débloqué ou gratuit (ne devrait pas arriver souvent ici si isAccessUnlocked est checké, mais sécurité)
            await processUnlock();
        }
    };

    // Fonction pour lancer l'analyse (une fois débloqué)
    const handleRunAnalysis = async (promptToUse?: string) => {
        const finalPrompt = promptToUse || userPrompt;

        if (!finalPrompt.trim()) {
            setError("Veuillez décrire votre besoin d'analyse.");
            return;
        }
        
        const formsToAnalyze = getFormsToAnalyze();
        
        setIsLoading(true);
        setError('');
        setAnalysisResult(null);
        setDisplayedChartType(null);
        // Si on lance une analyse spécifique, on peut cacher les suggestions ou les garder.
        // Pour l'instant on les garde visibles si l'utilisateur veut changer.

        try {
            const result = await getAnalysis(formsToAnalyze, responses, finalPrompt);
            
            if (result.requiresConfirmation) {
                analysisContinuationRef.current = { relevantFieldIds: result.relevantFieldIds };
                setConfirmation({
                    isOpen: true,
                    title: "Confirmation d'Analyse sur Échantillon",
                    message: result.message,
                    onConfirm: () => {
                        setConfirmation(null);
                        executeSampledAnalysis();
                    },
                    onClose: () => {
                        setConfirmation(null);
                        setIsLoading(false);
                    },
                    variant: 'primary',
                    confirmText: 'Oui, continuer',
                    cancelText: 'Non, annuler',
                });
            } else {
                setAnalysisResult(result);
                if (result.chartData) setDisplayedChartType(result.chartData.type);
                saveAnalysisToHistory(formsToAnalyze.map(f=>f.id), formsToAnalyze.map(f=>f.title), finalPrompt, result);
                setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
                setIsLoading(false);
            }
        } catch (e) {
            setError('Une erreur est survenue lors de l\'analyse. Veuillez réessayer.');
            console.error(e);
            setIsLoading(false);
        }
    };

    const handleGetSuggestions = async () => {
        const formsToAnalyze = getFormsToAnalyze();
        if (formsToAnalyze.length === 0) return;

        setIsGeneratingSuggestions(true);
        setError('');
        setExpertSuggestions([]);

        try {
            const suggestions = await getAnalysisSuggestions(formsToAnalyze, responses);
            setExpertSuggestions(suggestions);
        } catch (e) {
            console.error("Error generating suggestions", e);
            setError("Impossible de générer des suggestions pour le moment.");
        } finally {
            setIsGeneratingSuggestions(false);
        }
    };


    const handleLoadHistory = (historyItem: AnalysisHistory) => {
        setError('');
        setIsLoading(false);
        setExpertSuggestions([]); // Clear suggestions when loading history
        
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
                <div style="white-space: pre-wrap; font-family: inherit;">${analysisResult.analysisText.replace(/\n/g, '<br />')}</div>
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
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Analyse Expert IA</h2>
            <Card>
                <div className="space-y-6">
                    {/* Étape 1 : Sélection du formulaire (Toujours visible) */}
                    {isMultiFormMode ? (
                        <div>
                             <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                Formulaires sélectionnés pour l'analyse
                            </label>
                            <div className="mt-1 p-3 bg-slate-100 dark:bg-slate-700/50 rounded-md border border-slate-200 dark:border-slate-600">
                                <ul className="list-disc list-inside text-sm text-slate-800 dark:text-slate-200">
                                    {selectedFormsForAnalysis.map(f => <li key={f.id}>{f.title}</li>)}
                                </ul>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <label htmlFor="form-select" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                Sélectionner un formulaire
                            </label>
                            <select
                                id="form-select"
                                value={selectedFormId}
                                onChange={(e) => setSelectedFormId(e.target.value)}
                                className="mt-1 block w-full pl-3 pr-10 py-3 text-base shadow-sm border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                            >
                                <option value="" disabled>Choisissez un formulaire validé</option>
                                {forms.filter(f => f.status === 'validated').map(form => (
                                    <option key={form.id} value={form.id}>
                                        {form.title}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Étape 2 : Conditionnelle selon l'état de déblocage */}
                    
                    {!isAccessUnlocked ? (
                        // CAS 1 : FORMULAIRE NON DÉBLOQUÉ (Demande de paiement)
                        <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700 text-center">
                            <div className="mx-auto w-16 h-16 bg-primary-100 dark:bg-primary-900/50 rounded-full flex items-center justify-center mb-4">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary-600 dark:text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-medium text-slate-900 dark:text-white">Accès à l'analyse experte</h3>
                            <p className="mt-2 text-slate-600 dark:text-slate-400 max-w-lg mx-auto">
                                Débloquez la puissance de l'IA pour traiter vos données. L'accès inclut des analyses illimitées, la génération de graphiques et l'exportation de rapports.
                            </p>
                            <p className="mt-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
                                Coût unique : {systemSettings.coinCosts.aiAnalysis} Coins
                            </p>
                            <Button 
                                onClick={handleUnlockAccess} 
                                disabled={!selectedFormId && !isMultiFormMode}
                                className="mt-6 w-full sm:w-auto px-8 py-3 text-lg"
                            >
                                Commencer les analyses AI
                            </Button>
                        </div>
                    ) : (
                        // CAS 2 : FORMULAIRE DÉBLOQUÉ (Interface d'analyse)
                        <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700 animate-fadeIn">
                            <div className="flex justify-between items-center mb-4">
                                <label htmlFor="prompt-input" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                   Votre demande d'analyse
                                </label>
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                    Accès débloqué
                                </span>
                            </div>

                            <textarea
                                id="prompt-input"
                                rows={4}
                                value={userPrompt}
                                onChange={(e) => setUserPrompt(e.target.value)}
                                placeholder="Ex: Quelle est la prévalence du diabète chez les hommes de plus de 50 ans ? Y a-t-il une corrélation avec l'IMC ?"
                                className="mt-1 block w-full shadow-sm sm:text-sm border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-md focus:border-primary-500 focus:ring-1 focus:ring-primary-500 p-3"
                            />
                            
                            <div className="mt-4 flex flex-col sm:flex-row gap-3 justify-between items-center">
                                <Button 
                                    onClick={handleGetSuggestions}
                                    disabled={isLoading || isGeneratingSuggestions}
                                    variant="secondary"
                                    className="w-full sm:w-auto border border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-900/10 text-primary-700 dark:text-primary-300 hover:bg-primary-100 dark:hover:bg-primary-900/30"
                                >
                                    {isGeneratingSuggestions ? <Spinner className="w-4 h-4 mr-2" /> : '✨'} Suggestion d'expert
                                </Button>
                                <Button 
                                    onClick={() => handleRunAnalysis()} 
                                    disabled={isLoading || !userPrompt.trim()}
                                    className="w-full sm:w-auto px-6"
                                >
                                    {isLoading ? <Spinner /> : `Lancer l'analyse`}
                                </Button>
                            </div>

                            {/* Section des suggestions d'expert */}
                            {expertSuggestions.length > 0 && (
                                <div className="mt-6">
                                    <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center">
                                        <span className="mr-2">💡</span> Suggestions d'analyses pertinentes pour votre thèse
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {expertSuggestions.map((suggestion, index) => (
                                            <button
                                                key={index}
                                                onClick={() => {
                                                    setUserPrompt(suggestion.searchPrompt);
                                                    handleRunAnalysis(suggestion.searchPrompt);
                                                }}
                                                className="text-left p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-primary-500 dark:hover:border-primary-500 hover:shadow-md transition-all group"
                                            >
                                                <h5 className="font-semibold text-slate-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400">
                                                    {suggestion.title}
                                                </h5>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                                                    {suggestion.description}
                                                </p>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </Card>

            {error && (
                <Card>
                    <p className="text-red-500 text-center">{error}</p>
                </Card>
            )}

            {isLoading && !confirmation?.isOpen && (
                <Card>
                    <div className="flex flex-col items-center justify-center p-8">
                        <Spinner className="w-12 h-12" />
                        <p className="mt-4 font-medium text-slate-600 dark:text-slate-300">MedataAI analyse vos données...</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Calcul des statistiques, recherche de corrélations et génération du rapport.</p>
                    </div>
                </Card>
            )}

            {analysisResult && (
                <div ref={resultsRef}>
                    <Card>
                        <div className="flex justify-between items-center pb-4 border-b border-slate-200 dark:border-slate-700 mb-6 -mt-2 -mx-6 px-6">
                            <h3 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-white">
                                Rapport d'Analyse
                            </h3>
                            <Button onClick={handleExportToWord} variant="secondary" className="!py-1.5 !px-3 !text-sm">
                                <DownloadIcon className="w-4 h-4 mr-2" />
                                Exporter en Word
                            </Button>
                        </div>
                        <div className="prose dark:prose-invert max-w-none prose-p:whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: analysisResult.analysisText.replace(/\n/g, '<br />') }} />
                        
                        {analysisResult.chartData && (
                            <div className="flex justify-between items-center mb-4 mt-6">
                                <h4 className="text-base font-semibold text-slate-800 dark:text-slate-200">
                                    Visualisation Graphique
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
                    Revoyez vos rapports précédents gratuitement.
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
