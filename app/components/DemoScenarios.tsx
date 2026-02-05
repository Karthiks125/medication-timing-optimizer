'use client';

import { useState } from 'react';
import { Users, Heart, Activity, Brain, Info } from 'lucide-react';

interface Medication {
  brand_name: string;
  generic_name: string;
  strength: string;
  dosage_form: string;
  category: string;
  timing_info: {
    timing: string;
    with_food: string;
    rationale: string;
  };
  // UMLS integration fields
  rxcui?: string;
  umlsEnhanced?: boolean;
  umlsCUI?: string;
}

interface DemoScenariosProps {
  onLoadScenario: (medications: Medication[]) => void;
}

const demoScenarios = [
  {
    id: 'post-mi',
    name: 'Post-MI Cardiac Patient',
    description: 'Common medications after a heart attack',
    icon: Heart,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    medications: [
      {
        brand_name: 'METOPROLOL',
        generic_name: 'METOPROLOL TARTRATE',
        strength: '25.0 MG',
        dosage_form: 'TABLET',
        category: 'Cardiovascular',
        timing_info: {
          timing: 'with meals',
          with_food: 'with food',
          rationale: 'Beta-blocker - take with food to reduce GI upset'
        }
      },
      {
        brand_name: 'LIPITOR',
        generic_name: 'ATORVASTATIN CALCIUM',
        strength: '20.0 MG',
        dosage_form: 'TABLET',
        category: 'Cardiovascular',
        timing_info: {
          timing: 'evening',
          with_food: 'with or without food',
          rationale: 'Statin - most effective when taken in evening'
        }
      },
      {
        brand_name: 'ASPIRIN',
        generic_name: 'ACETYLSALICYLIC ACID',
        strength: '81.0 MG',
        dosage_form: 'TABLET',
        category: 'Cardiovascular',
        timing_info: {
          timing: 'daily',
          with_food: 'with food',
          rationale: 'Antiplatelet - take with food to prevent stomach irritation'
        }
      }
    ] as Medication[]
  },
  {
    id: 'diabetes-htn',
    name: 'Type 2 Diabetes + HTN',
    description: 'Diabetes and hypertension management',
    icon: Activity,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    medications: [
      {
        brand_name: 'GLUCOPHAGE',
        generic_name: 'METFORMIN HYDROCHLORIDE',
        strength: '500.0 MG',
        dosage_form: 'TABLET',
        category: 'Diabetes',
        timing_info: {
          timing: 'with meals',
          with_food: 'with food',
          rationale: 'Metformin - take with meals to reduce GI side effects'
        }
      },
      {
        brand_name: 'ZESTRIL',
        generic_name: 'LISINOPRIL',
        strength: '10.0 MG',
        dosage_form: 'TABLET',
        category: 'Cardiovascular',
        timing_info: {
          timing: 'daily',
          with_food: 'with or without food',
          rationale: 'ACE inhibitor - can be taken with or without food'
        }
      },
      {
        brand_name: 'NORVASC',
        generic_name: 'AMLODIPINE BESYLATE',
        strength: '5.0 MG',
        dosage_form: 'TABLET',
        category: 'Cardiovascular',
        timing_info: {
          timing: 'daily',
          with_food: 'with or without food',
          rationale: 'Calcium channel blocker - can be taken with or without food'
        }
      }
    ] as Medication[]
  },
  {
    id: 'hypothyroidism',
    name: 'Hypothyroidism',
    description: 'Thyroid hormone replacement therapy',
    icon: Brain,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    medications: [
      {
        brand_name: 'SYNTHROID',
        generic_name: 'LEVOTHYROXINE SODIUM',
        strength: '100.0 MCG',
        dosage_form: 'TABLET',
        category: 'Endocrine',
        timing_info: {
          timing: 'morning',
          with_food: 'empty stomach',
          rationale: 'Thyroid hormone - take on empty stomach 30-60 minutes before breakfast'
        }
      },
      {
        brand_name: 'CALTRATE',
        generic_name: 'CALCIUM CARBONATE',
        strength: '600.0 MG',
        dosage_form: 'TABLET',
        category: 'Other',
        timing_info: {
          timing: 'with meals',
          with_food: 'with food',
          rationale: 'Calcium supplement - take with meals for better absorption'
        }
      },
      {
        brand_name: 'CENTRUM',
        generic_name: 'MULTIVITAMIN',
        strength: '1.0 TABLET',
        dosage_form: 'TABLET',
        category: 'Other',
        timing_info: {
          timing: 'with meals',
          with_food: 'with food',
          rationale: 'Multivitamin - take with food to improve absorption'
        }
      }
    ] as Medication[]
  }
];

export default function DemoScenarios({ onLoadScenario }: DemoScenariosProps) {
  const [selectedScenario, setSelectedScenario] = useState<string>('');

  const handleLoadScenario = (scenarioId: string) => {
    const scenario = demoScenarios.find(s => s.id === scenarioId);
    if (scenario) {
      onLoadScenario(scenario.medications);
      setSelectedScenario(scenarioId);
    }
  };

  return (
    <div className="space-y-3">
      <div className="bg-gray-50 rounded-xl p-4 border-2 border-gray-200 mb-4">
        <h4 className="font-bold text-black mb-2">Try an Example</h4>
        <button
          onClick={() => handleLoadScenario('cardiac')}
          className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2 min-h-[44px]"
        >
          <Heart className="w-5 h-5" />
          Load Cardiac Patient Example (3 medications)
        </button>
        <p className="text-xs text-gray-900 mt-2 text-center">
          Loads sample heart medications to demo the optimizer
        </p>
      </div>
      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
        <p className="text-xs text-gray-900">
          <strong>Tip:</strong> Click any scenario to load example medications and see how the scheduler works.
        </p>
      </div>
    </div>
  );
}
