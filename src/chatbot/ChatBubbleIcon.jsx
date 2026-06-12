import React from 'react';

export default function ChatBubbleIcon({ className, style }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6.5 5.75h11a1.75 1.75 0 0 1 1.75 1.75v6.25a1.75 1.75 0 0 1-1.75 1.75H10l-3.75 3.25V7.5a1.75 1.75 0 0 1 1.75-1.75Z"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinejoin="round"
      />
      <path
        d="M8.25 9.25h7.5M8.25 12h4.5"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
      />
    </svg>
  );
}
