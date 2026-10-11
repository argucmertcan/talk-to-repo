export interface RepoFile {
  path: string;
  content: string;
  lines: number;
  ext: string;
}

export interface Repo {
  name: string;
  files: RepoFile[];
}
