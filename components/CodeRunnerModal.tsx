
import React, { useState, useEffect, useRef } from 'react';
import { XIcon } from './icons/XIcon';
import { PlayIcon } from './icons/PlayIcon';
import Editor from '@monaco-editor/react';

interface CodeRunnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  code: string;
  title: string;
}

interface OutputLine {
    type: 'log' | 'error';
    content: string;
}

const SYNTAX_REGEX = /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\b\d+(?:\.\d+)?\b|\b(?:True|False|None|and|or|not|def|class|return|import|from|if|else|elif|for|while|print)\b|[\[\]\{\}\(\),:])/g;

const SyntaxHighlightedText: React.FC<{ text: string }> = ({ text }) => {
    const parts = text.split(SYNTAX_REGEX);
    return (
        <>
            {parts.map((part, i) => {
                if (!part) return null;
                if (/^".*"$/.test(part) || /^'.*'$/.test(part)) return <span key={i} className="text-green-600 dark:text-green-400">{part}</span>;
                if (/^\d+(\.\d+)?$/.test(part)) return <span key={i} className="text-blue-600 dark:text-blue-400 font-semibold">{part}</span>;
                if (/^(True|False|None|and|or|not|def|class|return|import|from|if|else|elif|for|while|print)$/.test(part)) return <span key={i} className="text-purple-600 dark:text-purple-400 font-bold">{part}</span>;
                if (/^[\[\]\{\}\(\),:]$/.test(part)) return <span key={i} className="text-gray-500 dark:text-gray-500 font-bold">{part}</span>;
                return <span key={i}>{part}</span>;
            })}
        </>
    );
};

const CodeRunnerModal: React.FC<CodeRunnerModalProps> = ({ isOpen, onClose, code, title }) => {
  const [output, setOutput] = useState<OutputLine[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [pyodide, setPyodide] = useState<any | null>(null);
  const [isLoadingPyodide, setIsLoadingPyodide] = useState(false);
  const outputContainerRef = useRef<HTMLDivElement>(null);
  const [editorTheme, setEditorTheme] = useState('vs-dark');
  
  // Inline Console Input State
  const [isWaitingForInput, setIsWaitingForInput] = useState(false);
  const [inputPrompt, setInputPrompt] = useState('');
  const [consoleInput, setConsoleInput] = useState('');
  const inputResolverRef = useRef<((value: string) => void) | null>(null);
  const consoleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && !pyodide) {
        const loadPyodide = async () => {
            setIsLoadingPyodide(true);
            try {
                // @ts-ignore
                const pyodideInstance = await window.loadPyodide({
                    indexURL: "https://cdn.jsdelivr.net/pyodide/v0.29.0/full/"
                });
                setPyodide(pyodideInstance);
            } catch (error) {
                console.error("Failed to load Pyodide:", error);
                setOutput([{ type: 'error', content: "Failed to initialize Python environment." }]);
            } finally {
                setIsLoadingPyodide(false);
            }
        };
        loadPyodide();
    }
    
    if (isOpen) {
        setOutput([]); // Clear output on open
        setIsWaitingForInput(false);
        setConsoleInput('');

        // Detect theme
        const isDark = document.documentElement.classList.contains('dark');
        setEditorTheme(isDark ? 'vs-dark' : 'light');
    }
  }, [isOpen]);

  const scrollToBottom = () => {
      if (outputContainerRef.current) {
          setTimeout(() => {
              outputContainerRef.current!.scrollTop = outputContainerRef.current!.scrollHeight;
          }, 10);
      }
  };

  const handleConsoleInputEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
          e.preventDefault();
          const val = consoleInput;
          
          // Add the full line (prompt + input) to history so it looks like a real console session
          const fullLine = `${inputPrompt}${val}\n`;
          setOutput(prev => [...prev, { type: 'log', content: fullLine }]);
          
          setIsWaitingForInput(false);
          setConsoleInput('');
          setInputPrompt('');
          
          if (inputResolverRef.current) {
              inputResolverRef.current(val);
              inputResolverRef.current = null;
          }
      }
  };

  const runCode = async () => {
      if (!pyodide) return;
      setIsExecuting(true);
      setOutput([]);
      setIsWaitingForInput(false);

      // Helper to communicate with React for Input
      (window as any).runnerAskForInput = (prompt: string) => {
          return new Promise((resolve) => {
              setInputPrompt(prompt);
              setIsWaitingForInput(true);
              inputResolverRef.current = resolve;
              setTimeout(() => {
                  consoleInputRef.current?.focus();
                  scrollToBottom();
              }, 50);
          });
      };

      // Helper to communicate with React for Printing
      (window as any).runnerPrint = (text: string, type: 'log' | 'error') => {
          if (text) {
              setOutput(prev => {
                  const lastOutput = prev[prev.length - 1];
                  // Append to last line if types match, otherwise new line (handles print(end=""))
                  if (lastOutput && lastOutput.type === type) {
                      const newOutput = [...prev];
                      newOutput[newOutput.length - 1] = { ...lastOutput, content: lastOutput.content + text };
                      return newOutput;
                  } else {
                      return [...prev, { type, content: text }];
                  }
              });
              scrollToBottom();
          }
      };

      const setupCode = `
import sys
import builtins
import js

class Writer:
    def __init__(self, stream_type):
        self.stream_type = stream_type
    def write(self, text):
        js.runnerPrint(text, self.stream_type)
    def flush(self):
        pass

sys.stdout = Writer('log')
sys.stderr = Writer('error')

async def custom_input(prompt_text=""):
    val = await js.runnerAskForInput(prompt_text)
    return val

builtins.input = custom_input
      `;

      try {
          await pyodide.loadPackagesFromImports(code);
          await pyodide.runPythonAsync(setupCode);
          
          // Regex to replace standard input() calls with await input() to handle async JS interaction
          const asyncCode = code.replace(/\binput\s*\(/g, 'await input(');
          
          await pyodide.runPythonAsync(asyncCode);
      } catch (error: any) {
          setOutput(prev => [...prev, { type: 'error', content: error.message }]);
      } finally {
          setIsExecuting(false);
          setIsWaitingForInput(false);
          scrollToBottom();
      }
  };

  if (!isOpen) return null;

  return (
    <>
        {/* Z-index increased to 60 to appear above other modals */}
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-5xl w-full h-[80vh] relative border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden animate-fade-in-up">
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <span className="bg-gray-200 dark:bg-gray-700 p-1 rounded text-sm font-mono">.py</span>
                    {title}
                </h3>
                <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full p-1 transition-colors">
                    <XIcon />
                </button>
            </div>

            {/* Content Container */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                {/* Code Preview (Read-only Monaco Editor) */}
                <div className="flex-1 border-r border-gray-200 dark:border-gray-800 overflow-hidden relative">
                    <Editor
                        height="100%"
                        defaultLanguage="python"
                        theme={editorTheme}
                        value={code}
                        options={{
                            readOnly: true,
                            minimap: { enabled: false },
                            fontSize: 14,
                            padding: { top: 16 },
                            scrollBeyondLastLine: false,
                            automaticLayout: true,
                            renderLineHighlight: 'none',
                            contextmenu: false,
                        }}
                        loading={<div className="flex items-center justify-center h-full text-gray-500 text-sm">Loading code...</div>}
                    />
                </div>

                {/* Output Terminal */}
                <div 
                    ref={outputContainerRef}
                    className="flex-1 bg-gray-900 dark:bg-black text-gray-300 font-mono text-xs md:text-sm p-4 overflow-y-auto flex flex-col shadow-inner"
                    onClick={() => {
                        if (isWaitingForInput && consoleInputRef.current) {
                            consoleInputRef.current.focus();
                        }
                    }}
                >
                    <div className="flex-1">
                        {output.length === 0 && !isExecuting && (
                            <div className="text-gray-500 italic">Click Run to execute...</div>
                        )}
                        {output.map((line, i) => (
                            <div key={i} className="mb-1 whitespace-pre-wrap break-all leading-relaxed">
                                {line.type === 'log' ? (
                                    <SyntaxHighlightedText text={line.content} />
                                ) : (
                                    <span className="text-red-400 font-medium">{line.content}</span>
                                )}
                            </div>
                        ))}
                        
                        {/* Inline Console Input */}
                        {isWaitingForInput && (
                            <div className="flex items-center text-gray-300 leading-relaxed mt-1">
                                <span className="whitespace-pre-wrap">{inputPrompt}</span>
                                <input
                                    ref={consoleInputRef}
                                    value={consoleInput}
                                    onChange={e => setConsoleInput(e.target.value)}
                                    onKeyDown={handleConsoleInputEnter}
                                    className="flex-1 bg-transparent border-none outline-none text-green-400 font-bold ml-1 min-w-[50px]"
                                    autoFocus
                                    autoComplete="off"
                                    spellCheck="false"
                                />
                            </div>
                        )}

                        {isExecuting && !isWaitingForInput && <div className="animate-pulse mt-2 text-green-500">_</div>}
                    </div>
                </div>
            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex justify-end">
                <button 
                    onClick={runCode}
                    disabled={isExecuting || isLoadingPyodide}
                    className="flex items-center gap-2 px-6 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-pink-500/20 transition-all"
                >
                    {isLoadingPyodide ? 'Loading Engine...' : isExecuting ? 'Running...' : (
                        <>
                            <PlayIcon /> Run Code
                        </>
                    )}
                </button>
            </div>
        </div>
        </div>
    </>
  );
};

export default CodeRunnerModal;
