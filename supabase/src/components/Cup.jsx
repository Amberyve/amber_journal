import React from "react";

/* The line-art cup from the printed cover, redrawn as SVG so it stays crisp
   at any size. `tone` sets the stroke color; `steam` can be turned off for
   the small repeated cups in the footer band. */
export default function Cup({ size = 200, tone = "currentColor", steam = true, strokeWidth = 3.2, className }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      stroke={tone}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {steam && (
        <g opacity="0.85" strokeWidth={strokeWidth * 0.8}>
          <path d="M82 62 C76 52 90 45 84 33" />
          <path d="M100 58 C94 45 108 38 102 24" />
          <path d="M118 62 C112 52 126 45 120 33" />
        </g>
      )}
      {/* rim */}
      <ellipse cx="100" cy="80" rx="42" ry="8.5" />
      {/* body */}
      <path d="M58 80 L71 149" />
      <path d="M142 80 L129 149" />
      <path d="M71 149 Q100 166 129 149" />
      {/* handle */}
      <path d="M143 93 C168 94 167 127 139 131" />
      {/* saucer */}
      <path d="M48 163 Q100 187 152 163" />
    </svg>
  );
}
