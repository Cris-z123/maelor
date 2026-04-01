import { randomUUID } from 'crypto';

import type { MvpRunDetail, MvpRunSummary, MvpValidationFile } from '@shared/types/mvp.js';

import { ConfigManager } from '../config/ConfigManager.js';

const RUNS_KEY = 'mvp.runs';
const OUTLOOK_DIRECTORY_KEY = 'mvp.outlook.directory';
const AI_BASE_URL_KEY = 'mvp.ai.baseUrl';
const AI_MODEL_KEY = 'mvp.ai.model';

export class RunRepository {
  static async listRuns(): Promise<MvpRunDetail[]> {
    const config = await ConfigManager.get([RUNS_KEY]);
    const runs = config[RUNS_KEY];

    if (typeof runs !== 'string') {
      return [];
    }

    try {
      const parsed = JSON.parse(runs) as unknown;
      return Array.isArray(parsed) ? (parsed as MvpRunDetail[]) : [];
    } catch {
      return [];
    }
  }

  static async saveRun(run: MvpRunDetail): Promise<void> {
    const runs = await this.listRuns();
    const nextRuns = [run, ...runs].slice(0, 20);
    await ConfigManager.set({ [RUNS_KEY]: JSON.stringify(nextRuns) });
  }

  static async clearRuns(): Promise<number> {
    const runs = await this.listRuns();
    await ConfigManager.set({ [RUNS_KEY]: JSON.stringify([]) });
    return runs.length;
  }

  static async getLatest(): Promise<MvpRunDetail | null> {
    const runs = await this.listRuns();
    return runs[0] ?? null;
  }

  static async getById(runId: string): Promise<MvpRunDetail | null> {
    const runs = await this.listRuns();
    return runs.find((run) => run.runId === runId) ?? null;
  }

  static async listRecent(limit = 20): Promise<MvpRunSummary[]> {
    const runs = await this.listRuns();
    return runs.slice(0, limit).map((run) => ({
      runId: run.runId,
      startedAt: run.startedAt,
      finishedAt: run.finishedAt,
      status: run.status,
      pstCount: run.pstCount,
      processedEmailCount: run.processedEmailCount,
      itemCount: run.itemCount,
      lowConfidenceCount: run.lowConfidenceCount,
    }));
  }

  static async createEmptyRun(pstFiles: MvpValidationFile[], outlookDirectory: string): Promise<MvpRunDetail> {
    const startedAt = Date.now();
    const readablePstCount = pstFiles.filter((file) => file.readability === 'readable').length;

    return {
      runId: randomUUID(),
      startedAt,
      finishedAt: Date.now(),
      status: 'completed',
      pstCount: readablePstCount,
      processedEmailCount: 0,
      itemCount: 0,
      lowConfidenceCount: 0,
      outlookDirectory,
      pstFiles,
      items: [],
      message:
        pstFiles.length > 0
          ? 'PST 发现已完成。扫描与提取链路会在后续任务中接入。'
          : '未发现 PST 文件。',
    };
  }

  static async getSettingsSeed(): Promise<{
    outlookDirectory: string;
    aiBaseUrl: string;
    aiModel: string;
  }> {
    const config = await ConfigManager.get([
      OUTLOOK_DIRECTORY_KEY,
      AI_BASE_URL_KEY,
      AI_MODEL_KEY,
    ]);

    return {
      outlookDirectory:
        typeof config[OUTLOOK_DIRECTORY_KEY] === 'string' ? (config[OUTLOOK_DIRECTORY_KEY] as string) : '',
      aiBaseUrl: typeof config[AI_BASE_URL_KEY] === 'string' ? (config[AI_BASE_URL_KEY] as string) : '',
      aiModel: typeof config[AI_MODEL_KEY] === 'string' ? (config[AI_MODEL_KEY] as string) : '',
    };
  }
}

export const MVP_CONFIG_KEYS = {
  runs: RUNS_KEY,
  outlookDirectory: OUTLOOK_DIRECTORY_KEY,
  aiBaseUrl: AI_BASE_URL_KEY,
  aiModel: AI_MODEL_KEY,
} as const;

export default RunRepository;
