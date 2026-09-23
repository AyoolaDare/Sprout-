// src/app/api/proxy-upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminStorage } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

async function deleteOldLogo(oldLogoUrl: string): Promise<void> {
    if (!oldLogoUrl) return;

    try {
        const storage = getAdminStorage();
        const bucket = storage.bucket();
        // Extract the file path from the full URL
        // e.g., https://storage.googleapis.com/bucket-name/users/uid/logos/file_name
        const url = new URL(oldLogoUrl);
        // The path starts with a '/', so we remove it.
        const filePath = url.pathname.substring(1).split('/').slice(1).join('/');

        if (filePath.includes('users/')) { // Basic security check
            const fileRef = bucket.file(filePath);
            await fileRef.delete();
            console.log(`Successfully deleted old logo: ${filePath}`);
        }
    } catch (error: any) {
        // Log the error but don't block the upload process
        console.warn(`Could not delete old logo: ${oldLogoUrl}. Error: ${error.message}`);
    }
}


export async function POST(req: NextRequest) {
  try {
    // 1. Verify User Authentication
    const authorization = req.headers.get('Authorization');
    if (!authorization?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'User is not authenticated.' }, { status: 401 });
    }
    const idToken = authorization.split('Bearer ')[1];

    let decodedToken;
    try {
      const auth = getAdminAuth();
      decodedToken = await auth.verifyIdToken(idToken);
    } catch (error) {
      console.error("Error verifying ID token:", error);
      return NextResponse.json({ error: 'Invalid authentication token.' }, { status: 401 });
    }
    const userId = decodedToken.uid;

    // 2. Process File and Old URL from FormData
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const oldLogoUrl = formData.get('oldLogoUrl') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
    }
    
    if (file.size > 5 * 1024 * 1024) { // 5MB limit on the server
      return NextResponse.json({ error: 'File is too large. Max size is 5MB.' }, { status: 400 });
    }

    // 3. Delete old logo if URL is provided
    if (oldLogoUrl) {
        await deleteOldLogo(oldLogoUrl);
    }
    
    // 4. Upload File to Firebase Storage using Admin SDK
    const storage = getAdminStorage();
    const bucket = storage.bucket();
    const filePath = `users/${userId}/logos/${Date.now()}_${file.name}`;
    const fileRef = bucket.file(filePath);

    // Stream the file from the request to Firebase Storage
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    await fileRef.save(fileBuffer, {
        metadata: {
            contentType: file.type,
        },
    });

    // 5. Make the file public and get the public URL.
    await fileRef.makePublic();
    
    const downloadURL = `https://storage.googleapis.com/${bucket.name}/${filePath}`;
    
    return NextResponse.json({ downloadURL }, { status: 200 });

  } catch (error: any) {
    console.error('Error in proxy upload API route:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while uploading the file.' },
      { status: 500 }
    );
  }
}
