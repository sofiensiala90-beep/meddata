import React, { useState, useEffect, useRef } from 'react';
import { User, Form, FormResponse, TransactionReason, AnalysisHistory, SystemSettings } from '../types';
import Button from '../components/Button';
import Spinner from '../components/Spinner';
import ChartRenderer from '../components/ChartRenderer';
import { getAnalysis, getAnalysisSuggestions } from '../services/geminiService';
import ConfirmationModal, { ConfirmationModalProps } from '../components/ConfirmationModal';
import CoinIcon from '../components/icons/CoinIcon';
import HistoryIcon from '../components/icons/HistoryIcon';
import WordIcon from '../components/icons/WordIcon';
import ChatIcon from '../components/icons/ChatIcon';
import TrashIcon from '../components/icons/TrashIcon';
import BarChartIcon from '../components/icons/BarChartIcon';
import PieChartIcon from '../components/icons/PieChartIcon';
import DoughnutChartIcon from '../components/icons/DoughnutChartIcon';
import PaletteIcon from '../components/icons/PaletteIcon';

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

// Palettes de couleurs pour les graphiques
const COLOR_PALETTES = {
    default: ['#60A5FA', '#34D399', '#FBBF24', '#F87171', '#A78BFA', '#FB923C', '#EC4899', '#14B8A6'],
    teal: ['#0f766e', '#14b8a6', '#2dd4bf', '#5eead4', '#99f6e4', '#ccfbf1'],
    ocean: ['#1e3a8a', '#1d4ed8', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd'],
    warm: ['#7c2d12', '#c2410c', '#ea580c', '#f97316', '#fb923c', '#fdba74'],
    violet: ['#4c1d95', '#6d28d9', '#7c3aed', '#8b5cf6', '#a78bfa', '#c4b5fd'],
};

// --- Composant Historique (Modal) ---
const HistoryModal: React.FC<{
    history: AnalysisHistory[];
    onClose: () => void;
    onLoad: (item: AnalysisHistory) => void;
    onDelete: (id: string) => void;
}> = ({ history, onClose, onLoad, onDelete }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-[100] p-4" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-white dark:bg-slate-800 rounded-t-lg">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center">
                        <HistoryIcon className="w-5 h-5 mr-2" />
                        Historique des analyses
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </header>
                <main className="flex-1 overflow-y-auto p-4 bg-slate-50 dark:bg-slate-900/50">
                    {history.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-500 dark:text-slate-400">
                            <p>Aucune analyse enregistrée.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {[...history].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(item => (
                                <div key={item.id} className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center text-xs text-slate-500 dark:text-slate-400 mb-1">
                                            <span className="bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded mr-2">{new Date(item.createdAt).toLocaleDateString()}</span>
                                        </div>
                                        <h4 className="font-semibold text-slate-800 dark:text-slate-200 truncate">{item.formTitles.join(', ')}</h4>
                                        <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-1 italic">"{item.userPrompt}"</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button onClick={() => { onLoad(item); onClose(); }} className="!py-1.5 !px-3 !text-xs">Charger</Button>
                                        <Button onClick={() => onDelete(item.id)} variant="danger" className="!py-1.5 !px-3 !text-xs !bg-transparent border border-red-200 dark:border-red-800 text-red-500"><TrashIcon className="w-4 h-4" /></Button>
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

// --- Composant Principal ---
const Analysis: React.FC<AnalysisProps> = ({ 
  user, forms, responses, onTransaction, analysisContext, onNavigate, 
  analysisHistory, saveAnalysisToHistory, deleteAnalysisHistory, unlockedAnalysis, systemSettings 
}) => {
  // State
  const [selectedFormIds, setSelectedFormIds] = useState<string[]>([]);
  const [userPrompt, setUserPrompt] = useState('');
  const [chatHistory, setChatHistory] = useState<{role: 'user' | 'ai', text: string}[]>([]);
  const [currentAnalysisResult, setCurrentAnalysisResult] = useState<any | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [confirmation, setConfirmation] = useState<ConfirmationModalProps | null>(null);
  
  // UI State
  const [mobileTab, setMobileTab] = useState<'chat' | 'report'>('chat');
  const [forcedChartType, setForcedChartType] = useState<'bar' | 'pie' | 'doughnut' | null>(null);
  const [activePalette, setActivePalette] = useState<keyof typeof COLOR_PALETTES>('default');
  const [isSourceSelectorOpen, setIsSourceSelectorOpen] = useState(false);

  // Refs for scrolling and UI interactions
  const chatEndRef = useRef<HTMLDivElement>(null);
  const reportContainerRef = useRef<HTMLDivElement>(null);
  const sourceSelectorRef = useRef<HTMLDivElement>(null);

  // Initial Context Load
  useEffect(() => {
    if (analysisContext?.formIds) {
      setSelectedFormIds(analysisContext.formIds);
    }
  }, [analysisContext]);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isAnalyzing]);

  // Click outside to close source selector
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (sourceSelectorRef.current && !sourceSelectorRef.current.contains(event.target as Node)) {
            setIsSourceSelectorOpen(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Check Unlock Status
  const areSelectedFormsUnlocked = () => {
      if (selectedFormIds.length === 0) return false;
      if (user.role === 'admin') return true;
      // All selected forms must be unlocked
      return selectedFormIds.every(fid => unlockedAnalysis.some(u => u.formId === fid));
  };

  const isUnlocked = areSelectedFormsUnlocked();

  // Load Suggestions when unlocked
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!isUnlocked || selectedFormIds.length === 0) {
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
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingSuggestions(false);
      }
    };
    
    if (isUnlocked && suggestions.length === 0 && selectedFormIds.length > 0) {
        fetchSuggestions();
    }
  }, [isUnlocked, selectedFormIds, forms, responses]);

  // Actions
  const handleFormToggle = (formId: string) => {
    setSelectedFormIds(prev => {
        const newSelection = prev.includes(formId) ? prev.filter(id => id !== formId) : [...prev, formId];
        // Reset state on selection change
        setSuggestions([]); 
        return newSelection;
    });
  };

  const handleUnlock = () => {
      const lockedForms = selectedFormIds.filter(fid => 
          !unlockedAnalysis.some(u => u.formId === fid)
      );
      
      const cost = systemSettings.coinCosts.aiAnalysis * lockedForms.length;
      
      setConfirmation({
          isOpen: true,
          title: "Déverrouiller l'analyse",
          message: (
              <div>
                  <p>Vous devez déverrouiller l'accès à l'IA pour {lockedForms.length} formulaire(s).</p>
                  <p className="text-sm text-slate-500 mt-2">Une fois débloqué, vous pourrez effectuer autant d'analyses que vous voulez sur ces données.</p>
                  <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-700 flex justify-between items-center font-bold text-slate-800 dark:text-slate-200">
                      <span>Coût unique :</span>
                      <span className="flex items-center text-yellow-600 dark:text-yellow-400">{cost} <CoinIcon className="w-5 h-5 ml-1"/></span>
                  </div>
              </div>
          ),
          confirmText: "Payer et Débloquer",
          variant: "primary",
          onConfirm: async () => {
              // Pass only the locked forms to trigger transaction for them
              const success = await onTransaction(user.id, TransactionReason.AiRequest, { formIds: lockedForms });
              if (success) {
                  setConfirmation(null);
              }
          },
          onClose: () => setConfirmation(null)
      });
  };

  const handleAnalyze = async (prompt: string = userPrompt) => {
      if (!prompt.trim()) return;
      
      // Add user message immediately
      setChatHistory(prev => [...prev, { role: 'user', text: prompt }]);
      setUserPrompt('');
      setIsAnalyzing(true);
      // Auto-switch to report on mobile when new analysis starts
      if (window.innerWidth < 1024) setMobileTab('report'); 

      try {
          const selectedForms = forms.filter(f => selectedFormIds.includes(f.id));
          const selectedResponses = responses.filter(r => selectedFormIds.includes(r.formId));
          
          // Pass previous result for context if refining
          const result = await getAnalysis(selectedForms, selectedResponses, prompt, currentAnalysisResult);
          
          setCurrentAnalysisResult(result);
          setChatHistory(prev => [...prev, { role: 'ai', text: result.chatResponse }]);
          
          saveAnalysisToHistory(selectedFormIds, selectedForms.map(f => f.title), prompt, result);
          
      } catch (error) {
          console.error("Error analysis:", error);
          setChatHistory(prev => [...prev, { role: 'ai', text: "❌ Une erreur est survenue lors de l'analyse." }]);
      } finally {
          setIsAnalyzing(false);
      }
  };

  const handleExportWord = () => {
      if (!currentAnalysisResult) return;
      
      let chartTablesHTML = "";
      if (currentAnalysisResult.charts && currentAnalysisResult.charts.length > 0) {
          chartTablesHTML += "<br/><hr/><br/><h3>Données des Graphiques</h3>";
          currentAnalysisResult.charts.forEach((chart: any) => {
              chartTablesHTML += `<h4>${chart.title}</h4>`;
              chartTablesHTML += "<table border='1' cellpadding='5' cellspacing='0' style='border-collapse: collapse; width: 100%; margin-bottom: 20px;'>";
              // Header
              chartTablesHTML += "<thead><tr><th>Catégorie</th><th>Valeur</th></tr></thead>";
              // Body
              chartTablesHTML += "<tbody>";
              chart.data.labels.forEach((label: string, index: number) => {
                  const value = chart.data.datasets[0].data[index];
                  chartTablesHTML += `<tr><td>${label}</td><td>${value}</td></tr>`;
              });
              chartTablesHTML += "</tbody></table>";
          });
      }

      const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Rapport DASS</title></head><body>";
      const footer = "</body></html>";
      const sourceHTML = header + currentAnalysisResult.analysisText + chartTablesHTML + footer;
      
      const blob = new Blob(['\ufeff', sourceHTML], {
          type: 'application/msword'
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Rapport_DASS_${new Date().toISOString().slice(0,10)}.doc`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
  };

  const handleLoadHistory = (item: AnalysisHistory) => {
      setSelectedFormIds(item.formIds);
      setCurrentAnalysisResult(item.analysisResult);
      setChatHistory([
          { role: 'user', text: item.userPrompt },
          { role: 'ai', text: item.analysisResult.chatResponse }
      ]);
      setMobileTab('report'); // Switch to view
  };

  const cyclePalette = () => {
      const keys = Object.keys(COLOR_PALETTES) as (keyof typeof COLOR_PALETTES)[];
      const currentIndex = keys.indexOf(activePalette);
      const nextIndex = (currentIndex + 1) % keys.length;
      setActivePalette(keys[nextIndex]);
  };

  const selectedFormTitles = forms.filter(f => selectedFormIds.includes(f.id)).map(f => f.title);

  // --- RENDER ---

  return (
    <div className="flex flex-col h-[calc(100vh-110px)] gap-4 pb-2">
        {/* Mobile Tab Switcher */}
        <div className="lg:hidden flex border-b border-slate-200 dark:border-slate-700 mb-2">
            <button 
                onClick={() => setMobileTab('chat')} 
                className={`flex-1 py-2 text-sm font-medium ${mobileTab === 'chat' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-slate-500'}`}
            >
                Discussion
            </button>
            <button 
                onClick={() => setMobileTab('report')} 
                className={`flex-1 py-2 text-sm font-medium ${mobileTab === 'report' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-slate-500'}`}
            >
                Rapport
            </button>
        </div>

        <div className="flex flex-col lg:flex-row h-full gap-6 overflow-hidden relative">
            
            {/* --- GAUCHE : CHAT & CONTROLES (35%) --- */}
            <div className={`w-full lg:w-[35%] flex-col gap-4 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden ${mobileTab === 'chat' ? 'flex' : 'hidden lg:flex'}`}>
                
                {/* 1. Sélection des Données (DROPDOWN STYLE) */}
                <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20 shrink-0 relative z-20" ref={sourceSelectorRef}>
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2 block">Source de Données</label>
                    <button 
                        onClick={() => setIsSourceSelectorOpen(!isSourceSelectorOpen)} 
                        className="w-full flex justify-between items-center p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm hover:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                    >
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                            {selectedFormIds.length > 0 
                                ? (selectedFormIds.length === 1 ? selectedFormTitles[0] : `${selectedFormIds.length} formulaires sélectionnés`)
                                : "Sélectionner une source..."}
                        </span>
                        <svg className={`w-5 h-5 text-slate-400 transition-transform ${isSourceSelectorOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                    </button>
                    
                    {isSourceSelectorOpen && (
                        <div className="absolute top-full left-4 right-4 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-h-60 overflow-y-auto p-2 animate-fade-in-down">
                            {forms.length === 0 ? (
                                <p className="text-sm text-slate-500 p-2">Aucun formulaire disponible.</p>
                            ) : (
                                forms.map(form => (
                                    <label key={form.id} className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${selectedFormIds.includes(form.id) ? 'bg-primary-50 dark:bg-primary-900/30' : 'hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
                                        <div className="flex items-center overflow-hidden">
                                            <input 
                                                type="checkbox" 
                                                checked={selectedFormIds.includes(form.id)} 
                                                onChange={() => handleFormToggle(form.id)}
                                                className="h-4 w-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                                            />
                                            <span className="ml-3 text-sm text-slate-700 dark:text-slate-200 truncate font-medium">{form.title}</span>
                                        </div>
                                        {user.role !== 'admin' && !unlockedAnalysis.some(u => u.formId === form.id) && (
                                            <span className="text-[10px] bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded ml-2">🔒</span>
                                        )}
                                    </label>
                                ))
                            )}
                        </div>
                    )}
                </div>

                {/* 2. Zone de Chat */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-50 dark:bg-slate-900/50">
                    {selectedFormIds.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 opacity-60">
                            <ChatIcon className="w-12 h-12 mb-2" />
                            <p className="text-sm">Sélectionnez un formulaire<br/>pour commencer.</p>
                        </div>
                    ) : !isUnlocked ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-6">
                            <div className="bg-yellow-100 dark:bg-yellow-900/30 p-4 rounded-full mb-4">
                                <CoinIcon className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Analyse Verrouillée</h3>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                                Débloquez ces formulaires pour accéder à l'analyse illimitée, aux graphiques et à l'export.
                            </p>
                            <Button onClick={handleUnlock} className="w-full justify-center shadow-lg shadow-primary-500/30">
                                Débloquer maintenant
                            </Button>
                        </div>
                    ) : (
                        <>
                            {chatHistory.length === 0 && (
                                <div className="text-center py-4">
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">👋 Bonjour ! Je suis prêt à analyser vos données.</p>
                                    
                                    {/* Suggestions (CHIPS STYLE) */}
                                    {loadingSuggestions ? (
                                        <div className="flex justify-center"><Spinner className="w-5 h-5 text-primary-500"/></div>
                                    ) : suggestions.length > 0 && (
                                        <div className="flex flex-wrap gap-2 justify-center">
                                            {suggestions.map((sugg, idx) => (
                                                <button 
                                                    key={idx}
                                                    onClick={() => handleAnalyze(sugg.searchPrompt)}
                                                    className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-primary-200 dark:border-primary-800 rounded-full text-xs font-medium text-primary-700 dark:text-primary-300 hover:bg-primary-50 dark:hover:bg-primary-900/30 hover:border-primary-300 transition-all shadow-sm"
                                                    title={sugg.description}
                                                >
                                                    ✨ {sugg.title}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Messages */}
                            {chatHistory.map((msg, idx) => (
                                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[90%] p-3 rounded-2xl text-sm whitespace-pre-wrap shadow-sm ${
                                        msg.role === 'user' 
                                        ? 'bg-primary-600 text-white rounded-br-none' 
                                        : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-bl-none'
                                    }`}>
                                        {msg.text}
                                    </div>
                                </div>
                            ))}
                            {isAnalyzing && (
                                <div className="flex justify-start">
                                    <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl rounded-bl-none border border-slate-200 dark:border-slate-700 shadow-sm flex items-center space-x-2">
                                        <Spinner className="w-4 h-4 text-primary-500" />
                                        <span className="text-xs text-slate-500">Analyse en cours...</span>
                                    </div>
                                </div>
                            )}
                            <div ref={chatEndRef} />
                        </>
                    )}
                </div>

                {/* 3. Input Zone */}
                {isUnlocked && (
                    <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shrink-0">
                        <div className="relative">
                            <textarea
                                value={userPrompt}
                                onChange={(e) => setUserPrompt(e.target.value)}
                                onKeyDown={(e) => {
                                    if(e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleAnalyze();
                                    }
                                }}
                                placeholder="Posez une question sur vos données..."
                                rows={2}
                                disabled={isAnalyzing}
                                className="w-full pr-12 pl-4 py-3 bg-slate-50 dark:bg-slate-900 border-none rounded-xl resize-none focus:ring-2 focus:ring-primary-500 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400"
                            />
                            <button 
                                onClick={() => handleAnalyze()}
                                disabled={isAnalyzing || !userPrompt.trim()}
                                className="absolute right-2 bottom-2 p-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                                </svg>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* --- DROITE : RAPPORT & VISUALISATION (65%) --- */}
            <div className={`w-full lg:w-[65%] bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex-col overflow-hidden relative ${mobileTab === 'report' ? 'flex' : 'hidden lg:flex'}`}>
                
                {/* Header Rapport */}
                <div className="flex flex-wrap gap-2 justify-between items-center p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20 shrink-0">
                    <h3 className="font-bold text-slate-800 dark:text-white flex items-center">
                        <span className="w-2 h-6 bg-primary-500 rounded-full mr-3"></span>
                        Rapport
                    </h3>
                    
                    {/* Contrôles Graphiques et Export */}
                    <div className="flex items-center gap-2">
                        {/* Historique Button - Always Visible */}
                        <Button onClick={() => setShowHistoryModal(true)} variant="secondary" className="!py-1.5 !px-3 !text-xs flex items-center">
                            <HistoryIcon className="w-4 h-4 mr-2" />
                            <span className="hidden sm:inline">Historique</span>
                        </Button>

                        {currentAnalysisResult && (
                            <>
                                {/* Toolbar Graphique */}
                                <div className="flex items-center bg-slate-200 dark:bg-slate-700 rounded-lg p-1 mr-2">
                                    <button onClick={() => setForcedChartType('bar')} className={`p-1.5 rounded ${forcedChartType === 'bar' ? 'bg-white dark:bg-slate-600 shadow text-primary-600' : 'text-slate-500 hover:text-slate-700'}`} title="Barres">
                                        <BarChartIcon className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => setForcedChartType('pie')} className={`p-1.5 rounded ${forcedChartType === 'pie' ? 'bg-white dark:bg-slate-600 shadow text-primary-600' : 'text-slate-500 hover:text-slate-700'}`} title="Camembert">
                                        <PieChartIcon className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => setForcedChartType('doughnut')} className={`p-1.5 rounded ${forcedChartType === 'doughnut' ? 'bg-white dark:bg-slate-600 shadow text-primary-600' : 'text-slate-500 hover:text-slate-700'}`} title="Donut">
                                        <DoughnutChartIcon className="w-4 h-4" />
                                    </button>
                                    <div className="w-px h-4 bg-slate-300 dark:bg-slate-600 mx-1"></div>
                                    <button onClick={cyclePalette} className="p-1.5 rounded hover:bg-white dark:hover:bg-slate-600 text-slate-500 hover:text-primary-600 transition-colors" title="Changer les couleurs">
                                        <PaletteIcon className="w-4 h-4" />
                                    </button>
                                </div>

                                <Button onClick={handleExportWord} variant="secondary" className="!py-1.5 !px-3 !text-xs flex items-center hover:text-blue-600 dark:hover:text-blue-400">
                                    <WordIcon className="w-4 h-4 mr-2" />
                                    <span className="hidden sm:inline">Export Word</span>
                                </Button>
                            </>
                        )}
                    </div>
                </div>

                {/* Contenu Rapport */}
                <div ref={reportContainerRef} className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    {!currentAnalysisResult ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-300 dark:text-slate-600 opacity-50">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <p className="text-lg font-medium">Le rapport s'affichera ici</p>
                        </div>
                    ) : (
                        <div className="space-y-8 animate-fade-in-up">
                            {/* Graphiques affichés en PREMIER */}
                            {currentAnalysisResult.charts && currentAnalysisResult.charts.length > 0 && (
                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 pb-8 border-b border-dashed border-slate-200 dark:border-slate-700">
                                    {currentAnalysisResult.charts.map((chart: any, idx: number) => (
                                        <div key={idx} className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 page-break-inside-avoid shadow-sm hover:shadow-md transition-shadow">
                                            <h4 className="text-center font-semibold text-slate-700 dark:text-slate-300 mb-4 text-sm">{chart.title}</h4>
                                            <ChartRenderer 
                                                chartData={chart} 
                                                forcedType={forcedChartType}
                                                customColors={COLOR_PALETTES[activePalette]}
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Texte HTML (Ensuite) */}
                            <div 
                                className="prose dark:prose-invert max-w-none prose-headings:text-slate-800 dark:prose-headings:text-white prose-p:text-slate-600 dark:prose-p:text-slate-300 prose-li:text-slate-600 dark:prose-li:text-slate-300 prose-strong:text-primary-700 dark:prose-strong:text-primary-400"
                                dangerouslySetInnerHTML={{ __html: currentAnalysisResult.analysisText }} 
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* Modals */}
        {showHistoryModal && (
            <HistoryModal 
                history={analysisHistory} 
                onClose={() => setShowHistoryModal(false)} 
                onLoad={handleLoadHistory}
                onDelete={deleteAnalysisHistory}
            />
        )}
        {confirmation && <ConfirmationModal {...confirmation} />}
    </div>
  );
};

export default Analysis;