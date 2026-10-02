import { useEffect, useState } from "react";

const STORAGE_KEY = "t3code:provider-model-selection";

interface ProviderModelSelection {
  provider: string;
  model: string;
}

/**
 * ProviderModelPicker
 * Persists the selected provider and model to localStorage so the selection
 * survives page reloads and app restarts.
 */
export function ProviderModelPicker() {
  const [selection, setSelection] = useState<ProviderModelSelection>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved) as ProviderModelSelection;
    } catch {
      // Corrupted storage — fall through to default
    }
    return { provider: "", model: "" };
  });

  // Persist whenever selection changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(selection));
    } catch {
      // Storage full or unavailable — ignore
    }
  }, [selection]);

  function handleProviderChange(provider: string) {
    setSelection({ provider, model: "" }); // reset model when provider changes
  }

  function handleModelChange(model: string) {
    setSelection((prev) => ({ ...prev, model }));
  }

  return (
    <div className="provider-model-picker">
      <select
        value={selection.provider}
        onChange={(e) => handleProviderChange(e.target.value)}
        aria-label="AI Provider"
      >
        <option value="">Select provider…</option>
        <option value="openai">OpenAI</option>
        <option value="anthropic">Anthropic</option>
        <option value="google">Google</option>
      </select>
      <select
        value={selection.model}
        onChange={(e) => handleModelChange(e.target.value)}
        aria-label="AI Model"
        disabled={!selection.provider}
      >
        <option value="">Select model…</option>
      </select>
    </div>
  );
}
