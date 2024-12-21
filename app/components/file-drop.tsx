import { DropZone, LegacyStack, Text, Thumbnail } from "@shopify/polaris";
import { NoteIcon } from "@shopify/polaris-icons";
import { useCallback } from "react";

type Props = {
  file: File | null;
  setFile: (file: File) => void;
};

export function FileDrop({ file, setFile }: Props) {
  const handleDropZoneDrop = useCallback(
    (_dropFiles: File[], acceptedFiles: File[], _rejectedFiles: File[]) =>
      setFile(acceptedFiles[0]),
    [setFile],
  );

  const validImageTypes = ["image/gif", "image/jpeg", "image/png"];

  const fileUpload = !file && <DropZone.FileUpload />;
  const uploadedFile = file && (
    <LegacyStack>
      <Thumbnail
        size="small"
        alt={file.name}
        source={
          validImageTypes.includes(file.type)
            ? window.URL.createObjectURL(file)
            : NoteIcon
        }
      />
      <div>
        {file.name}{" "}
        <Text variant="bodySm" as="p">
          {file.size} bytes
        </Text>
      </div>
    </LegacyStack>
  );

  return (
    <DropZone allowMultiple={false} onDrop={handleDropZoneDrop}>
      {uploadedFile}
      {fileUpload}
    </DropZone>
  );
}
