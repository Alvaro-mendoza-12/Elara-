import { ElaraLogo } from './ElaraLogo';

export function TypingDots() {
  return <span className="typing-dots" aria-hidden="true"><i /><i /><i /></span>;
}

export function WorkspaceLoading({ overlay = false }: { overlay?: boolean }) {
  return <div className={`workspace-loading${overlay ? ' workspace-loading-overlay' : ''}`} role="status" aria-label="Preparando Elara">
    <div className="launch-mark"><ElaraLogo size={68} /></div>
    <span className="launch-name">Elara</span>
    <span className="launch-caption">Preparando tu espacio <TypingDots /></span>
  </div>;
}
