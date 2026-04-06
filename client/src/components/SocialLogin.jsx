import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLang } from '@/contexts/LanguageContext';
import api from '@/lib/api';

// Google icon SVG
function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

// Facebook icon SVG
function FacebookIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="#1877F2">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

export default function SocialLogin({ onError }) {
  const { t } = useLang();
  const navigate = useNavigate();
  const { login: setAuth } = useAuth();
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingFb, setLoadingFb] = useState(false);

  // Handle the response from social auth backend
  const handleSocialAuth = useCallback(async (provider, payload) => {
    try {
      const res = await api.post(`/auth/${provider}`, payload);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      window.location.href = '/'; // Full reload to reset auth state
    } catch (err) {
      onError?.(err.response?.data?.error || `${provider} login failed`);
    }
  }, [onError]);

  // ─── Google Sign-In ───
  useEffect(() => {
    // Load Google Identity Services script
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);

    script.onload = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
          callback: (response) => {
            setLoadingGoogle(true);
            handleSocialAuth('google', { credential: response.credential })
              .finally(() => setLoadingGoogle(false));
          },
        });
      }
    };

    return () => {
      document.head.removeChild(script);
    };
  }, [handleSocialAuth]);

  const handleGoogleClick = () => {
    if (window.google) {
      window.google.accounts.id.prompt();
    } else {
      onError?.('Google Sign-In not loaded. Please try again.');
    }
  };

  // ─── Facebook Login ───
  useEffect(() => {
    // Load Facebook SDK
    window.fbAsyncInit = function () {
      window.FB.init({
        appId: import.meta.env.VITE_FACEBOOK_APP_ID || '',
        cookie: true,
        xfbml: true,
        version: 'v19.0',
      });
    };

    const script = document.createElement('script');
    script.src = 'https://connect.facebook.net/en_US/sdk.js';
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  const handleFacebookClick = () => {
    if (!window.FB) {
      onError?.('Facebook SDK not loaded. Please try again.');
      return;
    }

    setLoadingFb(true);
    window.FB.login(
      (response) => {
        if (response.authResponse) {
          handleSocialAuth('facebook', {
            accessToken: response.authResponse.accessToken,
            userID: response.authResponse.userID,
          }).finally(() => setLoadingFb(false));
        } else {
          setLoadingFb(false);
        }
      },
      { scope: 'email,public_profile' }
    );
  };

  return (
    <div className="space-y-2">
      {/* Google */}
      <button
        type="button"
        onClick={handleGoogleClick}
        disabled={loadingGoogle}
        className="flex w-full items-center justify-center gap-3 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:opacity-50"
      >
        <GoogleIcon />
        {loadingGoogle ? t('loading') : t('continueWithGoogle')}
      </button>

      {/* Facebook */}
      <button
        type="button"
        onClick={handleFacebookClick}
        disabled={loadingFb}
        className="flex w-full items-center justify-center gap-3 rounded-lg border border-[#1877F2] bg-[#1877F2] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#166FE5] disabled:opacity-50"
      >
        <FacebookIcon />
        {loadingFb ? t('loading') : t('continueWithFacebook')}
      </button>
    </div>
  );
}
