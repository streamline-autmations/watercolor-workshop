import { TopBar } from './TopBar';

export const AppShell = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="min-h-screen bg-bg-soft">
      <TopBar />
      <main className="pt-28 md:pt-20">
        {children}
      </main>
    </div>
  );
};