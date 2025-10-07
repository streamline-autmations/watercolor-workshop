import { Snowflake } from 'lucide-react';

export const FestiveBanner = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="relative text-center mb-12 p-8 bg-accent rounded-2xl overflow-hidden border border-accent-foreground/20">
      <div className="absolute -top-4 -left-4 text-red-100 dark:text-red-500/10">
        <Snowflake size={80} />
      </div>
      <div className="absolute -bottom-8 -right-2 text-red-100 dark:text-red-500/10">
        <Snowflake size={120} />
      </div>
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};