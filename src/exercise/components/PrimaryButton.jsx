import React from "react";

const variants = {
  solid: {
    backgroundColor: "#22A45D",
    color: "#fff",
    border: "1px solid #22A45D",
  },
  outline: {
    backgroundColor: "transparent",
    color: "#22A45D",
    border: "1px solid #22A45D",
  },
  disabled: {
    backgroundColor: "#CFCFCF",
    color: "#fff",
    border: "1px solid #CFCFCF",
    cursor: "not-allowed",
  },
};

export default function PrimaryButton({
  children,
  onClick,
  disabled = false,
  variant = "solid",
  minWidth = 220,
  type = "button",
  className = "",
}) {
  const styleBase = {
    padding: "14px 28px",
    borderRadius: "9999px",
    fontSize: "1.05rem",
    fontWeight: 700,
    outline: "none",
    cursor: "pointer",
    transition: "transform .06s ease, box-shadow .2s ease, background .2s ease",
    minWidth,
    boxShadow: "0 3px 12px rgba(34,164,93,0.25)",
  };

  const styleVariant = disabled ? variants.disabled : variants[variant];

  return (
    <button
      type={type}
      className={`exercise-primary-button ${className}`.trim()}
      onClick={onClick}
      disabled={disabled}
      style={{ ...styleBase, ...styleVariant }}
    >
      {children}
    </button>
  );
}
