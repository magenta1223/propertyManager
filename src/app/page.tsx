// c:\propertyManager\property_manager\src\app\page.tsx
import Sidebar from "@/components/Sidebar";
import Map from "@/components/Map";

export default function Home() {
    return (
        <div className="flex h-screen">
            <Sidebar />
            <main className="flex-1 p-4">
                <h1 className="text-2xl font-bold mb-4">Map View</h1>
                <div className="w-full h-full bg-gray-200">
                    <Map />
                </div>
            </main>
        </div>
    );
}
