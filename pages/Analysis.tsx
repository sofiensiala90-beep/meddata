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
        <div className="bg-slate-50 dark:bg-slate-900/50 p-4 sm:p-6 rounded-2xl sm:rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm relative group overflow-hidden">
            <div className="flex flex-col sm:flex-row justify-between items-start mb-6 gap-4">
                <h4 className="font-black text-slate-800 dark:text-slate-200 text-[10px] sm:text-xs uppercase tracking-widest leading-relaxed pr-0 sm:pr-24">{chart.title}</h4>
                <div className="flex items-center bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-600 p-1 shadow-sm sm:absolute sm:top-4 sm:right-4 z-10">
                    <button onClick={() => setChartType('bar')} className={`p-1.5 rounded-lg transition-colors ${chartType === 'bar' ? 'text-primary-600 bg-primary-50 dark:bg-primary-900/30' : 'text-slate-400 hover:text-slate-600'}`}><BarChartIcon className="w-4 h-4" /></button>
                    <button onClick={() => setChartType('pie')} className={`p-1.5 rounded-lg transition-colors ${chartType === 'pie' ? 'text-primary-600 bg-primary-50 dark:bg-primary-900/30' : 'text-slate-400 hover:text-slate-600'}`}><PieChartIcon className="w-4 h-4" /></button>
                    <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1"></div>
                    <button onClick={togglePalette} className="p-1.5 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-all"><PaletteIcon className="w-4 h-4" /></button>
                </div>
            </div>
            <div className="h-[280px] sm:h-[320px]">
                <ChartRenderer chartData={chart} forcedType={chartType} customColors={COLOR_PALETTES[paletteKey]} />
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

  useEffect(() => { if (analysisContext?.formIds) setSelectedFormIds(analysisContext.formIds); }, [analysisContext]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatHistory, isAnalyzing]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => { if (selectorRef.current && !selectorRef.current.contains(event.target as Node)) setIsSourceSelectorOpen(false); };
    if (isSourceSelectorOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isSourceSelectorOpen]);

  const eligibleForms = useMemo(() => forms.filter(f => user.role === 'admin' ? f.status === 'validated' : (f.status === 'validated' && f.userId === user.id)), [forms, user.id, user.role]);
  
  useEffect(() => {
    setSelectedFormIds(prev => prev.filter(id => eligibleForms.some(f => f.id === id)));
  }, [eligibleForms]);

  const isUnlocked = user.role === 'admin' || (selectedFormIds.length > 0 && selectedFormIds.every(fid => unlockedAnalysis.some(u => u.formId === fid)));

  useEffect(() => {
    if (isUnlocked && selectedFormIds.length > 0 && suggestions.length === 0 && !loadingSuggestions) {
      setLoadingSuggestions(true);
      const selectedForms = eligibleForms.filter(f => selectedFormIds.includes(f.id));
      const selectedResponses = responses.filter(r => selectedFormIds.includes(r.formId));
      getAnalysisSuggestions(selectedForms, selectedResponses).then(setSuggestions).catch(() => setSuggestions([])).finally(() => setLoadingSuggestions(false));
    } else if (selectedFormIds.length === 0) setSuggestions([]);
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
      setChatHistory(prev => [...prev, { role: 'ai', text: "Erreur technique." }]);
    } finally { setIsAnalyzing(false); }
  };

  const handleUnlockAndAnalyze = async () => {
      const success = await onTransaction(user.id, TransactionReason.AiRequest, { formIds: selectedFormIds });
      if (success) handleAnalyze();
  };

  const handleExportWord = () => {
    if (!currentAnalysisResult) return;
    let tableHTML = "<h2>Rapport DASS</h2>";
    currentAnalysisResult.charts?.forEach((c: any) => {
      tableHTML += `<h3>${c.title}</h3><table border="1" style="width:100%;"><tbody>`;
      c.data.labels.forEach((l: string, i: number) => { tableHTML += `<tr><td>${l}</td><td>${c.data.datasets[0].data[i]}</td></tr>`; });
      tableHTML += "</tbody></table><br/>";
    });
    const blob = new Blob(['\ufeff', "<html><body>" + currentAnalysisResult.analysisText + tableHTML + "</body></html>"], { type: 'application/msword' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'Rapport_DASS.doc'; a.click();
  };

  const handleLoadHistory = (item: AnalysisHistory) => {
      setSelectedFormIds(item.formIds);
      setCurrentAnalysisResult(item.analysisResult);
      setChatHistory([{ role: 'user', text: item.userPrompt }, { role: 'ai', text: item.analysisResult.chatResponse }]);
      setShowHistoryModal(false);
      setMobileTab('report');
  };

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] lg:h-[calc(100vh-120px)] gap-2 pb-2">
        <div className="lg:hidden flex bg-white dark:bg-slate-800 rounded-2xl p-1 shadow-sm border border-slate-200 dark:border-slate-700">
            <button onClick={() => setMobileTab('chat')} className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${mobileTab === 'chat' ? 'bg-primary-600 text-white shadow-glow' : 'text-slate-500'}`}>Discussion</button>
            <button onClick={() => setMobileTab('report')} className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${mobileTab === 'report' ? 'bg-primary-600 text-white shadow-glow' : 'text-slate-500'}`}>Rapport</button>
        </div>

        <div className="flex flex-col lg:flex-row h-full gap-4 overflow-hidden">
            {/* DISCUSSION VIEW */}
            <div className={`w-full lg:w-[38%] flex-col bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden ${mobileTab === 'chat' ? 'flex' : 'hidden lg:flex'}`}>
                <div className="p-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20 relative" ref={selectorRef}>
                    <button onClick={() => setIsSourceSelectorOpen(!isSourceSelectorOpen)} className="w-full flex justify-between items-center p-3 bg-white dark:bg-slate-800 border rounded-xl shadow-sm text-xs font-bold uppercase tracking-tight">
                        <span className="truncate">{selectedFormIds.length || "0"} source(s) sélectionnée(s)</span>
                        <svg className={`w-4 h-4 transition-transform ${isSourceSelectorOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path d="M19 9l-7 7-7-7" /></svg>
                    </button>
                    {isSourceSelectorOpen && (
                        <div className="absolute left-3 right-3 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl z-50 p-2 max-h-[50vh] overflow-y-auto custom-scrollbar animate-mobile-slide-up sm:animate-none">
                            {eligibleForms.map(f => {
                                const isFormUnlocked = user.role === 'admin' || unlockedAnalysis.some(u => u.formId === f.id);
                                return (
                                    <label key={f.id} className="flex items-center p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-xl cursor-pointer transition-colors border-b last:border-0 border-slate-50 dark:border-slate-700/50">
                                        <input type="checkbox" checked={selectedFormIds.includes(f.id)} onChange={() => setSelectedFormIds(prev => prev.includes(f.id) ? prev.filter(id => id !== f.id) : [...prev, f.id])} className="h-5 w-5 text-primary-600 rounded-lg border-slate-300 focus:ring-primary-500" />
                                        <div className="ml-3 flex-grow min-w-0">
                                            <span className="text-sm font-bold text-slate-700 dark:text-slate-200 block truncate">{f.title}</span>
                                            {!isFormUnlocked && <span className="text-[9px] font-black uppercase text-amber-500 bg-amber-50 dark:bg-amber-900/30 px-1.5 py-0.5 rounded flex items-center w-fit mt-1">🔒 Verrouillé</span>}
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
                                <div className="p-6 text-center space-y-4 animate-fade-in my-auto">
                                    <div className="mx-auto w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center text-amber-600"><svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg></div>
                                    <h4 className="font-black uppercase tracking-tighter text-slate-800 dark:text-white">Débloquer l'Analyse</h4>
                                    <p className="text-xs text-slate-500 leading-relaxed">Cette action débloquera l'intelligence biostatistique DASS pour ces formulaires.</p>
                                    <Button onClick={handleUnlockAndAnalyze} className="w-full !py-4 shadow-glow font-black uppercase text-[10px] tracking-widest">Activer ({systemSettings.coinCosts.aiAnalysis} Coins)</Button>
                                </div>
                            ) : (
                                <>
                                    {chatHistory.length === 0 && (
                                        <div className="space-y-2 mb-4 animate-fade-in">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Expert Suggestions</p>
                                            {loadingSuggestions ? <div className="flex items-center space-x-3 p-4 bg-white/50 dark:bg-slate-800/50 rounded-xl border border-slate-200 animate-pulse"><Spinner className="w-4 h-4" /></div>
                                            : suggestions.map((s, i) => (
                                                <button key={i} onClick={() => handleAnalyze(s.searchPrompt)} className="block w-full text-left p-3.5 text-xs bg-white dark:bg-slate-800 border-2 border-transparent hover:border-primary-400 rounded-2xl shadow-sm transition-all group">
                                                    <span className="font-black text-primary-600 block mb-1">✨ {s.title}</span>
                                                    <p className="text-[10px] text-slate-500 leading-snug">{s.description}</p>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    {chatHistory.map((m, i) => (
                                        <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[85%] p-4 rounded-2xl text-sm shadow-sm ${m.role === 'user' ? 'bg-primary-600 text-white rounded-tr-none' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-tl-none'}`} dangerouslySetInnerHTML={{ __html: m.text }} />
                                        </div>
                                    ))}
                                    {isAnalyzing && <div className="flex items-center space-x-3 p-3 animate-pulse italic text-xs text-slate-400 font-bold"><Spinner className="w-4 h-4" /> DASS analyse vos données...</div>}
                                    <div ref={chatEndRef} />
                                </>
                            )}
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-slate-300 text-center p-8 space-y-4">
                            <div className="p-6 bg-slate-100 dark:bg-slate-800 rounded-3xl opacity-40"><svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" /></svg></div>
                            <p className="text-xs font-black uppercase tracking-widest">Sélectionnez une source</p>
                        </div>
                    )}
                </div>
                {isUnlocked && (
                    <div className="p-3 sm:p-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-top">
                        <div className="relative">
                            <textarea value={userPrompt} onChange={e => setUserPrompt(e.target.value)} placeholder="Posez une question..." rows={1} className="w-full p-4 pr-14 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl resize-none text-sm font-medium focus:ring-2 focus:ring-primary-500 shadow-inner min-h-[56px] max-h-32" />
                            <button onClick={() => handleAnalyze()} disabled={isAnalyzing || !userPrompt.trim()} className="absolute right-2 bottom-2 p-3 bg-primary-600 text-white rounded-xl shadow-glow hover:scale-105 active:scale-95 disabled:opacity-50 transition-all"><svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg></button>
                        </div>
                    </div>
                )}
            </div>

            {/* REPORT VIEW */}
            <div className={`w-full lg:w-[62%] bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 flex-col overflow-hidden ${mobileTab === 'report' ? 'flex' : 'hidden lg:flex'}`}>
                <div className="flex justify-between items-center p-3 sm:p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/10 gap-2">
                    <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-tighter text-xs sm:text-sm">Rapport Statistique</h3>
                    <div className="flex gap-1.5">
                        <Button onClick={() => setShowHistoryModal(true)} variant="secondary" className="!py-2 !px-3 !text-[9px] uppercase font-black"><HistoryIcon className="w-3.5 h-3.5 mr-1" /> Historique</Button>
                        {currentAnalysisResult && <Button onClick={handleExportWord} variant="secondary" className="!py-2 !px-3 !text-[9px] uppercase font-black"><WordIcon className="w-3.5 h-3.5 mr-1" /> Word</Button>}
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 sm:p-10 custom-scrollbar space-y-10">
                    {currentAnalysisResult ? (
                        <div className="animate-fade-in-up">
                            {currentAnalysisResult.charts?.length > 0 && (
                                <div className="grid grid-cols-1 gap-6 sm:gap-10 pb-10 mb-10 border-b border-dashed border-slate-200 dark:border-slate-700">
                                    {currentAnalysisResult.charts.map((c: any, i: number) => <ChartItem key={i} chart={c} index={i} />)}
                                </div>
                            )}
                            <div className="prose dark:prose-invert max-w-none prose-headings:font-black prose-headings:uppercase prose-headings:tracking-tighter" dangerouslySetInnerHTML={{ __html: currentAnalysisResult.analysisText }} />
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-slate-300 space-y-6 animate-pulse p-10 text-center">
                            <div className="w-full max-w-xs space-y-3">
                                <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full w-3/4 mx-auto opacity-80"></div>
                                <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full w-full opacity-60"></div>
                                <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full w-2/3 mx-auto opacity-40"></div>
                            </div>
                            <p className="italic text-xs font-bold uppercase tracking-widest opacity-40">Le rapport apparaîtra ici après analyse.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* MODAL HISTORIQUE (Enhanced Mobile) */}
        {showHistoryModal && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-end sm:items-center z-[100] p-0 sm:p-4" onClick={() => setShowHistoryModal(false)}>
                <div className="bg-white dark:bg-slate-800 rounded-t-3xl sm:rounded-[2.5rem] shadow-2xl w-full max-w-2xl h-[85vh] sm:max-h-[80vh] flex flex-col overflow-hidden animate-mobile-slide-up sm:animate-scale-up" onClick={e => e.stopPropagation()}>
                    <header className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                        <h3 className="text-xl font-black uppercase tracking-tighter">Historique</h3>
                        <button onClick={() => setShowHistoryModal(false)} className="p-2 text-slate-300"><svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path d="M6 18L18 6M6 6l12 12" /></svg></button>
                    </header>
                    <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 custom-scrollbar bg-slate-50/30">
                        {analysisHistory.length > 0 ? (
                            analysisHistory.map(item => (
                                <div key={item.id} className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm hover:border-primary-400 transition-all cursor-pointer relative group" onClick={() => handleLoadHistory(item)}>
                                    <p className="text-[9px] font-black text-primary-500 uppercase tracking-widest mb-1.5">{new Date(item.createdAt).toLocaleString()}</p>
                                    <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase leading-tight line-clamp-1">"{item.userPrompt}"</h4>
                                    <div className="flex flex-wrap gap-1 mt-2">
                                        {item.formTitles?.slice(0, 3).map((t, idx) => (
                                            <span key={idx} className="text-[8px] font-black bg-slate-100 dark:bg-slate-700 text-slate-400 px-1.5 py-0.5 rounded uppercase">{t}</span>
                                        ))}
                                    </div>
                                    <button onClick={(e) => { e.stopPropagation(); deleteAnalysisHistory(item.id!); }} className="absolute top-4 right-4 p-2 text-slate-300 hover:text-red-500"><TrashIcon className="w-4 h-4" /></button>
                                </div>
                            ))
                        ) : <div className="text-center py-20 text-slate-300 italic">Historique vide.</div>}
                    </main>
                </div>
            </div>
        )}

        {confirmation && <ConfirmationModal {...confirmation} />}
    </div>
  );
};

export default Analysis;