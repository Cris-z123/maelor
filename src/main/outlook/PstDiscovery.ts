import fs from 'fs';
import path from 'path';
import type { MvpValidationFile, MvpValidationResult } from '@shared/types/mvp.js';

function toValidationFile(filePath: string, readable: boolean, reason: string | null): MvpValidationFile {
  const stats = fs.statSync(filePath);

  return {
    path: filePath,
    fileName: path.basename(filePath),
    sizeBytes: stats.size,
    modifiedAt: stats.mtimeMs,
    readability: readable ? 'readable' : 'unreadable',
    reason,
  };
}

export class PstDiscovery {
  static findPstFiles(rootDirectory: string, maxDepth = 4): MvpValidationFile[] {
    const discovered: MvpValidationFile[] = [];

    const visit = (currentDirectory: string, depth: number): void => {
      if (depth > maxDepth) {
        return;
      }

      let entries: fs.Dirent[];
      try {
        entries = fs.readdirSync(currentDirectory, { withFileTypes: true });
      } catch (error) {
        discovered.push({
          path: currentDirectory,
          fileName: path.basename(currentDirectory),
          sizeBytes: 0,
          modifiedAt: Date.now(),
          readability: 'unreadable',
          reason: error instanceof Error ? error.message : 'Failed to read directory',
        });
        return;
      }

      for (const entry of entries) {
        const entryPath = path.join(currentDirectory, entry.name);

        if (entry.isDirectory()) {
          visit(entryPath, depth + 1);
          continue;
        }

        if (!entry.isFile() || path.extname(entry.name).toLowerCase() !== '.pst') {
          continue;
        }

        try {
          fs.accessSync(entryPath, fs.constants.R_OK);
          discovered.push(toValidationFile(entryPath, true, null));
        } catch (error) {
          discovered.push(
            toValidationFile(
              entryPath,
              false,
              error instanceof Error ? error.message : 'File is not readable'
            )
          );
        }
      }
    };

    visit(rootDirectory, 0);
    return discovered;
  }

  static validateDirectory(rootDirectory: string): MvpValidationResult {
    if (!rootDirectory) {
      return {
        valid: false,
        readablePstCount: 0,
        unreadablePstCount: 0,
        files: [],
        message: 'Select an Outlook data directory.',
      };
    }

    if (!fs.existsSync(rootDirectory)) {
      return {
        valid: false,
        readablePstCount: 0,
        unreadablePstCount: 0,
        files: [],
        message: 'The selected directory does not exist.',
      };
    }

    const stats = fs.statSync(rootDirectory);
    if (!stats.isDirectory()) {
      return {
        valid: false,
        readablePstCount: 0,
        unreadablePstCount: 0,
        files: [],
        message: 'The selected path is not a directory.',
      };
    }

    const files = this.findPstFiles(rootDirectory);
    const readablePstCount = files.filter((file) => file.readability === 'readable').length;
    const unreadablePstCount = files.length - readablePstCount;

    return {
      valid: readablePstCount > 0,
      readablePstCount,
      unreadablePstCount,
      files,
      message:
        readablePstCount > 0
          ? `Found ${readablePstCount} readable PST file(s).`
          : 'No readable PST files were found.',
    };
  }
}

export default PstDiscovery;
