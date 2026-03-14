import { useSearchParams } from 'react-router-dom';
import { OAuthButton } from '@/components/ui/OAuthButton';

const ERROR_MESSAGES: Record<string, string> = {
  not_invited: "This account isn't invited. Contact the owner to request access.",
  default: 'Sign-in failed. Please try again.',
};

async function signInWithLine() {
  const res = await fetch('/api/auth/sign-in/oauth2', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ providerId: 'line', callbackURL: '/' }),
  });
  const data = (await res.json()) as { url?: string };
  if (data.url) {
    window.location.href = data.url;
  }
}

export function LoginPage() {
  const [searchParams] = useSearchParams();
  const errorKey = searchParams.get('error');
  const errorMessage = errorKey ? (ERROR_MESSAGES[errorKey] ?? ERROR_MESSAGES.default) : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-gray-900 p-8 shadow-xl">
        <h1 className="mb-6 text-center text-3xl font-semibold text-white">Pax</h1>
        <div className="mb-6 border-t border-white/10" />
        {errorMessage && (
          <div
            role="alert"
            className="mb-4 rounded-lg border border-red-800 bg-red-950 px-4 py-3 text-sm text-red-300"
          >
            {errorMessage}
          </div>
        )}
        <div className="flex flex-col gap-3">
          <OAuthButton
            provider="google"
            href="/api/auth/sign-in/social?provider=google&callbackURL=/"
          />
          <OAuthButton provider="line" onClick={signInWithLine} />
        </div>
      </div>
    </div>
  );
}
