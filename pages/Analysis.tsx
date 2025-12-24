
// Added React import to provide access to the React namespace for React.FC
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { User, Form, FormResponse, TransactionReason, AnalysisHistory, SystemSettings, UnlockedAnalysis } from '../types';
import Button from '../components/Button';
import Spinner from '../components/Spinner';
import ChartRenderer from '../components/ChartRenderer';
import { getAnalysis, getAnalysisSuggestions } from '../services/geminiService';
import ConfirmationModal, { ConfirmationModalProps } from '../components/ConfirmationModal';
import CoinIcon from '../components/icons/CoinIcon';
import HistoryIcon from '../components/icons/HistoryIcon';
import WordIcon from '../components/icons/WordIcon';
import TrashIcon from '../components/icons/TrashIcon';
import BarChartIcon from '../components/icons/BarChartIcon';
import PieChartIcon from '../components/icons/PieChartIcon';
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
  unlockedAnalysis: UnlockedAnalysis[];
  systemSettings: SystemSettings;
}

const COLOR_PALETTES = {
    default: ['#14b8a6', '#0f766e', '#2dd4bf', '#5eead4', '#99f6e4', '#ccfbf1', '#0d9488', '#042f2e'],
    vibrant: ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316'],
    classic: ['#1d4ed8', '#dc2626', '#16a34a', '#d97706', '#7c3aed', '#db2777', '#0891b2', '#be123c'],
};

// Fixed missing React namespace by adding React import on line 2
const ChartItem: React.FC<{ chart: any; index: number }> = ({ chart, index }) => {
    const [chartType, setChartType] = useState<'bar' | 'pie'>(
        chart.type === 'doughnut' ? 'pie' : (chart.type || 'bar')
    );
    const [paletteKey, setPaletteKey] = useState<keyof typeof COLOR_PALETTES>('default');

    const togglePalette = () => {
        const keys = Object.keys(COLOR_PALETTES) as (keyof typeof COLOR_PALETTES)[];
        const currentIndex = keys.indexOf(paletteKey);
        const nextIndex = (currentIndex + 1) % keys.length;
        setPaletteKey(keys[nextIndex]);
    };

    return (
        <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm relative group overflow-hidden">
            <div className="flex justify-between items-start mb-6">
                <h4 className="font-black text-slate-800 dark:text-slate-200 text-xs uppercase tracking-widest pr-24 leading-relaxed">{chart.title}</h4>
                <div className="flex items-center bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-600 p-1 shadow-sm absolute top-4 right-4 z-10 transition-all opacity-80 hover:opacity-100">
                    <button 
                        onClick={() => setChartType('bar')} 
                        className={`p-1.5 rounded-lg transition-colors ${chartType === 'bar' ? 'text-primary-600 bg-primary-50 dark:bg-primary-900/30' : 'text-slate-400 hover:text-slate-600'}`}
                        title="Histogramme"
                    >
                        <BarChartIcon className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={() => setChartType('pie')} 
                        className={`p-1.5 rounded-lg transition-colors ${chartType === 'pie' ? 'text-primary-600 bg-primary-50 dark:bg-primary-900/30' : 'text-slate-400 hover:text-slate-600'}`}
                        title="Secteurs"
                    >
                        <PieChartIcon className="w-4 h-4" />
                    </button>
                    <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1"></div>
                    <button 
                        onClick={togglePalette} 
                        className="p-1.5 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-all"
                        title="Changer les couleurs"
                    >
                        <PaletteIcon className="w-4 h-4" />
                    </button>
                </div>
            </div>
            <ChartRenderer chartData={chart} forcedType={chartType} customColors={COLOR_PALETTES[paletteKey]} />
        </div>
    );
};

// Fixed missing React namespace by adding React import on line 2
const Analysis: React.FC<AnalysisProps> = ({ 
  user, forms, responses, onTransaction, analysisContext, onNavigate, 
  analysisHistory, saveAnalysisToHistory, deleteAnalysisHistory, unlockedAnalysis, systemSettings 
}) => {
  const [selectedFormIds, setSelectedFormIds] = useState<string[]>([]);
  const [userPrompt, setUserPrompt] = useState('');
  const [chatHistory, setChatHistory] = useState<{role: 'user' | 'ai', text: string}[]>([]);
  const [currentAnalysisResult, setCurrentAnalysisResult] = useState<any | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [confirmation, setConfirmation] = useState<ConfirmationModalProps | null>(null);
  const [mobileTab, setMobileTab] = useState<'chat' | 'report'>('chat');
  const [isSourceSelectorOpen, setIsSourceSelectorOpen] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const selectorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (analysisContext?.formIds) setSelectedFormIds(analysisContext.formIds);
  }, [analysisContext]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isAnalyzing]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (selectorRef.current && !selectorRef.current.contains(event.target as Node)) {
            setIsSourceSelectorOpen(false);
        }
    };
    if (isSourceSelectorOpen) {
        document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isSourceSelectorOpen]);

  const eligibleForms = useMemo(() => {
    return forms.filter(f => {
        const isValidated = f.status === 'validated';
        const isOwner = f.userId === user.id;
        if (user.role === 'admin') return isValidated;
        return isValidated && isOwner;
    });
  }, [forms, user.id, user.role]);

  useEffect(() => {
    setSelectedFormIds(prev => {
        const next = prev.filter(id => eligibleForms.some(f => f.id === id));
        if (next.length !== prev.length) setSuggestions([]);
        return next;
    });
  }, [eligibleForms]);

  const isUnlocked = user.role === 'admin' || (selectedFormIds.length > 0 && selectedFormIds.every(fid => unlockedAnalysis.some(u => u.formId === fid)));

  useEffect(() => {
    if (isUnlocked && selectedFormIds.length > 0 && suggestions.length === 0 && !loadingSuggestions) {
      setLoadingSuggestions(true);
      const selectedForms = eligibleForms.filter(f => selectedFormIds.includes(f.id));
      const selectedResponses = responses.filter(r => selectedFormIds.includes(r.formId));
      getAnalysisSuggestions(selectedForms, selectedResponses)
        .then(setSuggestions)
        .catch(() => setSuggestions([]))
        .finally(() => setLoadingSuggestions(false));
    } else if (selectedFormIds.length === 0) {
        setSuggestions([]);
    }
  }, [isUnlocked, selectedFormIds, eligibleForms, responses]);

  const handleAnalyze = async (prompt: string = userPrompt) => {
    if (!prompt.trim()) return;
    setChatHistory(prev => [...prev, { role: 'user', text: prompt }]);
    setUserPrompt('');
    setIsAnalyzing(true);
    if (window.innerWidth < 1024) setMobileTab('report');

    try {
      const selectedForms = eligibleForms.filter(f => selectedFormIds.includes(f.id));
      const selectedResponses = responses.filter(r => selectedFormIds.includes(r.formId));
      const result = await getAnalysis(selectedForms, selectedResponses, prompt, currentAnalysisResult);
      setCurrentAnalysisResult(result);
      setChatHistory(prev => [...prev, { role: 'ai', text: result.chatResponse }]);
      saveAnalysisToHistory(selectedFormIds, selectedForms.map(f => f.title), prompt, result);
    } catch (e) {
      setChatHistory(prev => [...prev, { role: 'ai', text: "Erreur lors de l'analyse." }]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleUnlockAndAnalyze = async () => {
      const success = await onTransaction(user.id, TransactionReason.AiRequest, { formIds: selectedFormIds });
      if (success) {
          handleAnalyze();
      }
  };

  const handleExportWord = () => {
    if (!currentAnalysisResult) return;
    let tableHTML = "<br/><hr/><br/><h2>Annexe : Tableaux de Données</h2>";
    currentAnalysisResult.charts?.forEach((c: any) => {
      tableHTML += `<h3>${c.title}</h3><table border="1" style="width:100%; border-collapse:collapse;"><thead><tr><th>Variable</th><th>Valeur</th></tr></thead><tbody>`;
      c.data.labels.forEach((l: string, i: number) => {
        tableHTML += `<tr><td>${l}</td><td>${c.data.datasets[0].data[i]}</td></tr>`;
      });
      tableHTML += "</tbody></table><br/>";
    });

    const header = "<html><head><meta charset='utf-8'></head><body>";
    const blob = new Blob(['\ufeff', header + currentAnalysisResult.analysisText + tableHTML + "</body></html>"], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'Rapport_DASS.doc'; a.click();
  };

  const handleLoadHistory = (item: AnalysisHistory) => {
      setSelectedFormIds(item.formIds);
      setCurrentAnalysisResult(item.analysisResult);
      setChatHistory([{ role: 'user', text: item.userPrompt }, { role: 'ai', text: item.analysisResult.chatResponse }]);
      setShowHistoryModal(false);
      setMobileTab('report');
  };

  return (
    <div className="flex flex-col h-[calc(100vh-110px)] gap-4 pb-2">
        <div className="lg:hidden flex border-b border-slate-200 dark:border-slate-700">
            <button onClick={() => setMobileTab('chat')} className={`flex-1 py-2 text-sm font-bold ${mobileTab === 'chat' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-slate-500'}`}>Discussion</button>
            <button onClick={() => setMobileTab('report')} className={`flex-1 py-2 text-sm font-bold ${mobileTab === 'report' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-slate-500'}`}>Rapport</button>
        </div>

        <div className="flex flex-col lg:flex-row h-full gap-6 overflow-hidden">
            <div className={`w-full lg:w-[35%] flex-col bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden ${mobileTab === 'chat' ? 'flex' : 'hidden lg:flex'}`}>
                <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20 relative" ref={selectorRef}>
                    <button onClick={() => setIsSourceSelectorOpen(!isSourceSelectorOpen)} className="w-full flex justify-between items-center p-3 bg-white dark:bg-slate-800 border rounded-xl shadow-sm text-sm">
                        <span className="font-medium text-slate-700 dark:text-2xl-200">{selectedFormIds.length || "0"} source(s) sélectionnée(s)</span>
                        <svg className={`w-5 h-5 text-slate-400 transition-transform ${isSourceSelectorOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                    </button>
                    {isSourceSelectorOpen && (
                        <div className="absolute left-4 right-4 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl z-50 p-2 max-h-64 overflow-y-auto custom-scrollbar" onClick={e => e.stopPropagation()}>
                            {eligibleForms.map(f => {
                                const isFormUnlocked = user.role === 'admin' || unlockedAnalysis.some(u => u.formId === f.id);
                                return (
                                    <label key={f.id} className="flex items-center p-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg cursor-pointer group transition-colors">
                                        <input 
                                            type="checkbox" 
                                            checked={selectedFormIds.includes(f.id)} 
                                            onChange={() => setSelectedFormIds(prev => prev.includes(f.id) ? prev.filter(id => id !== f.id) : [...prev, f.id])} 
                                            className="h-4 w-4 text-primary-600 rounded border-slate-300 focus:ring-primary-500" 
                                        />
                                        <div className="ml-3 flex-grow flex items-center justify-between min-w-0">
                                            <span className="text-sm text-slate-700 dark:text-slate-200 truncate pr-2">{f.title}</span>
                                            {!isFormUnlocked && (
                                                <svg className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-500 transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                                </svg>
                                            )}
                                        </div>
                                    </label>
                                );
                            })}
                        </div>
                    )}
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-900/50 custom-scrollbar">
                    {selectedFormIds.length > 0 ? (
                        <>
                            {!isUnlocked ? (
                                <div className="p-6 text-center space-y-4 animate-fade-in">
                                    <div className="inline-flex items-center justify-center p-4 bg-amber-50 dark:bg-amber-900/20 rounded-full text-amber-600 dark:text-amber-400">
                                        <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                    </div>
                                    <div className="space-y-2">
                                        <h4 className="font-bold text-slate-800 dark:text-white">Analyse Verrouillée</h4>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">Certaines sources sélectionnées ne sont pas débloquées pour l'analyse IA avancée.</p>
                                    </div>
                                    <Button onClick={handleUnlockAndAnalyze} className="w-full py-3 shadow-glow">
                                        Débloquer la sélection ({systemSettings.coinCosts.aiAnalysis} Coins)
                                    </Button>
                                </div>
                            ) : (
                                <>
                                    {chatHistory.length === 0 && (
                                        <div className="space-y-2 mb-4 animate-fade-in">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Suggestions d'expert</p>
                                            {loadingSuggestions ? (
                                                <div className="flex justify-start items-center space-x-3 p-3 animate-pulse bg-white/50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                                                    <Spinner className="w-4 h-4 text-primary-500" />
                                                    <span className="text-xs text-slate-400 font-medium italic">DASS réfléchit pour suggérer...</span>
                                                </div>
                                            ) : suggestions.length > 0 ? (
                                                suggestions.map((s, i) => (
                                                    <button key={i} onClick={() => handleAnalyze(s.searchPrompt)} className="block w-full text-left p-3 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-primary-400 hover:shadow-md transition-all group">
                                                        <span className="font-bold text-primary-600 dark:text-primary-400 group-hover:scale-110 inline-block mr-1">✨</span> {s.title}
                                                    </button>
                                                ))
                                            ) : (
                                                <p className="text-[10px] text-slate-400 italic px-1">Aucune suggestion disponible.</p>
                                            )}
                                        </div>
                                    )}
                                    {chatHistory.map((m, i) => (
                                        <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in-up`}>
                                            <div className={`max-w-[90%] p-3 rounded-2xl text-sm shadow-sm ${m.role === 'user' ? 'bg-primary-600 text-white rounded-tr-none' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-tl-none'}`} dangerouslySetInnerHTML={{ __html: m.text }} />
                                        </div>
                                    ))}
                                    {isAnalyzing && (
                                        <div className="flex justify-start items-center space-x-3 p-3 animate-pulse">
                                            <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                                                <Spinner className="w-4 h-4 text-primary-500" />
                                            </div>
                                            <span className="text-xs text-slate-400 font-medium italic">DASS réfléchit...</span>
                                        </div>
                                    )}
                                    <div ref={chatEndRef} />
                                </>
                            )}
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-4 px-6 text-center italic">
                            <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full">
                                <svg className="w-12 h-12 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>
                            </div>
                            <p className="text-sm">Veuillez sélectionner au moins une source validée dans le menu ci-dessus pour débuter l'analyse.</p>
                        </div>
                    )}
                </div>
                {isUnlocked && (
                    <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xl">
                        <div className="relative">
                            <textarea value={userPrompt} onChange={e => setUserPrompt(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleAnalyze())} placeholder="Posez une question sur vos données..." rows={2} className="w-full p-4 pr-14 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl resize-none text-sm focus:ring-2 focus:ring-primary-500 transition-all shadow-inner" />
                            <button onClick={() => handleAnalyze()} disabled={isAnalyzing || !userPrompt.trim()} className="absolute right-2 bottom-2 p-3 bg-primary-600 text-white rounded-xl shadow-glow hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 transition-all">
                                <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <div className={`w-full lg:w-[65%] bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 flex-col overflow-hidden ${mobileTab === 'report' ? 'flex' : 'hidden lg:flex'}`}>
                <div className="flex justify-between items-center p-5 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/10">
                    <div className="flex items-center">
                        <div className="w-2 h-6 bg-primary-500 rounded-full mr-3 shadow-glow"></div>
                        <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-tighter">Rapport DASS</h3>
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={() => setShowHistoryModal(true)} variant="secondary" className="!py-1.5 !px-3 !text-xs rounded-xl"><HistoryIcon className="w-4 h-4 mr-1.5" /> Historique</Button>
                        {currentAnalysisResult && <Button onClick={handleExportWord} variant="secondary" className="!py-1.5 !px-3 !text-xs rounded-xl"><WordIcon className="w-4 h-4 mr-1.5" /> Exporter Word</Button>}
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-8 lg:p-12 custom-scrollbar space-y-12">
                    {currentAnalysisResult ? (
                        <div className="animate-fade-in-up">
                            {currentAnalysisResult.charts?.length > 0 && (
                                <div className="grid grid-cols-1 gap-12 pb-12 mb-12 border-b border-dashed border-slate-200 dark:border-slate-700">
                                    {currentAnalysisResult.charts.map((c: any, i: number) => <ChartItem key={i} chart={c} index={i} />)}
                                </div>
                            )}
                            <div className="prose dark:prose-invert max-w-none prose-headings:font-black prose-headings:uppercase prose-headings:tracking-tighter prose-p:leading-relaxed prose-li:my-1" dangerouslySetInnerHTML={{ __html: currentAnalysisResult.analysisText }} />
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-slate-300 space-y-4 animate-pulse">
                            <div className="w-24 h-2 bg-slate-100 dark:bg-slate-700 rounded-full"></div>
                            <div className="w-48 h-2 bg-slate-100 dark:bg-slate-700 rounded-full opacity-60"></div>
                            <div className="w-32 h-2 bg-slate-100 dark:bg-slate-700 rounded-full opacity-40"></div>
                            <p className="italic text-sm font-medium pt-4">Le rapport d'analyse biostatistique apparaîtra ici.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* MODAL HISTORIQUE */}
        {showHistoryModal && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-[100] p-4" onClick={() => setShowHistoryModal(false)}>
                <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-scale-up" onClick={e => e.stopPropagation()}>
                    <header className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/10">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-xl text-primary-600 dark:text-primary-400">
                                <HistoryIcon className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">Historique des Analyses</h3>
                        </div>
                        <button onClick={() => setShowHistoryModal(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </header>
                    <main className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar bg-slate-50/30 dark:bg-slate-900/5">
                        {analysisHistory.length > 0 ? (
                            analysisHistory.map(item => (
                                <div key={item.id} className="group relative bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 hover:border-primary-300 hover:shadow-lg transition-all cursor-pointer" onClick={() => handleLoadHistory(item)}>
                                    <div className="flex justify-between items-start mb-2">
                                        <p className="text-[10px] font-black text-primary-500 uppercase tracking-widest">{new Date(item.createdAt).toLocaleString()}</p>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); deleteAnalysisHistory(item.id!); }}
                                            className="p-1.5 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                        >
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <h4 className="text-sm font-bold text-slate-800 dark:text-white mb-1 line-clamp-1">"{item.userPrompt}"</h4>
                                    <div className="flex flex-wrap gap-1.5">
                                        {item.formTitles?.map((t, idx) => (
                                            <span key={idx} className="text-[9px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-500 px-2 py-0.5 rounded-full uppercase">{t}</span>
                                        ))}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-4">
                                <HistoryIcon className="w-12 h-12 opacity-20" />
                                <p className="text-sm font-bold uppercase tracking-widest italic opacity-50">Aucun historique disponible</p>
                            </div>
                        )}
                    </main>
                    <footer className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-center">
                        <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tight">Vos analyses sont sauvegardées automatiquement après chaque génération.</p>
                    </footer>
                </div>
            </div>
        )}

        {confirmation && <ConfirmationModal {...confirmation} />}
    </div>
  );
};

export default Analysis;
