import { MediaView } from "@/components/media/media-view";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SidebarInset } from "@/components/ui/sidebar";

export default function MediaPage() {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <AppSidebar />
      <SidebarInset className="flex-1 overflow-y-auto">
        <MediaView />
      </SidebarInset>
    </div>
  );
}
