import { NextRequest, NextResponse } from 'next/server';
import { 
  searchUMLSDrug, 
  getRxNormCode, 
  getUMLSDrugDetails, 
  crosswalkDrugCodes,
  getEnhancedDrugInfo 
} from '@/lib/umls';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { drugName, action, sourceCode, sourceVocab, targetVocabs } = body;

    // Validate required fields
    if (!action) {
      return NextResponse.json(
        { error: 'Action is required' },
        { status: 400 }
      );
    }

    let result;

    switch (action) {
      case 'search':
        if (!drugName) {
          return NextResponse.json(
            { error: 'Drug name is required for search action' },
            { status: 400 }
          );
        }
        result = await searchUMLSDrug(drugName);
        break;

      case 'rxnorm':
        if (!drugName) {
          return NextResponse.json(
            { error: 'Drug name is required for rxnorm action' },
            { status: 400 }
          );
        }
        result = await getRxNormCode(drugName);
        break;

      case 'details':
        if (!drugName) {
          return NextResponse.json(
            { error: 'CUI is required for details action' },
            { status: 400 }
          );
        }
        result = await getUMLSDrugDetails(drugName);
        break;

      case 'crosswalk':
        if (!sourceCode || !sourceVocab || !targetVocabs) {
          return NextResponse.json(
            { error: 'sourceCode, sourceVocab, and targetVocabs are required for crosswalk action' },
            { status: 400 }
          );
        }
        result = await crosswalkDrugCodes(sourceCode, sourceVocab, targetVocabs);
        break;

      case 'enhanced':
        if (!drugName) {
          return NextResponse.json(
            { error: 'Drug name is required for enhanced action' },
            { status: 400 }
          );
        }
        result = await getEnhancedDrugInfo(drugName);
        break;

      default:
        return NextResponse.json(
          { error: `Invalid action: ${action}. Valid actions: search, rxnorm, details, crosswalk, enhanced` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error: any) {
    console.error('UMLS API error:', error);
    
    // Handle specific error cases
    if (error.message?.includes('UMLS_API_KEY')) {
      return NextResponse.json(
        { 
          success: false,
          error: 'UMLS API key not configured',
          details: 'Please check your environment configuration'
        },
        { status: 500 }
      );
    }

    if (error.message?.includes('403')) {
      return NextResponse.json(
        { 
          success: false,
          error: 'UMLS API authentication failed',
          details: 'Please check your API key'
        },
        { status: 401 }
      );
    }

    if (error.message?.includes('429')) {
      return NextResponse.json(
        { 
          success: false,
          error: 'UMLS API rate limit exceeded',
          details: 'Please try again later'
        },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { 
        success: false,
        error: 'UMLS API request failed',
        details: error.message || 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}

// Support GET requests for testing (optional)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const drugName = searchParams.get('drugName');
  const action = searchParams.get('action') || 'search';

  try {
    let result;

    switch (action) {
      case 'rxnorm':
        if (!drugName) {
          return NextResponse.json(
            { error: 'Drug name is required' },
            { status: 400 }
          );
        }
        result = await getRxNormCode(drugName);
        break;

      default:
        return NextResponse.json(
          { error: 'GET requests only support rxnorm action' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error: any) {
    console.error('UMLS GET API error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'UMLS API request failed',
        details: error.message || 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}
