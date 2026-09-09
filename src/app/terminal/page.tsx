import type { Metadata } from 'next';
import Terminal from './Terminal';

export const metadata: Metadata = {
  title: 'Terminal — DRILL/SOL (Devnet)',
  description: 'Paper-trading terminal on the Argus devnet market. Simulated fills against live pool price.',
};

export default function TerminalPage() {
  return <Terminal />;
}
