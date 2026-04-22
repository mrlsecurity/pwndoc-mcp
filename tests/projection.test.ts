import { describe, it, expect } from "vitest";
import { project, projectMany, DEFAULT_FINDING_FIELDS } from "../src/lib/projection.js";

describe("project", () => {
  const finding = {
    _id: "f1",
    identifier: 1,
    title: "SQLi",
    status: 1,
    description: "long body...",
    cvssv3: "AV:N/AC:L",
    customFields: [{ a: 1 }],
  };

  it("returns full object when no fields given", () => {
    expect(project(finding)).toEqual(finding);
  });

  it("projects only requested fields", () => {
    expect(project(finding, ["_id", "title"])).toEqual({ _id: "f1", title: "SQLi" });
  });

  it("ignores fields not present", () => {
    expect(project(finding, ["title", "doesNotExist"])).toEqual({ title: "SQLi" });
  });

  it("projects array with projectMany", () => {
    const arr = [finding, { ...finding, _id: "f2", title: "XSS" }];
    expect(projectMany(arr, ["_id", "title"])).toEqual([
      { _id: "f1", title: "SQLi" },
      { _id: "f2", title: "XSS" },
    ]);
  });

  it("default finding fields strips bodies", () => {
    const out = project(finding, DEFAULT_FINDING_FIELDS);
    expect(out).not.toHaveProperty("description");
    expect(out).not.toHaveProperty("customFields");
    expect(out).toHaveProperty("title");
  });
});
