import * as pdfjsLib from 'pdfjs-dist';

// Access the library object correctly whether it's a default export or named exports
const pdfjs = (pdfjsLib as any).default || pdfjsLib;

// Set worker source for PDF.js
if (pdfjs.GlobalWorkerOptions) {
    pdfjs.GlobalWorkerOptions.workerSrc = 'https://esm.sh/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
}

export interface FileContext {
  name: string;
  content: string;
  type: string;
}

export const triggerFileSelect = (): Promise<File | null> => {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.txt,.md,.json,.js,.ts,.tsx';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0] || null;
      resolve(file);
    };
    input.click();
  });
};

const readPdf = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  // Use the resolved pdfjs object
  const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: any) => item.str).join(' ');
    fullText += `[Page ${i}]\n${pageText}\n\n`;
  }
  return fullText;
};

const readText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
};

export const processFile = async (file: File): Promise<FileContext> => {
  let content = '';
  if (file.type === 'application/pdf') {
    content = await readPdf(file);
  } else {
    content = await readText(file);
  }

  return {
    name: file.name,
    type: file.type,
    content: content.trim()
  };
};