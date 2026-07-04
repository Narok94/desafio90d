import { useState, useEffect } from 'react';
import { api } from '../api';
import { ComparativoData, Usuario, Medida, FotoProgresso } from '../types';
import { getBadges } from '../utils/achievements';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Trophy, Flame, TrendingUp, Users, Award, Target, Activity, LogOut, ArrowDown, Crown, Calendar, ImageIcon, Ruler, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

interface AdminViewProps {
  usuario: Usuario;
  onLogout: () => void;
}

export default function AdminView({ usuario, onLogout }: AdminViewProps) {
  const [comparativo, setComparativo] = useState<ComparativoData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [daysRemaining, setDaysRemaining] = useState<number>(90);
  const [dataInicio, setDataInicio] = useState<string>('2026-07-06');
  const [selectedAdminAngle, setSelectedAdminAngle] = useState<'frente' | 'costas' | 'lado_direito' | 'lado_esquerdo'>('frente');

  const fetchComparativo = async () => {
    try {
      const data = await api.getComparativo();
      setComparativo(data);
      
      // Calculate remaining days based on earliest check in whole challenge
      let earliestDateStr = '';
      data.forEach(item => {
        item.historicoCompleto.forEach(c => {
          if (!earliestDateStr || c.data < earliestDateStr) {
            earliestDateStr = c.data;
          }
        });
      });

      if (earliestDateStr) {
        const start = new Date(earliestDateStr);
        const today = new Date();
        const diffTime = Math.abs(today.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const elapsed = Math.min(diffDays, 90);
        setDaysRemaining(90 - elapsed);
      } else {
        setDaysRemaining(90);
      }

    } catch (err: any) {
      setError(err.message || 'Erro ao carregar dados comparativos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComparativo();
    api.getDesafioConfig().then(config => {
      if (config && config.data_inicio) {
        setDataInicio(config.data_inicio);
      }
    }).catch(err => {
      console.error('Erro ao buscar config do desafio:', err);
    });
  }, []);

  const getMilestoneData = (medidas: Medida[], fotos: FotoProgresso[], startChallengeDate: string) => {
    const milestones = [
      { day: 0, label: 'Dia 0' },
      { day: 30, label: 'Dia 30' },
      { day: 60, label: 'Dia 60' },
      { day: 90, label: 'Dia 90' }
    ];

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

    return milestones.map(m => {
      // Find photo in range [m.day, m.day + 3] matching the selected admin angle
      const foto = fotos.find(f => {
        const diff = getDaysDifference(f.data, startChallengeDate);
        const matchAngle = (f.angulo || 'frente') === selectedAdminAngle;
        return diff >= m.day && diff <= m.day + 3 && matchAngle;
      });

      // Find medida in range [m.day, m.day + 3]
      const medida = medidas.find(med => {
        const diff = getDaysDifference(med.data, startChallengeDate);
        return diff >= m.day && diff <= m.day + 3;
      });

      return {
        ...m,
        foto,
        medida
      };
    });
  };

  const renderMilestoneComparison = (medidas: Medida[], fotos: FotoProgresso[], startChallengeDate: string) => {
    const milestoneData = getMilestoneData(medidas, fotos, startChallengeDate);

    return (
      <div className="space-y-3 pt-3 border-t border-slate-50">
        <div className="flex justify-between items-center">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="w-4 h-4 text-amber-500 fill-amber-100 animate-pulse" />
            Evolução nos Marcos Oficiais
          </span>
          <span className="text-[9px] text-slate-400 font-bold uppercase">Janela de +3 dias do marco</span>
        </div>

        <div className="grid grid-cols-4 gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {milestoneData.map(m => {
            const hasFoto = !!m.foto;
            const hasMedida = !!m.medida;

            let tagColor = 'bg-slate-100 text-slate-700 border-slate-200';
            if (m.label === 'Dia 0') tagColor = 'bg-amber-50 text-amber-700 border-amber-200';
            if (m.label === 'Dia 30') tagColor = 'bg-blue-50 text-blue-700 border-blue-150';
            if (m.label === 'Dia 60') tagColor = 'bg-purple-50 text-purple-700 border-purple-150';
            if (m.label === 'Dia 90') tagColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';

            return (
              <div key={m.day} className="flex flex-col space-y-2 text-center bg-slate-50/50 p-1.5 rounded-2xl border border-slate-100 min-w-[85px]">
                {/* Header tag */}
                <div className={`px-1 py-0.5 rounded-lg text-[9px] font-black border text-center ${tagColor}`}>
                  {m.label}
                </div>

                {/* Photo */}
                <div className="aspect-[3/4] rounded-xl overflow-hidden bg-slate-100 relative border border-slate-200 shadow-sm flex items-center justify-center">
                  {hasFoto ? (
                    <img
                      src={m.foto?.foto_url}
                      alt={m.label}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="p-2 text-center flex flex-col items-center justify-center">
                      <ImageIcon className="w-4 h-4 text-slate-300 mb-1" />
                      <span className="text-[7px] font-bold text-slate-400 leading-tight">Sem foto</span>
                    </div>
                  )}
                </div>

                {/* Measurements */}
                <div className="space-y-1 text-[8px] leading-tight font-medium bg-white p-1.5 rounded-xl border border-slate-100 shadow-xs min-h-[70px] flex flex-col justify-center">
                  {hasMedida ? (
                    <>
                      <div className="font-extrabold text-slate-800 text-[10px] mb-0.5">{m.medida?.peso} kg</div>
                      {m.medida?.cintura !== null && m.medida?.cintura !== undefined && (
                        <div className="text-slate-500">Cint: <span className="font-bold text-slate-700">{m.medida?.cintura}cm</span></div>
                      )}
                      {m.medida?.barriga !== null && m.medida?.barriga !== undefined && (
                        <div className="text-slate-500">Barr: <span className="font-bold text-slate-700">{m.medida?.barriga}cm</span></div>
                      )}
                      {m.medida?.quadril !== null && m.medida?.quadril !== undefined && (
                        <div className="text-slate-500">Quad: <span className="font-bold text-slate-700">{m.medida?.quadril}cm</span></div>
                      )}
                      {m.medida?.braco_direito !== null && m.medida?.braco_direito !== undefined && (
                        <div className="text-slate-500">Braç: <span className="font-bold text-slate-700">{m.medida?.braco_direito}cm</span></div>
                      )}
                    </>
                  ) : (
                    <span className="text-slate-400 font-semibold block text-[7px] py-1">Sem medidas</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Format date for chart (DD/MM)
  const formatDateLabel = (dateStr: string) => {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}`;
    }
    return dateStr;
  };

  // Compile superimposed weight data
  const getSuperimposedWeightData = () => {
    interface WeightEntry {
      date: string;
      label: string;
      Jéssica?: number;
      Henrique?: number;
    }

    const dateMap = new Map<string, WeightEntry>();

    comparativo.forEach(item => {
      const nome = item.usuario.nome;
      item.pesosEvolucao.forEach(p => {
        const fallback: WeightEntry = { date: p.data, label: formatDateLabel(p.data) };
        const entry = dateMap.get(p.data) || fallback;
        if (nome === 'Jéssica') entry.Jéssica = p.peso;
        if (nome === 'Henrique') entry.Henrique = p.peso;
        dateMap.set(p.data, entry);
      });
    });

    return Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  };

  const chartData = getSuperimposedWeightData();

  // Find individual participants
  const jessicaData = comparativo.find(c => c.usuario.nome === 'Jéssica');
  const henriqueData = comparativo.find(c => c.usuario.nome === 'Henrique');

  // Determine Leader & Winner Projection
  const getWinnerInfo = () => {
    if (!jessicaData || !henriqueData) return null;

    // Weighting: Consistency (Points) counts as 60%, weight loss counts as 40%
    const jPoints = jessicaData.totalPontos;
    const hPoints = henriqueData.totalPontos;

    const jLoss = jessicaData.perdaPesoTotal;
    const hLoss = henriqueData.perdaPesoTotal;

    // Normalize comparison. Score: 1 pt per completed habit/meal + 5 pts per kg lost
    const jScore = jPoints + (jLoss > 0 ? jLoss * 5 : 0);
    const hScore = hPoints + (hLoss > 0 ? hLoss * 5 : 0);

    const isFinished = daysRemaining === 0;

    if (jScore > hScore) {
      return {
        vencedor: 'Jéssica 🌸',
        cor: 'text-rose-500 bg-rose-50 border-rose-100',
        scoreVencedor: jScore.toFixed(1),
        scorePerdedor: hScore.toFixed(1),
        perdedor: 'Henrique',
        margem: (jScore - hScore).toFixed(1),
        isFinished,
        lossVencedor: jLoss,
        lossPerdedor: hLoss,
        pointsVencedor: jPoints,
        pointsPerdedor: hPoints
      };
    } else if (hScore > jScore) {
      return {
        vencedor: 'Henrique ⚡',
        cor: 'text-emerald-600 bg-emerald-50 border-emerald-100',
        scoreVencedor: hScore.toFixed(1),
        scorePerdedor: jScore.toFixed(1),
        perdedor: 'Jéssica',
        margem: (hScore - jScore).toFixed(1),
        isFinished,
        lossVencedor: hLoss,
        lossPerdedor: jLoss,
        pointsVencedor: hPoints,
        pointsPerdedor: jPoints
      };
    } else {
      return {
        vencedor: 'Empate Técnico! 🤝',
        cor: 'text-slate-700 bg-slate-50 border-slate-100',
        scoreVencedor: jScore.toFixed(1),
        scorePerdedor: hScore.toFixed(1),
        perdedor: 'Ninguém',
        margem: '0.0',
        isFinished,
        lossVencedor: jLoss,
        lossPerdedor: hLoss,
        pointsVencedor: jPoints,
        pointsPerdedor: hPoints
      };
    }
  };

  const winnerInfo = getWinnerInfo();

  // Helper to render detailed body parts comparison (baseline vs latest)
  const renderBodyPartComparison = (medidas: Medida[] | undefined, perda: any) => {
    if (!medidas || medidas.length === 0) {
      return (
        <div className="py-4 text-center text-slate-400 text-xs">
          Nenhuma medição registrada ainda.
        </div>
      );
    }

    const primeira = medidas[0];
    const ultima = medidas[medidas.length - 1];

    const parts = [
      { label: 'Peso', key: 'peso', unit: 'kg', perdaVal: perda.pesoPerda || (primeira.peso - ultima.peso) },
      { label: 'Peito', key: 'peito', unit: 'cm', perdaVal: perda.peitoPerda },
      { label: 'Braço Dir.', key: 'braco_direito', unit: 'cm', perdaVal: perda.bracoDireitoPerda },
      { label: 'Braço Esq.', key: 'braco_esquerdo', unit: 'cm', perdaVal: perda.bracoEsquerdoPerda },
      { label: 'Cintura', key: 'cintura', unit: 'cm', perdaVal: perda.cinturaPerda },
      { label: 'Barriga', key: 'barriga', unit: 'cm', perdaVal: perda.barrigaPerda },
      { label: 'Quadril', key: 'quadril', unit: 'cm', perdaVal: perda.quadrilPerda },
      { label: 'Perna Dir.', key: 'perna_direita', unit: 'cm', perdaVal: perda.pernaDireitaPerda },
      { label: 'Perna Esq.', key: 'perna_esquerda', unit: 'cm', perdaVal: perda.pernaEsquerdaPerda },
    ];

    return (
      <div className="space-y-2">
        <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
          <span>Parte do Corpo</span>
          <span>Início → Atual (Redução)</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {parts.map(part => {
            const val1 = primeira[part.key as keyof Medida];
            const val2 = ultima[part.key as keyof Medida];
            if (val1 === undefined || val1 === null || val2 === undefined || val2 === null) return null;

            const diff = part.perdaVal !== undefined ? part.perdaVal : (parseFloat(String(val1)) - parseFloat(String(val2)));
            const formattedDiff = diff > 0 ? `-${diff.toFixed(1)}` : diff < 0 ? `+${Math.abs(diff).toFixed(1)}` : '0.0';
            const diffColor = diff > 0 ? 'text-emerald-500 font-extrabold' : diff < 0 ? 'text-rose-500' : 'text-slate-400';

            return (
              <div key={part.key} className="bg-slate-50 p-2 rounded-2xl border border-slate-100 flex flex-col justify-between text-center min-h-[62px]">
                <span className="text-[9px] font-bold text-slate-400 uppercase truncate">{part.label}</span>
                <p className="text-[11px] font-extrabold text-slate-700 mt-0.5">
                  {val1}{part.unit} → {val2}{part.unit}
                </p>
                <span className={`text-[10px] font-bold ${diffColor}`}>
                  ({formattedDiff})
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Helper to render initial vs latest photos
  const renderSideBySidePhotos = (fotos: FotoProgresso[] | undefined) => {
    if (!fotos || fotos.length === 0) {
      return (
        <div className="py-8 bg-slate-50 border border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center text-center">
          <ImageIcon className="w-8 h-8 text-slate-300 stroke-[1.5]" />
          <span className="text-xs text-slate-400 font-semibold mt-1">Nenhuma foto enviada ainda</span>
        </div>
      );
    }

    // Filter photos matching the selected angle
    const anglePhotos = fotos.filter(f => (f.angulo || 'frente') === selectedAdminAngle);
    
    // Sort chronologically by date
    const sorted = [...anglePhotos].sort((a, b) => a.data.localeCompare(b.data));

    const angleLabel = selectedAdminAngle === 'frente' ? 'Frente' : selectedAdminAngle === 'costas' ? 'Costas' : selectedAdminAngle === 'lado_direito' ? 'Lado Direito' : 'Lado Esquerdo';

    if (sorted.length === 0) {
      return (
        <div className="py-8 bg-slate-50 border border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center text-center">
          <ImageIcon className="w-8 h-8 text-slate-300 stroke-[1.5]" />
          <span className="text-xs text-slate-400 font-semibold mt-1">
            Nenhuma foto para o ângulo {angleLabel}
          </span>
        </div>
      );
    }

    const first = sorted[0];
    const latest = sorted[sorted.length - 1];

    return (
      <div className="space-y-2">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex justify-between">
          <span>Evolução Visual ({angleLabel})</span>
          <span className="text-amber-500 font-black uppercase">Primeira x Mais Recente</span>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-2xl overflow-hidden border border-slate-200 relative aspect-[3/4] bg-slate-100 shadow-sm flex items-center justify-center">
            <img src={first.foto_url} alt="Antes" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            <div className="absolute bottom-1.5 left-1.5 right-1.5 bg-black/60 px-1.5 py-0.5 rounded text-white text-[9px] font-bold text-center">
              Início: {formatDateLabel(first.data)}
            </div>
          </div>
          {sorted.length >= 2 ? (
            <div className="rounded-2xl overflow-hidden border border-slate-200 relative aspect-[3/4] bg-slate-100 shadow-sm flex items-center justify-center">
              <img src={latest.foto_url} alt="Depois" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              <div className="absolute bottom-1.5 left-1.5 right-1.5 bg-black/60 px-1.5 py-0.5 rounded text-white text-[9px] font-bold text-center">
                Atual: {formatDateLabel(latest.data)}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-center p-4 bg-slate-50/50 aspect-[3/4]">
              <ImageIcon className="w-5 h-5 text-slate-300 stroke-[1.5]" />
              <span className="text-[10px] text-slate-400 font-semibold mt-1">Aguardando mais fotos</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center space-y-2">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-500">Compilando comparativo dos atletas... 📊</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 pb-20">
      
      {/* Header */}
      <div className="w-full bg-white border-b border-slate-100 px-6 py-4 sticky top-0 z-40 shadow-sm flex justify-between items-center">
        <div>
          <h1 className="text-xl font-display font-extrabold text-slate-950 flex items-center space-x-1.5">
            <Crown className="w-5 h-5 text-indigo-500 fill-indigo-100" />
            <span>Painel Comparativo</span>
          </h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Acompanhamento Admin: Tatu 👑</p>
        </div>

        <button
          id="btn-admin-logout"
          onClick={onLogout}
          className="p-2 text-slate-400 hover:text-slate-600 active:scale-95 transition-all rounded-lg hover:bg-slate-50 cursor-pointer"
          title="Sair"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>

      <div className="px-5 py-6 space-y-6 w-full max-w-lg mx-auto">
        
        {/* Countdown Info Card */}
        <div className="bg-gradient-to-tr from-indigo-600 to-purple-600 text-white rounded-3xl p-5 shadow-lg shadow-indigo-100 relative overflow-hidden">
          <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-4 translate-y-4">
            <Trophy className="w-40 h-40" />
          </div>
          <span className="text-[10px] font-black uppercase opacity-75 tracking-wider">Status Geral do Desafio</span>
          <h2 className="text-2xl font-display font-black mt-1">Faltam {daysRemaining} dias! 🏁</h2>
          <p className="text-xs opacity-90 mt-1 font-medium">Os competidores estão focados na dieta e treinos diários. Quem vencerá?</p>
        </div>

        {/* Real-time Winner / Leadership Projection Card */}
        {winnerInfo && (
          <div className={`p-5 rounded-3xl border-2 ${winnerInfo.cor} shadow-sm space-y-3 relative overflow-hidden`}>
            <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider">
              <Award className="w-5 h-5 text-amber-500 fill-amber-100 animate-pulse" />
              <span>{winnerInfo.isFinished ? '🏆 Resultado Final do Desafio' : '📈 Projeção do Líder Atual'}</span>
            </div>
            
            <div className="space-y-1">
              <h3 className="text-xl font-display font-black text-slate-900">
                {winnerInfo.vencedor === 'Empate Técnico! 🤝' ? 'Temos um Empate!' : `${winnerInfo.vencedor} na Liderança! 👑`}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Cálculo baseado na consistência acumulada de hábitos/refeições (60%) e na perda de peso total (40%).
              </p>
            </div>

            {/* Micro stats comparison block */}
            <div className="grid grid-cols-2 gap-3 pt-2 text-xs border-t border-slate-100">
              <div className="space-y-1">
                <span className="font-bold text-slate-400 block uppercase text-[9px]">Jéssica</span>
                <span className="font-semibold text-rose-500 block">✨ {jessicaData?.totalPontos} pts marcados</span>
                <span className="font-semibold text-slate-700 block flex items-center space-x-0.5">
                  <ArrowDown className="w-3.5 h-3.5" />
                  <span>-{jessicaData?.perdaPesoTotal} kg eliminados</span>
                </span>
              </div>
              <div className="space-y-1">
                <span className="font-bold text-slate-400 block uppercase text-[9px]">Henrique</span>
                <span className="font-semibold text-emerald-600 block">✨ {henriqueData?.totalPontos} pts marcados</span>
                <span className="font-semibold text-slate-700 block flex items-center space-x-0.5">
                  <ArrowDown className="w-3.5 h-3.5" />
                  <span>-{henriqueData?.perdaPesoTotal} kg eliminados</span>
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Scoreboard / Placar de Pontos card */}
        <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-400 uppercase border-b border-slate-50 pb-2">
            <Target className="w-4 h-4 text-slate-400" />
            <span>Placar Geral (1 hábito/refeição = 1 ponto)</span>
          </div>

          <div className="space-y-3">
            {/* Participant 1: Jessica */}
            {jessicaData && (
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-rose-50/40 border border-rose-100/50">
                <div className="flex items-center space-x-3">
                  <span className="text-xl">🌸</span>
                  <div>
                    <h4 className="font-display font-extrabold text-slate-800 text-sm flex items-center gap-1">
                      <span>Jéssica</span>
                      {getBadges(jessicaData.medidasCompleto, jessicaData.fotosProgresso, dataInicio)
                        .filter(b => b.unlocked)
                        .map(b => (
                          <span key={b.id} title={b.title} className="text-xs">
                            {b.emoji}
                          </span>
                        ))}
                    </h4>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Participante</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xl font-display font-black text-rose-500">{jessicaData.totalPontos}</span>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Pontos 🔥</span>
                </div>
              </div>
            )}

            {/* Participant 2: Henrique */}
            {henriqueData && (
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-50/40 border border-emerald-100/50">
                <div className="flex items-center space-x-3">
                  <span className="text-xl">⚡</span>
                  <div>
                    <h4 className="font-display font-extrabold text-slate-800 text-sm flex items-center gap-1">
                      <span>Henrique</span>
                      {getBadges(henriqueData.medidasCompleto, henriqueData.fotosProgresso, dataInicio)
                        .filter(b => b.unlocked)
                        .map(b => (
                          <span key={b.id} title={b.title} className="text-xs">
                            {b.emoji}
                          </span>
                        ))}
                    </h4>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Participante</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xl font-display font-black text-emerald-600">{henriqueData.totalPontos}</span>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Pontos 🔥</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Detailed Competitors Analysis Section (Photos + Body Measurements) */}
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              Evolução Corporal Detalhada
            </h3>
            
            {/* Unified Admin Angle Control */}
            <div className="bg-slate-100 p-0.5 rounded-xl flex border border-slate-200 shadow-inner max-w-xs w-full">
              {[
                { key: 'frente', label: 'Frente 👤' },
                { key: 'costas', label: 'Costas 👤' },
                { key: 'lado_direito', label: 'Lado Dir.' },
                { key: 'lado_esquerdo', label: 'Lado Esq.' }
              ].map(angle => (
                <button
                  key={angle.key}
                  type="button"
                  onClick={() => setSelectedAdminAngle(angle.key as any)}
                  className={`flex-1 py-1 text-center text-[10px] font-black rounded-lg transition-all ${
                    selectedAdminAngle === angle.key
                      ? 'bg-white text-slate-800 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {angle.label}
                </button>
              ))}
            </div>
          </div>

          {/* Jessica Detailed Card */}
          {jessicaData && (
            <div className="bg-white border border-rose-100 rounded-3xl p-5 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🌸</span>
                  <div>
                    <h4 className="font-display font-extrabold text-slate-900 text-base">Jéssica</h4>
                    {/* Unlocked Achievements Medals */}
                    <div className="flex items-center gap-1 mt-1">
                      {getBadges(jessicaData.medidasCompleto, jessicaData.fotosProgresso, dataInicio)
                        .filter(b => b.unlocked)
                        .map(b => (
                          <span
                            key={b.id}
                            title={`${b.title}: ${b.description}`}
                            className="text-xs bg-slate-50 p-0.5 px-1 rounded-md border border-slate-100 flex items-center gap-0.5 cursor-help"
                          >
                            <span>{b.emoji}</span>
                            <span className="text-[8px] font-black uppercase text-slate-500">{b.day === 30 ? '30D' : b.day === 60 ? '60D' : '90D'}</span>
                          </span>
                        ))}
                      {getBadges(jessicaData.medidasCompleto, jessicaData.fotosProgresso, dataInicio).filter(b => b.unlocked).length === 0 && (
                        <span className="text-[8px] text-slate-400 font-bold uppercase italic">Nenhuma medalha ainda</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="bg-rose-50 text-rose-500 font-extrabold text-xs px-3 py-1 rounded-full border border-rose-100">
                  Consistência: {jessicaData.diasCumpridosPercent}%
                </div>
              </div>

              {/* Side-by-side Photos */}
              {renderSideBySidePhotos(jessicaData.fotosProgresso)}

              {/* Milestone Comparison (Dia 0, 30, 60, 90) */}
              {renderMilestoneComparison(jessicaData.medidasCompleto, jessicaData.fotosProgresso, dataInicio)}

              {/* Detailed Measurements Table */}
              <div className="space-y-2 pt-2 border-t border-slate-50">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Medições de Partidas vs. Finais</span>
                {renderBodyPartComparison(jessicaData.medidasCompleto, jessicaData.medidasEvolucao)}
              </div>
            </div>
          )}

          {/* Henrique Detailed Card */}
          {henriqueData && (
            <div className="bg-white border border-emerald-100 rounded-3xl p-5 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">⚡</span>
                  <div>
                    <h4 className="font-display font-extrabold text-slate-900 text-base">Henrique</h4>
                    {/* Unlocked Achievements Medals */}
                    <div className="flex items-center gap-1 mt-1">
                      {getBadges(henriqueData.medidasCompleto, henriqueData.fotosProgresso, dataInicio)
                        .filter(b => b.unlocked)
                        .map(b => (
                          <span
                            key={b.id}
                            title={`${b.title}: ${b.description}`}
                            className="text-xs bg-slate-50 p-0.5 px-1 rounded-md border border-slate-100 flex items-center gap-0.5 cursor-help"
                          >
                            <span>{b.emoji}</span>
                            <span className="text-[8px] font-black uppercase text-slate-500">{b.day === 30 ? '30D' : b.day === 60 ? '60D' : '90D'}</span>
                          </span>
                        ))}
                      {getBadges(henriqueData.medidasCompleto, henriqueData.fotosProgresso, dataInicio).filter(b => b.unlocked).length === 0 && (
                        <span className="text-[8px] text-slate-400 font-bold uppercase italic">Nenhuma medalha ainda</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="bg-emerald-50 text-emerald-600 font-extrabold text-xs px-3 py-1 rounded-full border border-emerald-100">
                  Consistência: {henriqueData.diasCumpridosPercent}%
                </div>
              </div>

              {/* Side-by-side Photos */}
              {renderSideBySidePhotos(henriqueData.fotosProgresso)}

              {/* Milestone Comparison (Dia 0, 30, 60, 90) */}
              {renderMilestoneComparison(henriqueData.medidasCompleto, henriqueData.fotosProgresso, dataInicio)}

              {/* Detailed Measurements Table */}
              <div className="space-y-2 pt-2 border-t border-slate-50">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Medições de Partidas vs. Finais</span>
                {renderBodyPartComparison(henriqueData.medidasCompleto, henriqueData.medidasEvolucao)}
              </div>
            </div>
          )}
        </div>

        {/* Superimposed Weight progression chart */}
        <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-400 uppercase">
            <TrendingUp className="w-4 h-4 text-slate-400" />
            <span>Comparativo de Peso (Evolução Simultânea)</span>
          </div>

          <div className="w-full h-56 text-[10px] font-bold">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="label" stroke="#94a3b8" />
                  <YAxis type="number" stroke="#94a3b8" />
                  <Tooltip
                    contentStyle={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #f1f5f9', fontFamily: 'Inter' }}
                    labelStyle={{ fontWeight: 'bold' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '10px' }} />
                  <Line
                    type="monotone"
                    dataKey="Jéssica"
                    stroke="#f43f5e"
                    strokeWidth={3}
                    dot={{ r: 4, strokeWidth: 2, stroke: '#ffffff' }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="Henrique"
                    stroke="#10b981"
                    strokeWidth={3}
                    dot={{ r: 4, strokeWidth: 2, stroke: '#ffffff' }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 space-y-1">
                <Users className="w-8 h-8 text-slate-300 stroke-[1.5]" />
                <p className="font-bold text-sm">Aguardando dados</p>
                <p className="text-xs max-w-[200px]">Os competidores precisam registrar seus pesos semanais para popular o gráfico comparativo.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
