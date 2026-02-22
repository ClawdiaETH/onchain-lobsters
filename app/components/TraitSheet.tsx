import { MUTATIONS, SCENES, MARKINGS, EYES_LIST, CLAWS_LIST, ACCESSORIES } from "@/lib/renderer";
import type { Traits } from "@/lib/renderer";
import { SPECIAL_NAMES } from "@/lib/traits";

const MONO = "'Courier New',monospace";

function Pill({ label, value, color = "#C84820" }: { label: string; value: string; color?: string }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "6px 10px",
      background: "#050509",
      border: "1px solid #1A1A2E",
      marginBottom: 4,
      borderRadius: 3,
    }}>
      <span style={{
        fontSize: 11, color: "#8888A8",
        letterSpacing: "0.12em", fontFamily: MONO,
      }}>
        {label}
      </span>
      <span style={{
        fontSize: 11, color, letterSpacing: "0.08em",
        fontFamily: MONO, fontWeight: 600,
      }}>
        {value}
      </span>
    </div>
  );
}

export default function TraitSheet({ traits }: { traits: Traits }) {
  return (
    <div>
      {traits.special > 0 && (
        <Pill label="SPECIAL"   value={SPECIAL_NAMES[traits.special]}          color="#C8A020" />
      )}
      <Pill label="MUTATION"   value={MUTATIONS[traits.mutation]?.name ?? ""}  color="#C84820" />
      <Pill label="SCENE"      value={SCENES[traits.scene]?.name ?? ""}        color="#4A9ED0" />
      <Pill label="MARKING"    value={MARKINGS[traits.marking] ?? ""}          color="#C88040" />
      <Pill label="CLAWS"      value={CLAWS_LIST[traits.claws] ?? ""}          color="#50A868" />
      <Pill label="EYES"       value={EYES_LIST[traits.eyes] ?? ""}            color="#7090C8" />
      <Pill label="ACCESSORY"  value={ACCESSORIES[traits.accessory] ?? ""}     color="#B870A0" />
      {traits.brokenAntenna && (
        <Pill label="ANTENNA"  value="Broken"                                  color="#A060A0" />
      )}
    </div>
  );
}
