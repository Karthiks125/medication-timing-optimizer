export interface Medication {
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
  is_combination?: boolean;
  combination_components?: string[] | null;
  combination_medications?: Medication[] | null;
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

export interface ScheduleItem {
  time: string;
  medications: Medication[];
}

export interface Interaction {
  drug1: string;
  drug2: string;
  severity: 'Major' | 'Moderate' | 'Minor';
  description?: string;
}
