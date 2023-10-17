import { useRef } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

export function PhotosSelectView({ defaultValue }: { defaultValue: string }) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef}>
      <Select
        defaultValue={defaultValue}
        name="view"
        onValueChange={() => formRef?.current?.requestSubmit()}
      >
        <SelectTrigger className="w-24">
          <SelectValue placeholder="View" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="grid">Grid</SelectItem>
          <SelectItem value="list">List</SelectItem>
        </SelectContent>
      </Select>
    </form>
  );
}
