import * as fs from "fs";
import * as path from "path";
import { PDFExtract } from "pdf.js-extract";
import { projectRoot } from "../constants";

const constantsDir = path.join(projectRoot, "src/constants");
const pdfFileName = "7a6ab7f1-7c29-4e8b-bdfa-57b4edbef9cb.pdf";
export const file = path.join(constantsDir, pdfFileName);

export async function extractTextFromPdf(filePath: string) {
  const pdfFile = path.resolve(filePath);

  // Ensure the constants directory exists
  try {
    if (!fs.existsSync(path.dirname(pdfFile))) {
      console.log(`Creating directory: ${path.dirname(pdfFile)}`);
      fs.mkdirSync(path.dirname(pdfFile), { recursive: true });
    }

    if (!fs.existsSync(pdfFile)) {
      throw new Error(`File not found: ${pdfFile}\nPlease place your PDF file at this location.`);
    }

    const pdfExtract = new PDFExtract();
    const options = {}; // default options

    const data = await pdfExtract.extract(pdfFile, options);

    let fullText = "";
    data.pages.forEach((page) => {
      page.content.forEach((item) => {
        if (item.str) {
          fullText += item.str + " ";
        }
      });
      fullText += "\n\n";
    });

    return fullText;
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error(`Error processing PDF: ${error.message}`);

      if ("code" in error && error.code === "ENOENT") {
        console.error(`Make sure the file exists at: ${pdfFile}`);
        console.error(`Current working directory: ${process.cwd()}`);
      }
    } else {
      console.error(`Error processing PDF:`, error);
    }

    throw error;
  }
}

// export async function indexPredefinedMenu() {
//   try {
//     console.log(`Indexing predefined menu from: ${file}`);
//     console.log(`(Full path: ${path.resolve(file)})`);

//     // Check if the constants directory exists
//     if (!fs.existsSync(constantsDir)) {
//       console.log(`Creating constants directory at: ${constantsDir}`);
//       fs.mkdirSync(constantsDir, { recursive: true });
//       console.error(`Please place your PDF file at: ${file}`);
//       throw new Error(`Constants directory created, but PDF file not found. Please add the PDF.`);
//     }

//     // Check if the PDF file exists
//     if (!fs.existsSync(file)) {
//       console.error(`PDF file not found at: ${file}`);
//       throw new Error(`PDF file not found. Please add the PDF to the constants directory.`);
//     }

//     await indexMenu(file);
//     console.log('Menu indexing completed');
//   } catch (error) {
//     console.error('Failed to index menu:', error);
//     throw error;
//   }
// }

// indexPredefinedMenu().catch(err => {
//   console.error('Failed to index menu:', err);
// });
