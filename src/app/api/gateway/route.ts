import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

export async function GET(request: NextRequest) {
  try {
    // Read the gateway HTML file
    const gatewayPath = join(process.cwd(), 'GATEWAY', 'index.html');
    const htmlContent = readFileSync(gatewayPath, 'utf8');
    
    // Update the API URLs to point to the Next.js server
    const updatedHtml = htmlContent
      .replace(/\/api\/payment\/initiate/g, '/api/payment/initiate')
      .replace(/\/api\/payment\/status/g, '/api/payment/status');
    
    return new NextResponse(updatedHtml, {
      headers: {
        'Content-Type': 'text/html',
      },
    });
  } catch (error) {
    console.error('Error serving gateway page:', error);
    return new NextResponse('Gateway page not found', { status: 404 });
  }
}
