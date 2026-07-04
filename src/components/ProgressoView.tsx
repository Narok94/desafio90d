import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { Medida, Usuario, FotoProgresso } from '../types';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Scale, Camera, Upload, Plus, Sparkles, Image as ImageIcon, Check, Ruler, Calendar, ChevronRight, ChevronLeft, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ProgressoViewProps {
  usuario: Usuario;
  medidas: Medida[];
  fotos: FotoProgresso[];
  loadingFotos: boolean;
  onRefreshMedidas: () => Promise<void>;
}

export default function ProgressoView({ usuario, medidas, fotos, loadingFotos, onRefreshMedidas }: ProgressoViewProps) {
  // Database photos state
  const [dataInicio, setDataInicio] = useState<string>('2026-07-06');

  // Toggle Forms
  const [showMedicaoForm, setShowMedicaoForm] = useState<boolean>(false);
  const [showFotoForm, setShowFotoForm] = useState<boolean>(false);
  
  // Forms general loading/error state
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // Helper to parse dates securely to avoid timezone shifting
  const parseDate = (dateStr: string) => {
    const parts = dateStr.split('-');
    return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  };

  const getDaysDifference = (dateStr1: string, dateStr2: string): number => {
    if (!dateStr1 || !dateStr2) return 0;
    const d1 = parseDate(dateStr1);
    const d2 = parseDate(dateStr2);
    const diffTime = d1.getTime() - d2.getTime();
    return Math.round(diffTime / (1000 * 60 * 60 * 24));
  };

  const addDays = (dateStr: string, days: number): string => {
    const d = parseDate(dateStr);
    d.setDate(d.getDate() + days);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const isMilestoneCompleted = (dayOffset: number) => {
    if (!dataInicio) return false;
    const mDateStart = addDays(dataInicio, dayOffset);
    const mDateEnd = addDays(mDateStart, 3);
    
    const hasMedida = medidas.some(m => m.data >= mDateStart && m.data <= mDateEnd);
    const hasFoto = fotos.some(f => f.data >= mDateStart && f.data <= mDateEnd);
    
    return hasMedida && hasFoto;
  };

  const todayStr = new Date().toISOString().split('T')[0];

  const pendingMilestones = [
    { day: 30, label: 'Dia 30', text: '📸 Chegou o Dia 30! Hora de atualizar sua foto e medidas.' },
    { day: 60, label: 'Dia 60', text: '📸 Chegou o Dia 60! Hora de atualizar sua foto e medidas.' },
    { day: 90, label: 'Dia 90', text: '📸 Reta final! Dia 90 — hora do registro final de evolução.' }
  ].filter(m => {
    const mDate = addDays(dataInicio, m.day);
    return todayStr >= mDate && !isMilestoneCompleted(m.day);
  });

  const getMilestoneTag = (dateStr: string) => {
    if (!dataInicio) return null;
    const diff = getDaysDifference(dateStr, dataInicio);
    if (diff >= 0 && diff <= 3) return 'Dia 0';
    if (diff >= 30 && diff <= 33) return 'Dia 30';
    if (diff >= 60 && diff <= 63) return 'Dia 60';
    if (diff >= 90 && diff <= 93) return 'Dia 90';
    return null;
  };

  const renderMilestoneTag = (tag: string) => {
    if (!tag) return null;
    let colorClasses = 'bg-slate-100 text-slate-700 border-slate-200';
    if (tag === 'Dia 0') colorClasses = 'bg-amber-50 text-amber-700 border-amber-200';
    if (tag === 'Dia 30') colorClasses = 'bg-blue-50 text-blue-700 border-blue-150';
    if (tag === 'Dia 60') colorClasses = 'bg-purple-50 text-purple-700 border-purple-150';
    if (tag === 'Dia 90') colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black border ${colorClasses}`}>
        {tag}
      </span>
    );
  };

  // New Measurement Form States
  const [dataMedicao, setDataMedicao] = useState<string>(new Date().toISOString().split('T')[0]);
  const [peso, setPeso] = useState<string>('');
  const [bracoDireito, setBracoDireito] = useState<string>('');
  const [bracoEsquerdo, setBracoEsquerdo] = useState<string>('');
  const [pernaDireita, setPernaDireita] = useState<string>('');
  const [pernaEsquerda, setPernaEsquerda] = useState<string>('');
  const [barriga, setBarriga] = useState<string>('');
  const [cintura, setCintura] = useState<string>('');
  const [quadril, setQuadril] = useState<string>('');
  const [peito, setPeito] = useState<string>('');
  const [observacao, setObservacao] = useState<string>('');

  // New Photo Form States
  const [dataFoto, setDataFoto] = useState<string>(new Date().toISOString().split('T')[0]);
  const [legenda, setLegenda] = useState<string>('');
  const [selectedFiles, setSelectedFiles] = useState<Record<string, File | null>>({
    frente: null,
    costas: null,
    lado_direito: null,
    lado_esquerdo: null
  });
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({
    frente: '',
    costas: '',
    lado_direito: '',
    lado_esquerdo: ''
  });
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  // Compare angles state
  const [selectedCompareAngle, setSelectedCompareAngle] = useState<'frente' | 'costas' | 'lado_direito' | 'lado_esquerdo'>('frente');

  const anglesConfig = [
    { key: 'frente', label: 'Frente', icon: '👤', silhouette: 'Frente' },
    { key: 'costas', label: 'Costas', icon: '👤', silhouette: 'Costas' },
    { key: 'lado_direito', label: 'Lado Direito', icon: '👥', silhouette: 'Lado Dir.' },
    { key: 'lado_esquerdo', label: 'Lado Esquerdo', icon: '👥', silhouette: 'Lado Esq.' }
  ];

  // Clean up Object URLs to prevent leaks
  useEffect(() => {
    return () => {
      Object.values(previewUrls).forEach(url => {
        if (url) {
          URL.revokeObjectURL(url as string);
        }
      });
    };
  }, [previewUrls]);
  
  // Chart Metric Selection
  const [selectedMetric, setSelectedMetric] = useState<string>('peso');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const isJessica = usuario.nome === 'Jéssica';
  const colorTheme = isJessica ? {
    primary: 'from-rose-500 to-orange-400',
    primarySolid: 'bg-rose-500',
    border: 'border-rose-100',
    accentText: 'text-rose-500',
    accentBg: 'bg-rose-50',
    chartColor: '#f43f5e',
    glow: 'shadow-rose-100'
  } : {
    primary: 'from-emerald-500 to-teal-400',
    primarySolid: 'bg-emerald-500',
    border: 'border-emerald-100',
    accentText: 'text-emerald-600',
    accentBg: 'bg-emerald-50',
    chartColor: '#10b981',
    glow: 'shadow-emerald-100'
  };

  const metricsOptions = [
    { key: 'peso', label: 'Peso (kg)' },
    { key: 'braco_direito', label: 'Braço Direito (cm)' },
    { key: 'braco_esquerdo', label: 'Braço Esquerdo (cm)' },
    { key: 'perna_direita', label: 'Perna Direita (cm)' },
    { key: 'perna_esquerda', label: 'Perna Esquerda (cm)' },
    { key: 'barriga', label: 'Barriga (cm)' },
    { key: 'cintura', label: 'Cintura (cm)' },
    { key: 'quadril', label: 'Quadril (cm)' },
    { key: 'peito', label: 'Peito (cm)' },
  ];

  useEffect(() => {
    api.getDesafioConfig().then(config => {
      if (config && config.data_inicio) {
        setDataInicio(config.data_inicio);
      }
    }).catch(err => {
      console.error('Erro ao buscar config do desafio:', err);
    });
  }, []);

  const handleAngleFileChange = (angle: string, file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Por favor, envie apenas arquivos de imagem.');
      return;
    }
    const isAllowedExt = /\.(jpg|jpeg|png|webp)$/i.test(file.name);
    if (!isAllowedExt && !['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Formato inválido. Envie apenas JPG, JPEG, PNG ou WEBP.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('A imagem é muito grande. Escolha uma foto menor que 5MB.');
      return;
    }

    if (previewUrls[angle]) {
      URL.revokeObjectURL(previewUrls[angle]);
    }

    setSelectedFiles(prev => ({ ...prev, [angle]: file }));
    setPreviewUrls(prev => ({ ...prev, [angle]: URL.createObjectURL(file) }));
    setError('');
  };

  const getSessionCompletionStats = (dateStr: string) => {
    const existing = fotos.filter(f => f.data === dateStr);
    let count = 0;
    ['frente', 'costas', 'lado_direito', 'lado_esquerdo'].forEach(angle => {
      const hasNew = !!selectedFiles[angle];
      const hasExisting = existing.some(f => f.angulo === angle);
      if (hasNew || hasExisting) {
        count++;
      }
    });
    return {
      count,
      total: 4,
      isComplete: count === 4
    };
  };

  // Format YYYY-MM-DD to DD/MM/YYYY
  const formatBrazilianDate = (dateStr: string) => {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  const formatDateLabel = (dateStr: string) => {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}`; // DD/MM
    }
    return dateStr;
  };

  // Handle Photo submit
  const handlePhotoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const hasAnyNew = Object.values(selectedFiles).some(f => f !== null);
    if (!hasAnyNew) {
      setError('Selecione pelo menos uma nova foto para salvar.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const angles = ['frente', 'costas', 'lado_direito', 'lado_esquerdo'];
      for (const angle of angles) {
        const file = selectedFiles[angle];
        if (file) {
          const uploadResult = await api.uploadFoto(file);
          const publicUrl = uploadResult.url;

          await api.addFotoProgresso({
            data: dataFoto,
            foto_url: publicUrl,
            legenda: legenda || undefined,
            angulo: angle
          });
        }
      }

      // Reset
      Object.values(previewUrls).forEach(url => {
        if (url) URL.revokeObjectURL(url as string);
      });
      setSelectedFiles({
        frente: null,
        costas: null,
        lado_direito: null,
        lado_esquerdo: null
      });
      setPreviewUrls({
        frente: '',
        costas: '',
        lado_direito: '',
        lado_esquerdo: ''
      });
      setLegenda('');
      setDataFoto(new Date().toISOString().split('T')[0]);
      setShowFotoForm(false);
      await onRefreshMedidas();
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar fotos de progresso.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Measurement Submit
  const handleMedicaoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!peso) {
      setError('O peso é obrigatório.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api.addMedida({
        data: dataMedicao,
        peso: parseFloat(peso),
        braco_direito: bracoDireito ? parseFloat(bracoDireito) : undefined,
        braco_esquerdo: bracoEsquerdo ? parseFloat(bracoEsquerdo) : undefined,
        perna_direita: pernaDireita ? parseFloat(pernaDireita) : undefined,
        perna_esquerda: pernaEsquerda ? parseFloat(pernaEsquerda) : undefined,
        barriga: barriga ? parseFloat(barriga) : undefined,
        cintura: cintura ? parseFloat(cintura) : undefined,
        quadril: quadril ? parseFloat(quadril) : undefined,
        peito: peito ? parseFloat(peito) : undefined,
        observacao: observacao || undefined
      });

      // Reset
      setPeso('');
      setBracoDireito('');
      setBracoEsquerdo('');
      setPernaDireita('');
      setPernaEsquerda('');
      setBarriga('');
      setCintura('');
      setQuadril('');
      setPeito('');
      setObservacao('');
      setDataMedicao(new Date().toISOString().split('T')[0]);
      setShowMedicaoForm(false);
      await onRefreshMedidas();
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar medidas.');
    } finally {
      setLoading(false);
    }
  };

  // Chart data formatting
  const chartData = medidas
    .filter(m => {
      const val = m[selectedMetric as keyof Medida];
      return val !== undefined && val !== null && val !== '';
    })
    .map(m => ({
      data: formatDateLabel(m.data),
      valor: parseFloat(String(m[selectedMetric as keyof Medida])),
      fullDate: m.data
    }));

  const hasPhotos = fotos.length > 0;

  // Group photos by date
  const getPhotosBySession = () => {
    const sessions: Record<string, Record<string, FotoProgresso>> = {};
    fotos.forEach(f => {
      if (!sessions[f.data]) {
        sessions[f.data] = {};
      }
      const angle = f.angulo || 'frente';
      sessions[f.data][angle] = f;
    });

    return Object.keys(sessions)
      .sort((a, b) => b.localeCompare(a))
      .map(data => ({
        data,
        photos: sessions[data],
        totalCount: Object.keys(sessions[data]).length
      }));
  };

  const getFirstAndLatestSessions = () => {
    const sessionsMap: Record<string, Record<string, FotoProgresso>> = {};
    fotos.forEach(f => {
      if (!sessionsMap[f.data]) {
        sessionsMap[f.data] = {};
      }
      const angle = f.angulo || 'frente';
      sessionsMap[f.data][angle] = f;
    });

    const sortedDates = Object.keys(sessionsMap).sort((a, b) => a.localeCompare(b));
    if (sortedDates.length < 1) return null;
    
    const firstDate = sortedDates[0];
    const latestDate = sortedDates[sortedDates.length - 1];

    if (firstDate === latestDate) return null; // Only one session

    return {
      first: { data: firstDate, photos: sessionsMap[firstDate] },
      latest: { data: latestDate, photos: sessionsMap[latestDate] }
    };
  };

  // Weight Loss
  const getWeightLoss = () => {
    if (medidas.length < 1) return { actual: '-', loss: '-' };
    const latest = medidas[medidas.length - 1].peso;
    if (medidas.length === 1) return { actual: `${latest} kg`, loss: '0.0 kg' };
    const initial = medidas[0].peso;
    const diff = initial - latest;
    return {
      actual: `${latest} kg`,
      loss: `${diff > 0 ? '-' : '+'}${Math.abs(diff).toFixed(1)} kg`
    };
  };

  const stats = getWeightLoss();

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 pb-28">
      
      {/* Header */}
      <div className="w-full bg-white border-b border-slate-100 px-6 py-4 sticky top-0 z-40 shadow-sm flex justify-between items-center">
        <div>
          <h1 className="text-xl font-display font-extrabold text-slate-950">Medidas e Fotos</h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Desempenho &amp; Evolução</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setShowFotoForm(prev => !prev);
              setShowMedicaoForm(false);
              setError('');
            }}
            className={`flex items-center space-x-1 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
              showFotoForm 
                ? 'bg-slate-700 text-white' 
                : 'bg-white border border-slate-100 text-slate-600 hover:bg-slate-50 shadow-sm'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Foto</span>
          </button>
          
          <button
            onClick={() => {
              setShowMedicaoForm(prev => !prev);
              setShowFotoForm(false);
              setError('');
            }}
            className={`flex items-center space-x-1 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
              showMedicaoForm 
                ? 'bg-slate-700 text-white' 
                : `bg-gradient-to-tr ${colorTheme.primary} text-white shadow-sm hover:opacity-90`
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Medição</span>
          </button>
        </div>
      </div>

      <div className="px-5 py-6 space-y-6 w-full max-w-md mx-auto">
        
        {/* Error message */}
        {error && (
          <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl flex items-center gap-2 text-rose-600 text-xs font-semibold">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Milestone Warning Banners */}
        {pendingMilestones.length > 0 && (
          <div className="space-y-3">
            {pendingMilestones.map(m => (
              <div key={m.day} className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex flex-col gap-3 shadow-sm">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-black text-slate-800 leading-snug">{m.text}</h4>
                    <p className="text-[10px] text-slate-500 font-bold leading-normal mt-0.5">
                      Atualize seu peso, medidas e foto de progresso para registrar este marco oficial do desafio.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setDataMedicao(todayStr);
                    setDataFoto(todayStr);
                    setShowMedicaoForm(true);
                    setShowFotoForm(true);
                    setError('');
                  }}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-black py-2 rounded-xl transition-all shadow-sm active:scale-95"
                >
                  Registrar agora
                </button>
              </div>
            ))}
          </div>
        )}

        {/* 1. Add Photo Form */}
        <AnimatePresence>
          {showFotoForm && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <form onSubmit={handlePhotoSubmit} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-center space-x-2 text-sm font-display font-bold text-slate-800 border-b border-slate-50 pb-2">
                  <Camera className={`w-5 h-5 ${colorTheme.accentText}`} />
                  <span>Adicionar Fotos de Progresso</span>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Data da Foto</label>
                      <input
                        type="date"
                        required
                        value={dataFoto}
                        onChange={e => setDataFoto(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-base focus:outline-none focus:border-slate-400 font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Legenda (Opcional)</label>
                      <input
                        type="text"
                        placeholder="Ex: 30 dias..."
                        value={legenda}
                        onChange={e => setLegenda(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-base focus:outline-none focus:border-slate-400 font-semibold"
                      />
                    </div>
                  </div>

                  {/* Completeness indicator */}
                  {(() => {
                    const stats = getSessionCompletionStats(dataFoto);
                    return (
                      <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
                        <span>Progresso da sessão:</span>
                        <span className={stats.isComplete ? 'text-emerald-600 font-extrabold' : 'text-slate-600 font-extrabold'}>
                          {stats.count}/4 fotos {stats.isComplete ? '✨ Completo!' : ''}
                        </span>
                      </div>
                    );
                  })()}

                  {/* 4 slots grid */}
                  <div className="grid grid-cols-2 gap-3">
                    {anglesConfig.map(angle => {
                      const key = angle.key;
                      const localPreview = previewUrls[key];
                      const existing = fotos.filter(f => f.data === dataFoto).find(f => f.angulo === key);

                      return (
                        <div key={key} className="flex flex-col space-y-1">
                          <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                            <span>{angle.icon}</span>
                            <span>{angle.label}</span>
                          </span>

                          <div
                            onClick={() => document.getElementById(`file-input-${key}`)?.click()}
                            className={`aspect-[3/4] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center p-3 text-center cursor-pointer transition-all relative overflow-hidden ${
                              localPreview
                                ? 'border-emerald-300 bg-emerald-50/20'
                                : existing
                                ? 'border-blue-300 bg-blue-50/20'
                                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                            }`}
                          >
                            <input
                              type="file"
                              id={`file-input-${key}`}
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  handleAngleFileChange(key, e.target.files[0]);
                                }
                              }}
                              accept="image/png, image/jpeg, image/jpg, image/webp"
                              className="hidden"
                            />

                            {localPreview ? (
                              <div className="absolute inset-0 w-full h-full">
                                <img src={localPreview} alt={angle.label} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                  <span className="text-[8px] font-black text-white bg-slate-900/80 px-2 py-1 rounded-lg">Alterar</span>
                                </div>
                                <div className="absolute bottom-1 right-1 bg-emerald-500 text-white text-[8px] px-1.5 py-0.5 rounded font-black shadow-sm">
                                  Pronta
                                </div>
                              </div>
                            ) : existing ? (
                              <div className="absolute inset-0 w-full h-full">
                                <img src={existing.foto_url} alt={angle.label} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                  <span className="text-[8px] font-black text-white bg-slate-900/80 px-2 py-1 rounded-lg">Substituir</span>
                                </div>
                                <div className="absolute bottom-1 right-1 bg-blue-500 text-white text-[8px] px-1.5 py-0.5 rounded font-black shadow-sm">
                                  Já salvo
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center p-1">
                                <span className="text-xl filter grayscale opacity-45 mb-1">{angle.icon}</span>
                                <span className="text-[9px] font-bold text-slate-400">Silhueta {angle.silhouette}</span>
                                <span className="text-[7px] text-slate-300 mt-0.5 font-bold">Toque para enviar</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-3 rounded-xl font-display font-bold text-sm text-white bg-gradient-to-tr ${colorTheme.primary} shadow-md flex items-center justify-center gap-1.5`}
                >
                  <Check className="w-4 h-4" />
                  <span>{loading ? 'Salvando...' : 'Salvar Fotos da Sessão'}</span>
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 2. Add Measurement Form */}
        <AnimatePresence>
          {showMedicaoForm && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <form onSubmit={handleMedicaoSubmit} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-center space-x-2 text-sm font-display font-bold text-slate-800 border-b border-slate-50 pb-2">
                  <Ruler className={`w-5 h-5 ${colorTheme.accentText}`} />
                  <span>Registrar Nova Medição Corporal</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Data da Medição</label>
                    <input
                      type="date"
                      required
                      value={dataMedicao}
                      onChange={e => setDataMedicao(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-base focus:outline-none focus:border-slate-400 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Peso (kg) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="Ex: 72.50"
                      value={peso}
                      onChange={e => setPeso(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-base focus:outline-none focus:border-slate-400 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Peito (cm)</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="Opcional"
                      value={peito}
                      onChange={e => setPeito(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-base focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Braço Dir. (cm)</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="Opcional"
                      value={bracoDireito}
                      onChange={e => setBracoDireito(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-base focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Braço Esq. (cm)</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="Opcional"
                      value={bracoEsquerdo}
                      onChange={e => setBracoEsquerdo(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-base focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Cintura (cm)</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="Opcional"
                      value={cintura}
                      onChange={e => setCintura(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-base focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Barriga (cm)</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="Opcional"
                      value={barriga}
                      onChange={e => setBarriga(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-base focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Quadril (cm)</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="Opcional"
                      value={quadril}
                      onChange={e => setQuadril(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-base focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Perna Dir. (cm)</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="Opcional"
                      value={pernaDireita}
                      onChange={e => setPernaDireita(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-base focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Perna Esq. (cm)</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="Opcional"
                      value={pernaEsquerda}
                      onChange={e => setPernaEsquerda(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-base focus:outline-none"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Observações / Sentimento</label>
                    <input
                      type="text"
                      placeholder="Ex: Sentindo menos inchado(a)..."
                      value={observacao}
                      onChange={e => setObservacao(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-base focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-3 rounded-xl font-display font-bold text-sm text-white bg-gradient-to-tr ${colorTheme.primary} shadow-md flex items-center justify-center gap-1.5`}
                >
                  <Check className="w-4 h-4" />
                  <span>{loading ? 'Salvando...' : 'Salvar Medição'}</span>
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 3. Progress Photo Gallery & Carousel */}
        <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Camera className="w-4 h-4 text-slate-400" />
              Galeria de Progresso
            </span>
            <span className="text-[10px] font-bold text-slate-400">({fotos.length} fotos)</span>
          </div>

          {loadingFotos ? (
            <div className="py-12 flex justify-center">
              <div className={`w-6 h-6 border-2 border-t-transparent rounded-full animate-spin ${colorTheme.accentText}`} />
            </div>
          ) : hasPhotos ? (
            <div className="space-y-5">
              {/* First vs Latest side-by-side comparative */}
              {(() => {
                const comp = getFirstAndLatestSessions();
                if (!comp) return null;
                return (
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-3">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      <span>Antes &amp; Depois Oficial (Por Ângulo)</span>
                    </div>

                    {/* Angle selector tabs */}
                    <div className="grid grid-cols-4 gap-1 p-0.5 bg-slate-200/60 rounded-xl">
                      {anglesConfig.map(angle => (
                        <button
                          key={angle.key}
                          type="button"
                          onClick={() => setSelectedCompareAngle(angle.key as any)}
                          className={`py-1 text-[9px] font-black rounded-lg transition-all ${
                            selectedCompareAngle === angle.key
                              ? 'bg-white text-slate-800 shadow-xs'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          {angle.silhouette}
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      {/* Before */}
                      <div className="rounded-xl overflow-hidden relative aspect-[3/4] border border-slate-200 shadow-sm bg-white flex items-center justify-center">
                        {comp.first.photos[selectedCompareAngle] ? (
                          <>
                            <img
                              src={comp.first.photos[selectedCompareAngle].foto_url}
                              alt={`Inicial ${selectedCompareAngle}`}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute bottom-2 left-2 right-2 bg-slate-950/70 backdrop-blur-sm p-1 rounded-lg text-white text-[9px] font-bold text-center">
                              Antes: {formatBrazilianDate(comp.first.data)}
                            </div>
                          </>
                        ) : (
                          <div className="p-3 text-center flex flex-col items-center">
                            <span className="text-2xl mb-1 filter grayscale opacity-45">👤</span>
                            <span className="text-[8px] font-bold text-slate-400 leading-tight">Sem foto de partida</span>
                          </div>
                        )}
                      </div>

                      {/* After */}
                      <div className="rounded-xl overflow-hidden relative aspect-[3/4] border border-slate-200 shadow-sm bg-white flex items-center justify-center">
                        {comp.latest.photos[selectedCompareAngle] ? (
                          <>
                            <img
                              src={comp.latest.photos[selectedCompareAngle].foto_url}
                              alt={`Atual ${selectedCompareAngle}`}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute bottom-2 left-2 right-2 bg-slate-950/70 backdrop-blur-sm p-1 rounded-lg text-white text-[9px] font-bold text-center">
                              Hoje: {formatBrazilianDate(comp.latest.data)}
                            </div>
                          </>
                        ) : (
                          <div className="p-3 text-center flex flex-col items-center">
                            <span className="text-2xl mb-1 filter grayscale opacity-45">👤</span>
                            <span className="text-[8px] font-bold text-slate-400 leading-tight">Sem foto atual</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Session-by-session Timeline list */}
              <div className="space-y-3.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Timeline de Sessões</span>
                <div className="space-y-3">
                  {getPhotosBySession().map(session => (
                    <div key={session.data} className="bg-slate-50 border border-slate-100 p-3 rounded-2xl space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-xs font-black text-slate-700">
                            Sessão {formatBrazilianDate(session.data)}
                          </span>
                          {getMilestoneTag(session.data) && renderMilestoneTag(getMilestoneTag(session.data)!)}
                        </div>
                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${
                          session.totalCount === 4 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          {session.totalCount}/4 fotos
                        </span>
                      </div>

                      <div className="grid grid-cols-4 gap-1.5">
                        {anglesConfig.map(angle => {
                          const f = session.photos[angle.key];
                          return (
                            <div key={angle.key} className="flex flex-col space-y-1">
                              <div className="aspect-[3/4] rounded-xl overflow-hidden border border-slate-200 bg-white relative shadow-xs flex items-center justify-center">
                                {f ? (
                                  <img
                                    src={f.foto_url}
                                    alt={angle.label}
                                    className="w-full h-full object-cover"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <div className="text-center p-1">
                                    <span className="text-lg opacity-35 filter grayscale block mb-0.5">{angle.icon}</span>
                                    <span className="text-[7px] font-semibold text-slate-400 leading-tight block">Pendente</span>
                                  </div>
                                )}
                                <div className="absolute bottom-1 left-1 bg-black/60 text-white text-[7px] px-1 rounded font-black font-sans uppercase">
                                  {angle.silhouette}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {Object.values(session.photos).find(p => p.legenda)?.legenda && (
                        <p className="text-[10px] text-slate-400 italic font-semibold px-0.5 border-t border-slate-100/55 pt-1.5">
                          &ldquo;{Object.values(session.photos).find(p => p.legenda)?.legenda}&rdquo;
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-8 flex flex-col items-center justify-center text-center text-slate-400 space-y-2 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
              <Camera className="w-8 h-8 text-slate-300 stroke-[1.5]" />
              <p className="font-bold text-xs">Nenhuma foto de progresso ainda</p>
              <p className="text-[10px] text-slate-400 px-6 leading-relaxed">Envie fotos regulares usando o botão "+ Foto" acima para acompanhar sua mudança corporal visualmente!</p>
            </div>
          )}
        </div>

        {/* 4. Evolution Weight and metrics chart */}
        <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Scale className="w-4 h-4 text-slate-400" />
              Evolução Gráfica
            </span>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Peso Atual</span>
                <div className="flex items-baseline space-x-1.5 mt-0.5">
                  <span className="text-xl font-display font-black text-slate-900">{stats.actual.split(' ')[0]}</span>
                  <span className="text-[10px] font-bold text-slate-400">kg</span>
                </div>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Redução de Peso</span>
                <div className="flex items-baseline space-x-1.5 mt-0.5">
                  <span className={`text-xl font-display font-black ${stats.loss.startsWith('-') ? 'text-emerald-500' : 'text-slate-900'}`}>
                    {stats.loss.split(' ')[0]}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">kg</span>
                </div>
              </div>
            </div>
          </div>

          {/* Metric Selector dropdown */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Métrica de Gráfico</label>
            <select
              value={selectedMetric}
              onChange={e => setSelectedMetric(e.target.value)}
              className="w-full bg-slate-50 border border-slate-150 p-3 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-slate-300"
            >
              {metricsOptions.map(opt => (
                <option key={opt.key} value={opt.key}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="w-full h-44 text-[10px] font-bold">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="data" stroke="#94a3b8" />
                  <YAxis type="number" domain={['dataMin - 1', 'dataMax + 1']} stroke="#94a3b8" />
                  <Tooltip 
                    contentStyle={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #f1f5f9', fontFamily: 'Inter' }}
                    labelStyle={{ fontWeight: 'bold' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="valor"
                    name={metricsOptions.find(o => o.key === selectedMetric)?.label || 'Valor'}
                    stroke={colorTheme.chartColor}
                    strokeWidth={3}
                    dot={{ r: 4, strokeWidth: 2, stroke: '#ffffff' }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 space-y-1">
                <Scale className="w-7 h-7 text-slate-300 stroke-[1.5]" />
                <p className="font-bold text-xs">Sem dados suficientes</p>
                <p className="text-[9px] max-w-[200px]">Adicione medições corporais para visualizar o gráfico de progresso desta métrica!</p>
              </div>
            )}
          </div>
        </div>

        {/* 5. Chronological detailed measurements cards */}
        <div className="space-y-3">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Ruler className="w-4 h-4 text-slate-400" />
            Histórico de Medições ({medidas.length})
          </span>

          {medidas.length === 0 ? (
            <div className="bg-white p-8 rounded-3xl border border-slate-100 text-center space-y-2">
              <Ruler className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs font-semibold text-slate-400">Nenhuma medição cadastrada.</p>
              <p className="text-[10px] text-slate-400">Cadastre a sua primeira medição corporal para servir como ponto de partida!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {[...medidas].reverse().map((medida, idx) => {
                const isPontoPartida = idx === medidas.length - 1; // Chronological first item is last in reversed array
                return (
                  <div
                    key={medida.id}
                    className={`bg-white p-5 rounded-3xl border shadow-sm relative overflow-hidden transition-all hover:border-slate-200 ${
                      isPontoPartida ? 'ring-2 ring-amber-400/30 border-amber-300/60' : 'border-slate-100'
                    }`}
                  >
                    {/* Corner badge for point of departure */}
                    {isPontoPartida && (
                      <div className="absolute top-0 right-0 bg-amber-400 text-slate-900 text-[8px] font-black px-3 py-1 rounded-bl-xl uppercase tracking-wider">
                        Ponto de partida 🌟
                      </div>
                    )}

                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <span className="text-xs font-extrabold text-slate-800">
                          {formatBrazilianDate(medida.data)}
                        </span>
                      </div>
                      {getMilestoneTag(medida.data) && renderMilestoneTag(getMilestoneTag(medida.data)!)}
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-center border-t border-slate-50 pt-3">
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase">Peso</span>
                        <p className="text-xs font-extrabold text-slate-800">{medida.peso} kg</p>
                      </div>

                      {medida.peito !== null && medida.peito !== undefined && (
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 uppercase">Peito</span>
                          <p className="text-xs font-extrabold text-slate-800">{medida.peito} cm</p>
                        </div>
                      )}

                      {medida.cintura !== null && medida.cintura !== undefined && (
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 uppercase">Cintura</span>
                          <p className="text-xs font-extrabold text-slate-800">{medida.cintura} cm</p>
                        </div>
                      )}

                      {medida.barriga !== null && medida.barriga !== undefined && (
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 uppercase">Barriga</span>
                          <p className="text-xs font-extrabold text-slate-800">{medida.barriga} cm</p>
                        </div>
                      )}

                      {medida.quadril !== null && medida.quadril !== undefined && (
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 uppercase">Quadril</span>
                          <p className="text-xs font-extrabold text-slate-800">{medida.quadril} cm</p>
                        </div>
                      )}

                      {medida.braco_direito !== null && medida.braco_direito !== undefined && (
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 uppercase">Br. Direito</span>
                          <p className="text-xs font-extrabold text-slate-800">{medida.braco_direito} cm</p>
                        </div>
                      )}

                      {medida.braco_esquerdo !== null && medida.braco_esquerdo !== undefined && (
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 uppercase">Br. Esquerdo</span>
                          <p className="text-xs font-extrabold text-slate-800">{medida.braco_esquerdo} cm</p>
                        </div>
                      )}

                      {medida.perna_direita !== null && medida.perna_direita !== undefined && (
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 uppercase">Pn. Direita</span>
                          <p className="text-xs font-extrabold text-slate-800">{medida.perna_direita} cm</p>
                        </div>
                      )}

                      {medida.perna_esquerda !== null && medida.perna_esquerda !== undefined && (
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 uppercase">Pn. Esquerda</span>
                          <p className="text-xs font-extrabold text-slate-800">{medida.perna_esquerda} cm</p>
                        </div>
                      )}
                    </div>

                    {medida.observacao && (
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100/50 text-[10px] text-slate-500 font-medium mt-3 whitespace-pre-line leading-relaxed">
                        <strong>Obs:</strong> {medida.observacao}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
