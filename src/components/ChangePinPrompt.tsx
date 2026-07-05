import React, { useState } from 'react';
import { api, saveUsuario, getSavedUsuario } from '../api';
import { Usuario } from '../types';
import { Lock, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ChangePinPromptProps {
  usuario: Usuario;
  onSuccess: () => void;
  onSkip: () => void;
}

export default function ChangePinPrompt({ usuario, onSuccess, onSkip }: ChangePinPromptProps) {
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);

  const handleKeyPress = (num: string) => {
    setError('');
    const maxLen = 4;
    
    if (step === 1) {
      if (newPin.length < maxLen) {
        setNewPin(prev => prev + num);
      }
    } else {
      if (confirmPin.length < maxLen) {
        setConfirmPin(prev => prev + num);
      }
    }
  };

  const handleDelete = () => {
    if (step === 1) {
      setNewPin(prev => prev.slice(0, -1));
    } else {
      setConfirmPin(prev => prev.slice(0, -1));
    }
  };

  const handleClear = () => {
    if (step === 1) {
      setNewPin('');
    } else {
      setConfirmPin('');
    }
  };

  const handleContinue = () => {
    if (step === 1) {
      if (newPin.length !== 4) {
        setError('O PIN deve ter 4 dígitos');
        return;
      }
      setStep(2);
    } else {
      if (confirmPin.length !== 4) {
        setError('Confirme com 4 dígitos');
        return;
      }
      if (newPin !== confirmPin) {
        setError('Os PINs não conferem');
        setConfirmPin('');
        return;
      }
      submitChange();
    }
  };

  const submitChange = async () => {
    setLoading(true);
    setError('');
    try {
      await api.changePin(newPin);
      // Update local storage so it doesn't prompt again
      const currentSession = getSavedUsuario();
      if (currentSession) {
        currentSession.senha_alterada = true;
        saveUsuario(currentSession);
      }
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Erro ao alterar PIN');
      setConfirmPin('');
      setStep(1);
      setNewPin('');
    } finally {
      setLoading(false);
    }
  };

  const currentVal = step === 1 ? newPin : confirmPin;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-slate-100 flex flex-col items-center relative overflow-hidden"
      >
        <button
          onClick={onSkip}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-14 h-14 bg-indigo-50 rounded-full flex items-center justify-center mb-4">
          <Lock className="w-6 h-6 text-indigo-500" />
        </div>

        <h3 className="text-xl font-display font-bold text-slate-900 text-center mb-1">
          {step === 1 ? 'Crie seu novo PIN' : 'Confirme seu novo PIN'}
        </h3>
        <p className="text-xs text-slate-500 text-center mb-6">
          {step === 1 ? 'Como é o seu primeiro acesso, sugerimos criar uma nova senha.' : 'Digite o PIN novamente para confirmar.'}
        </p>

        {/* Visual indicators */}
        <div className="flex space-x-3 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
                i < currentVal.length
                  ? 'bg-indigo-500 border-indigo-500 scale-110 shadow-sm shadow-indigo-200'
                  : 'border-slate-300'
              }`}
            />
          ))}
        </div>

        {/* Error / Loading space */}
        <div className="h-6 mb-2">
          {error && (
            <span className="text-xs font-semibold text-rose-500 text-center block animate-bounce">
              {error}
            </span>
          )}
          {loading && (
            <span className="text-xs font-semibold text-slate-400 text-center block animate-pulse">
              Salvando...
            </span>
          )}
        </div>

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-[260px] mb-4">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
            <button
              key={num}
              disabled={loading}
              onClick={() => handleKeyPress(num)}
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 font-display font-extrabold text-xl text-slate-800 flex items-center justify-center cursor-pointer transition-all active:scale-90 mx-auto"
            >
              {num}
            </button>
          ))}
          <button
            disabled={loading}
            onClick={handleClear}
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl font-display font-bold text-[10px] text-slate-400 flex items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors mx-auto"
          >
            LIMPAR
          </button>
          <button
            disabled={loading}
            onClick={() => handleKeyPress('0')}
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 font-display font-extrabold text-xl text-slate-800 flex items-center justify-center cursor-pointer transition-all active:scale-90 mx-auto"
          >
            0
          </button>
          <button
            disabled={loading}
            onClick={handleDelete}
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl font-display font-bold text-slate-600 flex items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors mx-auto"
          >
            ⌫
          </button>
        </div>

        {/* Continue Button */}
        <button
          onClick={handleContinue}
          disabled={currentVal.length !== 4 || loading}
          className="w-full max-w-[260px] py-3 rounded-xl font-bold text-sm bg-indigo-500 hover:bg-indigo-600 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md shadow-indigo-200"
        >
          {step === 1 ? 'Continuar' : (
            <>
              <Check className="w-4 h-4" />
              <span>Confirmar Troca</span>
            </>
          )}
        </button>

      </motion.div>
    </div>
  );
}
