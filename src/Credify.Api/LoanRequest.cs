using Credify.Core;

namespace Credify.Api;

public sealed record LoanRequest(
    decimal Principal,
    decimal AnnualRate,
    int TermMonths,
    DateOnly StartDate,
    decimal MonthlyExtraPayment,
    RepaymentStrategy Strategy,
    IReadOnlyList<ExtraPayment>? OneTimePayments = null)
{
    public Dictionary<string, string[]> Validate()
    {
        var errors = new Dictionary<string, string[]>();

        if (Principal <= 0)
            errors[nameof(Principal)] = ["Сумма кредита должна быть больше нуля."];
        if (AnnualRate < 0 || AnnualRate > 100)
            errors[nameof(AnnualRate)] = ["Ставка должна быть от 0 до 100%."];
        if (TermMonths is < 1 or > 600)
            errors[nameof(TermMonths)] = ["Срок должен быть от 1 до 600 месяцев."];
        if (MonthlyExtraPayment < 0)
            errors[nameof(MonthlyExtraPayment)] = ["Досрочный платёж не может быть отрицательным."];
        if (OneTimePayments?.Any(payment => payment.Amount <= 0) == true)
            errors[nameof(OneTimePayments)] = ["Сумма каждого разового платежа должна быть больше нуля."];

        var lastPaymentDate = StartDate.AddMonths(Math.Max(0, TermMonths - 1));
        if (OneTimePayments?.Any(payment => payment.Date < StartDate || payment.Date > lastPaymentDate) == true)
            errors[nameof(OneTimePayments)] = ["Дата разового платежа должна попадать в срок кредита."];

        return errors;
    }
}
