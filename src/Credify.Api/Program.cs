using Credify.Api;
using Credify.Core;
using System.Text.Json;
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);
builder.Services.ConfigureHttpJsonOptions(options =>
    options.SerializerOptions.Converters.Add(
        new JsonStringEnumConverter(JsonNamingPolicy.CamelCase)));
builder.Services.AddCors(options =>
    options.AddDefaultPolicy(policy =>
        policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod()));

var app = builder.Build();
app.UseCors();

app.MapGet("/api/health", () => Results.Ok(new { status = "ok" }));

app.MapPost("/api/loans/compare", (LoanRequest request) =>
{
    var errors = request.Validate();
    if (errors.Count > 0)
    {
        return Results.ValidationProblem(errors);
    }

    var scenario = new LoanScenario(
        request.Principal,
        request.AnnualRate,
        request.TermMonths,
        request.StartDate,
        request.MonthlyExtraPayment,
        request.Strategy,
        request.OneTimePayments);

    return Results.Ok(LoanCalculator.Compare(scenario));
});

app.MapPost("/api/loans/analyze", (LoanRequest request) =>
{
    var errors = request.Validate();
    if (errors.Count > 0)
    {
        return Results.ValidationProblem(errors);
    }

    var scenario = new LoanScenario(
        request.Principal,
        request.AnnualRate,
        request.TermMonths,
        request.StartDate,
        request.MonthlyExtraPayment,
        RepaymentStrategy.ReduceTerm,
        request.OneTimePayments);

    var reduceTerm = LoanCalculator.Compare(scenario);
    var reducePayment = LoanCalculator.Compare(
        scenario with { Strategy = RepaymentStrategy.ReducePayment });

    return Results.Ok(new LoanAnalysisResponse(
        reduceTerm.Baseline,
        reduceTerm,
        reducePayment,
        RepaymentStrategy.ReduceTerm));
});

app.MapPost("/api/loans/safe-plan", (SafePlanRequest request) =>
{
    var errors = request.Validate();
    if (errors.Count > 0)
    {
        return Results.ValidationProblem(errors);
    }

    var loan = request.Loan;
    var scenario = new LoanScenario(
        loan.Principal,
        loan.AnnualRate,
        loan.TermMonths,
        loan.StartDate,
        loan.MonthlyExtraPayment,
        RepaymentStrategy.ReduceTerm,
        loan.OneTimePayments);
    var profile = new SafetyProfile(
        request.CurrentSavings,
        request.MonthlyEssentialExpenses,
        request.ReserveMonths);

    return Results.Ok(SafePlanCalculator.Build(scenario, profile));
});

app.Run();

public partial class Program;
