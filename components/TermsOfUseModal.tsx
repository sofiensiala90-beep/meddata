import React from 'react';
import Button from './Button';

interface TermsOfUseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TermsOfUseModal: React.FC<TermsOfUseModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-[100] p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <header className="p-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Conditions d’utilisation – MedataAI</h3>
        </header>
        <main className="p-6 space-y-4 overflow-y-auto">
          <h4 className="font-bold text-slate-800 dark:text-slate-200">1. Utilisation responsable</h4>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Vous vous engagez à utiliser MedataAI uniquement à des fins pédagogiques et scientifiques. Toute utilisation abusive, frauduleuse ou contraire à l’éthique médicale est strictement interdite.
          </p>

          <h4 className="font-bold text-slate-800 dark:text-slate-200">2. Propriété intellectuelle</h4>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Les formulaires, analyses et contenus générés par l’IA sont protégés par les droits de propriété intellectuelle. Vous ne pouvez pas revendre, redistribuer ou reproduire tout ou partie du contenu de MedataAI sans autorisation écrite préalable.
          </p>

          <h4 className="font-bold text-slate-800 dark:text-slate-200">3. Monnaie virtuelle (Coins)</h4>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Les actions payantes (création, publication, analyse, etc.) sont déduites de votre solde de coins. Un frais mensuel fixe de 50 coins est automatiquement prélevé tous les 30 jours à partir de la date de création du compte. Ce frais permet de maintenir votre accès aux services et au stockage de vos formulaires. Toutes les transactions de coins sont définitives et non remboursables.
          </p>

          <h4 className="font-bold text-slate-800 dark:text-slate-200">4. Comportement et respect</h4>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Tout comportement inapproprié, contenu offensant ou tentative de piratage entraînera la suspension immédiate du compte, sans préavis.
          </p>

          <h4 className="font-bold text-slate-800 dark:text-slate-200">5. Protection et utilisation des données</h4>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Les informations saisies dans vos formulaires ou partagées sur la plateforme sont stockées de manière sécurisée et chiffrée.
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            MedataAI peut utiliser les données des formulaires à des fins statistiques, de recherche, d’amélioration des services ou de développement scientifique.
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Toutes les données utilisées à ces fins sont entièrement anonymisées : aucune information ne permet d’identifier un utilisateur, un patient ou une institution.
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            MedataAI peut regrouper, analyser et commercialiser ces données statistiques anonymisées auprès de partenaires académiques, industriels ou institutionnels, dans le strict respect de l’anonymat et des réglementations en vigueur.
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Les analyses générées par les utilisateurs à partir de leurs propres formulaires restent leur propriété exclusive et ne seront jamais exploitées par MedataAI sans accord explicite.
          </p>

          <h4 className="font-bold text-slate-800 dark:text-slate-200">6. Évolution du service</h4>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            MedataAI se réserve le droit de modifier ses fonctionnalités, ses tarifs ou ses conditions d’utilisation à tout moment. Les utilisateurs seront notifiés de tout changement majeur affectant leurs droits ou leur expérience.
          </p>

          <h4 className="font-bold text-slate-800 dark:text-slate-200">7. Acceptation des conditions</h4>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            L’inscription et l’utilisation de la plateforme impliquent l’acceptation pleine et entière des présentes conditions d’utilisation.
          </p>
        </main>
        <footer className="flex justify-end space-x-3 p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 rounded-b-lg">
          <Button onClick={onClose}>Fermer</Button>
        </footer>
      </div>
    </div>
  );
};

export default TermsOfUseModal;