import { NextRequest, NextResponse } from 'next/server';
import { 
  searchLNHPDProducts,
  getEnrichedLNHPDProducts,
  convertLNHPDToDrug,
  isLikelyNHP
} from '@/lib/lnhpd';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { searchTerm, action = 'search' } = body;

    // Validate required fields
    if (!searchTerm && action === 'search') {
      return NextResponse.json(
        { error: 'Search term is required for search action' },
        { status: 400 }
      );
    }

    let result;

    switch (action) {
      case 'search':
        result = await searchLNHPDProducts(searchTerm);
        break;

      case 'enriched':
        result = await getEnrichedLNHPDProducts(searchTerm);
        break;

      case 'convert':
        // Convert LNHPD products to standard Drug format
        const enrichedProducts = await getEnrichedLNHPDProducts(searchTerm);
        result = enrichedProducts.map(product => convertLNHPDToDrug(product));
        break;

      case 'check':
        // Check if search term is likely a natural health product
        result = { isLikelyNHP: isLikelyNHP(searchTerm) };
        break;

      default:
        return NextResponse.json(
          { error: `Invalid action: ${action}. Valid actions: search, enriched, convert, check` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: result,
      source: 'LNHPD'
    });

  } catch (error: any) {
    console.error('LNHPD API error:', error);
    
    // Handle specific error cases
    if (error.message?.includes('fetch')) {
      return NextResponse.json(
        { 
          success: false,
          error: 'LNHPD API temporarily unavailable',
          details: 'Natural health products search is temporarily unavailable. Please try again later.',
          fallback: 'Using local medication database only'
        },
        { status: 503 }
      );
    }

    if (error.message?.includes('404')) {
      return NextResponse.json(
        { 
          success: false,
          error: 'LNHPD API endpoint not found',
          details: 'The natural health products database is currently unavailable'
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { 
        success: false,
        error: 'LNHPD API request failed',
        details: error.message || 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}

// Support GET requests for testing (optional)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const searchTerm = searchParams.get('searchTerm');
  const action = searchParams.get('action') || 'search';

  try {
    let result;

    switch (action) {
      case 'check':
        if (!searchTerm) {
          return NextResponse.json(
            { error: 'Search term is required for check action' },
            { status: 400 }
          );
        }
        result = { isLikelyNHP: isLikelyNHP(searchTerm) };
        break;

      default:
        return NextResponse.json(
          { error: 'GET requests only support check action' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: result,
      source: 'LNHPD'
    });

  } catch (error: any) {
    console.error('LNHPD GET API error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'LNHPD API request failed',
        details: error.message || 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}
