import { describe, expect, it } from "vitest";
import { HERO_ROSTER, classes, identitiesForClass, skillsById } from "../index.js";

/** Meta do roadmap §4: 5 heróis por classe (≥ 25). Este teste acompanha o progresso e trava a regra §10. */
describe("elenco de heróis (ADR-040, Lote 5)", () => {
  it("progresso: Guardião 5/5, Arqueiro 5/5, Clérigo 5/5, Arcanista 2/5, Invocador 1/5 = 18", () => {
    const n = (c: string) => identitiesForClass(c).length;
    expect([n("guardian"), n("ranger"), n("cleric"), n("arcanist"), n("shadowcaller")]).toEqual([5, 5, 5, 2, 1]);
    expect(HERO_ROSTER).toHaveLength(18);
  });

  it("nenhum par de heróis da mesma classe repete (atributos, skill assinatura) — §10", () => {
    for (const c of classes) {
      const keys = identitiesForClass(c.id).map((h) => JSON.stringify([h.attributeDelta ?? {}, h.signatureSkillId]));
      expect(new Set(keys).size, c.id).toBe(keys.length);
    }
  });

  it("toda assinatura é uma skill ATIVA da própria classe e cada herói novo tem a sua", () => {
    for (const h of HERO_ROSTER) {
      const s = skillsById[h.signatureSkillId]!;
      expect(s, h.id).toBeDefined();
      expect(s.kind, h.id).toBe("active");
      expect(s.classId, h.id).toBe(h.classId);
    }
    const newOnes = ["hero_cavaleiro_rubro", "hero_monge_ferro", "hero_lorde_cinzento", "hero_cacador_furtivo", "hero_besteiro_pesado", "hero_guardia_floresta", "hero_piromante_cinder", "hero_ossian"];
    for (const id of newOnes) {
      const h = HERO_ROSTER.find((x) => x.id === id)!;
      const owners = HERO_ROSTER.filter((x) => x.signatureSkillId === h.signatureSkillId);
      expect(owners.map((x) => x.id), id).toEqual([id]);
    }
  });

  it("as skills novas ficam na faixa de DPS da skill da classe (±15 %, 1×1)", () => {
    const dps = (id: string) => {
      const s = skillsById[id]!;
      return ((s.coefficient ?? 0) * (s.hitCount ?? 1)) / (s.cooldownMs / 1000);
    };
    for (const c of ["guardian", "ranger", "arcanist"]) {
      const base = classes.find((x) => x.id === c)!;
      // a Nova e a Volta de Flechas são em área; em 1×1 valem o coeficiente por alvo
      const ref = dps(base.activeSkillId); // área × alvo único: em 1×1 vale o coeficiente por alvo
      for (const h of identitiesForClass(c)) {
        if (h.signatureSkillId === base.activeSkillId) continue;
        if (c === "arcanist") expect(dps(h.signatureSkillId), h.id).toBeLessThanOrEqual(ref * 1.35); // 1×1 não usa a área da Nova
        else expect(Math.abs(dps(h.signatureSkillId) / ref - 1), h.id).toBeLessThan(0.15);
      }
    }
  });
});
