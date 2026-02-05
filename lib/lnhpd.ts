// LNHPD (Licensed Natural Health Products Database) API Integration
// Provides access to natural health products, vitamins, supplements, and OTC products

export interface LNHPDProduct {
  lnhpd_id: number;
  licence_number: string;
  product_name: string;
  dosage_form: string;
  company_name: string;
  flag_product_status: number; // 1 = Active, 0 = Inactive
}

export interface LNHPDMedicinalIngredient {
  ingredient_name: string;
  ingredient_strength: string;
  ingredient_unit: string;
}

export interface LNHPDProductPurpose {
  purpose_text: string;
}

export interface LNHPDRisk {
  risk_text: string;
}

export interface LNHPDEnrichedProduct extends LNHPDProduct {
  medicinal_ingredients: LNHPDMedicinalIngredient[];
  product_purposes: LNHPDProductPurpose[];
  risks: LNHPDRisk[];
  source: 'LNHPD';
}

const LNHPD_BASE_URL = 'https://health-products.canada.ca/api/natural-licences';

// Simple in-memory cache to avoid redundant API calls
const lnhpdCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes for LNHPD

function getFromCache(key: string): any | null {
  const cached = lnhpdCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  lnhpdCache.delete(key);
  return null;
}

function setCache(key: string, data: any): void {
  lnhpdCache.set(key, { data, timestamp: Date.now() });
}

async function makeLNHPDRequest(url: string): Promise<any> {
  try {
    console.log(`🔍 LNHPD API Request: ${url}`);
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`LNHPD API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`✅ LNHPD Response: ${data.length || 0} items`);
    return data;
  } catch (error) {
    console.error('LNHPD API request failed:', error);
    throw error;
  }
}

async function getAllProductLicences(): Promise<LNHPDProduct[]> {
  const cacheKey = 'productlicence:all:en';
  const cached = getFromCache(cacheKey);
  if (cached) return cached;

  const url = `${LNHPD_BASE_URL}/productlicence/?type=json&lang=en`;
  const allProducts = await makeLNHPDRequest(url);
  setCache(cacheKey, allProducts);
  return allProducts;
}

/**
 * Search for natural health products in LNHPD database
 * @param searchTerm - Product name to search for
 * @returns Array of matching products
 */
export async function searchLNHPDProducts(searchTerm: string): Promise<LNHPDProduct[]> {
  const cacheKey = `search:${searchTerm}`;
  const cached = getFromCache(cacheKey);
  if (cached) return cached;

  try {
    const allProducts = await getAllProductLicences();
    
    // Filter products that match the search term
    const filteredProducts = allProducts.filter((product: LNHPDProduct) => {
      const searchLower = searchTerm.toLowerCase();
      const nameMatch = product.product_name?.toLowerCase().includes(searchLower);
      const companyMatch = product.company_name?.toLowerCase().includes(searchLower);
      const licenceMatch = product.licence_number?.toLowerCase().includes(searchLower);
      
      return nameMatch || companyMatch || licenceMatch;
    });

    // Only return active products (flag_product_status: 1 = Active, 0 = Inactive)
    const activeProducts = filteredProducts.filter((product: LNHPDProduct) => 
      product.flag_product_status === 1
    );

    setCache(cacheKey, activeProducts);
    return activeProducts;
  } catch (error) {
    console.error('Error searching LNHPD products:', error);
    return [];
  }
}

/**
 * Get detailed medicinal ingredients for a product
 * @param licenceNumber - Product licence number
 * @returns Array of medicinal ingredients
 */
export async function getLNHPDMedicinalIngredients(licenceNumber: string): Promise<LNHPDMedicinalIngredient[]> {
  const cacheKey = `ingredients:${licenceNumber}`;
  const cached = getFromCache(cacheKey);
  if (cached) return cached;

  try {
    const url = `${LNHPD_BASE_URL}/medicinalingredient/?id=${licenceNumber}&type=json&lang=en`;
    const ingredients = await makeLNHPDRequest(url);
    
    setCache(cacheKey, ingredients);
    return ingredients;
  } catch (error) {
    console.error('Error getting LNHPD ingredients:', error);
    return [];
  }
}

/**
 * Get product purposes/recommended uses
 * @param licenceNumber - Product licence number
 * @returns Array of product purposes
 */
export async function getLNHPDProductPurposes(licenceNumber: string): Promise<LNHPDProductPurpose[]> {
  const cacheKey = `purposes:${licenceNumber}`;
  const cached = getFromCache(cacheKey);
  if (cached) return cached;

  try {
    const url = `${LNHPD_BASE_URL}/productpurpose/?id=${licenceNumber}&type=json&lang=en`;
    const purposes = await makeLNHPDRequest(url);
    
    setCache(cacheKey, purposes);
    return purposes;
  } catch (error) {
    console.error('Error getting LNHPD purposes:', error);
    return [];
  }
}

/**
 * Get product risks and warnings
 * @param licenceNumber - Product licence number
 * @returns Array of product risks
 */
export async function getLNHPDRisks(licenceNumber: string): Promise<LNHPDRisk[]> {
  const cacheKey = `risks:${licenceNumber}`;
  const cached = getFromCache(cacheKey);
  if (cached) return cached;

  try {
    const url = `${LNHPD_BASE_URL}/productrisk/?id=${licenceNumber}&type=json&lang=en`;
    const risks = await makeLNHPDRequest(url);
    
    setCache(cacheKey, risks);
    return risks;
  } catch (error) {
    console.error('Error getting LNHPD risks:', error);
    return [];
  }
}

/**
 * Get complete enriched product information
 * @param searchTerm - Product to search for
 * @returns Array of enriched products with all details
 */
export async function getEnrichedLNHPDProducts(searchTerm: string): Promise<LNHPDEnrichedProduct[]> {
  try {
    // First get basic product list
    const products = await searchLNHPDProducts(searchTerm);
    
    // Enrich each product with additional details
    const enrichedProducts = await Promise.all(
      products.slice(0, 10).map(async (product) => { // Limit to 10 for performance
        const [medicinalIngredients, productPurposes, risks] = await Promise.allSettled([
          getLNHPDMedicinalIngredients(product.licence_number),
          getLNHPDProductPurposes(product.licence_number),
          getLNHPDRisks(product.licence_number)
        ]);

        return {
          ...product,
          medicinal_ingredients: medicinalIngredients.status === 'fulfilled' ? medicinalIngredients.value : [],
          product_purposes: productPurposes.status === 'fulfilled' ? productPurposes.value : [],
          risks: risks.status === 'fulfilled' ? risks.value : [],
          source: 'LNHPD' as const
        };
      })
    );

    return enrichedProducts;
  } catch (error) {
    console.error('Error getting enriched LNHPD products:', error);
    return [];
  }
}

/**
 * Convert LNHPD product to standard Drug interface format
 */
export function convertLNHPDToDrug(lnhpdProduct: LNHPDEnrichedProduct): any {
  const mainIngredient = lnhpdProduct.medicinal_ingredients && lnhpdProduct.medicinal_ingredients.length > 0 
    ? lnhpdProduct.medicinal_ingredients[0] 
    : null;
  const ingredientName = mainIngredient?.ingredient_name || 'Natural Health Product';
  const strength = mainIngredient ? 
    `${mainIngredient.ingredient_strength} ${mainIngredient.ingredient_unit}` : 
    'Various';
  
  const purpose = lnhpdProduct.product_purposes && lnhpdProduct.product_purposes.length > 0
    ? lnhpdProduct.product_purposes[0]?.purpose_text 
    : 'Helps maintain good health';
  
  const risks = lnhpdProduct.risks && lnhpdProduct.risks.length > 0
    ? lnhpdProduct.risks.map(r => r.risk_text).join('; ')
    : '';
  
  // Smart categorization based on dosage form and product name
  let category = 'Vitamins & Supplements';
  if (lnhpdProduct.dosage_form?.toLowerCase().includes('eye drop') ||
      lnhpdProduct.dosage_form?.toLowerCase().includes('drops') ||
      lnhpdProduct.product_name?.toLowerCase().includes('eye') ||
      lnhpdProduct.product_name?.toLowerCase().includes('ophthalmic')) {
    category = 'Ophthalmic';
  } else if (lnhpdProduct.product_name?.toLowerCase().includes('vitamin') ||
             lnhpdProduct.product_name?.toLowerCase().includes('mineral') ||
             ingredientName.toLowerCase().includes('vitamin') ||
             ingredientName.toLowerCase().includes('mineral')) {
    category = 'Vitamins & Supplements';
  } else if (lnhpdProduct.product_name?.toLowerCase().includes('omega') ||
             ingredientName.toLowerCase().includes('fish oil')) {
    category = 'Vitamins & Supplements';
  }
  
  return {
    din: lnhpdProduct.licence_number,
    brand_name: lnhpdProduct.product_name,
    generic_name: ingredientName,
    strength: strength,
    dosage_form: lnhpdProduct.dosage_form || 'Tablet',
    route: 'ORAL',
    manufacturer: lnhpdProduct.company_name,
    drug_class: 'Natural Health Product',
    category: category,
    timing_info: {
      timing: 'Once daily',
      with_food: 'With food or as directed',
      rationale: 'Natural health product - follow label directions',
      source: 'LNHPD'
    },
    // Additional LNHPD-specific fields
    lnhpd_id: lnhpdProduct.licence_number,
    product_purpose: purpose,
    risks: risks,
    medicinal_ingredients: lnhpdProduct.medicinal_ingredients || [],
    source: 'LNHPD'
  };
}

/**
 * Check if a search term might be a natural health product
 */
export function isLikelyNHP(searchTerm: string): boolean {
  const nhpKeywords = [
    'vitamin', 'supplement', 'omega', 'fish oil', 'calcium', 'iron', 'zinc',
    'magnesium', 'probiotic', 'coenzyme', 'melatonin', 'centrum', 'jamieson',
    'webber', 'lifes', 'nature', 'herbal', 'organic', 'natural', 'multivitamin',
    'vitamin c', 'vitamin d', 'vitamin b', 'vitamin e', 'vitamin k',
    'folic acid', 'biotin', 'collagen', 'turmeric', 'ginger', 'garlic'
  ];
  
  const searchLower = searchTerm.toLowerCase();
  return nhpKeywords.some(keyword => searchLower.includes(keyword));
}
