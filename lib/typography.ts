import type { CSSProperties } from "react";

/**
 * Hiérarchie typographique centralisée du CRM.
 *
 * Tout le styling de l'app passe par des objets `style={{...}}` inline (pas
 * de classes Tailwind pour le texte) — ces tokens se spread dans ces objets
 * existants (`style={{ ...typography.pageTitle, color: dynamicColor }}`) au
 * lieu de valeurs dupliquées à chaque page. Le corps de texte reste en Inter
 * (`--font-inter`, déjà chargé globalement) ; les trois niveaux de titre
 * (pageTitle/sectionTitle/cardTitle) sont en Georgia Extra-Bold — Georgia ne
 * fournit nativement que regular/bold, donc fontWeight:800 pousse le
 * navigateur vers le rendu le plus gras disponible (bold natif, éventuellement
 * accentué) plutôt que de dépendre d'une graisse "extra-bold" qui n'existe
 * pas dans cette police.
 */

const fontFamily = "var(--font-inter), system-ui, sans-serif";
const titleFontFamily = "Georgia, 'Times New Roman', serif";

export const typography = {
  /** <h1> de page (une seule fois par page). */
  pageTitle: {
    fontFamily: titleFontFamily,
    fontSize: 32,
    fontWeight: 800,
    lineHeight: 1.2,
    letterSpacing: "-0.01em",
    color: "#1A1A1A",
    margin: 0,
  } satisfies CSSProperties,

  /** Titre de section / bloc à l'intérieur d'une page. */
  sectionTitle: {
    fontFamily: titleFontFamily,
    fontSize: 20,
    fontWeight: 800,
    lineHeight: 1.25,
    letterSpacing: "-0.005em",
    color: "#1A1A1A",
    margin: 0,
  } satisfies CSSProperties,

  /** Titre de carte ou d'en-tête de modale. */
  cardTitle: {
    fontFamily: titleFontFamily,
    fontSize: 17,
    fontWeight: 800,
    lineHeight: 1.3,
    letterSpacing: "-0.005em",
    color: "#1A1A1A",
    margin: 0,
  } satisfies CSSProperties,

  /** Sous-titre (sous un titre de page ou de carte). */
  subtitle: {
    fontFamily,
    fontSize: 15,
    fontWeight: 500,
    lineHeight: 1.4,
    color: "#5C5A52",
    margin: 0,
  } satisfies CSSProperties,

  /** Corps de texte courant. */
  body: {
    fontFamily,
    fontSize: 15,
    fontWeight: 400,
    lineHeight: 1.5,
    color: "#1A1A1A",
    margin: 0,
  } satisfies CSSProperties,

  /** Description discrète (sous un titre, dans une carte vide, etc.). */
  description: {
    fontFamily,
    fontSize: 13.5,
    fontWeight: 400,
    lineHeight: 1.5,
    color: "#8C8B83",
    margin: 0,
  } satisfies CSSProperties,

  /** Label de champ de formulaire. */
  label: {
    fontFamily,
    fontSize: 13,
    fontWeight: 600,
    lineHeight: 1.3,
    color: "#5C5A52",
    margin: 0,
  } satisfies CSSProperties,

  /** Texte secondaire générique (métadonnées, compteurs, colonnes annexes). */
  secondary: {
    fontFamily,
    fontSize: 13,
    fontWeight: 500,
    lineHeight: 1.4,
    color: "#8C8B83",
    margin: 0,
  } satisfies CSSProperties,

  /** Message d'aide sous un champ. */
  help: {
    fontFamily,
    fontSize: 12.5,
    fontWeight: 400,
    lineHeight: 1.4,
    color: "#8C8B83",
    margin: 0,
  } satisfies CSSProperties,

  /** Message d'erreur (utilise la couleur COLORS.rouge de lib/mock-data.ts). */
  error: {
    fontFamily,
    fontSize: 13.5,
    fontWeight: 500,
    lineHeight: 1.4,
    color: "#E53935",
    margin: 0,
  } satisfies CSSProperties,
} as const;
