import React, { useState } from 'react';
import Button from './Button';

interface ComplaintModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (message: string) => void;
}

const ComplaintModal: React.FC<ComplaintModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!message.trim()) {
      alert("Veuillez entrer le message de votre réclamation.");
      return;
    }
    setIsSubmitting(true);
    // Simulate a small delay for user feedback
    setTimeout(() => {
        onSubmit(message);
        setIsSubmitting(false);
        setMessage(''); // Clear message on successful submit
    }, 500);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-[60] p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <header className="p-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Faire une réclamation</h3>
        </header>
        <main className="p-6">
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            Un problème ? Décrivez-le ici. Votre message sera envoyé directement à un administrateur.
          </p>
          <textarea
            rows={8}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Décrivez votre problème en détail..."
            className="w-full shadow-sm sm:text-sm border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-md"
            disabled={isSubmitting}
          />
        </main>
        <footer className="flex justify-end space-x-3 p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 rounded-b-lg">
          <Button onClick={onClose} variant="secondary" disabled={isSubmitting}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !message.trim()}>
            {isSubmitting ? 'Envoi...' : 'Envoyer'}
          </Button>
        </footer>
      </div>
    </div>
  );
};

export default ComplaintModal;
