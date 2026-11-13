export interface FileNode {
  name: string;
  path: string;
  is_dir: boolean;
  children?: FileNode[];
}

export interface InitialTarget {
  path: string | null;
  is_directory: boolean;
  content: string | null;
  title: string;
}

export interface TocItem {
  id: string;
  text: string;
  level: number;
}

export type ThemeMode = "light" | "dark";

export interface FileUpdatePayload {
  path: string;
  content: string;
}
