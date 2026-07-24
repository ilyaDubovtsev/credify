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
}
