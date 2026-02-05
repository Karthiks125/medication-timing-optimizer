'use client';

import { AlertTriangle, AlertCircle, Info } from 'lucide-react';

interface Interaction {
  drug1: string;
  drug2: string;
  severity: 'Major' | 'Moderate' | 'Minor';
}

interface InteractionWarningsProps {
  interactions: Interaction[];
}

export default function InteractionWarnings({ interactions }: InteractionWarningsProps) {
  const getSeverityConfig = (severity: string) => {
    switch (severity) {
      case 'Major':
        return {
          color: 'text-red-600 bg-red-50 border-red-200',
          icon: AlertTriangle,
          label: 'Major',
          description: 'May cause life-threatening or serious adverse effects'
        };
      case 'Moderate':
        return {
          color: 'text-amber-600 bg-amber-50 border-amber-200',
          icon: AlertCircle,
          label: 'Moderate',
          description: 'May require dose adjustment or monitoring'
        };
      case 'Minor':
        return {
          color: 'text-sky-600 bg-sky-50 border-sky-200',
          icon: Info,
          label: 'Minor',
          description: 'Usually well-tolerated, minimal effects'
        };
      default:
        return {
          color: 'text-slate-600 bg-slate-50 border-slate-200',
          icon: Info,
          label: 'Unknown',
          description: 'Interaction information not available'
        };
    }
  };

  if (interactions.length === 0) {
    return (
      <div className="text-center py-6">
        <Info className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
        <p className="text-emerald-700 font-medium text-base">No drug interactions detected</p>
        <p className="text-sm text-gray-900 mt-1">Your medications appear safe to take together</p>
      </div>
    );
  }

  // Group interactions by severity
  const groupedInteractions = interactions.reduce((acc, interaction) => {
    if (!acc[interaction.severity]) {
      acc[interaction.severity] = [];
    }
    acc[interaction.severity].push(interaction);
    return acc;
  }, {} as Record<string, Interaction[]>);

  const severityOrder = ['Major', 'Moderate', 'Minor'];

  return (
    <div className="space-y-3">
      <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
        <AlertTriangle className="w-6 h-6 text-red-600" />
        Drug Interactions Detected
      </h3>
      
      {Object.entries(groupedInteractions).map(([severity, severityInteractions]) => {
        if (!severityInteractions) return null;

        return (
          <div key={severity} className="space-y-3">
            {severityInteractions.map((interaction, index) => (
              <div
                key={`${interaction.drug1}-${interaction.drug2}-${index}`}
                className={`p-4 rounded-xl border-2 ${
                  interaction.severity === 'Major' ? 'bg-red-50 border-red-500' 
                  : interaction.severity === 'Moderate' ? 'bg-amber-50 border-amber-500'
                  : 'bg-blue-50 border-blue-400'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg ${
                    interaction.severity === 'Major' ? 'bg-red-600' 
                    : interaction.severity === 'Moderate' ? 'bg-amber-500'
                    : 'bg-blue-500'
                  }`}>
                    {interaction.severity === 'Major' && <AlertTriangle className="w-7 h-7 text-white" />}
                    {interaction.severity === 'Moderate' && <AlertCircle className="w-7 h-7 text-white" />}
                    {interaction.severity === 'Minor' && <Info className="w-7 h-7 text-white" />}
                  </div>
                  
                  <div className="flex-1">
                    <span className={`inline-block px-2 py-1 rounded text-xs font-bold mb-2 ${
                      interaction.severity === 'Major' ? 'bg-red-600 text-white' 
                      : interaction.severity === 'Moderate' ? 'bg-amber-600 text-white'
                      : 'bg-blue-600 text-white'
                    }`}>
                      {interaction.severity.toUpperCase()}
                    </span>
                    
                    <p className="font-bold text-gray-900 text-lg">
                      {interaction.drug1} ⚠️ {interaction.drug2}
                    </p>
                    
                    <p className="text-sm text-gray-700 mt-2">
                      {interaction.severity === 'Major' && 
                        "Significant interaction - consult your doctor. Medications separated in schedule."
                      }
                      {interaction.severity === 'Moderate' && 
                        "Moderate interaction - monitor for side effects. Spaced apart in schedule."
                      }
                      {interaction.severity === 'Minor' && 
                        "Minor interaction possible. Generally safe together."
                      }
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        );
      })}
      
      {/* Disclaimer */}
      {false && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-300">
          <p className="text-xs text-gray-900">
            <strong>Disclaimer:</strong> This information is for educational purposes only. 
            Always consult with your healthcare provider or pharmacist before making any changes to your medication regimen.
          </p>
        </div>
      )}
    </div>
  );
}
