namespace Credify.Core;

public static class SafePlanCalculator
{
    public static SafeRepaymentPlan Build(LoanScenario scenario, SafetyProfile profile)
    {
        if (profile.CurrentSavings < 0)
            throw new ArgumentOutOfRangeException(nameof(profile.CurrentSavings), "Накопления не могут быть отрицательными.");
        if (profile.MonthlyEssentialExpenses < 0)
            throw new ArgumentOutOfRangeException(nameof(profile.MonthlyEssentialExpenses), "Расходы не могут быть отрицательными.");
        if (profile.ReserveMonths is < 1 or > 24)
            throw new ArgumentOutOfRangeException(nameof(profile.ReserveMonths), "Подушка должна покрывать от 1 до 24 месяцев.");

        var requiredReserve = RoundMoney(
            profile.MonthlyEssentialExpenses * profile.ReserveMonths);
        var availableSavings = Math.Max(0, profile.CurrentSavings - requiredReserve);
        var immediatePayment = Math.Min(scenario.Principal, availableSavings);

        var extras = (scenario.OneTimePayments ?? []).ToList();
        if (immediatePayment > 0)
        {
            extras.Add(new ExtraPayment(scenario.StartDate, immediatePayment));
        }

        var optimizedScenario = scenario with
        {
            Strategy = RepaymentStrategy.ReduceTerm,
            OneTimePayments = extras
        };

        return new SafeRepaymentPlan(
            requiredReserve,
            immediatePayment,
            RoundMoney(profile.CurrentSavings - immediatePayment),
            LoanCalculator.Compare(optimizedScenario));
    }

    private static decimal RoundMoney(decimal value) =>
        Math.Round(value, 2, MidpointRounding.AwayFromZero);
}
