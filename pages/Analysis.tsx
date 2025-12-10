
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { User, Form, FormResponse, TransactionReason, AnalysisHistory, SystemSettings } from '../types';
import Card from '../components/Card';
import Button from '../components/Button';
import Spinner from '../components/Spinner';
import ChartRenderer from '../components/ChartRenderer';
import { getAnalysis, getAnalysisSuggestions } from '../services/geminiService';
import DownloadIcon from '../components/icons/DownloadIcon';
import BarChartIcon from '../components/icons/BarChartIcon';
import PieChartIcon from '../components/icons/PieChartIcon';
import DoughnutChartIcon from '../components/icons/DoughnutChartIcon';
import ConfirmationModal, { ConfirmationModalProps } from '../components/ConfirmationModal';
import CoinIcon from '../components/icons/CoinIcon';
import ChatIcon from '../components/icons/ChatIcon';
import HistoryIcon from '../components/icons/HistoryIcon';
import TrashIcon from '../components/icons/TrashIcon';

interface AnalysisProps {
  user: User;
  forms: Form[];
  responses: FormResponse[];
  onTransaction: (userId: string, reason: TransactionReason, context?: { formIds?: string[], formTitles?: string[] }) => Promise<boolean>;
  analysisContext?: { formIds: string[] } | null;
  onNavigate: (page: string) => void;
  analysisHistory: AnalysisHistory[];
  saveAnalysisToHistory: (formIds: string[], formTitles: string[], userPrompt: string, analysisResult: any) => void;
  deleteAnalysisHistory: (historyId: string) => void;
  unlockedAnalysis: {userId: string; formId: string}[];
  systemSettings: SystemSettings;
}

const PALETTES = [
    { name: 'Standard', colors: [] }, // Empty uses AI default or renderer default
    { name: 'Océan', colors: ['#0ea5e9', '#38bdf8', '#7dd3fc', '#0284c7', '#0369a1'] },
    { name: 'Forêt', colors: ['#10b981', '#34d399', '#6ee7b7', '#059669', '#047857'] },
    { name: 'Chaud', colors: ['#f59e0b', '#fbbf24', '#fcd34d', '#d97706', '#b45309'] },
    { name: 'Violet', colors: ['#8b5cf6', '#a78bfa', '#c4b5fd', '#7c3aed', '#6d28d9'] },
    { name: 'Vibrant', colors: ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'] },
    { name: 'Pastel', colors: ['#fca5a5', '#fdba74', '#86efac', '#93c5fd', '#c4b5fd'] },
    { name: 'Gris', colors: ['#94a3b8', '#cbd5e1', '#64748b', '#475569', '#334155'] },
];

const ChartTypeButton: React.FC<{ icon: React.ReactNode; label: string; isActive: boolean; onClick: () => void; }> = ({ icon, label, isActive, onClick }) => (
    <button
        onClick={onClick}
        title={`Afficher tous les graphiques en ${label.toLowerCase()}`}
        className={`flex items-center space-x-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800 ${
            isActive
            ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300'
            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
        }`}
    >
        {icon}
        <span className="hidden sm:inline">{label}</span>
    </button>
);

const ChatMessageBubble: React.FC<{ role: 'user' | 'ai'; text: string; isError?: boolean }> = ({ role, text, isError }) => (
    <div className={`flex flex-col ${role === 'user' ? 'items-end' : 'items-start'} mb-4`}>
        <div className={`max-w-[90%] px-4 py-3 rounded-2xl text-sm whitespace-pre-wrap shadow-sm ${
            role === 'user' 
                ? 'bg-primary-600 text-white rounded-br-none' 
                : isError 
                    ? 'bg-red-50 text-red-700 border border-red-200 rounded-bl-none'
                    : 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-600 rounded-bl-none'
        }`}>
            {text}
        </div>
        <span className="text-[10px] text-slate-400 mt-1 px-1">
            {role === 'user' ? 'Vous' : 'MedataAI'}
        </span>
    </div>
);

const HistoryModal: React.FC<{
    history: AnalysisHistory[];
    onClose: () => void;
    onLoad: (item: AnalysisHistory) => void;
    onDelete: (id: string) => void;
}> = ({ history, onClose, onLoad, onDelete }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-[100] p-4" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-white dark:bg-slate-800 rounded-t-lg sticky top-0 z-10">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center">
                        <HistoryIcon className="w-5 h-5 mr-2" />
                        Historique des analyses
                    </h3>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-700 rounded-full">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </header>
                <main className="flex-1 overflow-y-auto p-4 bg-slate-50 dark:bg-slate-900/50">
                    {history.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-500 dark:text-slate-400">
                            <HistoryIcon className="w-12 h-12 mb-3 opacity-20" />
                            <p>Aucune analyse enregistrée pour le moment.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {[...history].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(item => (
                                <div key={item.id} className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 hover:border-primary-300 dark:hover:border-primary-700 transition-all">
                                    <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center text-xs text-slate-500 dark:text-slate-400 mb-1">
                                                <span className="bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded mr-2">
                                                    {new Date(item.createdAt).toLocaleDateString()}
                                                </span>
                                                <span>{new Date(item.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                            </div>
                                            <h4 className="font-semibold text-slate-800 dark:text-slate-200 truncate pr-2 mb-1">
                                                {item.formTitles.join(', ')}
                                            </h4>
                                            <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2 bg-slate-50 dark:bg-slate-900/50 p-2 rounded italic border-l-2 border-primary-400">
                                                "{item.userPrompt}"
                                            </p>
                                        </div>
                                        <div className="flex sm:flex-col gap-2 shrink-0 w-full sm:w-auto">
                                            <Button 
                                                onClick={() => { onLoad(item); onClose(); }} 
                                                className="flex-1 sm:w-24 justify-center !text-xs !py-2"
                                            >
                                                Charger
                                            </Button>
                                            <Button 
                                                onClick={(e) => { e.stopPropagation(); onDelete(item.id); }} 
                                                variant="danger" 
                                                className="flex-1 sm:w-24 justify-center !text-xs !py-2 !bg-white dark:!bg-transparent hover:!bg-red-50 dark:hover:!bg-red-900/20 text-red-600 border border-red-200 dark:border-red-800"
                                            >
                                                Supprimer
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

const Analysis: React.FC<AnalysisProps> = ({ user, forms, responses, onTransaction, analysisContext, onNavigate, analysisHistory, saveAnalysisToHistory, deleteAnalysisHistory, unlockedAnalysis, systemSettings }) => {
    // Selection State
    const [selectedFormId, setSelectedFormId] = useState<string>('');
    const [selectedFormsForAnalysis, setSelectedFormsForAnalysis] = useState<Form[]>([]);
    
    // Chat & Analysis State
    const [chatHistory, setChatHistory] = useState<Array<{role: 'user' | 'ai', text: string, isError?: boolean}>>([]);
    const [userPrompt, setUserPrompt] = useState<string>('');
    const [analysisResult, setAnalysisResult] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
    const [expertSuggestions, setExpertSuggestions] = useState<Array<{title: string, description: string, searchPrompt: string}>>([]);
    const [displayedChartType, setDisplayedChartType] = useState<string | null>(null);
    const [colorPaletteIndex, setColorPaletteIndex] = useState(0);
    const [mobileTab, setMobileTab] = useState<'chat' | 'report'>('chat');
    
    // UI Refs & Modal
    const chatEndRef = useRef<HTMLDivElement>(null);
    const [confirmation, setConfirmation] = useState<ConfirmationModalProps | null>(null);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

    const isMultiFormMode = user.role === 'admin' && !!analysisContext?.formIds && analysisContext.formIds.length > 0;
    const isSuspended = user.role === 'student' && user.status.startsWith('suspended');

    // Initialization
    useEffect(() => {
        if (isMultiFormMode && analysisContext?.formIds) {
            const selected = forms.filter(f => analysisContext.formIds.includes(f.id));
            setSelectedFormsForAnalysis(selected);
            setSelectedFormId(''); 
        } else {
            setSelectedFormsForAnalysis([]);
        }
    }, [analysisContext, forms, isMultiFormMode]);

    // Scroll to bottom of chat
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatHistory, isLoading]);

    // Auto-switch to report tab on mobile when result arrives
    useEffect(() => {
        if (analysisResult) {
            setMobileTab('report');
        }
    }, [analysisResult]);

    // Get active forms
    const getFormsToAnalyze = () => {
        if (isMultiFormMode) return selectedFormsForAnalysis;
        const form = forms.find(f => f.id === selectedFormId);
        return form ? [form] : [];
    };

    // Check Access
    const isAccessUnlocked = useMemo(() => {
        if (user.role === 'admin') return true;
        const targetForms = getFormsToAnalyze();
        if (targetForms.length === 0) return false;
        return targetForms.every(form => 
            unlockedAnalysis.some(ua => ua.userId === user.id && ua.formId === form.id)
        );
    }, [selectedFormId, selectedFormsForAnalysis, unlockedAnalysis, user.id, user.role]);

    // Helper to normalize charts (backward compatibility)
    const getCharts = useMemo(() => {
        if (!analysisResult) return [];
        if (analysisResult.charts && Array.isArray(analysisResult.charts)) {
            return analysisResult.charts;
        }
        if (analysisResult.chartData) {
            return [{ ...analysisResult.chartData, title: 'Visualisation principale' }];
        }
        return [];
    }, [analysisResult]);

    // Handle Unlock/Payment
    const handleUnlockAccess = async () => {
        const formsToAnalyze = getFormsToAnalyze();
        if (formsToAnalyze.length === 0) return;

        const formsToUnlock = formsToAnalyze.filter(form => 
            !unlockedAnalysis.some(ua => ua.userId === user.id && ua.formId === form.id)
        );
        const cost = formsToUnlock.length * systemSettings.coinCosts.aiAnalysis;

        const processUnlock = async () => {
             const transactionContext = {
                formIds: formsToAnalyze.map(f => f.id),
                formTitles: formsToAnalyze.map(f => f.title),
            };
            await onTransaction(user.id, TransactionReason.AiRequest, transactionContext);
        };

        if (cost > 0) {
            setConfirmation({
                isOpen: true,
                title: "Débloquer l'analyse",
                message: (
                    <div className="space-y-3">
                        <p>Accéder aux outils d'analyse pour :</p>
                        <ul className="list-disc list-inside bg-slate-100 dark:bg-slate-700 p-3 rounded-md text-sm font-medium">
                            {formsToUnlock.map(f => <li key={f.id}>{f.title}</li>)}
                        </ul>
                        <div className="flex justify-between items-center bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800">
                            <span className="text-yellow-800 dark:text-yellow-200">Coût :</span>
                            <span className="font-bold text-lg text-yellow-700 dark:text-yellow-300 flex items-center">
                                {cost} <CoinIcon className="w-5 h-5 ml-1" />
                            </span>
                        </div>
                    </div>
                ),
                onConfirm: async () => {
                    setConfirmation(null);
                    await processUnlock();
                },
                onClose: () => setConfirmation(null),
                variant: 'primary',
                confirmText: `Payer et Débloquer`,
            });
        } else {
            await processUnlock();
        }
    };

    // Run Analysis (Creation or Refinement)
    const handleRunAnalysis = async (promptToUse?: string) => {
        const finalPrompt = promptToUse || userPrompt;
        if (!finalPrompt.trim()) return;

        const formsToAnalyze = getFormsToAnalyze();
        
        // Update UI state
        setChatHistory(prev => [...prev, { role: 'user', text: finalPrompt }]);
        setUserPrompt('');
        setIsLoading(true);
        // We do NOT clear expertSuggestions here, so they persist

        try {
            // Pass previousResult to enable "Refinement Mode" in the service
            const result = await getAnalysis(formsToAnalyze, responses, finalPrompt, analysisResult);
            
            setAnalysisResult(result);
            setDisplayedChartType(null); // Reset forced chart type on new analysis
            
            // Save to history (optional, keeping old behavior logic)
            saveAnalysisToHistory(formsToAnalyze.map(f=>f.id), formsToAnalyze.map(f=>f.title), finalPrompt, result);
            
            // Afficher le message dynamique de l'IA (chatResponse)
            const aiMessage = result.chatResponse || "Analyse mise à jour. Vous pouvez me demander de modifier les graphiques, de simplifier le texte ou d'ajouter d'autres éléments.";
            setChatHistory(prev => [...prev, { role: 'ai', text: aiMessage }]);
        } catch (e: any) {
            console.error(e);
            setChatHistory(prev => [...prev, { role: 'ai', text: "Erreur lors de l'analyse.", isError: true }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleGetSuggestions = async () => {
        const formsToAnalyze = getFormsToAnalyze();
        if (formsToAnalyze.length === 0) return;

        setIsGeneratingSuggestions(true);
        try {
            const suggestions = await getAnalysisSuggestions(formsToAnalyze, responses);
            setExpertSuggestions(suggestions);
        } catch (e) {
            console.error(e);
        } finally {
            setIsGeneratingSuggestions(false);
        }
    };

    const handleLoadHistory = (item: AnalysisHistory) => {
        setAnalysisResult(item.analysisResult);
        setDisplayedChartType(null);
        
        // Try to select the forms if they exist in the current list
        if (!isMultiFormMode && item.formIds.length === 1) {
            if (forms.some(f => f.id === item.formIds[0])) {
                setSelectedFormId(item.formIds[0]);
            }
        }

        setChatHistory([
            { role: 'user', text: item.userPrompt },
            { role: 'ai', text: item.analysisResult.chatResponse || "Analyse restaurée depuis l'historique." }
        ]);
        setMobileTab('report');
    };

    const handleDeleteHistory = (id: string) => {
        setConfirmation({
            isOpen: true,
            title: "Supprimer l'historique",
            message: "Êtes-vous sûr de vouloir supprimer cette analyse de l'historique ?",
            onConfirm: () => {
                deleteAnalysisHistory(id);
                setConfirmation(null);
            },
            onClose: () => setConfirmation(null),
            variant: 'danger',
            confirmText: 'Supprimer'
        });
    };

    const handleExportToWord = () => {
        if (!analysisResult) return;
        
        let chartsHtml = "";
        const charts = getCharts; // Utilise le helper existant

        if (charts.length > 0) {
            chartsHtml += `<br><br><hr><br><h2>Annexes : Données des Graphiques</h2><p>Vous trouverez ci-dessous les tableaux de données utilisés pour les graphiques. Vous pouvez sélectionner ces tableaux dans Word pour insérer un graphique modifiable (Insertion > Graphique).</p>`;

            charts.forEach((chart: any) => {
                chartsHtml += `<h3>${chart.title || 'Graphique'}</h3>`;
                chartsHtml += `<table border="1" style="border-collapse: collapse; width: 100%; margin-bottom: 20px;">`;
                
                // En-têtes
                chartsHtml += `<thead style="background-color: #f0f0f0;"><tr>`;
                chartsHtml += `<th style="padding: 8px; text-align: left;">Catégorie / Étiquette</th>`;
                chart.data.datasets.forEach((ds: any) => {
                    chartsHtml += `<th style="padding: 8px; text-align: left;">${ds.label || 'Valeur'}</th>`;
                });
                chartsHtml += `</tr></thead>`;

                // Corps
                chartsHtml += `<tbody>`;
                chart.data.labels.forEach((label: string, index: number) => {
                    chartsHtml += `<tr>`;
                    chartsHtml += `<td style="padding: 8px;">${label}</td>`;
                    chart.data.datasets.forEach((ds: any) => {
                        chartsHtml += `<td style="padding: 8px;">${ds.data[index]}</td>`;
                    });
                    chartsHtml += `</tr>`;
                });
                chartsHtml += `</tbody></table><br>`;
            });
        }

        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Analyse MedataAI</title>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    h1 { color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px; }
                    h2 { color: #1e40af; margin-top: 30px; }
                    h3 { color: #334155; }
                    table { border: 1px solid #ccc; }
                    th, td { border: 1px solid #ccc; }
                </style>
            </head>
            <body>
                <h1>Rapport d'Analyse MedataAI</h1>
                ${analysisResult.analysisText}
                ${chartsHtml}
            </body>
            </html>
        `;
        const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'analyse-medata.doc';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const toggleColorPalette = () => {
        setColorPaletteIndex((prev) => (prev + 1) % PALETTES.length);
    };

    // --- RENDER ---

    if (isSuspended) {
        return (
             <div className="space-y-6">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Analyse IA</h2>
                <Card className="!bg-red-50 dark:!bg-red-900/20 border border-red-200 dark:border-red-800">
                    <div className="text-red-700 dark:text-red-300">Votre compte est suspendu. Veuillez régulariser votre situation.</div>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[calc(100vh-theme(spacing.24))] -m-4 sm:-m-6 relative">
            
            {/* Mobile Tab Switcher */}
            <div className="lg:hidden flex border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shrink-0">
                <button
                    onClick={() => setMobileTab('chat')}
                    className={`flex-1 py-3 text-sm font-medium transition-colors ${mobileTab === 'chat' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                >
                    <span className="flex items-center justify-center">
                        <ChatIcon className="w-4 h-4 mr-2" /> Discussion
                    </span>
                </button>
                <button
                    onClick={() => setMobileTab('report')}
                    className={`flex-1 py-3 text-sm font-medium transition-colors ${mobileTab === 'report' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                >
                    <span className="flex items-center justify-center">
                        <BarChartIcon className="w-4 h-4 mr-2" /> Rapport
                    </span>
                </button>
            </div>

            <div className="flex-1 flex overflow-hidden">
                
                {/* --- LEFT PANEL: CHAT & CONTROLS --- */}
                <div className={`${mobileTab === 'chat' ? 'flex' : 'hidden'} lg:flex w-full lg:w-[35%] flex-col bg-slate-50 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700`}>
                    
                    {/* Header: Form Selector */}
                    <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">
                            Source de données
                        </label>
                        {isMultiFormMode ? (
                            <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded text-sm font-medium text-slate-900 dark:text-white truncate">
                                {selectedFormsForAnalysis.length} formulaires sélectionnés
                            </div>
                        ) : (
                            <select
                                value={selectedFormId}
                                onChange={(e) => { setSelectedFormId(e.target.value); setAnalysisResult(null); setChatHistory([]); }}
                                className="block w-full pl-3 pr-10 py-2 text-sm border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                            >
                                <option value="" disabled>Choisir un formulaire</option>
                                {forms.filter(f => f.status === 'validated').map(form => (
                                    <option key={form.id} value={form.id}>{form.title}</option>
                                ))}
                            </select>
                        )}
                    </div>

                    {/* Chat Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {chatHistory.length === 0 && (
                            <div className="text-center text-slate-500 dark:text-slate-400 mt-10 text-sm">
                                <ChatIcon className="w-10 h-10 mx-auto mb-2 opacity-50" />
                                <p>Sélectionnez un formulaire et posez votre question pour générer un rapport.</p>
                            </div>
                        )}
                        
                        {chatHistory.map((msg, idx) => (
                            <ChatMessageBubble key={idx} role={msg.role} text={msg.text} isError={msg.isError} />
                        ))}
                        
                        {isLoading && (
                            <div className="flex items-center space-x-2 text-slate-500 text-sm pl-4">
                                <Spinner className="w-4 h-4" />
                                <span>MedataAI réfléchit...</span>
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-4 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
                        {!isAccessUnlocked && (getFormsToAnalyze().length > 0) ? (
                            <div className="text-center">
                                <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">Débloquez l'analyse experte pour ce formulaire.</p>
                                <Button onClick={handleUnlockAccess} className="w-full">
                                    Débloquer ({systemSettings.coinCosts.aiAnalysis} Coins)
                                </Button>
                            </div>
                        ) : (
                            <>
                                {/* Suggestions Area */}
                                <div className="mb-3">
                                    {isGeneratingSuggestions ? (
                                        <div className="flex items-center space-x-2 text-xs text-primary-600 dark:text-primary-400 p-2">
                                            <Spinner className="w-3 h-3" />
                                            <span>L'IA analyse votre formulaire pour trouver des pistes...</span>
                                        </div>
                                    ) : expertSuggestions.length > 0 ? (
                                        <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-thin">
                                            {expertSuggestions.map((s, i) => (
                                                <button 
                                                    key={i} 
                                                    onClick={() => handleRunAnalysis(s.searchPrompt)} 
                                                    className="flex-shrink-0 text-xs bg-primary-50 text-primary-700 border border-primary-200 px-3 py-1 rounded-full whitespace-nowrap hover:bg-primary-100 transition-colors"
                                                    disabled={isLoading}
                                                >
                                                    ✨ {s.title}
                                                </button>
                                            ))}
                                        </div>
                                    ) : getFormsToAnalyze().length > 0 && (
                                        <button 
                                            onClick={handleGetSuggestions} 
                                            className="text-xs text-primary-600 hover:underline flex items-center w-full mb-2"
                                            disabled={isLoading}
                                        >
                                            ✨ Suggérer des analyses pertinentes
                                        </button>
                                    )}
                                </div>
                                
                                <div className="relative">
                                    <textarea
                                        rows={3}
                                        value={userPrompt}
                                        onChange={(e) => setUserPrompt(e.target.value)}
                                        onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleRunAnalysis(); } }}
                                        placeholder={analysisResult ? "Modifiez le rapport (ex: 'Ajoute un graphique sur l'âge')..." : "Décrivez votre besoin d'analyse..."}
                                        className="block w-full pr-12 shadow-sm sm:text-sm border-slate-300 dark:border-slate-600 rounded-xl resize-none focus:ring-primary-500 focus:border-primary-500 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                                        disabled={isLoading || getFormsToAnalyze().length === 0}
                                    />
                                    <button 
                                        onClick={() => handleRunAnalysis()} 
                                        disabled={isLoading || !userPrompt.trim()}
                                        className="absolute bottom-2 right-2 p-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                                        </svg>
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* --- RIGHT PANEL: REPORT PREVIEW --- */}
                <div className={`${mobileTab === 'report' ? 'flex' : 'hidden'} lg:flex flex-1 bg-slate-100 dark:bg-slate-900 flex-col overflow-hidden relative`}>
                    {/* Toolbar */}
                    <div className="h-14 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-4 sm:px-6 shadow-sm z-10 shrink-0">
                        <h3 className="font-bold text-slate-700 dark:text-white truncate mr-2">Rapport d'Analyse</h3>
                        <div className="flex space-x-2">
                            <Button 
                                onClick={() => setIsHistoryModalOpen(true)} 
                                variant="secondary" 
                                className="!py-1.5 !px-3 !text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 whitespace-nowrap"
                            >
                                <HistoryIcon className="w-4 h-4 mr-1 sm:mr-2 inline" />
                                <span className="hidden sm:inline">Historique</span>
                                <span className="sm:hidden">Hist.</span>
                            </Button>
                            {analysisResult && (
                                <Button onClick={handleExportToWord} variant="secondary" className="!py-1.5 !px-3 !text-xs whitespace-nowrap">
                                    <DownloadIcon className="w-4 h-4 mr-1 sm:mr-2 inline" />
                                    <span className="hidden sm:inline">Word</span>
                                    <span className="sm:hidden">Exp.</span>
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-4 sm:p-8">
                        {analysisResult ? (
                            <div className="max-w-4xl mx-auto bg-white dark:bg-slate-800 shadow-xl rounded-xl min-h-[calc(100vh-12rem)] p-6 sm:p-12 animate-fade-in-up">
                                {/* Charts Section */}
                                {getCharts.length > 0 && (
                                    <div className="mb-8">
                                        <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
                                            <h4 className="font-semibold text-slate-700 dark:text-slate-200">
                                                Visualisation ({getCharts.length})
                                            </h4>
                                            
                                            <div className="flex flex-wrap gap-2">
                                                {/* Color Toggle Button */}
                                                <button
                                                    onClick={toggleColorPalette}
                                                    title={`Palette actuelle: ${PALETTES[colorPaletteIndex].name}`}
                                                    className="flex items-center px-3 py-1.5 text-xs font-medium rounded-md bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 transition-colors"
                                                >
                                                    <span className="mr-2 text-lg">🎨</span>
                                                    {PALETTES[colorPaletteIndex].name}
                                                </button>

                                                <div className="flex space-x-1 bg-slate-100 dark:bg-slate-700 p-1 rounded-lg">
                                                    <ChartTypeButton icon={<BarChartIcon className="w-4 h-4"/>} label="Barres" isActive={displayedChartType === 'bar'} onClick={() => setDisplayedChartType('bar')} />
                                                    <ChartTypeButton icon={<PieChartIcon className="w-4 h-4"/>} label="Tarte" isActive={displayedChartType === 'pie'} onClick={() => setDisplayedChartType('pie')} />
                                                    <ChartTypeButton icon={<DoughnutChartIcon className="w-4 h-4"/>} label="Donut" isActive={displayedChartType === 'doughnut'} onClick={() => setDisplayedChartType('doughnut')} />
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className={`grid grid-cols-1 ${getCharts.length > 1 ? 'md:grid-cols-2' : ''} gap-6`}>
                                            {getCharts.map((chart: any, idx: number) => (
                                                <div key={idx} className="p-4 bg-slate-50 dark:bg-slate-700/30 rounded-xl border border-slate-100 dark:border-slate-700 flex flex-col">
                                                    {chart.title && (
                                                        <h5 className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-3 text-center">
                                                            {chart.title}
                                                        </h5>
                                                    )}
                                                    <div className="flex-1 min-h-[300px]">
                                                        <ChartRenderer 
                                                            chartData={{ ...chart, type: displayedChartType || chart.type }} 
                                                            customColors={PALETTES[colorPaletteIndex].colors}
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Text Report */}
                                <div className="prose dark:prose-invert max-w-none prose-headings:text-slate-800 dark:prose-headings:text-slate-100 prose-p:text-slate-600 dark:prose-p:text-slate-300">
                                    <div dangerouslySetInnerHTML={{ __html: analysisResult.analysisText }} />
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400 text-center">
                                <div className="w-24 h-32 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg flex items-center justify-center mb-4 bg-slate-50 dark:bg-slate-800/50">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                                <p>Le rapport généré apparaîtra ici.</p>
                                <p className="text-sm mt-2 text-slate-500">Posez une question dans le panneau de discussion pour commencer.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            
            {isHistoryModalOpen && (
                <HistoryModal 
                    history={analysisHistory} 
                    onClose={() => setIsHistoryModalOpen(false)} 
                    onLoad={handleLoadHistory}
                    onDelete={handleDeleteHistory}
                />
            )}
            
            {confirmation && <ConfirmationModal {...confirmation} />}
        </div>
    );
};

export default Analysis;
