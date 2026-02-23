import { useState, useCallback, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { OnboardingModal, isOnboardingComplete } from "@/components/onboarding/OnboardingModal";
import { useSettings } from "@/hooks/useSettings";
import type { IStaticMethods } from "preline/dist";

declare global {
  interface Window {
    HSStaticMethods: IStaticMethods;
  }
}

async function loadPreline() {
  return import("preline/dist/index.js");
}

export default function App() {
  const location = useLocation();
  const { settings, loading } = useSettings();
  const [showOnboarding, setShowOnboarding] = useState(() => !isOnboardingComplete());

  const needsOnboarding = !loading && !settings.onboardingComplete && showOnboarding;

  useEffect(() => {
    const initPreline = async () => {
      await loadPreline();
      if (
        window.HSStaticMethods &&
        typeof window.HSStaticMethods.autoInit === "function"
      ) {
        window.HSStaticMethods.autoInit();
      }
    };
    initPreline();
  }, [location.pathname]);

  const handleOnboardingComplete = useCallback(async () => {
    setShowOnboarding(false);
  }, []);

  return (
    <>
      <Layout />
      {needsOnboarding && (
        <OnboardingModal
          onComplete={handleOnboardingComplete}
          onSkip={handleOnboardingComplete}
        />
      )}
    </>
  );
}
