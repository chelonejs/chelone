import { describe, expect, it } from "vitest";
import {
  buildApprovalUpdate,
  getAllowedTransitions,
  getApprovalState,
} from "./record-workflow";

describe("getApprovalState", () => {
  it("counts the approvers on the record", () => {
    expect(
      getApprovalState({ approvers: ["a", "b"] }, { identityId: "c" }),
    ).toEqual({
      approvers: ["a", "b"],
      count: 2,
      required: 2,
      hasApproved: false,
      isComplete: true,
      canApprove: false,
    });
    expect(getApprovalState({ approvers: ["a"] }, { identityId: "c" })).toEqual(
      {
        approvers: ["a"],
        count: 1,
        required: 2,
        hasApproved: false,
        isComplete: false,
        canApprove: true,
      },
    );
  });

  it("counts a duplicated approver once", () => {
    const state = getApprovalState({ approvers: ["a", "a", "b", "a"] }, {});
    expect(state.approvers).toEqual(["a", "b"]);
    expect(state.count).toBe(2);
  });

  it("reads a missing or non-array approver field as none", () => {
    for (const record of [
      {},
      { approvers: null },
      { approvers: "a,b" },
      { approvers: { a: true } },
      { approvers: 3 },
    ]) {
      const state = getApprovalState(record, { identityId: "a" });
      expect(state.approvers).toEqual([]);
      expect(state.count).toBe(0);
    }
  });

  it("reads approvers from a custom source", () => {
    const state = getApprovalState(
      { signers: ["a"], approvers: ["x", "y"] },
      { approverSource: "signers", identityId: "a" },
    );
    expect(state.approvers).toEqual(["a"]);
    expect(state.hasApproved).toBe(true);
  });

  it("sees a numeric stored id as the same user as a string identity", () => {
    const state = getApprovalState({ approvers: [7] }, { identityId: "7" });
    expect(state.approvers).toEqual(["7"]);
    expect(state.hasApproved).toBe(true);
    expect(state.canApprove).toBe(false);
    expect(
      getApprovalState({ approvers: ["7"] }, { identityId: 7 }).hasApproved,
    ).toBe(true);
    expect(
      getApprovalState({ approvers: [7, "7"] }, { identityId: 8 }).count,
    ).toBe(1);
  });

  it("sets isComplete at the required count", () => {
    const record = { approvers: ["a", "b", "c"] };
    expect(getApprovalState(record, { required: 4 }).isComplete).toBe(false);
    expect(getApprovalState(record, { required: 3 }).isComplete).toBe(true);
    expect(getApprovalState(record, { required: 2 }).isComplete).toBe(true);
  });

  it("floors required and never lets it fall below 1", () => {
    expect(getApprovalState({}, {}).required).toBe(2);
    expect(getApprovalState({}, { required: 3.9 }).required).toBe(3);
    expect(getApprovalState({}, { required: 0 }).required).toBe(1);
    expect(getApprovalState({}, { required: -5 }).required).toBe(1);
    expect(getApprovalState({}, { required: 0.5 }).required).toBe(1);
    expect(getApprovalState({}, { required: Number.NaN }).required).toBe(2);
  });
});

describe("canApprove", () => {
  it("is false without an identity, after an approval, and once complete", () => {
    const record = { approvers: ["a"] };
    expect(getApprovalState(record, { identityId: "b" }).canApprove).toBe(true);
    expect(getApprovalState(record, {}).canApprove).toBe(false);
    expect(getApprovalState(record, { identityId: undefined }).canApprove).toBe(
      false,
    );
    expect(getApprovalState(record, { identityId: "a" }).canApprove).toBe(
      false,
    );
    expect(
      getApprovalState(record, { identityId: "b", required: 1 }).canApprove,
    ).toBe(false);
  });
});

describe("buildApprovalUpdate", () => {
  it("appends the identity and sets the pending value before the threshold", () => {
    expect(
      buildApprovalUpdate(
        { approvers: ["a"], status: "draft" },
        {
          identityId: "b",
          required: 3,
        },
      ),
    ).toEqual({ approvers: ["a", "b"], status: "pending" });
  });

  it("sets the approved value when the count reaches required", () => {
    expect(
      buildApprovalUpdate({ approvers: ["a"] }, { identityId: "b" }),
    ).toEqual({ approvers: ["a", "b"], status: "approved" });
    expect(buildApprovalUpdate({}, { identityId: "a", required: 1 })).toEqual({
      approvers: ["a"],
      status: "approved",
    });
  });

  it("keeps numeric stored ids numeric", () => {
    expect(
      buildApprovalUpdate({ approvers: [1] }, { identityId: 2, required: 3 }),
    ).toEqual({ approvers: [1, 2], status: "pending" });
    expect(
      buildApprovalUpdate({ approvers: [1] }, { identityId: "2", required: 3 }),
    ).toEqual({ approvers: [1, "2"], status: "pending" });
  });

  it("uses custom sources and values", () => {
    expect(
      buildApprovalUpdate(
        { signers: ["a"], state: "draft" },
        {
          approverSource: "signers",
          statusSource: "state",
          identityId: "b",
          required: 3,
          pendingValue: "awaiting",
          approvedValue: "signed",
        },
      ),
    ).toEqual({ signers: ["a", "b"], state: "awaiting" });
    expect(
      buildApprovalUpdate(
        { signers: ["a"], state: "draft" },
        {
          approverSource: "signers",
          statusSource: "state",
          identityId: "b",
          approvedValue: "signed",
        },
      ),
    ).toEqual({ signers: ["a", "b"], state: "signed" });
  });

  it("returns null when the user cannot approve", () => {
    expect(buildApprovalUpdate({ approvers: [] }, {})).toBeNull();
    expect(
      buildApprovalUpdate({ approvers: ["a"] }, { identityId: "a" }),
    ).toBeNull();
    expect(
      buildApprovalUpdate({ approvers: ["a", "b"] }, { identityId: "c" }),
    ).toBeNull();
  });

  it("does not mutate the record", () => {
    const record = { approvers: ["a"] };
    buildApprovalUpdate(record, { identityId: "b" });
    expect(record.approvers).toEqual(["a"]);
  });
});

describe("getAllowedTransitions", () => {
  const transitions = {
    draft: ["review", "archived"],
    review: ["draft", "published"],
  };

  it("lists the next states of the current one", () => {
    expect(getAllowedTransitions({ status: "draft" }, { transitions })).toEqual(
      { current: "draft", allowed: ["review", "archived"] },
    );
    expect(
      getAllowedTransitions(
        { state: "review" },
        { source: "state", transitions },
      ),
    ).toEqual({ current: "review", allowed: ["draft", "published"] });
  });

  it("lists each next state once, in the given order", () => {
    expect(
      getAllowedTransitions(
        { status: "a" },
        { transitions: { a: ["c", "b", "c", "b"] } },
      ).allowed,
    ).toEqual(["c", "b"]);
  });

  it("drops a transition whose guard returns false", () => {
    const seen: unknown[] = [];
    const result = getAllowedTransitions(
      { status: "review", ready: false },
      {
        transitions,
        guards: {
          "review->published": (record) => {
            seen.push(record);
            return false;
          },
          "review->draft": () => true,
          "draft->review": () => false,
        },
      },
    );
    expect(result.allowed).toEqual(["draft"]);
    expect(seen).toEqual([{ status: "review", ready: false }]);
  });

  it("treats a throwing guard as blocked", () => {
    const result = getAllowedTransitions(
      { status: "draft" },
      {
        transitions,
        guards: {
          "draft->review": () => {
            throw new Error("bad guard");
          },
        },
      },
    );
    expect(result).toEqual({ current: "draft", allowed: ["archived"] });
  });

  it("has none for a status named constructor or an unknown one", () => {
    for (const status of ["constructor", "toString", "__proto__", "nowhere"]) {
      expect(getAllowedTransitions({ status }, { transitions })).toEqual({
        current: status,
        allowed: [],
      });
    }
  });

  it("does not read guards from Object.prototype", () => {
    const result = getAllowedTransitions(
      { status: "a" },
      { transitions: { a: ["constructor"] }, guards: {} },
    );
    expect(result.allowed).toEqual(["constructor"]);
  });

  it("reads a missing status as an empty current state", () => {
    expect(getAllowedTransitions({}, { transitions })).toEqual({
      current: "",
      allowed: [],
    });
    expect(
      getAllowedTransitions(
        { status: null },
        { transitions: { "": ["draft"] } },
      ),
    ).toEqual({ current: "", allowed: ["draft"] });
  });
});
