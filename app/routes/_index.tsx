import type { MetaFunction } from "@remix-run/node";
import { useState } from "react";
import { ClientOnly } from "remix-utils/client-only";
import MapComponent from "~/components/MapComponent";
import { AppSidebar } from "~/components/app-sidebar";
import { SidebarProvider, SidebarInset } from "~/components/ui/sidebar";

export const meta: MetaFunction = () => {
  return [
    { title: "Geo Map App" },
    { name: "description", content: "Interactive map with multiple layers" },
  ];
};

export default function Index() {
  const [isInsetVariant, setIsInsetVariant] = useState(true);

  return (
    <SidebarProvider 
      defaultOpen={false}
      style={
        {
          "--header-height": "calc(var(--spacing) * 20)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant={isInsetVariant ? "inset" : "sidebar"} />
              <SidebarInset className={isInsetVariant ? "rounded-lg shadow-lg m-2 ml-0 overflow-hidden" : ""}>
          <div className={`relative ${isInsetVariant ? "h-[calc(100vh-1rem)]" : "h-screen"}`}>
          <ClientOnly fallback={<div className="h-screen w-full bg-gray-100 flex items-center justify-center">Loading map...</div>}>
            {() => <MapComponent isInsetVariant={isInsetVariant} setIsInsetVariant={setIsInsetVariant} />}
          </ClientOnly>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}


