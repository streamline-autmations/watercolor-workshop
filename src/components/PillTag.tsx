import { cn } from "@/lib/utils";

interface PillTagProps {
  children: React.ReactNode;
  variant?: 'default' | 'level';
  className?: string;
}

export const PillTag = ({ children, variant = 'default', className }: PillTagProps) => {
  const baseClasses = "text-xs font-semibold px-3 py-1 rounded-full";
  const variantClasses = {
    default: "bg-secondary/50 text-secondary-foreground",
    level: "bg-primary/10 text-primary",
  };

  return (
    <span className={cn(baseClasses, variantClasses[variant], className)}>
      {children}
    </span>
  );
};