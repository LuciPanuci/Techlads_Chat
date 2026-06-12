import React, { useEffect, useId, useState } from 'react';
import ChatBubbleIcon from './ChatBubbleIcon';

const ORBIT_LABEL = 'LAUNCH YOUR PROJECT';
const TYPE_INTERVAL_MS = 38;

/** Keep in sync with `.scc-chat-fab` / `.scc-chat-fab__orbit` in styles.css */
const BUTTON_REM = 3.75;
const ORBIT_REM = 7.75;
const ORBIT_GAP_REM = 0.32;
const VIEWBOX = 100;
const CENTER = VIEWBOX / 2;

const buttonRadiusVb = CENTER * (BUTTON_REM / ORBIT_REM);
const orbitRadiusVb = buttonRadiusVb + (ORBIT_GAP_REM / ORBIT_REM) * VIEWBOX;
const ORBIT_PATH_D = `M ${CENTER},${CENTER - orbitRadiusVb} a ${orbitRadiusVb},${orbitRadiusVb} 0 1,1 -0.01,0`;
/** 9 o'clock on a clockwise path from the top */
const ORBIT_START_OFFSET = '75%';

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReduced(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  return reduced;
}

function useOrbitTypewriter(active, text, reducedMotion) {
  const [typed, setTyped] = useState('');

  useEffect(() => {
    if (!active) {
      setTyped('');
      return undefined;
    }

    if (reducedMotion) {
      setTyped(text);
      return undefined;
    }

    let index = 0;
    setTyped('');

    const timer = window.setInterval(() => {
      index += 1;
      setTyped(text.slice(0, index));
      if (index >= text.length) {
        window.clearInterval(timer);
      }
    }, TYPE_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [active, text, reducedMotion]);

  return typed;
}

export default function ChatFab({
  onClick,
  accent = '#5DA399',
  label = 'Open chat',
  orbitLabel = ORBIT_LABEL,
}) {
  const pathId = useId().replace(/:/g, '');
  const [hovered, setHovered] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const typed = useOrbitTypewriter(hovered, orbitLabel, reducedMotion);
  const isTyping = hovered && typed.length < orbitLabel.length;
  const orbitText = isTyping ? `${typed}▍` : typed;

  return (
    <div
      className="scc-chat-fab-wrap"
      style={{ '--scc-fab-accent': accent }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setHovered(false);
        }
      }}
    >
      <svg
        className={`scc-chat-fab__orbit${hovered ? ' scc-chat-fab__orbit--visible' : ''}`}
        viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
        aria-hidden
      >
        <defs>
          <path id={pathId} d={ORBIT_PATH_D} fill="none" />
        </defs>
        <text className="scc-chat-fab__orbit-text" style={{ '--scc-fab-accent': accent }}>
          <textPath href={`#${pathId}`} startOffset={ORBIT_START_OFFSET} side="left">
            {orbitText}
          </textPath>
        </text>
      </svg>

      <button
        type="button"
        onClick={onClick}
        className="scc-chat-fab"
        style={{ '--scc-fab-accent': accent }}
        title={label}
        aria-label={label}
      >
        <span className="scc-chat-fab__ring" aria-hidden />
        <span className="scc-chat-fab__glow" aria-hidden />
        <ChatBubbleIcon className="scc-chat-fab__icon" />
      </button>
    </div>
  );
}
