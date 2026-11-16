'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';
import { deviceScale, PREVIEW_DEVICES, type PreviewDevice } from '@/lib/device-preview';
import { TypingDots } from './WorkspaceLoading';

export function DevicePreview({ viewport, srcDoc, reloadNonce, selectedId, previewRef }: {
  viewport: PreviewDevice; srcDoc: string; reloadNonce: number; selectedId: string;
  previewRef: RefObject<HTMLIFrameElement | null>;
}) {
  const stage = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ width: 600, height: 650 });
  const [fit, setFit] = useState(true);
  const [landscape, setLandscape] = useState(false);
  const [loadedKey, setLoadedKey] = useState('');
  const device = PREVIEW_DEVICES[viewport];
  const width = landscape && viewport !== 'desktop' ? device.height : device.width;
  const height = landscape && viewport !== 'desktop' ? device.width : device.height;
  const frameWidth = width + 24, frameHeight = height + 62;
  const scale = fit ? deviceScale(frameWidth, frameHeight, box.width, box.height) : 1;
  const documentKey = `${selectedId}:${reloadNonce}:${srcDoc}`;
  useEffect(() => {
    const element = stage.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setBox({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return <div className="device-preview">
    <div className="device-options">
      <span>{device.name} <strong>{width} × {height}</strong></span>
      <div><button type="button" aria-pressed={fit} onClick={() => setFit(!fit)}>{fit ? `Ajustar · ${Math.round(scale * 100)}%` : 'Tamaño real · 100%'}</button>
        {viewport !== 'desktop' && <button type="button" onClick={() => setLandscape(!landscape)} aria-pressed={landscape}>Girar pantalla</button>}
      </div>
    </div>
    <div className="device-stage" ref={stage}>
      <div className="device-footprint" style={{ width: frameWidth * scale, height: frameHeight * scale }}>
        <div className={`device-frame device-${viewport}`} style={{ width: frameWidth, height: frameHeight, transform: `scale(${scale})` }}>
          <div className="device-chrome" aria-hidden="true">{viewport === 'desktop' ? <><span className="browser-lights"><i /><i /><i /></span><span className="browser-address">index.html</span></> : <span className="device-camera" />}</div>
          <iframe ref={previewRef} key={documentKey} title={`Vista previa en ${device.name.toLowerCase()}`} srcDoc={srcDoc} sandbox="allow-scripts" style={{ width, height }} onLoad={() => setLoadedKey(documentKey)} />
          {loadedKey !== documentKey && <div className="device-loading" role="status"><TypingDots /><span>Cargando vista previa</span></div>}
          <div className="device-bottom" aria-hidden="true">{viewport !== 'desktop' && <span />}</div>
        </div>
      </div>
    </div>
    <p className="device-caption">Simulación de tamaño de pantalla. Prueba los controles dentro de la vista.</p>
  </div>;
}
