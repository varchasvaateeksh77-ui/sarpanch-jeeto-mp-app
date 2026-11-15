export function startHindiVoiceSearch(options: {
  fallbackSuggestions: string[];
  currentQuery: string;
  onResult: (transcript: string, isSimulatedFallback: boolean) => void;
  onStatus?: (msg: string) => void;
}) {
  const win = window as any;
  const SpeechRec = win.SpeechRecognition || win.webkitSpeechRecognition;

  if (SpeechRec) {
    try {
      const rec = new SpeechRec();
      rec.lang = 'hi-IN';
      rec.interimResults = false;
      rec.maxAlternatives = 1;

      if (options.onStatus) {
        options.onStatus('बोलें... (हिंदी वॉइस सर्च चालू है)');
      }

      let handled = false;
      rec.onresult = (event: any) => {
        handled = true;
        const transcript = event?.results?.[0]?.[0]?.transcript || '';
        if (transcript.trim()) {
          options.onResult(transcript.trim(), false);
        }
      };

      rec.onerror = () => {
        if (!handled) {
          handled = true;
          const idx = options.fallbackSuggestions.indexOf(options.currentQuery);
          const next =
            options.fallbackSuggestions[
              (idx + 1) % options.fallbackSuggestions.length
            ] || 'रामनारायण';
          options.onResult(next, true);
        }
      };

      rec.start();
      return;
    } catch {
      // Fallback below
    }
  }

  const idx = options.fallbackSuggestions.indexOf(options.currentQuery);
  const next =
    options.fallbackSuggestions[
      (idx + 1) % options.fallbackSuggestions.length
    ] || 'रामनारायण';
  options.onResult(next, true);
}
