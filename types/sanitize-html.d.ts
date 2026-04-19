declare module "sanitize-html" {
  const sanitizeHtml: {
    (dirty: string, options?: Record<string, unknown>): string;
    defaults: {
      allowedTags: string[];
      allowedAttributes: Record<string, string[]>;
    };
  };

  export default sanitizeHtml;
}
