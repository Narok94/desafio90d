import React, { useState, useEffect } from 'react';
import { Usuario } from '../types';
import { 
  ShoppingCart, 
  Check, 
  Plus, 
  Trash2, 
  RotateCcw, 
  Search, 
  User, 
  Users, 
  Sparkles, 
  CheckCircle2, 
  Circle, 
  LogOut,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ComprasViewProps {
  usuario: Usuario;
  onLogout: () => void;
}

export interface ShoppingItem {
  id: string;
  category: 'laticinios' | 'carnes' | 'cereais' | 'hortifruti' | 'outros';
  name: string;
  qtdTotal: string;
  qtdJessica?: string;
  qtdHenrique?: string;
  isCustom?: boolean;
}

export const CATEGORIES = [
  { id: 'laticinios', name: 'Laticínios, Ovos e Proteínas em Pó', emoji: '🥛', colorBg: 'bg-sky-50', colorText: 'text-sky-700', colorBorder: 'border-sky-100' },
  { id: 'carnes', name: 'Carnes e Proteínas Cozidas', emoji: '🥩', colorBg: 'bg-rose-50', colorText: 'text-rose-700', colorBorder: 'border-rose-100' },
  { id: 'cereais', name: 'Cereais, Grãos, Farinhas e Sementes', emoji: '🌾', colorBg: 'bg-amber-50', colorText: 'text-amber-800', colorBorder: 'border-amber-100' },
  { id: 'hortifruti', name: 'Hortifrúti (Frutas, Legumes e Saladas)', emoji: '🍎', colorBg: 'bg-emerald-50', colorText: 'text-emerald-800', colorBorder: 'border-emerald-100' },
  { id: 'outros', name: 'Outros / Matéria-Prima Diversa', emoji: '☕', colorBg: 'bg-purple-50', colorText: 'text-purple-800', colorBorder: 'border-purple-100' },
] as const;

export const DEFAULT_SHOPPING_ITEMS: ShoppingItem[] = [
  // Laticínios, Ovos e Proteínas em Pó
  {
    id: 'ovos',
    category: 'laticinios',
    name: 'Ovos de Galinha',
    qtdTotal: '56 unidades',
    qtdJessica: '28 unid/semana (4/dia: 2 no almoço + 2 no lanche)',
    qtdHenrique: '28 unid/semana (4/dia: 2 no café + 2 no lanche)'
  },
  {
    id: 'whey',
    category: 'laticinios',
    name: 'Whey Protein',
    qtdTotal: '420 g',
    qtdJessica: '210 g/semana (30 g/dia)',
    qtdHenrique: '210 g/semana (30 g/dia)'
  },
  {
    id: 'leite',
    category: 'laticinios',
    name: 'Leite de Vaca Desnatado',
    qtdTotal: '2,1 Litros',
    qtdJessica: '700 ml/semana (100 ml/dia)',
    qtdHenrique: '1,4 L/semana (200 ml/dia)'
  },
  {
    id: 'requeijao',
    category: 'laticinios',
    name: 'Requeijão Light / Creme de Ricota',
    qtdTotal: '14 colheres de sopa',
    qtdJessica: '7 colheres/semana (1 colher/dia)',
    qtdHenrique: '7 colheres/semana (1 colher/dia no café)'
  },

  // Carnes e Proteínas Cozidas
  {
    id: 'carne_frango',
    category: 'carnes',
    name: 'Carne Bovina ou Frango (para almoço e jantar)',
    qtdTotal: '3,01 kg',
    qtdJessica: '1,4 kg/semana (200 g/dia: 100g almoço + 100g jantar)',
    qtdHenrique: '1,61 kg/semana (230 g/dia: 130g almoço + 100g jantar)'
  },

  // Cereais, Grãos, Farinhas e Sementes
  {
    id: 'arroz',
    category: 'cereais',
    name: 'Arroz',
    qtdTotal: '3,43 kg',
    qtdJessica: '630 g/semana (90 g/dia no jantar)',
    qtdHenrique: '2,1 kg/semana (300 g/dia: 150g almoço + 150g jantar)'
  },
  {
    id: 'feijao',
    category: 'cereais',
    name: 'Feijão (ou Lentilha / Grão de Bico)',
    qtdTotal: '1,82 kg',
    qtdJessica: '420 g/semana (60 g/dia no jantar)',
    qtdHenrique: '1,4 kg/semana (200 g/dia: 100g almoço + 100g jantar)'
  },
  {
    id: 'pao_integral',
    category: 'cereais',
    name: 'Pão Integral',
    qtdTotal: '28 fatias (~2 a 3 pacotes)',
    qtdJessica: '14 fatias/semana (2 fatias/dia no almoço)',
    qtdHenrique: '14 fatias/semana (2 fatias/dia no café)'
  },
  {
    id: 'tapioca',
    category: 'cereais',
    name: 'Tapioca de Goma',
    qtdTotal: '14 colheres de sopa (~210 g)',
    qtdJessica: '7 colheres/semana (1 colher/dia no lanche)',
    qtdHenrique: '7 colheres/semana (1 colher/dia no lanche)'
  },
  {
    id: 'aveia',
    category: 'cereais',
    name: 'Farelo de Aveia',
    qtdTotal: '245 g',
    qtdJessica: '245 g/semana (35 g/dia: 20g café + 15g lanche)',
    qtdHenrique: 'Não utiliza no plano principal'
  },
  {
    id: 'cacau',
    category: 'cereais',
    name: 'Cacau em Pó',
    qtdTotal: '70 g',
    qtdJessica: '70 g/semana (10 g/dia)',
    qtdHenrique: 'Não utiliza no plano principal'
  },

  // Hortifrúti (Frutas, Legumes e Saladas)
  {
    id: 'legumes',
    category: 'hortifruti',
    name: 'Legumes Cozidos',
    qtdTotal: '1,68 kg',
    qtdJessica: '560 g/semana (80 g/dia no jantar)',
    qtdHenrique: '1,12 kg/semana (160 g/dia: 80g almoço + 80g jantar)'
  },
  {
    id: 'bananas',
    category: 'hortifruti',
    name: 'Bananas',
    qtdTotal: '7 unidades',
    qtdJessica: '7 unidades/semana (1 unidade/dia no lanche)',
    qtdHenrique: 'Não utiliza no plano principal'
  },
  {
    id: 'frutas',
    category: 'hortifruti',
    name: 'Frutas Variadas (Maçã, Pêra, Melancia, Mamão, Uva, etc.)',
    qtdTotal: '14 porções',
    qtdJessica: '7 porções/semana (1 porção/dia na colação)',
    qtdHenrique: '7 porções/semana (1 porção/dia no café)'
  },
  {
    id: 'tomate',
    category: 'hortifruti',
    name: 'Tomate',
    qtdTotal: '21 fatias médias (~2 a 3 tomates)',
    qtdJessica: '21 fatias/semana (3 fatias/dia no almoço)',
    qtdHenrique: 'Não utiliza no plano principal'
  },
  {
    id: 'salada',
    category: 'hortifruti',
    name: 'Alface / Salada Verde / Verduras Cruas',
    qtdTotal: 'À vontade',
    qtdJessica: 'À vontade para a semana',
    qtdHenrique: 'À vontade para a semana'
  },

  // Outros / Matéria-Prima Diversa
  {
    id: 'canela',
    category: 'outros',
    name: 'Canela em Pó',
    qtdTotal: '7 colheres de café (~8,4 g)',
    qtdJessica: '7 colheres de café/semana',
    qtdHenrique: 'Não utiliza no plano principal'
  },
  {
    id: 'cafe',
    category: 'outros',
    name: 'Café',
    qtdTotal: 'A gosto',
    qtdJessica: 'A gosto (consumo diário)',
    qtdHenrique: 'A gosto (consumo diário)'
  }
];

const LOCAL_STORAGE_CHECKED_KEY = 'd90_shopping_checked_v1';
const LOCAL_STORAGE_CUSTOM_KEY = 'd90_shopping_custom_v1';

export default function ComprasView({ usuario, onLogout }: ComprasViewProps) {
  const [viewMode, setViewMode] = useState<'casal' | 'jessica' | 'henrique'>('casal');
  const [checkedIds, setCheckedIds] = useState<Record<string, boolean>>({});
  const [customItems, setCustomItems] = useState<ShoppingItem[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);

  // Form states for adding custom item
  const [newItemName, setNewItemName] = useState<string>('');
  const [newItemQtd, setNewItemQtd] = useState<string>('');
  const [newItemCategory, setNewItemCategory] = useState<'laticinios' | 'carnes' | 'cereais' | 'hortifruti' | 'outros'>('outros');
  const [newItemPerson, setNewItemPerson] = useState<'casal' | 'jessica' | 'henrique'>('casal');

  const isCoral = usuario.cor_identidade === 'coral';
  const theme = isCoral
    ? {
        accentBg: 'bg-rose-500 hover:bg-rose-600 text-white',
        accentText: 'text-rose-600',
        accentBgLight: 'bg-rose-50',
        accentBorder: 'border-rose-100',
        accentRing: 'focus:ring-rose-400',
        badge: 'bg-rose-100 text-rose-700',
      }
    : {
        accentBg: 'bg-emerald-500 hover:bg-emerald-600 text-white',
        accentText: 'text-emerald-600',
        accentBgLight: 'bg-emerald-50',
        accentBorder: 'border-emerald-100',
        accentRing: 'focus:ring-emerald-400',
        badge: 'bg-emerald-100 text-emerald-700',
      };

  // Load from local storage
  useEffect(() => {
    try {
      const savedChecked = localStorage.getItem(LOCAL_STORAGE_CHECKED_KEY);
      if (savedChecked) {
        setCheckedIds(JSON.parse(savedChecked));
      }
      const savedCustom = localStorage.getItem(LOCAL_STORAGE_CUSTOM_KEY);
      if (savedCustom) {
        setCustomItems(JSON.parse(savedCustom));
      }
    } catch (e) {
      console.error('Erro ao carregar lista de compras do localStorage:', e);
    }
  }, []);

  // Save checked state
  const toggleItem = (id: string) => {
    const updated = { ...checkedIds, [id]: !checkedIds[id] };
    setCheckedIds(updated);
    try {
      localStorage.setItem(LOCAL_STORAGE_CHECKED_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Erro ao salvar estado:', e);
    }
  };

  // Reset checks
  const handleResetChecks = () => {
    if (window.confirm('Deseja desmarcar todos os itens comprados da lista?')) {
      setCheckedIds({});
      try {
        localStorage.removeItem(LOCAL_STORAGE_CHECKED_KEY);
      } catch (e) {
        console.error('Erro ao limpar estado:', e);
      }
    }
  };

  // Add custom item
  const handleAddCustomItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim() || !newItemQtd.trim()) return;

    const newItem: ShoppingItem = {
      id: `custom_${Date.now()}`,
      category: newItemCategory,
      name: newItemName.trim(),
      qtdTotal: newItemQtd.trim(),
      qtdJessica: newItemPerson === 'jessica' ? newItemQtd.trim() : (newItemPerson === 'casal' ? newItemQtd.trim() : undefined),
      qtdHenrique: newItemPerson === 'henrique' ? newItemQtd.trim() : (newItemPerson === 'casal' ? newItemQtd.trim() : undefined),
      isCustom: true,
    };

    const updatedCustom = [...customItems, newItem];
    setCustomItems(updatedCustom);
    try {
      localStorage.setItem(LOCAL_STORAGE_CUSTOM_KEY, JSON.stringify(updatedCustom));
    } catch (e) {
      console.error('Erro ao salvar item customizado:', e);
    }

    setNewItemName('');
    setNewItemQtd('');
    setShowAddModal(false);
  };

  // Delete custom item
  const handleDeleteCustomItem = (id: string) => {
    const updated = customItems.filter((item) => item.id !== id);
    setCustomItems(updated);
    const updatedChecked = { ...checkedIds };
    delete updatedChecked[id];
    setCheckedIds(updatedChecked);

    try {
      localStorage.setItem(LOCAL_STORAGE_CUSTOM_KEY, JSON.stringify(updated));
      localStorage.setItem(LOCAL_STORAGE_CHECKED_KEY, JSON.stringify(updatedChecked));
    } catch (e) {
      console.error('Erro ao excluir item:', e);
    }
  };

  // Combine default + custom items
  const allItems = [...DEFAULT_SHOPPING_ITEMS, ...customItems];

  // Filter items based on active viewMode and search query
  const filteredItems = allItems.filter((item) => {
    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const nameMatch = item.name.toLowerCase().includes(q);
      const jessicaMatch = item.qtdJessica?.toLowerCase().includes(q);
      const henriqueMatch = item.qtdHenrique?.toLowerCase().includes(q);
      if (!nameMatch && !jessicaMatch && !henriqueMatch) return false;
    }

    // Person view filter
    if (viewMode === 'jessica') {
      return !!item.qtdJessica && item.qtdJessica !== 'Não utiliza no plano principal';
    }
    if (viewMode === 'henrique') {
      return !!item.qtdHenrique && item.qtdHenrique !== 'Não utiliza no plano principal';
    }
    return true;
  });

  // Calculate statistics
  const totalCount = filteredItems.length;
  const completedCount = filteredItems.filter((item) => checkedIds[item.id]).length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="max-w-xl mx-auto px-4 py-6 space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm relative overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className={`w-12 h-12 rounded-2xl ${theme.accentBgLight} flex items-center justify-center`}>
              <ShoppingCart className={`w-6 h-6 ${theme.accentText}`} />
            </div>
            <div>
              <h1 className="text-xl font-display font-black text-slate-800 flex items-center gap-2">
                Lista de Compras
                <span className="text-xs font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                  Semanal
                </span>
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Ingredientes das dietas de Jéssica e Henrique (7 Dias)
              </p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="p-2.5 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            title="Sair"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>

        {/* View Mode Tabs (Casal, Jéssica, Henrique) */}
        <div className="mt-4 pt-3 border-t border-slate-100">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
            Filtrar Visão de Quantidades:
          </label>
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-2xl">
            <button
              onClick={() => setViewMode('casal')}
              className={`py-2 px-2 rounded-xl text-xs font-display font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                viewMode === 'casal'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-indigo-500" />
              <span>Casal</span>
            </button>

            <button
              onClick={() => setViewMode('jessica')}
              className={`py-2 px-2 rounded-xl text-xs font-display font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                viewMode === 'jessica'
                  ? 'bg-rose-500 text-white shadow-sm shadow-rose-200'
                  : 'text-slate-500 hover:text-rose-600'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Jéssica</span>
            </button>

            <button
              onClick={() => setViewMode('henrique')}
              className={`py-2 px-2 rounded-xl text-xs font-display font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                viewMode === 'henrique'
                  ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-200'
                  : 'text-slate-500 hover:text-emerald-600'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Henrique</span>
            </button>
          </div>
        </div>
      </div>

      {/* Progress & Quick Actions Card */}
      <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
              Progresso no Supermercado
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-display font-black text-slate-800">
                {completedCount} <span className="text-slate-400 text-sm font-normal">/ {totalCount} comprados</span>
              </span>
              <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                {progressPercent}%
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleResetChecks}
              className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Desmarcar todos os itens comprados"
            >
              <RotateCcw className="w-4 h-4 text-slate-500" />
              <span className="hidden sm:inline">Resetar</span>
            </button>

            <button
              onClick={() => setShowAddModal(true)}
              className={`px-3.5 py-2.5 rounded-xl font-display font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer ${theme.accentBg}`}
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Item Extra</span>
            </button>
          </div>
        </div>

        {/* Animated Progress Bar */}
        <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden p-0.5 border border-slate-100">
          <motion.div
            className={`h-full rounded-full ${
              progressPercent === 100
                ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                : 'bg-gradient-to-r from-amber-400 to-emerald-500'
            }`}
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar ingrediente ou alimento..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 rounded-2xl text-xs font-medium border border-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Categorized Shopping Items */}
      <div className="space-y-6 pb-8">
        {CATEGORIES.map((cat) => {
          const categoryItems = filteredItems.filter((i) => i.category === cat.id);
          if (categoryItems.length === 0) return null;

          const categoryCompleted = categoryItems.filter((i) => checkedIds[i.id]).length;

          return (
            <div key={cat.id} className="space-y-2.5">
              {/* Category Header */}
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center space-x-2">
                  <span className="text-xl">{cat.emoji}</span>
                  <h2 className="text-sm font-display font-black text-slate-800">
                    {cat.name}
                  </h2>
                </div>
                <span className="text-[11px] font-bold text-slate-400">
                  {categoryCompleted}/{categoryItems.length}
                </span>
              </div>

              {/* Items List */}
              <div className="space-y-2">
                {categoryItems.map((item) => {
                  const isChecked = !!checkedIds[item.id];

                  return (
                    <motion.div
                      key={item.id}
                      layout
                      onClick={() => toggleItem(item.id)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer select-none flex items-start space-x-3 ${
                        isChecked
                          ? 'bg-slate-50/80 border-slate-200/60 opacity-60'
                          : 'bg-white border-slate-100 hover:border-slate-200 shadow-sm'
                      }`}
                    >
                      {/* Checkbox Icon */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleItem(item.id);
                        }}
                        className="mt-0.5 shrink-0 transition-transform active:scale-95 cursor-pointer"
                      >
                        {isChecked ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-100 stroke-[2.5]" />
                        ) : (
                          <Circle className="w-5 h-5 text-slate-300 hover:text-slate-400 stroke-[2]" />
                        )}
                      </button>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`text-sm font-display font-bold leading-snug ${
                              isChecked
                                ? 'line-through text-slate-400'
                                : 'text-slate-800'
                            }`}
                          >
                            {item.name}
                          </span>

                          <span
                            className={`text-xs font-black px-2.5 py-0.5 rounded-lg shrink-0 ${
                              isChecked
                                ? 'bg-slate-200 text-slate-500'
                                : `${cat.colorBg} ${cat.colorText} border ${cat.colorBorder}`
                            }`}
                          >
                            {viewMode === 'jessica' && item.qtdJessica
                              ? item.qtdJessica.split('(')[0].trim()
                              : viewMode === 'henrique' && item.qtdHenrique
                              ? item.qtdHenrique.split('(')[0].trim()
                              : item.qtdTotal}
                          </span>
                        </div>

                        {/* Person Breakdown Details */}
                        <div className="mt-1 space-y-0.5 text-[11px] text-slate-500">
                          {viewMode === 'casal' && (
                            <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1">
                              {item.qtdJessica && (
                                <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md font-medium">
                                  <span className="font-bold">🌸 Jéssica:</span> {item.qtdJessica}
                                </span>
                              )}
                              {item.qtdHenrique && (
                                <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-medium">
                                  <span className="font-bold">🟢 Henrique:</span> {item.qtdHenrique}
                                </span>
                              )}
                            </div>
                          )}

                          {viewMode === 'jessica' && item.qtdJessica && (
                            <p className="text-slate-500 font-medium pt-0.5">
                              {item.qtdJessica}
                            </p>
                          )}

                          {viewMode === 'henrique' && item.qtdHenrique && (
                            <p className="text-slate-500 font-medium pt-0.5">
                              {item.qtdHenrique}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Custom item delete button */}
                      {item.isCustom && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCustomItem(item.id);
                          }}
                          className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
                          title="Remover item customizado"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {filteredItems.length === 0 && (
          <div className="text-center py-12 bg-white rounded-3xl border border-slate-100 p-6 space-y-3">
            <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-400">
              <ShoppingCart className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-display font-bold text-slate-700">
              Nenhum ingrediente encontrado
            </h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Tente alterar os termos de busca ou mude a visão entre Casal, Jéssica e Henrique.
            </p>
          </div>
        )}
      </div>

      {/* Add Custom Item Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 w-full max-w-md shadow-xl border border-slate-100 space-y-4"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <div className={`p-2 rounded-xl ${theme.accentBgLight}`}>
                    <Plus className={`w-5 h-5 ${theme.accentText}`} />
                  </div>
                  <h3 className="text-base font-display font-black text-slate-800">
                    Adicionar Item à Lista
                  </h3>
                </div>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddCustomItem} className="space-y-3.5">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase block mb-1">
                    Nome do Item / Alimento
                  </label>
                  <input
                    type="text"
                    required
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    placeholder="Ex: Azeite de Oliva, Adoçante, Papel Toalha..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl text-xs font-semibold border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">
                      Quantidade / Obs
                    </label>
                    <input
                      type="text"
                      required
                      value={newItemQtd}
                      onChange={(e) => setNewItemQtd(e.target.value)}
                      placeholder="Ex: 1 garrafa, 500g..."
                      className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl text-xs font-semibold border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">
                      Para Quem?
                    </label>
                    <select
                      value={newItemPerson}
                      onChange={(e: any) => setNewItemPerson(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 rounded-xl text-xs font-semibold border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    >
                      <option value="casal">👫 Casal (Ambos)</option>
                      <option value="jessica">🌸 Apenas Jéssica</option>
                      <option value="henrique">🟢 Apenas Henrique</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase block mb-1">
                    Categoria
                  </label>
                  <select
                    value={newItemCategory}
                    onChange={(e: any) => setNewItemCategory(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 rounded-xl text-xs font-semibold border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.emoji} {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2.5 rounded-xl font-bold text-xs text-slate-500 hover:bg-slate-100"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className={`px-5 py-2.5 rounded-xl font-display font-bold text-xs shadow-sm cursor-pointer ${theme.accentBg}`}
                  >
                    Salvar Item
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
