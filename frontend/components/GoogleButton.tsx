'use client';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { getPostAuthPath, googleLogin } from '@/lib/auth';
import { useStore } from '@/lib/store';

export default function GoogleButton() {
  const router = useRouter();
  const setUser = useStore(s => s.setUser);
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!clientId) return null;

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <div className="flex justify-center">
        <GoogleLogin
          text="continue_with"
          onSuccess={async (res) => {
            try {
              const { user } = await googleLogin(res.credential as string);
              setUser(user);
              toast.success(`Welcome, ${user.name}!`);
              router.push(getPostAuthPath());
            } catch (err: any) {
              toast.error(err.response?.data?.error || 'Google sign-in failed');
            }
          }}
          onError={() => toast.error('Google sign-in failed')}
        />
      </div>
    </GoogleOAuthProvider>
  );
}