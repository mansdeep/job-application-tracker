"use client";

import { Document, Page, StyleSheet, Text, pdf } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 48, fontSize: 11, lineHeight: 1.5 },
  title: { fontSize: 16, marginBottom: 16, fontWeight: 700 },
  body: { fontSize: 11 },
});

function TextDocument({ title, body }: { title: string; body: string }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{body}</Text>
      </Page>
    </Document>
  );
}

export async function downloadTextAsPdf(
  title: string,
  body: string,
  filename: string,
) {
  const blob = await pdf(<TextDocument title={title} body={body} />).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
