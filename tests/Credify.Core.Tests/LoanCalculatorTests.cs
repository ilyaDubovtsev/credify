using Credify.Core;
using Xunit;

namespace Credify.Core.Tests;

public class LoanCalculatorTests
{
    [Fact]
    public void ZeroRate_DividesPrincipalEvenly()
    {
        var schedule = LoanCalculator.BuildSchedule(new LoanScenario(
            120_000m, 0m, 12, new DateOnly(2026, 1, 1), 0m,
            RepaymentStrategy.ReduceTerm));

        Assert.Equal(10_000m, schedule.InitialMonthlyPayment);
        Assert.Equal(0m, schedule.TotalInterest);
        Assert.Equal(12, schedule.Payments.Count);
        Assert.Equal(0m, schedule.Payments[^1].RemainingBalance);
    }

    [Fact]
    public void ExtraPayments_SaveInterestAndTime()
    {
        var result = LoanCalculator.Compare(new LoanScenario(
            1_000_000m, 18m, 60, new DateOnly(2026, 1, 1), 10_000m,
            RepaymentStrategy.ReduceTerm));

        Assert.True(result.InterestSavings > 0);
        Assert.True(result.MonthsSaved > 0);
        Assert.True(result.Optimized.Payments.Count < result.Baseline.Payments.Count);
        Assert.Equal(0m, result.Optimized.Payments[^1].RemainingBalance);
    }

    [Fact]
    public void ReducePayment_LowersRegularPaymentWithoutExtendingTerm()
    {
        var schedule = LoanCalculator.BuildSchedule(new LoanScenario(
            1_000_000m, 18m, 60, new DateOnly(2026, 1, 1), 5_000m,
            RepaymentStrategy.ReducePayment));

        Assert.InRange(schedule.Payments.Count, 1, 60);
        Assert.True(schedule.Payments[1].RegularPayment < schedule.Payments[0].RegularPayment);
        Assert.Equal(0m, schedule.Payments[^1].RemainingBalance);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-100)]
    public void InvalidPrincipal_IsRejected(decimal principal)
    {
        var scenario = new LoanScenario(
            principal, 10m, 12, new DateOnly(2026, 1, 1), 0m,
            RepaymentStrategy.ReduceTerm);

        Assert.Throws<ArgumentOutOfRangeException>(() => LoanCalculator.BuildSchedule(scenario));
    }

    [Fact]
    public void OneTimePayment_IsAppliedInMatchingMonth()
    {
        var schedule = LoanCalculator.BuildSchedule(new LoanScenario(
            1_000_000m, 18m, 60, new DateOnly(2026, 8, 1), 0m,
            RepaymentStrategy.ReduceTerm,
            [new ExtraPayment(new DateOnly(2026, 10, 15), 100_000m)]));

        Assert.Equal(0m, schedule.Payments[1].ExtraPayment);
        Assert.Equal(100_000m, schedule.Payments[2].ExtraPayment);
        Assert.True(schedule.Payments.Count < 60);
    }

    [Fact]
    public void ComparisonBaseline_ExcludesAllExtraPayments()
    {
        var result = LoanCalculator.Compare(new LoanScenario(
            1_000_000m, 18m, 60, new DateOnly(2026, 8, 1), 10_000m,
            RepaymentStrategy.ReduceTerm,
            [new ExtraPayment(new DateOnly(2027, 2, 15), 100_000m)]));

        Assert.All(result.Baseline.Payments, payment => Assert.Equal(0m, payment.ExtraPayment));
        Assert.True(result.Baseline.TotalInterest > result.Optimized.TotalInterest);
    }

    [Fact]
    public void MultipleOneTimePaymentsInSameMonth_AreCombined()
    {
        var schedule = LoanCalculator.BuildSchedule(new LoanScenario(
            500_000m, 12m, 36, new DateOnly(2026, 8, 1), 1_000m,
            RepaymentStrategy.ReduceTerm,
            [
                new ExtraPayment(new DateOnly(2026, 9, 5), 20_000m),
                new ExtraPayment(new DateOnly(2026, 9, 20), 30_000m)
            ]));

        Assert.Equal(51_000m, schedule.Payments[1].ExtraPayment);
    }

    [Fact]
    public void OneTimePaymentOutsideLoanTerm_IsRejected()
    {
        var scenario = new LoanScenario(
            500_000m, 12m, 12, new DateOnly(2026, 8, 1), 0m,
            RepaymentStrategy.ReduceTerm,
            [new ExtraPayment(new DateOnly(2027, 8, 1), 10_000m)]);

        Assert.Throws<ArgumentOutOfRangeException>(() => LoanCalculator.BuildSchedule(scenario));
    }

    [Fact]
    public void SafePlan_UsesOnlySavingsAboveReserve()
    {
        var scenario = new LoanScenario(
            1_000_000m, 18m, 60, new DateOnly(2026, 8, 1), 10_000m,
            RepaymentStrategy.ReduceTerm);

        var plan = SafePlanCalculator.Build(
            scenario,
            new SafetyProfile(500_000m, 100_000m, 3));

        Assert.Equal(300_000m, plan.RequiredReserve);
        Assert.Equal(200_000m, plan.RecommendedImmediatePayment);
        Assert.Equal(300_000m, plan.SavingsAfterPayment);
        Assert.True(plan.Comparison.InterestSavings > 0);
    }

    [Fact]
    public void SafePlan_DoesNotSpendSavingsBelowReserve()
    {
        var scenario = new LoanScenario(
            1_000_000m, 18m, 60, new DateOnly(2026, 8, 1), 0m,
            RepaymentStrategy.ReduceTerm);

        var plan = SafePlanCalculator.Build(
            scenario,
            new SafetyProfile(200_000m, 100_000m, 3));

        Assert.Equal(0m, plan.RecommendedImmediatePayment);
        Assert.Equal(200_000m, plan.SavingsAfterPayment);
    }
}
