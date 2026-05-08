import jsPDF from "jspdf";
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";
import JSZip from "jszip";
import { supabase } from "@/integrations/supabase/client";
import { OSNOVNI_ENTRIES, type OsnovniEntry } from "./osnovniRecnik";

export interface ExportEntry {
  word: string;
  pos: string;
  definition: string;
  letter: string;
  category: string;
}

/** Fetch merged dictionary: admin-edited osnovni entries from DB override static ones by word. */
export async function getMergedOsnovni(): Promise<ExportEntry[]> {
  const { data } = await supabase
    .from("entries")
    .select("word, definition, examples, synonyms")
    .eq("scope", "osnovni")
    .limit(2000);

  const dbByWord = new Map<string, ExportEntry>();
  for (const r of (data ?? []) as any[]) {
    const word = String(r.word ?? "").trim();
    if (!word) continue;
    const def = [
      r.definition,
      ...(Array.isArray(r.examples) && r.examples.length ? ["— " + r.examples.join("; ")] : []),
      ...(Array.isArray(r.synonyms) && r.synonyms.length ? ["Син.: " + r.synonyms.join(", ")] : []),
    ].filter(Boolean).join(" ");
    const letter = word.charAt(0).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    dbByWord.set(word.toLowerCase(), { word, pos: "", definition: def, letter, category: "" });
  }

  const merged: ExportEntry[] = [];
  const seen = new Set<string>();
  for (const e of OSNOVNI_ENTRIES as OsnovniEntry[]) {
    const key = e.word.toLowerCase();
    if (dbByWord.has(key)) {
      merged.push(dbByWord.get(key)!);
      seen.add(key);
    } else {
      merged.push({ word: e.word, pos: e.pos, definition: e.definition, letter: e.letter, category: e.category });
    }
  }
  for (const [k, v] of dbByWord) if (!seen.has(k)) merged.push(v);

  merged.sort((a, b) => a.word.localeCompare(b.word, "sr"));
  return merged;
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function downloadJSON() {
  const entries = await getMergedOsnovni();
  const blob = new Blob([JSON.stringify(entries, null, 2)], { type: "application/json" });
  triggerDownload(blob, "zaplanjski-recnik.json");
}

// Load TTF with Cyrillic glyphs and register with jsPDF (cached).
const FONT_URLS = {
  regular: "https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts@main/hinted/ttf/NotoSerif/NotoSerif-Regular.ttf",
  bold: "https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts@main/hinted/ttf/NotoSerif/NotoSerif-Bold.ttf",
  italic: "https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts@main/hinted/ttf/NotoSerif/NotoSerif-Italic.ttf",
};
const fontCache: Partial<Record<keyof typeof FONT_URLS, string>> = {};

async function fetchFontBase64(key: keyof typeof FONT_URLS): Promise<string> {
  if (fontCache[key]) return fontCache[key]!;
  const res = await fetch(FONT_URLS[key]);
  if (!res.ok) throw new Error(`Не могу да преузмем фонт (${key})`);
  const buf = new Uint8Array(await res.arrayBuffer());
  let bin = "";
  for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
  const b64 = btoa(bin);
  fontCache[key] = b64;
  return b64;
}

async function registerCyrillicFont(doc: jsPDF) {
  const [reg, bold, italic] = await Promise.all([
    fetchFontBase64("regular"),
    fetchFontBase64("bold"),
    fetchFontBase64("italic"),
  ]);
  doc.addFileToVFS("NotoSerif-Regular.ttf", reg);
  doc.addFont("NotoSerif-Regular.ttf", "NotoSerif", "normal");
  doc.addFileToVFS("NotoSerif-Bold.ttf", bold);
  doc.addFont("NotoSerif-Bold.ttf", "NotoSerif", "bold");
  doc.addFileToVFS("NotoSerif-Italic.ttf", italic);
  doc.addFont("NotoSerif-Italic.ttf", "NotoSerif", "italic");
}

export async function downloadPDF() {
  const entries = await getMergedOsnovni();
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  await registerCyrillicFont(doc);
  const FONT = "NotoSerif";
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 40;
  let y = margin;

  doc.setFont(FONT, "bold");
  doc.setFontSize(20);
  doc.text("Заплањски речник", pageW / 2, y, { align: "center" });
  y += 28;
  doc.setFont(FONT, "italic");
  doc.setFontSize(10);
  doc.text(`Генерисано ${new Date().toLocaleString("sr-RS")} · ${entries.length} одредница`, pageW / 2, y, { align: "center" });
  y += 24;

  let currentLetter = "";
  for (const e of entries) {
    if (e.letter && e.letter !== currentLetter) {
      currentLetter = e.letter;
      if (y > pageH - 80) { doc.addPage(); y = margin; }
      y += 8;
      doc.setFont(FONT, "bold");
      doc.setFontSize(16);
      doc.text(currentLetter, margin, y);
      y += 18;
    }
    doc.setFont(FONT, "bold");
    doc.setFontSize(11);
    const head = `${e.word}${e.pos ? "  " + e.pos : ""}`;
    const headLines = doc.splitTextToSize(head, pageW - margin * 2);
    if (y + headLines.length * 14 > pageH - margin) { doc.addPage(); y = margin; }
    doc.text(headLines, margin, y);
    y += headLines.length * 14;

    doc.setFont(FONT, "normal");
    doc.setFontSize(10);
    const defLines = doc.splitTextToSize(e.definition || "", pageW - margin * 2);
    for (const line of defLines) {
      if (y > pageH - margin) { doc.addPage(); y = margin; }
      doc.text(line, margin, y);
      y += 12;
    }
    y += 4;
  }
  triggerDownload(doc.output("blob"), "zaplanjski-recnik.pdf");
}

export async function downloadDOCX() {
  const entries = await getMergedOsnovni();
  const children: Paragraph[] = [
    new Paragraph({ text: "Заплањски речник", heading: HeadingLevel.TITLE }),
    new Paragraph({
      children: [new TextRun({ text: `Генерисано ${new Date().toLocaleString("sr-RS")} · ${entries.length} одредница`, italics: true })],
    }),
  ];
  let currentLetter = "";
  for (const e of entries) {
    if (e.letter && e.letter !== currentLetter) {
      currentLetter = e.letter;
      children.push(new Paragraph({ text: currentLetter, heading: HeadingLevel.HEADING_1 }));
    }
    children.push(new Paragraph({
      children: [
        new TextRun({ text: e.word, bold: true }),
        ...(e.pos ? [new TextRun({ text: `  ${e.pos}`, italics: true })] : []),
      ],
    }));
    children.push(new Paragraph({ text: e.definition || "" }));
  }
  const doc = new Document({ sections: [{ children }] });
  const blob = await Packer.toBlob(doc);
  triggerDownload(blob, "zaplanjski-recnik.docx");
}

const xmlEscape = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export async function downloadEPUB() {
  const entries = await getMergedOsnovni();
  const zip = new JSZip();
  zip.file("mimetype", "application/epub+zip", { compression: "STORE" });

  const metaInf = zip.folder("META-INF")!;
  metaInf.file("container.xml",
    `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>
</container>`);

  const oebps = zip.folder("OEBPS")!;
  const uid = `urn:uuid:${crypto.randomUUID?.() ?? Date.now()}`;

  // group by letter
  const byLetter = new Map<string, ExportEntry[]>();
  for (const e of entries) {
    const L = e.letter || "·";
    if (!byLetter.has(L)) byLetter.set(L, []);
    byLetter.get(L)!.push(e);
  }
  const letters = Array.from(byLetter.keys());

  const chapters: { id: string; href: string; title: string }[] = [];
  letters.forEach((L, i) => {
    const id = `ch${i + 1}`;
    const href = `${id}.xhtml`;
    const items = byLetter.get(L)!.map(e => `
      <dt><strong>${xmlEscape(e.word)}</strong>${e.pos ? ` <em>${xmlEscape(e.pos)}</em>` : ""}</dt>
      <dd>${xmlEscape(e.definition || "")}</dd>`).join("");
    oebps.file(href,
      `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="sr"><head><meta charset="utf-8"/><title>${xmlEscape(L)}</title></head>
<body><h1>${xmlEscape(L)}</h1><dl>${items}</dl></body></html>`);
    chapters.push({ id, href, title: L });
  });

  const manifestItems = chapters.map(c => `<item id="${c.id}" href="${c.href}" media-type="application/xhtml+xml"/>`).join("\n    ");
  const spineItems = chapters.map(c => `<itemref idref="${c.id}"/>`).join("\n    ");

  oebps.file("content.opf",
    `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="bookid">${uid}</dc:identifier>
    <dc:title>Заплањски речник</dc:title>
    <dc:language>sr</dc:language>
    <dc:date>${new Date().toISOString()}</dc:date>
    <meta property="dcterms:modified">${new Date().toISOString().split(".")[0]}Z</meta>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    ${manifestItems}
  </manifest>
  <spine>
    ${spineItems}
  </spine>
</package>`);

  oebps.file("nav.xhtml",
    `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><head><title>Садржај</title></head>
<body><nav epub:type="toc"><h1>Садржај</h1><ol>
${chapters.map(c => `<li><a href="${c.href}">${xmlEscape(c.title)}</a></li>`).join("\n")}
</ol></nav></body></html>`);

  const blob = await zip.generateAsync({ type: "blob", mimeType: "application/epub+zip" });
  triggerDownload(blob, "zaplanjski-recnik.epub");
}
