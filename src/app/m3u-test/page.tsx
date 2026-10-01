"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { M3uPlayerPopup } from "@/components/iptv/m3u-player-popup";

export default function M3uTestPage() {
  const [open, setOpen] = useState(true);
  return (
    <div className="p-8">
      <Button onClick={() => setOpen(true)}>Open M3U player</Button>
      <M3uPlayerPopup open={open} onOpenChange={setOpen} />
    </div>
  );
}
