using Credify.Core;

namespace Credify.Api;

public sealed record LoanAnalysisResponse(
    LoanSchedule Baseline,
    LoanComparison ReduceTerm,
    LoanComparison ReducePayment,
    RepaymentStrategy RecommendedStrategy);
