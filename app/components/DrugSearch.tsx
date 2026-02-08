'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Fuse from 'fuse.js';
import { Search, Plus, Pill, Mic, MicOff, Database, CheckCircle } from 'lucide-react';

interface Drug {
  din: string;
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
  // LNHPD integration fields
  source?: 'DPD' | 'LNHPD';
  lnhpd_id?: string;
  product_purpose?: string;
  risks?: string;
  medicinal_ingredients?: any[];
  // Combination medication fields
  isCombination?: boolean;
  components?: Array<{
    generic_name: string;
    strength: string;
    din: string;
  }>;
}

interface DrugSearchProps {
  onAddMedication: (medication: Omit<Drug, 'din'>) => void;
  onMedicationEnhanced?: (medicationId: string, umlsData: { rxcui: string; umlsEnhanced: boolean }) => void;
}

export default function DrugSearch({ onAddMedication, onMedicationEnhanced }: DrugSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Drug[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [allDrugs, setAllDrugs] = useState<Drug[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [umlsLookupStatus, setUmlsLookupStatus] = useState<{ [key: string]: 'pending' | 'success' | 'failed' }>({});
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadDrugs = async () => {
      try {
        const response = await fetch('/data/medication_database.json');
        const drugs = await response.json();
        setAllDrugs(drugs);
        
        // Initialize Fuse.js
        const fuse = new Fuse(drugs, {
          keys: [
            { name: 'brand_name', weight: 0.4 },
            { name: 'generic_name', weight: 0.4 },
            { name: 'strength', weight: 0.1 },
            { name: 'dosage_form', weight: 0.1 }
          ],
          threshold: 0.3,
          includeScore: true,
          minMatchCharLength: 2
        });
        
        // Store fuse instance for later use
        (window as any).drugFuse = fuse;
      } catch (error) {
        console.error('Error loading drug database:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDrugs();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const performSearch = useCallback(async () => {
    if (query.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    try {
      // First, get DPD results (existing functionality)
      const fuse = (window as any).drugFuse;
      let dpdResults: any[] = [];
      
      if (fuse) {
        const searchResults = fuse.search(query, { limit: 50 }); // Limit results for performance
        dpdResults = searchResults.map((result: any) => ({ ...result.item, source: 'DPD' }));
      }

      // Then, try to get LNHPD results (new functionality) - but only if DPD has few results
      let lnhpdResults: any[] = [];
      const queryLower = query.toLowerCase().trim();
      const likelyNhpKeyword =
        queryLower.includes('vitamin') ||
        queryLower.includes('supplement') ||
        queryLower.includes('omega') ||
        queryLower.includes('fish oil') ||
        queryLower.includes('probiotic') ||
        queryLower.includes('melatonin') ||
        queryLower.includes('centrum') ||
        queryLower.includes('multivitamin') ||
        queryLower.includes('turmeric') ||
        queryLower.includes('collagen');

      let isLikelyNhp = likelyNhpKeyword;

      if (!isLikelyNhp) {
        try {
          const checkResponse = await fetch(`/api/lnhpd?action=check&searchTerm=${encodeURIComponent(query)}`);
          if (checkResponse.ok) {
            const checkData = await checkResponse.json();
            isLikelyNhp = Boolean(checkData?.data?.isLikelyNHP);
          }
        } catch {
          // Ignore check failures and continue with keyword/DPD heuristics
        }
      }

      if (isLikelyNhp || dpdResults.length < 10) { // Fetch LNHPD if query looks like NHP or DPD results are limited
        try {
          const lnhpdResponse = await fetch('/api/lnhpd', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ searchTerm: query, action: 'convert' })
          });
          
          if (lnhpdResponse.ok) {
            const lnhpdData = await lnhpdResponse.json();
            if (lnhpdData.success) {
              lnhpdResults = lnhpdData.data.slice(0, 20).map((item: any) => ({ ...item, source: 'LNHPD' })); // Limit LNHPD results
            }
          }
        } catch (lnhpdError) {
          console.log('LNHPD search failed, using DPD only:', lnhpdError);
          // Continue with DPD results only
        }
      }

      // Combine results
      const combinedResults = [...dpdResults, ...lnhpdResults];
      
      // Remove duplicates more efficiently using a Map
      const uniqueMap = new Map();
      combinedResults.forEach(drug => {
        const key = `${drug.brand_name}-${drug.strength}-${drug.generic_name}`;
        if (!uniqueMap.has(key)) {
          uniqueMap.set(key, drug);
        }
      });
      const uniqueResults = Array.from(uniqueMap.values());

      // Group combination medications by brand name
      const groupedResults = groupCombinationMedications(uniqueResults);
      
      // Sort results: exact matches first, then by source priority
      const sortedResults = groupedResults.sort((a: Drug, b: Drug) => {
        const aBrandLower = a.brand_name.toLowerCase().trim();
        const bBrandLower = b.brand_name.toLowerCase().trim();
        
        // Check for exact match (case-insensitive, trimmed)
        const aExact = aBrandLower === queryLower;
        const bExact = bBrandLower === queryLower;
        
        // Check for starts with match (for better relevance)
        const aStarts = aBrandLower.startsWith(queryLower);
        const bStarts = bBrandLower.startsWith(queryLower);
        
        // Priority 1: Exact matches
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        
        // Priority 2: If both exact, prioritize LNHPD over DPD
        if (aExact && bExact) {
          if (a.source === 'LNHPD' && b.source === 'DPD') return -1;
          if (a.source === 'DPD' && b.source === 'LNHPD') return 1;
        }
        
        // Priority 3: Starts with matches
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        
        // Priority 4: If both start with, prioritize LNHPD over DPD
        if (aStarts && bStarts) {
          if (a.source === 'LNHPD' && b.source === 'DPD') return -1;
          if (a.source === 'DPD' && b.source === 'LNHPD') return 1;
        }
        
        // Priority 5: Alphabetical order
        return aBrandLower.localeCompare(bBrandLower);
      });

      setResults(sortedResults);
      setIsOpen(true);
      
    } catch (error) {
      console.error('Search error:', error);
      // Fallback to basic search if enhanced search fails
      const fuse = (window as any).drugFuse;
      if (fuse) {
        const searchResults = fuse.search(query);
        const fallbackResults = searchResults.map((result: any) => ({ ...result.item, source: 'DPD' }));
        setResults(fallbackResults);
        setIsOpen(true);
      }
    }
  }, [query]);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    // Add a small delay to avoid too many requests
    const timeoutId = setTimeout(performSearch, 300);
    return () => clearTimeout(timeoutId);
  }, [query]);

  const handleSelect = (drug: Drug) => {
    const { din, ...medicationData } = drug;
    
    // Generate medication ID first
    const medicationId = Date.now().toString();
    const medicationWithId = { ...medicationData, id: medicationId };
    
    onAddMedication(medicationData);
    setQuery('');
    setIsOpen(false);
    searchInputRef.current?.focus();

    // Background UMLS lookup (non-blocking)
    fetchUMLSEnhancement(medicationData.generic_name, medicationId);
  };

  // Background function to fetch UMLS enhancement
  const fetchUMLSEnhancement = async (drugName: string, medicationId: string) => {
    // Set initial status
    setUmlsLookupStatus(prev => ({ ...prev, [medicationId]: 'pending' }));
    
    try {
      const response = await fetch('/api/umls-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ drugName, action: 'rxnorm' })
      });
      
      const result = await response.json();
      
      if (result.success && result.data && onMedicationEnhanced) {
        console.log('UMLS enhancement for', drugName, ':', result.data);
        
        // Update status to success
        setUmlsLookupStatus(prev => ({ ...prev, [medicationId]: 'success' }));
        
        // Call the enhancement handler to update the medication
        onMedicationEnhanced(medicationId, { 
          rxcui: result.data, 
          umlsEnhanced: true 
        });
      } else {
        // Update status to failed
        setUmlsLookupStatus(prev => ({ ...prev, [medicationId]: 'failed' }));
      }
    } catch (error) {
      console.log('UMLS lookup failed for', drugName, ':', error);
      
      // Update status to failed
      setUmlsLookupStatus(prev => ({ ...prev, [medicationId]: 'failed' }));
      
      // Silently fail - medication still works without UMLS data
    }
  };

  // Group combination medications by brand name
  const groupCombinationMedications = (medications: Drug[]): Drug[] => {
    const brandGroups: { [brandName: string]: Drug[] } = {};
    
    // First pass: group by brand name
    medications.forEach(med => {
      const brandKey = med.brand_name.toLowerCase().trim();
      
      if (!brandGroups[brandKey]) {
        brandGroups[brandKey] = [];
      }
      brandGroups[brandKey].push(med);
    });
    
    // Second pass: identify combination medications and create combined entries
    const result: Drug[] = [];
    
    Object.values(brandGroups).forEach(group => {
      if (group.length > 1) {
        // Check if this is a combination medication
        const isCombination = isTrueCombination(group);
        
        if (isCombination) {
          // Create a combined medication entry
          const combinedMed = createCombinedMedication(group);
          if (combinedMed) {
            result.push(combinedMed);
          }
        } else {
          // Not a combination, add all medications as separate entries
          result.push(...group);
        }
      } else {
        // Single medication, add as-is
        result.push(...group);
      }
    });
    
    return result;
  };

  // More precise combination detection logic
  const isTrueCombination = (medications: Drug[]): boolean => {
    if (medications.length < 2) return false;
    
    // Extract base generic names (remove parentheses and content)
    const baseGenericNames = medications.map(med => {
      const baseName = med.generic_name.split('(')[0].trim();
      return baseName.toUpperCase();
    });
    
    // Get unique base generic names
    const uniqueGenericNames = [...new Set(baseGenericNames)];
    
    // Check for clear combination indicators
    const hasSlashInGeneric = medications.some(med => med.generic_name.includes('/'));
    const hasSlashInStrength = medications.some(med => med.strength.includes('/'));
    
    // Primary check: Different generic names with same brand = combination
    if (uniqueGenericNames.length > 1) {
      return true;
    }
    
    // Secondary check: Explicit slash separators in generic name or strength
    if (hasSlashInGeneric || hasSlashInStrength) {
      return true;
    }
    
    // Tertiary check: Same generic name but different chemical forms in parentheses
    // This helps catch cases where the same drug has different salt forms
    const hasDifferentForms = medications.some(med => {
      const match = med.generic_name.match(/\(([^)]+)\)/);
      return match && match[1].includes('/');
    });
    
    if (hasDifferentForms) {
      return true;
    }
    
    return false;
  };

  // Create a combined medication entry from multiple components
  const createCombinedMedication = (medications: Drug[]): Drug | null => {
    if (medications.length === 0) return null;
    
    const firstMed = medications[0];
    const genericNames = medications.map(med => {
      // Extract base generic name (remove parentheses and content)
      const baseName = med.generic_name.split('(')[0].trim();
      return baseName;
    }).filter(name => name && name !== '');
    
    const strengths = medications.map(med => med.strength).filter(strength => strength && strength !== '');
    
    // Create combined generic name
    const combinedGeneric = genericNames.join(' / ');
    
    // Create combined strength if not already combined
    let combinedStrength = firstMed.strength;
    if (!firstMed.strength.includes('/') && strengths.length > 1) {
      combinedStrength = strengths.join(' / ');
    }
    
    // Use the first medication's data as base, override with combined values
    const combinedMedication: Drug = {
      ...firstMed,
      generic_name: combinedGeneric,
      strength: combinedStrength,
      // Mark as combination for UI display
      isCombination: true,
      components: medications.map(med => ({
        generic_name: med.generic_name,
        strength: med.strength,
        din: med.din
      }))
    };
    
    return combinedMedication;
  };

  const startVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Voice input is not supported in your browser. Please try Chrome or Edge.');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = true;
    
    recognition.onstart = () => {
      setIsListening(true);
      setTranscript('');
    };
    
    recognition.onresult = (event: any) => {
      const current = event.resultIndex;
      const transcript = event.results[current][0].transcript;
      setTranscript(transcript);
      
      if (event.results[current].isFinal) {
        setQuery(transcript);
        setIsListening(false);
      }
    };
    
    recognition.onend = () => {
      setIsListening(false);
    };
    
    recognition.onerror = (event: any) => {
      console.error('Voice recognition error:', event.error);
      setIsListening(false);
      alert('Voice input error: ' + event.error);
    };
    
    recognition.start();
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'Cardiovascular': 'bg-teal-100 text-teal-800',
      'Diabetes': 'bg-emerald-100 text-emerald-800',
      'Gastrointestinal': 'bg-cyan-100 text-cyan-800',
      'Psychiatric': 'bg-purple-100 text-purple-800',
      'Endocrine': 'bg-blue-100 text-blue-800',
      'Respiratory': 'bg-sky-100 text-sky-800',
      'Other': 'bg-slate-100 text-slate-800'
    };
    return colors[category] || colors['Other'];
  };

  if (isLoading) {
    return (
      <div className="relative">
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-300">
          <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-gray-900 text-base">Loading medication database...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative" ref={searchRef}>
      {/* Data Source Indicator */}
      <div className="mb-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <Database className="w-4 h-4 text-blue-700" />
          <span className="text-sm font-semibold text-blue-900">Data Sources</span>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="px-2 py-1 bg-white border border-blue-300 text-blue-800 rounded-full font-medium">
            Health Canada DPD
          </span>
          <span className="px-2 py-1 bg-white border border-purple-300 text-purple-800 rounded-full font-medium flex items-center gap-1">
            UMLS/RxNorm
            <CheckCircle className="w-3 h-3 text-purple-600" />
          </span>
          <span className="px-2 py-1 bg-white border border-green-300 text-green-800 rounded-full font-medium">
            DDInter
          </span>
          <span className="px-2 py-1 bg-white border border-orange-300 text-orange-800 rounded-full font-medium flex items-center gap-1">
            LNHPD
            <CheckCircle className="w-3 h-3 text-orange-600" />
          </span>
        </div>
        <p className="text-xs text-blue-800 mt-2">
          Comprehensive medication data including prescription drugs, natural health products, vitamins, and supplements with standardized drug codes and interaction checking
        </p>
      </div>

      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        
        <input
          type="text"
          id="medication-search-input"
          name="medication-search-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setIsOpen(false);
              searchInputRef.current?.blur();
            }
          }}
          placeholder="Search medications..."
          className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-teal-300 focus:border-transparent text-base min-h-[44px] placeholder:text-gray-500 text-black"
          aria-label="Search medications"
        />
        
        {/* Voice Input Button */}
        <button
          onClick={startVoiceInput}
          className={`absolute inset-y-0 right-0 pr-3 flex items-center transition-all min-h-[44px] min-w-[44px] justify-center rounded-r-lg ${
            isListening 
              ? 'bg-red-500 text-white animate-pulse' 
              : 'bg-teal-600 hover:bg-teal-700 text-white'
          }`}
          aria-label={isListening ? "Stop voice input" : "Start voice input"}
        >
          {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>
      </div>

      {/* Show transcript while listening */}
      {isListening && (
        <div className="mt-2 p-3 bg-blue-50 border border-blue-300 rounded-lg">
          <p className="text-sm text-blue-900">
            🎤 Listening... Say medication name and dose
          </p>
          {transcript && (
            <p className="text-sm text-gray-700 mt-1">"{transcript}"</p>
          )}
        </div>
      )}

      {isOpen && results.length > 0 && (
        <div className="absolute z-10 w-full mt-2 bg-white border border-gray-300 rounded-lg shadow-lg max-h-80 overflow-y-auto">
          {results.slice(0, 10).map((drug, index) => (
            <div
              key={`${drug.din}-${index}`}
              onClick={() => handleSelect(drug)}
              className="p-4 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-300"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleSelect(drug);
                }
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Pill className={`w-4 h-4 flex-shrink-0 ${drug.source === 'LNHPD' ? 'text-orange-600' : 'text-teal-700'}`} />
                    <span className={`font-semibold text-black ${drug.source === 'LNHPD' ? 'text-base' : 'truncate text-base'}`}>
                      {drug.brand_name}
                    </span>
                    {drug.source === 'LNHPD' && (
                      <span className="px-2 py-0.5 bg-orange-100 text-orange-800 text-xs font-medium rounded-full border border-orange-200">
                        Natural Health Product
                      </span>
                    )}
                    {drug.isCombination && (
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-xs font-medium rounded-full border border-purple-200">
                        Combination
                      </span>
                    )}
                  </div>
                  <div className={`text-sm text-gray-900 mb-1 ${drug.source === 'LNHPD' ? '' : 'truncate'}`}>
                    {drug.generic_name}
                  </div>
                  <div className="flex items-center gap-2 text-xs mb-1">
                    <span className="font-medium text-black">
                      {drug.strength}
                    </span>
                    <span className="text-gray-600">•</span>
                    <span className="text-black">
                      {drug.dosage_form}
                    </span>
                    {drug.source === 'LNHPD' && drug.lnhpd_id && (
                      <>
                        <span className="text-gray-600">•</span>
                        <span className="text-orange-700 font-medium">
                          NPN: {drug.lnhpd_id}
                        </span>
                      </>
                    )}
                  </div>
                  {drug.source === 'LNHPD' && drug.product_purpose && (
                    <div className="text-xs text-orange-800 bg-orange-50 px-2 py-1 rounded border border-orange-200">
                      <span className="font-medium">Use:</span> {drug.product_purpose}
                    </div>
                  )}
                  {drug.isCombination && drug.components && (
                    <div className="text-xs text-purple-800 bg-purple-50 px-2 py-1 rounded border border-purple-200">
                      <span className="font-medium">Components:</span>
                      <ul className="mt-1 space-y-0.5">
                        {drug.components.map((component, idx) => (
                          <li key={idx} className="text-purple-700">
                            • {component.generic_name} {component.strength}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(drug.category)}`}>
                    {drug.category}
                  </span>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Database className="w-3 h-3" />
                    <span>{drug.source || 'DPD'}</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelect(drug);
                    }}
                    className={`p-2 hover:opacity-90 text-white rounded-full transition-colors focus:outline-none focus:ring-4 focus:ring-teal-300 min-h-[44px] min-w-[44px] flex items-center justify-center ${
                      drug.source === 'LNHPD' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-teal-700 hover:bg-teal-800'
                    }`}
                    aria-label={`Add ${drug.brand_name} to medications`}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isOpen && results.length === 0 && query.length >= 2 && (
        <div className="absolute z-10 w-full mt-2 bg-white border border-gray-300 rounded-lg shadow-lg p-4">
          <div className="text-center text-gray-900">
            <Search className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p className="text-base text-black font-medium">No medications found</p>
            <p className="text-sm text-gray-900 mt-1">Try a different search term</p>
          </div>
        </div>
      )}
    </div>
  );
}
