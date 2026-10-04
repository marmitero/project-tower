import { describe, expect, it } from "vitest";
import { HERO_ROSTER, classes, identitiesForClass } from "@tia/config";
import { engineSkillsFor } from "../state.js";

describe("Clérigo e skill de assinatura (ADR-038)", () => {
  it("o Clérigo é a 5ª classe e tem 5 identidades, todas com atlas próprio", () => {
    expect(classes.map((c) => c.id)).toContain("cleric");
    const ids = identitiesForClass("cleric");
    expect(ids).toHaveLength(5);
    for (const h of ids) expect(h.assets?.atlas, h.id).toMatch(/^heroes\/cleric_/);
  });

  it("cada herói leva UMA skill ativa — a assinatura da identidade, ou a da classe", () => {
    for (const h of HERO_ROSTER) {
      const list = engineSkillsFor(h.classId, h.id);
      expect(list, h.id).toHaveLength(1);
      if (h.signatureSkillId) expect(list[0]!.id, h.id).toBe(h.signatureSkillId);
    }
    const bySig = new Set(identitiesForClass("cleric").map((h) => engineSkillsFor("cleric", h.id)[0]!.id));
    expect(bySig.size).toBeGreaterThanOrEqual(4);
  });

  it("sem identidade, vale a ativa da classe; a cura passa para o motor com limiar", () => {
    const [s] = engineSkillsFor("cleric");
    expect(s!.id).toBe("skill_cure");
    expect(s!.heal?.thresholdFraction).toBeGreaterThan(0);
    expect(s!.heal?.thresholdFraction).toBeLessThanOrEqual(1);
  });
});
