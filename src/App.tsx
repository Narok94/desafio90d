import { useState, useEffect } from 'react';
import { Usuario, CheckDiario, Medida, FotoProgresso } from './types';
import { api, getSavedUsuario, clearSession } from './api';
import LoginView from './components/LoginView';
import HojeView from './components/HojeView';
import DietaView from './components/DietaView';
import ComprasView from './components/ComprasView';
import ProgressoView from './components/ProgressoView';
import HistoricoView from './components/HistoricoView';
import AdminView from './components/AdminView';
import BottomNav, { TabType } from './components/BottomNav';
import ChangePinPrompt from './components/ChangePinPrompt';

export default function App() {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('hoje');
  const [checks, setChecks] = useState<CheckDiario[]>([]);
  const [medidas, setMedidas] = useState<Medida[]>([]);
  const [fotos, setFotos] = useState<FotoProgresso[]>([]);
  const [loadingFotos, setLoadingFotos] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [showPinPrompt, setShowPinPrompt] = useState<boolean>(false);

  // Load session on startup
  useEffect(() => {
    const saved = getSavedUsuario();
    if (saved) {
      setUsuario(saved);
      if (saved.senha_alterada === false) {
        setShowPinPrompt(true);
      }
    }
    setLoading(false);

    // Event listener for unauthorized token expirations
    const handleAuthExpired = () => {
      setUsuario(null);
      setChecks([]);
      setMedidas([]);
      setFotos([]);
    };

    window.addEventListener('auth-expired', handleAuthExpired);
    return () => {
      window.removeEventListener('auth-expired', handleAuthExpired);
    };
  }, []);

  // Fetch participant-specific data
  const loadParticipantData = async () => {
    if (!usuario || usuario.papel !== 'participante') return;
    setLoadingFotos(true);
    try {
      const [checksData, medidasData, fotosData] = await Promise.all([
        api.getChecks(),
        api.getMedidas(),
        api.getFotosProgresso()
      ]);
      setChecks(checksData);
      setMedidas(medidasData);
      setFotos(fotosData);
    } catch (err) {
      console.error('Erro ao carregar dados do participante:', err);
    } finally {
      setLoadingFotos(false);
    }
  };

  useEffect(() => {
    if (usuario && usuario.papel === 'participante') {
      loadParticipantData();
    }
  }, [usuario]);

  const handleLoginSuccess = (user: Usuario) => {
    setUsuario(user);
    setActiveTab('hoje');
    if (user.senha_alterada === false) {
      setShowPinPrompt(true);
    }
  };

  const handleLogout = () => {
    clearSession();
    setUsuario(null);
    setChecks([]);
    setMedidas([]);
    setFotos([]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-slate-400">Carregando Desafio 90...</p>
        </div>
      </div>
    );
  }

  // 1. If not authenticated, show Login view
  if (!usuario) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  // 2. If Administrator, show the Admin Dashboard view
  if (usuario.papel === 'admin') {
    return (
      <>
        <AdminView usuario={usuario} onLogout={handleLogout} />
        {showPinPrompt && (
          <ChangePinPrompt
            usuario={usuario}
            onSuccess={() => setShowPinPrompt(false)}
            onSkip={() => setShowPinPrompt(false)}
          />
        )}
      </>
    );
  }

  // 3. If Participant, show the active Tab with the Bottom Navigation
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {showPinPrompt && (
        <ChangePinPrompt
          usuario={usuario}
          onSuccess={() => setShowPinPrompt(false)}
          onSkip={() => setShowPinPrompt(false)}
        />
      )}
      
      {/* Tab Switcher Panel */}
      <main className="w-full pb-[calc(100px+env(safe-area-inset-bottom))] pt-[env(safe-area-inset-top)]">
        {activeTab === 'hoje' && (
          <HojeView
            usuario={usuario}
            onLogout={handleLogout}
            checks={checks}
            medidas={medidas}
            fotos={fotos}
            onRefreshChecks={loadParticipantData}
          />
        )}

        {activeTab === 'dieta' && (
          <DietaView
            usuario={usuario}
            onLogout={handleLogout}
          />
        )}

        {activeTab === 'compras' && (
          <ComprasView
            usuario={usuario}
            onLogout={handleLogout}
          />
        )}

        {activeTab === 'progresso' && (
          <ProgressoView
            usuario={usuario}
            medidas={medidas}
            fotos={fotos}
            loadingFotos={loadingFotos}
            onRefreshMedidas={loadParticipantData}
          />
        )}

        {activeTab === 'historico' && (
          <HistoricoView
            usuario={usuario}
            checks={checks}
          />
        )}
      </main>

      {/* Floating Bottom Navigation */}
      <BottomNav
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        accentColor={usuario.cor_identidade}
      />
    </div>
  );
}
