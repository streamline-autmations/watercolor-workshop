import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export const BackButton = () => {
  const navigate = useNavigate();

  return (
    <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4 rounded-full">
      <ArrowLeft className="w-4 h-4 mr-2" />
      Back
    </Button>
  );
};