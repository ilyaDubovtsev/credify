namespace Credify.Core;

public static class LoanCalculator
{
    private const decimal MoneyTolerance = 0.005m;

    public static LoanComparison Compare(LoanScenario scenario)
    {
        Validate(scenario);

        var baseline = BuildSchedule(scenario with
        {
            MonthlyExtraPayment = 0,
            Strategy = RepaymentStrategy.ReduceTerm
        });
        var optimized = BuildSchedule(scenario);

        return new LoanComparison(
            baseline,
            optimized,
            RoundMoney(baseline.TotalInterest - optimized.TotalInterest),
            baseline.Payments.Count - optimized.Payments.Count);
    }

    public static LoanSchedule BuildSchedule(LoanScenario scenario)
    {
        Validate(scenario);

        var monthlyRate = scenario.AnnualRate / 100m / 12m;
        var regularPayment = CalculateAnnuityPayment(
            scenario.Principal,
            monthlyRate,
            scenario.TermMonths);
        var initialPayment = regularPayment;
        var balance = scenario.Principal;
        var payments = new List<PaymentRow>();

        for (var month = 1; month <= scenario.TermMonths && balance > MoneyTolerance; month++)
        {
            var interest = RoundMoney(balance * monthlyRate);
            var regularPrincipal = Math.Min(balance, Math.Max(0, regularPayment - interest));
            var actualRegularPayment = RoundMoney(interest + regularPrincipal);
            balance = RoundMoney(balance - regularPrincipal);

            var extra = Math.Min(balance, scenario.MonthlyExtraPayment);
            balance = RoundMoney(balance - extra);

            payments.Add(new PaymentRow(
                month,
                scenario.StartDate.AddMonths(month - 1),
                actualRegularPayment,
                extra,
                interest,
                RoundMoney(regularPrincipal + extra),
                balance));

            if (balance <= MoneyTolerance)
            {
                balance = 0;
                break;
            }

            if (scenario.Strategy == RepaymentStrategy.ReducePayment &&
                scenario.MonthlyExtraPayment > 0)
            {
                regularPayment = CalculateAnnuityPayment(
                    balance,
                    monthlyRate,
                    scenario.TermMonths - month);
            }
        }

        var totalInterest = RoundMoney(payments.Sum(x => x.Interest));
        var totalPaid = RoundMoney(payments.Sum(x => x.RegularPayment + x.ExtraPayment));
        return new LoanSchedule(initialPayment, totalPaid, totalInterest, payments);
    }

    public static decimal CalculateAnnuityPayment(
        decimal principal,
        decimal monthlyRate,
        int months)
    {
        if (months <= 0)
        {
            return principal;
        }

        if (monthlyRate == 0)
        {
            return RoundMoney(principal / months);
        }

        var rate = (double)monthlyRate;
        var factor = Math.Pow(1d + rate, months);
        return RoundMoney(principal * (decimal)(rate * factor / (factor - 1d)));
    }

    private static void Validate(LoanScenario scenario)
    {
        if (scenario.Principal <= 0)
            throw new ArgumentOutOfRangeException(nameof(scenario.Principal), "Сумма кредита должна быть больше нуля.");
        if (scenario.AnnualRate < 0 || scenario.AnnualRate > 100)
            throw new ArgumentOutOfRangeException(nameof(scenario.AnnualRate), "Ставка должна быть от 0 до 100%.");
        if (scenario.TermMonths is < 1 or > 600)
            throw new ArgumentOutOfRangeException(nameof(scenario.TermMonths), "Срок должен быть от 1 до 600 месяцев.");
        if (scenario.MonthlyExtraPayment < 0)
            throw new ArgumentOutOfRangeException(nameof(scenario.MonthlyExtraPayment), "Досрочный платёж не может быть отрицательным.");
    }

    private static decimal RoundMoney(decimal value) =>
        Math.Round(value, 2, MidpointRounding.AwayFromZero);
}
