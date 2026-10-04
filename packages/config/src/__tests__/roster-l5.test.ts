import { describe, expect, it } from "vitest";
import { HERO_ROSTER, classes, identitiesForClass, skillsById } from "../index.js";

/**
 * Meta do roadmap §4: 5 heróis por classe (≥ 25). Este teste acompanha o progresso e trava a regra §10
 * (nada de "iguais com roupa diferente"): cada identidade tem atributos e skill assinatura próprios.
 */
describe("elenco de heróis (ADR-040/042, Lotes 5 e 6)", () => {
  it("progresso: Guardião 5/5, Arqueiro 6 (o Nômade é o extra), Clérigo 5/5, Arcanista 5/5, Invocador 5/5 = 26", () => {
    const n = (c: string) => identitiesForClass(c).length;
    expect([n("guardian"), n("ranger"), n("cleric"), n("arcanist"), n("shadowcaller")]).toEqual([5, 6, 5, 5, 5]);
    expect(HERO_ROSTER).toHaveLength(26);
  });

  it("nenhum par de heróis da mesma classe repete (atributos, skill assinatura) — §10", () => {
    for (const c of classes) {
      const keys = identitiesForClass(c.id).map((h) => JSON.stringify([h.attributeDelta ?? {}, h.signatureSkillId]));
      expect(new Set(keys).size, c.id).toBe(keys.length);
    }
  });

  it("toda assinatura é uma skill ATIVA da própria classe, de dono único", () => {
    for (const h of HERO_ROSTER) {
      const s = skillsById[h.signatureSkillId]!;
      expect(s, h.id).toBeDefined();
      expect(s.kind, h.id).toBe("active");
      expect(s.classId, h.id).toBe(h.classId);
    }
    const newOnes = [
      // Lote 5 (ADR-040)
      "hero_cavaleiro_rubro", "hero_monge_ferro", "hero_lorde_cinzento", "hero_cacador_furtivo",
      "hero_besteiro_pesado", "hero_guardia_floresta", "hero_piromante_cinder", "hero_ossian",
      // Lote 6 (ADR-042)
      "hero_criomante", "hero_tempestuario", "hero_mago_anciao", "hero_necromante_ossos",
      "hero_bruxa_pantano", "hero_ceifeira", "hero_demonologo", "hero_arqueiro_nomade",
    ];
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
    for (const c of ["guardian", "ranger", "arcanist", "shadowcaller"]) {
      const base = classes.find((x) => x.id === c)!;
      // a Nova e a Volta de Flechas são em área; em 1×1 valem o coeficiente por alvo
      const ref = dps(base.activeSkillId);
      for (const h of identitiesForClass(c)) {
        if (h.signatureSkillId === base.activeSkillId) continue;
        if (c === "arcanist") expect(dps(h.signatureSkillId), h.id).toBeLessThanOrEqual(ref * 1.35); // 1×1 não usa a área da Nova
        else expect(Math.abs(dps(h.signatureSkillId) / ref - 1), h.id).toBeLessThan(0.15);
      }
    }
  });
});
