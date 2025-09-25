import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface LegalPageLayoutProps {
  title: string;
  children: ReactNode;
}

export const LegalPageLayout = ({ title, children }: LegalPageLayoutProps) => {
  return (
    <div className="bg-bg-soft min-h-screen">
      <header className="bg-white/80 dark:bg-blom-dark-bg/80 shadow-sm backdrop-blur-lg sticky top-0 z-10">
        <div className="container mx-auto flex items-center h-20">
          <Link to="/" className="flex items-center gap-2 text-sm font-semibold text-ink hover:text-primary">
            <ArrowLeft className="w-4 h-4" />
            Back to BLOM Academy
          </Link>
        </div>
      </header>
      <main className="container mx-auto py-10">
        <div className="max-w-4xl mx-auto bg-white dark:bg-blom-dark-card p-8 md:p-12 rounded-2xl shadow-card">
          <h1 className="text-3xl md:text-4xl font-bold text-ink mb-8">{title}</h1>
          <div className="prose dark:prose-invert max-w-none">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};