import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const fileUrl = searchParams.get('url');
  const fileName = searchParams.get('name');

  if (!fileUrl) {
    return NextResponse.json({ error: 'Missing file URL' }, { status: 400 });
  }

  try {
    const response = await fetch(fileUrl);
    
    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch file: ${response.statusText}` }, 
        { status: response.status }
      );
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const contentDisposition = `attachment; filename="${fileName || 'download'}"`;
    
    // Create a new response with the body stream
    return new NextResponse(response.body, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': contentDisposition,
      },
    });
  } catch (error) {
    console.error('Error fetching file:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
