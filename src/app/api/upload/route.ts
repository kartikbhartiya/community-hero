import { v2 as cloudinary } from 'cloudinary';
import { NextRequest, NextResponse } from 'next/server';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'doa9zlrqk',
  api_key: process.env.CLOUDINARY_API_KEY || '742321653798399',
  api_secret: process.env.CLOUDINARY_API_SECRET || '',
});

export async function POST(request: NextRequest) {
  try {
    const apiSecret = process.env.CLOUDINARY_API_SECRET || '';
    if (!apiSecret) {
      return NextResponse.json({ error: 'CLOUDINARY_API_SECRET not set on server' }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadResult = await new Promise<any>((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          resource_type: 'auto',
          folder: 'community-hero',
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(buffer);
    });

    return NextResponse.json({ secure_url: uploadResult.secure_url });
  } catch (error: any) {
    console.error('Cloudinary API upload failed:', error);
    return NextResponse.json({ error: error.message || 'Server upload failed' }, { status: 500 });
  }
}
