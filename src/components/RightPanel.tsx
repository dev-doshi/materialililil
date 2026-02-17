"use client";

import React from "react";
import { useAppStore } from "@/store/appStore";
import { cn } from "@/lib/utils";
import { SlidersHorizontal, Sparkles, Wand2, Eye } from "lucide-react";
import MapAdjustments from "./MapAdjustments";
import Histogram from "./Histogram";
import ChannelViewer from "./ChannelViewer";
import ColorPicker from "./ColorPicker";
import BeforeAfterSlider from "./BeforeAfterSlider";
import TilingPreview from "./TilingPreview";
import MapParamsCopyPaste from "./MapParamsCopyPaste";
import QuickGenerate from "./QuickGenerate";
import MeasurementTool from "./MeasurementTool";
import GenerationStatus from "./GenerationStatus";
import ImageInfoPanel from "./ImageInfoPanel";
import MapMiniGrid from "./MapMiniGrid";
import ProfessionalTools from "./ProfessionalTools";
import TexturePresets from "./TexturePresets";
import PBRValidation from "./PBRValidation";

type TabId = "adjustments" | "generate" | "effects" | "inspect";

export default function RightPanel() {
  const rightPanelTab = useAppStore((s) => s.rightPanelTab) as TabId;
  const setRightPanelTab = useAppStore((s) => s.setRightPanelTab);

  const tabs = [
    { id: "adjustments" as const, label: "Adjust", icon: SlidersHorizontal, tip: "Tweak parameters for each map type" },
    { id: "generate" as const, label: "Generate", icon: Sparkles, tip: "Material presets, quick generate, batch operations" },
    { id: "effects" as const, label: "Effects", icon: Wand2, tip: "Image processing, filters, color correction" },
    { id: "inspect" as const, label: "Inspect", icon: Eye, tip: "Histogram, channels, color picker, measurements" },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex items-center border-b border-zinc-800 px-0.5 gap-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setRightPanelTab(tab.id)}
            className={cn(
              "flex items-center gap-1 px-2 py-2.5 text-[11px] font-medium transition-colors border-b-2 flex-1 justify-center",
              rightPanelTab === tab.id
                ? "border-amber-500 text-zinc-200"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            )}
            title={tab.tip}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {rightPanelTab === "adjustments" && (
          <div className="flex flex-col h-full">
            <MapAdjustments />
          </div>
        )}

        {rightPanelTab === "generate" && (
          <div className="p-3 space-y-4">
            <TexturePresets />
            <div className="border-t border-zinc-800" />
            <QuickGenerate />
          </div>
        )}

        {rightPanelTab === "effects" && (
          <div className="p-2.5 space-y-3">
            <MapParamsCopyPaste />
            <div className="border-t border-zinc-800" />
            <ProfessionalTools />
          </div>
        )}

        {rightPanelTab === "inspect" && (
          <div className="p-3 space-y-4">
            <PBRValidation />
            <div className="border-t border-zinc-800" />
            <Histogram />
            <div className="border-t border-zinc-800" />
            <ChannelViewer />
            <div className="border-t border-zinc-800" />
            <BeforeAfterSlider />
            <div className="border-t border-zinc-800" />
            <ColorPicker />
            <div className="border-t border-zinc-800" />
            <MeasurementTool />
            <div className="border-t border-zinc-800" />
            <ImageInfoPanel />
            <div className="border-t border-zinc-800" />
            <GenerationStatus />
            <div className="border-t border-zinc-800" />
            <MapMiniGrid />
            <div className="border-t border-zinc-800" />
            <TilingPreview />
          </div>
        )}
      </div>
    </div>
  );
}

