import { Progress } from "@/components/ui/progress";

export const ProgressBar = ({ value }: { value: number }) => {
  return <Progress value={value} className="h-1.5 [&>div]:bg-primary" />;
};