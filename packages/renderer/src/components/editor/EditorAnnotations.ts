import type * as Monaco from "monaco-editor";

export type AnnotationSeverity = "error" | "warning" | "info" | "suggestion";

export interface Annotation {
  line: number;
  message: string;
  severity: AnnotationSeverity;
  type?: string;
  endLine?: number;
  startColumn?: number;
  endColumn?: number;
}

export interface InlineSuggestion {
  line: number;
  newCode: string;
  description: string;
}

type IStandaloneCodeEditor = Monaco.editor.IStandaloneCodeEditor;

const SEVERITY_MAP: Record<AnnotationSeverity, Monaco.MarkerSeverity> = {
  error: 8,    // MarkerSeverity.Error
  warning: 4,  // MarkerSeverity.Warning
  info: 2,     // MarkerSeverity.Info
  suggestion: 1, // MarkerSeverity.Hint
};

const DECORATION_CLASS: Record<AnnotationSeverity, string> = {
  error: "squiggly-error",
  warning: "squiggly-warning",
  info: "squiggly-info",
  suggestion: "squiggly-hint",
};

const GLYPH_CLASS: Record<AnnotationSeverity, string> = {
  error: "codicon-error",
  warning: "codicon-warning",
  info: "codicon-info",
  suggestion: "codicon-lightbulb",
};

let currentDecorationIds: string[] = [];
const MARKER_OWNER = "kado-annotations";

export function addAnnotation(
  editor: IStandaloneCodeEditor,
  annotation: Annotation
): void {
  const model = editor.getModel();
  if (!model) return;

  const monaco = (window as Record<string, unknown>).monaco as typeof Monaco | undefined;

  const lineLength = model.getLineLength(annotation.line);
  const startCol = annotation.startColumn ?? 1;
  const endCol = annotation.endColumn ?? lineLength + 1;
  const endLine = annotation.endLine ?? annotation.line;

  const decoration: Monaco.editor.IModelDeltaDecoration = {
    range: {
      startLineNumber: annotation.line,
      startColumn: startCol,
      endLineNumber: endLine,
      endColumn: endCol,
    },
    options: {
      className: DECORATION_CLASS[annotation.severity],
      glyphMarginClassName: GLYPH_CLASS[annotation.severity],
      hoverMessage: { value: annotation.message },
      glyphMarginHoverMessage: { value: `[${annotation.severity}] ${annotation.message}` },
      overviewRuler: {
        color: annotation.severity === "error" ? "#f44336" : annotation.severity === "warning" ? "#ff9800" : "#2196f3",
        position: 4, // OverviewRulerLane.Full
      },
    },
  };

  currentDecorationIds = editor.deltaDecorations(
    currentDecorationIds,
    [...getExistingDecorations(editor), decoration]
  );

  if (monaco) {
    const existingMarkers = monaco.editor.getModelMarkers({ owner: MARKER_OWNER, resource: model.uri });
    const newMarker: Monaco.editor.IMarkerData = {
      severity: SEVERITY_MAP[annotation.severity],
      message: annotation.message,
      startLineNumber: annotation.line,
      startColumn: startCol,
      endLineNumber: endLine,
      endColumn: endCol,
      source: annotation.type ?? "kado",
    };
    monaco.editor.setModelMarkers(model, MARKER_OWNER, [...existingMarkers, newMarker]);
  }
}

export function addAnnotations(
  editor: IStandaloneCodeEditor,
  annotations: Annotation[]
): void {
  for (const annotation of annotations) {
    addAnnotation(editor, annotation);
  }
}

export function clearAnnotations(editor: IStandaloneCodeEditor): void {
  currentDecorationIds = editor.deltaDecorations(currentDecorationIds, []);

  const model = editor.getModel();
  if (!model) return;

  const monaco = (window as Record<string, unknown>).monaco as typeof Monaco | undefined;
  if (monaco) {
    monaco.editor.setModelMarkers(model, MARKER_OWNER, []);
  }
}

export function addSuggestion(
  editor: IStandaloneCodeEditor,
  suggestion: InlineSuggestion
): void {
  const model = editor.getModel();
  if (!model) return;

  const lineLength = model.getLineLength(suggestion.line);

  const decoration: Monaco.editor.IModelDeltaDecoration = {
    range: {
      startLineNumber: suggestion.line,
      startColumn: 1,
      endLineNumber: suggestion.line,
      endColumn: lineLength + 1,
    },
    options: {
      glyphMarginClassName: "codicon-lightbulb",
      glyphMarginHoverMessage: { value: `💡 ${suggestion.description}` },
      hoverMessage: {
        value: `**Suggestion:** ${suggestion.description}\n\n\`\`\`\n${suggestion.newCode}\n\`\`\``,
      },
      className: "suggestion-highlight",
      after: {
        content: ` 💡 ${suggestion.description}`,
        inlineClassName: "suggestion-inline-hint",
      },
    },
  };

  currentDecorationIds = editor.deltaDecorations(
    currentDecorationIds,
    [...getExistingDecorations(editor), decoration]
  );

  const monaco = (window as Record<string, unknown>).monaco as typeof Monaco | undefined;
  if (monaco) {
    const existingMarkers = monaco.editor.getModelMarkers({ owner: MARKER_OWNER, resource: model.uri });
    const marker: Monaco.editor.IMarkerData = {
      severity: 1, // Hint
      message: suggestion.description,
      startLineNumber: suggestion.line,
      startColumn: 1,
      endLineNumber: suggestion.line,
      endColumn: lineLength + 1,
      source: "kado-suggestion",
    };
    monaco.editor.setModelMarkers(model, MARKER_OWNER, [...existingMarkers, marker]);
  }
}

function getExistingDecorations(
  editor: IStandaloneCodeEditor
): Monaco.editor.IModelDeltaDecoration[] {
  const model = editor.getModel();
  if (!model) return [];

  return currentDecorationIds.map((id) => {
    const range = model.getDecorationRange(id);
    const options = editor.getLineDecorations(range?.startLineNumber ?? 1);
    const matchingDecoration = options?.find((d) => d.id === id);
    return {
      range: range ?? { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 1 },
      options: matchingDecoration?.options ?? {},
    };
  });
}
