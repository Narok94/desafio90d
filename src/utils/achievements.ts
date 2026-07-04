import { Medida, FotoProgresso } from '../types';

export interface Badge {
  id: string;
  day: number;
  title: string;
  description: string;
  unlocked: boolean;
  unlockedDate?: string;
  emoji: string;
  color: string;
  borderColor: string;
  bgColor: string;
}

const parseDate = (dateStr: string) => {
  const parts = dateStr.split('-');
  return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
};

const addDays = (dateStr: string, days: number): string => {
  const d = parseDate(dateStr);
  d.setDate(d.getDate() + days);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export function getBadges(medidas: Medida[], fotos: FotoProgresso[], startChallengeDate: string): Badge[] {
  if (!startChallengeDate) return [];

  const milestones = [
    {
      id: 'badge-30',
      day: 30,
      title: 'Guerreiro do Dia 30',
      description: 'Superou os primeiros 30 dias de foco e registrou fotos e medidas completas!',
      emoji: '🥉',
      color: 'text-amber-700 bg-amber-50 border-amber-200 shadow-amber-100',
      borderColor: 'border-amber-200',
      bgColor: 'bg-amber-50/50'
    },
    {
      id: 'badge-60',
      day: 60,
      title: 'Inabalável do Dia 60',
      description: 'Superou os 60 dias! Mantendo a disciplina com novas fotos e medidas registradas.',
      emoji: '🥈',
      color: 'text-slate-700 bg-slate-100 border-slate-300 shadow-slate-100',
      borderColor: 'border-slate-300',
      bgColor: 'bg-slate-100/50'
    },
    {
      id: 'badge-90',
      day: 90,
      title: 'Lenda do Desafio 90',
      description: 'Glória e consagração! Finalizou a jornada com fotos e medidas na linha de chegada.',
      emoji: '🥇',
      color: 'text-orange-600 bg-orange-50 border-orange-200 shadow-orange-100',
      borderColor: 'border-orange-200',
      bgColor: 'bg-orange-50/50'
    }
  ];

  return milestones.map(m => {
    const mDateStart = addDays(startChallengeDate, m.day);
    const mDateEnd = addDays(mDateStart, 3);

    // Find any measurement in range [m.day, m.day + 3]
    const matchingMedida = medidas.find(med => med.data >= mDateStart && med.data <= mDateEnd);
    // Find any photo in range [m.day, m.day + 3]
    const matchingFoto = fotos.find(f => f.data >= mDateStart && f.data <= mDateEnd);

    const unlocked = !!matchingMedida && !!matchingFoto;
    
    let unlockedDate: string | undefined;
    if (unlocked && matchingMedida && matchingFoto) {
      unlockedDate = matchingMedida.data > matchingFoto.data ? matchingMedida.data : matchingFoto.data;
    }

    return {
      ...m,
      unlocked,
      unlockedDate
    };
  });
}
