
import React, { useState, useEffect, useRef } from 'react';
import { PlayIcon } from './icons/PlayIcon';
import { TrashIcon } from './icons/TrashIcon';
import { UploadIcon } from './icons/UploadIcon';
import { DownloadIcon } from './icons/DownloadIcon';
import Editor from '@monaco-editor/react';

interface CodePlaygroundProps {
    theme: 'light' | 'dark';
}

interface OutputLine {
    type: 'log' | 'error';
    content: string;
}

const DEFAULT_CODE = `print("Hello from the ICT Club Hub Playground!")

name = input("What is your name? ")
print(f"Nice to meet you, {name}!")

# The return value of the last expression is also displayed
import math
math.pi`;

const CodePlayground: React.FC<CodePlaygroundProps> = ({ theme }) => {
  const [code, setCode] = useState<string>(() => {
      // Load from local storage if available, otherwise use default
      if (typeof window !== 'undefined') {
          return localStorage.getItem('playground_code') || DEFAULT_CODE;
      }
      return DEFAULT_CODE;
  });
  
  const [output, setOutput] = useState<OutputLine[]>([{ type: 'log', content: 'Click "Run Code" to see the output here.' }]);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [pyodide, setPyodide] = useState<any | null>(null);
  const [isPyodideReady, setIsPyodideReady] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-save code to local storage
  useEffect(() => {
      localStorage.setItem('playground_code', code);
  }, [code]);

  useEffect(() => {
    const setupPyodide = async () => {
      try {
        // loadPyodide is globally available from the script tag in index.html
        const pyodideInstance = await (window as any).loadPyodide({
          indexURL: "https://cdn.jsdelivr.net/pyodide/v0.29.0/full/"
        });
        setPyodide(pyodideInstance);
        setIsPyodideReady(true);
        console.log("Pyodide loaded successfully.");
      } catch (error) {
        console.error("Failed to load Pyodide:", error);
        setOutput([{ type: 'error', content: "Error: Could not load the local Python interpreter. Please try refreshing." }]);
      }
    };
    setupPyodide();
  }, []);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result;
      if (typeof content === 'string') {
        setCode(content);
        // Clear output to indicate new context
        setOutput([{ type: 'log', content: `Loaded file: ${file.name}` }]);
      }
    };
    reader.readAsText(file);
    // Reset input so the same file can be selected again if needed
    event.target.value = '';
  };

  const handleDownloadCode = () => {
    const blob = new Blob([code], { type: 'text/x-python' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'script.py';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleRunCode = async () => {
    setIsExecuting(true);
    setOutput([]); // Clear previous output

    if (!pyodide) {
        setOutput([{ type: 'error', content: 'Error: Local interpreter (Pyodide) is not ready.' }]);
        setIsExecuting(false);
        return;
    }

    let hasOutput = false; // To track if any output was generated

    // 1. Expose JS callback to Pyodide for streaming output
    (window as any).sendOutputToReact = (text: string, type: 'log' | 'error') => {
        if (text) {
            hasOutput = true;
            setOutput(prev => {
                const lastOutput = prev[prev.length - 1];
                // Append to the last message if it's the same type to avoid creating many separate spans
                if (lastOutput && lastOutput.type === type) {
                    const newOutput = [...prev];
                    newOutput[newOutput.length - 1] = { ...lastOutput, content: lastOutput.content + text };
                    return newOutput;
                } else {
                    return [...prev, { type, content: text }];
                }
            });
        }
    };

    // 2. Python code to redirect stdout/stderr and override input()
    const setupCode = `
import sys
import builtins
import js

class Writer:
    def __init__(self, stream_type):
        self.stream_type = stream_type
    def write(self, text):
        js.sendOutputToReact(text, self.stream_type)
    def flush(self):
        pass

sys.stdout = Writer('log')
sys.stderr = Writer('error')

def input_override(prompt_text=""):
    s = str(prompt_text)
    val = js.prompt(s)
    if val is None:
        val = ""
    print(f"{s}{val}")
    return val

builtins.input = input_override
    `;

    try {
        // Load packages based on imports
        await pyodide.loadPackagesFromImports(code);

        await pyodide.runPythonAsync(setupCode);
        const result = await pyodide.runPythonAsync(code);

        // 3. Handle the return value of the last expression
        if (result !== undefined) {
            pyodide.globals.set('last_result', result);
            // Use print(repr()) to mimic a REPL, which will be caught by our stdout handler
            await pyodide.runPythonAsync(`print(repr(last_result))`);
            pyodide.globals.delete('last_result');
            if (typeof result.destroy === 'function') {
                result.destroy();
            }
        }
        
        // 4. Handle no output case
        if (!hasOutput) {
            setOutput([{ type: 'log', content: 'Code executed successfully with no output.' }]);
        }

    } catch (error: any) {
        // Python tracebacks are handled by the stderr writer.
        // This catches compilation errors or other JS exceptions from pyodide.
        (window as any).sendOutputToReact(error.message, 'error');
    } finally {
        setIsExecuting(false);
        // Clean up the global function to avoid memory leaks
        if ((window as any).sendOutputToReact) {
          delete (window as any).sendOutputToReact;
        }
    }
  };
  
  const handleClearOutput = () => {
      setOutput([]);
  };

  const editorTheme = theme === 'dark' ? 'vs-dark' : 'light';

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)]">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".py,.txt"
        className="hidden"
      />

      <div className="flex-shrink-0 mb-4 flex flex-wrap justify-between items-center gap-4">
        <div>
            <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-200">Code Playground</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Execute Python code locally in your browser.</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
            <button
                onClick={triggerFileUpload}
                className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white dark:bg-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors shadow-sm"
                title="Upload Python file"
            >
                <UploadIcon />
                <span className="hidden sm:inline">Upload</span>
            </button>
            <button
                onClick={handleDownloadCode}
                className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white dark:bg-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors shadow-sm"
                title="Save as .py file"
            >
                <DownloadIcon />
                <span className="hidden sm:inline">Save</span>
            </button>
            <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 mx-2 hidden sm:block"></div>
            <button
                onClick={handleRunCode}
                disabled={isExecuting || !isPyodideReady}
                className="relative flex items-center space-x-2 px-5 py-3 font-semibold text-white bg-gradient-to-r from-pink-500 to-purple-600 rounded-lg shadow-md hover:from-pink-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                aria-label="Run Code"
                title={!isPyodideReady ? 'Local interpreter is initializing...' : 'Run code in your browser'}
            >
                {!isPyodideReady && <div className="absolute -top-1 -right-1 h-3 w-3 flex items-center justify-center"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-pink-500"></span></div>}
                <PlayIcon />
                <span>{isExecuting ? 'Running...' : 'Run Code'}</span>
            </button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0">
        {/* Editor Panel */}
        <div className="flex flex-col bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">main.py</span>
            <span className="text-xs text-gray-400 italic">Auto-saved to browser</span>
          </div>
          <div className="flex-1 w-full h-full relative">
            <Editor
              height="100%"
              language="python"
              theme={editorTheme}
              value={code}
              onChange={(value) => setCode(value || '')}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                wordWrap: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                padding: { top: 16 },
              }}
              // A loading indicator for the editor itself
              loading={<div className="text-center p-4">Loading editor...</div>}
            />
          </div>
        </div>

        {/* Output Panel */}
        <div className="flex flex-col bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
          <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">Output</span>
            <button 
                onClick={handleClearOutput}
                className="p-1 text-gray-500 hover:text-red-600 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title="Clear Output"
                aria-label="Clear Output"
            >
                <TrashIcon />
            </button>
          </div>
          <pre className="flex-1 w-full p-4 bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-300 font-mono text-sm whitespace-pre-wrap break-words overflow-y-auto rounded-b-lg">
            <code>
                {output.length === 0 && <span className="text-gray-400 italic">No output</span>}
                {output.map((line, index) => (
                    <span key={index} className={line.type === 'error' ? 'text-red-500' : ''}>
                        {line.content}
                    </span>
                ))}
            </code>
          </pre>
        </div>
      </div>
    </div>
  );
};

export default CodePlayground;
