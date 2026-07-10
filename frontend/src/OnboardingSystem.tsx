import { X, ArrowRight, Lightbulb, Users, Zap, BookOpen } from 'lucide-react';
import { useState } from 'react';
import './onboarding-system.css';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  tips: string[];
  voiceCommand?: string;
}

export function OnboardingSystem() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasSeenTutorial, setHasSeenTutorial] = useState(
    localStorage.getItem('regguard_tutorial_seen') === 'true'
  );

  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: '🎉 Welcome to RegGuard Platform',
      description: 'Your AI-powered compliance intelligence system for contractors',
      icon: <Zap size={40} />,
      tips: [
        'Use the sidebar to navigate between features',
        'Voice commands work everywhere - just click the mic button',
        'Each feature has detailed tooltips and help text',
      ],
      voiceCommand: 'Say "help" to hear all available voice commands',
    },
    {
      id: 'agent',
      title: '🛡️ RegGuard Agent',
      description: 'Autonomous compliance research and intelligence gathering',
      icon: <Lightbulb size={40} />,
      tips: [
        'Enter a site address to start compliance research',
        'Add job context for more relevant results',
        'Use voice input for hands-free operation',
        'Download PDF reports with action plans',
      ],
      voiceCommand: 'Say "go to agent" to access the compliance system',
    },
    {
      id: 'queue',
      title: '⚡ Queue Center',
      description: 'Auto-fill FERC forms and manage RTO queues 10x faster',
      icon: <Zap size={40} />,
      tips: [
        'Upload interconnection study PDFs',
        'Automatic form filling saves hours of work',
        'Track queue positions in real-time',
        'Predict project timelines',
      ],
      voiceCommand: 'Say "queue center" to auto-fill forms',
    },
    {
      id: 'datacenter',
      title: '🏢 Data Center Analysis',
      description: 'Comprehensive permitting risk assessment for your projects',
      icon: <BookOpen size={40} />,
      tips: [
        'Get instant permitting risk analysis',
        'Receive regulatory compliance recommendations',
        'View detailed findings and risk factors',
        'Access historical project data',
      ],
      voiceCommand: 'Say "data center" for permitting analysis',
    },
    {
      id: 'team',
      title: '👥 Collaboration & Sharing',
      description: 'Work together with your team using RegGuard',
      icon: <Users size={40} />,
      tips: [
        'Share reports with team members',
        'Track project history and milestones',
        'Receive alerts for queue updates',
        'Export data for external use',
      ],
      voiceCommand: 'Say "leads" to manage team sales pipeline',
    },
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem('regguard_tutorial_seen', 'true');
    setIsOpen(false);
    setHasSeenTutorial(true);
  };

  const step = steps[currentStep];

  if (hasSeenTutorial && !isOpen) {
    return null;
  }

  if (!isOpen) {
    return (
      <button 
        className="onboarding-trigger"
        onClick={() => setIsOpen(true)}
        title="View platform tutorial"
      >
        💡 Tutorial
      </button>
    );
  }
  return (
    <div className="onboarding-overlay">
      <div className="onboarding-modal">
        {/* Header */}
        <div className="onboarding-header">
          <button
            onClick={() => {
              setIsOpen(false);
              handleComplete();
            }}
            className="onboarding-close"
            title="Close tutorial"
          >
            <X size={24} />
          </button>
          <div className="onboarding-progress">
            {steps.map((_, idx) => (
              <div
                key={idx}
                className={`progress-dot ${idx === currentStep ? 'active' : ''} ${
                  idx < currentStep ? 'completed' : ''
                }`}
                onClick={() => setCurrentStep(idx)}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="onboarding-content">
          <div className="onboarding-icon">{step.icon}</div>

          <h2 className="onboarding-title">{step.title}</h2>
          <p className="onboarding-description">{step.description}</p>

          {/* Tips */}
          <div className="onboarding-tips">
            <p className="tips-label">💡 Pro Tips:</p>
            <ul className="tips-list">
              {step.tips.map((tip, idx) => (
                <li key={idx} className="tip-item">
                  <span className="tip-bullet">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Voice Command */}
          {step.voiceCommand && (
            <div className="onboarding-voice-hint">
              <Zap size={16} />
              <p>{step.voiceCommand}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="onboarding-footer">
          <button
            onClick={handlePrev}
            className="onboarding-button secondary"
            disabled={currentStep === 0}
          >
            ← Back
          </button>

          <span className="step-indicator">
            {currentStep + 1} / {steps.length}
          </span>

          <button onClick={handleNext} className="onboarding-button primary">
            {currentStep === steps.length - 1 ? (
              <>
                Get Started <ArrowRight size={16} />
              </>
            ) : (
              <>
                Next <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default OnboardingSystem;
