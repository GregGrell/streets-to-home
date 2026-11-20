// Builds the printable Word adoption forms from site/forms.js.  Run: node scripts/build-forms.cjs
const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, ImageRun, Table, TableRow, TableCell,
  WidthType, BorderStyle, ShadingType, AlignmentType, Footer, TableLayoutType,
} = require('docx');

// Brand palette from streetstohome.com (site/style.css)
const C = {
  espresso: '3B2918', ink: '2B1E13', muted: '6B5B4D', caramel: 'CEA37E',
  clay: 'A65A4C', rose: 'D28D7E', sage: '5F7050', sand: 'F3E9DD', cream: 'FBF7F2',
};
const FONT = 'Arial';
const W = 10034; // A4 content width with 0.65" margins
const none = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const noBorders = { top: none, bottom: none, left: none, right: none, insideHorizontal: none, insideVertical: none };

const run = (text, o = {}) => new TextRun({ text, font: FONT, size: o.size || 20, bold: o.bold, italics: o.italics, color: o.color || C.ink });

const question = (q, keep) => new Paragraph({
  keepNext: keep, keepLines: true, spacing: { before: 200, after: 60 },
  children: [run(q, { bold: true, color: C.espresso })],
});

const options = (opts, keep) => new Paragraph({
  keepNext: keep, spacing: { before: 40, after: 20 },
  children: [run(opts.map(o => '☐ ' + o).join('      '), { color: C.ink })],
});

function lineBlock(n) {
  const arr = [];
  for (let i = 0; i < n; i++) arr.push(new Paragraph({
    keepNext: i < n - 1, spacing: { before: 260, after: 0 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: C.caramel, space: 1 } },
    children: [run(' ')],
  }));
  return arr;
}
function block({ q, opts, lines = 0 }) {
  const out = [question(q, !!(opts || lines))];
  if (opts) out.push(options(opts, lines > 0));
  return out.concat(lineBlock(lines));
}

function pair(a, b) {
  const half = W / 2;
  const cell = (label) => new TableCell({
    width: { size: half, type: WidthType.DXA }, borders: noBorders,
    margins: { left: 0, right: 240 },
    children: [question(label, true), ...lineBlock(1)],
  });
  return [new Table({
    width: { size: W, type: WidthType.DXA }, columnWidths: [half, half],
    layout: TableLayoutType.FIXED, borders: noBorders,
    rows: [new TableRow({ cantSplit: true, children: [cell(a), cell(b)] })],
  })];
}

const section = (title, brk) => new Paragraph({ pageBreakBefore: !!brk,
  keepNext: true, spacing: { before: 380, after: 80 },
  border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: C.caramel, space: 4 } },
  children: [run(title, { bold: true, size: 26, color: C.espresso })],
});

const sub = (text) => new Paragraph({
  keepNext: true, spacing: { before: 240, after: 0 },
  children: [run(text, { bold: true, italics: true, size: 21, color: C.clay })],
});

function box(texts, fill) {
  return new Table({
    width: { size: W, type: WidthType.DXA }, columnWidths: [W],
    rows: [new TableRow({ children: [new TableCell({
      width: { size: W, type: WidthType.DXA },
      shading: { fill, type: ShadingType.CLEAR, color: 'auto' },
      borders: { top: none, bottom: none, right: none, left: { style: BorderStyle.SINGLE, size: 24, color: C.caramel } },
      margins: { top: 140, bottom: 140, left: 220, right: 220 },
      children: texts.map(t => new Paragraph({ spacing: { after: 60, line: 276 }, children: [run(t, { color: C.ink })] })),
    })] })],
  });
}

// ---------- Content (from site/forms.js) ----------
// forms.js is a browser script; run it in a sandbox to read the question sets
const vm = require('vm');
const sandbox = { module: { exports: {} } };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'site', 'forms.js'), 'utf8'), sandbox);
const FORMS = sandbox.module.exports;

function render(form) {
  const S = [];
  const add = (...xs) => xs.forEach(x => S.push(...(Array.isArray(x) ? x : [x])));
  form.sections.forEach((sec, i) => {
    add(section(`${i + 1}. ${sec.title.toUpperCase()}`, sec.breakBefore));
    for (const it of sec.items) {
      if (it.t === 'sub') add(sub(it.q));
      else if (it.t === 'pair') add(pair(it.a.q, it.b.q));
      else if (it.t === 'consent') add(box([it.q], C.sand));
      else if (it.t === 'sign') { add(pair('Applicant signature:', 'Date:')); add(block({ q: 'Printed name:', lines: 1 })); }
      else if (it.t === 'radio' || it.t === 'check') add(block({ q: it.q, opts: it.o, lines: it.d || 0 }));
      else add(block({ q: it.q, lines: it.n || 1 }));
    }
  });
  return S;
}

// ---------- Header block ----------
function build(form) {
const top = [
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 },
    children: [new ImageRun({ type: 'png', data: fs.readFileSync(path.join(__dirname, '..', 'site', 'logo-lg.png')), transformation: { width: 150, height: 150 },
      altText: { title: 'Streets to Home logo', description: 'Streets to Home logo', name: 'logo' } })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 240 },
    children: [run(form.title.toUpperCase() + ' FORM', { bold: true, size: 34, color: C.espresso })] }),
  box(form.intro, C.sand),
  new Paragraph({ spacing: { before: 120, after: 0 },
    children: [run('Submitting an application does not guarantee adoption. We may contact you to discuss your answers, request a home check/video call, or ask for veterinary references where appropriate.', { italics: true, size: 18, color: C.muted })] }),
  new Paragraph({ spacing: { before: 60, after: 0 },
    children: [run('You can also fill this form in online at streetstohome.com/apply.html?f=' + form.id, { size: 18, color: C.clay })] }),
];

const doc = new Document({
  creator: 'Streets to Home', title: 'Streets to Home - ' + form.title + ' Form',
  styles: { default: { document: { run: { font: FONT, size: 20, color: C.ink } } } },
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 792, bottom: 792, left: 936, right: 936, header: 500, footer: 500 } } },
    footers: { default: new Footer({ children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      border: { top: { style: BorderStyle.SINGLE, size: 4, color: C.caramel, space: 6 } },
      children: [run('Streets to Home  •  streetstohome.com  •  streetstohome@gmail.com  •  Instagram: @streetstohomeqatar', { size: 16, color: C.muted })],
    })] }) },
    children: [...top, ...render(form)],
  }],
});
const out = path.join(__dirname, '..', 'site', 'forms', `streets-to-home-${form.id}-adoption-form.docx`);
return Packer.toBuffer(doc).then(b => { fs.writeFileSync(out, b); console.log('wrote', out); });
}

Promise.all(Object.values(FORMS).map(build));
