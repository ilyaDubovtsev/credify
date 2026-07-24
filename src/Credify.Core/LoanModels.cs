namespace Credify.Core;

public enum RepaymentStrategy
{
    ReduceTerm,
    ReducePayment
}

public sealed record ExtraPayment(DateOnly Date, decimal Amount);

public sealed record LoanScenario(
    decimal Principal,
    decimal AnnualRate,
    int TermMonths,
    DateOnly StartDate,
    decimal MonthlyExtraPayment,
    RepaymentStrategy Strategy,
    IReadOnlyList<ExtraPayment>? OneTimePayments = null);

public sealed record PaymentRow(
    int Number,
    DateOnly Date,
    decimal RegularPayment,
    decimal ExtraPayment,
    decimal Interest,
    decimal Principal,
    decimal RemainingBalance);

public sealed record LoanSchedule(
    decimal InitialMonthlyPayment,
    decimal TotalPaid,
    decimal TotalInterest,
    IReadOnlyList<PaymentRow> Payments);

public sealed record LoanComparison(
    LoanSchedule Baseline,
    LoanSchedule Optimized,
    decimal InterestSavings,
    int MonthsSaved);

public sealed record SafetyProfile(
    decimal CurrentSavings,
    decimal MonthlyEssentialExpenses,
    int ReserveMonths);

public sealed record SafeRepaymentPlan(
    decimal RequiredReserve,
    decimal RecommendedImmediatePayment,
    decimal SavingsAfterPayment,
    LoanComparison Comparison);
