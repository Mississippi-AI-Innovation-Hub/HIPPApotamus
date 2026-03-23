/** Brand and document color palette for PDF generation. */
export const pdfColors = {
  /** Primary teal — headers, borders, accents */
  teal: {
    50: "#f0fdfa",
    100: "#ccfbf1",
    500: "#14b8a6",
    600: "#0d9488",
    700: "#0f766e",
    800: "#115e59",
    900: "#134e4a",
  },
  /** Secondary emerald — success states, signatures */
  emerald: {
    50: "#ecfdf5",
    100: "#d1fae5",
    500: "#10b981",
    600: "#059669",
    700: "#047857",
  },
  /** Neutral slate — body text, borders */
  slate: {
    50: "#f8fafc",
    100: "#f1f5f9",
    200: "#e2e8f0",
    300: "#cbd5e1",
    400: "#94a3b8",
    500: "#64748b",
    600: "#475569",
    700: "#334155",
    800: "#1e293b",
    900: "#0f172a",
  },
  /** Danger red — expired, overdue */
  red: {
    500: "#ef4444",
    600: "#dc2626",
  },
  /** Warning amber */
  amber: {
    500: "#f59e0b",
    600: "#d97706",
  },
  white: "#ffffff",
} as const;

/** Reusable style fragments for @react-pdf/renderer StyleSheet. */
export const pdfTypography = {
  heading1: {
    fontSize: 20,
    fontWeight: "bold" as const,
    color: pdfColors.slate[900],
    marginBottom: 12,
  },
  heading2: {
    fontSize: 16,
    fontWeight: "bold" as const,
    color: pdfColors.teal[800],
    marginBottom: 8,
    marginTop: 16,
  },
  heading3: {
    fontSize: 13,
    fontWeight: "bold" as const,
    color: pdfColors.slate[700],
    marginBottom: 6,
    marginTop: 12,
  },
  body: {
    fontSize: 10,
    lineHeight: 1.6,
    color: pdfColors.slate[700],
  },
  small: {
    fontSize: 8,
    color: pdfColors.slate[500],
  },
  label: {
    fontSize: 9,
    fontWeight: "bold" as const,
    color: pdfColors.slate[600],
    textTransform: "uppercase" as const,
  },
} as const;

export const pdfLayout = {
  page: {
    paddingTop: 48,
    paddingBottom: 48,
    paddingHorizontal: 48,
    backgroundColor: pdfColors.white,
  },
  section: {
    marginBottom: 16,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: pdfColors.slate[200],
    marginVertical: 12,
  },
} as const;
