import { Button } from "@/components/ui/button";

interface QuickAction {
  label: string;
  action: () => void;
}

interface QuickActionsProps {
  actions: QuickAction[];
}

export const QuickActions = ({ actions }: QuickActionsProps) => {
  return (
    <div className="flex gap-2 mb-4">
      {actions.map((action, index) => (
        <Button
          key={index}
          variant="secondary"
          onClick={action.action}
          className="text-sm"
        >
          {action.label}
        </Button>
      ))}
    </div>
  );
};