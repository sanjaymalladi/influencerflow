// A simple tool to read a file.
// In a real scenario, you'd add PDF and DOCX parsing here.
import { Tool } from 'langchain/tools';
import * as fs from 'fs/promises';

export class FileReaderTool extends Tool {
  name = "File-Reader";
  description = "Reads the text content of a file. Input should be a file path.";

  async _call(filePath: string): Promise<string> {
    try {
      return await fs.readFile(filePath, 'utf-8');
    } catch (error) {
      console.error("Error reading file:", error);
      return "Error: Could not read file.";
    }
  }
} 