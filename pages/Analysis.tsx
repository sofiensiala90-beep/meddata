
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
                                                onClick={() => onDelete(item.id)} 
                                                variant="danger"
                                                className="flex-1 sm:w-24 justify-center !text-xs !py-2 !bg-transparent border-red-200 dark:border-red-800 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
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
                <footer className="p-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-b-lg flex justify-end">
                    <Button onClick={onClose} variant="secondary">Fermer</Button>
                </footer>
            </div>
        </div>
    );
};

const Analysis: React.FC<AnalysisProps> = ({ 
  user, forms, responses, onTransaction, analysisContext, onNavigate, 
  analysisHistory, saveAnalysisToHistory, deleteAnalysisHistory, unlockedAnalysis, systemSettings 
}) => {
  const [selectedFormIds, setSelectedFormIds] = useState<string[]>([]);
  const [userPrompt, setUserPrompt] = useState('');
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [confirmation, setConfirmation] = useState<ConfirmationModalProps | null>(null);

  useEffect(() => {
    if (analysisContext?.formIds) {
      setSelectedFormIds(analysisContext.formIds);
    }
  }, [analysisContext]);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (selectedFormIds.length === 0) {
          setSuggestions([]);
          return;
      }
      setLoadingSuggestions(true);
      try {
        const selectedForms = forms.filter(f => selectedFormIds.includes(f.id));
        const selectedResponses = responses.filter(r => selectedFormIds.includes(r.formId));
        if (selectedForms.length > 0 && selectedResponses.length > 0) {
             const suggs = await getAnalysisSuggestions(selectedForms, selectedResponses);
             setSuggestions(suggs);
        } else {
            setSuggestions([]);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingSuggestions(false);
      }
    };
    fetchSuggestions();
  }, [selectedFormIds, forms, responses]);

  const handleFormToggle = (formId: string) => {
    setSelectedFormIds(prev => 
      prev.includes(formId) ? prev.filter(id => id !== formId) : [...prev, formId]
    );
  };

  const isFormUnlocked = (formId: string) => {
      if (user.role === 'admin') return true;
      return unlockedAnalysis.some(u => u.formId === formId);
  };

  const handleAnalyze = async (prompt: string = userPrompt) => {
    if (selectedFormIds.length === 0) {
      alert("Veuillez sélectionner au moins un formulaire.");
      return;
    }
    if (!prompt.trim()) {
      alert("Veuillez entrer une question ou une instruction.");
      return;
    }

    const lockedForms = selectedFormIds.filter(fid => !isFormUnlocked(fid));
    if (lockedForms.length > 0) {
        const cost = systemSettings.coinCosts.aiAnalysis * lockedForms.length;
        setConfirmation({
            isOpen: true,
            title: "Déverrouiller l'analyse",
            message: (
                <div>
                    <p>Vous devez déverrouiller l'analyse pour {lockedForms.length} formulaire(s).</p>
                    <p className="mt-2 font-bold flex items-center">Coût total : {cost} <CoinIcon className="w-4 h-4 ml-1 text-yellow-500" /></p>
                </div>
            ),
            confirmText: "Payer et Analyser",
            variant: "primary",
            onConfirm: async () => {
                const success = await onTransaction(user.id, TransactionReason.AiRequest, { formIds: lockedForms });
                if (success) {
                    setConfirmation(null);
                    performAnalysis(prompt);
                }
            },
            onClose: () => setConfirmation(null)
        });
        return;
    }

    performAnalysis(prompt);
  };

  const performAnalysis = async (prompt: string) => {
      setIsAnalyzing(true);
      setAnalysisResult(null);
      try {
          const selectedForms = forms.filter(f => selectedFormIds.includes(f.id));
          const selectedResponses = responses.filter(r => selectedFormIds.includes(r.formId));
          
          const result = await getAnalysis(selectedForms, selectedResponses, prompt);
          setAnalysisResult(result);
          
          saveAnalysisToHistory(
              selectedFormIds, 
              selectedForms.map(f => f.title), 
              prompt, 
              result
          );
      } catch (error) {
          console.error("Analysis failed", error);
          alert("Erreur lors de l'analyse.");
      } finally {
          setIsAnalyzing(false);
      }
  };

  const loadHistoryItem = (item: AnalysisHistory) => {
      setSelectedFormIds(item.formIds);
      setUserPrompt(item.userPrompt);
      setAnalysisResult(item.analysisResult);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
        <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Analyse Intelligente (IA)</h2>
            <Button onClick={() => setShowHistoryModal(true)} variant="secondary" className="flex items-center">
                <HistoryIcon className="w-5 h-5 mr-2" />
                Historique
            </Button>
        </div>

        {!analysisResult && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-6">
                    <Card title="1. Sélectionnez les données">
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                            {forms.length > 0 ? forms.map(form => (
                                <div key={form.id} className="flex items-center p-2 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer" onClick={() => handleFormToggle(form.id)}>
                                    <input 
                                        type="checkbox" 
                                        checked={selectedFormIds.includes(form.id)} 
                                        onChange={() => {}}
                                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-slate-300 rounded"
                                    />
                                    <div className="ml-3">
                                        <p className="text-sm font-medium text-slate-900 dark:text-white">{form.title}</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                            {responses.filter(r => r.formId === form.id).length} réponses
                                            {!isFormUnlocked(form.id) && user.role !== 'admin' && " • 🔒"}
                                        </p>
                                    </div>
                                </div>
                            )) : (
                                <p className="text-sm text-slate-500">Aucun formulaire disponible.</p>
                            )}
                        </div>
                    </Card>
                </div>

                <div className="lg:col-span-2 space-y-6">
                    <Card title="2. Posez votre question">
                        <textarea
                            value={userPrompt}
                            onChange={(e) => setUserPrompt(e.target.value)}
                            placeholder="Ex: Analyse la corrélation entre l'âge et les symptômes..."
                            rows={3}
                            className="w-full shadow-sm sm:text-sm border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-md focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                        />
                        <div className="mt-4 flex justify-end">
                            <Button onClick={() => handleAnalyze()} disabled={isAnalyzing || selectedFormIds.length === 0 || !userPrompt.trim()}>
                                {isAnalyzing ? <><Spinner className="w-4 h-4 mr-2" /> Analyse en cours...</> : 'Lancer l\'analyse'}
                            </Button>
                        </div>
                    </Card>

                    {loadingSuggestions && <div className="text-center text-slate-500 text-sm"><Spinner className="w-4 h-4 inline mr-2"/> Recherche de suggestions...</div>}
                    
                    {!loadingSuggestions && suggestions.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {suggestions.map((sugg, idx) => (
                                <button 
                                    key={idx}
                                    onClick={() => { setUserPrompt(sugg.searchPrompt); handleAnalyze(sugg.searchPrompt); }}
                                    className="text-left p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-primary-400 dark:hover:border-primary-500 hover:shadow-md transition-all group"
                                >
                                    <h4 className="font-semibold text-primary-700 dark:text-primary-300 text-sm group-hover:text-primary-600">{sugg.title}</h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{sugg.description}</p>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        )}

        {analysisResult && (
            <div className="space-y-6 animate-fade-in-up">
                <Button onClick={() => setAnalysisResult(null)} variant="secondary">← Nouvelle Analyse</Button>
                
                {/* Chat Response Bubble */}
                {analysisResult.chatResponse && (
                    <div className="max-w-3xl">
                        <ChatMessageBubble role="ai" text={analysisResult.chatResponse} />
                    </div>
                )}

                {/* Main Analysis Content */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700 overflow-hidden">
                    <div className="p-6 md:p-8 space-y-8">
                        {/* Render HTML Analysis */}
                        <div 
                            className="prose dark:prose-invert max-w-none prose-headings:text-primary-800 dark:prose-headings:text-primary-300 prose-a:text-primary-600"
                            dangerouslySetInnerHTML={{ __html: analysisResult.analysisText }} 
                        />

                        {/* Charts Section */}
                        {analysisResult.charts && analysisResult.charts.length > 0 && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-8 border-t border-slate-200 dark:border-slate-700">
                                {analysisResult.charts.map((chart: any, idx: number) => (
                                    <div key={idx} className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                                        <h4 className="text-center font-semibold text-slate-700 dark:text-slate-300 mb-4">{chart.title}</h4>
                                        <ChartRenderer chartData={chart} />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}

        {showHistoryModal && (
            <HistoryModal 
                history={analysisHistory} 
                onClose={() => setShowHistoryModal(false)} 
                onLoad={loadHistoryItem}
                onDelete={deleteAnalysisHistory}
            />
        )}

        {confirmation && <ConfirmationModal {...confirmation} />}
    </div>
  );
};

export default Analysis;
