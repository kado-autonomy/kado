import { MessageSquare, Keyboard, PanelLeft } from "lucide-react";

interface TipsStepProps {
  onNext: () => void;
  onBack?: () => void;
}

const TIPS: { icon: React.ComponentType<{ className?: string }>; title: string; text: string }[] = [
  {
    icon: MessageSquare,
    title: "Chat with Kado",
    text: "Type your task or question in the chat panel. Be specific about what you want to build or fix.",
  },
  {
    icon: Keyboard,
    title: "Keyboard shortcuts",
    text: "Use ⌘B to toggle the sidebar, ⌘J for the bottom panel, and ⌘S to save. Check Settings for the full list.",
  },
  {
    icon: PanelLeft,
    title: "File explorer",
    text: "Open files from the sidebar. Kado uses your project structure to understand context.",
  },
];

export function TipsStep(_props: TipsStepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-semibold text-foreground">Quick Tips</h2>
        <p className="text-sm text-muted-foreground-2">
          Here's how to get the most out of Kado.
        </p>
      </div>
      <div className="space-y-4">
        {TIPS.map(({ icon: Icon, title, text }) => (
          <div
            key={title}
            className="flex gap-3 rounded-xl border border-line-2 bg-surface/30 p-4 transition-colors duration-150 hover:bg-surface/50"
          >
            <div className="flex-shrink-0 rounded-lg bg-primary/10 p-2.5">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-foreground">{title}</h3>
              <p className="text-xs text-muted-foreground-2 mt-0.5">{text}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
