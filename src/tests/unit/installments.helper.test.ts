import { describe, it, expect } from "vitest";
import { calculateInstallments, nextInstallment } from "../../helpers/installments.helper";

describe("calculateInstallments", () => {
  it("returns single installment when num_abonos is 1", () => {
    const result = calculateInstallments(100000, 1, 70);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ number: 1, amount: 100000, percentage: 100 });
  });

  it("returns two installments with correct split for num_abonos=2", () => {
    const result = calculateInstallments(100000, 2, 70);
    expect(result).toHaveLength(2);
    expect(result[0].amount).toBe(70000);
    expect(result[1].amount).toBe(30000);
    expect(result[0].percentage).toBe(70);
    expect(result[1].percentage).toBe(30);
  });

  it("numbers installments sequentially starting at 1", () => {
    const result = calculateInstallments(300000, 3, 70);
    expect(result.map((i) => i.number)).toEqual([1, 2, 3]);
  });

  it("last installment covers exact balance to avoid rounding drift", () => {
    const result = calculateInstallments(99999, 3, 70);
    const total = result.reduce((sum, i) => sum + i.amount, 0);
    expect(Math.round(total * 100) / 100).toBe(99999);
  });

  it("distributes remainder equally across intermediate installments for N > 2", () => {
    const result = calculateInstallments(200000, 4, 50);
    expect(result).toHaveLength(4);
    expect(result[0].amount).toBe(100000); // 50% first
    expect(result[1].amount).toBe(result[2].amount); // intermediates equal
    const total = result.reduce((sum, i) => sum + i.amount, 0);
    expect(Math.round(total * 100) / 100).toBe(200000);
  });

  it("clamps porcentaje_primer to 99 when 100 is passed", () => {
    const result = calculateInstallments(100000, 2, 100);
    expect(result[0].amount).toBe(99000); // 99%, not 100%
    expect(result[1].amount).toBe(1000);
  });

  it("clamps num_abonos to 1 when 0 is passed", () => {
    const result = calculateInstallments(100000, 0, 70);
    expect(result).toHaveLength(1);
    expect(result[0].amount).toBe(100000);
  });
});

describe("nextInstallment", () => {
  it("returns first installment when no payments made", () => {
    const next = nextInstallment(100000, 2, 70, 0);
    expect(next).not.toBeNull();
    expect(next!.number).toBe(1);
    expect(next!.expectedAmount).toBe(70000);
    expect(next!.isLast).toBe(false);
  });

  it("returns last installment after first payment made", () => {
    const next = nextInstallment(100000, 2, 70, 1);
    expect(next).not.toBeNull();
    expect(next!.number).toBe(2);
    expect(next!.isLast).toBe(true);
  });

  it("returns null when all installments are paid", () => {
    expect(nextInstallment(100000, 2, 70, 2)).toBeNull();
  });

  it("returns null when payments exceed configured installments", () => {
    expect(nextInstallment(100000, 2, 70, 5)).toBeNull();
  });
});
