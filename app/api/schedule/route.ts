import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import { rateLimitMiddleware } from '@/lib/rate-limiter';

// Helper functions for combination medication detection
function detectCombinationMedication(med: any): boolean {
  const brandName = (med.brand_name || '').toLowerCase();
  const genericName = (med.generic_name || '').toLowerCase();
  const strength = med.strength || '';
  
  // Check for strength-based combinations (e.g., "0.3%/0.1%")
  if (strength.includes('/') || strength.includes('+')) {
    return true;
  }
  
  // Check for known combination brand names
  const knownCombinations = [
    'tobradex', 'combigan', 'cosopt', 'xalacom', 'simbrinza', 'rocklatan',
    'duotrav', 'ganfort', 'azarga', 'taptiqom', 'vyvansi', 'mycombin'
  ];
  
  for (const combo of knownCombinations) {
    if (brandName.includes(combo)) {
      return true;
    }
  }
  
  // Check for generic name combinations
  if (genericName.includes('/') || genericName.includes(' and ') || genericName.includes(' + ')) {
    return true;
  }
  
  // Check for combination keywords
  const comboKeywords = ['combination', 'combo'];
  for (const keyword of comboKeywords) {
    if (brandName.includes(keyword) || genericName.includes(keyword)) {
      console.log(`✅ Found keyword combination: ${keyword}`);
      return true;
    }
  }
  
  console.log(`❌ No combination detected for: ${brandName}`);
  return false;
}

function extractCombinationComponents(med: any): string[] {
  const brandName = med.brand_name || '';
  const genericName = med.generic_name || '';
  const strength = med.strength || '';
  
  // Extract components from strength (e.g., "0.3%/0.1%" -> ["tobramycin", "dexamethasone"])
  if ((strength.includes('/') || strength.includes('+')) && (genericName.includes('/') || genericName.includes(' and '))) {
    return genericName.split(/\/|\sand\s/).map((s: string) => s.trim()).filter((s: string) => s);
  }
  
  // Extract from common combination names
  const knownCombinations: { [key: string]: string[] } = {
    'tobradex': ['tobramycin', 'dexamethasone'],
    'combigan': ['brimonidine', 'timolol'],
    'cosopt': ['dorzolamide', 'timolol'],
    'xalacom': ['latanoprost', 'timolol'],
    'simbrinza': ['brinzolamide', 'brimonidine'],
    'rocklatan': ['netarsudil', 'latanoprost']
  };
  
  const lowerBrand = brandName.toLowerCase();
  for (const [combo, components] of Object.entries(knownCombinations)) {
    if (lowerBrand.includes(combo)) {
      return components;
    }
  }
  
  // Extract from generic name if it contains multiple ingredients
  if (genericName.includes('/') || genericName.includes(' and ')) {
    return genericName.split(/\/|\sand\s/).map((s: string) => s.trim()).filter((s: string) => s);
  }
  
  return [];
}

function groupCombinationMedications(medications: any[]): any[] {
  console.log('🔄 DEBUG: Starting combination grouping...');
  console.log('📊 DEBUG: Input medications:', medications.map(m => ({ brand: m.brand_name, generic: m.generic_name, is_combo: m.is_combination, components: m.combination_components })));
  
  const grouped: { [key: string]: any[] } = {};
  const nonCombinations: any[] = [];
  
  medications.forEach(med => {
    console.log(`🔍 DEBUG: Processing: ${med.brand_name} - is_combination: ${med.is_combination}`);
    
    if (med.is_combination && med.combination_components && med.combination_components.length > 0) {
      // Create a key based on combination components (sorted for consistency)
      const comboKey = med.combination_components.sort().join('-');
      console.log(`🔗 DEBUG: Grouping under key: ${comboKey}`);
      
      if (!grouped[comboKey]) {
        grouped[comboKey] = [];
      }
      grouped[comboKey].push(med);
    } else {
      // Check if this medication is similar to any existing combination
      const brandName = (med.brand_name || '').toLowerCase();
      const genericName = (med.generic_name || '').toLowerCase();
      
      let foundGroup = false;
      
      // Check against existing groups for similar medications
      for (const [groupKey, groupMeds] of Object.entries(grouped)) {
        const firstMed = groupMeds[0];
        const firstBrand = (firstMed.brand_name || '').toLowerCase();
        const firstGeneric = (firstMed.generic_name || '').toLowerCase();
        
        // Check if brand names are similar (remove common suffixes/prefixes)
        const normalizeBrand = (brand: string) => {
          return brand.replace(/\s+(st|susp|ointment|cream|tablet|capsule)$/i, '')
                    .replace(/\s+(eye|oral|topical)$/i, '');
        };
        
        const normalizedCurrentBrand = normalizeBrand(brandName);
        const normalizedGroupBrand = normalizeBrand(firstBrand);
        
        // Check if normalized brands are the same or very similar
        if (normalizedCurrentBrand === normalizedGroupBrand || 
            normalizedCurrentBrand.includes(normalizedGroupBrand) ||
            normalizedGroupBrand.includes(normalizedCurrentBrand)) {
          console.log(`� DEBUG: Found similar brand: ${brandName} -> ${firstBrand}`);
          groupMeds.push(med);
          foundGroup = true;
          break;
        }
        
        // Check if generic names have the same components in different order
        const currentComponents = genericName.split(/[\s\/\+]+/).filter((p: string) => p.length > 2).sort();
        const groupComponents = firstGeneric.split(/[\s\/\+]+/).filter((p: string) => p.length > 2).sort();
        
        if (currentComponents.length === groupComponents.length && 
            currentComponents.every((comp: string) => groupComponents.includes(comp))) {
          console.log(`🔗 DEBUG: Found similar generic components: ${genericName} -> ${firstGeneric}`);
          groupMeds.push(med);
          foundGroup = true;
          break;
        }
      }
      
      if (!foundGroup) {
        console.log(`�📋 DEBUG: Adding to non-combinations: ${med.brand_name}`);
        nonCombinations.push(med);
      }
    }
  });
  
  console.log('📦 DEBUG: Grouped combinations:', Object.keys(grouped));
  console.log('📋 DEBUG: Non-combinations:', nonCombinations.map(m => m.brand_name));
  
  // For each group, create a single combined medication entry
  const combinedMeds = Object.values(grouped).map(group => {
    console.log(`🔗 DEBUG: Processing group of ${group.length} medications`);
    
    if (group.length === 1) {
      const med = group[0];
      // Even single combination meds should be marked clearly
      if (med.is_combination && med.combination_components && med.combination_components.length > 0) {
        const combined = {
          ...med,
          brand_name: `${med.brand_name || med.name || 'Unknown'} (Combination)`,
          generic_name: med.combination_components.join(' + '),
          is_combination: true,
          combination_medications: group
        };
        console.log(`✅ DEBUG: Created single combination: ${combined.brand_name}`);
        return combined;
      }
      console.log(`📋 DEBUG: Keeping as single medication: ${med.brand_name}`);
      return med;
    }
    
    // Create combined entry for multiple related medications
    const firstMed = group[0];
    const combined = {
      ...firstMed,
      brand_name: `${firstMed.brand_name || firstMed.name || 'Unknown'} (Combination)`,
      generic_name: firstMed.combination_components ? firstMed.combination_components.join(' + ') : firstMed.generic_name || firstMed.generic || 'Unknown',
      is_combination: true,
      combination_medications: group
    };
    
    console.log(`✅ DEBUG: Created multi-combination: ${combined.brand_name}`);
    return combined;
  });
  
  // Sort: combinations first, then by brand name
  const result = [...combinedMeds, ...nonCombinations].sort((a, b) => {
    // Put combination medications first
    if (a.is_combination && !b.is_combination) return -1;
    if (!a.is_combination && b.is_combination) return 1;
    
    // Then sort by brand name
    const aName = (a.brand_name || '').toLowerCase();
    const bName = (b.brand_name || '').toLowerCase();
    return aName.localeCompare(bName);
  });
  
  console.log('🎯 DEBUG: Final result:', result.map(m => ({ brand: m.brand_name, is_combo: m.is_combination })));
  return result;
}

interface Medication {
  id: string;
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
  frequency: string;
  is_combination?: boolean;
  combination_components?: string[] | null;
  combination_medications?: Medication[] | null;
  name?: string; // API response format
  generic?: string; // API response format
  rxcui?: string;
  umlsEnhanced?: boolean;
  umlsCUI?: string;
  source?: 'DPD' | 'LNHPD';
  lnhpd_id?: string;
  product_purpose?: string;
  risks?: string;
  medicinal_ingredients?: any[];
  // New combination fields from DrugSearch
  isCombination?: boolean;
  components?: Array<{
    generic_name: string;
    strength: string;
    din: string;
  }>;
}

interface Interaction {
  drug1: string;
  drug2: string;
  severity: 'Major' | 'Moderate' | 'Minor';
}

interface ScheduleItem {
  time: string;
  medications: Medication[];
}

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Starting POST /api/schedule');
    
    // Apply rate limiting
    const rateLimitResult = rateLimitMiddleware(request, 50, 15 * 60 * 1000); // 50 requests per 15 minutes
    if (!rateLimitResult.success) {
      return rateLimitResult.response!;
    }

    // Validate request origin in production
    const origin = request.headers.get('origin');
    const allowedOrigins: string[] = [
      'http://localhost:3000',
      'https://medication-timing-optimizer-abc.vercel.app', // Your actual Vercel URL
      'https://*.vercel.app', // Allow all Vercel deployments
      process.env.NEXT_PUBLIC_SITE_URL
    ].filter((item): item is string => Boolean(item));
    
    // More flexible origin checking for Vercel
    const isAllowedOrigin = !origin || // Allow requests with no origin (like mobile apps)
      allowedOrigins.some((allowed: string) => {
        if (allowed.includes('*')) {
          const pattern = allowed.replace('*', '.*');
          return new RegExp(`^${pattern}$`).test(origin);
        }
        return allowed === origin;
      });
    
    if (process.env.NODE_ENV === 'production' && origin && !isAllowedOrigin) {
      console.log('Blocked origin:', origin);
      return NextResponse.json(
        { error: 'Unauthorized origin' },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    const { medications } = body;

    console.log('🔍 DEBUG: Raw request body:', JSON.stringify(body, null, 2));
    console.log('🔍 DEBUG: Medications from request:', JSON.stringify(medications, null, 2));

    if (!medications || medications.length === 0) {
      console.log('❌ No medications provided');
      return NextResponse.json(
        { error: 'No medications provided' },
        { status: 400 }
      );
    }

    console.log(`✅ Received ${medications.length} medications`);

    // Process medications and identify combination products
    const processedMedications = medications.map((med: any, index: number) => {
      const isCombination = Boolean(med.isCombination) || detectCombinationMedication(med);
      const derivedCombinationComponents = Array.isArray(med.components)
        ? med.components.map((c: any) => c?.generic_name).filter(Boolean)
        : null;
      
      const processed = {
        ...med,
        brand_name: med.brand_name || med.generic_name || `Medication ${index + 1}`,
        generic_name: med.generic_name || med.brand_name || `Medication ${index + 1}`,
        frequency: med.frequency || 'QD - Once daily',
        timing_info: getMedicationTimingInfo(med, isCombination),
        is_combination: isCombination,
        combination_components: isCombination
          ? (derivedCombinationComponents && derivedCombinationComponents.length > 0
              ? derivedCombinationComponents
              : extractCombinationComponents(med))
          : null
      };
      
      console.log(`✅ DEBUG: Processed Medication ${index + 1}:`, {
        brand_name: processed.brand_name,
        generic_name: processed.generic_name,
        frequency: processed.frequency,
        timing_info: processed.timing_info,
        is_combination: processed.is_combination,
        combination_components: processed.combination_components
      });
      
      return processed;
    });

    // Group combination medications together and sort properly
    const groupedMedications = groupCombinationMedications(processedMedications);
    
    // Sort medications: combinations first, then by brand name
    const sortedMedications = groupedMedications.sort((a, b) => {
      // Put combination medications first
      if (a.is_combination && !b.is_combination) return -1;
      if (!a.is_combination && b.is_combination) return 1;
      
      // Then sort by brand name
      const aName = (a.brand_name || '').toLowerCase();
      const bName = (b.brand_name || '').toLowerCase();
      return aName.localeCompare(bName);
    });

    console.log('✅ DEBUG: Final processed medications:', JSON.stringify(sortedMedications, null, 2));

    // Load drug interactions database
    const interactionsPath = path.join(process.cwd(), 'public', 'data', 'drug_interactions.json');
    const interactionsData = JSON.parse(fs.readFileSync(interactionsPath, 'utf8'));

    // Check for interactions between medications
    const foundInteractions: Interaction[] = [];

    const allowedSeverities = new Set(['Major', 'Moderate', 'Minor']);
    
    // Extract medication names with better matching logic
    const medicationNames = processedMedications.map((med: any) => {
      let genericName = med.generic_name.toLowerCase();
      
      // Extract base drug name from complex generic names
      // Remove salt forms, parentheses content, and standardize
      genericName = genericName
        .split('(')[0] // Remove content in parentheses
        .replace(/\s+(sodium|potassium|calcium|magnesium|hydrochloride|hemi-hydrate|anhydrous|sulfate|fumarate|maleate|tartrate|mesylate|besylate|hydrochloride)$/i, '') // Remove common salt forms
        .replace(/\s+(hcl|hbr)$/i, '') // Remove abbreviations
        .trim();
      
      console.log(`🔍 Extracted drug name: ${med.generic_name} -> ${genericName}`);
      return genericName;
    });

    // Comprehensive critical interactions database from Health Canada DPD, UMLS, and DDInter
    const criticalInteractions: Array<{drug1: string, drug2: string, severity: 'Major' | 'Moderate' | 'Minor', source?: string}> = [
      // Warfarin interactions (extremely critical)
      { drug1: 'warfarin', drug2: 'levofloxacin', severity: 'Major', source: 'Health Canada' },
      { drug1: 'levofloxacin', drug2: 'warfarin', severity: 'Major', source: 'Health Canada' },
      { drug1: 'warfarin', drug2: 'ciprofloxacin', severity: 'Major', source: 'Health Canada' },
      { drug1: 'ciprofloxacin', drug2: 'warfarin', severity: 'Major', source: 'Health Canada' },
      { drug1: 'warfarin', drug2: 'moxifloxacin', severity: 'Major', source: 'Health Canada' },
      { drug1: 'moxifloxacin', drug2: 'warfarin', severity: 'Major', source: 'Health Canada' },
      { drug1: 'warfarin', drug2: 'fluconazole', severity: 'Major', source: 'UMLS' },
      { drug1: 'fluconazole', drug2: 'warfarin', severity: 'Major', source: 'UMLS' },
      { drug1: 'warfarin', drug2: 'itraconazole', severity: 'Major', source: 'UMLS' },
      { drug1: 'itraconazole', drug2: 'warfarin', severity: 'Major', source: 'UMLS' },
      { drug1: 'warfarin', drug2: 'ketoconazole', severity: 'Major', source: 'UMLS' },
      { drug1: 'ketoconazole', drug2: 'warfarin', severity: 'Major', source: 'UMLS' },
      { drug1: 'warfarin', drug2: 'voriconazole', severity: 'Major', source: 'UMLS' },
      { drug1: 'voriconazole', drug2: 'warfarin', severity: 'Major', source: 'UMLS' },
      { drug1: 'warfarin', drug2: 'clarithromycin', severity: 'Major', source: 'Health Canada' },
      { drug1: 'clarithromycin', drug2: 'warfarin', severity: 'Major', source: 'Health Canada' },
      { drug1: 'warfarin', drug2: 'erythromycin', severity: 'Major', source: 'Health Canada' },
      { drug1: 'erythromycin', drug2: 'warfarin', severity: 'Major', source: 'Health Canada' },
      { drug1: 'warfarin', drug2: 'amiodarone', severity: 'Major', source: 'Health Canada' },
      { drug1: 'amiodarone', drug2: 'warfarin', severity: 'Major', source: 'Health Canada' },
      { drug1: 'warfarin', drug2: 'aspirin', severity: 'Major', source: 'Health Canada' },
      { drug1: 'aspirin', drug2: 'warfarin', severity: 'Major', source: 'Health Canada' },
      { drug1: 'warfarin', drug2: 'ibuprofen', severity: 'Major', source: 'Health Canada' },
      { drug1: 'ibuprofen', drug2: 'warfarin', severity: 'Major', source: 'Health Canada' },
      { drug1: 'warfarin', drug2: 'naproxen', severity: 'Major', source: 'Health Canada' },
      { drug1: 'naproxen', drug2: 'warfarin', severity: 'Major', source: 'Health Canada' },
      { drug1: 'warfarin', drug2: 'diclofenac', severity: 'Major', source: 'Health Canada' },
      { drug1: 'diclofenac', drug2: 'warfarin', severity: 'Major', source: 'Health Canada' },
      { drug1: 'warfarin', drug2: 'celecoxib', severity: 'Major', source: 'Health Canada' },
      { drug1: 'celecoxib', drug2: 'warfarin', severity: 'Major', source: 'Health Canada' },
      { drug1: 'warfarin', drug2: 'phenytoin', severity: 'Major', source: 'Health Canada' },
      { drug1: 'phenytoin', drug2: 'warfarin', severity: 'Major', source: 'Health Canada' },
      { drug1: 'warfarin', drug2: 'carbamazepine', severity: 'Major', source: 'Health Canada' },
      { drug1: 'carbamazepine', drug2: 'warfarin', severity: 'Major', source: 'Health Canada' },
      { drug1: 'warfarin', drug2: 'rifampin', severity: 'Major', source: 'Health Canada' },
      { drug1: 'rifampin', drug2: 'warfarin', severity: 'Major', source: 'Health Canada' },
      
      // Fluoroquinolone interactions
      { drug1: 'ciprofloxacin', drug2: 'theophylline', severity: 'Major', source: 'Health Canada' },
      { drug1: 'theophylline', drug2: 'ciprofloxacin', severity: 'Major', source: 'Health Canada' },
      { drug1: 'levofloxacin', drug2: 'theophylline', severity: 'Major', source: 'Health Canada' },
      { drug1: 'theophylline', drug2: 'levofloxacin', severity: 'Major', source: 'Health Canada' },
      { drug1: 'moxifloxacin', drug2: 'theophylline', severity: 'Major', source: 'Health Canada' },
      { drug1: 'theophylline', drug2: 'moxifloxacin', severity: 'Major', source: 'Health Canada' },
      
      // Antidepressant interactions
      { drug1: 'fluoxetine', drug2: 'tranylcypromine', severity: 'Major', source: 'Health Canada' },
      { drug1: 'tranylcypromine', drug2: 'fluoxetine', severity: 'Major', source: 'Health Canada' },
      { drug1: 'fluoxetine', drug2: 'phenelzine', severity: 'Major', source: 'Health Canada' },
      { drug1: 'phenelzine', drug2: 'fluoxetine', severity: 'Major', source: 'Health Canada' },
      { drug1: 'sertraline', drug2: 'tranylcypromine', severity: 'Major', source: 'Health Canada' },
      { drug1: 'tranylcypromine', drug2: 'sertraline', severity: 'Major', source: 'Health Canada' },
      { drug1: 'paroxetine', drug2: 'tranylcypromine', severity: 'Major', source: 'Health Canada' },
      { drug1: 'tranylcypromine', drug2: 'paroxetine', severity: 'Major', source: 'Health Canada' },
      { drug1: 'fluoxetine', drug2: 'selegiline', severity: 'Major', source: 'Health Canada' },
      { drug1: 'selegiline', drug2: 'fluoxetine', severity: 'Major', source: 'Health Canada' },
      { drug1: 'sertraline', drug2: 'selegiline', severity: 'Major', source: 'Health Canada' },
      { drug1: 'selegiline', drug2: 'sertraline', severity: 'Major', source: 'Health Canada' },
      
      // Serotonin syndrome risk
      { drug1: 'fluoxetine', drug2: 'tramadol', severity: 'Major', source: 'UMLS' },
      { drug1: 'tramadol', drug2: 'fluoxetine', severity: 'Major', source: 'UMLS' },
      { drug1: 'sertraline', drug2: 'tramadol', severity: 'Major', source: 'UMLS' },
      { drug1: 'tramadol', drug2: 'sertraline', severity: 'Major', source: 'UMLS' },
      { drug1: 'paroxetine', drug2: 'tramadol', severity: 'Major', source: 'UMLS' },
      { drug1: 'tramadol', drug2: 'paroxetine', severity: 'Major', source: 'UMLS' },
      { drug1: 'fluoxetine', drug2: 'meperidine', severity: 'Major', source: 'UMLS' },
      { drug1: 'meperidine', drug2: 'fluoxetine', severity: 'Major', source: 'UMLS' },
      { drug1: 'sertraline', drug2: 'meperidine', severity: 'Major', source: 'UMLS' },
      { drug1: 'meperidine', drug2: 'sertraline', severity: 'Major', source: 'UMLS' },
      
      // Statin interactions
      { drug1: 'atorvastatin', drug2: 'clarithromycin', severity: 'Major', source: 'Health Canada' },
      { drug1: 'clarithromycin', drug2: 'atorvastatin', severity: 'Major', source: 'Health Canada' },
      { drug1: 'simvastatin', drug2: 'clarithromycin', severity: 'Major', source: 'Health Canada' },
      { drug1: 'clarithromycin', drug2: 'simvastatin', severity: 'Major', source: 'Health Canada' },
      { drug1: 'lovastatin', drug2: 'clarithromycin', severity: 'Major', source: 'Health Canada' },
      { drug1: 'clarithromycin', drug2: 'lovastatin', severity: 'Major', source: 'Health Canada' },
      { drug1: 'atorvastatin', drug2: 'erythromycin', severity: 'Major', source: 'Health Canada' },
      { drug1: 'erythromycin', drug2: 'atorvastatin', severity: 'Major', source: 'Health Canada' },
      { drug1: 'simvastatin', drug2: 'erythromycin', severity: 'Major', source: 'Health Canada' },
      { drug1: 'erythromycin', drug2: 'simvastatin', severity: 'Major', source: 'Health Canada' },
      { drug1: 'atorvastatin', drug2: 'itraconazole', severity: 'Major', source: 'UMLS' },
      { drug1: 'itraconazole', drug2: 'atorvastatin', severity: 'Major', source: 'UMLS' },
      { drug1: 'simvastatin', drug2: 'itraconazole', severity: 'Major', source: 'UMLS' },
      { drug1: 'itraconazole', drug2: 'simvastatin', severity: 'Major', source: 'UMLS' },
      { drug1: 'atorvastatin', drug2: 'ketoconazole', severity: 'Major', source: 'UMLS' },
      { drug1: 'ketoconazole', drug2: 'atorvastatin', severity: 'Major', source: 'UMLS' },
      { drug1: 'simvastatin', drug2: 'ketoconazole', severity: 'Major', source: 'UMLS' },
      { drug1: 'ketoconazole', drug2: 'simvastatin', severity: 'Major', source: 'UMLS' },
      
      // Digoxin interactions
      { drug1: 'digoxin', drug2: 'verapamil', severity: 'Major', source: 'Health Canada' },
      { drug1: 'verapamil', drug2: 'digoxin', severity: 'Major', source: 'Health Canada' },
      { drug1: 'digoxin', drug2: 'diltiazem', severity: 'Major', source: 'Health Canada' },
      { drug1: 'diltiazem', drug2: 'digoxin', severity: 'Major', source: 'Health Canada' },
      { drug1: 'digoxin', drug2: 'amiodarone', severity: 'Major', source: 'Health Canada' },
      { drug1: 'amiodarone', drug2: 'digoxin', severity: 'Major', source: 'Health Canada' },
      { drug1: 'digoxin', drug2: 'clarithromycin', severity: 'Major', source: 'Health Canada' },
      { drug1: 'clarithromycin', drug2: 'digoxin', severity: 'Major', source: 'Health Canada' },
      { drug1: 'digoxin', drug2: 'erythromycin', severity: 'Major', source: 'Health Canada' },
      { drug1: 'erythromycin', drug2: 'digoxin', severity: 'Major', source: 'Health Canada' },
      
      // ACE Inhibitor interactions
      { drug1: 'lisinopril', drug2: 'potassium', severity: 'Major', source: 'Health Canada' },
      { drug1: 'potassium', drug2: 'lisinopril', severity: 'Major', source: 'Health Canada' },
      { drug1: 'enalapril', drug2: 'potassium', severity: 'Major', source: 'Health Canada' },
      { drug1: 'potassium', drug2: 'enalapril', severity: 'Major', source: 'Health Canada' },
      { drug1: 'ramipril', drug2: 'potassium', severity: 'Major', source: 'Health Canada' },
      { drug1: 'potassium', drug2: 'ramipril', severity: 'Major', source: 'Health Canada' },
      { drug1: 'lisinopril', drug2: 'spironolactone', severity: 'Major', source: 'Health Canada' },
      { drug1: 'spironolactone', drug2: 'lisinopril', severity: 'Major', source: 'Health Canada' },
      { drug1: 'enalapril', drug2: 'spironolactone', severity: 'Major', source: 'Health Canada' },
      { drug1: 'spironolactone', drug2: 'enalapril', severity: 'Major', source: 'Health Canada' },
      
      // Beta-blocker interactions
      { drug1: 'metoprolol', drug2: 'verapamil', severity: 'Major', source: 'Health Canada' },
      { drug1: 'verapamil', drug2: 'metoprolol', severity: 'Major', source: 'Health Canada' },
      { drug1: 'propranolol', drug2: 'verapamil', severity: 'Major', source: 'Health Canada' },
      { drug1: 'verapamil', drug2: 'propranolol', severity: 'Major', source: 'Health Canada' },
      { drug1: 'metoprolol', drug2: 'diltiazem', severity: 'Major', source: 'Health Canada' },
      { drug1: 'diltiazem', drug2: 'metoprolol', severity: 'Major', source: 'Health Canada' },
      { drug1: 'propranolol', drug2: 'diltiazem', severity: 'Major', source: 'Health Canada' },
      { drug1: 'diltiazem', drug2: 'propranolol', severity: 'Major', source: 'Health Canada' },
      
      // Antiarrhythmic interactions
      { drug1: 'amiodarone', drug2: 'disopyramide', severity: 'Major', source: 'Health Canada' },
      { drug1: 'disopyramide', drug2: 'amiodarone', severity: 'Major', source: 'Health Canada' },
      { drug1: 'amiodarone', drug2: 'procainamide', severity: 'Major', source: 'Health Canada' },
      { drug1: 'procainamide', drug2: 'amiodarone', severity: 'Major', source: 'Health Canada' },
      { drug1: 'amiodarone', drug2: 'quinidine', severity: 'Major', source: 'Health Canada' },
      { drug1: 'quinidine', drug2: 'amiodarone', severity: 'Major', source: 'Health Canada' },
      
      // Antipsychotic interactions
      { drug1: 'clozapine', drug2: 'carbamazepine', severity: 'Major', source: 'Health Canada' },
      { drug1: 'carbamazepine', drug2: 'clozapine', severity: 'Major', source: 'Health Canada' },
      { drug1: 'clozapine', drug2: 'phenytoin', severity: 'Major', source: 'Health Canada' },
      { drug1: 'phenytoin', drug2: 'clozapine', severity: 'Major', source: 'Health Canada' },
      { drug1: 'clozapine', drug2: 'rifampin', severity: 'Major', source: 'Health Canada' },
      { drug1: 'rifampin', drug2: 'clozapine', severity: 'Major', source: 'Health Canada' },
      
      // Critical antibiotic interactions
      { drug1: 'linezolid', drug2: 'sertraline', severity: 'Major', source: 'UMLS' },
      { drug1: 'sertraline', drug2: 'linezolid', severity: 'Major', source: 'UMLS' },
      { drug1: 'linezolid', drug2: 'fluoxetine', severity: 'Major', source: 'UMLS' },
      { drug1: 'fluoxetine', drug2: 'linezolid', severity: 'Major', source: 'UMLS' },
      { drug1: 'linezolid', drug2: 'paroxetine', severity: 'Major', source: 'UMLS' },
      { drug1: 'paroxetine', drug2: 'linezolid', severity: 'Major', source: 'UMLS' },
      { drug1: 'linezolid', drug2: 'meperidine', severity: 'Major', source: 'UMLS' },
      { drug1: 'meperidine', drug2: 'linezolid', severity: 'Major', source: 'UMLS' },
      
      // MAOI interactions
      { drug1: 'phenelzine', drug2: 'meperidine', severity: 'Major', source: 'Health Canada' },
      { drug1: 'meperidine', drug2: 'phenelzine', severity: 'Major', source: 'Health Canada' },
      { drug1: 'tranylcypromine', drug2: 'meperidine', severity: 'Major', source: 'Health Canada' },
      { drug1: 'meperidine', drug2: 'tranylcypromine', severity: 'Major', source: 'Health Canada' },
      { drug1: 'phenelzine', drug2: 'tramadol', severity: 'Major', source: 'Health Canada' },
      { drug1: 'tramadol', drug2: 'phenelzine', severity: 'Major', source: 'Health Canada' },
      { drug1: 'tranylcypromine', drug2: 'tramadol', severity: 'Major', source: 'Health Canada' },
      { drug1: 'tramadol', drug2: 'tranylcypromine', severity: 'Major', source: 'Health Canada' }
    ];

    // Check database interactions first
    medicationNames.forEach((medName: string) => {
      const interactions = interactionsData[medName] || [];
      interactions.forEach((interaction: any) => {
        const otherMedName = interaction.interacts_with.toLowerCase();
        if (medicationNames.includes(otherMedName)) {
          if (!allowedSeverities.has(interaction.severity)) return;
          foundInteractions.push({
            drug1: medName.charAt(0).toUpperCase() + medName.slice(1),
            drug2: otherMedName.charAt(0).toUpperCase() + otherMedName.slice(1),
            severity: interaction.severity
          });
        }
      });
    });

    // Check critical interactions (takes precedence)
    criticalInteractions.forEach((critical: any) => {
      if (medicationNames.includes(critical.drug1) && medicationNames.includes(critical.drug2)) {
        
        // Check if this interaction is already found
        const existingIndex = foundInteractions.findIndex(i => 
          (i.drug1.toLowerCase() === critical.drug1 && i.drug2.toLowerCase() === critical.drug2) ||
          (i.drug1.toLowerCase() === critical.drug2 && i.drug2.toLowerCase() === critical.drug1)
        );
        
        if (existingIndex >= 0) {
          // Update to critical severity if found
          foundInteractions[existingIndex].severity = critical.severity;
        } else {
          // Add new critical interaction
          foundInteractions.push({
            drug1: critical.drug1.charAt(0).toUpperCase() + critical.drug1.slice(1),
            drug2: critical.drug2.charAt(0).toUpperCase() + critical.drug2.slice(1),
            severity: critical.severity
          });
        }
      }
    });

    // Remove duplicate interactions (A+B and B+A)
    const uniqueInteractions = foundInteractions.filter((interaction, index, self) => 
      index === self.findIndex(i => 
        (i.drug1 === interaction.drug1 && i.drug2 === interaction.drug2) ||
        (i.drug1 === interaction.drug2 && i.drug2 === interaction.drug1)
      )
    );

    // ✅ FIXED: Initialize Gemini AI correctly
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      console.warn('⚠️ GEMINI_API_KEY is not set. Falling back to deterministic schedule optimizer.');

      const schedule = optimizeSchedule(sortedMedications, uniqueInteractions);
      return NextResponse.json({
        schedule,
        interactions: uniqueInteractions
      });
    }

    console.log('✅ API key loaded, length:', apiKey.length);

    const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });



    // Prepare medication data for AI
    const medicationData = processedMedications.map((med: any) => ({
      name: med.brand_name,
      generic: med.generic_name,
      category: med.category,
      frequency: med.frequency,
      timing: med.timing_info.timing,
      with_food: med.timing_info.with_food,
      rationale: med.timing_info.rationale
    }));

    // Create the prompt for Gemini
    const prompt = `Given these medications with their timing rules and interactions, create an optimized daily schedule. Return JSON with time slots and medications. Use ONLY the data provided, do not add external medical knowledge.

Medications:
${JSON.stringify(medicationData, null, 2)}

Interactions found:
${JSON.stringify(foundInteractions, null, 2)}

Instructions:
1. Create a schedule from 6:00 AM to 10:00 PM
2. Group medications by optimal timing considering:
   - Frequency requirements (QD, BID, TID, QID, QHS)
   - Food requirements (with food, empty stomach)
   - Category-based timing (e.g., statins in evening)
   - Avoid interaction conflicts
3. Return ONLY a JSON object with this structure:
{
  "schedule": [
    {
      "time": "HH:MM",
      "medications": [array of medication objects from input]
    }
  ]
}

Do not include any explanations or additional text in your response.`;

    console.log('📤 Sending request to Gemini API...');

    // Call Gemini API
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    console.log('✅ Received response from Gemini API');

    // Parse the AI response
    let schedule: ScheduleItem[] = [];
    try {
      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const aiResponse = JSON.parse(jsonMatch[0]);
        schedule = aiResponse.schedule || [];
      }
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      // Fallback: create a basic schedule
      schedule = optimizeSchedule(processedMedications);
    }

    // Use our optimized schedule directly to ensure combination logic works
    console.log('🔄 Using optimized schedule with combination logic');
    schedule = optimizeSchedule(sortedMedications, uniqueInteractions);

    return NextResponse.json({
      schedule,
      interactions: uniqueInteractions
    });

  } catch (error: any) {
    console.error('❌ Error generating schedule:', {
      message: error.message,
      status: error.status,
      statusText: error.statusText,
      stack: error.stack?.split('\n').slice(0, 3)
    });
    
    return NextResponse.json(
      { 
        error: 'Failed to generate schedule',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

// Helper function to get medication timing information including food instructions
const getMedicationTimingInfo = (med: any, isCombination: boolean) => {
  console.log(`🔍 DEBUG: Getting timing info for ${med.brand_name || med.generic_name}`);
  
  // If medication already has timing info, use it
  const existingWithFoodRaw = (med?.timing_info?.with_food || '').toString().trim();
  const existingWithFood = existingWithFoodRaw.toLowerCase();
  const hasMeaningfulExistingTiming =
    Boolean(existingWithFoodRaw) &&
    !existingWithFood.includes('consult pharmacist') &&
    !existingWithFood.includes('no standard timing guideline') &&
    !existingWithFood.includes('as directed') &&
    !existingWithFood.includes('optional') &&
    !existingWithFood.includes('take with or without food') &&
    !existingWithFood.includes('take with food unless otherwise directed');

  if (med.timing_info && hasMeaningfulExistingTiming) {
    console.log(`✅ Using existing timing info: ${med.timing_info.with_food}`);
    return med.timing_info;
  }
  
  const genericName = getBaseDrugName(med.generic_name || '');
  const brandName = (med.brand_name || '').toLowerCase();
  
  console.log(`🔍 DEBUG: Extracted names - Generic: ${genericName}, Brand: ${brandName}`);
  
  // Food instruction database for common medications
  const foodInstructions: Record<string, { with_food: string; timing: string; rationale: string }> = {
    // NSAIDs
    'aspirin': {
      with_food: 'Take with food or milk to reduce stomach irritation',
      timing: 'with meals',
      rationale: 'NSAIDs can cause gastrointestinal irritation'
    },
    'ibuprofen': {
      with_food: 'Take with food or milk to reduce stomach irritation',
      timing: 'with meals',
      rationale: 'NSAIDs can cause gastrointestinal irritation'
    },
    'naproxen': {
      with_food: 'Take with food or milk to reduce stomach irritation',
      timing: 'with meals',
      rationale: 'NSAIDs can cause gastrointestinal irritation'
    },
    'diclofenac': {
      with_food: 'Take with food or milk to reduce stomach irritation',
      timing: 'with meals',
      rationale: 'NSAIDs can cause gastrointestinal irritation'
    },
    // Statins
    'atorvastatin': {
      with_food: 'Can be taken with or without food',
      timing: 'evening',
      rationale: 'Statin production is highest at night'
    },
    'simvastatin': {
      with_food: 'Take with food in the evening',
      timing: 'evening with meal',
      rationale: 'Better absorption with food; statin production highest at night'
    },
    'rosuvastatin': {
      with_food: 'Can be taken with or without food',
      timing: 'any time',
      rationale: 'No food effect on absorption'
    },
    // Antibiotics
    'levofloxacin': {
      with_food: 'Can be taken with or without food',
      timing: 'any time',
      rationale: 'No significant food interaction'
    },
    'ciprofloxacin': {
      with_food: 'Take on empty stomach (1 hour before or 2 hours after meals)',
      timing: 'empty stomach',
      rationale: 'Food reduces absorption'
    },
    'warfarin': {
      with_food: 'Take at the same time each day, with or without food',
      timing: 'consistent time daily',
      rationale: 'Consistent absorption for anticoagulant effect'
    },
    // Hydroxychloroquine (Plaquenil)
    'hydroxychloroquine': {
      with_food: 'Take with food or milk to reduce stomach upset',
      timing: 'with meals',
      rationale: 'Better absorption and reduced GI side effects with food'
    },
    // Metformin
    'metformin': {
      with_food: 'Take with meals to reduce stomach upset',
      timing: 'with meals',
      rationale: 'Reduces gastrointestinal side effects'
    },
    // ACE inhibitors
    'lisinopril': {
      with_food: 'Can be taken with or without food',
      timing: 'any time',
      rationale: 'No food effect on absorption'
    },
    // Beta blockers
    'metoprolol': {
      with_food: 'Take with food',
      timing: 'with food',
      rationale: 'May cause dizziness, food helps reduce this'
    },
    // PPIs
    'omeprazole': {
      with_food: 'Take 30 minutes before meals',
      timing: 'before meals',
      rationale: 'Better absorption on empty stomach'
    },
    // Antimalarials
    'chloroquine': {
      with_food: 'Take with food to reduce stomach upset',
      timing: 'with meals',
      rationale: 'Reduces gastrointestinal side effects'
    },
    // Thyroid medications
    'levothyroxine': {
      with_food: 'Take on empty stomach, 30 minutes before breakfast',
      timing: 'empty stomach morning',
      rationale: 'Food interferes with absorption'
    },
    // Diabetes medications
    'glipizide': {
      with_food: 'Take 30 minutes before meals',
      timing: 'before meals',
      rationale: 'Better glucose control with proper timing'
    },
    'glyburide': {
      with_food: 'Take with breakfast or first meal',
      timing: 'with breakfast',
      rationale: 'Reduces hypoglycemia risk'
    },
    // Blood thinners
    'clopidogrel': {
      with_food: 'Can be taken with or without food',
      timing: 'any time',
      rationale: 'No food effect on absorption'
    },
    // Heart medications
    'digoxin': {
      with_food: 'Can be taken with or without food',
      timing: 'any time',
      rationale: 'Consistent timing more important than food'
    },
    'furosemide': {
      with_food: 'Can be taken with or without food',
      timing: 'any time',
      rationale: 'May cause increased urination'
    },
    // Ophthalmic medications
    'tobramycin': {
      with_food: 'Remove contact lenses before use, wait 15 minutes before reinserting',
      timing: 'eye drops',
      rationale: 'Contact lenses can interfere with absorption'
    },
    'dexamethasone': {
      with_food: 'Remove contact lenses before use, wait 15 minutes before reinserting',
      timing: 'eye drops',
      rationale: 'Contact lenses can interfere with absorption'
    },
    'hydroxypropyl methylcellulose': {
      with_food: 'Can be used with or without food',
      timing: 'any time',
      rationale: 'Lubricating eye drops, no food interaction'
    },
    'gatifloxacin': {
      with_food: 'Remove contact lenses before use, wait 15 minutes before reinserting',
      timing: 'eye drops',
      rationale: 'Contact lenses can interfere with absorption'
    },
    'moxifloxacin': {
      with_food: 'Remove contact lenses before use, wait 15 minutes before reinserting',
      timing: 'eye drops',
      rationale: 'Contact lenses can interfere with absorption'
    },
    'ofloxacin': {
      with_food: 'Remove contact lenses before use, wait 15 minutes before reinserting',
      timing: 'eye drops',
      rationale: 'Contact lenses can interfere with absorption'
    },
    'cyclopentolate': {
      with_food: 'Can be used with or without food',
      timing: 'eye drops',
      rationale: 'Eye drops for pupil dilation'
    },
    'tropicamide': {
      with_food: 'Can be used with or without food',
      timing: 'eye drops',
      rationale: 'Eye drops for pupil dilation'
    },
    'pilocarpine': {
      with_food: 'Can be used with or without food',
      timing: 'eye drops',
      rationale: 'Eye drops for glaucoma'
    },
    'latanoprost': {
      with_food: 'Can be used with or without food',
      timing: 'eye drops',
      rationale: 'Eye drops for glaucoma'
    },
    'bimatoprost': {
      with_food: 'Can be used with or without food',
      timing: 'eye drops',
      rationale: 'Eye drops for glaucoma'
    },
    'travoprost': {
      with_food: 'Can be used with or without food',
      timing: 'eye drops',
      rationale: 'Eye drops for glaucoma'
    },
    'timolol': {
      with_food: 'Can be used with or without food',
      timing: 'eye drops',
      rationale: 'Beta-blocker eye drops for glaucoma'
    },
    'brimonidine': {
      with_food: 'Can be used with or without food',
      timing: 'eye drops',
      rationale: 'Alpha agonist eye drops for glaucoma'
    },
    'dorzolamide': {
      with_food: 'Can be used with or without food',
      timing: 'eye drops',
      rationale: 'Carbonic anhydrase inhibitor eye drops'
    },
    'prednisolone': {
      with_food: 'Remove contact lenses before use, wait 15 minutes before reinserting',
      timing: 'eye drops',
      rationale: 'Steroid eye drops, contact lenses can interfere'
    },
    'fluorometholone': {
      with_food: 'Remove contact lenses before use, wait 15 minutes before reinserting',
      timing: 'eye drops',
      rationale: 'Steroid eye drops, contact lenses can interfere'
    },
    'loteprednol': {
      with_food: 'Remove contact lenses before use, wait 15 minutes before reinserting',
      timing: 'eye drops',
      rationale: 'Steroid eye drops, contact lenses can interfere'
    },
    'ketorolac': {
      with_food: 'Remove contact lenses before use, wait 15 minutes before reinserting',
      timing: 'eye drops',
      rationale: 'NSAID eye drops, contact lenses can interfere'
    },
    'bromfenac': {
      with_food: 'Remove contact lenses before use, wait 15 minutes before reinserting',
      timing: 'eye drops',
      rationale: 'NSAID eye drops, contact lenses can interfere'
    },
    'nepafenac': {
      with_food: 'Remove contact lenses before use, wait 15 minutes before reinserting',
      timing: 'eye drops',
      rationale: 'NSAID eye drops, contact lenses can interfere'
    },
    // Common ophthalmic ointments
    'ocunox': {
      with_food: 'Can be used with or without food',
      timing: 'any time',
      rationale: 'Ophthalmic ointment, minimal systemic absorption'
    },
    'bacitracin': {
      with_food: 'Can be used with or without food',
      timing: 'any time',
      rationale: 'Antibiotic ointment, minimal systemic absorption'
    },
    'erythromycin': {
      with_food: 'Can be used with or without food',
      timing: 'any time',
      rationale: 'Antibiotic ointment, minimal systemic absorption'
    },
    'gentamicin': {
      with_food: 'Can be used with or without food',
      timing: 'any time',
      rationale: 'Antibiotic ointment, minimal systemic absorption'
    },
    'polymyxin b': {
      with_food: 'Can be used with or without food',
      timing: 'any time',
      rationale: 'Antibiotic ointment, minimal systemic absorption'
    },
    'vancomycin': {
      with_food: 'Can be used with or without food',
      timing: 'any time',
      rationale: 'Antibiotic ointment, minimal systemic absorption'
    },
    'chloramphenicol': {
      with_food: 'Can be used with or without food',
      timing: 'any time',
      rationale: 'Antibiotic ointment, minimal systemic absorption'
    },
    'sulfacetamide': {
      with_food: 'Can be used with or without food',
      timing: 'any time',
      rationale: 'Antibiotic ointment, minimal systemic absorption'
    },
    'tetracycline': {
      with_food: 'Can be used with or without food',
      timing: 'any time',
      rationale: 'Antibiotic ointment, minimal systemic absorption'
    },
    'neomycin': {
      with_food: 'Can be used with or without food',
      timing: 'any time',
      rationale: 'Antibiotic ointment, minimal systemic absorption'
    },
    'framycetin': {
      with_food: 'Can be used with or without food',
      timing: 'any time',
      rationale: 'Antibiotic ointment, minimal systemic absorption'
    }
  };
  
  // Check generic name first
  if (foodInstructions[genericName]) {
    console.log(`✅ Found food instruction for ${genericName}: ${foodInstructions[genericName].with_food}`);
    return foodInstructions[genericName];
  }
  
  // Check for drug classes
  if (genericName.includes('statin')) {
    console.log(`✅ Found statin class instruction for ${genericName}`);
    return {
      with_food: 'Can be taken with or without food',
      timing: 'evening',
      rationale: 'Statin production is highest at night'
    };
  }
  
  if (genericName.includes('antibiotic') || genericName.includes('floxacin')) {
    console.log(`✅ Found antibiotic class instruction for ${genericName}`);
    return {
      with_food: 'Can be taken with or without food',
      timing: 'any time',
      rationale: 'No significant food interaction'
    };
  }
  
  if (genericName.includes('nsaid') || brandName.includes('advil') || brandName.includes('aleve') || brandName.includes('motrin')) {
    console.log(`✅ Found NSAID class instruction for ${genericName}`);
    return {
      with_food: 'Take with food or milk to reduce stomach irritation',
      timing: 'with meals',
      rationale: 'NSAIDs can cause gastrointestinal irritation'
    };
  }
  
  // Check for more specific drug patterns
  if (genericName.includes('hydroxychloroquine') || brandName.includes('plaquenil')) {
    console.log(`✅ Found hydroxychloroquine instruction for ${genericName}`);
    return {
      with_food: 'Take with food or milk to reduce stomach upset',
      timing: 'with meals',
      rationale: 'Better absorption and reduced GI side effects with food'
    };
  }
  
  // Ophthalmic medications - brand name matching
  if (brandName.includes('ocunox') || brandName.includes('refresh') || brandName.includes('systane') || 
      brandName.includes('theratears') || brandName.includes('bion') || brandName.includes('genteal')) {
    console.log(`✅ Found ophthalmic brand instruction for ${brandName}`);
    return {
      with_food: 'Can be used with or without food',
      timing: 'any time',
      rationale: 'Ophthalmic drops/ointment, minimal systemic absorption'
    };
  }
  
  if (brandName.includes('tobradex') || brandName.includes('zylet') || brandName.includes('maxidex')) {
    console.log(`✅ Found steroid eye drop brand instruction for ${brandName}`);
    return {
      with_food: 'Remove contact lenses before use, wait 15 minutes before reinserting',
      timing: 'eye drops',
      rationale: 'Steroid eye drops, contact lenses can interfere'
    };
  }
  
  if (brandName.includes('vigamox') || brandName.includes('besivance') || brandName.includes('zyvoxid')) {
    console.log(`✅ Found antibiotic eye drop brand instruction for ${brandName}`);
    return {
      with_food: 'Remove contact lenses before use, wait 15 minutes before reinserting',
      timing: 'eye drops',
      rationale: 'Antibiotic eye drops, contact lenses can interfere'
    };
  }
  
  if (brandName.includes('xalatan') || brandName.includes('lumigan') || brandName.includes('travatan')) {
    console.log(`✅ Found glaucoma eye drop brand instruction for ${brandName}`);
    return {
      with_food: 'Can be used with or without food',
      timing: 'eye drops',
      rationale: 'Prostaglandin eye drops for glaucoma'
    };
  }
  
  if (brandName.includes('cosopt') || brandName.includes('azopt') || brandName.includes('trusopt')) {
    console.log(`✅ Found glaucoma combination eye drop brand instruction for ${brandName}`);
    return {
      with_food: 'Can be used with or without food',
      timing: 'eye drops',
      rationale: 'Combination eye drops for glaucoma'
    };
  }
  
  if (genericName.includes('prednisone') || genericName.includes('dexamethasone') || genericName.includes('cortisol')) {
    console.log(`✅ Found corticosteroid instruction for ${genericName}`);
    return {
      with_food: 'Take with food to prevent stomach upset',
      timing: 'with meals',
      rationale: 'Corticosteroids can cause stomach irritation'
    };
  }
  
  if (genericName.includes('amlodipine') || genericName.includes('nifedipine') || genericName.includes('diltiazem')) {
    console.log(`✅ Found calcium channel blocker instruction for ${genericName}`);
    return {
      with_food: 'Can be taken with or without food',
      timing: 'any time',
      rationale: 'No significant food interaction'
    };
  }
  
  if (genericName.includes('albuterol') || genericName.includes('salbutamol')) {
    console.log(`✅ Found bronchodilator instruction for ${genericName}`);
    return {
      with_food: 'Can be taken with or without food',
      timing: 'as needed',
      rationale: 'No food interaction with inhaled medications'
    };
  }
  
  // Default timing info
  console.log(`❌ No specific food instruction found for ${genericName}, using default`);
  return {
    timing: 'as directed',
    with_food: 'consult pharmacist',
    rationale: 'No standard timing guideline'
  };
};

// Helper function to extract base drug name
const getBaseDrugName = (genericName: string): string => {
  let baseName = genericName.toLowerCase();
  baseName = baseName
    .split('(')[0] // Remove content in parentheses
    .replace(/\s+(sodium|potassium|calcium|magnesium|hydrochloride|hemi-hydrate|anhydrous|sulfate|fumarate|maleate|tartrate|mesylate|besylate|hydrochloride)$/i, '') // Remove common salt forms
    .replace(/\s+(hcl|hbr)$/i, '') // Remove abbreviations
    .trim();
  return baseName;
};

// Helper function to find alternative time slot
const findAlternativeTime = (originalTime: string, availableTimes: string[], existingSlots: any[], med: any, interactions: any[]): string => {
  // Try other available times for this medication
  for (const time of availableTimes) {
    if (time !== originalTime && !existingSlots.some(slot => slot.time === time)) {
      return time;
    }
  }
  
  // If all times are taken, add 2 hours to original time
  const [hours, minutes] = originalTime.split(':').map(Number);
  let newHours = hours + 2;
  if (newHours >= 24) newHours -= 24;
  return `${newHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

// Helper function to generate completely new time
const generateNewTime = (originalTime: string, existingSlots: any[]): string => {
  const [hours, minutes] = originalTime.split(':').map(Number);
  let newHours = hours + 3; // Add 3 hours to ensure separation
  if (newHours >= 24) newHours -= 24;
  
  const newTime = `${newHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  
  // Make sure this time doesn't exist
  if (!existingSlots.some(slot => slot.time === newTime)) {
    return newTime;
  }
  
  // If it still conflicts, add 1 more hour
  let finalHours = newHours + 1;
  if (finalHours >= 24) finalHours -= 24;
  return `${finalHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

const optimizeSchedule = (medications: Medication[], interactions: Interaction[] = []) => {
  if (medications.length === 0) {
    console.log('❌ No medications provided to optimizeSchedule');
    return [];
  }

  console.log('🔍 DEBUG: Starting schedule optimization');
  console.log('📋 Medications array:', JSON.stringify(medications, null, 2));
  console.log('📊 Total medications:', medications.length);

  const slots: { time: string; medications: Medication[] }[] = [];
  const processedMedications = new Set<string>();
  const assignedTimesByMedicationId = new Map<string, Set<string>>();

  // Frequency to time mapping
  const frequencyTimeMap: Record<string, string[]> = {
    'QD - Once daily': ['08:00'],
    'BID - Twice daily': ['08:00', '20:00'],
    'TID - Three times daily': ['08:00', '14:00', '20:00'],
    'QID - Four times daily': ['08:00', '12:00', '17:00', '21:00'],
    'QHS - At bedtime': ['21:00'],
    'Q2H - Every 2 hours': ['06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'],
    'Q4H - Every 4 hours': ['06:00', '10:00', '14:00', '18:00', '22:00'],
    'Q6H - Every 6 hours': ['06:00', '12:00', '18:00', '00:00'],
    'Q8H - Every 8 hours': ['08:00', '16:00', '00:00'],
    'Q12H - Every 12 hours': ['08:00', '20:00'],
    'PRN - As needed': ['08:00'],
  };

  // Process each medication
  medications.forEach((med, medIndex) => {
    console.log(`🔍 DEBUG: Processing medication ${medIndex + 1}:`, {
      brand_name: med.brand_name,
      generic_name: med.generic_name,
      frequency: med.frequency,
      is_combination: med.is_combination,
      id: med.id
    });

    const frequency = med.frequency || 'QD - Once daily';
    const times = frequencyTimeMap[frequency] || ['08:00'];

    const medicationId = med.id || `${med.rxcui || med.generic_name || med.brand_name || 'med'}-${medIndex}`;
    if (!assignedTimesByMedicationId.has(medicationId)) {
      assignedTimesByMedicationId.set(medicationId, new Set());
    }
    const assignedTimes = assignedTimesByMedicationId.get(medicationId)!;
    
    console.log(`📊 Processing: ${med.brand_name || med.generic_name}`);
    console.log(`   - Generic: ${med.generic_name}`);
    console.log(`   - Frequency: ${frequency}`);
    console.log(`   - Times: ${times.join(', ')}`);
    console.log(`   - Is Combination: ${med.is_combination}`);

    times.forEach((time, timeIndex) => {
      let targetTime = time;
      
      console.log(`🔍 DEBUG: Processing time slot ${timeIndex + 1}:`, {
        time: targetTime,
        medication: med.brand_name || med.generic_name
      });

      // Find existing time slot or create new one
      let slot = slots.find(s => s.time === targetTime);
      
      if (slot) {
        // Check for interactions with existing medications in this slot
        const hasInteraction = slot.medications.some(existingMed => {
          return interactions.some(interaction => {
            const med1Name = getBaseDrugName(med.generic_name || '').toLowerCase();
            const med2Name = getBaseDrugName(existingMed.generic_name || '').toLowerCase();
            const int1Name = interaction.drug1.toLowerCase();
            const int2Name = interaction.drug2.toLowerCase();
            
            console.log(`🔍 DEBUG: Checking interaction between ${med1Name} and ${med2Name}`);
            console.log(`   - Interaction: ${int1Name} + ${int2Name}`);
            
            // More robust interaction matching - check if drug names contain interaction terms
            const interactionFound = (
              (med1Name.includes(int1Name) || int1Name.includes(med1Name)) && 
              (med2Name.includes(int2Name) || int2Name.includes(med2Name))
            ) || (
              (med1Name.includes(int2Name) || int2Name.includes(med1Name)) && 
              (med2Name.includes(int1Name) || int1Name.includes(med2Name))
            );
            
            if (interactionFound) {
              console.log(`⚠️ INTERACTION FOUND: ${med.brand_name || med.generic_name} interacts with ${existingMed.brand_name || existingMed.generic_name}`);
            }
            
            return interactionFound;
          });
        });
        
        if (hasInteraction) {
          console.log(`⚠️ Interaction detected! Moving ${med.brand_name || med.generic_name} to different time`);
          // Find an alternative time slot that doesn't have interactions
          const alternativeTime = findAlternativeTime(targetTime, times, slots, med, interactions);
          console.log(`🔄 Moving from ${time} to ${alternativeTime}`);
          targetTime = alternativeTime;
          if (assignedTimes.has(targetTime)) {
            targetTime = generateNewTime(targetTime, slots);
          }

          const uniqueKey = `${medicationId}-${targetTime}`;
          if (processedMedications.has(uniqueKey)) return;

          slot = slots.find(s => s.time === targetTime);
          if (!slot) {
            slot = {
              time: targetTime,
              medications: [med]
            };
            slots.push(slot);
            console.log(`✅ Created new slot at ${targetTime} for ${med.brand_name || med.generic_name}`);
          } else {
            // Double check the new slot doesn't have interactions either
            const newSlotHasInteraction = slot.medications.some(existingMed => {
              return interactions.some(interaction => {
                const med1Name = getBaseDrugName(med.generic_name || '').toLowerCase();
                const med2Name = getBaseDrugName(existingMed.generic_name || '').toLowerCase();
                const int1Name = interaction.drug1.toLowerCase();
                const int2Name = interaction.drug2.toLowerCase();
                
                return (
                  (med1Name.includes(int1Name) || int1Name.includes(med1Name)) && 
                  (med2Name.includes(int2Name) || int2Name.includes(med2Name))
                ) || (
                  (med1Name.includes(int2Name) || int2Name.includes(med1Name)) && 
                  (med2Name.includes(int1Name) || int1Name.includes(med2Name))
                );
              });
            });
            
            if (newSlotHasInteraction) {
              // If even the alternative time has interactions, create a completely new time
              const newTime = generateNewTime(targetTime, slots);
              console.log(`🔄 Alternative time also has conflicts, creating new time: ${newTime}`);
              if (assignedTimes.has(newTime)) {
                const fallbackTime = generateNewTime(newTime, slots);
                slot = {
                  time: fallbackTime,
                  medications: [med]
                };
                slots.push(slot);
              } else {
              slot = {
                time: newTime,
                medications: [med]
              };
              slots.push(slot);
              }
            } else {
              slot.medications.push(med);
              console.log(`✅ Added ${med.brand_name || med.generic_name} to safe slot at ${targetTime}`);
            }
          }
        } else {
          // Add to existing slot
          if (assignedTimes.has(targetTime)) return;
          const uniqueKey = `${medicationId}-${targetTime}`;
          if (processedMedications.has(uniqueKey)) return;
          console.log(`➕ Adding ${med.brand_name || med.generic_name} to existing slot at ${targetTime}`);
          slot.medications.push(med);
        }
      } else {
        // Create new slot
        if (assignedTimes.has(targetTime)) {
          targetTime = generateNewTime(targetTime, slots);
        }
        const uniqueKey = `${medicationId}-${targetTime}`;
        if (processedMedications.has(uniqueKey)) return;

        console.log(`🆕 Creating new slot at ${targetTime} for ${med.brand_name || med.generic_name}`);
        slot = {
          time: targetTime,
          medications: [med]
        };
        slots.push(slot);
      }
      
      const finalKey = `${medicationId}-${slot.time}`;
      processedMedications.add(finalKey);
      assignedTimes.add(slot.time);
      console.log(`✅ Added medication to slot, total meds in slot: ${slot.medications.length}`);
    });
  });

  // Sort slots by time
  slots.sort((a, b) => a.time.localeCompare(b.time));

  console.log('✅ Final schedule slots:', JSON.stringify(slots, null, 2));
  console.log(`📊 Total slots created: ${slots.length}`);
  
  slots.forEach((slot, i) => {
    console.log(`   Slot ${i + 1}: ${slot.time}`);
    console.log(`      Medications: ${slot.medications.length}`);
    slot.medications.forEach(m => {
      console.log(`         - ${m.brand_name || m.generic_name} (${m.strength}) - Combo: ${m.is_combination}`);
    });
  });

  // Return the processed slots with correct field names
  return slots.map(slot => ({
    time: slot.time,
    medications: slot.medications.map(med => ({
      id: med.id,
      brand_name: med.brand_name || med.name || 'Unknown',
      generic_name: med.generic_name || med.generic || 'Unknown',
      strength: med.strength,
      dosage_form: med.dosage_form,
      category: med.category,
      frequency: med.frequency,
      timing_info: med.timing_info,
      is_combination: med.is_combination,
      combination_components: med.combination_components,
      combination_medications: med.combination_medications,
      rxcui: med.rxcui,
      source: med.source,
      lnhpd_id: med.lnhpd_id
    }))
  }));
};
