"use client";

import { useState } from "react";
import { NewContentDialog, NewContentTrigger } from "./new-content-dialog";

export function NewContentButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <NewContentTrigger onClick={() => setOpen(true)} />
      <NewContentDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
