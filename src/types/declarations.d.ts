declare module "markdown-it-task-lists" {
  import MarkdownIt from "markdown-it";
  const plugin: (md: MarkdownIt, options?: Record<string, unknown>) => void;
  export default plugin;
}
