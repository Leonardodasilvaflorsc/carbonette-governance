import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";

interface QuickAction {
  label: string;
  action: () => void;
}

interface QuickActionsProps {
  actions: QuickAction[];
}

export const QuickActions = ({ actions }: QuickActionsProps) => {
  const isMobile = useIsMobile();

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {actions.map((action, index) => (
        <Button
          key={index}
          variant="secondary"
          onClick={action.action}
          className="text-xs md:text-sm flex-1 md:flex-none"
        >
          {isMobile ? action.label.split(' ')[0] : action.label}
        </Button>
      ))}
    </div>
  );
};