import { describe, expect, it } from "vitest";
import { HERO_ROSTER } from "@tia/config";
import { heroCodex } from "../codex.js";
import { createHero } from "../creation.js";
import { asAccountId, asClassId } from "@tia/contracts";
import type { Hero } from "@tia/contracts";

const ACCOUNT = asAccountId("codex-account");

function owned(classId: string, name: string, rarity: Hero["rarity"]): Hero {
  return createHero({ accountId: ACCOUNT, classId: asClassId(classId), name, rarity, now: 0, index: 0, origin: "starter" });
}

describe("códice de heróis (§10 — deriva, nunca é salvo)", () => {
  it("com save vazio, todas as identidades do elenco aparecem bloqueadas com dica de aquisição", () => {
    const codex = heroCodex([]);
    expect(codex).toHaveLength(HERO_ROSTER.length);
    for (const entry of codex) {
      expect(entry.status).toBe("locked");
      expect(entry.hero).toBeNull();
      expect(entry.acquisitionHint.length).toBeGreaterThan(10);
    }
  });

  it("o herói possuído aparece como recrutado, sem dica", () => {
    const mine = owned("ranger", "Kaia", "uncommon");
    const codex = heroCodex([mine]);
    const kaia = codex.find((e) => e.identity.id === "hero_kaia")!;
    expect(kaia.status).toBe("owned");
    expect(kaia.hero).toBe(mine);
    expect(kaia.acquisitionHint).toBe("");
    expect(codex.filter((e) => e.status === "locked")).toHaveLength(HERO_ROSTER.length - 1);
  });

  it("a ordem do códice é a do catálogo (adendo ADR-024: todos incomuns)", () => {
    const codex = heroCodex([]);
    expect(codex.map((e) => e.identity.id)).toEqual(HERO_ROSTER.map((h) => h.id));
    expect(codex.every((e) => e.identity.rarity === "uncommon")).toBe(true);
  });

  it("ADR-033: o códice separa as variações da mesma classe pela identidade (sem identidade = a inicial)", () => {
    const borin = { ...owned("guardian", "Borin", "rare"), identityId: "hero_borin" };
    const codex = heroCodex([borin]);
    expect(codex.find((e) => e.identity.id === "hero_borin")!.status).toBe("owned");
    expect(codex.find((e) => e.identity.id === "hero_aldric")!.status).toBe("locked");
    const legacy = owned("guardian", "Aldric", "rare"); // sem identityId (save antigo)
    const old = heroCodex([legacy]);
    expect(old.find((e) => e.identity.id === "hero_aldric")!.status).toBe("owned");
    expect(old.find((e) => e.identity.id === "hero_borin")!.status).toBe("locked");
  });

  it("cada entrada carrega retrato do pack", () => {
    for (const entry of heroCodex([])) {
      expect(entry.portraitAssetId.startsWith("portraits/")).toBe(true);
    }
  });
});
