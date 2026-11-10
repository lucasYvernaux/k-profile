import { describe, expect, it } from "vitest";
import {
  choiceFromLink, createsAncestryCycle, kinshipWord, linkFromChoice, relationsTo, type KinLink, type Step,
} from "@/features/network/domain/kinship";
import { assignGenerations, familyGroups, familyOf, layoutFamilyTree, TREE_NODE } from "@/features/network/domain/family-tree";
import { interestColor, interestKey, uniqueInterestNames } from "@/features/network/domain/interests";
import { coldSchema, createPersonSchema, linkSchema, personSchema } from "@/features/network/network.schemas";

const path = (s: string) => s.split("") as Step[];

/*
 *            Pierre ═ Marie            (grands-parents)
 *           ┌──────┴──────┐
 *   Moi's   Paul ═ Julie     Anne ═ Marc   (Anne: tante)
 *     ┌──────┴─────┐            │
 *    Moi ═ Léa    Tom          Zoé        (Zoé: cousine)
 *     │
 *    Noé
 */
const P = { pierre: 1, marie: 2, paul: 3, julie: 4, anne: 5, marc: 6, moi: 7, lea: 8, tom: 9, zoe: 10, noe: 11, ami: 12 };
const people = [
  { id: P.pierre, gender: "homme" }, { id: P.marie, gender: "femme" }, { id: P.paul, gender: "homme" },
  { id: P.julie, gender: "femme" }, { id: P.anne, gender: "femme" }, { id: P.marc, gender: "homme" },
  { id: P.moi, gender: "homme" }, { id: P.lea, gender: "femme" }, { id: P.tom, gender: "homme" },
  { id: P.zoe, gender: "femme" }, { id: P.noe, gender: "homme" }, { id: P.ami, gender: "homme" },
];
const links: KinLink[] = [
  { id: 1, aId: P.pierre, bId: P.marie, kind: "marie" },
  { id: 2, aId: P.pierre, bId: P.paul, kind: "parent" },
  { id: 3, aId: P.marie, bId: P.paul, kind: "parent" },
  { id: 4, aId: P.pierre, bId: P.anne, kind: "parent" },
  { id: 5, aId: P.marie, bId: P.anne, kind: "parent" },
  { id: 6, aId: P.paul, bId: P.julie, kind: "marie" },
  { id: 7, aId: P.anne, bId: P.marc, kind: "couple" },
  { id: 8, aId: P.paul, bId: P.moi, kind: "parent" },
  { id: 9, aId: P.julie, bId: P.moi, kind: "parent" },
  { id: 10, aId: P.paul, bId: P.tom, kind: "parent" },
  { id: 11, aId: P.julie, bId: P.tom, kind: "parent" },
  { id: 12, aId: P.anne, bId: P.zoe, kind: "parent" },
  { id: 13, aId: P.moi, bId: P.lea, kind: "pacse" },
  { id: 14, aId: P.moi, bId: P.noe, kind: "parent" },
  { id: 15, aId: P.moi, bId: P.ami, kind: "amis" },
];

describe("kinship words", () => {
  it.each([
    ["U", "femme", "Mère"],
    ["UU", "homme", "Grand-père"],
    ["UUU", "femme", "Arrière-grand-mère"],
    ["UUUU", "homme", "Arrière-arrière-grand-père"],
    ["D", "femme", "Fille"],
    ["DD", "femme", "Petite-fille"],
    ["DDD", "homme", "Arrière-petit-fils"],
    ["UD", "femme", "Sœur"],
    ["UUD", "femme", "Tante"],
    ["UUUD", "homme", "Grand-oncle"],
    ["UDD", "femme", "Nièce"],
    ["UDDD", "homme", "Petit-neveu"],
    ["UUDD", "femme", "Cousine germaine"],
    ["UUUDDD", "homme", "Cousin issu de germain"],
    ["UUDDD", "homme", "Petit-cousin"],
    ["P", "femme", "Conjointe"],
    ["X", "homme", "Ex"],
    ["PU", "femme", "Belle-mère"],
    ["UP", "homme", "Beau-père"],
    ["PUD", "femme", "Belle-sœur"],
    ["UDP", "homme", "Beau-frère"],
    ["DP", "homme", "Gendre"],
    ["PD", "homme", "Beau-fils"],
    ["XU", "femme", "Ex-belle-mère"],
    ["DU", "femme", "Conjointe"], // co-parent
    ["UUDP", "homme", "Oncle par alliance"],
  ])("%s (%s) → %s", (steps, gender, expected) => {
    expect(kinshipWord(path(steps), gender)).toBe(expected);
  });

  it("uses neutral words when the gender is unknown", () => {
    expect(kinshipWord(path("U"), null)).toBe("Parent");
    expect(kinshipWord(path("UUDD"), null)).toBe("Cousin·e germain·e");
  });

  it("gives up on paths it cannot name", () => {
    expect(kinshipWord(path("UPPD"), "homme")).toBeNull();
  });
});

describe("relationsTo", () => {
  const rel = relationsTo(P.moi, people, links);

  it("derives family relations through the tree", () => {
    expect(rel.get(P.paul)).toBe("Père");
    expect(rel.get(P.marie)).toBe("Grand-mère");
    expect(rel.get(P.tom)).toBe("Frère");
    expect(rel.get(P.anne)).toBe("Tante");
    expect(rel.get(P.marc)).toBe("Oncle par alliance");
    expect(rel.get(P.zoe)).toBe("Cousine germaine");
    expect(rel.get(P.noe)).toBe("Fils");
  });

  it("recognises half-siblings and step-siblings", () => {
    const sylvie = 20;
    const ines = 21;
    const blended = [
      ...links,
      { aId: P.paul, bId: sylvie, kind: "marie" },
      { aId: P.paul, bId: ines, kind: "parent" },
      { aId: sylvie, bId: ines, kind: "parent" },
    ];
    const rel = relationsTo(P.moi, [...people, { id: ines, gender: "femme" }], blended);
    expect(rel.get(ines)).toBe("Demi-sœur");
    expect(rel.get(P.tom)).toBe("Frère");
    expect(kinshipWord(path("UPD"), "homme")).toBe("Quasi-frère");
  });

  it("prefers the direct link word, including social ones", () => {
    expect(rel.get(P.lea)).toBe("Partenaire de PACS");
    expect(rel.get(P.ami)).toBe("Ami");
  });

  it("is computed from anyone's point of view", () => {
    const fromZoe = relationsTo(P.zoe, people, links);
    expect(fromZoe.get(P.moi)).toBe("Cousin germain");
    expect(fromZoe.get(P.paul)).toBe("Oncle");
    expect(fromZoe.get(P.noe)).toBe("Petit-cousin");
  });
});

describe("link direction in forms", () => {
  it("stores 'the other is my mother' with the mother as aId", () => {
    expect(linkFromChoice(P.moi, P.julie, "parent:up")).toEqual({ aId: P.julie, bId: P.moi, kind: "parent" });
    expect(linkFromChoice(P.moi, P.noe, "parent:down")).toEqual({ aId: P.moi, bId: P.noe, kind: "parent" });
    expect(linkFromChoice(P.moi, P.ami, "amis")).toEqual({ aId: P.moi, bId: P.ami, kind: "amis" });
  });

  it("round-trips through choiceFromLink", () => {
    expect(choiceFromLink(links[8], P.moi)).toBe("parent:up");
    expect(choiceFromLink(links[8], P.julie)).toBe("parent:down");
    expect(choiceFromLink(links[12], P.lea)).toBe("pacse");
  });
});

describe("ancestry cycles", () => {
  it("refuses making someone their own ancestor", () => {
    expect(createsAncestryCycle(links, P.noe, P.pierre)).toBe(true); // Noé parent of his great-grandfather
    expect(createsAncestryCycle(links, P.moi, P.moi)).toBe(true);
    expect(createsAncestryCycle(links, P.pierre, P.zoe)).toBe(false);
  });

  it("ignores the link being replaced", () => {
    // reversing Paul → Moi into Moi → Paul is a cycle only through other links
    expect(createsAncestryCycle(links, P.moi, P.paul)).toBe(false);
    expect(createsAncestryCycle(links, P.moi, P.pierre)).toBe(true);
  });
});

describe("family tree layout", () => {
  it("keeps friends out of the family", () => {
    const family = familyOf(P.moi, links);
    expect(family.has(P.ami)).toBe(false);
    expect(family.size).toBe(11);
    expect(familyGroups([P.moi, P.ami], links)).toHaveLength(1);
  });

  it("assigns generations from the links", () => {
    const gen = assignGenerations(P.moi, familyOf(P.moi, links), links);
    expect(gen.get(P.pierre)).toBe(0);
    expect(gen.get(P.paul)).toBe(1);
    expect(gen.get(P.marc)).toBe(1);
    expect(gen.get(P.moi)).toBe(2);
    expect(gen.get(P.zoe)).toBe(2);
    expect(gen.get(P.noe)).toBe(3);
  });

  it("places parents above their children, partners side by side, without overlap", () => {
    const tree = layoutFamilyTree(P.moi, links);
    const node = (id: number) => tree.nodes.get(id)!;
    expect(node(P.paul).y).toBeLessThan(node(P.moi).y);
    expect(Math.abs(node(P.paul).x - node(P.julie).x)).toBe(TREE_NODE.width + TREE_NODE.partnerGap);

    const rows = new Map<number, number[]>();
    tree.nodes.forEach((n) => rows.set(n.y, [...(rows.get(n.y) ?? []), n.x]));
    rows.forEach((xs) => {
      xs.sort((a, b) => a - b);
      for (let i = 1; i < xs.length; i++) expect(xs[i] - xs[i - 1]).toBeGreaterThanOrEqual(TREE_NODE.width + TREE_NODE.gap - 0.001);
    });

    const kids = tree.childGroups.find((g) => g.parentIds.includes(P.paul) && g.parentIds.includes(P.julie))!;
    expect(kids.children.map((c) => c.id).sort()).toEqual([P.moi, P.tom].sort());
    expect(tree.partners.some((p) => p.kind === "pacse")).toBe(true);
  });

  it("survives inconsistent data (a sibling also marked as parent)", () => {
    const broken = [...links, { id: 99, aId: P.tom, bId: P.moi, kind: "cousin" }];
    expect(() => layoutFamilyTree(P.moi, broken)).not.toThrow();
  });
});

describe("interests", () => {
  it("matches names without case, accents or extra spaces", () => {
    expect(interestKey("  Mangàs   Shōnen ")).toBe("mangas shonen");
    expect(uniqueInterestNames(["mangas", "Mangas", " ", "escalade"])).toEqual(["Mangas", "Escalade"]);
  });

  it("derives a stable colour unless one is set", () => {
    expect(interestColor({ key: "mangas", color: null })).toBe(interestColor({ key: "mangas", color: null }));
    expect(interestColor({ key: "mangas", color: "#123456" })).toBe("#123456");
  });

  it("shows the former amber in the gold of the palette", () => {
    expect(interestColor({ key: "mangas", color: "#F59E0B" })).toBe("#d4af37");
  });
});

describe("network schemas", () => {
  it("accepts the new person fields and normalises empty values", () => {
    const parsed = personSchema.parse({ firstName: "Zoé", gender: "", coldSince: "", deceased: false, interests: ["Mangas"] });
    expect(parsed).toMatchObject({ gender: null, coldSince: null, interests: ["Mangas"] });
  });

  it("only accepts isSelf at creation", () => {
    expect(createPersonSchema.parse({ firstName: "Moi", isSelf: true }).isSelf).toBe(true);
    expect(personSchema.parse({ firstName: "Moi", isSelf: true })).not.toHaveProperty("isSelf");
  });

  it("rejects unknown genders, link kinds and over-long reasons", () => {
    expect(personSchema.safeParse({ firstName: "A", gender: "robot" }).success).toBe(false);
    expect(linkSchema.safeParse({ aId: 1, bId: 2, kind: "nemesis" }).success).toBe(false);
    expect(coldSchema.safeParse({ personId: 1, cold: true, reason: "x".repeat(501) }).success).toBe(false);
  });
});
