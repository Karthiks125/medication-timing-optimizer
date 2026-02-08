'use client';

import { useState, useEffect } from 'react';
import { Plus, Clock, Download, Calendar, AlertTriangle, CheckCircle, X, Edit2, Save, RotateCcw, Trash2, Sparkles } from 'lucide-react';
import DrugSearch from './components/DrugSearch';
import MedicationList from './components/MedicationList';
import Timeline from './components/Timeline';
import InteractionWarnings from './components/InteractionWarnings';

interface Medication {
  id: string;
  din?: string;
  brand_name?: string;
  generic_name?: string;
  name?: string;
  generic?: string;
  strength?: string;
  dosage_form?: string;
  category?: string;
  timing_info?: {
    timing: string;
    with_food: string;
    rationale: string;
  };
  frequency?: string;
  rxcui?: string;
  umlsEnhanced?: boolean;
  umlsCUI?: string;
  source?: 'DPD' | 'LNHPD';
  lnhpd_id?: string;
  product_purpose?: string;
  risks?: string;
  medicinal_ingredients?: any[];
  isCombination?: boolean;
  combination_components?: string[] | null;
}

interface ScheduleItem {
  time: string;
  medications: Medication[];
}

interface Interaction {
  drug1: string;
  drug2: string;
  severity: 'Major' | 'Moderate' | 'Minor';
  description?: string;
}

export default function Home() {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [isGeneratingSchedule, setIsGeneratingSchedule] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [isEditingTimes, setIsEditingTimes] = useState(false);
  const [editedSchedule, setEditedSchedule] = useState<ScheduleItem[]>([]);

  const timeToMinutes = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    return (hours || 0) * 60 + (minutes || 0);
  };

  const minutesToTime = (minutesTotal: number) => {
    const normalized = ((minutesTotal % 1440) + 1440) % 1440;
    const hours = Math.floor(normalized / 60);
    const minutes = normalized % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  const shiftTime = (time: string, deltaMinutes: number) => {
    return minutesToTime(timeToMinutes(time) + deltaMinutes);
  };

  const handleAddMedication = (medication: Omit<Medication, 'id'>) => {
    const newMedication: Medication = {
      ...medication,
      id: `med-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      frequency: medication.frequency || 'QD - Once daily'
    };
    setMedications(prev => [newMedication, ...prev]);
  };

  const handleRemoveMedication = (id: string) => {
    setMedications(prev => prev.filter(med => med.id !== id));
  };

  const handleClearAllMedications = () => {
    setMedications([]);
    setSchedule([]);
    setInteractions([]);
  };

  const handleUpdateFrequency = (id: string, frequency: string) => {
    setMedications(prev => prev.map(med => 
      med.id === id ? { ...med, frequency } : med
    ));
  };

  const getSpecificFoodGuidance = (genericName: string) => {
    return 'Take with food unless otherwise directed';
  };

  const handleEditToggle = () => {
    setIsEditingTimes(!isEditingTimes);
    if (!isEditingTimes) {
      setEditedSchedule([...schedule]);
    }
  };

  const handleTimeChange = (index: number, newTime: string) => {
    setEditedSchedule(prev => {
      const current = prev[index];
      if (!current) return prev;

      const deltaMinutes = timeToMinutes(newTime) - timeToMinutes(current.time);

      return prev.map(item => ({
        ...item,
        time: shiftTime(item.time, deltaMinutes)
      }));
    });
  };

  const handleCancelEdit = () => {
    setIsEditingTimes(false);
    setEditedSchedule([]);
  };

  const handleApplyTimeChanges = () => {
    setSchedule([...editedSchedule].sort((a, b) => a.time.localeCompare(b.time)));
    setIsEditingTimes(false);
  };

  const handleOptimizeSchedule = async () => {
    if (medications.length === 0) return;

    setIsGeneratingSchedule(true);
    setLoadingStep(0);

    try {
      setLoadingStep(1);
      const response = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ medications })
      });

      setLoadingStep(3);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to generate schedule');
      }

      setLoadingStep(4);
      setSchedule(Array.isArray(data?.schedule) ? data.schedule : []);
      setInteractions(Array.isArray(data?.interactions) ? data.interactions : []);
    } catch (error) {
      console.error('Error optimizing schedule:', error);
    } finally {
      setIsGeneratingSchedule(false);
      setLoadingStep(0);
    }
  };

  const handleDownloadPDF = () => {
    if (schedule.length === 0) return;

    import('jspdf').then((jsPDF) => {
      import('jspdf-autotable').then((autoTable) => {
        const doc = new jsPDF.default({
          orientation: 'landscape',
          unit: 'mm',
          format: 'a4'
        });
        
        doc.setFont('helvetica');
        doc.setFontSize(18);
        doc.setTextColor(0, 77, 64);
        doc.text('Medication Schedule', 148, 16, { align: 'center' });
        
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`Generated: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, 148, 23, { align: 'center' });
        
        doc.setFontSize(9);
        doc.setTextColor(50, 50, 50);
        doc.text('Patient Information:', 20, 32);
        doc.setFontSize(8);
        doc.text('Name: ______________________    Date: ______________________', 20, 38);
        doc.text('Physician: ____________________    Phone: ______________________', 20, 44);
        
        const tableData: any[] = [];

        const getFoodGuidanceForPdf = (med: any) => {
          const raw = (med?.timing_info?.with_food || '').toString().trim();
          const lower = raw.toLowerCase();
          if (!raw) return '';
          if (
            lower.includes('consult pharmacist') ||
            lower.includes('no standard timing guideline') ||
            lower.includes('take with or without food') ||
            lower.includes('take with food unless otherwise directed') ||
            lower.includes('as directed')
          ) {
            return '';
          }
          if (lower.includes('avoid grapefruit')) return 'Avoid grapefruit';
          if (lower.includes('empty stomach')) return 'Empty stomach';
          if (lower.includes('before') && lower.includes('meal')) return 'Before meals';
          if (lower.includes('with food') || lower.includes('with meals') || lower.includes('with meal')) return 'With food';
          if (raw.length > 48) return `${raw.slice(0, 45)}...`;
          return raw;
        };

        const sortedSchedule = [...schedule].sort((a: any, b: any) => (a.time || '').localeCompare(b.time || ''));
        
        sortedSchedule.forEach((slot: any) => {
          slot.medications.forEach((med: any, medIndex: number) => {
            const foodInstruction = getFoodGuidanceForPdf(med);
            
            const medName = med.brand_name || med.name || 'Unknown Medication';
            const dosage = med.strength || 'As prescribed';
            const frequency = med.frequency || 'As directed';
            
            tableData.push([
              medIndex === 0 ? (slot.time || 'Scheduled Time') : '',
              medName,
              dosage,
              frequency,
              foodInstruction
            ]);
          });
        });
        
        (autoTable as any).default(doc, {
          head: [
            ['Time', 'Medication', 'Dosage', 'Frequency', 'Food Instructions']
          ],
          body: tableData,
          startY: 52,
          margin: { left: 10, right: 10, top: 10, bottom: 10 },
          rowPageBreak: 'avoid',
          styles: {
            font: 'helvetica',
            fontSize: 8,
            cellPadding: 2,
            lineWidth: 0.1,
            lineColor: [200, 200, 200],
            overflow: 'ellipsize',
            fillColor: [255, 255, 255]
          },
          headStyles: {
            fillColor: [41, 128, 185],
            textColor: 255,
            fontSize: 9,
            fontStyle: 'bold',
            lineWidth: 0.2,
            lineColor: [200, 200, 200]
          },
          alternateRowStyles: {
            fillColor: [248, 248, 248]
          },
          columnStyles: {
            0: { cellWidth: 22, fillColor: [230, 244, 255] },
            1: { cellWidth: 70, fontStyle: 'bold' },
            2: { cellWidth: 26 },
            3: { cellWidth: 30 },
            4: { cellWidth: 'auto' }
          }
        });
        
        doc.save(`medication-schedule-${new Date().toISOString().split('T')[0]}.pdf`);
        
      });
    });
  };

  const handleAddToCalendar = () => {
    if (schedule.length === 0) return;

    const today = new Date();
    const icsEvents: string[] = [];
    
    icsEvents.push('BEGIN:VCALENDAR');
    icsEvents.push('VERSION:2.0');
    icsEvents.push('PRODID:-//Medication Timing Optimizer//Medication Schedule//EN');
    icsEvents.push('CALSCALE:GREGORIAN');
    icsEvents.push('METHOD:PUBLISH');
    
    schedule.forEach((slot: any) => {
      slot.medications.forEach((med: any) => {
        const [hours, minutes] = slot.time.split(':');
        const eventDate = new Date(today);
        eventDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        
        const startTime = eventDate.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
        const endTime = new Date(eventDate.getTime() + 15 * 60000).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
        
        const description = `${med.brand_name || med.name || 'Medication'} - ${med.strength || 'As prescribed'} - ${med.frequency || 'As directed'}`;
        
        icsEvents.push('BEGIN:VEVENT');
        icsEvents.push(`UID:${med.din || 'med'}-${slot.time}@medication-optimizer.com`);
        icsEvents.push(`DTSTART:${startTime}`);
        icsEvents.push(`DTEND:${endTime}`);
        icsEvents.push(`SUMMARY:${med.brand_name || med.name || 'Medication'}`);
        icsEvents.push(`DESCRIPTION:${description}`);
        icsEvents.push('END:VEVENT');
      });
    });
    
    icsEvents.push('END:VCALENDAR');
    
    const icsContent = icsEvents.join('\r\n');
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `medication-schedule-${today.toISOString().split('T')[0]}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    alert('Calendar file downloaded! This .ics file works with Google Calendar, Apple Calendar, Outlook, and most calendar applications.');
  };

  const getInteractionAdvice = (severity: string) => {
    switch (severity) {
      case 'Major':
        return {
          color: [220, 53, 69],
          text: 'HIGH RISK',
          advice: 'Consult healthcare provider immediately'
        };
      case 'Moderate':
        return {
          color: [255, 193, 7],
          text: 'MODERATE',
          advice: 'Monitor for side effects'
        };
      case 'Minor':
        return {
          color: [40, 167, 69],
          text: 'LOW RISK',
          advice: 'Generally safe to take together'
        };
      default:
        return {
          color: [108, 117, 125],
          text: 'UNKNOWN',
          advice: 'Consult healthcare provider'
        };
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-block">
            <h1 className="text-4xl sm:text-5xl font-bold text-white bg-gradient-to-r from-green-600 to-emerald-600 px-8 py-4 rounded-2xl shadow-xl mb-4 transform hover:scale-105 transition-all duration-300">
              Medication Timing Optimizer
            </h1>
          </div>
          <p className="text-lg text-gray-700 max-w-2xl mx-auto mb-6 leading-relaxed">
            Organize your medications by optimal timing and check for potential interactions
          </p>
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-6 max-w-2xl mx-auto shadow-sm">
            <p className="text-sm text-amber-800 font-medium leading-relaxed">
              <span className="font-bold text-amber-900">⚠️ Disclaimer:</span> This tool is for general informational purposes only. 
              Always consult with your healthcare provider before making any changes to your medication schedule. 
              Individual medical needs may vary.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl shadow-lg border border-green-100 p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                  <Plus className="w-5 h-5 text-white" />
                </div>
                Add Your Medications
              </h2>
              
              <DrugSearch 
                onAddMedication={handleAddMedication}
              />

              {medications.length > 0 && (
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={handleClearAllMedications}
                    className="bg-gradient-to-r from-red-500 to-rose-600 text-white px-6 py-3 rounded-xl font-medium hover:from-red-600 hover:to-rose-700 transition-all duration-300 transform hover:scale-105 flex items-center gap-2 text-sm shadow-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                    Clear All Medications
                  </button>
                </div>
              )}

              {medications.length > 0 && (
                <div className="mt-6">
                  <MedicationList 
                    medications={medications}
                    onRemove={handleRemoveMedication}
                    onUpdateFrequency={handleUpdateFrequency}
                    getSpecificFoodGuidance={getSpecificFoodGuidance}
                  />
                </div>
              )}
            </div>

            {medications.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg border border-green-100 p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                    <Clock className="w-5 h-5 text-white" />
                  </div>
                  Generate Schedule
                </h2>
                
                <button
                  onClick={handleOptimizeSchedule}
                  disabled={isGeneratingSchedule}
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white px-8 py-4 rounded-xl font-semibold hover:from-green-700 hover:to-emerald-700 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-3 shadow-xl text-lg"
                >
                  {isGeneratingSchedule ? (
                    <>
                      <div className="relative">
                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent"></div>
                      </div>
                      <span>AI is optimizing your schedule...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-6 h-6" />
                      <span>Optimize Medication Timing</span>
                    </>
                  )}
                </button>

                {isGeneratingSchedule && (
                  <div className="mt-6 text-center">
                    <p className="text-lg text-gray-700 mb-4 font-medium">
                      {loadingStep === 1 && '🔍 Analyzing medications...'}
                      {loadingStep === 2 && '⚡ Checking drug interactions...'}
                      {loadingStep === 3 && '🧠 Optimizing timing...'}
                      {loadingStep === 4 && '✨ Generating schedule...'}
                    </p>
                    <div className="w-full bg-gray-200 rounded-full h-4 shadow-inner overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-green-600 to-emerald-600 h-4 rounded-full transition-all duration-500 shadow-lg"
                        style={{ width: `${(loadingStep / 4) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* SCHEDULE SECTION - APPEARS AFTER GENERATION */}
            {schedule.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg border border-green-100 p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                  <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-white" />
                    </div>
                    Your Optimized Schedule
                  </h2>
                  
                  <div className="flex items-center gap-3">
                    {!isEditingTimes ? (
                      <button
                        onClick={handleEditToggle}
                        className="bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 px-6 py-3 rounded-xl text-sm font-medium hover:from-gray-200 hover:to-gray-300 transition-all duration-300 transform hover:scale-105 flex items-center gap-2 shadow-md"
                      >
                        <Edit2 className="w-4 h-4" />
                        Edit Times
                      </button>
                    ) : (
                      <div className="flex items-center gap-3">
                        <button
                          onClick={handleCancelEdit}
                          className="bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 px-6 py-3 rounded-xl text-sm font-medium hover:from-gray-200 hover:to-gray-300 transition-all duration-300 transform hover:scale-105 flex items-center gap-2 shadow-md"
                        >
                          <X className="w-4 h-4" />
                          Cancel
                        </button>
                        <button
                          onClick={handleApplyTimeChanges}
                          className="bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 px-6 py-3 rounded-xl text-sm font-medium hover:from-green-200 hover:to-emerald-200 transition-all duration-300 transform hover:scale-105 flex items-center gap-2 shadow-md"
                        >
                          <Save className="w-4 h-4" />
                          Save
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                
                <Timeline 
                  schedule={isEditingTimes ? editedSchedule : schedule}
                  isEditing={isEditingTimes}
                  onTimeChange={handleTimeChange}
                />

                <div className="mt-8 flex flex-col sm:flex-row gap-4">
                  <button
                    onClick={handleDownloadPDF}
                    className="flex-1 bg-gradient-to-r from-red-600 to-rose-600 text-white px-8 py-4 rounded-xl font-semibold hover:from-red-700 hover:to-rose-700 transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-3 shadow-xl text-lg"
                  >
                    <Download className="w-6 h-6" />
                    Download PDF
                  </button>
                  <button
                    onClick={handleAddToCalendar}
                    className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-8 py-4 rounded-xl font-semibold hover:from-green-700 hover:to-emerald-700 transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-3 shadow-xl text-lg"
                  >
                    <Calendar className="w-6 h-6" />
                    Add to Calendar
                  </button>
                </div>
              </div>
            )}

            {schedule.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg border border-red-100 p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-red-500 to-rose-500 rounded-lg flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-white" />
                  </div>
                  Drug Interactions
                </h2>
                
                <InteractionWarnings interactions={interactions} />
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-lg border border-green-100 p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                  <span className="text-white text-sm font-bold">?</span>
                </div>
                How It Works
              </h3>
              <div className="space-y-5 text-gray-700">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 shadow-lg">1</div>
                  <p className="text-base font-medium leading-relaxed">Add your medications using smart search</p>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 shadow-lg">2</div>
                  <p className="text-base font-medium leading-relaxed">Click "Optimize" to analyze timing and interactions</p>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 shadow-lg">3</div>
                  <p className="text-base font-medium leading-relaxed">Review your personalized medication schedule</p>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 shadow-lg">4</div>
                  <p className="text-base font-medium leading-relaxed">Download PDF or add to your calendar</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg border border-green-100 p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                  <span className="text-white text-sm">✓</span>
                </div>
                Key Features
              </h3>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg">
                    <span className="text-white text-sm">✓</span>
                  </div>
                  <p className="text-base font-medium text-gray-700 leading-relaxed">AI-powered medication timing optimization</p>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg">
                    <span className="text-white text-sm">✓</span>
                  </div>
                  <p className="text-base font-medium text-gray-700 leading-relaxed">Drug interaction checking and warnings</p>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg">
                    <span className="text-white text-sm">✓</span>
                  </div>
                  <p className="text-base font-medium text-gray-700 leading-relaxed">Food interaction guidance</p>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg">
                    <span className="text-white text-sm">✓</span>
                  </div>
                  <p className="text-base font-medium text-gray-700 leading-relaxed">PDF and calendar export options</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
