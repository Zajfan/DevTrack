import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** GitHub-style Markdown. Raw HTML is never executed. */
export function MarkdownPreview({
  content,
  onLink,
}: {
  content: string;
  onLink?: (href: string) => void;
}) {
  return (
    <div className="markdown-document">
      <Markdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={{
          a: ({ href, children }) => (
            <a
              href={href}
              target={onLink ? undefined : "_blank"}
              rel="noreferrer"
              onClick={
                onLink && href
                  ? (e) => {
                      e.preventDefault();
                      onLink(href);
                    }
                  : undefined
              }
            >
              {children}
            </a>
          ),
          img: ({ alt }) => (
            <span className="markdown-image-alt">{alt ?? "Image"}</span>
          ),
          table: ({ children }) => (
            <div className="markdown-table-scroll">
              <table>{children}</table>
            </div>
          ),
        }}
      >
        {content}
      </Markdown>
    </div>
  );
}
