
'use client';

import { useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';

// This is a client component that will listen for the custom event.
// It will be mounted once in the root layout.
export default function FirebaseErrorListener() {
  useEffect(() => {
    const handleError = (error: any) => {
      // The Next.js development overlay will automatically pick up
      // uncaught exceptions. We throw the error here to trigger it.
      // This provides a much better debugging experience than just logging.
      console.error("Caught Firestore Permission Error for debugging:", error.toJSON());
      // Throwing the error makes it visible in the Next.js overlay
      throw error;
    };

    errorEmitter.on('permission-error', handleError);

    // Clean up the listener when the component unmounts
    return () => {
      errorEmitter.removeListener('permission-error', handleError);
    };
  }, []);

  // This component does not render anything to the DOM
  return null;
}
