import { PDFDocument } from "pdf-lib";
import sharp from "sharp";
import { prisma } from "@/lib/db";
import { fetchBlobBuffer, uploadBufferToBlob } from "@/lib/blob";
import { makePersonFileBase } from "@/lib/utils";

async function normalizeImageToPng(input: Buffer): Promise<{ data: Buffer; width: number; height: number }> {
  const normalized = sharp(input).rotate().resize({
    width: 2000,
    height: 2000,
    fit: "inside",
    withoutEnlargement: true,
  });

  const pngBuffer = await normalized.png().toBuffer();
  const metadata = await sharp(pngBuffer).metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error("Could not read image dimensions.");
  }
  return { data: pngBuffer, width: metadata.width, height: metadata.height };
}

function drawImageOnPage(
  pageWidth: number,
  pageHeight: number,
  imageWidth: number,
  imageHeight: number
) {
  const margin = 24;
  const maxWidth = pageWidth - margin * 2;
  const maxHeight = pageHeight - margin * 2;
  const scale = Math.min(maxWidth / imageWidth, maxHeight / imageHeight);
  const width = imageWidth * scale;
  const height = imageHeight * scale;
  const x = (pageWidth - width) / 2;
  const y = (pageHeight - height) / 2;
  return { x, y, width, height };
}

async function embedPng(pdfDoc: PDFDocument, pngBuffer: Buffer) {
  return pdfDoc.embedPng(pngBuffer);
}

export async function createPdfForPerson(personInput: { id: string } | string) {
  const personId = typeof personInput === "string" ? personInput : personInput.id;
  const person = await prisma.person.findUnique({ where: { id: personId } });
  if (!person) {
    throw new Error("Person not found.");
  }
  if (!person.photoBlobUrl || !person.passportBlobUrl || !person.eidFrontBlobUrl || !person.eidBackBlobUrl) {
    throw new Error("Person must have all required images uploaded.");
  }

  const [photoRaw, passportRaw, eidFrontRaw, eidBackRaw] = await Promise.all([
    fetchBlobBuffer(person.photoBlobUrl).then((v) => v.buffer),
    fetchBlobBuffer(person.passportBlobUrl).then((v) => v.buffer),
    fetchBlobBuffer(person.eidFrontBlobUrl).then((v) => v.buffer),
    fetchBlobBuffer(person.eidBackBlobUrl).then((v) => v.buffer),
  ]);

  const [photo, passport, eidFront, eidBack] = await Promise.all([
    normalizeImageToPng(photoRaw),
    normalizeImageToPng(passportRaw),
    normalizeImageToPng(eidFrontRaw),
    normalizeImageToPng(eidBackRaw),
  ]);

  const pdfDoc = await PDFDocument.create();

  const page1 = pdfDoc.addPage([595.28, 841.89]); // A4
  const img1 = await embedPng(pdfDoc, photo.data);
  const p1 = drawImageOnPage(page1.getWidth(), page1.getHeight(), photo.width, photo.height);
  page1.drawImage(img1, p1);

  const page2 = pdfDoc.addPage([595.28, 841.89]);
  const img2 = await embedPng(pdfDoc, passport.data);
  const p2 = drawImageOnPage(page2.getWidth(), page2.getHeight(), passport.width, passport.height);
  page2.drawImage(img2, p2);

  const page3 = pdfDoc.addPage([595.28, 841.89]);
  const frontImage = await embedPng(pdfDoc, eidFront.data);
  const backImage = await embedPng(pdfDoc, eidBack.data);
  const margin = 24;
  const gap = 16;
  const availableWidth = page3.getWidth() - margin * 2;
  const boxWidth = (availableWidth - gap) / 2;
  const boxHeight = page3.getHeight() - margin * 2;

  const frontScale = Math.min(boxWidth / eidFront.width, boxHeight / eidFront.height);
  const frontWidth = eidFront.width * frontScale;
  const frontHeight = eidFront.height * frontScale;
  const backScale = Math.min(boxWidth / eidBack.width, boxHeight / eidBack.height);
  const backWidth = eidBack.width * backScale;
  const backHeight = eidBack.height * backScale;

  page3.drawImage(frontImage, {
    x: margin + (boxWidth - frontWidth) / 2,
    y: (page3.getHeight() - frontHeight) / 2,
    width: frontWidth,
    height: frontHeight,
  });

  page3.drawImage(backImage, {
    x: margin + boxWidth + gap + (boxWidth - backWidth) / 2,
    y: (page3.getHeight() - backHeight) / 2,
    width: backWidth,
    height: backHeight,
  });

  const pdfBytes = await pdfDoc.save();
  const filename = `${makePersonFileBase(person.firstName, person.lastName)}.pdf`;
  const pathname = `generated/pdfs/${person.id}/${filename}`;

  const uploaded = await uploadBufferToBlob({
    pathname,
    contentType: "application/pdf",
    body: Buffer.from(pdfBytes),
  });

  return {
    pathname: uploaded.pathname,
    url: uploaded.url,
    downloadUrl: uploaded.downloadUrl,
    filename,
  };
}

export async function generatePersonPdf(personId: string) {
  const result = await createPdfForPerson({ id: personId });
  await prisma.person.update({
    where: { id: personId },
    data: {
      pdfBlobKey: result.pathname,
      pdfBlobUrl: result.url
    }
  });
  return result;
}
