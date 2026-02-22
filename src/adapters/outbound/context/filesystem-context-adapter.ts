import { readFile, readdir } from 'fs/promises';
import { join } from 'path';
import type { IAgentContextPort, AgentContext } from '../../../application/ports/IAgentContextPort';

const DEFAULT_DIR = join(process.cwd(), 'agent-context');

async function readDirFiles(dir: string): Promise<string[]> {
  try {
    const names = await readdir(dir);
    const out: string[] = [];
    for (const name of names) {
      if (name.startsWith('.') || !/\.(md|txt)$/i.test(name)) continue;
      const path = join(dir, name);
      const content = await readFile(path, 'utf-8').catch(() => '');
      out.push(`## ${name}\n${content}`);
    }
    return out;
  } catch {
    return [];
  }
}

export class FilesystemContextAdapter implements IAgentContextPort {
  constructor(private readonly baseDir: string = DEFAULT_DIR) {}

  async getContext(): Promise<AgentContext> {
    const rulesDir = join(this.baseDir, 'rules');
    const docsDir = join(this.baseDir, 'docs');
    const skillsDir = join(this.baseDir, 'skills');
    const [rulesList, docsList, skillsList] = await Promise.all([
      readDirFiles(rulesDir),
      readDirFiles(docsDir),
      readDirFiles(skillsDir),
    ]);
    return {
      rules: rulesList.join('\n\n') || 'Be concise and helpful.',
      docs: docsList,
      skills: skillsList,
    };
  }
}
