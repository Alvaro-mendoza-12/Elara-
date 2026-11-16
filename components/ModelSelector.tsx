'use client';

import { ChevronDown, Check, Cpu, Sparkles, Zap } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { MODEL_LABELS, type ModelAvailability, type ModelChoice, type ModelPreferences } from '@/lib/models';

export function ModelSelector({ value, onChange, signedIn, disabled }: { value: ModelPreferences; onChange: (value: ModelPreferences) => void; signedIn: boolean; disabled: boolean }) {
  const [availability, setAvailability] = useState<ModelAvailability | null>(null);
  const [open,setOpen]=useState(false);
  const details = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/models', { cache: 'no-store', signal: controller.signal }).then((r) => r.ok ? r.json() : null).then(setAvailability).catch(() => {});
    return () => controller.abort();
  }, []);
  useEffect(()=>{
    if(!open)return;
    const controller=new AbortController();let pending=false;
    const refresh=async()=>{
      if(pending||document.visibilityState==='hidden')return;
      pending=true;
      try{const response=await fetch('/api/models',{cache:'no-store',signal:AbortSignal.any([controller.signal,AbortSignal.timeout(5000)])});if(response.ok&&!controller.signal.aborted)setAvailability(await response.json());}catch{}finally{pending=false;}
    };
    void refresh();const timer=setInterval(refresh,5000);
    return()=>{controller.abort();clearInterval(timer);};
  },[open]);
  useEffect(() => {
    const closeOutside = (event: PointerEvent) => { if (details.current?.open && event.target instanceof Node && !details.current.contains(event.target)) details.current.open = false; };
    window.addEventListener('pointerdown', closeOutside);
    return () => window.removeEventListener('pointerdown', closeOutside);
  }, []);
  const choices: Array<{ id: ModelChoice; description: string; icon: typeof Cpu }> = [
    { id: 'auto', description: signedIn ? 'Usa Core y el modelo de Conversación según tu petición.' : 'Herramientas de Core. Entra con Novvin para conversar.', icon: Sparkles },
    { id: 'core', description: 'Webs, cálculos y utilidades. Rápido y sin límite de mensajes.', icon: Zap },
    { id: 'conversation', description: !signedIn ? 'Disponible al iniciar sesión con Novvin.' : availability?.ready ? availability.busy ? 'Atendiendo otra consulta. Puedes probar Core.' : 'Modelo de lenguaje en nuestro servidor. Puede tardar.' : availability === null ? 'Comprobando disponibilidad…' : 'No disponible ahora. Core sigue funcionando.', icon: Cpu },
  ];
  const parameters=availability?.base?.includes('Qwen3-4B')?'cuatro mil millones de parámetros':availability?.base==='Qwen3.5-2B'?'dos mil millones de parámetros':null;
  return <details className="model-selector" ref={details} onToggle={() => { setOpen(Boolean(details.current?.open)); }} onKeyDown={(event) => { if (event.key === 'Escape' && details.current?.open) { details.current.open = false; details.current.querySelector('summary')?.focus(); } }}>
    <summary role="button" aria-label="Elegir motor y extensión de respuesta" aria-disabled={disabled} onClick={(event) => { if (disabled) event.preventDefault(); }}><Sparkles size={13} /><span>{MODEL_LABELS[value.model]}</span><ChevronDown size={12} /></summary>
    <div className="model-panel">
      <div className="model-panel-title">Motor de Elara</div>
      {choices.map(({ id, description, icon: Icon }) => <button key={id} type="button" aria-pressed={value.model === id} disabled={disabled || (id === 'conversation' && (!signedIn || !availability?.ready))} onClick={() => { onChange({ ...value, model: id }); if (details.current) details.current.open = false; }}><Icon size={17} /><span><strong>{MODEL_LABELS[id]}</strong><small>{description}</small></span>{value.model === id && <Check size={15} />}</button>)}
      <fieldset><legend>Extensión en Conversación</legend><label><input type="radio" name="response-detail" value="brief" checked={value.detail === 'brief'} disabled={disabled} onChange={() => onChange({ ...value, detail: 'brief' })} /> Breve</label><label><input type="radio" name="response-detail" value="explain" checked={value.detail === 'explain'} disabled={disabled} onChange={() => onChange({ ...value, detail: 'explain' })} /> Con explicación</label></fieldset>
      <p>Conversación: {availability?.base||'modelo en nuestro servidor'}{parameters?', '+parameters:''}, adaptado para Elara. Una consulta a la vez y hasta 6 por minuto. Verifica los datos importantes.</p>
    </div>
  </details>;
}
