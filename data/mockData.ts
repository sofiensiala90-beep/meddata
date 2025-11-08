import { User, Form, FormResponse, Transaction, Notification, MedicalField, TransactionReason, TransactionType, AnalysisHistory, PurchasedForm } from '../types';

export const mockUsers: User[] = [
  {
    id: 'user-1',
    name: 'Alice Dubois',
    email: 'alice.dubois@example.com',
    role: 'student',
    coinBalance: 500,
    university: 'Université de Paris',
    field: MedicalField.Medicine,
    studyYear: 3,
    phoneNumber: '0612345678',
    createdAt: new Date('2025-10-01T09:00:00Z').toISOString(),
    status: 'active',
  },
  {
    id: 'user-2',
    name: 'Dr. Bernard Admin',
    email: 'bernard.admin@example.com',
    role: 'admin',
    coinBalance: Infinity,
    university: 'Administration MedataAI',
    field: MedicalField.Medicine,
    studyYear: 10,
    phoneNumber: '0123456789',
    createdAt: new Date('2022-12-01T10:00:00Z').toISOString(),
    status: 'active',
  },
  {
    id: 'user-3',
    name: 'Chloé Martin',
    email: 'chloe.martin@example.com',
    role: 'student',
    coinBalance: 25,
    university: 'Université de Lyon',
    field: MedicalField.Pharmacy,
    studyYear: 4,
    phoneNumber: '0687654321',
    createdAt: new Date('2023-02-20T11:30:00Z').toISOString(),
    status: 'suspended_payment',
  },
  {
    id: 'user-4',
    name: 'David Garcia',
    email: 'david.garcia@example.com',
    role: 'student',
    coinBalance: 500,
    university: 'Université de Marseille',
    field: MedicalField.Dentistry,
    studyYear: 5,
    phoneNumber: '0712345678',
    createdAt: new Date('2023-03-10T14:00:00Z').toISOString(),
    status: 'suspended_manual',
  },
   {
    id: 'user-5',
    name: 'Eva Moreau',
    email: 'eva.moreau@example.com',
    role: 'student',
    coinBalance: 88,
    university: 'Université de Lyon',
    field: MedicalField.Medicine,
    studyYear: 2,
    phoneNumber: '0787654321',
    createdAt: new Date('2023-09-01T08:00:00Z').toISOString(),
    status: 'active',
  },
];

export const mockForms: Form[] = [
  {
    id: 'form-1',
    userId: 'user-1',
    title: 'Étude sur les symptômes du diabète de type 2',
    description: 'Ce formulaire vise à collecter des données sur les symptômes courants chez les patients atteints de diabète de type 2.',
    schema: [
      { id: 'q1', label: 'Âge', type: 'number' },
      { id: 'q2', label: 'Sexe', type: 'choice', options: ['Homme', 'Femme', 'Autre'] },
      { id: 'q3', label: 'Symptômes fréquents', type: 'checkbox', options: ['Fatigue', 'Soif excessive', 'Mictions fréquentes', 'Vision floue'] },
      { id: 'q4', label: 'Depuis quand ressentez-vous ces symptômes ?', type: 'choice', options: ['Moins d\'un mois', '1 à 6 mois', 'Plus de 6 mois'] },
      { id: 'note1', label: 'Merci pour votre participation.', type: 'note' },
    ],
    validated: true,
    createdAt: new Date('2023-10-01T10:00:00Z').toISOString(),
    isPublic: true,
    price: 200,
    pricePerResponse: 4,
    origin: 'created',
  },
  {
    id: 'form-2',
    userId: 'user-1',
    title: 'Suivi post-opératoire (Brouillon)',
    description: 'Formulaire de suivi pour les patients après une opération chirurgicale.',
    schema: [
        { id: 'q1', label: 'Date de l\'opération', type: 'date' },
        { id: 'q2', label: 'Niveau de douleur (0 à 10)', type: 'number' },
    ],
    validated: false,
    createdAt: new Date('2023-10-05T15:00:00Z').toISOString(),
    isPublic: false,
    price: 0,
    pricePerResponse: 0,
    origin: 'created',
  },
  {
    id: 'form-3',
    userId: 'user-4',
    title: 'Analyse des habitudes de brossage',
    description: 'Enquête sur les habitudes d\'hygiène bucco-dentaire.',
    schema: [
        { id: 'f3q1', label: 'Combien de fois par jour vous brossez-vous les dents ?', type: 'choice', options: ['1', '2', '3', 'Plus de 3'] },
        { id: 'f3q2', label: 'Utilisez-vous du fil dentaire ?', type: 'choice', options: ['Oui', 'Non'] },
        { id: 'f3q3', label: 'Si oui, à quelle fréquence ?', type: 'choice', options: ['Quotidiennement', 'Quelques fois par semaine', 'Rarement'], condition: { sourceFieldId: 'f3q2', sourceFieldValue: 'Oui' } },
    ],
    validated: true,
    createdAt: new Date('2023-09-15T12:00:00Z').toISOString(),
    isPublic: false,
    price: 0,
    pricePerResponse: 0,
    origin: 'created',
  },
  {
    id: 'form-sahar-1',
    userId: 'user-1',
    title: 'Formulaire Sahar',
    description: 'Formulaire de suivi néonatal détaillé.',
    validated: true,
    createdAt: new Date().toISOString(),
    isPublic: false,
    price: 0,
    pricePerResponse: 0,
    origin: 'created',
    schema: [
      { id: 'sahar-nom', label: 'Nom', type: 'text' },
      { id: 'sahar-prenom', label: 'Prénom', type: 'text' },
      { id: 'sahar-dossier', label: 'N°dossier', type: 'text' },
      { id: 'sahar-annee', label: 'Année', type: 'number' },
      { id: 'sahar-tel-parent', label: 'Téléphone du parent', type: 'text' },
      { id: 'sahar-note-1', label: 'I. Données socio-démographiques :', type: 'note' },
      { id: 'sahar-sexe', label: 'Sexe', type: 'choice', options: ['Masculin', 'Féminin', 'Ambigüité sexuelle'] },
      { id: 'sahar-dob', label: 'Date de naissance', type: 'date' },
      { id: 'sahar-lieu-accouchement', label: 'Lieu d’ accouchement', type: 'choice', options: ['In Born', 'Out Born (transporté)'] },
      { id: 'sahar-milieu', label: 'Milieu', type: 'choice', options: ['rural', 'urbain'] },
      { id: 'sahar-nse', label: 'Niveau socio-économique', type: 'choice', options: ['bas<SMIG', 'moyen(1-2fois SMIG)', 'élevé'] },
      { id: 'sahar-distance', label: 'Distance entre le domicile et le centre de néonatologie', type: 'choice', options: ['Indéterminée', '< 10 Km', 'Entre 10 et 50 Km', 'Entre 50 et 100 Km', '> 100 Km'] },
      { id: 'sahar-instruction-pere', label: 'Niveau d’instruction du père', type: 'choice', options: ['Analphabète', 'primaire', 'secondaire', 'supérieur'] },
      { id: 'sahar-age-pere', label: 'Age du père', type: 'number' },
      { id: 'sahar-profession-pere', label: 'Profession du père', type: 'choice', options: ['Néant', 'journalier', 'Ouvrier avec salaire fixe', 'employé avec salaire fixe', 'entrepreneur/libéral', 'Cadre supérieur'] },
      { id: 'sahar-instruction-mere', label: 'Niveau d’instruction de la mère', type: 'choice', options: ['Analphabète', 'primaire', 'secondaire', 'supérieur'] },
      { id: 'sahar-age-mere', label: 'Age de la mère', type: 'number' },
      { id: 'sahar-profession-mere', label: 'Profession de la mère', type: 'choice', options: ['Néant', 'journalière', 'Ouvrière avec salaire fixe', 'employée avec salaire fixe', 'entrepreneuse/libéral', 'Cadre supérieur'] },
      { id: 'sahar-note-atcd-mere', label: 'ATCDs de la mère :', type: 'note' },
      { id: 'sahar-atcd-check', label: 'Antécédents', type: 'checkbox', options: ['Gestité', 'Parité', 'Avortements', 'enfants vivants', 'Diabète', 'Cardiopathie', 'dysthyroidie', 'HTA', 'Autres', 'RAS'] },
      { id: 'sahar-atcd-gestite-preciser', label: 'Préciser Gestité', type: 'number', condition: { sourceFieldId: 'sahar-atcd-check', sourceFieldValue: 'Gestité' } },
      { id: 'sahar-atcd-parite-preciser', label: 'Préciser Parité', type: 'number', condition: { sourceFieldId: 'sahar-atcd-check', sourceFieldValue: 'Parité' } },
      { id: 'sahar-atcd-avortements-preciser', label: 'Préciser Avortements', type: 'number', condition: { sourceFieldId: 'sahar-atcd-check', sourceFieldValue: 'Avortements' } },
      { id: 'sahar-atcd-enfants-vivants-preciser', label: 'Préciser nombre d\'enfants vivants', type: 'number', condition: { sourceFieldId: 'sahar-atcd-check', sourceFieldValue: 'enfants vivants' } },
      { id: 'sahar-atcd-autres-preciser', label: 'Préciser Autres ATCDs', type: 'text', condition: { sourceFieldId: 'sahar-atcd-check', sourceFieldValue: 'Autres' } },
      { id: 'sahar-groupe-sanguin', label: 'Groupe sanguin ABO', type: 'choice', options: ['A', 'B', 'O', 'AB'] },
      { id: 'sahar-rhesus', label: 'Rhésus', type: 'choice', options: ['négatif', 'positif'] },
      { id: 'sahar-consanguinite', label: 'Consanguinité', type: 'choice', options: ['Absente', 'Premier degré', 'Deuxième degré', 'lointaine'] },
      { id: 'sahar-note-2', label: 'II. Grossesse actuelle :', type: 'note' },
      { id: 'sahar-suivi-grossesse', label: 'Suivi de la grossesse', type: 'choice', options: ['non suivi', 'régulier', 'irrégulier'] },
      { id: 'sahar-visites-prenatales', label: 'Nombres de visites prénatales', type: 'number' },
      { id: 'sahar-personnel-suivi', label: 'Qualification du personnel du suivi', type: 'choice', options: ['généraliste', 'sage-femme', 'gynécologue'] },
      { id: 'sahar-type-grossesse', label: 'Type de grossesse', type: 'choice', options: ['unique', 'gémellaire', 'multiples'] },
      {
        id: 'sahar-patho-grossesse',
        label: 'Pathologies au cours de la grossesse',
        type: 'checkbox',
        options: [
          'Toxémie',
          'Diabète',
          'Anémie < 8g',
          'Métrorragies du 3éme trimestre',
          'Menace d’accouchement prématuré',
          'Fièvre périnatale > 38,5',
          'Rupture prématurée des membranes',
          'Prises d’antibiotiques',
          'Maturation pulmonaire',
          'Autres',
        ],
      },
      {
        id: 'sahar-patho-grossesse-autres-preciser',
        label: 'Si autre, à préciser',
        type: 'text',
        condition: { sourceFieldId: 'sahar-patho-grossesse', sourceFieldValue: 'Autres' },
      },
      { id: 'sahar-echographies', label: 'Echographies prénatales', type: 'choice', options: ['non faites', 'faites en totalité', 'quelques unes faites'] },
      { id: 'sahar-echo-resultats', label: 'résultats', type: 'choice', options: ['normales', 'pathologiques'] },
      { id: 'sahar-note-accouchement', label: 'Accouchement :', type: 'note' },
      { id: 'sahar-presentation', label: 'Présentation', type: 'choice', options: ['céphalique', 'siège', 'Autres'] },
      { id: 'sahar-presentation-preciser', label: 'Préciser présentation', type: 'text', condition: { sourceFieldId: 'sahar-presentation', sourceFieldValue: 'Autres' } },
      { id: 'sahar-mode-acc', label: 'Mode d’accouchement', type: 'checkbox', options: ['Voie basse sans manœuvre', 'Voie basse avec manœuvre', 'Césarienne à chaud', 'Césarienne à froid'] },
      { id: 'sahar-note-liquide', label: 'Liquide amniotique :', type: 'note' },
      { id: 'sahar-liquide-qte', label: 'Quantité', type: 'choice', options: ['Normale', 'Oligoamnios', 'Hydramnios'] },
      { id: 'sahar-liquide-aspect', label: 'Aspect', type: 'choice', options: ['Clair', 'Teinté', 'Méconial', 'Sanglant'] },
      { id: 'sahar-patho-placentaire', label: 'Pathologies placentaire', type: 'choice', options: ['non', 'oui'] },
      { id: 'sahar-note-prematurite', label: 'Causes de la prématurité :', type: 'note' },
      { id: 'sahar-prema-cause-mere-choice', label: 'Pathologies liées à la mère', type: 'choice', options: ['non', 'oui'] },
      { id: 'sahar-prema-cause-mere-preciser', label: 'Préciser', type: 'text', condition: { sourceFieldId: 'sahar-prema-cause-mere-choice', sourceFieldValue: 'oui' } },
      { id: 'sahar-prema-cause-foetus-choice', label: 'Pathologies liées au fœtus', type: 'choice', options: ['non', 'oui'] },
      { id: 'sahar-prema-cause-foetus-preciser', label: 'Préciser', type: 'text', condition: { sourceFieldId: 'sahar-prema-cause-foetus-choice', sourceFieldValue: 'oui' } },
      { id: 'sahar-prema-cause-autres-choice', label: 'Autres causes', type: 'choice', options: ['non', 'oui'] },
      { id: 'sahar-prema-cause-autres-preciser', label: 'Préciser', type: 'text', condition: { sourceFieldId: 'sahar-prema-cause-autres-choice', sourceFieldValue: 'oui' } },
      { id: 'sahar-note-naissance', label: 'Naissance :', type: 'note' },
      { id: 'sahar-pn', label: 'PN en grammes', type: 'number' },
      { id: 'sahar-taille', label: 'Taille à la naissance en cm', type: 'number' },
      { id: 'sahar-pc', label: 'PC à la naissance en cm', type: 'number' },
      { id: 'sahar-apgar-1', label: 'Apgar à 1 min', type: 'number' },
      { id: 'sahar-apgar-5', label: 'Apgar à 5 min', type: 'number' },
      { id: 'sahar-reanimation-check', label: 'Réanimation à la naissance', type: 'checkbox', options: ['Ventilation manuelle au masque', 'Massage cardiaque externe', 'Intubation', 'Adrénaline en intra trachéal', 'Décès'] },
      { id: 'sahar-note-admission', label: 'A l’admission:', type: 'note' },
      { id: 'sahar-abord-vasculaire-choice', label: 'Abord vasculaire', type: 'choice', options: ['non', 'oui'] },
      { id: 'sahar-abord-vasculaire-preciser', label: 'Préciser Abord vasculaire', type: 'checkbox', options: ['Abord périphérique', 'KTVO', 'KTC'], condition: { sourceFieldId: 'sahar-abord-vasculaire-choice', sourceFieldValue: 'oui' } },
      { id: 'sahar-support-ventilatoire-choice', label: 'Support ventilatoire', type: 'choice', options: ['non', 'oui'] },
      { id: 'sahar-support-ventilatoire-type', label: 'Si oui', type: 'choice', options: ['Hood', 'CPAP', 'Ventilation mécanique', 'OHF'], condition: { sourceFieldId: 'sahar-support-ventilatoire-choice', sourceFieldValue: 'oui' } },
      { id: 'sahar-antibiotherapie', label: 'Antibiothérapie', type: 'choice', options: ['non', 'oui'] },
      { id: 'sahar-infection', label: 'Type d\'infection', type: 'choice', options: ['IMF', 'Infection nosocomiale', 'IMF+Infection nosocomiale'] },
      { id: 'sahar-note-traitement', label: 'Traitement spécifique :', type: 'note' },
      { id: 'sahar-traitement-specifique', label: 'Traitements spécifiques appliqués', type: 'checkbox', options: ['Surfactant', 'Transfusion de dérivés sanguins', 'Photothérapie', 'Exanguino-transfusion', 'Exsufflation', 'Drain thoracique', 'Acte chirurgical'] },
      { id: 'sahar-diagnostics', label: 'Diagnostics retenus lors de la 1ère hospitalisation', type: 'checkbox', options: ['Prématurité simple', 'RCIU + prématurité', 'Hypothermie', 'Hypoglycémie', 'Hyperglycémie', 'Hypocalcémie', 'Hypercalcémie', 'Ictère à bilirubine non conjuguée', 'Ictère cholestatique', 'IMF certaine', 'Méningite', 'Infection liée aux soins', 'Asphyxie périnatale', 'Convulsion NN', 'Hémorragie intracérébrale', 'Leucomalacie périventriculaire', 'MMH', 'DRT', 'Alvéolite infectieuse', 'Pneumothorax', 'HTAPPNN', 'Apnées à répétition', 'Dysplasie bronchopulmonaire', 'Hypoxie/accès de cyanose', 'Troubles cardiovasculaires / PCA / hémodynamique', 'RGO sévère', 'Entéropathie / ECUN', 'Troubles de la coagulation', 'Anémie', 'Transfusion sanguine', 'Hypothyroïdie'] },
      { id: 'sahar-evolution-service', label: 'Evolution dans le service', type: 'choice', options: ['vivant', 'Décès'] },
      { id: 'sahar-complications-choice', label: 'Complications', type: 'choice', options: ['non', 'oui'] },
      { id: 'sahar-complications-type-check', label: 'Si oui : type de complications', type: 'checkbox', options: ['Métabolique', 'Infectieuse', 'Cardiovasculaire', 'Pulmonaire', 'Neurologique', 'Digestive', 'Hématologique', 'Rénale', 'Autres'], condition: { sourceFieldId: 'sahar-complications-choice', sourceFieldValue: 'oui' } },
      { id: 'sahar-complication-metabolique-preciser', label: 'Préciser complication Métabolique', type: 'text', condition: { sourceFieldId: 'sahar-complications-type-check', sourceFieldValue: 'Métabolique' } },
      { id: 'sahar-complication-infectieuse-preciser', label: 'Préciser complication Infectieuse', type: 'text', condition: { sourceFieldId: 'sahar-complications-type-check', sourceFieldValue: 'Infectieuse' } },
      { id: 'sahar-complication-cardiovasculaire-preciser', label: 'Préciser complication Cardiovasculaire', type: 'text', condition: { sourceFieldId: 'sahar-complications-type-check', sourceFieldValue: 'Cardiovasculaire' } },
      { id: 'sahar-complication-pulmonaire-preciser', label: 'Préciser complication Pulmonaire', type: 'text', condition: { sourceFieldId: 'sahar-complications-type-check', sourceFieldValue: 'Pulmonaire' } },
      { id: 'sahar-complication-neurologique-preciser', label: 'Préciser complication Neurologique', type: 'text', condition: { sourceFieldId: 'sahar-complications-type-check', sourceFieldValue: 'Neurologique' } },
      { id: 'sahar-complication-digestive-preciser', label: 'Préciser complication Digestive', type: 'text', condition: { sourceFieldId: 'sahar-complications-type-check', sourceFieldValue: 'Digestive' } },
      { id: 'sahar-complication-hematologique-preciser', label: 'Préciser complication Hématologique', type: 'text', condition: { sourceFieldId: 'sahar-complications-type-check', sourceFieldValue: 'Hématologique' } },
      { id: 'sahar-complication-renale-preciser', label: 'Préciser complication Rénale', type: 'text', condition: { sourceFieldId: 'sahar-complications-type-check', sourceFieldValue: 'Rénale' } },
      { id: 'sahar-complication-autres-preciser', label: 'Préciser autres complications', type: 'text', condition: { sourceFieldId: 'sahar-complications-type-check', sourceFieldValue: 'Autres' } },
      { id: 'sahar-note-3', label: 'III. La sortie :', type: 'note' },
      { id: 'sahar-date-sortie', label: 'Date de la sortie', type: 'date' },
      { id: 'sahar-duree-hosp', label: 'Durée d’hospitalisation (en jours)', type: 'number' },
      { id: 'sahar-age-sortie', label: 'Age post menstruel à la sortie en SA', type: 'number' },
      { id: 'sahar-poids-sortie', label: 'Poids à la sortie (en g)', type: 'number' },
      { id: 'sahar-pc-sortie', label: 'Périmètre crânien à la sortie (en cm)', type: 'number' },
      { id: 'sahar-hb-sortie', label: 'Hémoglobine de sortie (en g/dl)', type: 'number' },
      { id: 'sahar-recupere-par', label: 'Enfant récupéré par (le jour de la sortie)', type: 'choice', options: ['Le couple : Mère et père', 'Mère seule (en absence du père)', 'Père seul (en absence de la mère)', 'Autres parents'] },
      { id: 'sahar-recupere-par-preciser', label: 'Préciser autre parent', type: 'text', condition: { sourceFieldId: 'sahar-recupere-par', sourceFieldValue: 'Autres parents' } },
      { id: 'sahar-alimentation-sortie', label: 'Alimentation à la sortie', type: 'choice', options: ['AM + lait artificiel', 'Lait artificiel seul'] },
      { id: 'sahar-traitement-sortie', label: 'Traitement à la sortie', type: 'checkbox', options: ['Vitamine D', 'Fer', 'Traitement anti-reflux', 'Traitement de cholestase', 'Traitement d’hypothyroïdie'] },
      { id: 'sahar-rdv-sortie', label: 'RDV donné après (en semaines)', type: 'number' },
      { id: 'sahar-note-4', label: 'IV. Suivi après la sortie :', type: 'note' },
      { id: 'sahar-suivi-apres-sortie', label: 'Suivi après la sortie', type: 'choice', options: ['Perdu de vue', 'Bien suivi', 'Mal suivi'] },
      { id: 'sahar-rehospi-mois', label: 'Ré hospitalisation au cours du mois après la sortie', type: 'choice', options: ['oui', 'non'] },
      { id: 'sahar-age-derniere-consult', label: 'Age à la dernière consultation en mois', type: 'number' },
      { id: 'sahar-deces-1an-choice', label: 'Décès au cours de la première année', type: 'choice', options: ['non', 'oui'] },
      { id: 'sahar-age-deces-1an', label: 'Âge du décès en mois', type: 'number', condition: { sourceFieldId: 'sahar-deces-1an-choice', sourceFieldValue: 'oui' } },
      { id: 'sahar-cause-deces-1an', label: 'Causes du décès', type: 'choice', options: ['Respiratoire', 'Neurologique', 'Déshydratation/GEA', 'Autres'], condition: { sourceFieldId: 'sahar-deces-1an-choice', sourceFieldValue: 'oui' } },
      { id: 'sahar-cause-deces-1an-preciser', label: 'Préciser autre cause', type: 'text', condition: { sourceFieldId: 'sahar-cause-deces-1an', sourceFieldValue: 'Autres' } },
      { id: 'sahar-etf', label: 'ETF : (dernière ETF)', type: 'choice', options: ['Non faite', 'Normale', 'Pathologique'] },
      { id: 'sahar-patho-etf', label: 'Pathologie ETF', type: 'checkbox', options: ['Hémorragie sous épendymaire', 'Hémorragie intracrânienne des noyaux gris centraux', 'Hémorragie intra-ventriculaire', 'Leuco malacie péri ventriculaire', 'Lésions séquellaires (dilatation ventriculaire, kystes)', 'Autres'], condition: { sourceFieldId: 'sahar-etf', sourceFieldValue: 'Pathologique' } },
      { id: 'sahar-patho-etf-preciser', label: 'Préciser autre pathologie ETF', type: 'text', condition: { sourceFieldId: 'sahar-patho-etf', sourceFieldValue: 'Autres' } },
      { id: 'sahar-fo', label: 'FO', type: 'choice', options: ['Non fait', 'Normal', 'Pathologique'] },
      { id: 'sahar-fo-preciser', label: 'Type de ROP', type: 'text', condition: { sourceFieldId: 'sahar-fo', sourceFieldValue: 'Pathologique' } },
      { id: 'sahar-depistage-surdite', label: 'Dépistage de la surdité', type: 'choice', options: ['Non fait', 'Normal', 'Pathologique'] },
      { id: 'sahar-eeg', label: 'EEG', type: 'choice', options: ['Non fait', 'Normal', 'Pathologique'] },
      { id: 'sahar-note-evo-1an', label: 'Evolution au cours de la première année de vie :', type: 'note' },
      { id: 'sahar-renseignements-1an', label: 'Renseignements recueillis', type: 'choice', options: ['Dans le dossier', 'Par appel téléphonique', 'Aucun renseignement'] },
      { id: 'sahar-complications-1an', label: 'Complications', type: 'checkbox', options: ['Retard staturo-pondéral', 'Hospitalisation en pédiatrie', 'Bronchiolite à répétition', 'Anémie et / ou transfusion', 'Troubles visuels et / ou consultation en ophtalmologie', 'Complications auditives', 'Troubles transitoires du tonus', 'Fausses routes', 'Vomissements à répétition', 'Crise convulsive fébrile', 'Epilepsie', 'Autres'] },
      { id: 'sahar-complications-1an-preciser', label: 'Autres à préciser', type: 'text', condition: { sourceFieldId: 'sahar-complications-1an', sourceFieldValue: 'Autres' } },
      { id: 'sahar-traitement-1an-choice', label: 'Prise de traitement', type: 'choice', options: ['non', 'oui'] },
      { id: 'sahar-traitement-1an-preciser', label: 'si oui à préciser', type: 'text', condition: { sourceFieldId: 'sahar-traitement-1an-choice', sourceFieldValue: 'oui' } },
      { id: 'sahar-vaccination-1an', label: 'Vaccination régulière', type: 'choice', options: ['oui', 'non'] },
      { id: 'sahar-note-evo-2an', label: 'Evolution au cours de la 2ème année de vie:', type: 'note' },
      { id: 'sahar-renseignements-2an', label: 'Renseignements recueillis', type: 'choice', options: ['Dans le dossier', 'Par appel téléphonique', 'Aucun renseignement'] },
      { id: 'sahar-complications-2an', label: 'Complications à 2 ans', type: 'checkbox', options: ['ré hospitalisation', 'Retard staturo-pondéral', 'Microcéphalie', 'Asthme du nourrisson', 'Troubles visuels et / ou consultation en ophtalmologie', 'Complications auditives', 'Crise fébrile', 'Epilepsie', 'Retard moteur', 'Retard de la parole', 'Autres', 'Prise de traitement', 'Vaccination complète pour la 2em année', 'Décès'] },
      { id: 'sahar-rehospi-2an-nombre', label: 'Si réhospitalisation, quel est le nombre de fois', type: 'number', condition: { sourceFieldId: 'sahar-complications-2an', sourceFieldValue: 'ré hospitalisation' } },
      { id: 'sahar-rehospi-2an-cause', label: 'Causes de ré hospitalisation', type: 'checkbox', options: ['Gastro entérite', 'Bronchiolite', 'Pneumopathie/crise d’asthme', 'Anémie et transfusion', 'Crise épileptique', 'Autres'], condition: { sourceFieldId: 'sahar-complications-2an', sourceFieldValue: 'ré hospitalisation' } },
      { id: 'sahar-rehospi-2an-cause-preciser', label: 'Si autre cause, préciser', type: 'text', condition: { sourceFieldId: 'sahar-rehospi-2an-cause', sourceFieldValue: 'Autres' } },
      { id: 'sahar-complications-2an-preciser', label: 'Si autres complications, préciser', type: 'text', condition: { sourceFieldId: 'sahar-complications-2an', sourceFieldValue: 'Autres' } },
      { id: 'sahar-traitement-2an-preciser', label: 'Si prise de traitement, préciser', type: 'text', condition: { sourceFieldId: 'sahar-complications-2an', sourceFieldValue: 'Prise de traitement' } },
      { id: 'sahar-deces-2an-age', label: 'Si décès, préciser l\'âge en mois', type: 'number', condition: { sourceFieldId: 'sahar-complications-2an', sourceFieldValue: 'Décès' } },
      { id: 'sahar-deces-2an-cause', label: 'Si décès, préciser la cause', type: 'text', condition: { sourceFieldId: 'sahar-complications-2an', sourceFieldValue: 'Décès' } },
      { id: 'sahar-vaccination-complete-2ans', label: 'Vaccination complète au cours des 2 premières années de vie', type: 'choice', options: ['non', 'oui'] },
      { id: 'sahar-poids-2an', label: 'Poids à la fin de la 2ème année de vie en grammes', type: 'number' },
      { id: 'sahar-taille-2an', label: 'Taille à la fin de la 2ème année de vie en cm', type: 'number' },
      { id: 'sahar-pc-2an', label: 'PC à la fin de la 2ème année en cm', type: 'number' },
    ]
  },
];

const saharForm = mockForms.find(f => f.id === 'form-sahar-1');

const generateSaharResponses = (count: number): FormResponse[] => {
  if (!saharForm) return [];

  const saharSchema = saharForm.schema;
  const responses: FormResponse[] = [];
  const studentIds = ['user-3', 'user-4', 'user-5'];

  // Helper data and functions for realistic values
  const firstNames = ['Léo', 'Gabriel', 'Raphaël', 'Arthur', 'Louis', 'Jules', 'Adam', 'Maël', 'Lucas', 'Hugo', 'Jade', 'Louise', 'Ambre', 'Alba', 'Emma', 'Rose', 'Alice', 'Romy', 'Anna', 'Lina'];
  const lastNames = ['Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit', 'Durand', 'Leroy', 'Moreau'];

  const getRandomElement = <T extends {}>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
  const getRandomSubset = <T extends {}>(arr: T[], maxItems?: number): T[] => {
    const shuffled = [...arr].sort(() => 0.5 - Math.random());
    const count = Math.floor(Math.random() * ((maxItems ?? shuffled.length) + 1));
    return shuffled.slice(0, count);
  };
   const getRandomNumber = (min: number, max: number, decimals: number = 0) => {
    const rand = Math.random() * (max - min) + min;
    return parseFloat(rand.toFixed(decimals));
  };
  const getRandomDate = (start: Date, end: Date) => {
    const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
    return date.toISOString().split('T')[0];
  };
  const addDays = (date: Date, days: number): Date => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  };

  for (let i = 0; i < count; i++) {
    const data: Record<string, any> = {};
    const isPremature = Math.random() < 0.3; // 30% chance of being premature

    // --- Generate consistent base data ---
    const dob = new Date(getRandomDate(new Date(2023, 0, 1), new Date()));
    const admissionDate = addDays(dob, getRandomNumber(0, 2));
    const hospitalStayDays = getRandomNumber(5, isPremature ? 90 : 30);
    const dischargeDate = addDays(admissionDate, hospitalStayDays);

    data['sahar-dob'] = dob.toISOString().split('T')[0];
    data['sahar-annee'] = dob.getFullYear();

    for (const field of saharSchema) {
      if (field.type === 'note') continue;
      if (data[field.id] !== undefined) continue; // Skip if already populated

      // Check conditional visibility
      if (field.condition) {
        const sourceValue = data[field.condition.sourceFieldId];
        const conditionMet = Array.isArray(sourceValue)
          ? sourceValue.includes(field.condition.sourceFieldValue)
          : sourceValue === field.condition.sourceFieldValue;
        if (!conditionMet) continue;
      }

      switch (field.type) {
        case 'text':
          if (field.id === 'sahar-nom') data[field.id] = getRandomElement(lastNames);
          else if (field.id === 'sahar-prenom') data[field.id] = getRandomElement(firstNames);
          else if (field.id === 'sahar-dossier') data[field.id] = `NEO-${dob.getFullYear()}-${String(i + 1).padStart(4, '0')}`;
          else if (field.id === 'sahar-tel-parent') data[field.id] = `06${String(getRandomNumber(10000000, 99999999))}`;
          else data[field.id] = 'Précision de test'; // For 'preciser' fields
          break;
        
        case 'number':
            let min = field.min ?? 0;
            let max = field.max ?? 100;
            if (field.id === 'sahar-age-pere') { min = 20; max = 65; }
            else if (field.id === 'sahar-age-mere') { min = 18; max = 45; }
            else if (field.id === 'sahar-visites-prenatales') { min = 0; max = 10; }
            else if (field.id === 'sahar-pn') { min = isPremature ? 800 : 2500; max = isPremature ? 2499 : 4500; }
            else if (field.id === 'sahar-taille') { min = isPremature ? 30 : 48; max = isPremature ? 47 : 55; }
            else if (field.id === 'sahar-pc') { min = isPremature ? 25 : 33; max = isPremature ? 32 : 38; }
            else if (field.id.startsWith('sahar-apgar')) { min = isPremature ? 1 : 7; max = 10; }
            else if (field.id === 'sahar-duree-hosp') { data[field.id] = hospitalStayDays; continue; }
            else if (field.id === 'sahar-poids-sortie') { min = 2000; max = 5000; }
            else if (field.id.includes('sortie')) { min = 30; max = 50; }
            else if (field.id.includes('2an')) { min = 8000; max = 15000; }
            data[field.id] = getRandomNumber(min, max);
            break;

        case 'date':
          if (field.id === 'sahar-date-sortie') { data[field.id] = dischargeDate.toISOString().split('T')[0]; }
          else { data[field.id] = getRandomDate(dob, new Date()); }
          break;
        
        case 'choice':
          if (field.options?.length) {
            if (field.id === 'sahar-evolution-service' && isPremature && Math.random() < 0.1) {
              data[field.id] = 'Décès';
            } else {
              data[field.id] = getRandomElement(field.options);
            }
          }
          break;
        
        case 'checkbox':
          if (field.options?.length) {
            if (field.id === 'sahar-patho-grossesse' && isPremature) {
                const baseSelection = getRandomSubset(field.options, 2);
                if (!baseSelection.includes('Menace d’accouchement prématuré')) {
                    baseSelection.push('Menace d’accouchement prématuré');
                }
                data[field.id] = baseSelection;
            } else if (field.id === 'sahar-diagnostics' && isPremature) {
                data[field.id] = getRandomSubset(['Prématurité simple', 'RCIU + prématurité', 'MMH', 'Ictère à bilirubine non conjuguée', 'Apnées à répétition'], 3);
            } else {
                data[field.id] = getRandomSubset(field.options, 3);
            }
          }
          break;
        
        case 'range':
          data[field.id] = getRandomNumber(field.min ?? 0, field.max ?? 100);
          break;
      }
    }

    // Post-generation consistency checks
    if (data['sahar-evolution-service'] === 'Décès') {
      saharSchema.forEach(field => {
        if (field.id.includes('sortie') || field.id.includes('apres-sortie') || field.id.includes('1an') || field.id.includes('2an')) {
          delete data[field.id];
        }
      });
    } else {
        if (data['sahar-apgar-5'] < data['sahar-apgar-1']) {
            data['sahar-apgar-5'] = data['sahar-apgar-1'] + getRandomNumber(0, 2);
            if (data['sahar-apgar-5'] > 10) data['sahar-apgar-5'] = 10;
        }
    }
    
    responses.push({
      id: `resp-sahar-${i + 1}`,
      userId: getRandomElement(studentIds),
      formId: 'form-sahar-1',
      data,
      createdAt: addDays(dischargeDate, getRandomNumber(1, 365)).toISOString(),
    });
  }

  return responses;
};


const generatedSaharResponses = generateSaharResponses(300);

export const mockFormResponses: FormResponse[] = [
  {
    id: 'resp-1',
    userId: 'user-3',
    formId: 'form-1',
    data: { q1: 45, q2: 'Homme', q3: ['Fatigue', 'Soif excessive'], q4: '1 à 6 mois' },
    createdAt: new Date('2023-10-10T09:00:00Z').toISOString(),
  },
  {
    id: 'resp-2',
    userId: 'user-5',
    formId: 'form-1',
    data: { q1: 62, q2: 'Femme', q3: ['Vision floue', 'Mictions fréquentes'], q4: 'Plus de 6 mois' },
    createdAt: new Date('2023-10-11T14:30:00Z').toISOString(),
  },
  {
    id: 'resp-3',
    userId: 'user-1',
    formId: 'form-3',
    data: { f3q1: '2', f3q2: 'Oui', f3q3: 'Quotidiennement' },
    createdAt: new Date('2023-09-20T18:00:00Z').toISOString(),
  },
  ...generatedSaharResponses,
];

export const mockPurchasedForms: PurchasedForm[] = [];

export const mockTransactions: Transaction[] = [
  {
    id: 'tx-1',
    userId: 'user-1',
    type: TransactionType.Debit,
    amount: 100,
    reason: TransactionReason.FormValidation,
    createdAt: new Date('2023-10-01T10:01:00Z').toISOString(),
    details: 'Formulaire: "Étude sur les symptômes du diabète de type 2"',
  },
  {
    id: 'tx-2',
    userId: 'user-1',
    type: TransactionType.Debit,
    amount: 2,
    reason: TransactionReason.FormResponse,
    createdAt: new Date('2023-10-10T09:00:05Z').toISOString(),
    details: 'Réponse au formulaire: "Étude sur les symptômes du diabète de type 2"',
  },
  {
    id: 'tx-3',
    userId: 'user-4',
    type: TransactionType.Debit,
    amount: 10,
    reason: TransactionReason.AiRequest,
    createdAt: new Date('2023-09-25T11:00:00Z').toISOString(),
    details: "Analyse IA sur 1 formulaire",
  },
  {
    id: 'tx-4',
    userId: 'user-3',
    type: TransactionType.Credit,
    amount: 100,
    reason: TransactionReason.ManualTopup,
    createdAt: new Date('2023-09-01T10:00:00Z').toISOString(),
    details: 'Recharge par un administrateur',
  },
];

export const mockNotifications: Notification[] = [
  {
    id: 'notif-1',
    userId: 'user-1',
    message: 'Votre formulaire "Étude sur les symptômes du diabète de type 2" a été validé avec succès.',
    read: true,
    createdAt: new Date('2023-10-01T10:01:05Z').toISOString(),
  },
  {
    id: 'notif-2',
    userId: 'user-3',
    message: 'Votre solde est faible. Pensez à recharger vos coins.',
    read: false,
    createdAt: new Date().toISOString(),
  },
];

export const mockAnalysisHistory: AnalysisHistory[] = [
  {
    id: 'hist-1',
    userId: 'user-1',
    formIds: ['form-1'],
    formTitles: ['Étude sur les symptômes du diabète de type 2'],
    userPrompt: "Quelle est la répartition par sexe des participants ?",
    analysisResult: {
      "analysisText": "L'analyse des réponses indique une répartition équilibrée entre les sexes, avec 1 homme et 1 femme sur les 2 réponses fournies.",
      "chartData": {
        "type": "pie",
        "data": {
          "labels": ["Homme", "Femme"],
          "datasets": [
            {
              "label": "Répartition par sexe",
              "data": [1, 1],
              "backgroundColor": ["#36A2EB", "#FF6384"]
            }
          ]
        }
      }
    },
    createdAt: new Date('2023-10-15T11:00:00Z').toISOString(),
  },
];