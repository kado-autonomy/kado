import { ToriiLogo } from "@/components/mascot";

interface WelcomeStepProps {
  onNext: () => void;
  onBack?: () => void;
}

export function WelcomeStep(_props: WelcomeStepProps) {
  return (
    <div className="flex flex-col items-center text-center space-y-6">
      <ToriiLogo size="lg" animated />
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground">Welcome to Kado v2</h1>
        <p className="text-muted-foreground-2 text-sm max-w-sm">
          Your autonomous coding agent. Describe what you want to build, and Kado will help you write code,
          run commands, and navigate your project—all through natural conversation.
        </p>
      </div>
    </div>
  );
}
