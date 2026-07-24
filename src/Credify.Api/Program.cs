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
        request.Strategy);

    return Results.Ok(LoanCalculator.Compare(scenario));
});

app.Run();

public partial class Program;
