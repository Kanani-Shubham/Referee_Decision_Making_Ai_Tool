import React, { useState } from 'react';
import { UserPreferences, DecisionCategory, DynamicParameter } from '../types';
import { getDynamicParameters } from '../services/gemini';

interface DecisionFormProps {
  onSubmit: (prefs: UserPreferences) => void;
  isSubmitting: boolean;
}

const CATEGORIES: DecisionCategory[] = ['Tech Stack', 'Career Move', 'Major Purchase', 'Hiring', 'Custom'];

export const DecisionForm: React.FC<DecisionFormProps> = ({ onSubmit, isSubmitting }) => {
  const [phase, setPhase] = useState<'intent' | 'config'>('intent');
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [category, setCategory] = useState<DecisionCategory>('Tech Stack');
  const [problemStatement, setProblemStatement] = useState('');
  const [dynamicParams, setDynamicParams] = useState<DynamicParameter[]>([]);
  const [suggestedPriorities, setSuggestedPriorities] = useState<string[]>([]);
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([]);
  const [aiAssisted, setAiAssisted] = useState(true);

  const handleNextPhase = async () => {
    if (!problemStatement.trim()) return;
    setLoadingConfig(true);
    try {
      const { parameters, suggestedPriorities: priorities } = await getDynamicParameters(category, problemStatement);
      setDynamicParams(parameters);
      setSuggestedPriorities(priorities);
      setPhase('config');
    } catch (error) {
      console.error(error);
      alert("Failed to analyze setup. Please try again.");
    } finally {
      setLoadingConfig(false);
    }
  };

  const handleFinalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      category,
      problemStatement,
      dynamicParams,
      priorities: selectedPriorities,
    });
  };

  const updateParamValue = (id: string, value: any) => {
    setDynamicParams(prev => prev.map(p => p.id === id ? { ...p, value } : p));
  };

  const togglePriority = (p: string) => {
    setSelectedPriorities(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  };

  if (phase === 'intent') {
    return (
      <div className="min-h-screen py-12 px-4 flex justify-center items-center">
        <div className="max-w-2xl w-full space-y-8 glass-card p-8 md:p-12 rounded-3xl shadow-xl">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white">What's the dilemma?</h2>
            <p className="mt-2 text-slate-500">The Referee will build a custom framework for you.</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-all ${
                  category === cat
                    ? 'bg-primary-600 text-white border-primary-600 shadow-md'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            <textarea
              required
              rows={4}
              className="appearance-none block w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none transition-all"
              placeholder="Describe your situation in detail..."
              value={problemStatement}
              onChange={(e) => setProblemStatement(e.target.value)}
            />

            <div className="flex items-center justify-between p-4 bg-primary-50 dark:bg-primary-900/10 rounded-xl">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-6 rounded-full p-1 cursor-pointer transition-colors ${aiAssisted ? 'bg-primary-600' : 'bg-slate-300'}`} onClick={() => setAiAssisted(!aiAssisted)}>
                  <div className={`w-4 h-4 bg-white rounded-full transition-transform ${aiAssisted ? 'translate-x-4' : ''}`}></div>
                </div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Enable AI-assisted best setup</span>
              </div>
              <span className="text-[10px] font-bold uppercase text-primary-600 dark:text-primary-400">Recommended</span>
            </div>

            <button
              onClick={handleNextPhase}
              disabled={loadingConfig || !problemStatement.trim()}
              className="w-full flex justify-center py-4 px-4 rounded-xl shadow-sm text-lg font-bold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 transition-all"
            >
              {loadingConfig ? 'Generating Decision Matrix...' : 'Analyze Requirements'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4 flex justify-center items-center">
      <div className="max-w-3xl w-full space-y-8 glass-card p-8 md:p-12 rounded-3xl shadow-xl">
        <div className="flex items-center justify-between">
          <button onClick={() => setPhase('intent')} className="text-sm text-slate-500 flex items-center gap-2 hover:text-primary-600 transition-colors">
            ← Back to intent
          </button>
          <span className="text-xs font-bold text-primary-600 uppercase">Phase 2: Fine Tuning</span>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Refine Constraints</h2>
          <p className="text-sm text-slate-500">Based on your input, these factors are the most critical.</p>
        </div>

        <form onSubmit={handleFinalSubmit} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            {dynamicParams.map((param) => (
              <div key={param.id} className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold uppercase text-slate-500">{param.label}</label>
                  <div className="flex items-center gap-1">
                    {param.type === 'slider' ? (
                      <>
                        <input
                          type="number"
                          min={param.min || 0}
                          max={param.max || 100}
                          value={param.value}
                          onChange={(e) => updateParamValue(param.id, e.target.value === '' ? '' : Number(e.target.value))}
                          onBlur={(e) => {
                            const min = param.min || 0;
                            const max = param.max || 100;
                            let val = Number(e.target.value);
                            if (isNaN(val)) val = min;
                            val = Math.max(min, Math.min(max, val));
                            updateParamValue(param.id, val);
                          }}
                          className="w-12 text-right text-xs font-mono text-primary-600 bg-transparent border-none outline-none focus:ring-0 p-0 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                        />
                        <span className="text-xs font-mono text-primary-600">{param.unit || ''}</span>
                      </>
                    ) : (
                      <span className="text-xs font-mono text-primary-600">{param.value}{param.unit ? ` ${param.unit}` : ''}</span>
                    )}
                  </div>
                </div>
                
                {param.type === 'slider' && (
                  <input
                    type="range"
                    min={param.min || 0}
                    max={param.max || 100}
                    value={param.value === '' ? 0 : param.value}
                    onChange={(e) => updateParamValue(param.id, Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-300"
                  />
                )}

                {param.type === 'toggle' && (
                  <button
                    type="button"
                    onClick={() => updateParamValue(param.id, !param.value)}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all border ${
                      param.value 
                      ? 'bg-primary-100 dark:bg-primary-900/30 border-primary-500 text-primary-700 dark:text-primary-300' 
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'
                    }`}
                  >
                    {param.value ? 'Active' : 'Inactive'}
                  </button>
                )}

                {param.type === 'select' && (
                  <select
                    value={param.value}
                    onChange={(e) => updateParamValue(param.id, e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {param.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                )}

                <p className="text-[10px] text-slate-400 italic">Referee: {param.reason}</p>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <label className="block text-xs font-bold uppercase text-slate-500 mb-4">Core Priorities</label>
            <div className="flex flex-wrap gap-2">
              {suggestedPriorities.map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => togglePriority(p)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                    selectedPriorities.includes(p)
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'bg-transparent border-slate-300 dark:border-slate-600 text-slate-500'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 rounded-xl text-lg font-bold text-white bg-primary-600 hover:bg-primary-700 transition-all flex items-center justify-center gap-2 focus:outline-none focus:ring-4 focus:ring-primary-300"
          >
            {isSubmitting ? 'Finalizing Analysis...' : 'Get Judgment'}
          </button>
        </form>
      </div>
    </div>
  );
};