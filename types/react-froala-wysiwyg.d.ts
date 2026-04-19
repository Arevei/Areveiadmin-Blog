declare module "react-froala-wysiwyg" {
  import { ComponentType } from "react";

  type FroalaProps = {
    tag?: string;
    model?: string;
    config?: Record<string, unknown>;
    onModelChange?: (value: string) => void;
  };

  const FroalaEditorComponent: ComponentType<FroalaProps>;
  export default FroalaEditorComponent;
}
