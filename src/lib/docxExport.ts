import { Document, Paragraph, TextRun, AlignmentType, HeadingLevel, Packer } from "docx";

interface SignatureData {
  secretarioNome: string;
  secretarioCargo: string;
  presidenteNome: string;
  presidenteCargo: string;
}

interface ChurchInfo {
  nome?: string;
  cidade?: string;
  estado?: string;
}

export async function exportarParaDocx(
  titulo: string,
  textoAta: string,
  signatures: SignatureData,
  churchInfo?: ChurchInfo | null
): Promise<Blob> {
  const paragraphs: Paragraph[] = [];

  // 1. Cabeçalho da Igreja
  if (churchInfo?.nome) {
    paragraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
        children: [
          new TextRun({
            text: churchInfo.nome.toUpperCase(),
            bold: true,
            size: 26, // 13pt
            font: "Calibri",
          }),
        ],
      })
    );

    if (churchInfo.cidade) {
      paragraphs.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 240 },
          children: [
            new TextRun({
              text: `${churchInfo.cidade} - ${churchInfo.estado || "RJ"}`,
              italics: true,
              size: 20, // 10pt
              font: "Calibri",
              color: "555555",
            }),
          ],
        })
      );
    }
  }

  // 2. Parágrafos do texto da ata
  // Separa o texto e limpa {{ASSINATURAS}}
  const cleanText = textoAta.replace(/\{\{ASSINATURAS\}\}/g, "").trim();
  const rawParagraphs = cleanText.split(/\n\s*\n/);

  for (const block of rawParagraphs) {
    const trimmed = block.trim();
    if (!trimmed) continue;

    // Se começar com ATA DE ASSEMBLEIA, formatamos como título principal
    const isTitle = trimmed.toUpperCase().startsWith("ATA DE ASSEMBLEIA") || trimmed.toUpperCase().startsWith("ATA DA ASSEMBLEIA");

    if (isTitle) {
      paragraphs.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 200, after: 300 },
          children: [
            new TextRun({
              text: trimmed,
              bold: true,
              size: 24, // 12pt
              font: "Calibri",
            }),
          ],
        })
      );
    } else {
      // Parágrafo do corpo da ata (Justificado, recuo de primeira linha de 1.25cm = 708 twips)
      paragraphs.push(
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          indent: { firstLine: 708 },
          spacing: { line: 276, after: 180 }, // 1.15 line spacing
          children: [
            new TextRun({
              text: trimmed,
              size: 22, // 11pt
              font: "Calibri",
            }),
          ],
        })
      );
    }
  }

  // 3. Espaçamento antes das assinaturas
  paragraphs.push(
    new Paragraph({
      spacing: { before: 500, after: 200 },
      children: [],
    })
  );

  // 4. Assinatura do Pastor Dirigente
  paragraphs.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 400, after: 60 },
      children: [
        new TextRun({
          text: "____________________________________________________",
          size: 20,
          font: "Calibri",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [
        new TextRun({
          text: signatures.presidenteNome || "Pastor Dirigente",
          bold: true,
          size: 22,
          font: "Calibri",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
      children: [
        new TextRun({
          text: signatures.presidenteCargo || "1º Dirigente e Pastor",
          size: 20,
          font: "Calibri",
          color: "444444",
        }),
      ],
    })
  );

  // 5. Assinatura do Secretário
  paragraphs.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 300, after: 60 },
      children: [
        new TextRun({
          text: "____________________________________________________",
          size: 20,
          font: "Calibri",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [
        new TextRun({
          text: signatures.secretarioNome || "Secretário(a)",
          bold: true,
          size: 22,
          font: "Calibri",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: signatures.secretarioCargo || "Secretário(a)",
          size: 20,
          font: "Calibri",
          color: "444444",
        }),
      ],
    })
  );

  // Criação do documento DOCX
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440,    // 2.54 cm
              bottom: 1440, // 2.54 cm
              left: 1700,   // ~3.0 cm (padrão de ata/cartório)
              right: 1440,  // 2.54 cm
            },
          },
        },
        children: paragraphs,
      },
    ],
  });

  return await Packer.toBlob(doc);
}

