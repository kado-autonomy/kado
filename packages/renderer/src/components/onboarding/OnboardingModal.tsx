import { useState, useCallback } from "react";
import { X } from "lucide-react";
import { WelcomeStep } from "./WelcomeStep";
import { ApiKeyStep } from "./ApiKeyStep";
import { ProjectStep } from "./ProjectStep";
import { TipsStep } from "./TipsStep";
import { useSettings } from "@/hooks/useSettings";

const STORAGE_KEY = "kado-onboarding-complete";

export function isOnboardingComplete(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(STORAGE_KEY) === "true";
}

function markOnboardingComplete(): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, "true");
  }
}

const STEPS = [
  { id: "welcome", component: WelcomeStep },
  { id: "api", component: ApiKeyStep },
  { id: "project", component: ProjectStep },
  { id: "tips", component: TipsStep },
];

interface OnboardingModalProps {
  onComplete?: () => void;
  onSkip?: () => void;
}

export function OnboardingModal({ onComplete, onSkip }: OnboardingModalProps) {
  const [step, setStep] = useState(0);
  const { updateSettings } = useSettings();
  const CurrentStep = STEPS[step]?.component;

  const finishOnboarding = useCallback(async () => {
    markOnboardingComplete();
    await updateSettings({ onboardingComplete: true });
  }, [updateSettings]);

  const handleNext = useCallback(async () => {
    if (step >= STEPS.length - 1) {
      await finishOnboarding();
      onComplete?.();
    } else {
      setStep((s) => s + 1);
    }
  }, [step, onComplete, finishOnboarding]);

  const handleBack = useCallback(() => {
    setStep((s) => Math.max(0, s - 1));
  }, []);

  const handleSkip = useCallback(async () => {
    await finishOnboarding();
    onSkip?.();
    onComplete?.();
  }, [onSkip, onComplete, finishOnboarding]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-xl border border-line-2 bg-card shadow-xl">
        <button
          type="button"
          onClick={handleSkip}
          className="absolute right-4 top-4 rounded-md p-1.5 text-muted-foreground hover:bg-layer-hover hover:text-foreground transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="p-8 pt-12">
          {CurrentStep && <CurrentStep onNext={handleNext} onBack={step > 0 ? handleBack : undefined} />}
        </div>
        <div className="flex items-center justify-between border-t border-line-2 px-8 py-4">
          <div className="flex gap-1.5">
            {STEPS.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setStep(i)}
                className={`h-2 rounded-full transition-all duration-200 ${
                  i === step ? "w-6 bg-primary" : "w-2 bg-surface hover:bg-layer-hover"
                }`}
              />
            ))}
          </div>
          <div className="flex gap-2">
            {step > 0 && (
              <button
                type="button"
                onClick={handleBack}
                className="rounded-lg border border-line-2 px-4 py-2 text-sm font-medium text-muted-foreground-2 hover:bg-layer-hover hover:text-foreground transition-colors duration-150"
              >
                Back
              </button>
            )}
            <button
              type="button"
              onClick={handleSkip}
              className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:text-muted-foreground-2 transition-colors duration-150"
            >
              Skip
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover transition-colors duration-150 shadow-sm shadow-primary/20"
            >
              {step >= STEPS.length - 1 ? "Get Started" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
