'use client';

import { Pill } from 'lucide-react';

// FOOD INTERACTION DATABASE
const DRUG_FOOD_INTERACTIONS_DB: Record<string, {
  foods_to_avoid: string[];
  foods_to_take_with: string[];
  timing_requirements: string;
  severity: 'Major' | 'Moderate' | 'Minor';
  detailed_advice: string;
}> = {
  'warfarin': {
    foods_to_avoid: ['Cranberry juice', 'Excessive alcohol', 'Vitamin K rich foods (keep intake consistent)'],
    foods_to_take_with: [],
    timing_requirements: 'Can be taken with or without food',
    severity: 'Major',
    detailed_advice: 'Maintain CONSISTENT daily intake of vitamin K-rich foods (leafy greens, broccoli, liver). Do not avoid completely, just be consistent.'
  },
  'lisinopril': {
    foods_to_avoid: ['Excessive salt', 'High-potassium foods', 'Potassium supplements', 'Salt substitutes'],
    foods_to_take_with: [],
    timing_requirements: 'Can be taken with or without food',
    severity: 'Major',
    detailed_advice: 'Avoid potassium-rich foods and supplements.'
  },
  'amlodipine': {
    foods_to_avoid: [],
    foods_to_take_with: ['Food'],
    timing_requirements: 'Take with or without food',
    severity: 'Minor',
    detailed_advice: 'Can be taken with or without food.'
  },
  'losartan': {
    foods_to_avoid: [],
    foods_to_take_with: ['Food'],
    timing_requirements: 'Take with or without food',
    severity: 'Minor',
    detailed_advice: 'Can be taken with or without food.'
  },
  'metoprolol': {
    foods_to_avoid: [],
    foods_to_take_with: ['Food'],
    timing_requirements: 'Take with or without food',
    severity: 'Minor',
    detailed_advice: 'Can be taken with or without food.'
  },
  'atenolol': {
    foods_to_avoid: [],
    foods_to_take_with: ['Food'],
    timing_requirements: 'Take on empty stomach for best absorption',
    severity: 'Minor',
    detailed_advice: 'Take before meals for best effect.'
  },
  'hydrochlorothiazide': {
    foods_to_avoid: ['Excessive salt', 'High-sodium foods'],
    foods_to_take_with: [],
    timing_requirements: 'Can be taken with or without food',
    severity: 'Minor',
    detailed_advice: 'Maintain adequate potassium intake.'
  },
  'furosemide': {
    foods_to_avoid: ['Excessive salt', 'High-sodium foods'],
    foods_to_take_with: [],
    timing_requirements: 'Can be taken with or without food',
    severity: 'Moderate',
    detailed_advice: 'Limit salt intake to enhance effectiveness.'
  },
  'spironolactone': {
    foods_to_avoid: ['High-potassium foods', 'Potassium supplements', 'Salt substitutes'],
    foods_to_take_with: [],
    timing_requirements: 'Can be taken with or without food',
    severity: 'Major',
    detailed_advice: 'Avoid potassium-rich foods and supplements.'
  },
  'digoxin': {
    foods_to_avoid: ['High-fiber foods', 'Antacids containing aluminum or magnesium'],
    foods_to_take_with: [],
    timing_requirements: 'Take on empty stomach, 1 hour before or 2 hours after meals',
    severity: 'Major',
    detailed_advice: 'Maintain consistent timing and avoid interactions with antacids.'
  },
  'prednisone': {
    foods_to_avoid: ['Excessive alcohol', 'High-sodium foods'],
    foods_to_take_with: ['Food', 'Milk'],
    timing_requirements: 'Take with food to prevent stomach irritation',
    severity: 'Moderate',
    detailed_advice: 'Take with food and limit alcohol and sodium intake.'
  },
  'alendronate': {
    foods_to_avoid: ['Calcium supplements', 'Antacids', 'High-calcium foods'],
    foods_to_take_with: ['Plain water'],
    timing_requirements: 'Take on empty stomach with full glass of water, 30 minutes before first food',
    severity: 'Major',
    detailed_advice: 'Remain upright for 30 minutes after taking to prevent esophageal irritation.'
  },
  'ciprofloxacin': {
    foods_to_avoid: ['Dairy products', 'Antacids', 'Iron supplements', 'Calcium-fortified foods'],
    foods_to_take_with: [],
    timing_requirements: 'Take 2 hours before or 6 hours after meals/antacids',
    severity: 'Major',
    detailed_advice: 'Avoid dairy and antacids within 2 hours of taking.'
  },
  'levofloxacin': {
    foods_to_avoid: ['Dairy products', 'Antacids', 'Iron supplements', 'Calcium-fortified foods'],
    foods_to_take_with: [],
    timing_requirements: 'Take 2 hours before or 6 hours after meals/antacids',
    severity: 'Major',
    detailed_advice: 'Avoid dairy and antacids within 2 hours of taking.'
  },
  'moxifloxacin': {
    foods_to_avoid: ['Dairy products', 'Antacids', 'Iron supplements', 'Calcium-fortified foods'],
    foods_to_take_with: [],
    timing_requirements: 'Take 2 hours before or 6 hours after meals/antacids',
    severity: 'Major',
    detailed_advice: 'Avoid dairy and antacids within 2 hours of taking.'
  },
  'doxycycline': {
    foods_to_avoid: ['Dairy products', 'Antacids', 'Iron supplements'],
    foods_to_take_with: [],
    timing_requirements: 'Take 1 hour before or 2 hours after meals',
    severity: 'Major',
    detailed_advice: 'Avoid dairy and antacids within 2 hours of taking.'
  },
  'tetracycline': {
    foods_to_avoid: ['Dairy products', 'Antacids', 'Iron supplements'],
    foods_to_take_with: [],
    timing_requirements: 'Take 1 hour before or 2 hours after meals',
    severity: 'Major',
    detailed_advice: 'Avoid dairy and antacids within 2 hours of taking.'
  },
  'azithromycin': {
    foods_to_avoid: [],
    foods_to_take_with: ['Food'],
    timing_requirements: 'Take with or without food',
    severity: 'Minor',
    detailed_advice: 'Can be taken with or without food.'
  },
  'clarithromycin': {
    foods_to_avoid: [],
    foods_to_take_with: ['Food'],
    timing_requirements: 'Take with food',
    severity: 'Minor',
    detailed_advice: 'Take with food to reduce stomach upset.'
  },
  'amoxicillin': {
    foods_to_avoid: [],
    foods_to_take_with: ['Food'],
    timing_requirements: 'Take with or without food',
    severity: 'Minor',
    detailed_advice: 'Can be taken with or without food.'
  },
  'penicillin': {
    foods_to_avoid: [],
    foods_to_take_with: ['Food'],
    timing_requirements: 'Take with or without food',
    severity: 'Minor',
    detailed_advice: 'Can be taken with or without food.'
  },
  'metformin': {
    foods_to_avoid: ['Excessive alcohol'],
    foods_to_take_with: ['Food'],
    timing_requirements: 'Take with meals to reduce gastrointestinal side effects',
    severity: 'Moderate',
    detailed_advice: 'Always take with food to minimize stomach upset.'
  },
  'glyburide': {
    foods_to_avoid: ['Alcohol'],
    foods_to_take_with: ['Food'],
    timing_requirements: 'Take 30 minutes before meals',
    severity: 'Moderate',
    detailed_advice: 'Take before meals and avoid alcohol to prevent hypoglycemia.'
  },
  'pioglitazone': {
    foods_to_avoid: [],
    foods_to_take_with: ['Food'],
    timing_requirements: 'Take with or without food',
    severity: 'Minor',
    detailed_advice: 'Can be taken with or without food.'
  },
  'sitagliptin': {
    foods_to_avoid: [],
    foods_to_take_with: ['Food'],
    timing_requirements: 'Take with or without food',
    severity: 'Minor',
    detailed_advice: 'Can be taken with or without food.'
  },
  'empagliflozin': {
    foods_to_avoid: [],
    foods_to_take_with: ['Food'],
    timing_requirements: 'Take with or without food',
    severity: 'Minor',
    detailed_advice: 'Can be taken with or without food.'
  },
  'insulin': {
    foods_to_avoid: [],
    foods_to_take_with: ['Food (if hypoglycemic)'],
    timing_requirements: 'Take as prescribed, usually before meals',
    severity: 'Major',
    detailed_advice: 'Take as prescribed. Have fast-acting sugar available.'
  },
  'glipizide': {
    foods_to_avoid: ['Alcohol'],
    foods_to_take_with: ['Food'],
    timing_requirements: 'Take 30 minutes before meals',
    severity: 'Moderate',
    detailed_advice: 'Take before meals and avoid alcohol to prevent hypoglycemia.'
  },
  'atorvastatin': {
    foods_to_avoid: ['Grapefruit juice'],
    foods_to_take_with: [],
    timing_requirements: 'Can be taken with or without food',
    severity: 'Major',
    detailed_advice: 'Avoid grapefruit juice completely while taking this medication.'
  },
  'simvastatin': {
    foods_to_avoid: ['Grapefruit juice'],
    foods_to_take_with: [],
    timing_requirements: 'Take in evening with or without food',
    severity: 'Major',
    detailed_advice: 'Avoid grapefruit juice completely while taking this medication.'
  },
  'lovastatin': {
    foods_to_avoid: ['Grapefruit juice'],
    foods_to_take_with: ['Food'],
    timing_requirements: 'Take with food',
    severity: 'Major',
    detailed_advice: 'Avoid grapefruit juice completely while taking this medication.'
  },
  'rosuvastatin': {
    foods_to_avoid: ['Grapefruit juice (large amounts)'],
    foods_to_take_with: [],
    timing_requirements: 'Can be taken with or without food',
    severity: 'Moderate',
    detailed_advice: 'Large amounts of grapefruit juice may increase side effects. Best to avoid or limit to small amounts.'
  },
  'pravastatin': {
    foods_to_avoid: [],
    foods_to_take_with: ['Food'],
    timing_requirements: 'Take with or without food',
    severity: 'Minor',
    detailed_advice: 'Can be taken with or without food.'
  },
  'fluvastatin': {
    foods_to_avoid: [],
    foods_to_take_with: ['Food'],
    timing_requirements: 'Take with or without food',
    severity: 'Minor',
    detailed_advice: 'Can be taken with or without food.'
  },
  'amiodarone': {
    foods_to_avoid: ['Grapefruit juice'],
    foods_to_take_with: [],
    timing_requirements: 'Can be taken with or without food',
    severity: 'Major',
    detailed_advice: 'Avoid grapefruit juice completely while taking this medication.'
  },
  'verapamil': {
    foods_to_avoid: ['Grapefruit juice'],
    foods_to_take_with: [],
    timing_requirements: 'Can be taken with or without food',
    severity: 'Major',
    detailed_advice: 'Avoid grapefruit juice completely while taking this medication.'
  },
  'diltiazem': {
    foods_to_avoid: ['Grapefruit juice'],
    foods_to_take_with: [],
    timing_requirements: 'Can be taken with or without food',
    severity: 'Major',
    detailed_advice: 'Avoid grapefruit juice completely while taking this medication.'
  },
  'carbamazepine': {
    foods_to_avoid: ['Grapefruit juice'],
    foods_to_take_with: ['Food'],
    timing_requirements: 'Take with food',
    severity: 'Major',
    detailed_advice: 'Avoid grapefruit juice completely while taking this medication.'
  },
  'phenytoin': {
    foods_to_avoid: ['Grapefruit juice'],
    foods_to_take_with: ['Food'],
    timing_requirements: 'Take with food',
    severity: 'Major',
    detailed_advice: 'Avoid grapefruit juice completely while taking this medication.'
  },
  'valproic acid': {
    foods_to_avoid: [],
    foods_to_take_with: ['Food'],
    timing_requirements: 'Take with food to reduce stomach upset',
    severity: 'Moderate',
    detailed_advice: 'Take with food to minimize gastrointestinal side effects.'
  },
  'gabapentin': {
    foods_to_avoid: [],
    foods_to_take_with: ['Food'],
    timing_requirements: 'Take with or without food',
    severity: 'Minor',
    detailed_advice: 'Can be taken with or without food.'
  },
  'rifampin': {
    foods_to_avoid: [],
    foods_to_take_with: ['Food'],
    timing_requirements: 'Take on empty stomach for best absorption',
    severity: 'Moderate',
    detailed_advice: 'Take 1 hour before or 2 hours after meals.'
  },
  'isoniazid': {
    foods_to_avoid: [],
    foods_to_take_with: ['Food'],
    timing_requirements: 'Take on empty stomach',
    severity: 'Moderate',
    detailed_advice: 'Take 1 hour before or 2 hours after meals.'
  },
  'levothyroxine': {
    foods_to_avoid: ['Soy products', 'High-fiber foods', 'Calcium supplements', 'Iron supplements'],
    foods_to_take_with: ['Water'],
    timing_requirements: 'Take on empty stomach, 30-60 minutes before breakfast',
    severity: 'Major',
    detailed_advice: 'Take with water only, wait 30-60 minutes before eating.'
  },
  'thyroid': {
    foods_to_avoid: ['Soy products', 'High-fiber foods', 'Calcium supplements', 'Iron supplements'],
    foods_to_take_with: ['Water'],
    timing_requirements: 'Take on empty stomach, 30-60 minutes before breakfast',
    severity: 'Major',
    detailed_advice: 'Take with water only, wait 30-60 minutes before eating.'
  },
  'ibuprofen': {
    foods_to_avoid: [],
    foods_to_take_with: ['Food', 'Milk'],
    timing_requirements: 'Take with food to reduce stomach irritation',
    severity: 'Moderate',
    detailed_advice: 'Take with food to minimize stomach upset.'
  },
  'naproxen': {
    foods_to_avoid: [],
    foods_to_take_with: ['Food', 'Milk'],
    timing_requirements: 'Take with food to reduce stomach irritation',
    severity: 'Moderate',
    detailed_advice: 'Take with food to minimize stomach upset.'
  },
  'acetylsalicylic acid': {
    foods_to_avoid: [],
    foods_to_take_with: ['Food'],
    timing_requirements: 'Take with food to reduce stomach irritation',
    severity: 'Moderate',
    detailed_advice: 'Take with food to minimize stomach upset.'
  },
  'asa': {
    foods_to_avoid: [],
    foods_to_take_with: ['Food'],
    timing_requirements: 'Take with food to reduce stomach irritation',
    severity: 'Moderate',
    detailed_advice: 'Take with food to minimize stomach upset.'
  },
  'omeprazole': {
    foods_to_avoid: [],
    foods_to_take_with: [],
    timing_requirements: 'Take 30-60 minutes before meals',
    severity: 'Minor',
    detailed_advice: 'Take before meals for best effect.'
  },
  'esomeprazole': {
    foods_to_avoid: [],
    foods_to_take_with: [],
    timing_requirements: 'Take 30-60 minutes before meals',
    severity: 'Minor',
    detailed_advice: 'Take before meals for best effect.'
  },
  'lansoprazole': {
    foods_to_avoid: [],
    foods_to_take_with: [],
    timing_requirements: 'Take 30-60 minutes before meals',
    severity: 'Minor',
    detailed_advice: 'Take before meals for best effect.'
  },
  'pantoprazole': {
    foods_to_avoid: [],
    foods_to_take_with: [],
    timing_requirements: 'Take 30-60 minutes before meals',
    severity: 'Minor',
    detailed_advice: 'Take before meals for best effect.'
  },
  'rabeprazole': {
    foods_to_avoid: [],
    foods_to_take_with: [],
    timing_requirements: 'Take 30-60 minutes before meals',
    severity: 'Minor',
    detailed_advice: 'Take before meals for best effect.'
  },
  'fluoxetine': {
    foods_to_avoid: ['Alcohol'],
    foods_to_take_with: ['Food'],
    timing_requirements: 'Take with food to reduce stomach upset',
    severity: 'Moderate',
    detailed_advice: 'Take with food and limit alcohol intake.'
  },
  'sertraline': {
    foods_to_avoid: ['Alcohol'],
    foods_to_take_with: ['Food'],
    timing_requirements: 'Take with or without food',
    severity: 'Moderate',
    detailed_advice: 'Can be taken with food to reduce stomach upset.'
  },
  'paroxetine': {
    foods_to_avoid: ['Alcohol'],
    foods_to_take_with: ['Food'],
    timing_requirements: 'Take with or without food',
    severity: 'Moderate',
    detailed_advice: 'Can be taken with food to reduce stomach upset.'
  },
  'escitalopram': {
    foods_to_avoid: ['Alcohol'],
    foods_to_take_with: ['Food'],
    timing_requirements: 'Take with or without food',
    severity: 'Moderate',
    detailed_advice: 'Can be taken with food to reduce stomach upset.'
  },
  'citalopram': {
    foods_to_avoid: ['Alcohol'],
    foods_to_take_with: ['Food'],
    timing_requirements: 'Take with or without food',
    severity: 'Moderate',
    detailed_advice: 'Can be taken with food to reduce stomach upset.'
  },
  'venlafaxine': {
    foods_to_avoid: ['Alcohol'],
    foods_to_take_with: ['Food'],
    timing_requirements: 'Take with food',
    severity: 'Moderate',
    detailed_advice: 'Take with food to reduce stomach upset.'
  },
  'duloxetine': {
    foods_to_avoid: ['Alcohol'],
    foods_to_take_with: ['Food'],
    timing_requirements: 'Take with food',
    severity: 'Moderate',
    detailed_advice: 'Take with food to reduce stomach upset.'
  },
  'tramadol': {
    foods_to_avoid: ['Alcohol'],
    foods_to_take_with: ['Food'],
    timing_requirements: 'Take with or without food',
    severity: 'Moderate',
    detailed_advice: 'Can be taken with food to reduce stomach upset.'
  },
  'oxycodone': {
    foods_to_avoid: ['Alcohol'],
    foods_to_take_with: ['Food'],
    timing_requirements: 'Take with food',
    severity: 'Moderate',
    detailed_advice: 'Take with food to reduce stomach upset and nausea.'
  },
  'hydrocodone': {
    foods_to_avoid: ['Alcohol'],
    foods_to_take_with: ['Food'],
    timing_requirements: 'Take with food',
    severity: 'Moderate',
    detailed_advice: 'Take with food to reduce stomach upset and nausea.'
  },
  'morphine': {
    foods_to_avoid: ['Alcohol'],
    foods_to_take_with: ['Food'],
    timing_requirements: 'Take with food',
    severity: 'Moderate',
    detailed_advice: 'Take with food to reduce stomach upset and nausea.'
  },
  'fentanyl': {
    foods_to_avoid: ['Alcohol'],
    foods_to_take_with: [],
    timing_requirements: 'Can be taken with or without food',
    severity: 'Major',
    detailed_advice: 'Avoid alcohol completely while taking this medication.'
  },
  'methadone': {
    foods_to_avoid: ['Alcohol', 'Grapefruit juice'],
    foods_to_take_with: [],
    timing_requirements: 'Can be taken with or without food',
    severity: 'Major',
    detailed_advice: 'Avoid alcohol and grapefruit juice completely.'
  },
  'bupropion': {
    foods_to_avoid: ['Alcohol'],
    foods_to_take_with: [],
    timing_requirements: 'Take with or without food',
    severity: 'Moderate',
    detailed_advice: 'Avoid alcohol to reduce seizure risk.'
  },
  'trazodone': {
    foods_to_avoid: ['Alcohol'],
    foods_to_take_with: ['Food'],
    timing_requirements: 'Take with food',
    severity: 'Moderate',
    detailed_advice: 'Take with food shortly before bedtime.'
  },
  'zolpidem': {
    foods_to_avoid: ['Alcohol'],
    foods_to_take_with: [],
    timing_requirements: 'Take immediately before bedtime',
    severity: 'Major',
    detailed_advice: 'Take only when ready for sleep, avoid alcohol completely.'
  },
  'eszopiclone': {
    foods_to_avoid: ['Alcohol'],
    foods_to_take_with: [],
    timing_requirements: 'Take immediately before bedtime',
    severity: 'Major',
    detailed_advice: 'Take only when ready for sleep, avoid alcohol completely.'
  },
  'zaleplon': {
    foods_to_avoid: ['Alcohol'],
    foods_to_take_with: [],
    timing_requirements: 'Take immediately before bedtime',
    severity: 'Major',
    detailed_advice: 'Take only when ready for sleep, avoid alcohol completely.'
  },
  'melatonin': {
    foods_to_avoid: ['Alcohol', 'Caffeine'],
    foods_to_take_with: [],
    timing_requirements: 'Take 30-60 minutes before bedtime',
    severity: 'Minor',
    detailed_advice: 'Avoid alcohol and caffeine for best effectiveness.'
  }
};

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
  rxcui?: string;
  // UMLS integration fields
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

interface ScheduleItem {
  time: string;
  medications: Medication[];
}

interface TimelineProps {
  schedule: ScheduleItem[];
  onTimeChange?: (index: number, newTime: string) => void;
  isEditing?: boolean;
}

export default function Timeline({ schedule, onTimeChange, isEditing = false }: TimelineProps) {
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:${minutes || '00'} ${ampm}`;
  };

  const getFoodInteractionData = (medication: Medication) => {
    const genericName = medication.generic_name?.toLowerCase() || medication.generic?.toLowerCase() || '';
    const brandName = medication.brand_name?.toLowerCase() || medication.name?.toLowerCase() || '';
    
    console.log(`🔍 DEBUG: Looking up food interactions for: ${brandName} / ${genericName}`);
    console.log(`📊 DEBUG: API timing_info:`, medication.timing_info);

    const timingWithFood = medication.timing_info?.with_food?.trim();
    const timingWithFoodLower = (timingWithFood || '').toLowerCase();

    // Show food guidance only if it contains explicit instructions.
    // Hide placeholders like "consult pharmacist" / generic "take with or without food" to avoid misleading users.
    const isPlaceholderGuidance =
      !timingWithFood ||
      timingWithFoodLower.includes('consult pharmacist') ||
      timingWithFoodLower.includes('no standard timing guideline') ||
      timingWithFoodLower.includes('as directed') ||
      timingWithFoodLower.includes('optional') ||
      timingWithFoodLower.includes('not applicable') ||
      timingWithFoodLower.includes('take with food unless otherwise directed');

    const guidanceText = isPlaceholderGuidance ? null : timingWithFood;
    
    // Fallback to local database if API data is not available
    console.log(`⚠️ DEBUG: Falling back to local database for explicit food rules`);
    
    // Try generic name first
    let foodData = DRUG_FOOD_INTERACTIONS_DB[genericName];
    
    // If not found, try brand name
    if (!foodData && brandName) {
      foodData = DRUG_FOOD_INTERACTIONS_DB[brandName];
    }
    
    // If still not found, try partial matches
    if (!foodData) {
      for (const [key, value] of Object.entries(DRUG_FOOD_INTERACTIONS_DB)) {
        if (genericName.includes(key) || brandName.includes(key) || key.includes(genericName) || key.includes(brandName)) {
          foodData = value;
          console.log(`🔗 DEBUG: Found partial match: ${key}`);
          break;
        }
      }
    }
    
    // If still not found, provide default data for common medications
    if (!foodData) {
      if (genericName.includes('tobramycin') || genericName.includes('dexamethasone') || brandName.includes('tobradex')) {
        foodData = {
          foods_to_avoid: ['Contact lenses', 'Other eye drops'],
          foods_to_take_with: [],
          timing_requirements: 'Wait 15 minutes before inserting contact lenses',
          severity: 'Moderate',
          detailed_advice: 'Remove contact lenses before applying eye drops. Wait 15 minutes before reinserting.'
        };
        console.log(`✅ DEBUG: Using Tobradex-specific food data`);
      } else if (genericName.includes('metformin')) {
        foodData = {
          foods_to_avoid: ['Excessive alcohol'],
          foods_to_take_with: ['Food'],
          timing_requirements: 'Take with meals to reduce gastrointestinal side effects',
          severity: 'Moderate',
          detailed_advice: 'Always take with food to minimize stomach upset.'
        };
        console.log(`✅ DEBUG: Using Metformin-specific food data`);
      } else if (genericName.includes('lisinopril')) {
        foodData = {
          foods_to_avoid: ['Potassium supplements', 'Salt substitutes'],
          foods_to_take_with: ['Without food'],
          timing_requirements: 'Take at the same time each day',
          severity: 'Moderate',
          detailed_advice: 'Avoid potassium-rich salt substitutes while taking this medication.'
        };
        console.log(`✅ DEBUG: Using Lisinopril-specific food data`);
      }
    }
    
    console.log(`📊 DEBUG: Food data found:`, foodData);

    if (!guidanceText && !foodData) return null;

    return {
      foods_to_take_with: foodData?.foods_to_take_with || [],
      foods_to_avoid: foodData?.foods_to_avoid || [],
      guidance_text: guidanceText
    };
  };

  return (
    <div className="space-y-6">
      {schedule.map((slot, index) => {
        console.log(`\n📍 Rendering Slot ${index + 1}: ${formatTime(slot.time)}`);
        console.log(`   Medications in slot: ${slot.medications?.length || 0}`);
        
        return (
          <div 
            key={index} 
            className="p-6 bg-white border-2 border-gray-300 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02]"
          >
            {/* TIME HEADER */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 pb-4 border-b-2 border-green-200">
              {isEditing && onTimeChange ? (
                <div className="flex items-center gap-3">
                  <input
                    type="time"
                    id={`time-input-${index}`}
                    name={`time-input-${index}`}
                    value={slot.time}
                    onChange={(e) => onTimeChange(index, e.target.value)}
                    className="px-4 py-3 bg-gradient-to-r from-teal-600 to-cyan-600 text-white border-2 border-teal-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-lg font-bold shadow-lg"
                  />
                  <span className="text-base text-teal-600 font-medium">
                    ⚡ Smart editing - all times adjust
                  </span>
                </div>
              ) : (
                <div className="bg-gradient-to-r from-green-600 to-green-700 text-white px-8 py-4 rounded-2xl font-black text-2xl sm:text-3xl text-center sm:text-left shadow-lg">
                  {formatTime(slot.time)}
                </div>
              )}
              <span className="text-xl text-gray-700 font-bold text-center sm:text-left">
                {slot.medications?.length || 0} medication(s)
              </span>
            </div>
            
            {/* MEDICATIONS */}
            <div className="space-y-4">
              {slot.medications && slot.medications.length > 0 ? (
                slot.medications.map((med, medIndex) => {
                  console.log(`  Rendering med ${medIndex}:`, med);
                  
                  // Handle both API response formats
                  const brandName = med.brand_name || med.name || 'Unknown Medication';
                  const genericName = med.generic_name || med.generic || 'Unknown Medication';
                  
                  return (
                    <div 
                      key={`${slot.time}-${med.rxcui || genericName || 'unknown'}-${medIndex}`}
                      className="p-5 bg-gray-50 rounded-xl border-l-4 border-green-500 hover:bg-gray-100 transition-colors"
                    >
                      {/* MEDICATION NAME */}
                      <h4 className="font-black text-black text-xl mb-3 break-words">
                        {brandName}
                      </h4>
                      
                      {/* DETAILS */}
                      <p className="text-gray-800 font-semibold text-base mb-3 break-words">
                        {genericName} - {med.strength || 'Unknown'} - {med.dosage_form || 'Unknown'}
                      </p>
                      
                      {/* BADGES CONTAINER */}
                      <div className="flex flex-wrap gap-2 mb-3">
                        {/* RXNORM BADGE */}
                        {med.rxcui && (
                          <div className="inline-flex items-center gap-1 px-3 py-2 bg-purple-100 border-2 border-purple-400 rounded-full text-sm font-bold text-purple-800">
                            <span>📚 RxNorm: {med.rxcui}</span>
                          </div>
                        )}
                      </div>
                      
                      {/* FOOD INTERACTION BADGES */}
                      {(() => {
                        const foodData = getFoodInteractionData(med);
                        if (!foodData) return null;
                        
                        return (
                          <div className="flex flex-wrap gap-2 mt-3">
                            {foodData.foods_to_take_with && foodData.foods_to_take_with.length > 0 && (
                              <div className="inline-flex items-center gap-2 px-4 py-3 bg-green-100 border-2 border-green-400 rounded-full text-base font-bold text-green-800 shadow-md hover:bg-green-200 transition-colors">
                                <span className="text-xl">🍽️</span>
                                <span>Take with: {foodData.foods_to_take_with.join(', ')}</span>
                              </div>
                            )}
                            {foodData.foods_to_avoid && foodData.foods_to_avoid.length > 0 && (
                              <div className="inline-flex items-center gap-2 px-4 py-3 bg-red-100 border-2 border-red-400 rounded-full text-base font-bold text-red-800 shadow-md hover:bg-red-200 transition-colors">
                                <span className="text-xl">🚫</span>
                                <span>Avoid: {foodData.foods_to_avoid.join(', ')}</span>
                              </div>
                            )}
                            {foodData.guidance_text && (
                              <div className="inline-flex items-center gap-2 px-4 py-3 bg-blue-100 border-2 border-blue-400 rounded-full text-base font-bold text-blue-800 shadow-md hover:bg-blue-200 transition-colors">
                                <span className="text-xl">💡</span>
                                <span>{foodData.guidance_text}</span>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-12">
                  <Pill className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-xl text-gray-500 font-medium">No medications scheduled for this time</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
