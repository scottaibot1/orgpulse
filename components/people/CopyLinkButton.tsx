"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";

export default function CopyLinkButton({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button variant="outline" size="sm" onClick={handleCopy} className="gap-2">
      {copied ? (
        <><Check className="h-4 w-4 text-green-600" />Copied!</>
      ) : (
        <><Copy className="h-4 w-4" />Copy Submission Link</>
      )}
    </Button>
  );
}
