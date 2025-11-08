

import React, { useState } from 'react';
import { User, MedicalField } from '../types';
import Card from '../components/Card';
import Button from '../components/Button';

interface ProfileProps {
  user: User;
  onUpdateProfile: (updatedUser: User) => void;
}

// Helper to translate field enum to French
const translateField = (field: MedicalField) => {
  switch (field) {
    case MedicalField.Medicine: return 'Médecine';
    case MedicalField.Pharmacy: return 'Pharmacie';
    case MedicalField.Dentistry: return 'Dentaire';
    default: return field;
  }
};

const Profile: React.FC<ProfileProps> = ({ user, onUpdateProfile }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<User>(user);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    setFormData(prev => ({ ...prev, studyYear: isNaN(value) ? 0 : value }));
  };

  const handleSave = () => {
    onUpdateProfile(formData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setFormData(user);
    setIsEditing(false);
  };

  const renderField = (label: string, value: string | number) => (
    <div>
      <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="mt-1 text-sm text-slate-900 dark:text-white">{value}</dd>
    </div>
  );
  
  const renderEditableField = (label: string, name: keyof User, type = 'text') => {
      const value = formData[name];
      return (
         <div>
          <label htmlFor={name as string} className="block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
          <input
            type={type}
            name={name as string}
            id={name as string}
            // FIX: Ensure value is a string for the input element to prevent type errors.
            value={String(value != null ? value : '')}
            onChange={name === 'studyYear' ? handleYearChange : handleInputChange}
            className="mt-1 block w-full shadow-sm sm:text-sm border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-md"
          />
        </div>
      );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Mon Profil</h2>
        {!isEditing && <Button onClick={() => setIsEditing(true)}>Modifier le profil</Button>}
      </div>

      <Card>
        {!isEditing ? (
          <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
            {renderField("Nom complet", user.name)}
            {renderField("Adresse e-mail", user.email)}
            {renderField("Université (Faculté)", user.university)}
            {renderField("Filière", translateField(user.field))}
            {renderField("Année d'étude", user.studyYear)}
            {renderField("Numéro de téléphone", user.phoneNumber)}
          </dl>
        ) : (
          <div className="space-y-4">
            {renderEditableField("Nom complet", "name")}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Adresse e-mail</label>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{user.email} (non modifiable)</p>
            </div>
            {renderEditableField("Université (Faculté)", "university")}
            <div>
              <label htmlFor="field" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Filière</label>
              <select
                id="field"
                name="field"
                value={formData.field}
                onChange={handleInputChange}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
              >
                <option value={MedicalField.Medicine}>Médecine</option>
                <option value={MedicalField.Pharmacy}>Pharmacie</option>
                <option value={MedicalField.Dentistry}>Dentaire</option>
              </select>
            </div>
             {renderEditableField("Année d'étude", "studyYear", "number")}
             {renderEditableField("Numéro de téléphone", "phoneNumber")}

            <div className="flex justify-end space-x-4 pt-4">
              <Button onClick={handleCancel} variant="secondary">Annuler</Button>
              <Button onClick={handleSave}>Enregistrer</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default Profile;