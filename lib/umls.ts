// UMLS (Unified Medical Language System) API Integration
// Provides standardized medical terminology and drug code mapping

export interface UMLSSearchResult {
  ui: string; // CUI (Concept Unique Identifier)
  name: string;
  semanticTypes: string[];
}

export interface UMLSDrugDetails {
  ui: string;
  name: string;
  semanticTypes: string[];
  definitions: string[];
  relationships: Array<{
    relatedId: string;
    relationLabel: string;
    relatedName: string;
  }>;
}

export interface DrugCodeMapping {
  rxcui?: string;
  ndc?: string;
  snomedCT?: string;
  atc?: string;
}

const UMLS_BASE_URL = 'https://uts-ws.nlm.nih.gov/rest';

// Simple in-memory cache to avoid redundant API calls
const umlsCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

function getFromCache(key: string): any | null {
  const cached = umlsCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  umlsCache.delete(key);
  return null;
}

function setCache(key: string, data: any): void {
  umlsCache.set(key, { data, timestamp: Date.now() });
}

async function makeUMLSRequest(url: string): Promise<any> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`UMLS API error: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('UMLS API request failed:', error);
    throw error;
  }
}

/**
 * Search for drugs in UMLS database
 * @param drugName - Name of the drug to search for
 * @returns Array of search results with CUI, name, and semantic types
 */
export async function searchUMLSDrug(drugName: string): Promise<UMLSSearchResult[]> {
  const apiKey = process.env.UMLS_API_KEY;
  if (!apiKey) {
    console.warn('UMLS_API_KEY not found in environment variables');
    return [];
  }

  const cacheKey = `search:${drugName}`;
  const cached = getFromCache(cacheKey);
  if (cached) return cached;

  try {
    const url = `${UMLS_BASE_URL}/search/current?string=${encodeURIComponent(drugName)}&apiKey=${apiKey}&searchType=words&returnIdType=concept&pageSize=10`;
    const response = await makeUMLSRequest(url);
    
    const results: UMLSSearchResult[] = response.result?.results?.map((item: any) => ({
      ui: item.ui,
      name: item.name,
      semanticTypes: item.semanticTypes?.map((type: any) => type.name) || []
    })) || [];

    setCache(cacheKey, results);
    return results;
  } catch (error) {
    console.error('Error searching UMLS drug:', error);
    return [];
  }
}

/**
 * Get RxNorm code for a drug
 * @param drugName - Name of the drug to search for
 * @returns RxCUI string or null if not found
 */
export async function getRxNormCode(drugName: string): Promise<string | null> {
  const apiKey = process.env.UMLS_API_KEY;
  if (!apiKey) {
    console.warn('UMLS_API_KEY not found in environment variables');
    return null;
  }

  const cacheKey = `rxnorm:${drugName}`;
  const cached = getFromCache(cacheKey);
  if (cached) return cached;

  try {
    const url = `${UMLS_BASE_URL}/search/current?string=${encodeURIComponent(drugName)}&apiKey=${apiKey}&sabs=RXNORM&returnIdType=code`;
    const response = await makeUMLSRequest(url);
    
    const results = response.result?.results || [];
    if (results.length > 0) {
      const rxcui = results[0].ui; // The first result's UI is the RxCUI
      setCache(cacheKey, rxcui);
      return rxcui;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting RxNorm code:', error);
    return null;
  }
}

/**
 * Get detailed UMLS information for a concept
 * @param cui - Concept Unique Identifier
 * @returns Full concept details or null if not found
 */
export async function getUMLSDrugDetails(cui: string): Promise<UMLSDrugDetails | null> {
  const apiKey = process.env.UMLS_API_KEY;
  if (!apiKey) {
    console.warn('UMLS_API_KEY not found in environment variables');
    return null;
  }

  const cacheKey = `details:${cui}`;
  const cached = getFromCache(cacheKey);
  if (cached) return cached;

  try {
    const url = `${UMLS_BASE_URL}/content/current/CUI/${cui}?apiKey=${apiKey}`;
    const response = await makeUMLSRequest(url);
    
    const result = response.result;
    if (!result) return null;

    const details: UMLSDrugDetails = {
      ui: result.ui,
      name: result.name,
      semanticTypes: result.semanticTypes?.map((type: any) => type.name) || [],
      definitions: result.definitions?.map((def: any) => def.value) || [],
      relationships: result.relationships?.map((rel: any) => ({
        relatedId: rel.relatedId,
        relationLabel: rel.relationLabel,
        relatedName: rel.relatedName
      })) || []
    };

    setCache(cacheKey, details);
    return details;
  } catch (error) {
    console.error('Error getting UMLS drug details:', error);
    return null;
  }
}

/**
 * Crosswalk between different drug code systems
 * @param sourceCode - Source code (e.g., RxCUI)
 * @param sourceVocab - Source vocabulary (e.g., RXNORM)
 * @param targetVocabs - Array of target vocabularies (e.g., ['NDC', 'SNOMEDCT_US', 'ATC'])
 * @returns Mapping of target codes
 */
export async function crosswalkDrugCodes(
  sourceCode: string, 
  sourceVocab: string, 
  targetVocabs: string[]
): Promise<DrugCodeMapping> {
  const apiKey = process.env.UMLS_API_KEY;
  if (!apiKey) {
    console.warn('UMLS_API_KEY not found in environment variables');
    return {};
  }

  const cacheKey = `crosswalk:${sourceVocab}:${sourceCode}:${targetVocabs.join(',')}`;
  const cached = getFromCache(cacheKey);
  if (cached) return cached;

  try {
    const url = `${UMLS_BASE_URL}/crosswalk/current/source/${sourceVocab}/${sourceCode}?targetSource=${targetVocabs.join(',')}&apiKey=${apiKey}`;
    const response = await makeUMLSRequest(url);
    
    const results = response.result?.results || [];
    const mapping: DrugCodeMapping = {};

    results.forEach((item: any) => {
      switch (item.targetSourceName) {
        case 'NDC':
          mapping.ndc = item.targetCode;
          break;
        case 'SNOMEDCT_US':
          mapping.snomedCT = item.targetCode;
          break;
        case 'ATC':
          mapping.atc = item.targetCode;
          break;
        case 'RXNORM':
          mapping.rxcui = item.targetCode;
          break;
      }
    });

    setCache(cacheKey, mapping);
    return mapping;
  } catch (error) {
    console.error('Error crosswalking drug codes:', error);
    return {};
  }
}

/**
 * Enhanced drug lookup that combines multiple UMLS calls
 * @param drugName - Name of the drug
 * @returns Comprehensive drug information
 */
export async function getEnhancedDrugInfo(drugName: string): Promise<{
  rxcui?: string;
  cui?: string;
  name?: string;
  codeMapping?: DrugCodeMapping;
  details?: UMLSDrugDetails;
}> {
  try {
    // Get RxNorm code first (most important for our use case)
    const rxcui = await getRxNormCode(drugName);
    if (!rxcui) {
      return {};
    }

    // Get basic search to find CUI
    const searchResults = await searchUMLSDrug(drugName);
    const drugResult = searchResults.find(result => result.ui === rxcui);
    const cui = drugResult?.ui;

    // Get code mapping
    const codeMapping = cui ? await crosswalkDrugCodes(cui, 'RXNORM', ['NDC', 'SNOMEDCT_US', 'ATC']) : {};

    // Get detailed information
    const details = cui ? await getUMLSDrugDetails(cui) : undefined;

    return {
      rxcui,
      cui,
      name: drugResult?.name,
      codeMapping,
      details: details || undefined
    };
  } catch (error) {
    console.error('Error getting enhanced drug info:', error);
    return {};
  }
}
