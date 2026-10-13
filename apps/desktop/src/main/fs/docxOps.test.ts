import { describe, it, expect, beforeEach } from "vitest";
import { mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { deflateSync, zipSync, unzipSync, strToU8, strFromU8 } from "fflate";
import { makeGrant } from "./grant";
import { DOCX_OPS } from "./docxOps";

/**
 * The property the whole surgical approach rests on, verified on a REAL package rather than
 * on an XML string: **every part we did not edit comes back byte for byte**. That is what
 * makes "the styles survived" a fact rather than a hope — nothing preserved them, we simply
 * never rewrote them.
 */
const STYLES = '<?xml version="1.0"?><w:styles><w:style w:styleId="Titre"/></w:styles>';
const IMAGE = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3, 4]); // a "PNG"
const BODY =
  '<?xml version="1.0"?><w:document><w:body>' +
  '<w:p><w:r><w:t xml:space="preserve">Montant : </w:t></w:r><w:r><w:rPr><w:b/></w:rPr><w:t>1500</w:t></w:r></w:p>' +
  "<w:p><w:r><w:t>Signature</w:t></w:r></w:p>" +
  "</w:body></w:document>";

let dir: string;
let file: string;
let grant: ReturnType<typeof makeGrant>;

function makeDocx(): void {
  const zip = zipSync({
    "[Content_Types].xml": strToU8('<?xml version="1.0"?><Types/>'),
    "word/document.xml": strToU8(BODY),
    "word/styles.xml": strToU8(STYLES),
    "word/media/image1.png": IMAGE,
  });
  writeFileSync(file, zip);
}

const write = async (p: string, bytes: Uint8Array): Promise<void> => {
  writeFileSync(p, bytes);
};

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "openmasq-docx-"));
  file = join(dir, "rapport.docx");
  grant = makeGrant([dir], []);
  makeDocx();
});

describe("read_document", () => {
  it("recolle les runs et annonce le nombre de paragraphes", async () => {
    const out = await DOCX_OPS.read_document(grant, { path: file }, write);
    expect(out).toContain("Montant : 1500");
    expect(out).toContain("Signature");
    expect(out).toContain("2 paragraphe(s)");
  });

  it("refuse un fichier qui n'est pas un Word", async () => {
    const bogus = join(dir, "faux.docx");
    writeFileSync(bogus, zipSync({ "hello.txt": strToU8("hi") }));
    await expect(DOCX_OPS.read_document(grant, { path: bogus }, write)).rejects.toThrow(
      /document Word/,
    );
  });

  it("refuse un chemin hors des dossiers autorisés", async () => {
    await expect(DOCX_OPS.read_document(grant, { path: "/etc/hosts" }, write)).rejects.toThrow(
      /refusé/,
    );
  });
});

describe("edit_document — le reste du paquet est intact", () => {
  it("réécrit le passage et laisse styles et images OCTET pour OCTET", async () => {
    const before = unzipSync(readFileSync(file));
    const msg = await DOCX_OPS.edit_document(
      grant,
      { path: file, oldText: "Montant : 1500", newText: "Montant : 1800" },
      write,
    );
    expect(msg).toContain("paragraphe 1");

    const after = unzipSync(readFileSync(file));
    // THE assertion: only the body changed.
    expect(strFromU8(after["word/styles.xml"])).toBe(STYLES);
    expect([...after["word/media/image1.png"]]).toEqual([...before["word/media/image1.png"]]);
    expect(strFromU8(after["[Content_Types].xml"])).toBe(strFromU8(before["[Content_Types].xml"]));

    const body = strFromU8(after["word/document.xml"]);
    expect(body).toContain("Montant : 1800");
    // The second paragraph hasn't moved.
    expect(body).toContain("<w:t>Signature</w:t>");
  });

  it("REFUSE plutôt que de deviner quand le texte est absent", async () => {
    const before = readFileSync(file);
    await expect(
      DOCX_OPS.edit_document(grant, { path: file, oldText: "absent", newText: "x" }, write),
    ).rejects.toThrow(/introuvable/);
    // A refusal doesn't touch the file.
    expect([...readFileSync(file)]).toEqual([...before]);
  });
});

/** A one-member .docx whose headers DECLARE `declared` bytes for a deflated `real` body. */
function docxDeclaring(real: Uint8Array, declared: number): Uint8Array {
  const name = strToU8("word/document.xml");
  const data = deflateSync(real);
  const local = new Uint8Array(30 + name.length);
  const lv = new DataView(local.buffer);
  lv.setUint32(0, 0x04034b50, true);
  lv.setUint16(8, 8, true);
  lv.setUint32(18, data.length, true);
  lv.setUint32(22, declared, true);
  lv.setUint16(26, name.length, true);
  local.set(name, 30);
  const cen = new Uint8Array(46 + name.length);
  const cv = new DataView(cen.buffer);
  cv.setUint32(0, 0x02014b50, true);
  cv.setUint16(10, 8, true);
  cv.setUint32(20, data.length, true);
  cv.setUint32(24, declared, true);
  cv.setUint16(28, name.length, true);
  cen.set(name, 46);
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, 1, true);
  ev.setUint16(10, 1, true);
  ev.setUint32(12, cen.length, true);
  ev.setUint32(16, local.length + data.length, true);
  return new Uint8Array([...local, ...data, ...cen, ...eocd]);
}

describe("le corps n'est gonflé que dans sa taille déclarée", () => {
  it("un corps DÉCLARÉ trop gros est refusé avant d'être gonflé", async () => {
    writeFileSync(file, docxDeclaring(strToU8(BODY), 9_000_000));
    await expect(DOCX_OPS.read_document(grant, { path: file }, write)).rejects.toThrow(/volumineux/);
  });

  it("un corps qui gonfle AU-DELÀ de sa taille déclarée est refusé", async () => {
    writeFileSync(file, docxDeclaring(new Uint8Array(6_000_000), 100));
    await expect(DOCX_OPS.read_document(grant, { path: file }, write)).rejects.toThrow(/zip-bomb/);
    await expect(
      DOCX_OPS.edit_document(grant, { path: file, oldText: "a", newText: "b" }, write),
    ).rejects.toThrow(/zip-bomb/);
  });
});
