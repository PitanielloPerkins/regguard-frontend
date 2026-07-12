import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Volume2, AlertCircle } from 'lucide-react';

// Declare global Web Speech API types
declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionAPI;
    webkitSpeechRecognition?: new () => SpeechRecognitionAPI;
  }

  interface SpeechRecognitionAPI {
    continuous: boolean;
    interimResults: boolean;
    language: string;
    onstart: (() => void) | null;
    onresult: ((event: SpeechRecognitionEvent) => void) | null;
    onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
    onend: (() => void) | null;
    start(): void;
    stop(): void;
    abort(): void;
  }

  interface SpeechRecognitionEvent {
    results: SpeechRecognitionResultList;
    isFinal: boolean;
  }

  interface SpeechRecognitionResultList {
    length: number;
    item(index: number): SpeechRecognitionResult;
    [index: number]: SpeechRecognitionResult;
  }

  interface SpeechRecognitionResult {
    isFinal: boolean;
    length: number;
    item(index: number): SpeechRecognitionAlternative;
    [index: number]: SpeechRecognitionAlternative;
  }

  interface SpeechRecognitionAlternative {
    transcript: string;
    confidence: number;
  }

  interface SpeechRecognitionErrorEvent {
    error: string;
  }
}

interface Command {
  keywords: string[];
  action: (transcript: string) => void;
  description: string;
  icon: string;
}

export function VoiceCommandSystem() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [persistentMode, setPersistentMode] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionAPI | null>(null);
  const persistentRef = useRef(false);

  // Fuzzy matching for better command recognition
  function calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 100;
    
    const editDistance = getEditDistance(longer, shorter);
    return ((longer.length - editDistance) / longer.length) * 100;
  }

  function getEditDistance(s1: string, s2: string): number {
    const costs = [];
    for (let i = 0; i <= s1.length; i++) {
      let lastValue = i;
      for (let j = 0; j <= s2.length; j++) {
        if (i === 0) {
          costs[j] = j;
        } else if (j > 0) {
          let newValue = costs[j - 1];
          if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
          }
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
      if (i > 0) costs[s2.length] = lastValue;
    }
    return costs[s2.length];
  }

  // Command definitions (moved before useEffect so they can be used in callbacks)
  const commands: Command[] = [
    {
      keywords: ['go to home', 'home', 'dashboard'],
      action: () => window.location.href = '/',
      description: 'Go to home dashboard',
      icon: '🏠',
    },
    {
      keywords: ['go to queue', 'queue center', 'queue'],
      action: () => window.location.href = '/queue',
      description: 'Go to Queue Center',
      icon: '⚡',
    },
    {
      keywords: ['upload', 'upload form', 'upload study'],
      action: () => window.location.href = '/queue/upload',
      description: 'Upload interconnection study',
      icon: '📤',
    },
    {
      keywords: ['monitor', 'queue monitor', 'check queue'],
      action: () => window.location.href = '/queue/monitor',
      description: 'Monitor queue position',
      icon: '📊',
    },
    {
      keywords: ['translator', 'study translator', 'translate'],
      action: () => window.location.href = '/queue/translator',
      description: 'Study Translator',
      icon: '📚',
    },
    {
      keywords: ['timeline', 'predict timeline', 'timeline predictor'],
      action: () => window.location.href = '/queue/timeline',
      description: 'Timeline Predictor',
      icon: '⏰',
    },
    {
      keywords: ['data center', 'analyze', 'permitting'],
      action: () => window.location.href = '/data-center',
      description: 'Data Center Analysis',
      icon: '🏢',
    },
    {
      keywords: ['leads', 'sales', 'pipeline'],
      action: () => window.location.href = '/admin/leads',
      description: 'Sales Pipeline',
      icon: '👥',
    },
    {
      keywords: ['help', 'commands', 'what can i say'],
      action: () => showHelp(),
      description: 'Show available commands',
      icon: '❓',
    },
    {
      keywords: ['clear', 'reset', 'clear history'],
      action: () => {
        setTranscript('');
        setInterimTranscript('');
        setCommandHistory([]);
      },
      description: 'Clear voice history',
      icon: '🗑️',
    },
  ];

  function showHelp() {
    alert(`Available Voice Commands:\n\n${commands.map(c => `${c.icon} ${c.description}\n   Say: "${c.keywords[0]}"`).join('\n')}`);
  }

  function processCommand(transcript: string) {
    const lowerTranscript = transcript.toLowerCase().trim();
    
    // Track best match
    let bestMatch: { command: Command; score: number } | null = null;

    for (const command of commands) {
      for (const keyword of command.keywords) {
        // Check for exact substring match (highest priority)
        if (lowerTranscript.includes(keyword)) {
          if (!bestMatch || bestMatch.score < 100) {
            bestMatch = { command, score: 100 };
          }
        } else {
          // Fuzzy match (fallback for typos/variations)
          const similarity = calculateSimilarity(lowerTranscript, keyword);
          if (similarity > 70 && (!bestMatch || similarity > bestMatch.score)) {
            bestMatch = { command, score: similarity };
          }
        }
      }
    }

    if (bestMatch && bestMatch.score > 70) {
      setCommandHistory(prev => [...prev, `✅ "${transcript}" → matched at ${bestMatch.score.toFixed(0)}%`]);
      bestMatch.command.action(transcript);
    } else {
      setCommandHistory(prev => [...prev, `❓ "${transcript}" - Command not recognized`]);
    }
  }

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      setIsSupported(true);
      recognitionRef.current = new SpeechRecognition();
      
      const recognition = recognitionRef.current;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.language = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setError('');
        setTranscript('');
        console.log('🎙️ Voice recognition started');
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interim = '';
        
        // Process ALL results from the event, not just the last one
        for (let i = 0; i < event.results.length; i++) {
          const transcriptPart = event.results[i][0].transcript;
          
          if (event.results[i].isFinal) {
            console.log('✅ Final transcript:', transcriptPart);
            setTranscript(prev => prev + transcriptPart + ' ');
            processCommand(transcriptPart);
          } else {
            console.log('⏳ Interim transcript:', transcriptPart);
            interim += transcriptPart;
          }
        }
        
        setInterimTranscript(interim);
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('❌ Voice error:', event.error);
        setError(`Error: ${event.error}`);
      };

      recognition.onend = () => {
        console.log('🛑 Voice recognition stopped');
        setIsListening(false);
        
        // Auto-restart if in persistent mode
        if (persistentRef.current && recognitionRef.current) {
          setTimeout(() => {
            console.log('🔄 Restarting voice recognition (persistent mode)');
            recognitionRef.current?.start();
          }, 500);
        }
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);


  function toggleListening() {
    if (!recognitionRef.current) return;

    if (isListening) {
      persistentRef.current = false;
      recognitionRef.current.stop();
    } else {
      setTranscript('');
      setInterimTranscript('');
      recognitionRef.current.start();
    }
  }

  function togglePersistentMode() {
    persistentRef.current = !persistentRef.current;
    setPersistentMode(!persistentMode);
    const mode = !persistentMode ? 'ON' : 'OFF';
    setCommandHistory(prev => [...prev, `🔄 Persistent mode: ${mode}`]);
  }

  if (!isSupported) {
    return (
      <div className="voice-command-notice">
        <AlertCircle size={20} />
        <p>Voice commands not supported in this browser</p>
      </div>
    );
  }

  return (
    <div className="voice-command-system">
      {/* Voice Command Button */}
      <button
        onClick={toggleListening}
        className={`voice-button ${isListening ? 'listening' : ''}`}
        title="Click to toggle voice commands"
      >
        {isListening ? <Mic size={24} /> : <MicOff size={24} />}
        <span className="voice-status">
          {isListening ? 'Listening...' : 'Voice Commands'}
        </span>
      </button>

      {/* Voice Command Panel */}
      {isListening && (
        <div className="voice-panel">
          <div className="voice-header">
            <Volume2 size={20} className="listening-icon" />
            <span>Voice Command Active</span>
            <button
              onClick={togglePersistentMode}
              className={`persistent-toggle ${persistentMode ? 'active' : ''}`}
              title={persistentMode ? 'Persistent mode ON' : 'Persistent mode OFF'}
            >
              🔄
            </button>
          </div>

          {/* Real-time transcript */}
          <div className="voice-transcript">
            <p className="final-text">{transcript}</p>
            {interimTranscript && (
              <p className="interim-text">{interimTranscript}</p>
            )}
          </div>

          {/* Error display */}
          {error && <div className="voice-error">{error}</div>}

          {/* Quick commands */}
          <div className="quick-commands">
            <p className="quick-label">Quick Commands:</p>
            <div className="commands-grid">
              {commands.slice(0, 8).map((cmd, idx) => (
                <button
                  key={idx}
                  className="quick-command"
                  onClick={() => cmd.action('')}
                  title={cmd.description}
                >
                  <span className="cmd-icon">{cmd.icon}</span>
                  <span className="cmd-text">{cmd.keywords[0]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Command history */}
          {commandHistory.length > 0 && (
            <div className="command-history">
              <p className="history-label">History:</p>
              <div className="history-list">
                {commandHistory.slice(-3).reverse().map((cmd, idx) => (
                  <div key={idx} className="history-item">
                    {cmd}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Close button */}
          <button
            onClick={() => recognitionRef.current?.stop()}
            className="voice-close"
          >
            Stop Listening
          </button>
        </div>
      )}
    </div>
  );
}

export default VoiceCommandSystem;
