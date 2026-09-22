import React from "react";

export function Label({ children, htmlFor }) {
  return <label className="label" htmlFor={htmlFor}>{children}</label>;
}

export function RuledInput({ value, onChange, placeholder, num, id }) {
  return (
    <div className="ruled">
      {num != null && <span className="ruled-num">{num}</span>}
      <input
        id={id}
        className="ruled-input"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ paddingLeft: num != null ? 26 : 0 }}
      />
    </div>
  );
}

export function RuledArea({ value, onChange, placeholder, rows = 5, id }) {
  return (
    <textarea
      id={id}
      className="area"
      rows={rows}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  );
}
