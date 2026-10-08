import { describe, expect, it } from "vitest";
import {
  ageLabel,
  buildLinkIndex,
  daysSince,
  describeMeta,
  recencyOf,
  sizeLabel,
  statusKind,
  statusOf,
  type FileMeta,
} from "./meta";

// Local noon, so day arithmetic does not depend on the time zone the tests run in.
const at = (year: number, month: number, day: number, hour = 12): number =>
  new Date(year, month - 1, day, hour).getTime();
const NOW = at(2026, 10, 8);

describe("daysSince, recencyOf and ageLabel", () => {
  it("counts calendar days, so late last night is yesterday, not today", () => {
    expect(daysSince(at(2026, 10, 8, 0), NOW)).toBe(0);
    expect(daysSince(at(2026, 10, 7, 23), NOW)).toBe(1);
    expect(daysSince(at(2026, 10, 1), NOW)).toBe(7);
  });

  it("never goes negative for a file dated in the future", () => {
    expect(daysSince(at(2026, 10, 20), NOW)).toBe(0);
  });

  it("bands recency as today, week and older", () => {
    expect(recencyOf(at(2026, 10, 8, 1), NOW)).toBe("today");
    expect(recencyOf(at(2026, 10, 1), NOW)).toBe("week");
    expect(recencyOf(at(2026, 9, 30), NOW)).toBe("older");
  });

  it("words the age", () => {
    expect(ageLabel(at(2026, 10, 8, 3), NOW)).toBe("today");
    expect(ageLabel(at(2026, 10, 5), NOW)).toBe("3d ago");
  });
});

describe("sizeLabel", () => {
  it.each([
    [0, "0 B"],
    [999, "999 B"],
    [1024, "1.0 KB"],
    [1536, "1.5 KB"],
    [20 * 1024, "20 KB"],
    [1024 * 1024, "1.0 MB"],
    [25 * 1024 * 1024, "25 MB"],
  ])("writes %i bytes as %s", (bytes, label) => {
    expect(sizeLabel(bytes)).toBe(label);
  });
});

describe("statusKind", () => {
  it("recognises done and review ignoring case and spaces, and calls the rest other", () => {
    expect(statusKind("Done")).toBe("done");
    expect(statusKind(" review ")).toBe("review");
    expect(statusKind("draft")).toBe("other");
  });
});

describe("statusOf", () => {
  it("reads a string, a number and the first item of a list", () => {
    expect(statusOf({ status: "draft" }, "status")).toBe("draft");
    expect(statusOf({ status: 2 }, "status")).toBe("2");
    expect(statusOf({ status: ["review", "later"] }, "status")).toBe("review");
  });

  it("uses the property name it is given", () => {
    expect(statusOf({ state: "done" }, "state")).toBe("done");
    expect(statusOf({ state: "done" }, "status")).toBeNull();
  });

  it("returns null for missing, blank or unusable values", () => {
    expect(statusOf(undefined, "status")).toBeNull();
    expect(statusOf(null, "status")).toBeNull();
    expect(statusOf({}, "status")).toBeNull();
    expect(statusOf({ status: "  " }, "status")).toBeNull();
    expect(statusOf({ status: { nested: true } }, "status")).toBeNull();
    expect(statusOf({ status: true }, "status")).toBeNull();
    expect(statusOf({ status: "x" }, "")).toBeNull();
  });
});

describe("buildLinkIndex", () => {
  const index = buildLinkIndex({
    "a.md": { "b.md": 3, "c.md": 1 },
    "b.md": { "c.md": 2 },
    "c.md": {},
  });

  it("counts distinct outgoing links, not mentions", () => {
    expect(index.outgoing.get("a.md")).toBe(2);
    expect(index.outgoing.get("b.md")).toBe(1);
  });

  it("leaves files with no links out of the outgoing map", () => {
    expect(index.outgoing.has("c.md")).toBe(false);
  });

  it("counts distinct notes linking in", () => {
    expect(index.incoming.get("c.md")).toBe(2);
    expect(index.incoming.get("b.md")).toBe(1);
    expect(index.incoming.has("a.md")).toBe(false);
  });

  it("handles an empty vault", () => {
    const empty = buildLinkIndex({});
    expect(empty.outgoing.size).toBe(0);
    expect(empty.incoming.size).toBe(0);
  });
});

describe("describeMeta", () => {
  const meta: FileMeta = {
    mtime: at(2026, 10, 5),
    size: 2048,
    outgoing: 2,
    incoming: 3,
    tags: ["#plan", "#web"],
    status: "Review",
  };

  it("words every field", () => {
    expect(describeMeta(meta, NOW)).toEqual({
      recency: "week",
      age: "3d ago",
      size: "2.0 KB",
      links: 5,
      outgoing: 2,
      incoming: 3,
      tags: ["#plan", "#web"],
      status: "Review",
      statusKind: "review",
      modified: "5 Oct 2026",
    });
  });

  it("treats a missing status as other and keeps it null", () => {
    const display = describeMeta({ ...meta, status: null }, NOW);
    expect(display.status).toBeNull();
    expect(display.statusKind).toBe("other");
  });
});
