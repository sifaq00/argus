import type { Metadata } from 'next';
import LandingView from '@/components/landing/LandingView';

export const metadata: Metadata = {
  title: 'ARGUS — Intelligence Infrastructure',
  description:
    'Argus turns fragmented signals into an operational picture your people can act on. Live air, sea, space, and threat surface monitoring.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'ARGUS — Intelligence Infrastructure',
    description:
      'Argus turns fragmented signals into an operational picture your people can act on.',
    url: '/',
    type: 'website',
  },
};

export default function Page() {
  return <LandingView />;
}
