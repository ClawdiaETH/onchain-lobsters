import { MUTATIONS, SCENES, MARKINGS, EYES_LIST, CLAWS_LIST, ACCESSORIES } from "@/lib/renderer";
import type { Traits } from "@/lib/renderer";
import { SPECIAL_NAMES } from "@/lib/traits";

function Pill({ label, value, color = "#C84820" }: { label: string; value: string; color?: string }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "4px 8px", background: "#07070F", border: "1px solid #0e0e1c",
      marginBottom: 3, borderRadius: 2,
    }}>
      <span style={{ fontSize: 9, color: "#2a2a3a", letterSpacing: "0.14em", fontFamily: "'Courier New',monospace" }}>
        {label}
      </span>
      <span style={{ fontSize: 9, color, letterSpacing: "0.08em", fontFamily: "'Courier New',monospace" }}>
        {value}
      </span>
    </div>
  );
}

export default function TraitSheet({ traits }: { traits: Traits }) {
  return (
    <div>
      {traits.special > 0 && (
        <Pill label="SPECIAL" value={SPECIAL_NAMES[traits.special]} color="#C8A020" />
      )}
      <Pill label="MUTATION"  value={MUTATIONS[traits.mutation]?.name ?? ""}  color="#C84820" />
      <Pill label="SCENE"     value={SCENES[traits.scene]?.name ?? ""}        color="#1A5C8C" />
      <Pill label="MARKING"   value={MARKINGS[traits.marking] ?? ""}          color="#8A5028" />
      <Pill label="CLAWS"     value={CLAWS_LIST[traits.claws] ?? ""}          color="#1E5C30" />
      <Pill label="EYES"      value={EYES_LIST[traits.eyes] ?? ""}            color="#204870" />
      <Pill label="ACCESSORY" value={ACCESSORIES[traits.accessory] ?? ""}     color="#583818" />
      {traits.brokenAntenna && <Pill label="ANTENNA" value="Broken" color="#6A3A6A" />}
    </div>
  );
}
