import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { CheckDiario, Usuario, ItemDieta, CheckDieta, Medida, FotoProgresso } from '../types';
import { getBadges, Badge } from '../utils/achievements';
import { Flame, Trophy, Sparkles, LogOut, Check, Utensils, Settings, X, Calendar, Lock, Award, CalendarCheck, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface HojeViewProps {
  usuario: Usuario;
  onLogout: () => void;
  checks: CheckDiario[];
  medidas: Medida[];
  fotos: FotoProgresso[];
  onRefreshChecks: () => Promise<void>;
}

export default function HojeView({ usuario, onLogout, checks, medidas, fotos, onRefreshChecks }: HojeViewProps) {
  const [loading, setLoading] = useState<boolean>(false);
  const [streak, setStreak] = useState<number>(0);
  const [daysRemaining, setDaysRemaining] = useState<number>(90);
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  
  // Diet state
  const [itensDieta, setItensDieta] = useState<ItemDieta[]>([]);
  const [checksDieta, setChecksDieta] = useState<CheckDieta[]>([]);
  const [loadingDieta, setLoadingDieta] = useState<boolean>(true);

  // Challenge config state
  const [challengeConfig, setChallengeConfig] = useState<{ id: number; data_inicio: string; dia_lixo_semana: number } | null>(null);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [configDataInicio, setConfigDataInicio] = useState<string>('2026-07-06');
  const [configDiaLixo, setConfigDiaLixo] = useState<number>(6);
  const [savingConfig, setSavingConfig] = useState<boolean>(false);

  const [todayCheck, setTodayCheck] = useState<Omit<CheckDiario, 'id' | 'usuario_id'>>({
    data: '',
    treino: false,
    dieta: false,
    zero_doce: false,
    zero_besteira: false,
    agua: false
  });

  // Helper for YYYY-MM-DD
  function getLocalDateString(date: Date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const todayStr = getLocalDateString();
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  const loadDietaData = async (dateStr: string) => {
    try {
      const [items, currentChecks] = await Promise.all([
        api.getItensDieta(),
        api.getChecksDieta(dateStr)
      ]);
      setItensDieta(items);
      setChecksDieta(currentChecks);
    } catch (err) {
      console.error('Erro ao carregar dieta no HojeView:', err);
    } finally {
      setLoadingDieta(false);
    }
  };

  const loadChallengeConfig = async () => {
    try {
      const config = await api.getDesafioConfig();
      setChallengeConfig(config);
      setConfigDataInicio(config.data_inicio);
      setConfigDiaLixo(config.dia_lixo_semana);
    } catch (err) {
      console.error('Erro ao carregar config do desafio:', err);
    }
  };

  // Load and calculate today's data, streak, and countdown
  useEffect(() => {
    loadChallengeConfig();
  }, []);

  useEffect(() => {
    // 1. Find today's check
    const currentToday = checks.find(c => c.data === selectedDate);
    if (currentToday) {
      setTodayCheck({
        data: currentToday.data,
        treino: currentToday.treino,
        dieta: currentToday.dieta,
        zero_doce: currentToday.zero_doce,
        zero_besteira: currentToday.zero_besteira,
        agua: currentToday.agua
      });
    } else {
      setTodayCheck({
        data: selectedDate,
        treino: false,
        dieta: false,
        zero_doce: false,
        zero_besteira: false,
        agua: false
      });
    }

    // 2. Calculate challenge start & remaining days based on config
    const startDateStr = challengeConfig?.data_inicio || '2026-07-06';
    const start = new Date(startDateStr + 'T12:00:00');
    const today = new Date(todayStr + 'T12:00:00');
    const diffTime = today.getTime() - start.getTime();
    if (diffTime >= 0) {
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const elapsed = Math.min(diffDays, 90);
      setDaysRemaining(90 - elapsed);
    } else {
      setDaysRemaining(90);
    }

    // 3. Calculate streak
    setStreak(calculateCurrentStreak(checks));
    
    // 4. Load diet checklist
    loadDietaData(selectedDate);
  }, [checks, selectedDate, todayStr, challengeConfig]);

  function calculateCurrentStreak(list: CheckDiario[]): number {
    if (!list || list.length === 0) return 0;
    
    const activeCheckDates = new Set(
      list
        // Include any day with at least one active habit check-in
        .filter(c => c.treino || c.dieta || c.zero_doce || c.zero_besteira || c.agua)
        .map(c => c.data)
    );

    if (activeCheckDates.size === 0) return 0;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getLocalDateString(yesterday);

    let startSearchStr = todayStr;
    if (!activeCheckDates.has(todayStr)) {
      if (activeCheckDates.has(yesterdayStr)) {
        startSearchStr = yesterdayStr;
      } else {
        return 0; // Streak broken
      }
    }

    let count = 0;
    const tempDate = new Date(startSearchStr + 'T12:00:00');

    while (true) {
      const checkStr = getLocalDateString(tempDate);
      if (activeCheckDates.has(checkStr)) {
        count++;
        tempDate.setDate(tempDate.getDate() - 1);
      } else {
        break;
      }
    }

    return count;
  }

  const handleToggleHabit = async (habitKey: 'treino' | 'dieta' | 'zero_doce' | 'zero_besteira' | 'agua') => {
    if (loading) return;
    setLoading(true);

    const updatedCheck = {
      ...todayCheck,
      [habitKey]: !todayCheck[habitKey]
    };

    // Optimistic Update
    setTodayCheck(updatedCheck);

    try {
      await api.saveCheck(selectedDate, updatedCheck);
      await onRefreshChecks();
    } catch (err) {
      // Revert if error
      setTodayCheck(todayCheck);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleDietMeal = async (itemId: number) => {
    const currentCheck = checksDieta.find(c => c.item_dieta_id === itemId);
    const isChecked = !!currentCheck?.cumprido;
    
    // Optimistic Update
    const updatedChecks = isChecked
      ? checksDieta.filter(c => c.item_dieta_id !== itemId)
      : [...checksDieta, { id: 0, usuario_id: usuario.id, item_dieta_id: itemId, data: selectedDate, cumprido: true, e_refeicao_livre: false }];
    
    setChecksDieta(updatedChecks);

    try {
      await api.saveChecksDieta(selectedDate, [
        { item_dieta_id: itemId, cumprido: !isChecked, e_refeicao_livre: false }
      ]);
      const currentChecks = await api.getChecksDieta(selectedDate);
      setChecksDieta(currentChecks);
      await onRefreshChecks(); // Refresh comparison stats
    } catch (err) {
      console.error('Erro ao salvar check da dieta:', err);
      loadDietaData(selectedDate);
    }
  };

  const handleToggleFreeMeal = async (itemId: number) => {
    const currentCheck = checksDieta.find(c => c.item_dieta_id === itemId);
    if (!currentCheck || !currentCheck.cumprido) return;

    const wasFree = !!currentCheck.e_refeicao_livre;

    // Optimistic Update: make this free, and clear others for today
    const updatedChecks = checksDieta.map(c => {
      if (c.item_dieta_id === itemId) {
        return { ...c, e_refeicao_livre: !wasFree };
      } else {
        return { ...c, e_refeicao_livre: false };
      }
    });
    setChecksDieta(updatedChecks);

    try {
      await api.saveChecksDieta(selectedDate, [
        { item_dieta_id: itemId, cumprido: true, e_refeicao_livre: !wasFree }
      ]);
      const currentChecks = await api.getChecksDieta(selectedDate);
      setChecksDieta(currentChecks);
      await onRefreshChecks();
    } catch (err) {
      console.error('Erro ao salvar refeição livre:', err);
      loadDietaData(selectedDate);
    }
  };

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    try {
      await api.saveDesafioConfig({
        data_inicio: configDataInicio,
        dia_lixo_semana: configDiaLixo
      });
      await loadChallengeConfig();
      setShowSettings(false);
      await onRefreshChecks();
    } catch (err) {
      alert('Erro ao salvar configurações do desafio');
    } finally {
      setSavingConfig(false);
    }
  };

  const completedCount = [
    todayCheck.treino,
    todayCheck.dieta,
    todayCheck.zero_doce,
    todayCheck.zero_besteira,
    todayCheck.agua
  ].filter(Boolean).length;

  const totalDietMeals = itensDieta.length;
  const completedDietMeals = checksDieta.filter(c => c.cumprido).length;

  // A truly Perfect Legendary Day is when all habits are checked AND (either there is no diet plan or all diet meals are checked)
  const isPerfectDay = completedCount === 5 && (totalDietMeals === 0 || completedDietMeals === totalDietMeals);

  const handlePrevDay = () => {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() - 1);
    setSelectedDate(getLocalDateString(d));
  };

  const handleNextDay = () => {
    if (selectedDate === todayStr) return;
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() + 1);
    setSelectedDate(getLocalDateString(d));
  };

  const getFormattedSelectedDate = () => {
    if (selectedDate === todayStr) {
      return 'Hoje';
    }
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getLocalDateString(yesterday);
    if (selectedDate === yesterdayStr) {
      return 'Ontem';
    }
    
    // Parse selectedDate
    const dateParts = selectedDate.split('-');
    if (dateParts.length === 3) {
      const d = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]), 12, 0, 0);
      return d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' })
        .replace(/^\w/, (c) => c.toUpperCase()); // Capitalize first letter
    }
    return selectedDate;
  };

  // Gamified message builder
  const getMotivationalMessage = () => {
    const totalPossible = 5 + totalDietMeals;
    const currentCompleted = completedCount + completedDietMeals;
    const isTodaySelected = selectedDate === todayStr;

    if (currentCompleted === 0) {
      return {
        text: isTodaySelected ? 'Bora começar o dia? Cada pequeno passo conta! 🏁' : 'Nenhuma atividade registrada para este dia. 🎯',
        sub: isTodaySelected ? 'Toque nos cards para marcar suas conquistas de hoje.' : 'Você pode marcar seus hábitos tocando nos cards abaixo.',
        color: 'text-slate-500 bg-slate-100'
      };
    } else if (currentCompleted < Math.floor(totalPossible / 2)) {
      return {
        text: isTodaySelected ? 'Bom começo! Passo a passo você chega lá... 💪' : 'Progresso iniciado para este dia! 💪',
        sub: 'Sua consistência dita os resultados de 90 dias.',
        color: 'text-amber-600 bg-amber-50 border-amber-100'
      };
    } else if (currentCompleted < totalPossible) {
      return {
        text: isTodaySelected ? 'Você tá voando no desafio de hoje! Quase tudo pronto! ⚡' : 'Quase tudo pronto para este dia! ⚡',
        sub: 'Só mais um pouco para fechar com chave de ouro.',
        color: 'text-indigo-600 bg-indigo-50 border-indigo-100'
      };
    } else {
      return {
        text: 'DIÁRIO LENDÁRIO CONQUISTADO! 🔥👑',
        sub: isTodaySelected ? 'Você alcançou 100% de consistência hoje! Orgulho total!' : 'Você alcançou 100% de consistência neste dia! Orgulho total!',
        color: 'text-emerald-700 bg-emerald-50 border-emerald-100'
      };
    }
  };

  const msg = getMotivationalMessage();

  const isJessica = usuario.nome === 'Jéssica';
  const colorTheme = isJessica ? {
    primary: 'from-rose-500 to-orange-400',
    primarySolid: 'bg-rose-500',
    border: 'border-rose-100',
    accentText: 'text-rose-500',
    accentBg: 'bg-rose-50',
    glow: 'shadow-rose-100'
  } : {
    primary: 'from-emerald-500 to-teal-400',
    primarySolid: 'bg-emerald-500',
    border: 'border-emerald-100',
    accentText: 'text-emerald-600',
    accentBg: 'bg-emerald-50',
    glow: 'shadow-emerald-100'
  };

  const habits = [
    { key: 'treino' as const, label: 'Treino', emoji: '🏋️', description: 'Atividade física', activeBg: isJessica ? 'bg-rose-500' : 'bg-emerald-500' },
    { key: 'dieta' as const, label: 'Dieta Regulada', emoji: '🥗', description: 'Seguiu a dieta certinho', activeBg: isJessica ? 'bg-amber-500' : 'bg-orange-500' },
    { key: 'zero_doce' as const, label: 'Zero Doce', emoji: '🚫🍬', description: 'Sem açúcar refinado', activeBg: isJessica ? 'bg-orange-500' : 'bg-teal-500' },
    { key: 'zero_besteira' as const, label: 'Zero Besteira', emoji: '🚫🍟', description: 'Sem fritura ou ultraprocessados', activeBg: isJessica ? 'bg-pink-500' : 'bg-emerald-600' },
    { key: 'agua' as const, label: 'Água (3L+)', emoji: '💧', description: 'Hidratação batida', activeBg: 'bg-blue-500' },
  ];

  // Determine if selected date is Dia do Lixo
  const todayDateObj = new Date(selectedDate + 'T12:00:00');
  const isDiaLixo = challengeConfig ? todayDateObj.getDay() === challengeConfig.dia_lixo_semana : false;

  // Calculate Achievement Badges
  const startChallengeDate = challengeConfig?.data_inicio || '2026-07-06';
  const participantBadges = getBadges(medidas, fotos, startChallengeDate);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 pb-28">
      
      {/* Header Profile with Logout */}
      <div className="w-full bg-white border-b border-slate-100 px-6 py-4 flex justify-between items-center sticky top-0 z-40 shadow-sm">
        <button
          onClick={() => setShowProfileModal(true)}
          className="flex items-center space-x-3 text-left focus:outline-none hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer group"
          title="Ver meu perfil completo"
        >
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${colorTheme.primary} flex items-center justify-center font-display font-extrabold text-white shadow-xs group-hover:scale-105 transition-transform`}>
            {usuario.nome[0]}
          </div>
          <div>
            <h2 className="text-sm font-display font-extrabold text-slate-900 flex items-center gap-1">
              <span>{usuario.nome}</span>
              <span>{isJessica ? '🌸' : '⚡'}</span>
              
              {/* Mini unlocked badges row */}
              <div className="flex items-center gap-0.5 ml-1">
                {participantBadges.filter(b => b.unlocked).map(b => (
                  <span key={b.id} title={b.title} className="text-xs animate-bounce" style={{ animationDelay: b.day === 30 ? '0.2s' : b.day === 60 ? '0.4s' : '0.6s' }}>
                    {b.emoji}
                  </span>
                ))}
              </div>
            </h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
              <span>Desafio de 90 Dias</span>
              <span className="text-blue-500 font-extrabold text-[9px] hover:underline">(Ver perfil)</span>
            </p>
          </div>
        </button>

        <div className="flex items-center space-x-1">
          <button
            id="btn-settings"
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 text-slate-400 hover:text-slate-600 active:scale-95 transition-all rounded-lg hover:bg-slate-50 cursor-pointer"
            title="Configurações do Desafio"
          >
            <Settings className="w-5 h-5" />
          </button>
          
          <button
            id="btn-logout"
            onClick={onLogout}
            className="p-2 text-slate-400 hover:text-slate-600 active:scale-95 transition-all rounded-lg hover:bg-slate-50 cursor-pointer"
            title="Sair"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="px-5 py-6 space-y-6 w-full max-w-md mx-auto">

        {/* Slide-down Settings Panel */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-white border border-slate-100 rounded-2xl p-5 shadow-md space-y-4 overflow-hidden"
            >
              <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                <h3 className="text-sm font-display font-extrabold text-slate-900 flex items-center space-x-1.5">
                  <Settings className="w-4 h-4 text-slate-400" />
                  <span>Configuração do Desafio</span>
                </h3>
                <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-500 font-bold mb-1">DATA DE INÍCIO DO DESAFIO</label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      id="config-data-inicio"
                      type="date"
                      value={configDataInicio}
                      onChange={(e) => setConfigDataInicio(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-orange-500 font-semibold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-500 font-bold mb-1">DIA DO LIXO DA SEMANA</label>
                  <select
                    id="config-dia-lixo"
                    value={configDiaLixo}
                    onChange={(e) => setConfigDiaLixo(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-orange-500 font-semibold bg-white"
                  >
                    <option value={0}>Domingo</option>
                    <option value={1}>Segunda-feira</option>
                    <option value={2}>Terça-feira</option>
                    <option value={3}>Quarta-feira</option>
                    <option value={4}>Quinta-feira</option>
                    <option value={5}>Sexta-feira</option>
                    <option value={6}>Sábado</option>
                  </select>
                </div>

                <button
                  id="btn-save-config"
                  onClick={handleSaveConfig}
                  disabled={savingConfig}
                  className="w-full py-2 bg-slate-900 text-white rounded-xl font-bold active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer text-center"
                >
                  {savingConfig ? 'Salvando...' : 'Salvar Configurações'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dia do Lixo Top Banner */}
        {isDiaLixo && (
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-gradient-to-r from-amber-400 to-orange-400 rounded-2xl p-4 text-white shadow-md relative overflow-hidden flex items-center justify-between border border-amber-300"
          >
            <div className="flex items-center space-x-3">
              <span className="text-3xl animate-bounce">🎉</span>
              <div>
                <h3 className="font-display font-black text-sm leading-tight">Hoje é o Dia do Lixo!</h3>
                <p className="text-[11px] opacity-90 font-semibold">Aproveite sua refeição livre e a marque na lista abaixo.</p>
              </div>
            </div>
            <div className="absolute -right-3 -bottom-3 opacity-20 text-6xl">🍕</div>
          </motion.div>
        )}
        
        {/* Game Stats (Grid: Streak and Countdown) */}
        <div className="grid grid-cols-2 gap-3">
          {/* Streak Flame Card */}
          <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm flex items-center space-x-3 relative overflow-hidden">
            <div className={`w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center`}>
              <Flame className={`w-6 h-6 text-orange-500 fill-orange-500 ${streak > 0 ? 'animate-pulse' : ''}`} />
            </div>
            <div>
              <div className="text-2xl font-display font-black text-slate-900">{streak}</div>
              <div className="text-[10px] font-bold text-slate-400 uppercase">Sequência 🔥</div>
            </div>
            {streak > 0 && (
              <div className="absolute top-1 right-2">
                <span className="text-[10px] text-orange-400 font-bold">Tá queimando!</span>
              </div>
            )}
          </div>

          {/* Countdown Card */}
          <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <Trophy className="w-6 h-6 text-blue-500 fill-blue-50" />
            </div>
            <div>
              <div className="text-2xl font-display font-black text-slate-900">{daysRemaining}</div>
              <div className="text-[10px] font-bold text-slate-400 uppercase">Dias Restantes 🏁</div>
            </div>
          </div>
        </div>

        {/* Achievements Quick Glance Card */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-amber-500" />
              <span>Minhas Medalhas Virtuais</span>
            </span>
            <button
              onClick={() => setShowProfileModal(true)}
              className="text-[10px] font-extrabold text-blue-500 hover:text-blue-600 uppercase tracking-wider flex items-center gap-0.5 focus:outline-none cursor-pointer"
            >
              <span>Ver Perfil</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          
          <div className="grid grid-cols-3 gap-2">
            {participantBadges.map(badge => (
              <button
                key={badge.id}
                onClick={() => setShowProfileModal(true)}
                className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer hover:scale-[1.02] flex flex-col items-center justify-center space-y-1 ${
                  badge.unlocked 
                    ? `${badge.bgColor} ${badge.borderColor} ${badge.color}` 
                    : 'bg-slate-50 border-slate-100 opacity-60'
                }`}
              >
                <span className="text-2xl">{badge.unlocked ? badge.emoji : '🔒'}</span>
                <div className="space-y-0.5">
                  <div className={`text-[9px] font-black leading-tight ${badge.unlocked ? 'text-slate-800' : 'text-slate-400'}`}>
                    {badge.day === 30 ? 'Dia 30' : badge.day === 60 ? 'Dia 60' : 'Dia 90'}
                  </div>
                  <div className={`text-[8px] font-bold leading-tight ${badge.unlocked ? 'text-amber-600' : 'text-slate-400'}`}>
                    {badge.unlocked ? 'Desbloqueado' : 'Bloqueado'}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Seletor de Dia / Date Picker */}
        <div className="bg-white rounded-2xl border border-slate-100 p-3 shadow-sm flex items-center justify-between">
          <button
            onClick={handlePrevDay}
            className="p-2 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer text-slate-500 active:scale-95 transition-transform"
            title="Dia anterior"
          >
            <ChevronRight className="w-5 h-5 transform rotate-180" />
          </button>

          <div className="relative flex items-center justify-center space-x-2 cursor-pointer group hover:opacity-80 transition-opacity">
            <Calendar className={`w-4 h-4 ${colorTheme.accentText}`} />
            <span className="text-sm font-display font-black text-slate-800">
              {getFormattedSelectedDate()}
            </span>
            <span className="text-[10px] text-slate-400 font-bold bg-slate-50 px-1.5 py-0.5 rounded-md">
              {selectedDate.split('-').slice(1).reverse().join('/')}
            </span>
            <input
              type="date"
              max={todayStr}
              value={selectedDate}
              onChange={(e) => {
                if (e.target.value) {
                  setSelectedDate(e.target.value);
                }
              }}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              title="Selecione um dia específico"
            />
          </div>

          <button
            onClick={handleNextDay}
            disabled={selectedDate === todayStr}
            className={`p-2 rounded-xl transition-colors ${
              selectedDate === todayStr
                ? 'opacity-20 cursor-not-allowed text-slate-300'
                : 'hover:bg-slate-50 cursor-pointer text-slate-500 active:scale-95 transition-transform'
            }`}
            title="Próximo dia"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Dynamic Interactive Progress Board */}
        <div className={`p-4 rounded-2xl border ${colorTheme.border} bg-white shadow-sm relative overflow-hidden`}>
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase">
              {selectedDate === todayStr ? 'Hábitos de Hoje' : 'Hábitos do Dia'}
            </span>
            <span className={`text-xs font-extrabold px-2 py-0.5 rounded-full ${colorTheme.accentBg} ${colorTheme.accentText}`}>
              {completedCount}/5 Cumpridos
            </span>
          </div>

          {/* Progress Micro-Bar */}
          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden mb-4 relative">
            <div
              className={`h-full bg-gradient-to-r ${colorTheme.primary} rounded-full transition-all duration-300`}
              style={{ width: `${(completedCount / 5) * 100}%` }}
            />
          </div>

          {/* Dieta Progress */}
          {totalDietMeals > 0 && (
            <div className="border-t border-slate-100 pt-3 mt-3">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-xs font-bold text-slate-400 uppercase">Plano de Dieta</span>
                <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">
                  {completedDietMeals}/{totalDietMeals} Refeições
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden relative">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-300"
                  style={{ width: `${(completedDietMeals / totalDietMeals) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Message text */}
          <div className="text-center py-1 mt-4 border-t border-slate-50 pt-3">
            <h4 className="text-sm font-display font-extrabold text-slate-800">{msg.text}</h4>
            <p className="text-xs text-slate-400 font-medium mt-0.5">{msg.sub}</p>
          </div>
        </div>

        {/* 100% Celebration Screen if perfect day */}
        <AnimatePresence>
          {isPerfectDay && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gradient-to-tr from-amber-400 to-orange-400 rounded-2xl p-4 text-white text-center shadow-lg shadow-amber-100 flex items-center justify-between"
            >
              <div className="flex items-center space-x-3 text-left">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-2xl animate-bounce">
                  🏆
                </div>
                <div>
                  <h3 className="font-display font-black text-base">Dia Lendário Conquistado!</h3>
                  <p className="text-xs opacity-90 font-medium">Você completou 100% dos hábitos e refeições!</p>
                </div>
              </div>
              <Sparkles className="w-6 h-6 animate-pulse" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Habit Interactive List */}
        <div className="space-y-3">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1">
            <span>🎯</span>
            <span>Minhas Metas Diárias</span>
          </div>
          
          {habits.map(habit => {
            const isChecked = !!todayCheck[habit.key];
            return (
              <button
                key={habit.key}
                id={`habit-card-${habit.key}`}
                onClick={() => handleToggleHabit(habit.key)}
                className={`w-full flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all active:scale-[0.98] text-left relative overflow-hidden ${
                  isChecked 
                    ? 'bg-white border-slate-100 shadow-md transform translate-y-[-2px]' 
                    : 'bg-white border-slate-100 shadow-sm hover:border-slate-200'
                }`}
              >
                {/* Left Side: Emoji and Label */}
                <div className="flex items-center space-x-4 z-10">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition-all duration-300 ${
                    isChecked ? `${habit.activeBg} text-white shadow-sm` : 'bg-slate-50'
                  }`}>
                    {isChecked ? <Check className="w-6 h-6 stroke-[3]" /> : habit.emoji}
                  </div>
                  <div>
                    <h3 className={`font-display font-bold text-base transition-colors ${isChecked ? 'text-slate-900' : 'text-slate-700'}`}>
                      {habit.label}
                    </h3>
                    <p className="text-xs text-slate-400 font-medium">{habit.description}</p>
                  </div>
                </div>

                {/* Right Side Check Circle indicator */}
                <div className="z-10">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                    isChecked 
                      ? isJessica
                        ? 'bg-rose-500 border-rose-500 text-white'
                        : 'bg-emerald-500 border-emerald-500 text-white'
                      : 'border-slate-200 bg-white'
                  }`}>
                    {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </div>

                {/* Subtle colorful active background strip */}
                {isChecked && (
                  <div className={`absolute top-0 bottom-0 left-0 w-1.5 ${habit.activeBg}`} />
                )}
              </button>
            );
          })}
        </div>

        {/* Diet Checklist */}
        <div className="space-y-3 pt-2">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
            <Utensils className="w-4 h-4" />
            <span>Minha Nutrição / Dieta</span>
          </div>

          {loadingDieta ? (
            <div className="bg-white p-6 rounded-2xl border border-slate-100 flex justify-center">
              <div className={`w-5 h-5 border-2 border-t-transparent rounded-full animate-spin ${colorTheme.accentText}`} />
            </div>
          ) : itensDieta.length === 0 ? (
            <div className="bg-white p-6 rounded-2xl border border-slate-100 text-center space-y-1.5 shadow-sm">
              <p className="text-xs font-semibold text-slate-400">Nenhuma refeição cadastrada.</p>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                Vá até a aba <strong className="font-bold">Dieta</strong> no menu inferior para cadastrar seu plano de refeições e acompanhar aqui diariamente!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {itensDieta.map(item => {
                const checkObj = checksDieta.find(c => c.item_dieta_id === item.id);
                const isChecked = !!checkObj?.cumprido;
                const isFreeMeal = !!checkObj?.e_refeicao_livre;

                return (
                  <div
                    key={item.id}
                    id={`diet-meal-card-${item.id}`}
                    onClick={() => handleToggleDietMeal(item.id)}
                    className={`w-full p-4 rounded-2xl border cursor-pointer transition-all active:scale-[0.98] text-left relative overflow-hidden ${
                      isChecked 
                        ? 'bg-white border-slate-100 shadow-md transform translate-y-[-2px]' 
                        : 'bg-white border-slate-100 shadow-sm hover:border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 z-10">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl transition-all duration-300 ${
                          isChecked ? 'bg-amber-500 text-white shadow-sm' : 'bg-slate-50'
                        }`}>
                          {isChecked ? <Check className="w-6 h-6 stroke-[3]" /> : '🥗'}
                        </div>
                        <div className="min-w-0 pr-6">
                          <h3 className={`font-display font-bold text-sm truncate transition-colors ${isChecked ? 'text-slate-900' : 'text-slate-700'}`}>
                            {item.nome_refeicao}
                          </h3>
                          {item.descricao ? (
                            <p className="text-xs text-slate-400 font-medium truncate mt-0.5">{item.descricao}</p>
                          ) : (
                            <span className="text-[10px] italic text-slate-300">Sem descrição</span>
                          )}
                        </div>
                      </div>

                      <div className="z-10 flex-shrink-0">
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                          isChecked 
                            ? 'bg-amber-500 border-amber-500 text-white'
                            : 'border-slate-200 bg-white'
                        }`}>
                          {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                      </div>
                    </div>

                    {/* Secondary checkbox for "Refeição Livre" on Dia do Lixo */}
                    {isChecked && isDiaLixo && (
                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between relative z-20">
                        <button
                          id={`free-meal-btn-${item.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleFreeMeal(item.id);
                          }}
                          className={`px-3 py-1.5 text-[11px] font-bold transition-all flex items-center space-x-1 cursor-pointer rounded-xl ${
                            isFreeMeal
                              ? 'bg-amber-100 text-amber-700 border border-amber-200 shadow-sm animate-pulse'
                              : 'bg-slate-50 hover:bg-slate-100 text-slate-500 border border-slate-100'
                          }`}
                        >
                          <span>🎉</span>
                          <span>{isFreeMeal ? 'Minha Refeição Livre! 🍕' : 'Essa foi minha refeição livre?'}</span>
                        </button>
                      </div>
                    )}

                    {isChecked && (
                      <div className="absolute top-0 bottom-0 left-0 w-1.5 bg-amber-500" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* Profile / Trophy Modal */}
      <AnimatePresence>
        {showProfileModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-4"
            onClick={() => setShowProfileModal(false)}
          >
            <motion.div
              initial={{ y: 100, scale: 0.95 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 100, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[85vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center space-x-2">
                  <Trophy className="w-5 h-5 text-amber-500 fill-amber-100" />
                  <span className="font-display font-black text-sm text-slate-800 uppercase tracking-wider">
                    Perfil &amp; Conquistas
                  </span>
                </div>
                <button
                  onClick={() => setShowProfileModal(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Content (Scrollable) */}
              <div className="p-6 overflow-y-auto space-y-6">
                {/* Participant Hero Header */}
                <div className="flex flex-col items-center text-center space-y-3 pb-5 border-b border-slate-100">
                  <div className="relative">
                    {/* Outer Glow Ring */}
                    <div className={`absolute -inset-1 rounded-full bg-gradient-to-tr ${colorTheme.primary} opacity-20 blur-sm animate-pulse`} />
                    
                    {/* Profile Initial */}
                    <div className={`relative w-20 h-20 rounded-full bg-gradient-to-tr ${colorTheme.primary} flex items-center justify-center font-display font-extrabold text-white text-3xl shadow-md border-4 border-white`}>
                      {usuario.nome[0]}
                    </div>
                    
                    {/* Mini float badge */}
                    <div className="absolute -bottom-1 -right-1 bg-white p-1 rounded-full shadow-sm border border-slate-100">
                      <span className="text-sm">{isJessica ? '🌸' : '⚡'}</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-xl font-display font-black text-slate-900">{usuario.nome}</h3>
                    <div className="flex items-center justify-center gap-1.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                        {usuario.papel === 'participante' ? 'Participante Oficial' : 'Administrador'}
                      </span>
                      {streak >= 15 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-orange-500 text-white shadow-xs">
                          🔥 Consistente
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick Stats Grid */}
                <div className="grid grid-cols-2 gap-3.5 bg-slate-50 p-4 rounded-2xl border border-slate-100/80">
                  <div className="space-y-0.5 text-center sm:text-left">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sequência Atual</div>
                    <div className="text-lg font-display font-black text-slate-800 flex items-center justify-center sm:justify-start gap-1">
                      <span>{streak} dias</span>
                      <Flame className="w-4 h-4 text-orange-500 fill-orange-500" />
                    </div>
                  </div>
                  <div className="space-y-0.5 text-center sm:text-left border-l border-slate-200 pl-4">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Data de Início</div>
                    <div className="text-sm font-black text-slate-700 flex items-center justify-center sm:justify-start gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{new Date(startChallengeDate + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>
                </div>

                {/* Detailed Badges Showcase */}
                <div className="space-y-3.5">
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-slate-400" />
                    <span>Minhas Medalhas do Desafio</span>
                  </h4>

                  <div className="space-y-3">
                    {participantBadges.map(badge => (
                      <div
                        key={badge.id}
                        className={`flex items-start gap-4 p-4 rounded-2xl border transition-all ${
                          badge.unlocked
                            ? `bg-white ${badge.borderColor} shadow-xs relative overflow-hidden group hover:shadow-md`
                            : 'bg-slate-50/50 border-slate-100 opacity-70'
                        }`}
                      >
                        {/* Badge Icon/Emoji Container */}
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0 transition-transform ${
                          badge.unlocked
                            ? `${badge.color} border group-hover:scale-110 duration-300`
                            : 'bg-slate-100 text-slate-400 border border-dashed border-slate-200'
                        }`}>
                          {badge.unlocked ? (
                            <span className="relative z-10">{badge.emoji}</span>
                          ) : (
                            <Lock className="w-6 h-6 text-slate-300 stroke-[2]" />
                          )}
                        </div>

                        {/* Badge Text Details */}
                        <div className="space-y-1 flex-1">
                          <div className="flex justify-between items-center">
                            <h5 className={`text-sm font-display font-black leading-tight ${
                              badge.unlocked ? 'text-slate-800' : 'text-slate-400'
                            }`}>
                              {badge.title}
                            </h5>
                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${
                              badge.unlocked
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                : 'bg-slate-200 text-slate-500'
                            }`}>
                              {badge.unlocked ? 'Desbloqueado' : 'Bloqueado'}
                            </span>
                          </div>

                          <p className="text-xs text-slate-400 font-medium leading-relaxed">
                            {badge.description}
                          </p>

                          {badge.unlocked && badge.unlockedDate && (
                            <div className="text-[9px] text-emerald-600 font-extrabold flex items-center gap-1 pt-1">
                              <CalendarCheck className="w-3 h-3" />
                              <span>Conquistado em: {new Date(badge.unlockedDate + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                            </div>
                          )}
                        </div>

                        {/* Subtle shine effect for unlocked badges */}
                        {badge.unlocked && (
                          <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-tr from-transparent via-white/5 to-white/20 pointer-events-none transform rotate-45" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer with inspirational motto */}
              <div className="p-4 border-t border-slate-100 bg-slate-50/50 text-center text-[11px] text-slate-400 font-bold italic leading-relaxed">
                &ldquo;A consistência é o que transforma o comum em extraordinário.&rdquo; 🌟
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
