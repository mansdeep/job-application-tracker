"use client";

import { Document, Page, StyleSheet, Text, View, pdf } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 48, fontSize: 11, lineHeight: 1.5 },
  title: { fontSize: 16, marginBottom: 16, fontWeight: 700 },
  body: { fontSize: 11 },
  name: { fontSize: 18, fontWeight: 700, marginBottom: 2 },
  sectionHeading: { fontSize: 11, fontWeight: 700, marginTop: 12, marginBottom: 2 },
  line: { fontSize: 11 },
  spacer: { height: 6 },
});

/** A short, ALL-CAPS line (e.g. "SUMMARY", "WORK EXPERIENCE") reads as a
 * resume/cover-letter section heading rather than body prose. */
function isSectionHeading(line: string): boolean {
  const trimmed = line.trim();
  return (
    trimmed.length > 0 &&
    trimmed.length <= 40 &&
    trimmed === trimmed.toUpperCase() &&
    /[A-Z]/.test(trimmed)
  );
}

function StructuredDocument({ body }: { body: string }) {
  const lines = body.split("\n");
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {lines.map((line, i) => {
          if (line.trim() === "") return <View key={i} style={styles.spacer} />;
          if (i === 0) return <Text key={i} style={styles.name}>{line}</Text>;
          if (isSectionHeading(line)) {
            return (
              <Text key={i} style={styles.sectionHeading}>
                {line}
              </Text>
            );
          }
          return (
            <Text key={i} style={styles.line}>
              {line}
            </Text>
          );
        })}
      </Page>
    </Document>
  );
}

function TitledDocument({ title, body }: { title: string; body: string }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{body}</Text>
      </Page>
    </Document>
  );
}

/**
 * `title` is rendered as a heading inside the PDF — appropriate for
 * reference material (interview questions, a company brief), but wrong for
 * a document meant to look like an actual resume or cover letter. Omit it
 * for those so the downloaded file gets basic document formatting (name,
 * section headings) instead of a generic label slapped on top.
 */
export async function downloadTextAsPdf(
  body: string,
  filename: string,
  title?: string,
) {
  const doc = title ? (
    <TitledDocument title={title} body={body} />
  ) : (
    <StructuredDocument body={body} />
  );
  const blob = await pdf(doc).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
