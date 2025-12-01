/**
 * Design System Tokens
 *
 * Minimal, Stripe-inspired design system for consistent styling.
 * This design system emphasizes clarity, simplicity, and data-first design.
 */

// ===== COLORS =====

/**
 * Gray scale - Primary color palette
 * Used throughout the app for text, borders, backgrounds
 */
export const grayScale = {
  50: "bg-gray-50", // Table headers, subtle backgrounds
  100: "bg-gray-100", // Icon backgrounds, hover states (lighter)
  200: "border-gray-200", // Primary border color, dividers
  300: "border-gray-300", // Input borders
  400: "text-gray-400", // Placeholder text, disabled states
  500: "text-gray-500", // Secondary text, metadata
  600: "text-gray-600", // Body text (secondary)
  700: "text-gray-700", // Table headers
  900: "text-gray-900", // Primary text, headings
} as const;

/**
 * Semantic status colors
 * Use sparingly for important status indicators
 */
export const statusColors = {
  success: {
    text: "text-green-600",
    bg: "bg-green-50",
    border: "border-green-200",
  },
  warning: {
    text: "text-yellow-600",
    bg: "bg-yellow-50",
    border: "border-yellow-200",
  },
  error: {
    text: "text-red-600",
    bg: "bg-red-50",
    border: "border-red-200",
  },
  info: {
    text: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
  },
} as const;

// ===== LAYOUT =====

/**
 * Page layout constants
 * Standard container and spacing for all pages
 */
export const pageLayout = {
  // Background
  background: "bg-white",
  minHeight: "min-h-screen",

  // Container
  container: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8",
  containerNarrow: "max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8",
  containerWide: "max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8",

  // Spacing
  headerSpacing: "mb-8",
  sectionSpacing: "mb-6",
  itemSpacing: "space-y-6",
} as const;

// Standalone spacing exports for convenience
export const sectionSpacing = pageLayout.sectionSpacing;
export const headerSpacing = pageLayout.headerSpacing;
export const itemSpacing = pageLayout.itemSpacing;

/**
 * Table design tokens
 * Consistent table styling across the app
 */
export const tableStyles = {
  // Container
  container: "border border-gray-200 rounded-lg overflow-hidden",

  // Header
  headerRow: "bg-gray-50 hover:bg-gray-50",
  headerCell: "font-medium text-gray-700",

  // Body
  bodyRow: "cursor-pointer hover:bg-gray-50 transition-colors border-gray-200",
  bodyCell: "text-sm text-gray-900",
  bodyCellSecondary: "text-sm text-gray-600",

  // Actions
  actionButton: "h-8 w-8 p-0 text-gray-400 hover:text-gray-600",
} as const;

/**
 * Form input styling
 * Consistent form elements across the app
 */
export const formStyles = {
  input: "border-gray-300",
  label: "text-sm font-medium text-gray-900",
  helper: "text-xs text-gray-500",
  error: "text-xs text-red-600",
} as const;

/**
 * Card/section styling
 * Used for grouping related content
 */
export const sectionStyles = {
  // Borders
  border: "border border-gray-200 rounded-lg",
  divider: "border-t border-gray-200",

  // Padding
  padding: "p-6",
  paddingCompact: "p-4",

  // Backgrounds
  background: "bg-white",
  backgroundSubtle: "bg-gray-50",
} as const;

/**
 * Card layout styles
 * Used for consistent card components
 */
export const cardLayout = {
  base: "border border-gray-200 rounded-lg p-6",
  compact: "border border-gray-200 rounded-lg p-4",
  hover: "hover:border-gray-300 hover:bg-gray-50 transition-colors",
} as const;

// ===== TYPOGRAPHY =====

/**
 * Typography scale
 * Minimal, clear hierarchy
 */
export const typography = {
  // Headings
  h1: "text-2xl font-medium text-gray-900",
  h2: "text-lg font-medium text-gray-900",
  h3: "text-sm font-medium text-gray-900",

  // Body text
  body: "text-sm text-gray-900",
  bodySecondary: "text-sm text-gray-600",
  caption: "text-xs text-gray-500",

  // Metadata
  label: "text-sm text-gray-500",
  mono: "font-mono text-sm text-gray-600",
} as const;

/**
 * Font weights
 */
export const fontWeights = {
  normal: "font-normal",
  medium: "font-medium",
  semibold: "font-semibold",
} as const;

// ===== SPACING =====

/**
 * Spacing scale
 * Based on 4px grid
 */
export const spacing = {
  0: "0",
  1: "0.25rem", // 4px
  2: "0.5rem", // 8px
  3: "0.75rem", // 12px
  4: "1rem", // 16px
  6: "1.5rem", // 24px
  8: "2rem", // 32px
  12: "3rem", // 48px
  16: "4rem", // 64px
} as const;

/**
 * Gap utilities
 * For flex and grid layouts
 */
export const gaps = {
  tight: "gap-1",
  normal: "gap-2",
  relaxed: "gap-3",
  loose: "gap-4",
  extraLoose: "gap-6",
} as const;

// ===== INTERACTIVE STATES =====

/**
 * Hover and active states
 * Consistent interaction feedback
 */
export const interactiveStates = {
  hover: "hover:bg-gray-50",
  active: "active:bg-gray-100",
  focus: "focus:outline-none focus:ring-2 focus:ring-gray-400",
  disabled: "disabled:opacity-50 disabled:cursor-not-allowed",
} as const;

/**
 * Transition styles
 */
export const transitions = {
  colors: "transition-colors",
  all: "transition-all",
  fast: "duration-150",
  base: "duration-200",
  slow: "duration-300",
} as const;

// ===== COMPONENT PATTERNS =====

/**
 * Button variants
 * Minimal button styling patterns
 */
export const buttonStyles = {
  primary: "bg-black text-white hover:bg-gray-800",
  secondary: "border border-gray-300 bg-white hover:bg-gray-50",
  ghost: "text-gray-600 hover:text-gray-900 hover:bg-gray-50",
  danger: "bg-red-600 text-white hover:bg-red-700",
} as const;

/**
 * Icon sizes
 * Standard icon dimensions
 */
export const iconSizes = {
  xs: "h-3 w-3", // 12px
  sm: "h-4 w-4", // 16px
  base: "h-5 w-5", // 20px
  lg: "h-6 w-6", // 24px
  xl: "h-8 w-8", // 32px
  "2xl": "h-10 w-10", // 40px
} as const;

/**
 * Avatar/icon backgrounds
 * Used for account icons, user avatars
 */
export const avatarStyles = {
  small: "h-6 w-6 rounded-full bg-gray-100 flex items-center justify-center",
  medium: "h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center",
  large: "h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center",
  text: "text-gray-600 font-medium",
} as const;

// ===== TYPE EXPORTS =====

export type GrayScale = keyof typeof grayScale;
export type StatusType = keyof typeof statusColors;
export type IconSize = keyof typeof iconSizes;
export type SpacingKey = keyof typeof spacing;
