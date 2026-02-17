'use client';

import { useAppStore } from '@/store/appStore';
import TopBar from '@/components/TopBar';
import MapList from '@/components/MapList';
import RightPanel from '@/components/RightPanel';
import Viewport2D from '@/components/Viewport2D';
import MapThumbnailStrip from '@/components/MapThumbnailStrip';
import MapComparisonGrid from '@/components/MapComparisonGrid';
import TilingPreview from '@/components/TilingPreview';
import UploadZone from '@/components/UploadZone';
import { useKeyboardShortcuts } from '@/components/KeyboardShortcuts';
import ToastContainer from '@/components/ToastContainer';
import LegalNotice from '@/components/LegalNotice';
import UpdateStatus from '@/components/UpdateStatus';
import dynamic from 'next/dynamic';

const DynamicViewport3D = dynamic(() => import('@/components/Viewport3D'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center w-full h-full bg-zinc-900">
      <div className="text-zinc-500">Loading 3D Viewer...</div>
    </div>
  ),
});

export default function Home() {
  const sourceImage = useAppStore((s) => s.sourceImage);
  const viewMode = useAppStore((s) => s.viewMode);
  const leftPanelOpen = useAppStore((s) => s.leftPanelOpen);
  const rightPanelOpen = useAppStore((s) => s.rightPanelOpen);
  const bottomPanelTab = useAppStore((s) => s.bottomPanelTab);
  const setBottomPanelTab = useAppStore((s) => s.setBottomPanelTab);

  useKeyboardShortcuts();

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-zinc-950 text-zinc-100">
      <TopBar />

      {!sourceImage ? (
        <div className="flex-1 flex items-center justify-center bg-zinc-950">
          <UploadZone />
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - Map List */}
          {leftPanelOpen && (
            <aside className="w-64 flex-shrink-0 border-r border-zinc-800/60 overflow-y-auto bg-zinc-950/95">
              <MapList />
            </aside>
          )}

          {/* Center - Viewport */}
          <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-zinc-950">
            <div className="flex-1 relative overflow-hidden">
              {viewMode === '2d' ? (
                <Viewport2D />
              ) : viewMode === '3d' ? (
                <DynamicViewport3D />
              ) : (
                <MapComparisonGrid />
              )}
            </div>

            {/* Bottom Panel with Tabs */}
            <div className="border-t border-zinc-800/60">
              <div className="flex items-center gap-1 px-2 pt-1 bg-zinc-950">
                {(["thumbnails", "tiling"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setBottomPanelTab(tab)}
                    className={`text-[10px] px-2.5 py-1 rounded-t font-medium transition-colors capitalize ${
                      bottomPanelTab === tab
                        ? "bg-zinc-900 text-zinc-200 border-t border-x border-zinc-700/50"
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    {tab === "thumbnails" ? "Maps" : "Tile Preview"}
                  </button>
                ))}
              </div>
              {bottomPanelTab === "thumbnails" && <MapThumbnailStrip />}
              {bottomPanelTab === "tiling" && (
                <div className="bg-zinc-900/50 p-2">
                  <TilingPreview />
                </div>
              )}
            </div>
          </main>

          {/* Right Panel - Tools & Adjustments */}
          {rightPanelOpen && (
            <aside className="w-80 flex-shrink-0 border-l border-zinc-800/60 overflow-hidden bg-zinc-950/95">
              <RightPanel />
            </aside>
          )}
        </div>
      )}
      <ToastContainer />
      <LegalNotice />
      <UpdateStatus />
    </div>
  );
}
