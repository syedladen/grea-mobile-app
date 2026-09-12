import { Platform } from 'react-native';

let configured = false;

// Load only on a user action so missing native modules do not break password auth.
export async function getGoogleIdToken(): Promise<string | null> {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
    throw new Error('googleSignInUnavailable');
  }

  const sdk = await import('react-native-nitro-google-signin').catch(() => {
    throw new Error('googleSignInUnavailable');
  });
  const { GoogleOneTapSignIn, isSuccessResponse, isCancelledResponse, isErrorWithCode, statusCodes } = sdk;

  try {
    if (!configured) {
      GoogleOneTapSignIn.configure({
        webClientId: '1086555684529-h03utkeid14i0dch6dbj78pa0699pon8.apps.googleusercontent.com',
        iosClientId: '1086555684529-seq2470u7i4dbbq4t0kku618ovu2rolq.apps.googleusercontent.com',
        offlineAccess: false,
      });
      configured = true;
    }
    await GoogleOneTapSignIn.checkPlayServices();
    const response = await GoogleOneTapSignIn.presentExplicitSignIn();
    if (isCancelledResponse(response)) return null;
    if (isSuccessResponse(response) && response.data.idToken) return response.data.idToken;
  } catch (error) {
    if (isErrorWithCode(error)) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) return null;
      if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        throw new Error('googlePlayServicesRequired');
      }
      if (error.code === statusCodes.DEVELOPER_ERROR) {
        throw new Error('googleSignInUnavailable');
      }
    }
    // Never forward native errors that might contain credentials.
    throw new Error('googleSignInFailed');
  }
  throw new Error('googleSignInFailed');
}
