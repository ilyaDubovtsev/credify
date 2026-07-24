using Credify.Core;

namespace Credify.Api;

public sealed record SafePlanRequest(
    LoanRequest Loan,
    decimal CurrentSavings,
    decimal MonthlyEssentialExpenses,
    int ReserveMonths)
{
    public Dictionary<string, string[]> Validate()
    {
        var errors = Loan.Validate();
        if (CurrentSavings < 0)
            errors[nameof(CurrentSavings)] = ["Накопления не могут быть отрицательными."];
        if (MonthlyEssentialExpenses < 0)
            errors[nameof(MonthlyEssentialExpenses)] = ["Расходы не могут быть отрицательными."];
        if (ReserveMonths is < 1 or > 24)
            errors[nameof(ReserveMonths)] = ["Подушка должна покрывать от 1 до 24 месяцев."];
        return errors;
    }
}
