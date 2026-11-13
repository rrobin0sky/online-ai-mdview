import React, { useMemo } from "react";
import CodeMirror, { EditorView } from "@uiw/react-codemirror";
import { markdown } from "@codemirror/lang-markdown";
import { oneDark } from "@codemirror/theme-one-dark";
import { keymap } from "@codemirror/view";

interface MarkdownEditorProps {
  value: string;
  onChange: (val: string) => void;
  isDark: boolean;
  onSave?: () => void;
}

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  value,
  onChange,
  isDark,
  onSave,
}) => {
  const extensions = useMemo(() => {
    const list = [
      markdown(),
      EditorView.lineWrapping,
    ];

    if (onSave) {
      list.push(
        keymap.of([
          {
            key: "Mod-s",
            run: () => {
              onSave();
              return true;
            },
          },
        ])
      );
    }

    return list;
  }, [onSave]);

  return (
    <div className="h-full w-full flex flex-col overflow-hidden bg-white dark:bg-zinc-950 text-[14px]">
      <CodeMirror
        value={value}
        height="100%"
        className="h-full overflow-auto text-[14px] leading-relaxed"
        theme={isDark ? oneDark : "light"}
        extensions={extensions}
        onChange={onChange}
        basicSetup={{
          lineNumbers: true,
          highlightActiveLineGutter: true,
          highlightSpecialChars: true,
          history: true,
          foldGutter: true,
          drawSelection: true,
          dropCursor: true,
          allowMultipleSelections: true,
          indentOnInput: true,
          syntaxHighlighting: true,
          bracketMatching: true,
          closeBrackets: true,
          autocompletion: true,
          rectangularSelection: true,
          crosshairCursor: true,
          highlightActiveLine: true,
          highlightSelectionMatches: true,
          closeBracketsKeymap: true,
          defaultKeymap: true,
          searchKeymap: true,
          historyKeymap: true,
          foldKeymap: true,
          completionKeymap: true,
          lintKeymap: true,
        }}
      />
    </div>
  );
};
