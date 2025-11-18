import React, { useState, useEffect, useMemo } from 'react';
import { User, Form, FormResponse, MedicalField, TransactionType } from '../types';
import Card from '../components/Card';
import Button from '../components/Button';
import StudentManagementModal from '../components/StudentManagementModal';
import ConfirmationModal, { ConfirmationModalProps } from '../components/ConfirmationModal';
import ArrowUpIcon from '../components/icons/ArrowUpIcon';
import ArrowDownIcon from '../components/icons/ArrowDownIcon';
import UnsortedIcon from '../components/icons/UnsortedIcon';


interface StudentsProps {
  users: User[];
  forms: Form[];
  responses: FormResponse[];
  onSendNotification: (userId: string, message: string, showAlert?: boolean) => void;
  onUpdateUserStatus: (userId: string, status: User['status']) => void;
  onAdminCoinAdjustment: (userId: string, amount: number, type: TransactionType) => void;
}

const translateField = (field: MedicalField) => {
  switch (field) {
    case MedicalField.Medicine: return 'Médecine';
    case MedicalField.Pharmacy: return 'Pharmacie';
    case MedicalField.Dentistry: return 'Dentaire';
    default: return field;
  }
};

const getStatusInfo = (status: User['status']) => {
    switch (status) {
        case 'active':
            return { text: 'Actif', className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' };
        case 'suspended_payment':
            return { text: 'Suspendu (Paiement)', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' };
        case 'suspended_manual':
            return { text: 'Suspendu (Admin)', className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' };
        default:
            return { text: 'Inconnu', className: 'bg-slate-100 text-slate-800' };
    }
};

const Students: React.FC<StudentsProps> = ({ users, forms, responses, onSendNotification, onUpdateUserStatus, onAdminCoinAdjustment }) => {
  const [filters, setFilters] = useState({ name: '', university: '', field: '', studyYear: '' });
  const [selectedStudent, setSelectedStudent] = useState<User | null>(null);
  const [isNotifyAllModalOpen, setIsNotifyAllModalOpen] = useState(false);
  const [notifyAllMessage, setNotifyAllMessage] = useState('');
  const [confirmation, setConfirmation] = useState<ConfirmationModalProps | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: keyof User; direction: 'ascending' | 'descending' }>({ key: 'name', direction: 'ascending' });

  useEffect(() => {
    // If a student is selected and the main users list updates,
    // find the updated student object and update our state to ensure the modal has the latest data.
    if (selectedStudent) {
      const updatedStudent = users.find(u => u.id === selectedStudent.id);
      if (updatedStudent) {
        setSelectedStudent(updatedStudent);
      } else {
        // If the student is no longer in the list, close the modal.
        setSelectedStudent(null);
      }
    }
  }, [users]);


  const students = users.filter(u => u.role === 'student');

  const filteredStudents = useMemo(() => students.filter(student => {
    return (
      student.name.toLowerCase().includes(filters.name.toLowerCase()) &&
      student.university.toLowerCase().includes(filters.university.toLowerCase()) &&
      (filters.field === '' || student.field === filters.field) &&
      (filters.studyYear === '' || student.studyYear.toString() === filters.studyYear)
    );
  }), [students, filters]);

  const sortedStudents = useMemo(() => {
    let sortableStudents = [...filteredStudents];
    if (sortConfig) {
        sortableStudents.sort((a, b) => {
            const key = sortConfig.key;
            const aValue = a[key];
            const bValue = b[key];

            let comparison = 0;
            if (typeof aValue === 'number' && typeof bValue === 'number') {
                comparison = aValue - bValue;
            } else {
                comparison = String(aValue).localeCompare(String(bValue));
            }
            
            return sortConfig.direction === 'ascending' ? comparison : -comparison;
        });
    }
    return sortableStudents;
  }, [filteredStudents, sortConfig]);

  const requestSort = (key: keyof User) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
        direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };
  
  const handleSendToAll = () => {
    if (!notifyAllMessage.trim()) {
      alert("Le message ne peut pas être vide.");
      return;
    }

    const studentCount = students.length;
    setConfirmation({
        isOpen: true,
        title: "Confirmer l'envoi groupé",
        message: `Êtes-vous sûr de vouloir envoyer cette notification à ${studentCount} étudiant(s) ?`,
        onConfirm: () => {
            students.forEach(student => {
                onSendNotification(student.id, notifyAllMessage, false);
            });
            alert(`${studentCount} notification(s) envoyée(s) avec succès.`);
            setNotifyAllMessage('');
            setIsNotifyAllModalOpen(false);
            setConfirmation(null);
        },
        onClose: () => setConfirmation(null),
        variant: 'primary',
        confirmText: 'Envoyer à tous'
    });
  };
  
  const SortableHeader: React.FC<{ label: string; sortKey: keyof User; }> = ({ label, sortKey }) => {
    const isSorted = sortConfig.key === sortKey;
    return (
        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
            <button onClick={() => requestSort(sortKey)} className="group inline-flex items-center">
                {label}
                <span className="ml-2 flex-none rounded text-slate-400">
                    {isSorted ? (
                        sortConfig.direction === 'ascending' ? <ArrowUpIcon className="h-4 w-4" /> : <ArrowDownIcon className="h-4 w-4" />
                    ) : (
                        <UnsortedIcon className="h-4 w-4 text-slate-300 dark:text-slate-500 group-hover:text-slate-500 dark:group-hover:text-slate-400" />
                    )}
                </span>
            </button>
        </th>
    );
  };

  const inputClasses = "block w-full shadow-sm sm:text-sm border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-md";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">Gestion des Étudiants</h2>
        <Button onClick={() => setIsNotifyAllModalOpen(true)} className="w-full sm:w-auto">Envoyer une notification à tous</Button>
      </div>

      <Card title="Filtres">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <input name="name" value={filters.name} onChange={handleFilterChange} placeholder="Filtrer par nom..." className={inputClasses}/>
          <input name="university" value={filters.university} onChange={handleFilterChange} placeholder="Filtrer par université..." className={inputClasses}/>
          <select name="field" value={filters.field} onChange={handleFilterChange} className={inputClasses}>
            <option value="">Toutes les filières</option>
            <option value={MedicalField.Medicine}>Médecine</option>
            <option value={MedicalField.Pharmacy}>Pharmacie</option>
            <option value={MedicalField.Dentistry}>Dentaire</option>
          </select>
          <input name="studyYear" type="number" value={filters.studyYear} onChange={handleFilterChange} placeholder="Filtrer par année..." className={inputClasses}/>
        </div>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
            <thead className="bg-slate-50 dark:bg-slate-700">
              <tr>
                <SortableHeader label="Nom" sortKey="name" />
                <SortableHeader label="Filière" sortKey="field" />
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Téléphone</th>
                <SortableHeader label="Solde Coins" sortKey="coinBalance" />
                <SortableHeader label="Statut" sortKey="status" />
                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
              {sortedStudents.map(student => {
                  const statusInfo = getStatusInfo(student.status);
                  return (
                    <tr key={student.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-slate-900 dark:text-white">{student.name}</div>
                        <div className="text-sm text-slate-500 dark:text-slate-400">{student.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{translateField(student.field)} ({student.studyYear}e année)</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{student.phoneNumber}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-slate-500 dark:text-slate-400">{student.coinBalance.toLocaleString()}</td>
                       <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusInfo.className}`}>
                          {statusInfo.text}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Button onClick={() => setSelectedStudent(student)} variant="secondary" className="!py-1 !px-3">Gérer</Button>
                      </td>
                    </tr>
                  )
              })}
            </tbody>
          </table>
        </div>
         {sortedStudents.length === 0 && (
            <div className="text-center py-12">
                <p className="text-slate-500 dark:text-slate-400">Aucun étudiant ne correspond aux filtres.</p>
            </div>
        )}
      </Card>
      
      {selectedStudent && (
        <StudentManagementModal
          student={selectedStudent}
          forms={forms.filter(f => f.userId === selectedStudent.id)}
          responses={responses.filter(r => forms.some(f => f.userId === selectedStudent.id && f.id === r.formId))}
          onClose={() => setSelectedStudent(null)}
          onSendNotification={onSendNotification}
          onUpdateUserStatus={onUpdateUserStatus}
          onAdminCoinAdjustment={onAdminCoinAdjustment}
        />
      )}

      {isNotifyAllModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-[60] p-4" onClick={() => setIsNotifyAllModalOpen(false)}>
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b border-slate-200 dark:border-slate-700">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Envoyer une notification groupée</h3>
                </header>
                <main className="p-6">
                    <textarea 
                        rows={5}
                        value={notifyAllMessage}
                        onChange={(e) => setNotifyAllMessage(e.target.value)}
                        placeholder="Votre message ici..."
                        className="w-full shadow-sm sm:text-sm border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-md"
                    />
                </main>
                <footer className="flex justify-end space-x-3 p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 rounded-b-lg">
                    <Button onClick={() => setIsNotifyAllModalOpen(false)} variant="secondary">Annuler</Button>
                    <Button onClick={handleSendToAll} disabled={!notifyAllMessage.trim()}>Envoyer</Button>
                </footer>
            </div>
        </div>
      )}

      {confirmation && <ConfirmationModal {...confirmation} />}
    </div>
  );
};

export default Students;
