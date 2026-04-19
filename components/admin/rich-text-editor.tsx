"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const FroalaEditor = dynamic(() => import("react-froala-wysiwyg"), {
  ssr: false,
  loading: () => (
    <div className="rounded-[1.4rem] border border-[#14261d]/12 bg-white/70 px-4 py-6 text-sm text-[#647267]">
      Loading Froala editor...
    </div>
  ),
});

type RichTextEditorProps = {
  value: string;
  onChange: (value: string) => void;
};

export function RichTextEditor({ value, onChange }: RichTextEditorProps) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    import("froala-editor/js/plugins.pkgd.min.js").then(() => {
      if (mounted) {
        setReady(true);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  if (!ready) {
    return (
      <div className="rounded-[1.4rem] border border-[#14261d]/12 bg-white/70 px-4 py-6 text-sm text-[#647267]">
        Preparing Froala...
      </div>
    );
  }

  return (
    <FroalaEditor
      tag="textarea"
      model={value}
      onModelChange={onChange}
      config={{
        key: process.env.NEXT_PUBLIC_FROALA_LICENSE_KEY || undefined,
        placeholderText: "Design the full blog post here...",
        charCounterCount: false,
        heightMin: 340,
        quickInsertEnabled: false,
        toolbarSticky: false,
        imageInsertButtons: ["imageUpload", "imageByURL"],
        imageUploadURL: "/api/uploads/images",
        imageUploadMethod: "POST",
        imageUploadParam: "file",
        imageUploadParams: {
          folder: "arevei/blog/editor",
        },
        imageAllowedTypes: ["jpeg", "jpg", "png", "gif", "webp"],
        imageMaxSize: 10 * 1024 * 1024,
        linkAlwaysBlank: true,
        toolbarButtons: [
          "bold",
          "italic",
          "underline",
          "strikeThrough",
          "|",
          "formatOL",
          "formatUL",
          "outdent",
          "indent",
          "|",
          "alignLeft",
          "alignCenter",
          "alignRight",
          "|",
          "insertLink",
          "insertImage",
          "insertTable",
          "quote",
          "|",
          "undo",
          "redo",
          "html",
        ],
      }}
    />
  );
}
