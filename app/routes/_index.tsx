import type { MetaFunction } from "@remix-run/node";
import { ClientOnly } from "remix-utils/client-only";
import MapComponent from "~/components/MapComponent";

export const meta: MetaFunction = () => {
  return [
    { title: "Geo Map App" },
    { name: "description", content: "Interactive map with multiple layers" },
  ];
};

export default function Index() {
  return (
    <ClientOnly fallback={<div className="h-screen w-full bg-gray-100 flex items-center justify-center">Loading map...</div>}>
      {() => <MapComponent />}
    </ClientOnly>
  );
}


