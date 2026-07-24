import { ButtonHTMLAttributes, ReactNode, forwardRef } from "react";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "tertiary"
  | "danger"
  | "danger-outline"
  | "link"
  | "icon";

type BaseProps = {
  size?: "sm" | "md";
  /** Texte affiché pendant l'action (remplace children) ; désactive aussi le bouton. */
  loading?: boolean;
  loadingText?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  className?: string;
};

type CommonHtmlProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "aria-label"> & {
  children?: ReactNode;
};

/** variant="icon" exige un aria-label (pas de texte visible) — imposé par le type, pas au runtime. */
type Props = CommonHtmlProps &
  BaseProps &
  ({ variant: "icon"; "aria-label": string } | { variant?: Exclude<ButtonVariant, "icon">; "aria-label"?: string });

/**
 * Bouton partagé du CRM — applique les classes .btn/.btn-* de globals.css
 * (hover/focus-visible/disabled centralisés là-bas). Pour variant="icon",
 * `aria-label` est requis (zone cliquable 36×36 garantie par la classe).
 */
export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  {
    variant = "secondary",
    size = "md",
    loading = false,
    loadingText,
    leftIcon,
    rightIcon,
    className = "",
    disabled,
    children,
    "aria-label": ariaLabel,
    ...rest
  },
  ref
) {
  const classes = [
    "btn",
    `btn-${variant}`,
    size === "sm" ? "btn-sm" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      ref={ref}
      className={classes}
      disabled={disabled || loading}
      aria-label={ariaLabel}
      aria-busy={loading || undefined}
      {...rest}
    >
      {variant !== "icon" && leftIcon}
      {variant === "icon" ? children : loading ? loadingText ?? children : children}
      {variant !== "icon" && rightIcon}
    </button>
  );
});

export default Button;
