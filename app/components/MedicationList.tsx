'use client';

import { Pill, X, Clock } from 'lucide-react';

interface Medication {
  id: string;
  brand_name?: string;
  generic_name?: string;
  name?: string; // API response format
  generic?: string; // API response format
  strength?: string;
  dosage_form?: string;
  category?: string;
  timing_info?: {
    timing: string;
    with_food: string;
    rationale: string;
  };
  frequency?: string;
  // UMLS integration fields
  rxcui?: string;
  umlsEnhanced?: boolean;
  umlsCUI?: string;
  // LNHPD integration fields
  source?: 'DPD' | 'LNHPD';
  lnhpd_id?: string;
  product_purpose?: string;
  risks?: string;
  medicinal_ingredients?: any[];
  // Legacy fields for compatibility
  din?: string;
}

interface MedicationListProps {
  medications: Medication[];
  onRemove: (id: string) => void;
  onUpdateFrequency: (id: string, frequency: string) => void;
  getSpecificFoodGuidance: (genericName: string) => string;
}

const frequencyOptions = [
  { value: 'QD - Once daily', label: 'QD - Once daily', description: 'Once per day' },
  { value: 'BID - Twice daily', label: 'BID - Twice daily', description: 'Every 12 hours' },
  { value: 'TID - Three times daily', label: 'TID - Three times daily', description: 'Every 8 hours' },
  { value: 'QID - Four times daily', label: 'QID - Four times daily', description: 'Every 6 hours' },
  { value: 'QHS - At bedtime', label: 'QHS - At bedtime', description: 'At bedtime' },
  { value: 'Q2H - Every 2 hours', label: 'Q2H - Every 2 hours', description: 'Every 2 hours' },
  { value: 'Q4H - Every 4 hours', label: 'Q4H - Every 4 hours', description: 'Every 4 hours' },
  { value: 'Q6H - Every 6 hours', label: 'Q6H - Every 6 hours', description: 'Every 6 hours' },
  { value: 'Q8H - Every 8 hours', label: 'Q8H - Every 8 hours', description: 'Every 8 hours' },
  { value: 'Q12H - Every 12 hours', label: 'Q12H - Every 12 hours', description: 'Every 12 hours' },
  { value: 'PRN - As needed', label: 'PRN - As needed', description: 'As needed' }
];

export default function MedicationList({ medications, onRemove, onUpdateFrequency, getSpecificFoodGuidance }: MedicationListProps) {
  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'Cardiovascular': 'bg-teal-100 text-teal-800 border-teal-200',
      'Diabetes': 'bg-emerald-100 text-emerald-800 border-emerald-200',
      'Gastrointestinal': 'bg-cyan-100 text-cyan-800 border-cyan-200',
      'Psychiatric': 'bg-purple-100 text-purple-800 border-purple-200',
      'Endocrine': 'bg-blue-100 text-blue-800 border-blue-200',
      'Respiratory': 'bg-sky-100 text-sky-800 border-sky-200',
      'Ophthalmic': 'bg-pink-100 text-pink-800 border-pink-200',
      'Vitamins & Supplements': 'bg-orange-100 text-orange-800 border-orange-200',
      'Antibiotic': 'bg-indigo-100 text-indigo-800 border-indigo-200',
      'Analgesic': 'bg-red-100 text-red-800 border-red-200',
      'Other': 'bg-slate-100 text-slate-800 border-slate-200'
    };
    return colors[category] || colors['Other'];
  };

  if (medications.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <Pill className="w-6 h-6 text-gray-400" />
        </div>
        <p className="text-gray-900 font-medium text-base">Add medications to get started</p>
        <p className="text-sm text-gray-700 mt-1">Search and add medications above</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {medications.map((medication) => (
        <div
          key={medication.id}
          className="bg-gradient-to-br from-white to-gray-50 border-2 border-gray-200 hover:border-teal-400 rounded-xl shadow-lg hover:shadow-xl transition-all overflow-hidden"
        >
          {/* Header row with icon and basic info */}
          <div className="flex items-center gap-4 p-4 pb-2">
            {/* Drug icon */}
            <div className="w-12 h-12 bg-gradient-to-br from-teal-400 to-teal-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <Pill className="w-6 h-6 text-white" />
            </div>
            
            {/* Medication name */}
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-black text-lg truncate">{medication.brand_name}</h3>
              <p className="text-gray-900 font-medium text-sm truncate">{medication.generic_name}</p>
            </div>
            
            {/* Remove button */}
            <button
              onClick={() => onRemove(medication.id)}
              className="w-8 h-8 bg-red-100 hover:bg-red-200 rounded-lg transition-colors focus:outline-none focus:ring-4 focus:ring-red-300 flex items-center justify-center flex-shrink-0"
              aria-label={`Remove ${medication.brand_name} from medications`}
            >
              <X className="w-4 h-4 text-red-600" />
            </button>
          </div>
          
          {/* Details row */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 px-4 pb-4">
            {/* Left details */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getCategoryColor(medication.category || 'Unknown')}`}>
                  {medication.category || 'Unknown'}
                </span>
                <span className="text-gray-700 text-sm font-medium">{medication.strength || 'N/A'}</span>
                <span className="text-gray-700 text-sm font-medium">{medication.dosage_form || 'N/A'}</span>
                {medication.umlsEnhanced && medication.rxcui && (
                  <div className="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 border border-purple-200 rounded text-xs text-purple-700">
                    <span>📚</span>
                    <span>RxNorm: {medication.rxcui}</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Frequency dropdown */}
            <div className="w-full sm:w-auto sm:ml-auto">
              <select
                value={medication.frequency || 'QD - Once daily'}
                onChange={(e) => onUpdateFrequency(medication.id, e.target.value)}
                className="w-full sm:w-auto px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-teal-300 focus:border-transparent text-sm bg-white hover:bg-teal-50 font-semibold text-black"
                aria-label={`Change frequency for ${medication.brand_name || medication.name}`}
              >
                {frequencyOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
